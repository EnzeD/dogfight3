// Base Plane class for aircraft
import * as THREE from 'three';
import Entity from './Entity.js';

export default class Plane extends Entity {
    constructor(scene, eventBus) {
        console.log('Plane constructor called');
        super(scene);

        this.eventBus = eventBus;

        // Flight mechanics variables
        this.speed = 0;
        this.maxSpeed = 3.5;
        // Wing trails properties
        this.wingTrails = {
            left: null,
            right: null
        };
        this.trailMaxLength = 100; // Maximum number of points in the trail
        this.trailMinOpacity = 0.2; // Minimum opacity for trail at low speeds
        this.trailBaseWidth = 0.1; // Base width of the trail
        this.trailsEnabled = true; // Trail visibility toggle

        this.minTakeoffSpeed = 0.3;
        this.acceleration = 0.001;
        this.deceleration = 0.002;
        this.isAirborne = false;

        // Flag to track first flight info update
        this._hasEmittedFirstUpdate = false;

        // Control surfaces
        this.propeller = null;
        this.leftAileron = null;
        this.rightAileron = null;
        this.elevators = null;
        this.rudder = null;

        // Control sensitivity
        this.rollSpeed = 0.04;
        this.pitchSpeed = 0.03;
        this.yawSpeed = 0.015;

        // Auto-stabilization
        this.autoStabilizationEnabled = true;

        // Ground height is the height at which the wheels touch the ground
        // This will be set in the WW2Plane class based on wheel position calculations
        this.groundHeight = 1.4;

        // Listen for events
        this.setupEventListeners();
    }

    /**
     * Create the plane mesh - to be implemented by subclasses
     */
    createMesh() {
        console.log('Plane.createMesh called - should be overridden by subclass');
        // This method should be overridden by subclasses
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for auto-stabilization toggle
        this.eventBus.on('input.action', (data) => {
            if (data.action === 'toggleAutoStabilization' && data.state === 'down') {
                this.autoStabilizationEnabled = !this.autoStabilizationEnabled;
                this.eventBus.emit('notification', {
                    message: `Auto-stabilization ${this.autoStabilizationEnabled ? 'enabled' : 'disabled'}`,
                    type: 'info'
                });
            }
        });

        // Listen for trails toggle with 'T' key
        document.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 't') {
                this.trailsEnabled = !this.trailsEnabled;

                // Update trail visibility
                if (this.wingTrails.left && this.wingTrails.right) {
                    this.wingTrails.left.mesh.visible = this.trailsEnabled;
                    this.wingTrails.right.mesh.visible = this.trailsEnabled;
                }

                console.log(`Trails ${this.trailsEnabled ? 'enabled' : 'disabled'}`);
                this.eventBus.emit('notification', {
                    message: `Chemtrails ${this.trailsEnabled ? 'enabled' : 'disabled'}`,
                    type: 'info'
                });
            }
        });
    }

    /**
     * Update the plane
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} inputState - Current input state
     */
    update(deltaTime, inputState) {
        // Update movement based on input
        this.updateMovement(deltaTime, inputState);

        // Update propeller animation
        this.updatePropeller(deltaTime);

        // Update control surfaces based on input
        this.updateControlSurfaces(inputState);

        // Update wing trails
        this.updateWingTrails(deltaTime);

        // Emit flight info update event
        this.emitFlightInfoUpdate();
    }

    /**
     * Update plane movement based on input
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} inputState - Current input state
     */
    updateMovement(deltaTime, inputState) {
        const keysPressed = inputState.keysPressed;

        // Throttle control
        if (keysPressed['w'] || keysPressed['z']) {
            // Check if shift key is pressed for boost
            const accelerationMultiplier = keysPressed['shift'] ? 3 : 1;

            // Increase speed (accelerate) with possible boost
            this.speed = Math.min(
                this.speed + (this.acceleration * accelerationMultiplier * deltaTime * 60),
                this.maxSpeed
            );
        } else if (keysPressed['s']) {
            // Decrease speed (decelerate)
            this.speed = Math.max(this.speed - this.deceleration * deltaTime * 60, 0);
        }

        // Check if plane is airborne
        if (!this.isAirborne && this.speed >= this.minTakeoffSpeed) {
            this.isAirborne = true;
            this.eventBus.emit('notification', {
                message: 'Takeoff!',
                type: 'success'
            });
        } else if (this.isAirborne && this.speed < this.minTakeoffSpeed) {
            // Landing logic would go here
            if (this.mesh.position.y <= this.groundHeight + 0.1) {
                this.isAirborne = false;
                this.eventBus.emit('notification', {
                    message: 'Landed',
                    type: 'info'
                });
            }
        }

        // Get the plane's forward direction
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(this.mesh.quaternion);

        // Move the plane forward based on speed
        this.mesh.position.add(forwardDirection.multiplyScalar(this.speed * deltaTime * 60));

        // Apply flight controls if airborne
        if (this.isAirborne) {
            // Roll (A/Q and D keys)
            if (keysPressed['a'] || keysPressed['q']) {
                this.mesh.rotateZ(this.rollSpeed * deltaTime * 60);
            } else if (keysPressed['d']) {
                this.mesh.rotateZ(-this.rollSpeed * deltaTime * 60);
            }

            // Pitch (Up and Down arrow keys)
            if (keysPressed['arrowup']) {
                this.mesh.rotateX(-this.pitchSpeed * deltaTime * 60);
            } else if (keysPressed['arrowdown']) {
                this.mesh.rotateX(this.pitchSpeed * deltaTime * 60);
            }

            // Yaw (Left and Right arrow keys)
            if (keysPressed['arrowleft']) {
                this.mesh.rotateY(this.yawSpeed * deltaTime * 60);
            } else if (keysPressed['arrowright']) {
                this.mesh.rotateY(-this.yawSpeed * deltaTime * 60);
            }

            // Auto-stabilization when no roll/pitch input is given
            if (this.autoStabilizationEnabled) {
                // Only apply roll stabilization when roll or pitch keys aren't pressed
                const isRolling = keysPressed['a'] || keysPressed['q'] || keysPressed['d'] || keysPressed['arrowup'] || keysPressed['arrowdown'];
                this.applyAutoStabilization(deltaTime, isRolling);
            }

            // Apply gravity if airborne
            this.applyGravity(deltaTime);
        } else {
            // Keep the plane on the ground when not airborne
            if (this.mesh.position.y > this.groundHeight) {
                this.mesh.position.y = Math.max(this.groundHeight, this.mesh.position.y - 0.1 * deltaTime * 60);
            } else if (this.mesh.position.y < this.groundHeight) {
                // If the plane is below the ground height (which shouldn't happen),
                // bring it back up to the correct height
                this.mesh.position.y = this.groundHeight;
            }
        }
    }

    /**
     * Apply auto-stabilization to gradually level the plane
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {boolean} isRolling - Whether the plane is rolling
     */
    applyAutoStabilization(deltaTime, isRolling) {
        // Get current rotation in Euler angles
        const rotation = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, 'ZYX');

        // Stabilize roll (z-axis) - only when roll is beyond a small threshold
        // Increased threshold from 0.01 to 0.025 to prevent triggering on tiny angles
        if (Math.abs(rotation.z) > 0.025 && !isRolling) {
            // Use constant stabilization factor independent of speed
            const stabilizationFactor = 0.05 * deltaTime * 60;

            // Apply correction
            const correctionAmount = -rotation.z * stabilizationFactor;

            // Limit maximum correction per frame to prevent jitter
            const maxCorrection = 0.02;
            const limitedCorrection = Math.max(-maxCorrection, Math.min(maxCorrection, correctionAmount));

            this.mesh.rotateZ(limitedCorrection);
        }

        // Don't auto-stabilize pitch - let the player control altitude
    }

    /**
     * Apply gravity to make the plane descend when not enough lift
     * @param {number} deltaTime - Time since last frame in seconds
     */
    applyGravity(deltaTime) {
        // Get current rotation in Euler angles
        const rotation = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, 'ZYX');

        // Calculate lift based on speed and pitch
        // More speed = more lift, nose up = more lift
        const pitchFactor = Math.sin(rotation.x);
        const liftFactor = (this.speed / this.maxSpeed) * 0.8 + pitchFactor * 0.2;

        // Apply gravity (reduced by lift)
        const gravity = 0.005 * deltaTime * 60;
        const effectiveGravity = gravity * (1 - liftFactor);

        // Apply gravity in world space, but respect the ground height
        this.mesh.position.y = Math.max(this.groundHeight, this.mesh.position.y - effectiveGravity);
    }

    /**
     * Update propeller rotation animation
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updatePropeller(deltaTime) {
        if (this.propeller) {
            // Rotate propeller based on speed
            const propellerSpeed = this.speed * 50 + 0.1;
            this.propeller.rotation.z += propellerSpeed * deltaTime * 60;
        }
    }

    /**
     * Update control surfaces based on input
     * @param {Object} inputState - Current input state
     */
    updateControlSurfaces(inputState) {
        const keysPressed = inputState.keysPressed;

        // Aileron animation (roll)
        if (this.leftAileron && this.rightAileron) {
            if (keysPressed['a'] || keysPressed['q']) {
                // Rolling left: left aileron down, right aileron up (inverted behavior)
                this.leftAileron.rotation.x = Math.max(this.leftAileron.rotation.x - 0.1, -0.5);
                this.rightAileron.rotation.x = Math.min(this.rightAileron.rotation.x + 0.1, 0.5);
            } else if (keysPressed['d']) {
                // Rolling right: left aileron up, right aileron down (inverted behavior)
                this.leftAileron.rotation.x = Math.min(this.leftAileron.rotation.x + 0.1, 0.5);
                this.rightAileron.rotation.x = Math.max(this.rightAileron.rotation.x - 0.1, -0.5);
            } else {
                // Return to neutral
                this.leftAileron.rotation.x *= 0.8;
                this.rightAileron.rotation.x *= 0.8;
            }
        }

        // Elevator animation (pitch)
        if (this.elevators) {
            if (keysPressed['arrowup']) {
                // Pitch down: elevators up
                this.elevators.rotation.x = Math.min(this.elevators.rotation.x + 0.1, 0.5);
            } else if (keysPressed['arrowdown']) {
                // Pitch up: elevators down
                this.elevators.rotation.x = Math.max(this.elevators.rotation.x - 0.1, -0.5);
            } else {
                // Return to neutral
                this.elevators.rotation.x *= 0.8;
            }
        }

        // Rudder animation (yaw)
        if (this.rudder) {
            if (keysPressed['arrowleft']) {
                // Yaw left: rudder left
                this.rudder.rotation.y = Math.min(this.rudder.rotation.y + 0.1, 0.5);
            } else if (keysPressed['arrowright']) {
                // Yaw right: rudder right
                this.rudder.rotation.y = Math.max(this.rudder.rotation.y - 0.1, -0.5);
            } else {
                // Return to neutral
                this.rudder.rotation.y *= 0.8;
            }
        }
    }

    /**
     * Emit flight info update event
     * NOTE: This event is no longer used for UI updates, as the UIManager
     * now directly reads plane data. This is kept for other systems like audio
     * that might need flight info.
     */
    emitFlightInfoUpdate() {
        // Get altitude (y position)
        const altitude = Math.max(0, this.mesh.position.y);

        // Get speed as percentage of max speed
        // Force the speed to 0 at the start of the game
        // (We might have a bug where the player's speed is set high initially)
        if (!this._hasEmittedFirstUpdate) {
            this.speed = 0;
            this._hasEmittedFirstUpdate = true;
        }

        const speedPercent = (this.speed / this.maxSpeed) * 100;

        // Emit flight info update event
        this.eventBus.emit('flight.info.update', {
            speed: speedPercent,
            altitude: altitude,
            isAirborne: this.isAirborne,
            autoStabilization: this.autoStabilizationEnabled,
            chemtrails: this.trailsEnabled
        }, 'player'); // Identify this as coming from the player plane
    }

    /**
     * Initialize wing trails
     * Must be called after the mesh is created
     * @param {number} wingSpan - The wingspan of the plane
     * @param {number} wingHeight - The height of the wings relative to fuselage
     * @param {number} wingZ - The z-position of the wings
     */
    initWingTrails(wingSpan, wingHeight, wingZ) {
        console.log('Initializing wing trails');

        // Trail configuration
        this.trailMaxLength = 250;      // Longer trail for better effect
        this.trailMinOpacity = 0.0;     // Should be 0 since we handle this in updateWingTrails
        this.trailBaseWidth = 0.2;      // Width of the trail

        // Trail material - white semi-transparent material
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,               // Max opacity for the trail
            side: THREE.DoubleSide,
            depthWrite: false           // Prevent z-fighting issues
        });

        // For better looking trails, we'll create a ribbon-like mesh
        // Instead of just a line, we'll create a plane that always faces the camera

        // Left trail
        const leftTrailGeometry = new THREE.BufferGeometry();
        // We need 2 vertices per point to create a ribbon (top and bottom points)
        const leftTrailPositions = new Float32Array(this.trailMaxLength * 2 * 3); // 2 vertices per point, 3 coords per vertex
        const leftTrailIndices = [];

        // Create indices for the ribbon
        for (let i = 0; i < this.trailMaxLength - 1; i++) {
            // Each quad consists of 2 triangles
            const topLeft = i * 2;
            const bottomLeft = i * 2 + 1;
            const topRight = (i + 1) * 2;
            const bottomRight = (i + 1) * 2 + 1;

            // First triangle
            leftTrailIndices.push(topLeft, bottomLeft, bottomRight);
            // Second triangle
            leftTrailIndices.push(topLeft, bottomRight, topRight);
        }

        leftTrailGeometry.setIndex(leftTrailIndices);
        leftTrailGeometry.setAttribute('position', new THREE.BufferAttribute(leftTrailPositions, 3));
        leftTrailGeometry.setDrawRange(0, 0);

        // Create UVs to enable texture mapping later if needed
        const leftTrailUVs = new Float32Array(this.trailMaxLength * 2 * 2); // 2 vertices per point, 2 UV coords per vertex
        leftTrailGeometry.setAttribute('uv', new THREE.BufferAttribute(leftTrailUVs, 2));

        // Create opacity attribute for fading the trail at the end
        const leftTrailOpacity = new Float32Array(this.trailMaxLength * 2);
        leftTrailGeometry.setAttribute('opacity', new THREE.BufferAttribute(leftTrailOpacity, 1));

        // Create mesh
        const leftTrail = new THREE.Mesh(leftTrailGeometry, trailMaterial.clone());
        leftTrail.frustumCulled = false; // Prevent disappearing when out of camera view
        this.scene.add(leftTrail);

        // Right trail (same process)
        const rightTrailGeometry = new THREE.BufferGeometry();
        const rightTrailPositions = new Float32Array(this.trailMaxLength * 2 * 3);

        // Reuse the same indices for the right trail
        rightTrailGeometry.setIndex(leftTrailIndices);
        rightTrailGeometry.setAttribute('position', new THREE.BufferAttribute(rightTrailPositions, 3));
        rightTrailGeometry.setDrawRange(0, 0);

        // Create UVs
        const rightTrailUVs = new Float32Array(this.trailMaxLength * 2 * 2);
        rightTrailGeometry.setAttribute('uv', new THREE.BufferAttribute(rightTrailUVs, 2));

        // Create opacity attribute
        const rightTrailOpacity = new Float32Array(this.trailMaxLength * 2);
        rightTrailGeometry.setAttribute('opacity', new THREE.BufferAttribute(rightTrailOpacity, 1));

        // Create mesh
        const rightTrail = new THREE.Mesh(rightTrailGeometry, trailMaterial.clone());
        rightTrail.frustumCulled = false;
        this.scene.add(rightTrail);

        // Calculate exact wing tip positions for more accurate trail placement
        const wingHalfSpan = wingSpan / 2;

        // Store references with metadata
        this.wingTrails = {
            left: {
                mesh: leftTrail,
                positions: leftTrailPositions,
                uvs: leftTrailUVs,
                opacity: leftTrailOpacity,
                count: 0,
                lastPos: new THREE.Vector3(),
                emitterOffset: new THREE.Vector3(-wingHalfSpan, wingHeight, wingZ)
            },
            right: {
                mesh: rightTrail,
                positions: rightTrailPositions,
                uvs: rightTrailUVs,
                opacity: rightTrailOpacity,
                count: 0,
                lastPos: new THREE.Vector3(),
                emitterOffset: new THREE.Vector3(wingHalfSpan, wingHeight, wingZ)
            }
        };

        // Initially hide trails until we're airborne and above 50% speed
        this.wingTrails.left.mesh.visible = false;
        this.wingTrails.right.mesh.visible = false;
    }

    /**
     * Update wing trails
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updateWingTrails(deltaTime) {

        // Get speed as percentage (0-1)
        const speedFactor = this.speed / this.maxSpeed;

        // Only generate trails if:
        // 1. The plane is airborne
        // 2. Speed is at least 50% of max speed (speedFactor >= 0.5)
        // 3. Trails are initialized and enabled
        if (!this.isAirborne || speedFactor < 0.5 || !this.wingTrails.left || !this.wingTrails.right || !this.trailsEnabled) {
            // If trails exist and we're below 50% speed, hide them
            if (this.wingTrails.left && this.wingTrails.right && speedFactor < 0.5) {
                this.wingTrails.left.mesh.visible = false;
                this.wingTrails.right.mesh.visible = false;
            }
            return;
        }

        // Make sure trails are visible
        this.wingTrails.left.mesh.visible = this.trailsEnabled;
        this.wingTrails.right.mesh.visible = this.trailsEnabled;

        // Calculate opacity based on speed:
        // - At 50% speed: 0% opacity
        // - At 100% speed: 50% opacity
        // Normalize the speed factor to this range
        const normalizedSpeedFactor = (speedFactor - 0.5) * 2; // 0 at 50% speed, 1 at 100% speed
        const opacity = normalizedSpeedFactor * 0.5; // 0.5 max opacity

        // Calculate width based on speed
        const width = this.trailBaseWidth + (speedFactor * 0.2); // Width increases slightly with speed

        // Determine how often to add new points based on speed
        // Higher speed = less frequent updates to create longer trails
        const updateFrequency = Math.max(1, Math.floor(10 - speedFactor * 8));

        // Only add points periodically to control density
        if (Math.floor(performance.now() / 20) % updateFrequency !== 0) {
            return;
        }

        // Get camera position vector from scene - need this to make ribbons face the camera
        const cameraPosition = new THREE.Vector3(0, 10, 20); // Default camera position if we can't find one

        // Try to find the camera in the scene
        let cameraFound = false;
        this.scene.traverse(object => {
            if (object instanceof THREE.PerspectiveCamera || object instanceof THREE.OrthographicCamera) {
                cameraPosition.copy(object.position);
                cameraFound = true;
            }
        });

        if (!cameraFound) {
            // If we can't find a camera, look for objects that might contain a camera
            this.scene.traverse(object => {
                if (object.children) {
                    for (const child of object.children) {
                        if (child instanceof THREE.PerspectiveCamera || child instanceof THREE.OrthographicCamera) {
                            cameraPosition.copy(child.position);
                            cameraFound = true;
                            break;
                        }
                    }
                }
            });
        }

        // Update both trails
        this.updateSingleTrail('left', opacity, speedFactor, width, cameraPosition);
        this.updateSingleTrail('right', opacity, speedFactor, width, cameraPosition);
    }

    /**
     * Update a single wing trail
     * @param {string} side - 'left' or 'right'
     * @param {number} opacity - Current opacity for trail
     * @param {number} speedFactor - Speed factor (0-1)
     * @param {number} width - Width of the trail
     * @param {THREE.Vector3} cameraPosition - Camera position for billboard effect
     */
    updateSingleTrail(side, opacity, speedFactor, width, cameraPosition) {
        const trail = this.wingTrails[side];
        const positions = trail.positions;
        const emitterOffset = trail.emitterOffset;
        const uvs = trail.uvs;
        const opacityAttr = trail.opacity;

        // Get world position of the wing tip by applying the plane's transformation
        const wingTipLocal = emitterOffset.clone();
        const wingTipWorld = wingTipLocal.applyMatrix4(this.mesh.matrixWorld);

        // Only add a new point if we've moved some minimum distance
        if (trail.lastPos.distanceTo(wingTipWorld) < 0.1 && trail.count > 0) {
            return;
        }

        // Direction to camera - if no camera was found, use a direction pointing back and slightly up
        let toCamera;
        if (cameraPosition.lengthSq() === 0) {
            toCamera = new THREE.Vector3(0, 0.5, 1).normalize();
        } else {
            toCamera = new THREE.Vector3().subVectors(cameraPosition, wingTipWorld).normalize();
        }

        // We want up vector to be perpendicular to both the direction of travel and to-camera vector
        // For simplicity, we'll use world up and make it perpendicular to toCamera
        const up = new THREE.Vector3(0, 1, 0);
        up.sub(toCamera.clone().multiplyScalar(up.dot(toCamera))).normalize();

        // Calculate the left and right points of the ribbon
        const left = up.clone().multiplyScalar(width / 2);
        const right = up.clone().multiplyScalar(-width / 2);

        // Top vertex = position + left
        const topPos = wingTipWorld.clone().add(left);

        // Bottom vertex = position + right
        const bottomPos = wingTipWorld.clone().add(right);

        // Calculate how much of the trail to keep based on speed
        // Faster = more of the trail visible
        const visiblePoints = Math.max(5, Math.floor(5 + speedFactor * 45));

        if (trail.count < this.trailMaxLength) {
            // If we're still building the trail
            // For the first point, just store the position and return
            if (trail.count === 0) {
                // Set first point
                positions[0] = topPos.x;
                positions[1] = topPos.y;
                positions[2] = topPos.z;

                positions[3] = bottomPos.x;
                positions[4] = bottomPos.y;
                positions[5] = bottomPos.z;

                // Set UV coordinates
                uvs[0] = 0;
                uvs[1] = 0;
                uvs[2] = 0;
                uvs[3] = 1;

                // Set opacity
                opacityAttr[0] = opacity;
                opacityAttr[1] = opacity;

                trail.count = 1;
                trail.lastPos.copy(wingTipWorld);
                return;
            }

            // Shift existing points one position back
            for (let i = trail.count; i > 0; i--) {
                // Each point has 2 vertices
                const destTopIdx = i * 2;
                const destBottomIdx = i * 2 + 1;
                const srcTopIdx = (i - 1) * 2;
                const srcBottomIdx = (i - 1) * 2 + 1;

                // Copy positions
                positions[destTopIdx * 3] = positions[srcTopIdx * 3];
                positions[destTopIdx * 3 + 1] = positions[srcTopIdx * 3 + 1];
                positions[destTopIdx * 3 + 2] = positions[srcTopIdx * 3 + 2];

                positions[destBottomIdx * 3] = positions[srcBottomIdx * 3];
                positions[destBottomIdx * 3 + 1] = positions[srcBottomIdx * 3 + 1];
                positions[destBottomIdx * 3 + 2] = positions[srcBottomIdx * 3 + 2];

                // Copy UVs
                uvs[destTopIdx * 2] = uvs[srcTopIdx * 2];
                uvs[destTopIdx * 2 + 1] = uvs[srcTopIdx * 2 + 1];

                uvs[destBottomIdx * 2] = uvs[srcBottomIdx * 2];
                uvs[destBottomIdx * 2 + 1] = uvs[srcBottomIdx * 2 + 1];

                // Copy and fade opacity
                const fadePoint = Math.max(0, visiblePoints - i) / visiblePoints;
                const pointOpacity = Math.max(0, fadePoint) * opacity;

                opacityAttr[destTopIdx] = pointOpacity;
                opacityAttr[destBottomIdx] = pointOpacity;
            }

            trail.count++;
        } else {
            // If trail at max length, shift all points
            for (let i = this.trailMaxLength - 1; i > 0; i--) {
                // Each point has 2 vertices
                const destTopIdx = i * 2;
                const destBottomIdx = i * 2 + 1;
                const srcTopIdx = (i - 1) * 2;
                const srcBottomIdx = (i - 1) * 2 + 1;

                // Copy positions
                positions[destTopIdx * 3] = positions[srcTopIdx * 3];
                positions[destTopIdx * 3 + 1] = positions[srcTopIdx * 3 + 1];
                positions[destTopIdx * 3 + 2] = positions[srcTopIdx * 3 + 2];

                positions[destBottomIdx * 3] = positions[srcBottomIdx * 3];
                positions[destBottomIdx * 3 + 1] = positions[srcBottomIdx * 3 + 1];
                positions[destBottomIdx * 3 + 2] = positions[srcBottomIdx * 3 + 2];

                // Copy UVs
                uvs[destTopIdx * 2] = uvs[srcTopIdx * 2];
                uvs[destTopIdx * 2 + 1] = uvs[srcTopIdx * 2 + 1];

                uvs[destBottomIdx * 2] = uvs[srcBottomIdx * 2];
                uvs[destBottomIdx * 2 + 1] = uvs[srcBottomIdx * 2 + 1];

                // Calculate fade based on position in the trail
                const fadePoint = Math.max(0, visiblePoints - i) / visiblePoints;
                const pointOpacity = Math.max(0, fadePoint) * opacity;

                opacityAttr[destTopIdx] = pointOpacity;
                opacityAttr[destBottomIdx] = pointOpacity;
            }
        }

        // Add new top point at the beginning
        positions[0] = topPos.x;
        positions[1] = topPos.y;
        positions[2] = topPos.z;

        // Add new bottom point at the beginning
        positions[3] = bottomPos.x;
        positions[4] = bottomPos.y;
        positions[5] = bottomPos.z;

        // Set UV coordinates for the new points
        uvs[0] = 0;
        uvs[1] = 0;
        uvs[2] = 0;
        uvs[3] = 1;

        // Set opacity for the new points (fully visible)
        opacityAttr[0] = opacity;
        opacityAttr[1] = opacity;

        // Store last position
        trail.lastPos.copy(wingTipWorld);

        // Update how many vertices to draw
        const drawCount = Math.min(trail.count, this.trailMaxLength);
        // Each quad = 2 triangles = 6 vertices, and we have `drawCount-1` quads
        const indexCount = (drawCount - 1) * 6;
        trail.mesh.geometry.setDrawRange(0, Math.max(0, indexCount));

        // Apply the opacity to the material
        trail.mesh.material.opacity = opacity;

        // Force attributes update
        trail.mesh.geometry.attributes.position.needsUpdate = true;
        trail.mesh.geometry.attributes.uv.needsUpdate = true;
        trail.mesh.geometry.attributes.opacity.needsUpdate = true;

        // Use simpler material for testing instead of the custom shader
        if (!trail.mesh.material._hasSimpleMaterial) {
            // Create a simple material for testing
            trail.mesh.material = new THREE.MeshBasicMaterial({
                color: 0xffffff,   // Pure white for better visibility
                transparent: true,
                opacity: opacity,
                side: THREE.DoubleSide,
                depthWrite: false
            });

            trail.mesh.material._hasSimpleMaterial = true;
        }
    }
} 