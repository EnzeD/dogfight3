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
        this.maxSpeed = 1.5;
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
        this.deceleration = 0.01;
        this.isAirborne = false;

        // New property for pitch-to-speed effect strength
        this.pitchSpeedEffect = -0.003; // Strength of pitch influence on speed

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
        this._tempDisableAutoStabilization = false;

        // Ground height is the height at which the wheels touch the ground
        // This will be set in the WW2Plane class based on wheel position calculations
        this.groundHeight = 1.4;

        // Combat properties
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.isDestroyed = false;

        // Add analog control values
        this.analogControls = {
            roll: 0,
            targetRollAngle: 0,
            useTargetRollAngle: false
        };

        // Target angles for analog control
        this.targetAngles = {
            roll: 0
        };

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

        // Listen for analog roll input from mobile joystick
        this.eventBus.on('input.analog', (data) => {
            if (data.type === 'roll') {
                this.analogControls.roll = data.value;
            }
            else if (data.type === 'targetRoll') {
                // Convert degrees to radians for internal use
                // The value can now be any angle for full 360-degree rolls
                this.analogControls.targetRollAngle = data.value * (Math.PI / 180);

                // Set a flag to indicate we're using target roll angle control
                this.analogControls.useTargetRollAngle = true;
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
        // Skip updates if plane is destroyed
        if (this.isDestroyed) return;

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

        // Get analog controls if available
        if (inputState.analogControls) {
            this.analogControls = inputState.analogControls;
        }

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
            // Check if we have target roll angle input
            const hasTargetRollAngle = this.analogControls && this.analogControls.useTargetRollAngle;

            // Check if we have analog roll input (direct control)
            const hasAnalogRoll = this.analogControls && Math.abs(this.analogControls.roll) > 0.05;

            // Roll control - prioritize target roll angle if available
            if (hasTargetRollAngle) {
                // Get current rotation in Euler angles
                // Use a consistent order for Euler extraction to prevent gimbal lock issues
                const rotation = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, 'YZX');
                const currentRoll = rotation.z;

                // The target roll angle can now be any value for full 360-degree rolls
                const targetRoll = this.analogControls.targetRollAngle;

                // Calculate the difference between current and target roll
                let rollDifference = targetRoll - currentRoll;

                // Normalize the difference to be between -π and π for the shortest path
                while (rollDifference > Math.PI) rollDifference -= Math.PI * 2;
                while (rollDifference < -Math.PI) rollDifference += Math.PI * 2;

                // Determine roll direction based on the shortest path
                const rollDirection = Math.sign(rollDifference);

                // Apply roll at the standard speed in the appropriate direction
                // Only roll if we're not very close to the target angle
                if (Math.abs(rollDifference) > 0.01) {
                    // Roll at a speed proportional to how far we are from the target
                    // but capped at the maximum roll speed
                    // For larger differences, use a higher minimum speed to ensure smooth barrel rolls
                    const minRollSpeed = this.rollSpeed * 0.5;
                    const maxRollSpeed = this.rollSpeed * 1.5;

                    // Scale roll speed based on difference, with a minimum to prevent getting stuck
                    const rollSpeedFactor = Math.min(Math.abs(rollDifference) / Math.PI, 1);
                    const adjustedRollSpeed = minRollSpeed + (maxRollSpeed - minRollSpeed) * rollSpeedFactor;

                    // Calculate roll amount using consistent direction logic
                    const rollAmount = adjustedRollSpeed * rollDirection;

                    // Apply rotation around the plane's local Z axis consistently
                    // This will ensure consistent behavior regardless of current orientation
                    this.mesh.rotateZ(rollAmount * deltaTime * 60);

                    // If we're doing a barrel roll (difference > 90 degrees), temporarily disable auto-stabilization
                    if (Math.abs(rollDifference) > Math.PI / 2) {
                        this._tempDisableAutoStabilization = true;
                    }
                } else {
                    // We've reached the target angle, re-enable auto-stabilization if it was temporarily disabled
                    this._tempDisableAutoStabilization = false;
                }
            }
            // Fall back to direct analog roll control
            else if (hasAnalogRoll) {
                // Map joystick position to target roll angle
                // Full left = -180 degrees (-π), Full right = 180 degrees (π)
                this.targetAngles.roll = this.analogControls.roll * Math.PI;

                // Get current rotation in Euler angles - use YZX order for consistency
                const rotation = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, 'YZX');
                const currentRoll = rotation.z;

                // Calculate the difference between current and target roll
                let rollDifference = this.targetAngles.roll - currentRoll;

                // Normalize the difference to be between -π and π
                while (rollDifference > Math.PI) rollDifference -= Math.PI * 2;
                while (rollDifference < -Math.PI) rollDifference += Math.PI * 2;

                // Determine roll direction based on the shortest path
                const rollDirection = Math.sign(rollDifference);

                // Apply roll at the standard speed in the appropriate direction
                // Only roll if we're not very close to the target angle
                if (Math.abs(rollDifference) > 0.01) {
                    this.mesh.rotateZ(rollDirection * this.rollSpeed * deltaTime * 60);
                }
            }
            // Fall back to digital controls if no analog input
            else if (keysPressed['a'] || keysPressed['q']) {
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
                // and no analog roll input is active
                const isRolling = keysPressed['a'] || keysPressed['q'] || keysPressed['d'] ||
                    keysPressed['arrowup'] || keysPressed['arrowdown'] || hasAnalogRoll;
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
        // Skip auto-stabilization if temporarily disabled during barrel rolls
        if (this._tempDisableAutoStabilization) return;

        // Get current rotation in Euler angles - use YZX order for consistency
        const rotation = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, 'YZX');

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
     * Apply gravity and pitch effects on speed
     * @param {number} deltaTime - Time since last frame in seconds
     */
    applyGravity(deltaTime) {
        // Get current rotation in Euler angles - use YZX order for consistency
        const rotation = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, 'YZX');

        // Calculate lift based on speed and pitch
        // More speed = more lift, nose up = more lift
        const pitchFactor = Math.sin(rotation.x);
        const liftFactor = (this.speed / this.maxSpeed) * 0.8 + pitchFactor * 0.2;

        // Apply gravity (reduced by lift)
        const gravity = 0.005 * deltaTime * 60;
        const effectiveGravity = gravity * (1 - liftFactor);

        // Apply gravity in world space, but respect the ground height
        this.mesh.position.y = Math.max(this.groundHeight, this.mesh.position.y - effectiveGravity);

        // Apply pitch effect on speed (only when airborne)
        if (this.isAirborne) {
            // Negative pitch (nose up) decreases speed, positive pitch (nose down) increases speed
            // pitchFactor is already sin(rotation.x), so negative when pitched up, positive when pitched down
            const pitchSpeedChange = pitchFactor * this.pitchSpeedEffect * deltaTime * 60;

            // Apply speed change but respect min/max limits
            this.speed = Math.max(0, Math.min(this.maxSpeed, this.speed + pitchSpeedChange));

            // Optional: Emit notification for significant pitch effects
            if (Math.abs(pitchSpeedChange) > 0.005 && !this._lastPitchEffect) {
                if (pitchSpeedChange < 0) {
                    this.eventBus.emit('notification', {
                        message: 'Losing speed due to climb!',
                        type: 'warning'
                    });
                } else {
                    this.eventBus.emit('notification', {
                        message: 'Gaining speed in dive!',
                        type: 'info'
                    });
                }
                this._lastPitchEffect = true;
                setTimeout(() => { this._lastPitchEffect = false; }, 5000); // Prevent spam
            }
        }
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

        // Get analog controls if available
        if (inputState.analogControls) {
            this.analogControls = inputState.analogControls;
        }

        // Check if we have target roll angle input
        const hasTargetRollAngle = this.analogControls && this.analogControls.useTargetRollAngle;

        // Check if we have direct analog roll input
        const hasAnalogRoll = this.analogControls && Math.abs(this.analogControls.roll) > 0.05;

        // Aileron animation (roll)
        if (this.leftAileron && this.rightAileron) {
            if (hasTargetRollAngle) {
                // Use target roll angle for proportional control of ailerons
                // Scale the target angle to the max aileron deflection
                const MAX_AILERON_DEFLECTION = 0.5;

                // Get current rotation in Euler angles - use YZX order for consistency with movement code
                const rotation = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, 'YZX');
                const currentRoll = rotation.z;

                // Calculate the difference between current and target roll
                let rollDifference = this.analogControls.targetRollAngle - currentRoll;

                // Normalize the difference to be between -π and π
                while (rollDifference > Math.PI) rollDifference -= Math.PI * 2;
                while (rollDifference < -Math.PI) rollDifference += Math.PI * 2;

                // Determine roll direction and normalize to -1 to 1 range for aileron deflection
                // Cap at π/2 (90 degrees) to get full deflection at 90 degrees difference
                const normalizedDifference = Math.max(-1, Math.min(1, rollDifference / (Math.PI / 2)));

                // Apply deflection proportional to the normalized difference
                // Negative for left roll (left aileron up, right aileron down)
                // We always keep this consistent regardless of the plane's current orientation
                const aileronDeflection = -normalizedDifference * MAX_AILERON_DEFLECTION;

                // Apply deflection to ailerons consistently
                this.leftAileron.rotation.x = aileronDeflection;
                this.rightAileron.rotation.x = -aileronDeflection;
            }
            else if (hasAnalogRoll) {
                // Use analog roll value for proportional control of ailerons
                // Scale the analog value to the max aileron deflection
                const MAX_AILERON_DEFLECTION = 0.5;

                // Apply deflection proportional to joystick position
                const aileronDeflection = this.analogControls.roll * MAX_AILERON_DEFLECTION;

                // Apply deflection to ailerons (left aileron down, right aileron up when rolling left)
                this.leftAileron.rotation.x = -aileronDeflection;
                this.rightAileron.rotation.x = aileronDeflection;
            }
            else if (keysPressed['a'] || keysPressed['q']) {
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
                // Yaw left: rudder right (inverted for correct aerodynamics)
                this.rudder.rotation.y = Math.max(this.rudder.rotation.y - 0.1, -0.5);
            } else if (keysPressed['arrowright']) {
                // Yaw right: rudder left (inverted for correct aerodynamics)
                this.rudder.rotation.y = Math.min(this.rudder.rotation.y + 0.1, 0.5);
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
            chemtrails: this.trailsEnabled,
            health: this.currentHealth,
            isDestroyed: this.isDestroyed
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

        // OPTIMIZED: Reduced trail complexity while maintaining visual effect
        // Trail configuration 
        this.trailMaxLength = 150;      // REDUCED from 250 to 150 points
        this.trailMinOpacity = 0.0;
        this.trailBaseWidth = 0.2;

        // Trail material - white semi-transparent material
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthWrite: false
        });

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
            },
            // OPTIMIZED: Added minimum distance between trail points to reduce number of triangles
            minDistanceBetweenPoints: 0.5, // Only add new points when the plane has moved this far
            lastUpdateTime: 0
        };
    }

    /**
     * Update wing trails
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updateWingTrails(deltaTime) {
        // Only update if trails have been initialized
        if (!this.wingTrails || !this.wingTrails.left || !this.wingTrails.right) return;

        const speedFactor = this.speed / this.maxSpeed;

        // Only generate trails if:
        // 1. The plane is airborne
        // 2. Speed is at least 50% of max speed (speedFactor >= 0.5)
        // 3. Trails are initialized and enabled
        if (!this.isAirborne || speedFactor < 0.5 || !this.trailsEnabled) {
            // If trails exist and we're below 50% speed, hide them
            if (this.wingTrails.left && this.wingTrails.right) {
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

        // OPTIMIZED: Distance-based sampling instead of time-based
        // Check if enough time has passed since last update (throttle updates)
        const now = performance.now();
        if (now - this.wingTrails.lastUpdateTime < 20) { // Check no more than every 20ms
            return;
        }

        // Get current positions of wing tips
        const leftTipPos = this.getWingTipPosition('left');
        const rightTipPos = this.getWingTipPosition('right');

        // OPTIMIZED: Only add new points if the plane has moved enough
        const leftDistance = leftTipPos.distanceTo(this.wingTrails.left.lastPos);
        const rightDistance = rightTipPos.distanceTo(this.wingTrails.right.lastPos);

        // Skip if we haven't moved enough for a new point
        if (leftDistance < this.wingTrails.minDistanceBetweenPoints &&
            rightDistance < this.wingTrails.minDistanceBetweenPoints) {
            return;
        }

        // Update the last update time
        this.wingTrails.lastUpdateTime = now;

        // Get camera position vector from scene - need this to make ribbons face the camera
        const cameraPosition = new THREE.Vector3(0, 10, 20); // Default camera position if we can't find one

        // Try to find the camera in the scene
        let cameraFound = false;
        this.scene.traverse(object => {
            if (object.isCamera && !cameraFound) {
                cameraPosition.copy(object.position);
                cameraFound = true;
            }
        });

        // Update both wing trails
        this.updateSingleTrail('left', opacity, speedFactor, width, cameraPosition);
        this.updateSingleTrail('right', opacity, speedFactor, width, cameraPosition);

        // Update last positions
        this.wingTrails.left.lastPos.copy(leftTipPos);
        this.wingTrails.right.lastPos.copy(rightTipPos);
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
        const uvs = trail.uvs;
        const opacityAttr = trail.opacity;

        // Get world position of the wing tip
        const wingTipWorld = this.getWingTipPosition(side);

        // Direction to camera - if no camera was found, use a direction pointing back and slightly up
        // OPTIMIZED: Simplified camera direction calculation
        const toCamera = cameraPosition.lengthSq() === 0
            ? new THREE.Vector3(0, 0.5, 1).normalize()
            : new THREE.Vector3().subVectors(cameraPosition, wingTipWorld).normalize();

        // OPTIMIZED: Simplified up vector calculation
        // We want up vector to be perpendicular to the to-camera vector
        const up = new THREE.Vector3(0, 1, 0);
        up.sub(toCamera.clone().multiplyScalar(up.dot(toCamera))).normalize();

        // Calculate the left and right points of the ribbon
        // OPTIMIZED: Precalculate half width
        const halfWidth = width / 2;
        const left = up.clone().multiplyScalar(halfWidth);
        const right = up.clone().multiplyScalar(-halfWidth);

        // Top vertex = position + left
        const topPos = wingTipWorld.clone().add(left);
        // Bottom vertex = position + right
        const bottomPos = wingTipWorld.clone().add(right);

        // OPTIMIZED: Precalculate trail maintenance values
        const count = trail.count;
        const maxLength = this.trailMaxLength;

        // Calculate how much of the trail to keep based on speed
        // Faster = more of the trail visible
        const fadeLength = Math.max(10, Math.floor(maxLength * speedFactor));

        // Shift all existing points back (each point is 2 vertices: top and bottom)
        if (count > 0) {
            // OPTIMIZED: Use typed arrays more efficiently to reduce garbage collection
            // Copy positions back two positions (6 values per position: 2 vertices, 3 coords each)
            for (let i = count - 1; i >= 0; i--) {
                const targetIdx = (i + 1) * 6;
                const sourceIdx = i * 6;

                // Copy top vertex (3 coordinates)
                positions[targetIdx] = positions[sourceIdx];
                positions[targetIdx + 1] = positions[sourceIdx + 1];
                positions[targetIdx + 2] = positions[sourceIdx + 2];

                // Copy bottom vertex (3 coordinates)
                positions[targetIdx + 3] = positions[sourceIdx + 3];
                positions[targetIdx + 4] = positions[sourceIdx + 4];
                positions[targetIdx + 5] = positions[sourceIdx + 5];

                // Copy UVs (4 values: 2 vertices, 2 coords each)
                const uvTargetIdx = (i + 1) * 4;
                const uvSourceIdx = i * 4;
                uvs[uvTargetIdx] = uvs[uvSourceIdx];
                uvs[uvTargetIdx + 1] = uvs[uvSourceIdx + 1];
                uvs[uvTargetIdx + 2] = uvs[uvSourceIdx + 2];
                uvs[uvTargetIdx + 3] = uvs[uvSourceIdx + 3];

                // Shift opacity values and apply fade based on age
                const opacityTargetIdx = (i + 1) * 2;
                const opacitySourceIdx = i * 2;
                opacityAttr[opacityTargetIdx] = opacityAttr[opacitySourceIdx];
                opacityAttr[opacityTargetIdx + 1] = opacityAttr[opacitySourceIdx + 1];

                // Apply fade based on position in trail
                if (i > fadeLength) {
                    const fadeFactor = 1 - ((i - fadeLength) / (maxLength - fadeLength));
                    opacityAttr[opacityTargetIdx] *= fadeFactor;
                    opacityAttr[opacityTargetIdx + 1] *= fadeFactor;
                }
            }
        }

        // Add new points at the beginning
        // Top vertex (index 0)
        positions[0] = topPos.x;
        positions[1] = topPos.y;
        positions[2] = topPos.z;

        // Bottom vertex (index 1)
        positions[3] = bottomPos.x;
        positions[4] = bottomPos.y;
        positions[5] = bottomPos.z;

        // Set UVs for new vertices
        const newU = count / maxLength;
        uvs[0] = newU;
        uvs[1] = 0; // top
        uvs[2] = newU;
        uvs[3] = 1; // bottom

        // Set opacity for new vertices
        opacityAttr[0] = opacity;
        opacityAttr[1] = opacity;

        // Update count and geometry
        trail.count = Math.min(maxLength, count + 1);
        trail.mesh.geometry.attributes.position.needsUpdate = true;
        trail.mesh.geometry.attributes.uv.needsUpdate = true;
        trail.mesh.geometry.attributes.opacity.needsUpdate = true;
        trail.mesh.geometry.setDrawRange(0, (trail.count - 1) * 6);
    }

    /**
     * Get the world position of a wing tip
     * @param {string} side - 'left' or 'right' wing
     * @returns {THREE.Vector3} - The world position of the wing tip
     */
    getWingTipPosition(side) {
        const emitterOffset = this.wingTrails[side].emitterOffset;
        const wingTipLocal = emitterOffset.clone();
        return wingTipLocal.applyMatrix4(this.mesh.matrixWorld);
    }

    /**
     * Get the current health of the plane
     * @returns {number} Current health value
     */
    getHealth() {
        return this.currentHealth;
    }

    /**
     * Set the health to a specific value
     * @param {number} value - New health value
     */
    setHealth(value) {
        const oldHealth = this.currentHealth;
        this.currentHealth = Math.min(Math.max(value, 0), this.maxHealth);

        // Check if health has changed
        if (oldHealth !== this.currentHealth) {
            // Emit health update event
            this.eventBus.emit('plane.health.update', {
                oldHealth: oldHealth,
                newHealth: this.currentHealth,
                maxHealth: this.maxHealth
            }, this === this.eventBus.playerPlane ? 'player' : 'enemy');

            // Check if plane is destroyed
            if (oldHealth > 0 && this.currentHealth <= 0) {
                this.destroy();
            }
        }
    }

    /**
     * Apply damage to the plane
     * @param {number} amount - Amount of damage to apply
     * @param {THREE.Vector3} impactPosition - Optional position where the damage occurred
     */
    damage(amount, impactPosition) {
        if (this.isDestroyed) return; // Already destroyed, no more damage

        console.log(`Plane taking ${amount} damage, current health: ${this.currentHealth}`);

        const oldHealth = this.currentHealth;
        this.currentHealth = Math.max(0, this.currentHealth - amount);

        // Log health change more clearly
        console.log(`Health reduced from ${oldHealth} to ${this.currentHealth} (${amount} damage)`);

        // Emit damage event with more information
        this.eventBus.emit('plane.damage', {
            amount: amount,
            oldHealth: oldHealth,
            newHealth: this.currentHealth,
            maxHealth: this.maxHealth,
            plane: this,  // Pass the plane object for reference
            impactPosition: impactPosition // Include impact position if available
        }, this === this.eventBus.playerPlane ? 'player' : 'enemy');

        // Emit a general health update event for UI components
        this.eventBus.emit('plane.health.update', {
            oldHealth: oldHealth,
            newHealth: this.currentHealth,
            maxHealth: this.maxHealth
        }, this === this.eventBus.playerPlane ? 'player' : 'enemy');

        // Check if destroyed
        if (oldHealth > 0 && this.currentHealth <= 0) {
            this.destroy();
        } else if (impactPosition && this === this.eventBus.playerPlane && this.currentHealth > 0) {
            // Only create hit effects if the plane is still alive after taking damage
            console.log("Creating hit effect on local player at impact position");
            this.eventBus.emit('effect.hit', {
                position: impactPosition,
                playSound: true
            });
        }
    }

    /**
     * Heal the plane
     * @param {number} amount - Amount of health to restore
     */
    heal(amount) {
        if (this.isDestroyed) return; // Can't heal a destroyed plane

        const oldHealth = this.currentHealth;
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);

        // Only emit event if health actually changed
        if (oldHealth !== this.currentHealth) {
            this.eventBus.emit('plane.health.update', {
                oldHealth: oldHealth,
                newHealth: this.currentHealth,
                maxHealth: this.maxHealth
            }, this === this.eventBus.playerPlane ? 'player' : 'enemy');
        }
    }

    /**
     * Check if the plane is alive
     * @returns {boolean} True if health is greater than 0
     */
    isAlive() {
        return this.currentHealth > 0;
    }

    /**
     * Destroy the plane
     */
    destroy() {
        if (this.isDestroyed) return; // Already destroyed

        console.log(`Plane destroyed: ${this === this.eventBus.playerPlane ? 'player' : 'enemy'}`);

        this.isDestroyed = true;
        this.currentHealth = 0;

        // Emit destroyed event
        this.eventBus.emit('plane.destroyed', {
            position: this.mesh.position.clone(),
            rotation: this.mesh.rotation.clone(),
            plane: this  // Pass the plane object for reference
        }, this === this.eventBus.playerPlane ? 'player' : 'enemy');

        // Play explosion sound
        this.eventBus.emit('sound.play', { sound: 'explosion' });

        // Disable wing trails
        if (this.wingTrails && this.wingTrails.left && this.wingTrails.right) {
            this.wingTrails.left.mesh.visible = false;
            this.wingTrails.right.mesh.visible = false;
        }
    }
} 