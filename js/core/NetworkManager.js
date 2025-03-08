// NetworkManager.js - Handles multiplayer networking
import * as THREE from 'three';
import PlaneFactory from '../entities/PlaneFactory.js';
import AmmoSystem from '../entities/AmmoSystem.js';

export default class NetworkManager {
    constructor(eventBus, playerPlane) {
        // Core properties
        this.eventBus = eventBus;
        this.playerPlane = playerPlane;
        this.socket = null;
        this.connected = false;
        this.clientId = null;
        this.playerCallsign = null;

        // Remote players state
        this.remotePlanes = new Map(); // Map of remote planes by client ID

        // Network settings
        this.lastUpdateTime = 0;
        this.updateInterval = 20; // 50 updates/second
        this.interpolationFactor = 0.05; // For smooth movement
        this.lastRemoteUpdateTime = 0;

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
            this.playerCallsign = callsign;
            console.log(`Player callsign set to: ${this.playerCallsign}`);
        } else {
            // Generate a random callsign if none provided
            this.playerCallsign = `Pilot${Math.floor(Math.random() * 1000)}`;
            console.log(`Generated random callsign: ${this.playerCallsign}`);
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

        // Mark the plane as destroyed
        remotePlane.isDestroyed = true;

        // Create destruction effect
        if (remotePlane.mesh) {
            this.eventBus.emit('effect.explosion', {
                position: remotePlane.mesh.position.clone(),
                scale: 2.0
            });
        }

        // Hide the plane but don't remove it yet (it will be respawned)
        if (remotePlane.mesh) {
            remotePlane.mesh.visible = false;
        }
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
            callsign: this.playerCallsign,
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

        // Check if the plane took damage and is still alive
        else if (data.health < oldHealth && data.health > 0) {
            // Play hit sound
            this.eventBus.emit('sound.play', { sound: 'hit', volume: 0.3 });

            // Create hit effect at the impact position if provided, otherwise at plane position
            if (data.impactPosition) {
                const impactPos = new THREE.Vector3(
                    data.impactPosition.x,
                    data.impactPosition.y,
                    data.impactPosition.z
                );

                console.log('Creating hit effect at impact position');

                // Emit hit effect event
                this.eventBus.emit('effect.hit', {
                    position: impactPos,
                    playSound: false // Sound already played above
                });
            } else if (remotePlane.mesh) {
                console.log('Creating hit effect at plane position (fallback)');

                // Fallback to plane position if no impact position
                this.eventBus.emit('effect.hit', {
                    position: remotePlane.mesh.position.clone(),
                    playSound: false
                });
            }
        }
    }

    /**
     * Handle a remote player being destroyed
     * @param {Object} data - Destroyed event data
     */
    handleRemotePlayerDestroyed(data) {
        const remotePlane = this.remotePlanes.get(data.id);
        if (!remotePlane || remotePlane.isDestroyed) return;

        console.log(`Remote player ${data.id} was destroyed`);

        // Destroy the plane
        remotePlane.destroy();

        // Play explosion sound
        this.eventBus.emit('sound.play', { sound: 'explosion', volume: 0.8 });

        // Show notification
        this.eventBus.emit('notification', {
            message: `Remote player was shot down!`,
            type: 'warning',
            duration: 3000
        });
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
        if (!data.id || data.id === this.clientId) return;

        const playerId = data.id;
        let remotePlane = this.remotePlanes.get(playerId);

        // If plane doesn't exist, create it
        if (!remotePlane) {
            const planeFactory = new PlaneFactory();
            this.createRemotePlane(planeFactory, data);
            remotePlane = this.remotePlanes.get(playerId);

            // If still no remote plane, something went wrong
            if (!remotePlane) {
                console.warn(`Failed to create remote plane for player ${playerId}`);
                return;
            }
        }

        // Skip updates for destroyed planes
        if (remotePlane.isDestroyed && !data.isRespawned) return;

        // Reset visibility if respawned
        if (data.isRespawned && remotePlane.mesh) {
            remotePlane.isDestroyed = false;
            remotePlane.mesh.visible = true;
            remotePlane.health = 100;
        }

        // Update position target
        if (data.position && remotePlane.mesh) {
            if (!remotePlane.targetPosition) {
                remotePlane.targetPosition = new THREE.Vector3();
            }
            remotePlane.targetPosition.set(
                data.position.x,
                data.position.y,
                data.position.z
            );
        }

        // Update rotation target
        if (data.rotation && remotePlane.mesh) {
            if (!remotePlane.targetRotation) {
                remotePlane.targetRotation = new THREE.Euler();
            }
            remotePlane.targetRotation.set(
                data.rotation.x,
                data.rotation.y,
                data.rotation.z
            );
        }

        // Update health if provided
        if (data.health !== undefined) {
            remotePlane.health = data.health;
        }

        // Handle destruction
        if (data.isDestroyed && !remotePlane.isDestroyed) {
            remotePlane.isDestroyed = true;

            // Hide the plane
            if (remotePlane.mesh) {
                remotePlane.mesh.visible = false;
            }

            // Create explosion effect
            this.eventBus.emit('effect.explosion', {
                position: remotePlane.mesh.position.clone(),
                scale: 2.0
            });
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
     * Get current player data for updates
     * @private
     * @returns {Object} Player update data
     */
    _getPlayerUpdateData() {
        return {
            position: this._getPlayerPosition(),
            rotation: this._getPlayerRotation(),
            velocity: this.playerPlane.velocity ? {
                x: this.playerPlane.velocity.x,
                y: this.playerPlane.velocity.y,
                z: this.playerPlane.velocity.z
            } : { x: 0, y: 0, z: 0 },
            health: this.playerPlane.health,
            isDestroyed: this.playerPlane.isDestroyed || false
        };
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
        const deltaTime = (currentTime - (this.lastRemoteUpdateTime || currentTime)) / 1000;
        this.lastRemoteUpdateTime = currentTime;

        this.remotePlanes.forEach(remotePlane => {
            if (!remotePlane.mesh) return;

            // Skip position/rotation updates for destroyed planes, but still update effects
            if (!remotePlane.isDestroyed) {
                // Apply interpolation for smooth movement
                if (remotePlane.targetPosition) {
                    remotePlane.mesh.position.lerp(remotePlane.targetPosition, this.interpolationFactor);
                }

                // Apply interpolation for smooth rotation
                if (remotePlane.targetRotation) {
                    // Ensure rotation is the shortest path
                    this._interpolateRotation(remotePlane.mesh.rotation, remotePlane.targetRotation, this.interpolationFactor);
                }
            }

            // Update smoke effects based on health percentage
            if (remotePlane.smokeFX && typeof remotePlane.health === 'number') {
                const healthPercent = remotePlane.health / 100; // Assuming 100 is max health
                // Update smoke effects
                remotePlane.smokeFX.emitSmoke(remotePlane, healthPercent, deltaTime);
                remotePlane.smokeFX.update(deltaTime);
            }
        });
    }

    /**
     * Interpolate rotation along the shortest path
     * @private
     * @param {THREE.Euler} current - Current rotation
     * @param {THREE.Euler} target - Target rotation
     * @param {number} factor - Interpolation factor
     */
    _interpolateRotation(current, target, factor) {
        // Convert Euler angles to a more straightforward approach
        // Handle each axis separately for simplicity
        current.x += (target.x - current.x) * factor;
        current.y += (target.y - current.y) * factor;
        current.z += (target.z - current.z) * factor;
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
        if (!this.connected || !this.socket) return;

        console.log('Sending respawn notification to other players');

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
            isDestroyed: false
        };

        // Send to server
        try {
            this.socket.send(JSON.stringify(respawnMsg));
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
            } else {
                console.warn('Cannot create remote plane for respawned player: scene not available');
                return;
            }
        } else {
            // Update existing plane
            console.log(`Updating existing remote plane for respawned player ${playerId}`);

            // Reset destroyed state
            remotePlane.isDestroyed = false;

            // Make plane visible
            if (remotePlane.mesh) {
                remotePlane.mesh.visible = true;
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
        }

        // Create respawn effect
        if (remotePlane && remotePlane.mesh) {
            this.eventBus.emit('effect.respawn', {
                position: remotePlane.mesh.position.clone()
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
        console.log('Player Callsign:', this.playerCallsign);

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
} 