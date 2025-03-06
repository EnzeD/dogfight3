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
        this.updateInterval = 100; // Reduced from 50ms to 100ms (10 updates/second)
        this.interpolationFactor = 0.1; // For smooth movement

        // Listen for connection events
        this.eventBus.on('network.connect', this.connect.bind(this));
        this.eventBus.on('network.disconnect', this.disconnect.bind(this));

        // Listen for firing events
        this.eventBus.on('plane.fire', this.sendFireEvent.bind(this));
    }

    /**
     * Connect to the multiplayer server
     * @param {Object} data - Connection data including server URL
     */
    connect(data = {}) {
        // Determine protocol and port based on page protocol
        const isSecure = window.location.protocol === 'https:';
        const protocol = isSecure ? 'wss:' : 'ws:';
        const port = isSecure ? '8443' : '8080';

        // Use VPS IP address with appropriate port
        const serverUrl = data.serverUrl || `${protocol}//141.95.17.225:${port}`;

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
            }
        } catch (error) {
            console.error('Error processing server message:', error);
        }
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

        // Store the remote plane
        this.remotePlanes.set(playerData.id, remotePlane);
    }

    /**
     * Update a remote player's plane
     * @param {Object} data - Player update data
     */
    updateRemotePlayer(data) {
        const remotePlane = this.remotePlanes.get(data.id);

        if (!remotePlane) {
            // We don't have this plane yet, try to create it
            if (this.playerPlane && this.playerPlane.scene) {
                const planeFactory = new PlaneFactory(this.playerPlane.scene, this.eventBus);
                this.createRemotePlane(planeFactory, data);
            }
            return;
        }

        // Update position with interpolation
        if (data.position) {
            const targetPos = new THREE.Vector3(
                data.position.x,
                data.position.y,
                data.position.z
            );

            // Interpolate position for smoother movement
            remotePlane.mesh.position.lerp(targetPos, this.interpolationFactor);
        }

        // Update rotation with interpolation
        if (data.rotation) {
            const targetRot = new THREE.Euler(
                data.rotation.x,
                data.rotation.y,
                data.rotation.z
            );

            // Interpolate rotation for smoother movement
            remotePlane.mesh.rotation.x += (targetRot.x - remotePlane.mesh.rotation.x) * this.interpolationFactor;
            remotePlane.mesh.rotation.y += (targetRot.y - remotePlane.mesh.rotation.y) * this.interpolationFactor;
            remotePlane.mesh.rotation.z += (targetRot.z - remotePlane.mesh.rotation.z) * this.interpolationFactor;
        }

        // Update speed for propeller animation
        if (data.speed !== undefined) {
            remotePlane.speed = data.speed;
        }
    }

    /**
     * Remove a remote player's plane
     * @param {number} playerId - ID of the player to remove
     */
    removeRemotePlayer(playerId) {
        const remotePlane = this.remotePlanes.get(playerId);

        if (remotePlane) {
            console.log(`Removing plane for remote player ${playerId}`);
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
        if (!this.connected || !this.socket || !this.playerPlane) return;

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
            speed: this.playerPlane.speed
        };

        // Send to server
        try {
            this.socket.send(JSON.stringify(update));
        } catch (error) {
            console.error('Error sending update:', error);
        }
    }

    /**
     * Update the network manager
     * @param {number} currentTime - Current game time
     */
    update(currentTime) {
        if (this.connected) {
            this.sendUpdate(currentTime);

            // Update remote planes' propellers, trails, and ammo systems
            this.remotePlanes.forEach((plane) => {
                const deltaTime = 0.016; // Approximate delta time (60 fps)

                // Update visual elements
                plane.updatePropeller(deltaTime);
                plane.updateWingTrails(deltaTime);

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
} 