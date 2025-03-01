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
        this.minTakeoffSpeed = 0.3;
        this.acceleration = 0.001;
        this.deceleration = 0.002;
        this.isAirborne = false;

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
                // Rolling left: left aileron up, right aileron down
                this.leftAileron.rotation.x = Math.min(this.leftAileron.rotation.x + 0.1, 0.5);
                this.rightAileron.rotation.x = Math.max(this.rightAileron.rotation.x - 0.1, -0.5);
            } else if (keysPressed['d']) {
                // Rolling right: left aileron down, right aileron up
                this.leftAileron.rotation.x = Math.max(this.leftAileron.rotation.x - 0.1, -0.5);
                this.rightAileron.rotation.x = Math.min(this.rightAileron.rotation.x + 0.1, 0.5);
            } else {
                // Return to neutral
                this.leftAileron.rotation.x *= 0.8;
                this.rightAileron.rotation.x *= 0.8;
            }
        }

        // Elevator animation (pitch)
        if (this.elevators) {
            if (keysPressed['arrowup']) {
                // Pitch down: elevators down
                this.elevators.rotation.x = Math.max(this.elevators.rotation.x - 0.1, -0.5);
            } else if (keysPressed['arrowdown']) {
                // Pitch up: elevators up
                this.elevators.rotation.x = Math.min(this.elevators.rotation.x + 0.1, 0.5);
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
     */
    emitFlightInfoUpdate() {
        // Get altitude (y position)
        const altitude = Math.max(0, this.mesh.position.y);

        // Get speed as percentage of max speed
        const speedPercent = (this.speed / this.maxSpeed) * 100;

        // Emit flight info update event
        this.eventBus.emit('flight.info.update', {
            speed: speedPercent,
            altitude: altitude,
            isAirborne: this.isAirborne,
            autoStabilization: this.autoStabilizationEnabled
        });
    }
} 