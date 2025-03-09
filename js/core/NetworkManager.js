// NetworkManager.js - Handles multiplayer networking
import * as THREE from 'three';
import PlaneFactory from '../entities/PlaneFactory.js';
import AmmoSystem from '../entities/AmmoSystem.js';
import EventBus from './EventBus.js';

export default class NetworkManager {
    constructor(eventBus, playerPlane) {
        this.eventBus = eventBus || new EventBus();
        this.playerPlane = playerPlane;

        // Connection settings
        this.connected = false;
        this.socket = null;
        this.clientId = null;
        this.serverUrl = null;
        this.callsign = 'Unknown';
        this.lastPingTime = 0;
        this.lastServerPing = 0;

        // Respawn state tracking
        this.playerWasRespawned = false;
        this.respawnFlagTimeout = null;

        // Client-side throttling
        this.lastFireTime = 0;
        this.lastUpdateTime = 0;
        this.updateInterval = 20; // 50 updates/second
        this.interpolationFactor = 0.05; // For smooth movement
        this.lastRemoteUpdateTime = 0;

        // Remote players state
        this.remotePlanes = new Map(); // Map of remote planes by client ID

        // Set up event listeners
        this._setupEventListeners();

        // Set up collision handler
        this._setupCollisionHandler();
    }

    /**
     * Set up all event listeners
     * @private
     */
    _setupEventListeners() {
        // Connection events
        this.eventBus.on('network.connect', this.connect.bind(this));
        this.eventBus.on('network.disconnect', this.disconnect.bind(this));

        // Game events
        this.eventBus.on('plane.fire', this.sendFireEvent.bind(this));
        this.eventBus.on('plane.damage', this.handleDamageEvent.bind(this));
        this.eventBus.on('plane.destroyed', this.handleDestroyedEvent.bind(this));

        // Add leaderboard request handler
        this.eventBus.on('network.request.leaderboard', this.requestLeaderboard.bind(this));

        // Set up damage handler for player-to-player collisions
        this._setupCollisionHandler();

        // Set up damage handler for remote planes
        this._setupRemoteDamageHandler();
    }

    /**
     * Sets up a collision handler for the local ammo system
     * to sync damage in multiplayer
     * @private
     */
    _setupCollisionHandler() {
        // Wait for the player plane's ammo system to be ready
        const checkInterval = setInterval(() => {
            if (!this.playerPlane || !this.playerPlane.ammoSystem) return;

            clearInterval(checkInterval);
            console.log('Setting up multiplayer collision handler');

            // Store original methods
            const originalCheckCollisions = this.playerPlane.ammoSystem.checkCollisions;
            const originalBulletDamage = this.playerPlane.ammoSystem.bulletDamage;

            // Disable local damage application for multiplayer to prevent double damage
            this.playerPlane.ammoSystem.bulletDamage = 0; // Damage will come from server

            // Override with network-aware collision detection
            this.playerPlane.ammoSystem.checkCollisions = () => {
                // Call the original method to get collisions
                const collisions = originalCheckCollisions.call(this.playerPlane.ammoSystem);

                // Only process in multiplayer when connected
                if (this.connected && collisions.length > 0) {
                    this._processCollisions(collisions, originalBulletDamage);
                }

                return collisions;
            };

            // Add handler for remote bullets hitting local player
            this._setupRemoteDamageHandler();

            console.log('Multiplayer collision handler set up successfully');
        }, 500);
    }

    /**
     * Process collisions for multiplayer
     * @private
     * @param {Array} collisions - List of collision objects
     * @param {number} damageAmount - Amount of damage to apply
     */
    _processCollisions(collisions, damageAmount) {
        console.log(`Detected ${collisions.length} collisions in multiplayer`);

        collisions.forEach(collision => {
            const plane = collision.plane;

            // Skip if the collision is with the local player's plane
            if (plane === this.playerPlane) return;

            // Find remote plane ID from the plane object
            let targetId = null;
            this.remotePlanes.forEach((remotePlane, id) => {
                if (remotePlane === plane) {
                    targetId = id;
                }
            });

            if (!targetId) {
                console.warn('Hit a plane but could not determine remote plane ID');
                return;
            }

            // Make sure collision position is valid
            if (!collision.position) {
                console.warn('Collision missing position data');
                return;
            }

            const collisionPos = collision.position.clone();

            console.log(`Local bullet hit remote plane ${targetId} at position:`,
                collisionPos.x.toFixed(2),
                collisionPos.y.toFixed(2),
                collisionPos.z.toFixed(2)
            );

            // Send damage event to server including position
            this.sendDamageEvent({
                targetId: targetId,
                amount: damageAmount,
                position: collisionPos
            });

            // Show local hit effect immediately
            this.eventBus.emit('effect.hit', {
                position: collisionPos,
                playSound: true
            });
        });
    }

    /**
     * Set up handler for remote damage events
     * @private
     */
    _setupRemoteDamageHandler() {
        this.eventBus.on('plane.damage', (data, source) => {
            if (source === 'player' && this.connected) {
                console.log(`Local player damaged: ${data.amount}`);

                // Ensure impact effects are shown on own plane
                if (data.impactPosition) {
                    console.log('Creating hit effect from damage event');
                    this.eventBus.emit('effect.hit', {
                        position: data.impactPosition,
                        playSound: false  // Sound is already played by the damage method
                    });
                }
            }
        });
    }

    /**
     * Connect to multiplayer server
     * @param {Object} data - Connection data
     * @param {string} [data.serverUrl] - Optional server URL override
     * @param {string} [data.callsign] - Player's callsign
     */
    connect(data = {}) {
        this._setPlayerCallsign(data.callsign);
        const serverUrl = this._determineServerUrl(data.serverUrl);

        try {
            console.log(`Connecting to multiplayer server at ${serverUrl}...`);

            this.socket = new WebSocket(serverUrl);

            // Set up event handlers
            this.socket.onopen = this.handleConnection.bind(this);
            this.socket.onmessage = this.handleMessage.bind(this);
            this.socket.onclose = this.handleDisconnection.bind(this);
            this.socket.onerror = this.handleError.bind(this);
        } catch (error) {
            console.error('Error connecting to server:', error);
            this._notifyError('Failed to connect to multiplayer server');
        }
    }

    /**
     * Set player callsign
     * @private
     * @param {string} callsign - Player callsign
     */
    _setPlayerCallsign(callsign) {
        if (callsign) {
            this.callsign = callsign;
            console.log(`Player callsign set to: ${this.callsign}`);
        } else {
            // Generate a random callsign if none provided
            this.callsign = `Pilot${Math.floor(Math.random() * 1000)}`;
            console.log(`Generated random callsign: ${this.callsign}`);
        }
    }

    /**
     * Determine the WebSocket server URL
     * @private
     * @param {string} overrideUrl - Optional URL override
     * @return {string} The WebSocket server URL
     */
    _determineServerUrl(overrideUrl) {
        if (overrideUrl) return overrideUrl;

        const isSecure = window.location.protocol === 'https:';
        const protocol = isSecure ? 'wss:' : 'ws:';
        const host = window.location.hostname;

        // For localhost, use default ports
        if (host === 'localhost' || host === '127.0.0.1') {
            const port = isSecure ? '8443' : '8080';
            return `${protocol}//${host}:${port}`;
        }

        // For deployed version, use same host/port as page
        return `${protocol}//${host}${window.location.port ? ':' + window.location.port : ''}`;
    }

    /**
     * Show an error notification
     * @private
     * @param {string} message - Error message
     */
    _notifyError(message) {
        this.eventBus.emit('notification', {
            message,
            type: 'error'
        });
    }

    /**
     * Sends a damage event to the server
     * @param {Object} data - Damage data including targetId and amount
     */
    sendDamageEvent(data) {
        if (!this.connected || !this.socket) return;

        try {
            console.log('Sending damage event to server:', data);

            // Make sure position is a valid object with x,y,z properties
            let position = data.position ? {
                x: data.position.x,
                y: data.position.y,
                z: data.position.z
            } : null;

            this._sendMessage({
                type: 'damage',
                targetId: data.targetId,
                amount: data.amount,
                position: position
            });
        } catch (error) {
            console.error('Error sending damage event:', error);
        }
    }

    /**
     * Handle fire event from a remote player
     * @private
     * @param {Object} data - Fire event data
     */
    _handleFireEvent(data) {
        const planeId = data.playerId;

        // Get the remote plane that fired
        const remotePlane = this.remotePlanes.get(planeId);
        if (!remotePlane) {
            console.warn(`Received fire event from unknown plane: ${planeId}`);
            return;
        }

        console.log(`Remote player ${planeId} fired`);

        // Create remote bullets without sound (sound will come from the fire effect)
        const planeVelocity = data.velocity ? new THREE.Vector3(
            data.velocity.x,
            data.velocity.y,
            data.velocity.z
        ) : new THREE.Vector3(0, 0, 0);

        // Fire the bullets
        this.fireBulletsWithoutSound(remotePlane, planeVelocity);

        // Create visual and sound effects at the plane's position
        this.eventBus.emit('effect.fire', {
            position: remotePlane.mesh.position.clone(),
            rotation: remotePlane.mesh.rotation.clone(),
            playSound: true
        });
    }

    /**
     * Handle hit effect from a remote player
     * @private
     * @param {Object} data - Hit effect data
     */
    _handleHitEffect(data) {
        if (!data.position) return;

        // Create position vector from data
        const position = new THREE.Vector3(
            data.position.x,
            data.position.y,
            data.position.z
        );

        // Emit hit effect event
        this.eventBus.emit('effect.hit', {
            position: position,
            playSound: data.playSound || false
        });
    }

    /**
     * Handle destroyed event from a remote player
     * @private
     * @param {Object} data - Destroyed event data
     */
    _handleDestroyed(data) {
        const planeId = data.playerId;

        // Handle local player destruction
        if (planeId === this.clientId) {
            console.log('Server confirmed local player destroyed');
            return;
        }

        // Get the remote plane
        const remotePlane = this.remotePlanes.get(planeId);
        if (!remotePlane) {
            console.warn(`Received destroyed event for unknown plane: ${planeId}`);
            return;
        }

        console.log(`Remote player ${planeId} was destroyed`);

        // Check if plane is already destroyed to avoid duplicate effects
        if (remotePlane.isDestroyed) {
            console.log(`Remote plane ${planeId} already marked as destroyed, skipping`);
            return;
        }

        // Call the handleRemotePlayerDestroyed method to properly handle destruction and free-fall
        this.handleRemotePlayerDestroyed({
            id: planeId,
            sourceId: data.sourceId
        });

        // Create destruction effect
        if (remotePlane.mesh) {
            this.eventBus.emit('effect.explosion', {
                position: remotePlane.mesh.position.clone(),
                scale: 2.0
            });
        }

        // Play destruction sound
        this.eventBus.emit('sound.play', {
            sound: 'explosion',
            volume: 0.8
        });
    }

    /**
     * Handle notification from the server
     * @private
     * @param {Object} data - Notification data
     */
    _handleNotification(data) {
        if (!data.message) return;

        // Forward to event bus for UI
        this.eventBus.emit('notification', {
            message: data.message,
            type: data.type || 'info',
            duration: data.duration || 3000
        });
    }

    /**
     * Handle player count update from the server
     * @private
     * @param {Object} data - Player count data
     */
    _handlePlayerCount(data) {
        if (typeof data.count !== 'number') return;

        console.log(`Received player count update: ${data.count} players connected`);

        // Forward to event bus for UI
        this.eventBus.emit('network.playerCount', {
            count: data.count
        });
    }

    /**
     * Handles a damage event from the event bus
     * @param {Object} data - Damage data
     * @param {string} source - Source of the event (player/enemy)
     */
    handleDamageEvent(data, source) {
        // Only process events for the player's plane
        if (source !== 'player' || !this.connected) return;

        // Update will be sent in the next position update
        // No need to send a separate message
    }

    /**
     * Handles a destroyed event from the event bus
     * @param {Object} data - Destroyed event data
     * @param {string} source - Source of the event (player/enemy)
     */
    handleDestroyedEvent(data, source) {
        // Only handle player destruction events in multiplayer
        if (source !== 'player' || !this.connected) return;

        console.log('Player plane destroyed in multiplayer');

        // Notify server of destruction in next update message
        if (this.playerPlane) {
            this.playerPlane.isDestroyed = true;
        }
    }

    /**
     * Disconnect from the multiplayer server
     */
    disconnect() {
        if (this.socket && this.connected) {
            console.log('Disconnecting from multiplayer server...');
            this.socket.close();
        }
    }

    /**
     * Handle successful WebSocket connection
     */
    handleConnection() {
        console.log('Connected to multiplayer server');
        this.connected = true;

        // Send initial player data to server
        this._sendInitialPlayerData();

        // Emit connection event
        this.eventBus.emit('network.connected');
        this.eventBus.emit('notification', {
            message: 'Connected to multiplayer server',
            type: 'success'
        });
    }

    /**
     * Send initial player data to the server
     * @private
     */
    _sendInitialPlayerData() {
        const initialData = {
            type: 'init',
            callsign: this.callsign,
            position: this._getPlayerPosition(),
            rotation: this._getPlayerRotation(),
            health: this.playerPlane ? this.playerPlane.health : 100
        };

        this._sendMessage(initialData);
    }

    /**
     * Get the player plane's position
     * @private
     * @returns {Object} The position as {x, y, z}
     */
    _getPlayerPosition() {
        if (!this.playerPlane || !this.playerPlane.mesh) {
            return { x: 0, y: 0, z: 0 };
        }

        return {
            x: this.playerPlane.mesh.position.x,
            y: this.playerPlane.mesh.position.y,
            z: this.playerPlane.mesh.position.z
        };
    }

    /**
     * Get the player plane's rotation
     * @private
     * @returns {Object} The rotation as {x, y, z}
     */
    _getPlayerRotation() {
        if (!this.playerPlane || !this.playerPlane.mesh) {
            return { x: 0, y: 0, z: 0 };
        }

        return {
            x: this.playerPlane.mesh.rotation.x,
            y: this.playerPlane.mesh.rotation.y,
            z: this.playerPlane.mesh.rotation.z
        };
    }

    /**
     * Send a message to the server
     * @private
     * @param {Object} data - Message data to send
     */
    _sendMessage(data) {
        if (!this.connected || !this.socket) {
            console.warn('Cannot send message - not connected');
            return;
        }

        try {
            const jsonData = JSON.stringify(data);
            this.socket.send(jsonData);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    /**
     * Handle incoming WebSocket messages
     * @param {MessageEvent} event - WebSocket message event
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);

            if (!message || !message.type) {
                console.warn('Received invalid message format:', message);
                return;
            }

            switch (message.type) {
                case 'init_ack':
                    this._handleInitAck(message);
                    break;
                case 'player_joined':
                    this._handlePlayerJoined(message);
                    break;
                case 'player_left':
                    this._handlePlayerLeft(message);
                    break;
                case 'update':
                    this._handlePlayerUpdate(message);
                    break;
                case 'damage':
                    this._handleDamage(message);
                    break;
                case 'fire':
                    this._handleFireEvent(message);
                    break;
                case 'hit_effect':
                    this._handleHitEffect(message);
                    break;
                case 'destroyed':
                    this._handleDestroyed(message);
                    break;
                case 'notification':
                    this._handleNotification(message);
                    break;
                case 'player_respawn':
                    this._handlePlayerRespawn(message);
                    break;
                case 'player_count':
                    this._handlePlayerCount(message);
                    break;
                case 'leaderboard':
                    this._handleLeaderboard(message);
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    /**
     * Handle initialization acknowledgment from server
     * @private
     * @param {Object} data - Init ack data
     */
    _handleInitAck(data) {
        // Store client ID assigned by the server
        this.clientId = data.clientId;
        console.log(`Server assigned client ID: ${this.clientId}`);

        // Initialize existing players
        if (data.players && Array.isArray(data.players)) {
            this.initExistingPlayers(data.players);
        }

        // Set protection zone if provided
        if (data.protectionZone) {
            this.setProtectionZone(data.protectionZone);
        }
    }

    /**
     * Handle player joined event
     * @private
     * @param {Object} data - Player joined data
     */
    _handlePlayerJoined(data) {
        if (!data.player || !data.player.id) {
            console.warn('Received invalid player_joined data');
            return;
        }

        const player = data.player;
        console.log(`Player joined: ${player.callsign} (${player.id})`);

        // Create remote plane if not already exists
        if (!this.remotePlanes.has(player.id)) {
            const planeFactory = new PlaneFactory();
            this.createRemotePlane(planeFactory, player);
        }

        // Show notification
        this.eventBus.emit('notification', {
            message: `${player.callsign} joined the battle`,
            type: 'info'
        });
    }

    /**
     * Handle player left event
     * @private
     * @param {Object} data - Player left data
     */
    _handlePlayerLeft(data) {
        if (!data.playerId) {
            console.warn('Received invalid player_left data');
            return;
        }

        const playerId = data.playerId;
        const remotePlane = this.remotePlanes.get(playerId);

        if (remotePlane) {
            const callsign = remotePlane.callsign || 'Unknown pilot';
            console.log(`Player left: ${callsign} (${playerId})`);

            // Remove the remote plane
            this.removeRemotePlayer(playerId);

            // Show notification
            this.eventBus.emit('notification', {
                message: `${callsign} left the battle`,
                type: 'info'
            });
        }
    }

    /**
     * Handle player update event
     * @private
     * @param {Object} data - Player update data
     */
    _handlePlayerUpdate(data) {
        if (!data.players || !Array.isArray(data.players)) {
            console.warn('Received invalid player update data:', data);
            return;
        }

        console.log(`Received update for ${data.players.length} players`);

        // Process each player update
        data.players.forEach(playerData => {
            // Skip updates without ID
            if (!playerData.id) {
                console.warn('Player update missing ID:', playerData);
                return;
            }

            if (playerData.id === this.clientId) {
                // Update for local player (health sync)
                console.log('Updating local player health:', playerData.health);
                this.updateRemotePlayerHealth(playerData);
            } else {
                // Update for remote player
                const remotePlane = this.remotePlanes.get(playerData.id);

                if (!remotePlane) {
                    console.log(`Remote plane for ${playerData.id} not found, creating it`);

                    // Create the remote plane if it doesn't exist yet
                    if (this.playerPlane && this.playerPlane.scene) {
                        const planeFactory = new PlaneFactory(this.playerPlane.scene, this.eventBus);
                        this.createRemotePlane(planeFactory, playerData);
                    } else {
                        console.warn('Cannot create remote plane: scene not available');
                    }
                } else {
                    console.log(`Updating remote plane ${playerData.id}`);
                    this.updateRemotePlayer(playerData);
                }
            }
        });
    }

    /**
     * Handle damage event
     * @private
     * @param {Object} data - Damage event data
     */
    _handleDamage(data) {
        // Handle damage to local player
        if (data.targetId === this.clientId) {
            console.log(`Received damage: ${data.amount} from ${data.sourceId}`);

            // Apply damage to player plane
            if (this.playerPlane && !this.playerPlane.isDestroyed) {
                // Create impact position if provided
                let impactPosition = null;
                if (data.position) {
                    impactPosition = new THREE.Vector3(
                        data.position.x,
                        data.position.y,
                        data.position.z
                    );
                }

                // Apply damage to player plane with server as the source
                // This ensures the server is authoritative for health management
                this.playerPlane.applyDamage(data.amount, impactPosition, 'server');

                // Emit server health update event
                this.eventBus.emit('network.health.update', {
                    health: this.playerPlane.health
                });

                // Emit damage event (will be caught by UI to update health bar)
                this.eventBus.emit('plane.damage', {
                    amount: data.amount,
                    impactPosition: impactPosition
                }, 'player');
            }
        }
    }

    /**
     * Update a remote player's health
     * @param {Object} data - Health update data
     */
    updateRemotePlayerHealth(data) {
        // Skip if this is our own plane - we need special handling for the local player
        if (data.id === this.clientId) {
            console.log('Received health update for local player, current health:', this.playerPlane.currentHealth,
                'new health:', data.health);

            // Check if our own health has been changed by the server
            if (this.playerPlane && this.playerPlane.currentHealth !== data.health) {
                console.log(`Updating local player health from ${this.playerPlane.currentHealth} to ${data.health}`);

                // Update local player's health using the setHealth method to ensure proper side effects
                this.playerPlane.setHealth(data.health);

                // Update destroyed state if needed
                if (data.isDestroyed && !this.playerPlane.isDestroyed) {
                    this.playerPlane.destroy();
                }

                // Show health update notification
                this.eventBus.emit('notification', {
                    message: `Health: ${Math.round(data.health)}%`,
                    type: data.health < 30 ? 'error' : 'warning',
                    duration: 2000
                });
            }

            // Create hit effect at the impact position if provided and plane is still alive
            if (data.impactPosition && data.health > 0) {
                const impactPos = new THREE.Vector3(
                    data.impactPosition.x,
                    data.impactPosition.y,
                    data.impactPosition.z
                );

                console.log('Creating hit effect at impact position for local player');

                // Emit hit effect event at the impact position
                this.eventBus.emit('effect.hit', {
                    position: impactPos,
                    playSound: true
                });
            } else {
                console.warn('Health update for local player missing impact position');
            }

            return;
        }

        // Handle remote player health update
        const remotePlane = this.remotePlanes.get(data.id);
        if (!remotePlane) {
            console.warn(`Cannot update health for unknown remote player ${data.id}`);
            return;
        }

        const oldHealth = remotePlane.health || 100; // Use health property directly

        // Update remote plane's health
        remotePlane.health = data.health; // Set health property directly

        // Ensure the plane knows its health has changed for smoke effects
        if (remotePlane.setHealth) {
            // Use proper method if available (which will trigger proper events and smoke effects)
            remotePlane.setHealth(data.health);
        } else {
            console.log(`Remote plane ${data.id} health updated to ${data.health}`);
        }

        // Update destroyed state if needed
        if (data.isDestroyed && !remotePlane.isDestroyed) {
            remotePlane.destroy();
        }
    }

    /**
     * Handle a remote player being destroyed
     * @param {Object} data - Destroyed event data
     */
    handleRemotePlayerDestroyed(data) {
        const remotePlane = this.remotePlanes.get(data.id);
        if (!remotePlane) {
            console.warn(`Cannot handle destruction for unknown remote player ${data.id}`);
            return;
        }

        // Skip if already destroyed to avoid duplicate effects
        if (remotePlane.isDestroyed) {
            console.log(`Remote player ${data.id} already destroyed, skipping`);
            return;
        }

        console.log(`Processing destruction for remote player ${data.id}`);

        // Ensure freeFall is properly initialized before destroying
        if (!remotePlane.freeFall) {
            remotePlane.freeFall = {
                active: false,
                velocity: new THREE.Vector3(),
                angularVelocity: new THREE.Vector3(),
                gravity: 9.8,
                groundLevel: 0
            };
        }

        // Mark the plane as destroyed (before calling destroy() to avoid recursion)
        remotePlane.isDestroyed = true;

        // Make sure plane is visible for the free-fall animation
        if (remotePlane.mesh) {
            remotePlane.mesh.visible = true;

            // Set health to 0
            remotePlane.health = 0;

            // Calculate initial velocity for free-fall based on plane's orientation
            const forwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(remotePlane.mesh.quaternion);

            // Set velocity - use the plane's current direction
            remotePlane.freeFall.velocity.copy(forwardDirection.multiplyScalar(20)); // Use a default speed

            // Set random angular velocity for tumbling
            remotePlane.freeFall.angularVelocity.set(
                (Math.random() - 0.5) * 2,  // Random X rotation
                (Math.random() - 0.5) * 0.5, // Less Y rotation (yaw)
                (Math.random() - 0.5) * 3   // More Z rotation (roll)
            );

            // Activate free-fall
            remotePlane.freeFall.active = true;

            // Disable wing trails if present
            if (remotePlane.wingTrails) {
                if (remotePlane.wingTrails.left) remotePlane.wingTrails.left.mesh.visible = false;
                if (remotePlane.wingTrails.right) remotePlane.wingTrails.right.mesh.visible = false;
            }

            console.log(`Remote player ${data.id} free-fall initialized with velocity:`, remotePlane.freeFall.velocity);
        } else {
            console.warn(`Remote plane ${data.id} has no mesh, cannot set up free-fall properly`);
        }

        // Show notification
        if (data.sourceId === this.clientId) {
            // We are the killer
            this.eventBus.emit('notification', {
                message: `You shot down a remote player!`,
                type: 'success',
                duration: 3000
            });
        } else {
            // Someone else got the kill
            this.eventBus.emit('notification', {
                message: `Remote player was shot down!`,
                type: 'warning',
                duration: 3000
            });
        }

        // Set up timer to completely remove the plane after 10 seconds
        setTimeout(() => {
            if (remotePlane && remotePlane.mesh) {
                console.log(`Removing destroyed remote player ${data.id} after timeout`);
                remotePlane.mesh.visible = false;
            }
        }, 10000);
    }

    /**
     * Handle disconnection from the server
     */
    handleDisconnection() {
        console.log('Disconnected from multiplayer server');
        this.connected = false;

        // Clean up remote planes
        this.remotePlanes.forEach((plane) => {
            plane.dispose();
        });
        this.remotePlanes.clear();

        this.eventBus.emit('notification', {
            message: 'Disconnected from multiplayer server',
            type: 'warning'
        });
    }

    /**
     * Handle connection errors
     * @param {Event} error - The error event
     */
    handleError(error) {
        console.error('WebSocket error:', error);
        this.eventBus.emit('notification', {
            message: 'Multiplayer connection error',
            type: 'error'
        });
    }

    /**
     * Initialize planes for existing players
     * @param {Array} players - Array of player data
     */
    initExistingPlayers(players) {
        if (!players || players.length === 0) return;

        console.log(`Initializing ${players.length} existing players`);

        // Make sure playerPlane and scene are available
        if (!this.playerPlane || !this.playerPlane.scene) {
            console.warn('Cannot initialize remote planes: playerPlane or scene not available yet');

            // Store players data to initialize later
            this._pendingPlayers = players;

            // Set a retry mechanism
            if (!this._retryInterval) {
                this._retryInterval = setInterval(() => {
                    if (this.playerPlane && this.playerPlane.scene) {
                        clearInterval(this._retryInterval);
                        this._retryInterval = null;

                        // If we have pending players, initialize them now
                        if (this._pendingPlayers && this._pendingPlayers.length > 0) {
                            console.log('Retrying initialization of remote planes');
                            this.initExistingPlayers(this._pendingPlayers);
                            this._pendingPlayers = null;
                        }
                    }
                }, 500); // Try every 500ms
            }

            return;
        }

        // Get scene from player plane
        const scene = this.playerPlane.scene;

        // Create plane factory with scene and event bus
        const planeFactory = new PlaneFactory(scene, this.eventBus);

        // Create planes for each player
        players.forEach((playerData) => {
            // Skip our own player
            if (playerData.id !== this.clientId) {
                console.log(`Creating plane for player ${playerData.callsign || 'Unknown'} (ID: ${playerData.id})`);
                this.createRemotePlane(planeFactory, playerData);
            }
        });

        // Notify about players if there are any
        if (players.length > 0) {
            console.log(`Initialized ${players.length} remote players`);
            this.eventBus.emit('notification', {
                message: `${players.length} other players in game`,
                type: 'info'
            });
        }
    }

    /**
     * Create a plane for a remote player
     * @param {PlaneFactory} planeFactory - Factory for creating planes
     * @param {Object} playerData - Player data including ID and position
     * @returns {Object} The created remote plane
     */
    createRemotePlane(planeFactory, playerData) {
        const playerId = playerData.id;

        // Skip if this is our own plane or if it already exists
        if (playerId === this.clientId || this.remotePlanes.has(playerId)) {
            console.log(`Skipping creation of remote plane for player ${playerId} - player is self or already exists`);
            return null;
        }

        console.log(`Creating remote plane for player ${playerData.callsign || 'Unknown'} (${playerId})`);

        try {
            // Make sure we have a valid planeFactory with scene and eventBus
            if (!planeFactory.scene && this.playerPlane && this.playerPlane.scene) {
                console.log('PlaneFactory missing scene, using player plane scene');
                planeFactory.scene = this.playerPlane.scene;
                planeFactory.eventBus = this.eventBus;
            }

            // Create the remote plane
            const remotePlane = planeFactory.createRemotePlayerPlane();
            if (!remotePlane) {
                console.error('Failed to create remote plane - null returned from factory');
                return null;
            }

            // Store callsign and ID
            remotePlane.callsign = playerData.callsign || `Player-${playerId.substring(0, 6)}`;
            remotePlane.playerId = playerId;

            // Set health values (important for smoke effects and trail rendering)
            if (playerData.health !== undefined) {
                remotePlane.currentHealth = playerData.health;
                remotePlane.maxHealth = 100; // Assuming max health is 100
            }

            // Set speed values (important for trail rendering)
            if (playerData.speed !== undefined) {
                remotePlane.speed = playerData.speed;
            }

            // Initialize free-fall physics
            remotePlane.freeFall = {
                active: false,
                velocity: new THREE.Vector3(),
                angularVelocity: new THREE.Vector3(),
                gravity: 9.8,
                groundLevel: 0
            };

            // Set initial position if provided
            if (playerData.position && remotePlane.mesh) {
                remotePlane.mesh.position.set(
                    playerData.position.x,
                    playerData.position.y,
                    playerData.position.z
                );
                remotePlane.targetPosition = remotePlane.mesh.position.clone();
            }

            // Set initial rotation if provided
            if (playerData.rotation && remotePlane.mesh) {
                remotePlane.mesh.rotation.set(
                    playerData.rotation.x,
                    playerData.rotation.y,
                    playerData.rotation.z
                );
                remotePlane.targetRotation = remotePlane.mesh.rotation.clone();
            }

            // Set initial health if provided
            if (playerData.health !== undefined) {
                remotePlane.health = playerData.health;
            }

            // Set destroyed state if provided
            if (playerData.isDestroyed) {
                remotePlane.isDestroyed = true;
                if (remotePlane.mesh) {
                    remotePlane.mesh.visible = false;
                }
            }

            // Add to remote planes map
            this.remotePlanes.set(playerId, remotePlane);

            // Notify event listeners about the new remote plane
            this.eventBus.emit('network.plane.created', remotePlane);

            // Log success
            console.log(`Successfully created remote plane for player ${playerId}`);
            return remotePlane;
        } catch (error) {
            console.error(`Error creating remote plane for player ${playerId}:`, error);
            return null;
        }
    }

    /**
     * Update a remote player
     * @param {Object} data - Player update data
     */
    updateRemotePlayer(data) {
        if (!data || !data.id) {
            console.warn('Received invalid player update data', data);
            return;
        }

        const playerId = data.id;

        // Skip updates for our own plane
        if (playerId === this.clientId) return;

        let remotePlane = this.remotePlanes.get(playerId);

        // If the plane doesn't exist yet, create it
        if (!remotePlane) {
            try {
                console.log(`Creating missing remote plane for player ${playerId}`);

                // Create a plane factory if we don't already have one
                const planeFactory = new PlaneFactory(
                    this.playerPlane ? this.playerPlane.scene : null,
                    this.eventBus
                );

                // Create a new remote plane
                remotePlane = this.createRemotePlane(planeFactory, data);

                if (!remotePlane) {
                    console.error('Failed to create remote plane for player update');
                    return;
                }

                this.remotePlanes.set(playerId, remotePlane);
            } catch (err) {
                console.error('Error creating remote plane:', err);
                return;
            }
        }

        // Special handling for respawned planes (this is critical for proper visibility)
        if (data.isRespawned === true) {
            console.log(`Received update for respawned remote player ${playerId}`);

            // Reset destroyed state
            remotePlane.isDestroyed = false;

            // Reset freeFall if it was active
            if (remotePlane.freeFall) {
                remotePlane.freeFall.active = false;
            }

            // Force visibility on for the plane and all its children
            if (remotePlane.mesh) {
                remotePlane.mesh.visible = true;

                // CRITICAL: Traverse all children to ensure visibility
                remotePlane.mesh.traverse(child => {
                    if (child.isMesh) {
                        child.visible = true;
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat) {
                                        mat.transparent = true;
                                        mat.opacity = 1.0;
                                        mat.visible = true;
                                    }
                                });
                            } else {
                                child.material.transparent = true;
                                child.material.opacity = 1.0;
                                child.material.visible = true;
                            }
                        }
                    }
                });

                console.log(`Restored visibility for respawned remote player ${playerId}`);
            }
        }

        // Update position, rotation, and health of remote plane
        if (remotePlane.mesh) {
            // Update target position for interpolation
            if (data.position) {
                remotePlane.targetPosition = new THREE.Vector3(
                    data.position.x,
                    data.position.y,
                    data.position.z
                );
            }

            // Update target rotation for interpolation
            if (data.rotation) {
                remotePlane.targetRotation = {
                    x: data.rotation.x,
                    y: data.rotation.y,
                    z: data.rotation.z
                };
            }

            // Update health
            if (typeof data.health === 'number') {
                remotePlane.currentHealth = data.health;
            }

            // Update speed (important for trail rendering)
            if (typeof data.speed === 'number') {
                remotePlane.speed = data.speed;
                remotePlane.maxSpeed = remotePlane.maxSpeed || 100; // Default max speed if not set

                // Update whether trails should be enabled based on speed
                if (remotePlane.speed > remotePlane.maxSpeed * 0.35) {
                    remotePlane.trailsEnabled = true;
                }
            }

            // Update whether the plane is destroyed
            if (data.isDestroyed === true && !remotePlane.isDestroyed) {
                this.handleRemotePlayerDestroyed({
                    id: playerId,
                    position: remotePlane.mesh.position,
                    rotation: remotePlane.mesh.rotation
                });
            }
        }
    }

    /**
     * Remove a remote player from the game
     * @param {string} playerId - ID of the player to remove
     */
    removeRemotePlayer(playerId) {
        const remotePlane = this.remotePlanes.get(playerId);

        if (!remotePlane) return;

        console.log(`Removing remote player ${playerId}`);

        // Remove from scene
        if (remotePlane.mesh && remotePlane.mesh.parent) {
            remotePlane.mesh.parent.remove(remotePlane.mesh);
        }

        // Remove from remote planes map
        this.remotePlanes.delete(playerId);

        // Notify event listeners
        this.eventBus.emit('network.plane.removed', remotePlane);
    }

    /**
     * Send update to server with player's current position and state
     * @param {number} currentTime - Current game time
     */
    sendUpdate(currentTime) {
        if (!this.connected || !this.socket || !this.playerPlane) return;

        // Throttle updates based on updateInterval
        if (currentTime - this.lastUpdateTime < this.updateInterval) return;

        this.lastUpdateTime = currentTime;

        // Get player data for update
        const playerData = this._getPlayerUpdateData();

        // Send update to server
        this._sendMessage({
            type: 'update',
            player: playerData
        });
    }

    /**
     * Get player data for network updates
     * @returns {Object} Player data for network
     * @private
     */
    _getPlayerUpdateData() {
        if (!this.playerPlane || !this.playerPlane.mesh) return null;

        const position = this.playerPlane.mesh.position;
        const rotation = this.playerPlane.mesh.rotation;

        // Include essential data
        const data = {
            id: this.clientId,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: {
                x: rotation.x,
                y: rotation.y,
                z: rotation.z
            },
            health: this.playerPlane.getHealth(),
            isDestroyed: this.playerPlane.isDestroyed === true,
            callsign: this.callsign,
            timestamp: performance.now(),
            speed: this.playerPlane.speed || 0, // Include speed for trail rendering
            isRespawned: this.playerWasRespawned || false // Include respawn flag
        };

        return data;
    }

    /**
     * Main update method called each frame
     * @param {number} currentTime - Current game time
     */
    update(currentTime) {
        if (!this.connected) return;

        // Send player updates to server
        this.sendUpdate(currentTime);

        // Update all remote planes
        this._updateRemotePlanes(currentTime);
    }

    /**
     * Update all remote planes for interpolation
     * @private
     * @param {number} currentTime - Current game time
     */
    _updateRemotePlanes(currentTime) {
        // Skip if no player plane is available for reference
        if (!this.playerPlane) return;

        const deltaTime = (currentTime - this.lastRemoteUpdateTime) / 1000;
        this.lastRemoteUpdateTime = currentTime;

        // Update all remote planes
        this.remotePlanes.forEach((remotePlane, playerId) => {
            // Skip updating planes that are marked for removal
            if (remotePlane.pendingRemoval) return;

            // Skip if the plane mesh is missing
            if (!remotePlane.mesh) {
                console.warn(`Remote plane ${playerId} has no mesh, can't update`);
                return;
            }

            // IMPORTANT: Handle planes that have been respawned specifically
            if (remotePlane.isRespawned) {
                // Ensure the plane and all its children are visible
                remotePlane.mesh.visible = true;
                remotePlane.mesh.traverse(child => {
                    if (child.isMesh) child.visible = true;
                });

                // Treat respawned planes as not destroyed for rendering purposes
                if (remotePlane.isDestroyed) {
                    remotePlane.isDestroyed = false;
                }

                // Reset freeFall if it's active
                if (remotePlane.freeFall && remotePlane.freeFall.active) {
                    remotePlane.freeFall.active = false;
                }
            }

            // Handle free-fall physics for destroyed planes
            if (remotePlane.isDestroyed && remotePlane.freeFall && remotePlane.freeFall.active) {
                this._updateRemotePlaneFreefall(remotePlane, deltaTime);

                // Continue updating explosion effects if they exist
                if (remotePlane.explosionFX) {
                    remotePlane.explosionFX.update(deltaTime);
                }

                // Update wing trails for planes in free fall
                if (remotePlane.wingTrails &&
                    remotePlane.wingTrails.left &&
                    remotePlane.wingTrails.right) {
                    remotePlane.updateWingTrails(deltaTime);
                }

                return;
            }

            // Initialize key properties required for trail rendering if they're missing
            if (!remotePlane.maxSpeed || remotePlane.maxSpeed <= 0) {
                remotePlane.maxSpeed = 100;
            }

            // If speed isn't available from network updates, calculate it based on position changes
            if (!remotePlane.lastPosition) {
                remotePlane.lastPosition = remotePlane.mesh.position.clone();
                remotePlane.speed = 0;
            } else {
                // Calculate speed based on position change
                const distance = remotePlane.mesh.position.distanceTo(remotePlane.lastPosition);
                // Convert to units/second
                remotePlane.speed = distance / deltaTime;
                // Clamp to reasonable range
                remotePlane.speed = Math.min(remotePlane.maxSpeed, remotePlane.speed);
                // Update last position
                remotePlane.lastPosition.copy(remotePlane.mesh.position);
            }

            // Force trails to be enabled for multiplayer planes
            remotePlane.trailsEnabled = true;
            remotePlane.isAirborne = true;

            // Initialize wing trails if needed
            if (!remotePlane.wingTrails || !remotePlane.wingTrails.left || !remotePlane.wingTrails.right) {
                console.log(`Initializing missing wing trails for remote plane ${playerId}`);
                const wingSpan = 10; // Default wingspan
                const wingHeight = 0;
                const wingZ = 0;
                remotePlane.initWingTrails(wingSpan, wingHeight, wingZ);
                remotePlane.customizeWingTrails();
            }

            // Smoothly interpolate position
            if (remotePlane.targetPosition) {
                const maxMoveDistance = 20 * deltaTime; // Max movement per second for lag compensation
                const targetPosition = remotePlane.targetPosition;
                const currentPosition = remotePlane.mesh.position;

                // Calculate distance to target
                const distanceToTarget = currentPosition.distanceTo(targetPosition);

                if (distanceToTarget > 0.1) {
                    // Interpolate position
                    remotePlane.mesh.position.lerp(targetPosition, this.interpolationFactor);
                }
            }

            // Smoothly interpolate rotation
            if (remotePlane.targetRotation) {
                remotePlane.mesh.rotation.x = this._interpolateRotation(
                    remotePlane.mesh.rotation.x,
                    remotePlane.targetRotation.x,
                    this.interpolationFactor
                );
                remotePlane.mesh.rotation.y = this._interpolateRotation(
                    remotePlane.mesh.rotation.y,
                    remotePlane.targetRotation.y,
                    this.interpolationFactor
                );
                remotePlane.mesh.rotation.z = this._interpolateRotation(
                    remotePlane.mesh.rotation.z,
                    remotePlane.targetRotation.z,
                    this.interpolationFactor
                );
            }

            // Update propeller animation for visual feedback
            if (remotePlane.updatePropeller) {
                remotePlane.updatePropeller(deltaTime);
            }

            // Always update wing trails for remote planes
            if (remotePlane.updateWingTrails) {
                remotePlane.updateWingTrails(deltaTime);
            }

            // Update smoke effects if they exist
            if (remotePlane.smokeFX) {
                const healthPercent = remotePlane.currentHealth / remotePlane.maxHealth;
                remotePlane.smokeFX.emitSmoke(remotePlane, healthPercent, deltaTime);
                remotePlane.smokeFX.update(deltaTime);
            }

            // Update explosion effects if they exist
            if (remotePlane.explosionFX) {
                remotePlane.explosionFX.update(deltaTime);
            }
        });
    }

    /**
     * Apply free-fall physics to a destroyed remote plane
     * @private
     * @param {Object} remotePlane - The remote plane object
     * @param {number} deltaTime - Time since last frame in seconds
     */
    _updateRemotePlaneFreefall(remotePlane, deltaTime) {
        const freeFall = remotePlane.freeFall;

        // Skip if free-fall is not active
        if (!freeFall || !freeFall.active) {
            return;
        }

        // Apply gravity
        freeFall.velocity.y -= freeFall.gravity * deltaTime;

        // Apply drag (air resistance)
        const dragFactor = 0.995;
        freeFall.velocity.multiplyScalar(dragFactor);

        // Update position
        remotePlane.mesh.position.x += freeFall.velocity.x * deltaTime;
        remotePlane.mesh.position.y += freeFall.velocity.y * deltaTime;
        remotePlane.mesh.position.z += freeFall.velocity.z * deltaTime;

        // Update rotation (tumbling)
        remotePlane.mesh.rotation.x += freeFall.angularVelocity.x * deltaTime;
        remotePlane.mesh.rotation.y += freeFall.angularVelocity.y * deltaTime;
        remotePlane.mesh.rotation.z += freeFall.angularVelocity.z * deltaTime;

        // Check if plane hit the ground
        if (remotePlane.mesh.position.y <= freeFall.groundLevel) {
            remotePlane.mesh.position.y = freeFall.groundLevel;

            // Reduce velocity on impact
            freeFall.velocity.multiplyScalar(0.3);
            freeFall.velocity.y = 0;

            // Reduce angular velocity
            freeFall.angularVelocity.multiplyScalar(0.7);

            // Emit smoke and debris on ground impact if the plane just hit the ground
            if (!remotePlane.hasHitGround) {
                remotePlane.hasHitGround = true;

                // Emit ground impact effect
                this.eventBus.emit('effect.groundImpact', {
                    position: remotePlane.mesh.position.clone(),
                    scale: 1.5
                });

                // Play impact sound
                this.eventBus.emit('sound.play', {
                    sound: 'impact',
                    volume: 0.5
                });

                console.log(`Remote plane ${remotePlane.playerId} has hit the ground`);
            }
        }
    }

    /**
     * Interpolate rotation along the shortest path
     * @private
     * @param {number} current - Current rotation
     * @param {number} target - Target rotation
     * @param {number} factor - Interpolation factor
     * @returns {number} Interpolated rotation
     */
    _interpolateRotation(current, target, factor) {
        // Calculate the difference between current and target
        const diff = target - current;

        // Apply the interpolation factor
        const interpolated = current + diff * factor;

        return interpolated;
    }

    /**
     * Send fire event to the server
     * @param {Object} data - Fire event data
     */
    sendFireEvent(data) {
        if (!this.connected || !this.socket || !this.playerPlane) return;

        // Get player velocity for ballistic calculation
        const velocity = this.playerPlane.velocity || new THREE.Vector3(0, 0, 0);

        this._sendMessage({
            type: 'fire',
            position: this._getPlayerPosition(),
            rotation: this._getPlayerRotation(),
            velocity: {
                x: velocity.x,
                y: velocity.y,
                z: velocity.z
            }
        });
    }

    /**
     * Updates the reference to the player plane
     * @param {Object} newPlayerPlane - The new player plane object
     */
    updatePlayerPlaneReference(newPlayerPlane) {
        if (!newPlayerPlane) {
            console.warn('Cannot update player plane reference: new reference is missing');
            return;
        }

        console.log('Updating NetworkManager player plane reference');
        this.playerPlane = newPlayerPlane;

        // Re-setup collision handler with the new player plane
        this._setupCollisionHandler();

        // Notify other players that we've respawned
        this.sendRespawnNotification();
    }

    /**
     * Sets the protection zone reference and applies it to all remote planes
     * @param {ProtectionZone} protectionZone - The protection zone reference
     */
    setProtectionZone(protectionZone) {
        this.protectionZone = protectionZone;

        // Apply to all existing remote planes
        if (this.remotePlanes) {
            this.remotePlanes.forEach((remotePlane) => {
                if (remotePlane.ammoSystem) {
                    remotePlane.ammoSystem.setProtectionZone(protectionZone);
                }
            });
        }
    }

    /**
     * Send a respawn notification to other players
     * This helps ensure other players know we've respawned and should be visible
     */
    sendRespawnNotification() {
        if (!this.connected || !this.socket || !this.playerPlane) return;

        console.log('Sending respawn notification to other players');

        // Force local player state to be visible and not destroyed
        if (this.playerPlane) {
            this.playerPlane.isDestroyed = false;
            if (this.playerPlane.mesh) {
                this.playerPlane.mesh.visible = true;
            }
        }

        // Set respawned flag for updates
        this.playerWasRespawned = true;

        // Create respawn message
        const respawnMsg = {
            type: 'respawn',
            position: {
                x: this.playerPlane.mesh.position.x,
                y: this.playerPlane.mesh.position.y,
                z: this.playerPlane.mesh.position.z
            },
            rotation: {
                x: this.playerPlane.mesh.rotation.x,
                y: this.playerPlane.mesh.rotation.y,
                z: this.playerPlane.mesh.rotation.z
            },
            health: this.playerPlane.maxHealth,
            isDestroyed: false,
            isRespawned: true, // Explicitly set respawn flag
            respawnTime: Date.now() // Add timestamp for unique identification
        };

        // Send to server
        try {
            this.socket.send(JSON.stringify(respawnMsg));

            // Set up a series of follow-up updates to ensure visibility
            const followUpTimes = [100, 500, 1000, 2000, 5000]; // Multiple follow-ups at different times

            followUpTimes.forEach(delay => {
                setTimeout(() => {
                    if (!this.connected || !this.socket || !this.playerPlane) return;

                    console.log(`Sending follow-up update ${delay}ms after respawn`);

                    // Include all plane data plus respawn flags
                    const updateData = {
                        ...this._getPlayerUpdateData(),
                        isRespawned: true,
                        isDestroyed: false,
                        health: this.playerPlane.maxHealth,
                        respawnTime: Date.now() // Fresh timestamp
                    };

                    this._sendMessage({
                        type: 'update',
                        player: updateData
                    });

                    // For debugging
                    if (delay === followUpTimes[followUpTimes.length - 1]) {
                        console.log('Sent final follow-up update after respawn');
                    }
                }, delay);
            });
        } catch (error) {
            console.error('Error sending respawn notification:', error);
        }
    }

    /**
     * Handle player respawn event from the server
     * @private
     * @param {Object} data - Respawn data
     */
    _handlePlayerRespawn(data) {
        // Verify data format
        if (!data.player || !data.player.id) {
            console.warn('Received invalid player_respawn data', data);
            return;
        }

        const playerData = data.player;
        const playerId = playerData.id;

        // Handle local player respawn
        if (playerId === this.clientId) {
            console.log('Local player respawn confirmed by server');

            // Make sure local player exists
            if (this.playerPlane) {
                // Ensure health is synchronized
                this.playerPlane.setHealth(playerData.health || 100);

                // Update visibility
                this.playerPlane.isDestroyed = false;
                this.playerPlane.mesh.visible = true;

                // Emit event for health update
                this.eventBus.emit('network.health.update', {
                    health: this.playerPlane.health
                });
            }

            return;
        }

        // Handle remote player respawn
        console.log(`Remote player ${playerId} respawned`);

        // Get the remote plane
        let remotePlane = this.remotePlanes.get(playerId);

        if (!remotePlane) {
            // Create new remote plane if it doesn't exist
            console.log(`Creating new plane for respawned player ${playerId}`);
            if (this.playerPlane && this.playerPlane.scene) {
                const planeFactory = new PlaneFactory(this.playerPlane.scene, this.eventBus);
                remotePlane = this.createRemotePlane(planeFactory, playerData);

                // Force respawn state to ensure visibility
                if (remotePlane) {
                    remotePlane.isRespawned = true;
                    remotePlane.isDestroyed = false;
                    if (remotePlane.mesh) {
                        remotePlane.mesh.visible = true;

                        // Ensure proper scale and rotation
                        remotePlane.mesh.scale.set(1, 1, 1);

                        // Log detailed state
                        console.log(`New remote plane created for respawn:`, {
                            id: playerId,
                            visible: remotePlane.mesh.visible,
                            position: remotePlane.mesh.position.toArray()
                        });
                    }
                }
            } else {
                console.warn('Cannot create remote plane for respawned player: scene not available');
                return;
            }
        } else {
            // Update existing plane
            console.log(`Updating existing remote plane for respawned player ${playerId}`);

            // Force reset of key properties for visibility
            remotePlane.isDestroyed = false;
            remotePlane.isRespawned = true;

            // Reset freeFall state if active
            if (remotePlane.freeFall) {
                remotePlane.freeFall.active = false;
                remotePlane.freeFall.velocity.set(0, 0, 0);
                remotePlane.freeFall.angularVelocity.set(0, 0, 0);
            }

            // Reset hasHitGround if set
            if (remotePlane.hasHitGround) {
                delete remotePlane.hasHitGround;
            }

            // Make plane visible - CRITICAL FIX
            if (remotePlane.mesh) {
                // Ensure visibility
                remotePlane.mesh.visible = true;

                // Reset transform completely to avoid scale/rotation issues
                remotePlane.mesh.scale.set(1, 1, 1);

                // Reset any custom material properties that might affect visibility
                if (remotePlane.mesh.material) {
                    if (Array.isArray(remotePlane.mesh.material)) {
                        remotePlane.mesh.material.forEach(mat => {
                            if (mat) {
                                mat.transparent = true;
                                mat.opacity = 1.0;
                                mat.visible = true;
                            }
                        });
                    } else if (remotePlane.mesh.material) {
                        remotePlane.mesh.material.transparent = true;
                        remotePlane.mesh.material.opacity = 1.0;
                        remotePlane.mesh.material.visible = true;
                    }
                }

                // CRITICAL: Traverse all children to ensure visibility
                // This is necessary for the plane's mesh children to be visible
                remotePlane.mesh.traverse(child => {
                    if (child.isMesh) {
                        child.visible = true;
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat) {
                                        mat.transparent = true;
                                        mat.opacity = 1.0;
                                        mat.visible = true;
                                    }
                                });
                            } else {
                                child.material.transparent = true;
                                child.material.opacity = 1.0;
                                child.material.visible = true;
                            }
                        }
                    }
                });

                console.log(`Set mesh visibility to true for respawned player ${playerId} - FIXED`);

                // Re-enable wing trails - CRITICAL for trail visibility
                remotePlane.trailsEnabled = true;

                // Reset and make wing trails visible
                if (remotePlane.wingTrails) {
                    // Recreate wing trails if they don't exist
                    if (!remotePlane.wingTrails.left || !remotePlane.wingTrails.right) {
                        console.log('Reinitializing wing trails for respawned plane');
                        const wingSpan = 10; // Default wingspan
                        const wingHeight = 0;
                        const wingZ = 0;
                        remotePlane.initWingTrails(wingSpan, wingHeight, wingZ);
                    }

                    // Make existing wing trails visible
                    if (remotePlane.wingTrails.left && remotePlane.wingTrails.left.mesh) {
                        remotePlane.wingTrails.left.mesh.visible = true;
                    }
                    if (remotePlane.wingTrails.right && remotePlane.wingTrails.right.mesh) {
                        remotePlane.wingTrails.right.mesh.visible = true;
                    }

                    // Force customization
                    if (remotePlane.customizeWingTrails) {
                        remotePlane.customizeWingTrails();
                    }
                }
            } else {
                console.warn(`Remote plane ${playerId} has no mesh!`);
            }
        }

        // Update position if provided
        if (playerData.position && remotePlane.mesh) {
            remotePlane.mesh.position.set(
                playerData.position.x,
                playerData.position.y,
                playerData.position.z
            );
            remotePlane.targetPosition = remotePlane.mesh.position.clone();
        }

        // Update rotation if provided
        if (playerData.rotation && remotePlane.mesh) {
            remotePlane.mesh.rotation.set(
                playerData.rotation.x,
                playerData.rotation.y,
                playerData.rotation.z
            );
            remotePlane.targetRotation = remotePlane.mesh.rotation.clone();
        }

        // Reset health
        remotePlane.health = playerData.health || 100;

        // Re-enable wing trails if they exist
        if (remotePlane.wingTrails) {
            if (remotePlane.wingTrails.left) remotePlane.wingTrails.left.mesh.visible = true;
            if (remotePlane.wingTrails.right) remotePlane.wingTrails.right.mesh.visible = true;
        }

        // Create respawn effect
        if (remotePlane && remotePlane.mesh) {
            this.eventBus.emit('effect.respawn', {
                position: remotePlane.mesh.position.clone()
            });

            // Debug - log plane state
            console.log(`Respawned remote plane state:`, {
                id: playerId,
                visible: remotePlane.mesh.visible,
                isDestroyed: remotePlane.isDestroyed,
                position: remotePlane.mesh.position.toArray(),
                health: remotePlane.health
            });
        }
    }

    /**
     * Add debugging information to the game
     * Can be called from the console for debugging
     */
    debug() {
        console.log('\n===== NETWORK MANAGER DEBUG INFO =====');
        console.log('Connected:', this.connected);
        console.log('Client ID:', this.clientId);
        console.log('Player Callsign:', this.callsign);

        console.log('\nRemote Planes:', this.remotePlanes.size);
        this.remotePlanes.forEach((plane, id) => {
            console.log(`- Player ID: ${id}, Callsign: ${plane.callsign || 'Unknown'}`);
            if (plane.mesh) {
                console.log(`  Position: ${plane.mesh.position.x.toFixed(1)}, ${plane.mesh.position.y.toFixed(1)}, ${plane.mesh.position.z.toFixed(1)}`);
                console.log(`  Visible: ${plane.mesh.visible}`);
            } else {
                console.log('  No mesh available');
            }
            console.log(`  Health: ${plane.health}`);
            console.log(`  Destroyed: ${plane.isDestroyed}`);
        });

        console.log('\nConnection Status:');
        if (this.socket) {
            const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
            console.log(`- WebSocket State: ${states[this.socket.readyState]}`);
        } else {
            console.log('- No WebSocket connection');
        }

        return 'Debug info printed to console';
    }

    /**
     * Handle leaderboard request
     * @param {Object} data - Leaderboard request data
     */
    requestLeaderboard(data) {
        // Implementation of leaderboard request handling
        console.log('Leaderboard request received:', data);
    }

    /**
     * Handle leaderboard data from the server
     * @private
     * @param {Object} data - Leaderboard data
     */
    _handleLeaderboard(data) {
        if (!data.data || !Array.isArray(data.data)) {
            console.warn('Received invalid leaderboard data:', data);
            return;
        }

        console.log(`Received leaderboard data with ${data.data.length} players`);

        // Forward leaderboard data to UI
        this.eventBus.emit('leaderboard.update', data.data);
    }
} 