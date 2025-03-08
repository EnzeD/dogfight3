// NetworkManager.js - Handles multiplayer networking
import * as THREE from 'three';
import PlaneFactory from '../entities/PlaneFactory.js';
import AmmoSystem from '../entities/AmmoSystem.js';

export default class NetworkManager {
    constructor(eventBus, playerPlane) {
        this.eventBus = eventBus;
        this.playerPlane = playerPlane;
        this.socket = null;
        this.connected = false;
        this.clientId = null;
        this.remotePlanes = new Map(); // Map of remote planes by client ID
        this.lastUpdateTime = 0;
        this.updateInterval = 20; // Reduced from 50ms to 100ms (10 updates/second)
        this.interpolationFactor = 0.05; // For smooth movement

        // Listen for connection events
        this.eventBus.on('network.connect', this.connect.bind(this));
        this.eventBus.on('network.disconnect', this.disconnect.bind(this));

        // Listen for firing events
        this.eventBus.on('plane.fire', this.sendFireEvent.bind(this));

        // Listen for damage and destruction events
        this.eventBus.on('plane.damage', this.handleDamageEvent.bind(this));
        this.eventBus.on('plane.destroyed', this.handleDestroyedEvent.bind(this));

        // Set up damage handler for bullet collisions in multiplayer
        this.setupCollisionHandler();
    }

    /**
     * Sets up a collision handler for the local ammo system
     * to sync damage in multiplayer
     */
    setupCollisionHandler() {
        // Wait for the player plane's ammo system to be ready
        const checkInterval = setInterval(() => {
            if (this.playerPlane && this.playerPlane.ammoSystem) {
                clearInterval(checkInterval);

                console.log('Setting up multiplayer collision handler');

                // Store original checkCollisions method
                const originalCheckCollisions = this.playerPlane.ammoSystem.checkCollisions;

                // Also store original damage method from AmmoSystem
                const originalBulletDamage = this.playerPlane.ammoSystem.bulletDamage;

                // IMPORTANT: We need to temporarily disable local damage application for multiplayer
                // to prevent double damage (once locally and once via server)
                this.playerPlane.ammoSystem.bulletDamage = 0; // Set to 0 for multiplayer - damage will come from server

                // Override with our own that sends network messages
                this.playerPlane.ammoSystem.checkCollisions = () => {
                    // Call the original method to get collisions
                    const collisions = originalCheckCollisions.call(this.playerPlane.ammoSystem);

                    // Only process in multiplayer when connected
                    if (this.connected && collisions.length > 0) {
                        console.log(`Detected ${collisions.length} collisions in multiplayer`);

                        // For each collision, send damage event to server
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

                            if (targetId) {
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
                                    amount: originalBulletDamage, // Use the original damage amount
                                    position: collisionPos
                                });

                                // Show local hit effect immediately
                                this.eventBus.emit('effect.hit', {
                                    position: collisionPos,
                                    playSound: true
                                });
                            } else {
                                console.warn('Hit a plane but could not determine remote plane ID');
                            }
                        });
                    }

                    return collisions;
                };

                // Also add a custom handler for remote bullets hitting local player
                // This is needed because the server handles the actual damage calculation
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

                console.log('Multiplayer collision handler set up successfully');
            }
        }, 500);
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
            let position = null;
            if (data.position) {
                position = {
                    x: data.position.x,
                    y: data.position.y,
                    z: data.position.z
                };
            }

            const damageMsg = {
                type: 'damage',
                targetId: data.targetId,
                amount: data.amount,
                position: position
            };

            this.socket.send(JSON.stringify(damageMsg));
        } catch (error) {
            console.error('Error sending damage event:', error);
        }
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

        // Will be updated in next position update
    }

    /**
     * Connect to the multiplayer server
     * @param {Object} data - Connection data including server URL
     */
    connect(data = {}) {
        // Determine protocol and port based on page protocol
        const isSecure = window.location.protocol === 'https:';
        const protocol = isSecure ? 'wss:' : 'ws:';

        // If serverUrl is explicitly provided, use it
        // Otherwise, determine based on current page URL
        let serverUrl;
        if (data.serverUrl) {
            serverUrl = data.serverUrl;
        } else {
            // Extract host without port
            const host = window.location.hostname;

            // If we're on localhost, use the default port
            // Otherwise, use the same host as the page (for deployed version)
            if (host === 'localhost' || host === '127.0.0.1') {
                const port = isSecure ? '8443' : '8080';
                serverUrl = `${protocol}//${host}:${port}`;
            } else {
                // For deployed version, use the same host and port as the page
                // This works when the web server and WebSocket server are on the same host
                serverUrl = `${protocol}//${host}${window.location.port ? ':' + window.location.port : ''}`;
            }
        }

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
            this.eventBus.emit('notification', {
                message: 'Failed to connect to multiplayer server',
                type: 'error'
            });
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
     * Handle successful connection to the server
     */
    handleConnection() {
        console.log('Connected to multiplayer server');
        this.connected = true;

        // Emit a specific connected event that UI can listen for
        this.eventBus.emit('network.connected');

        this.eventBus.emit('notification', {
            message: 'Connected to multiplayer server',
            type: 'success'
        });
    }

    /**
     * Handle messages from the server
     * @param {MessageEvent} event - The message event
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'init':
                    // Store our client ID
                    this.clientId = message.id;
                    console.log(`Assigned client ID: ${this.clientId}`);
                    break;

                case 'players':
                    // Initialize existing players
                    this.initExistingPlayers(message.players);
                    break;

                case 'playerUpdate':
                    // Update a remote player
                    this.updateRemotePlayer(message);
                    break;

                case 'playerDisconnect':
                    // Remove a disconnected player
                    this.removeRemotePlayer(message.id);
                    break;

                case 'playerFire':
                    // Handle remote player firing
                    this.handleRemoteFire(message);
                    break;

                case 'playerHealth':
                    // Handle health update for a remote player
                    this.updateRemotePlayerHealth(message);
                    break;

                case 'playerDestroyed':
                    // Handle a remote player being destroyed
                    this.handleRemotePlayerDestroyed(message);
                    break;

                case 'playerRespawn':
                    // Handle a player respawning
                    this.handlePlayerRespawn(message);
                    break;

                case 'hitEffect':
                    // Handle visual hit effect from another client
                    this.handleRemoteHitEffect(message);
                    break;

                case 'notification':
                    // Handle notification from the server
                    this.handleNotification(message);
                    break;
            }
        } catch (error) {
            console.error('Error processing server message:', error);
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

        const oldHealth = remotePlane.currentHealth;

        // Update remote plane's health
        remotePlane.setHealth(data.health);

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

            // Show notification when enemy is hit
            this.eventBus.emit('notification', {
                message: `Hit enemy plane! Their health: ${Math.round(data.health)}%`,
                type: 'success',
                duration: 2000
            });
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

        // Create plane factory
        const planeFactory = new PlaneFactory(scene, this.eventBus);

        // Create planes for each player
        players.forEach((playerData) => {
            this.createRemotePlane(planeFactory, playerData);
        });

        this.eventBus.emit('notification', {
            message: `${players.length} other players in game`,
            type: 'info'
        });
    }

    /**
     * Create a plane for a remote player
     * @param {PlaneFactory} planeFactory - Factory for creating planes
     * @param {Object} playerData - Player data including ID and position
     */
    createRemotePlane(planeFactory, playerData) {
        // Skip if this is our own plane
        if (playerData.id === this.clientId) return;

        // Skip if we already have this plane
        if (this.remotePlanes.has(playerData.id)) return;

        console.log(`Creating plane for remote player ${playerData.id}`);

        // Create a new enemy plane
        const remotePlane = planeFactory.createEnemyPlane();

        // Set initial position and rotation
        if (playerData.position) {
            remotePlane.mesh.position.set(
                playerData.position.x,
                playerData.position.y,
                playerData.position.z
            );
        }

        if (playerData.rotation) {
            remotePlane.mesh.rotation.set(
                playerData.rotation.x,
                playerData.rotation.y,
                playerData.rotation.z
            );
        }

        // Set initial health if available
        if (playerData.health !== undefined) {
            remotePlane.setHealth(playerData.health);
        }

        // Set destroyed state if available
        if (playerData.isDestroyed === true) {
            remotePlane.destroy();
        }

        // Store the remote plane
        this.remotePlanes.set(playerData.id, remotePlane);

        // Emit event for collision registration
        this.eventBus.emit('network.plane.created', remotePlane);

        // Debug log
        console.log(`Remote plane for ${playerData.id} created and registered`);
    }

    /**
     * Update a remote player
     * @param {Object} data - Player update data
     */
    updateRemotePlayer(data) {
        const remotePlane = this.remotePlanes.get(data.id);

        if (!remotePlane) {
            // We don't have this plane yet, try to create it
            if (!this.playerPlane || !this.playerPlane.scene) {
                console.warn(`Cannot create remote plane ${data.id}: playerPlane or scene not available yet`);
                return;
            }

            console.log(`Creating remote plane for player ${data.id} during update`);
            const planeFactory = new PlaneFactory(this.playerPlane.scene, this.eventBus);
            this.createRemotePlane(planeFactory, data);
            return;
        }

        // Apply position with interpolation for smoother movement
        if (data.position) {
            // Create target position vector
            const targetPosition = new THREE.Vector3(
                data.position.x,
                data.position.y,
                data.position.z
            );

            // Interpolate to new position for smoother visualization
            remotePlane.mesh.position.lerp(targetPosition, this.interpolationFactor);
        }

        // Apply rotation
        if (data.rotation) {
            remotePlane.mesh.rotation.set(
                data.rotation.x,
                data.rotation.y,
                data.rotation.z
            );
        }

        // Update speed if provided
        if (data.speed !== undefined) {
            remotePlane.speed = data.speed;
        }

        // Update health if provided
        if (data.health !== undefined) {
            remotePlane.setHealth(data.health);

            // Ensure smoke effects are visible on remote planes by updating health percentage
            if (remotePlane.smokeFX) {
                const healthPercent = remotePlane.currentHealth / remotePlane.maxHealth;

                // Force update smoke effects based on current health
                if (healthPercent < 0.5) {
                    remotePlane.smokeFX.emitSmoke(remotePlane, healthPercent, 0.016); // Use a small delta time
                    remotePlane.smokeFX.update(0.016);
                }
            }
        }

        // Update destroyed state if provided
        if (data.isDestroyed === true && !remotePlane.isDestroyed) {
            remotePlane.destroy();
        }
    }

    /**
     * Remove a remote player from the game
     * @param {string} playerId - ID of the player to remove
     */
    removeRemotePlayer(playerId) {
        const remotePlane = this.remotePlanes.get(playerId);

        if (remotePlane) {
            console.log(`Removing plane for remote player ${playerId}`);

            // Clean up hit effects before disposing the plane
            if (remotePlane.ammoSystem && remotePlane.ammoSystem.hitEffect) {
                remotePlane.ammoSystem.hitEffect.stopAndCleanup();
                console.log(`Cleaned up hit effects for remote player ${playerId}`);
            }

            // Dispose the plane completely
            remotePlane.dispose();
            this.remotePlanes.delete(playerId);

            this.eventBus.emit('notification', {
                message: `Player ${playerId} has left the game`,
                type: 'info'
            });
        }
    }

    /**
     * Send updates about our plane to the server
     * @param {number} currentTime - Current game time
     */
    sendUpdate(currentTime) {
        // Ensure we have a valid connection and player plane reference
        if (!this.connected || !this.socket) {
            return;
        }

        if (!this.playerPlane) {
            console.warn('Cannot send update: playerPlane reference is missing');
            return;
        }

        if (!this.playerPlane.mesh) {
            console.warn('Cannot send update: playerPlane.mesh is missing');
            return;
        }

        // Limit update frequency
        if (currentTime - this.lastUpdateTime < this.updateInterval) return;
        this.lastUpdateTime = currentTime;

        // Get position and rotation from our plane
        const position = this.playerPlane.mesh.position;
        const rotation = this.playerPlane.mesh.rotation;

        // Create update message
        const update = {
            type: 'update',
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
            speed: this.playerPlane.speed,
            health: this.playerPlane.currentHealth,
            isDestroyed: this.playerPlane.isDestroyed
        };

        // Send to server
        try {
            this.socket.send(JSON.stringify(update));
        } catch (error) {
            console.error('Error sending update:', error);
        }
    }

    /**
     * Update networked game elements
     * @param {number} currentTime - Current game time
     */
    update(currentTime) {
        if (this.connected) {
            this.sendUpdate(currentTime);

            // Update remote planes' propellers, trails, and ammo systems
            this.remotePlanes.forEach((plane) => {
                const deltaTime = 0.016; // Approximate delta time (60 fps)

                // Handle destroyed planes specially
                if (plane.isDestroyed) {
                    // Update free fall physics if active
                    if (plane.updateFreeFall) {
                        plane.updateFreeFall(deltaTime);
                    }

                    // Update explosion effects for destroyed planes
                    if (plane.explosionFX) {
                        plane.explosionFX.update(deltaTime);
                    }

                    // Update hit effects for destroyed planes to ensure they animate out properly
                    if (plane.ammoSystem && plane.ammoSystem.hitEffect) {
                        plane.ammoSystem.hitEffect.update(deltaTime);
                    }

                    // Update propeller for visual consistency
                    plane.updatePropeller(deltaTime);
                    return;
                }

                // Update visual elements for active planes
                plane.updatePropeller(deltaTime);
                plane.updateWingTrails(deltaTime);

                // Update smoke effects for damaged planes
                if (plane.smokeFX) {
                    const healthPercent = plane.currentHealth / plane.maxHealth;
                    plane.smokeFX.emitSmoke(plane, healthPercent, deltaTime);
                    plane.smokeFX.update(deltaTime);
                }

                // Update explosion effects if present
                if (plane.explosionFX) {
                    plane.explosionFX.update(deltaTime);
                }

                // Update ammo system to move bullets
                if (plane.ammoSystem) {
                    plane.ammoSystem.update(deltaTime);
                }
            });
        }
    }

    /**
     * Send a firing event to the server
     * @param {Object} data - Firing event data
     */
    sendFireEvent(data) {
        if (!this.connected || !this.socket) return;

        // Create fire message
        const fireMsg = {
            type: 'fire',
            position: {
                x: data.position.x,
                y: data.position.y,
                z: data.position.z
            },
            direction: {
                x: data.direction.x,
                y: data.direction.y,
                z: data.direction.z
            },
            velocity: {
                x: data.velocity.x,
                y: data.velocity.y,
                z: data.velocity.z
            }
        };

        // Send to server
        try {
            this.socket.send(JSON.stringify(fireMsg));
        } catch (error) {
            console.error('Error sending fire event:', error);
        }
    }

    /**
     * Handle a remote player firing
     * @param {Object} data - Firing event data from server
     */
    handleRemoteFire(data) {
        // Skip if this is our own firing event coming back from the server
        if (data.id === this.clientId) {
            return;
        }

        const remotePlane = this.remotePlanes.get(data.id);

        if (!remotePlane) {
            return;
        }

        // Convert received data back to THREE.Vector3 objects
        const position = new THREE.Vector3(
            data.position.x,
            data.position.y,
            data.position.z
        );

        const direction = new THREE.Vector3(
            data.direction.x,
            data.direction.y,
            data.direction.z
        );

        const velocity = new THREE.Vector3(
            data.velocity.x,
            data.velocity.y,
            data.velocity.z
        );

        // Ensure remote plane has an ammo system
        if (!remotePlane.ammoSystem) {
            console.warn('Remote plane does not have an ammo system, creating one...');
            remotePlane.ammoSystem = new AmmoSystem(remotePlane.scene, this.eventBus);
        }

        // Fire bullets from the remote plane without playing sound (we'll play it separately)
        if (remotePlane.ammoSystem) {
            // Make sure the remote plane's position is correct
            if (position.distanceTo(remotePlane.mesh.position) > 20) {
                // If position is very different, update it to avoid bullets appearing in wrong place
                remotePlane.mesh.position.copy(position);
            }

            // Get the wing positions (copied from AmmoSystem but without the sound emission)
            this.fireBulletsWithoutSound(remotePlane.mesh, velocity, remotePlane.ammoSystem);
        }

        // Play gunfire sound for remote planes (only for other players, not yourself)
        this.eventBus.emit('sound.play', { sound: 'gunfire', volume: 0.3 });
    }

    /**
     * Modified version of fireBullets that doesn't trigger sound
     * @param {THREE.Object3D} plane - The plane mesh
     * @param {THREE.Vector3} planeVelocity - The plane's velocity vector
     * @param {AmmoSystem} ammoSystem - The ammo system to use
     */
    fireBulletsWithoutSound(plane, planeVelocity, ammoSystem) {
        // Get the current time
        const now = performance.now();

        // Check cooldown
        if (now - ammoSystem.lastFireTime < ammoSystem.fireCooldown) {
            return;
        }

        ammoSystem.lastFireTime = now;

        // Create temporary vectors for calculations
        const planePos = new THREE.Vector3();
        const planeQuat = new THREE.Quaternion();
        const planeScale = new THREE.Vector3();

        // Get the plane's world position and orientation
        plane.matrixWorld.decompose(planePos, planeQuat, planeScale);

        // Calculate wing positions based on wingspan
        const wingOffset = 5; // Half of wingspan

        // Wing positions in local space
        const leftWingLocal = new THREE.Vector3(-wingOffset, 0, 0);
        const rightWingLocal = new THREE.Vector3(wingOffset, 0, 0);

        // Convert to world space
        leftWingLocal.applyQuaternion(planeQuat);
        rightWingLocal.applyQuaternion(planeQuat);

        const leftWingPos = new THREE.Vector3().addVectors(planePos, leftWingLocal);
        const rightWingPos = new THREE.Vector3().addVectors(planePos, rightWingLocal);

        // Get bullet direction (forward vector of plane)
        const bulletDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat).normalize();

        // Forward offset - move spawn point ahead of the wing
        const forwardOffset = 3.0; // Units in front of the wing tips

        // Apply forward offset to spawn positions
        leftWingPos.addScaledVector(bulletDirection, forwardOffset);
        rightWingPos.addScaledVector(bulletDirection, forwardOffset);

        // Create bullets at wing positions - directly from ammo system
        ammoSystem.createBullet(leftWingPos, bulletDirection, planeVelocity);
        ammoSystem.createBullet(rightWingPos, bulletDirection, planeVelocity);

        // No sound is played here - that's the key difference
    }

    /**
     * Handle remote hit effect
     * @param {Object} data - Hit effect data
     */
    handleRemoteHitEffect(data) {
        // Skip if this is our own hit effect
        if (data.id === this.clientId) return;

        console.log('Received remote hit effect');

        // Create the position vector from the data
        if (data.position) {
            const position = new THREE.Vector3(
                data.position.x,
                data.position.y,
                data.position.z
            );

            // Emit the effect event
            this.eventBus.emit('effect.hit', {
                position: position,
                playSound: true
            });
        }
    }

    /**
     * Handle a notification message from the server
     * @param {Object} data - Notification data
     */
    handleNotification(data) {
        if (data.message) {
            console.log('Received notification from server:', data.message);

            // Forward the notification to the UI
            this.eventBus.emit('notification', {
                message: data.message,
                type: data.type || 'info',
                duration: data.duration || 3000
            });
        }
    }

    /**
     * Update the reference to the player's plane
     * This should be called whenever the player plane is recreated (e.g., after respawn)
     * @param {Plane} newPlayerPlane - The new player plane reference
     */
    updatePlayerPlaneReference(newPlayerPlane) {
        if (!newPlayerPlane) {
            console.warn('Cannot update player plane reference: new reference is missing');
            return;
        }

        console.log('Updating NetworkManager player plane reference');
        this.playerPlane = newPlayerPlane;

        // Re-setup collision handler with the new player plane
        this.setupCollisionHandler();

        // Notify other players that we've respawned
        this.sendRespawnNotification();
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
     * Handle a player respawning after death
     * @param {Object} data - Respawn data
     */
    handlePlayerRespawn(data) {
        // Skip if this is our own respawn event
        if (data.id === this.clientId) return;

        console.log(`Remote player ${data.id} has respawned`);

        // Check if we already have this remote plane
        const remotePlane = this.remotePlanes.get(data.id);

        if (remotePlane) {
            console.log(`Updating existing remote plane for respawned player ${data.id}`);

            // Reset the plane's state
            remotePlane.isDestroyed = false;
            remotePlane.mesh.visible = true;

            // Update position and rotation
            if (data.position) {
                remotePlane.mesh.position.set(
                    data.position.x,
                    data.position.y,
                    data.position.z
                );
            }

            if (data.rotation) {
                remotePlane.mesh.rotation.set(
                    data.rotation.x,
                    data.rotation.y,
                    data.rotation.z
                );
            }

            // Reset health to max
            remotePlane.setHealth(remotePlane.maxHealth);

            // Enable wing trails again
            if (remotePlane.wingTrails && remotePlane.wingTrails.left && remotePlane.wingTrails.right) {
                remotePlane.wingTrails.left.mesh.visible = true;
                remotePlane.wingTrails.right.mesh.visible = true;
            }
        } else {
            // Create a new plane if we don't have it
            if (!this.playerPlane || !this.playerPlane.scene) {
                console.warn(`Cannot create remote plane for respawned player ${data.id}: playerPlane or scene not available`);
                return;
            }

            console.log(`Creating new remote plane for respawned player ${data.id}`);
            const planeFactory = new PlaneFactory(this.playerPlane.scene, this.eventBus);
            this.createRemotePlane(planeFactory, data);
        }

        // Show notification
        this.eventBus.emit('notification', {
            message: `Player ${data.id} has respawned`,
            type: 'info',
            duration: 3000
        });
    }
} 