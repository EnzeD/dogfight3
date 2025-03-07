// Enemy Plane class extending WW2Plane with AI capabilities
import * as THREE from 'three';
import WW2Plane from './WW2Plane.js';
import SmokeFX from '../effects/SmokeFX.js';
import ExplosionFX from '../effects/ExplosionFX.js';

export default class EnemyPlane extends WW2Plane {
    constructor(scene, eventBus) {
        super(scene, eventBus);

        // Add smoke effect system for low health
        this.smokeFX = new SmokeFX(scene);

        // Add explosion effect system for destruction
        this.explosionFX = new ExplosionFX(scene);

        // Physics properties for free fall
        this.freeFall = {
            active: false,
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            gravity: 9.8 // m/s²
        };

        // AI state properties
        this.aiState = 'IDLE'; // Current AI state: 'IDLE', 'CHASE', or 'ATTACK'
        this.detectionRange = 150; // Range at which enemy detects player
        this.attackRange = 80; // Range at which enemy can attack
        this.aimTolerance = 0.85; // How accurate aim needs to be to fire (dot product threshold)

        // Initialize velocity vector
        this.velocity = new THREE.Vector3();

        // Always start as airborne (enemies spawn in the air)
        this.isAirborne = true;
        this.speed = this.maxSpeed * 0.25; // Start at 0.25 (25% of max speed) as requested

        // Track if we've already customized the wing trails
        this.wingTrailsCustomized = false;

        // Waypoint system for IDLE state
        this.waypointQueue = []; // Queue of waypoints to follow
        this.minWaypoints = 3; // Minimum number of waypoints to have in queue
        this.maxWaypoints = 5; // Maximum number of waypoints to keep in queue
        this.waypointReachedThreshold = 20; // How close the plane needs to get to a waypoint (increased from 15)
        this.idleSpeed = 0.25; // Start at 0.25 speed as requested
        this.maxIdleSpeed = 0.65; // Maximum speed is 0.65 as requested
        this.idleAltitudeMin = 120;
        this.idleAltitudeMax = 320; // Maximum altitude for idle flight (increased from 200)
        this.idleAreaSize = 800; // Size of the patrol area (increased from 300)
        this.waypointChangeInterval = 5; // Force waypoint change every X seconds (increased from 3)
        this.lastWaypointChangeTime = 0;

        // Human-like behavior parameters
        this.speedVariationCounter = 0;
        this.speedVariationInterval = Math.random() * 10 + 5; // 5-15 seconds between speed changes
        this.currentSpeedTarget = this.idleSpeed;
        this.speedAcceleration = 0.01; // How quickly speed changes
        this.speedVariationRange = { min: 0.25, max: 0.65 }; // The range we'll vary speed in

        // Game boundaries (prevent flying too far)
        this.worldBounds = {
            minX: -2000,
            maxX: 2000,
            minY: this.idleAltitudeMin,
            maxY: 500,
            minZ: -2000,
            maxZ: 2000
        };

        // Smoothing parameters
        this.turnSpeed = 0.5; // How quickly the plane turns (decreased from 0.7 for smoother turns)
        this.bankFactor = 0.6; // How much the plane banks during turns (decreased from 0.8)
        this.humanErrorFactor = 0.15; // Add human error for more realistic flight

        // AI behavior debug
        this.showDebugInfo = false;

        // Generate initial waypoints path
        this.generateInitialPath();

        // Note: Using the same color scheme as the player plane
        // No need to override colors as we inherit from WW2Plane
    }

    /**
     * Generate an initial path with multiple waypoints
     */
    generateInitialPath() {
        // Clear any existing waypoints
        this.waypointQueue = [];

        // Generate multiple waypoints to form an initial path
        for (let i = 0; i < this.maxWaypoints; i++) {
            this.generateNewWaypoint();
        }

        if (this.showDebugInfo) {
            console.log(`Enemy plane generated initial path with ${this.waypointQueue.length} waypoints`);
        }
    }

    /**
     * Generate a new random waypoint and add it to the queue
     */
    generateNewWaypoint() {
        // Get the reference position for the new waypoint
        // If we have waypoints, use the last one as reference, otherwise use current position
        const referencePos = this.waypointQueue.length > 0
            ? this.waypointQueue[this.waypointQueue.length - 1].clone()
            : this.mesh.position.clone();

        // Generate a random point that continues in a somewhat natural direction
        let newWaypoint;
        let attempts = 0;

        do {
            // Get the current flight direction if we have waypoints
            let currentDirection = new THREE.Vector3(0, 0, -1);
            if (this.waypointQueue.length > 0 && this.mesh) {
                currentDirection = new THREE.Vector3().subVectors(
                    this.waypointQueue[this.waypointQueue.length - 1],
                    this.waypointQueue.length > 1
                        ? this.waypointQueue[this.waypointQueue.length - 2]
                        : this.mesh.position
                ).normalize();

                // Add some randomness to direction but keep it somewhat consistent
                // Wider angle range for more human-like unpredictability
                const randomAngle = (Math.random() - 0.5) * Math.PI * 0.7; // +/- 63 degrees

                // Use variable elevation changes with bias toward level flight
                // This simulates more human-like flight patterns
                const elevationBias = Math.random() > 0.7 ? 0.6 : 0.2; // Occasionally make steeper turns
                const randomElevation = (Math.random() - 0.5) * Math.PI * elevationBias;

                // Create rotation matrix for heading (y-axis)
                const rotationY = new THREE.Matrix4().makeRotationY(randomAngle);
                // Create rotation matrix for elevation (x-axis) 
                const rotationX = new THREE.Matrix4().makeRotationX(randomElevation);

                // Apply rotations
                currentDirection.applyMatrix4(rotationY);
                currentDirection.applyMatrix4(rotationX);
            } else {
                // If no waypoints yet, choose a random direction
                const randomAngle = Math.random() * Math.PI * 2;
                const randomElevation = (Math.random() - 0.5) * Math.PI * 0.3;

                currentDirection.x = Math.cos(randomAngle) * Math.cos(randomElevation);
                currentDirection.y = Math.sin(randomElevation);
                currentDirection.z = Math.sin(randomAngle) * Math.cos(randomElevation);
            }

            // Calculate distance for this segment - more variable distances for natural behavior
            const segmentDistance = 100 + Math.random() * 120; // 100-220 units (previously 60-120)

            // Create the new waypoint by moving in the calculated direction
            newWaypoint = new THREE.Vector3(
                referencePos.x + currentDirection.x * segmentDistance,
                referencePos.y + currentDirection.y * segmentDistance,
                referencePos.z + currentDirection.z * segmentDistance
            );

            // Ensure altitude is within bounds, with gradual adjustments for realism
            // Apply a smoothing factor to make altitude changes more gradual
            if (newWaypoint.y < this.idleAltitudeMin) {
                // If below min altitude, curve upward gently
                const altDiff = this.idleAltitudeMin - newWaypoint.y;
                newWaypoint.y = this.idleAltitudeMin + (Math.random() * altDiff * 0.5);
            } else if (newWaypoint.y > this.idleAltitudeMax) {
                // If above max altitude, curve downward gently
                const altDiff = newWaypoint.y - this.idleAltitudeMax;
                newWaypoint.y = this.idleAltitudeMax - (Math.random() * altDiff * 0.5);
            }

            attempts++;
        } while (!this.isWithinWorldBounds(newWaypoint) && attempts < 10);

        // If we couldn't find a valid waypoint after 10 attempts,
        // pick a point with a more conservative approach
        if (attempts >= 10) {
            const randomAngle = Math.random() * Math.PI * 2;
            const randomAltitude = this.idleAltitudeMin +
                (this.idleAltitudeMax - this.idleAltitudeMin) * (0.3 + Math.random() * 0.5); // 30-80% of range

            newWaypoint = new THREE.Vector3(
                referencePos.x + Math.cos(randomAngle) * 140, // Increased from 80
                randomAltitude, // More defined altitude range
                referencePos.z + Math.sin(randomAngle) * 140  // Increased from 80
            );

            // Clamp to world boundaries
            newWaypoint.x = Math.max(this.worldBounds.minX, Math.min(this.worldBounds.maxX, newWaypoint.x));
            newWaypoint.y = Math.max(this.worldBounds.minY, Math.min(this.worldBounds.maxY, newWaypoint.y));
            newWaypoint.z = Math.max(this.worldBounds.minZ, Math.min(this.worldBounds.maxZ, newWaypoint.z));
        }

        // Add the new waypoint to the queue
        this.waypointQueue.push(newWaypoint);
        this.lastWaypointChangeTime = performance.now() / 1000; // Convert to seconds

        if (this.showDebugInfo) {
            console.log(`Enemy plane added new waypoint: ${newWaypoint.x.toFixed(2)}, ${newWaypoint.y.toFixed(2)}, ${newWaypoint.z.toFixed(2)}`);
        }
    }

    /**
     * Check if a point is within the defined world boundaries
     * @param {THREE.Vector3} position - The position to check
     * @returns {boolean} True if the position is within bounds
     */
    isWithinWorldBounds(position) {
        return position.x >= this.worldBounds.minX && position.x <= this.worldBounds.maxX &&
            position.y >= this.worldBounds.minY && position.y <= this.worldBounds.maxY &&
            position.z >= this.worldBounds.minZ && position.z <= this.worldBounds.maxZ;
    }

    /**
     * Check if the current waypoint has been reached
     * @returns {boolean} True if the first waypoint is reached or queue is empty
     */
    reachedWaypoint() {
        if (this.waypointQueue.length === 0) return true;

        const distanceToWaypoint = this.mesh.position.distanceTo(this.waypointQueue[0]);
        return distanceToWaypoint < this.waypointReachedThreshold;
    }

    /**
     * Update the plane's behavior in IDLE state
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateIdleState(deltaTime) {
        // Update human-like speed variations
        this.updateHumanLikeSpeed(deltaTime);

        // Check if we need to replenish waypoints
        const currentTime = performance.now() / 1000;

        // Safety check - if we're getting too close to the ground, generate emergency waypoint above
        if (this.mesh.position.y < this.idleAltitudeMin + 30) {
            // If we're too low, clear the queue and add a single "climb" waypoint
            this.waypointQueue = [];

            // Create a waypoint directly above with a safe altitude
            const safeAltitude = this.idleAltitudeMin + 50 + Math.random() * 30;
            const emergencyWaypoint = new THREE.Vector3(
                this.mesh.position.x,
                safeAltitude,
                this.mesh.position.z
            );

            this.waypointQueue.push(emergencyWaypoint);

            if (this.showDebugInfo) {
                console.log(`Enemy plane emergency altitude correction to ${safeAltitude.toFixed(2)}`);
            }
        }

        // If we've reached the current waypoint, remove it
        if (this.waypointQueue.length > 0 && this.reachedWaypoint()) {
            this.waypointQueue.shift(); // Remove the first waypoint

            // Occasionally change speed when reaching a waypoint (more human-like)
            if (Math.random() < 0.4) { // 40% chance to change speed at waypoints
                this.currentSpeedTarget = this.getRandomSpeedInRange();
            }

            if (this.showDebugInfo) {
                console.log(`Enemy plane reached waypoint, ${this.waypointQueue.length} waypoints remaining`);
            }
        }

        // Generate new waypoints if we're running low or if we're stuck for too long
        const timeInWaypoint = currentTime - this.lastWaypointChangeTime;
        if (this.waypointQueue.length < this.minWaypoints ||
            timeInWaypoint > this.waypointChangeInterval) {

            // If we've been stuck trying to reach the same waypoint for too long,
            // it might be unreachable - clear the first waypoint
            if (this.waypointQueue.length > 0 && timeInWaypoint > this.waypointChangeInterval * 1.5) {
                this.waypointQueue.shift();
                if (this.showDebugInfo) {
                    console.log(`Enemy plane abandoned unreachable waypoint`);
                }
            }

            // Generate a new waypoint to add to the queue
            this.generateNewWaypoint();

            // If we have too many waypoints, trim the queue
            if (this.waypointQueue.length > this.maxWaypoints) {
                this.waypointQueue = this.waypointQueue.slice(0, this.maxWaypoints);
            }
        }

        // Calculate direction to the current waypoint (if any)
        if (this.waypointQueue.length > 0) {
            const directionToWaypoint = new THREE.Vector3()
                .subVectors(this.waypointQueue[0], this.mesh.position)
                .normalize();

            // Add slight human-like randomness to the targeting
            if (Math.random() < 0.05) { // Occasionally make small flight corrections
                const randomDeviation = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.05,
                    (Math.random() - 0.5) * 0.05,
                    (Math.random() - 0.5) * 0.05
                );
                directionToWaypoint.add(randomDeviation).normalize();
            }

            // Fly toward waypoint
            this.flyTowardDirection(directionToWaypoint, deltaTime);
        } else {
            // If no waypoints, generate a new path
            this.generateInitialPath();
        }
    }

    /**
     * Update speed with human-like variations
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateHumanLikeSpeed(deltaTime) {
        // Update speed variation counter
        this.speedVariationCounter += deltaTime;

        // Check if it's time for a speed change
        if (this.speedVariationCounter >= this.speedVariationInterval) {
            // Reset counter
            this.speedVariationCounter = 0;
            // Set new interval (5-15 seconds)
            this.speedVariationInterval = Math.random() * 10 + 5;
            // Set new target speed within our range
            this.currentSpeedTarget = this.getRandomSpeedInRange();
        }

        // Gradually adjust speed toward target (acceleration/deceleration)
        if (Math.abs(this.speed - this.currentSpeedTarget) > 0.01) {
            if (this.speed < this.currentSpeedTarget) {
                this.speed = Math.min(this.currentSpeedTarget, this.speed + this.speedAcceleration * deltaTime);
            } else {
                this.speed = Math.max(this.currentSpeedTarget, this.speed - this.speedAcceleration * deltaTime);
            }
        }
    }

    /**
     * Get a random speed within the specified range
     * @returns {number} A random speed value
     */
    getRandomSpeedInRange() {
        return this.speedVariationRange.min +
            Math.random() * (this.speedVariationRange.max - this.speedVariationRange.min);
    }

    /**
     * Fly the plane toward a specific direction with smooth banking
     * @param {THREE.Vector3} targetDirection - Normalized direction vector
     * @param {number} deltaTime - Time since last update in seconds
     */
    flyTowardDirection(targetDirection, deltaTime) {
        // Get current plane vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.mesh.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);

        // Calculate desired rotation adjustments
        const dotForward = forward.dot(targetDirection); // How aligned we are with target (-1 to 1)
        const dotRight = right.dot(targetDirection); // Direction of turn (-1 is left, 1 is right)
        const dotUp = up.dot(targetDirection); // Direction of pitch (-1 is down, 1 is up)

        // Add slight randomness to inputs to simulate human imperfection
        const humanJitter = () => (Math.random() - 0.5) * this.humanErrorFactor; // Human error input variation

        // Calculate control inputs
        // Reduced input strength for more gradual turns
        const rollInput = -dotRight * this.bankFactor + humanJitter() * Math.abs(dotRight);
        const pitchInput = dotUp * this.turnSpeed + humanJitter() * Math.abs(dotUp);

        // Reduced yaw for more realistic flight (planes primarily turn with roll+pitch)
        const yawInput = dotRight * this.turnSpeed * 0.3 + humanJitter() * 0.05;

        // Sometimes delay full throttle application - human pilots don't always use 100% throttle
        // Use a time-varying throttle that subtly changes based on a sine wave
        const timeNow = performance.now() / 1000;
        const throttleVariation = Math.sin(timeNow * 0.2) * 0.1; // +/- 10% throttle variation

        // Base throttle on current target speed instead of fixed value
        const baseThrottle = Math.min(1.0, this.currentSpeedTarget + Math.max(0, 0.1 - Math.abs(dotForward - 1) * 0.2));
        const throttleInput = baseThrottle + throttleVariation;

        // Artificial inputs for the plane's controls
        const artificialInputs = {
            roll: Math.max(-1, Math.min(1, rollInput)),
            pitch: Math.max(-1, Math.min(1, pitchInput)),
            yaw: Math.max(-1, Math.min(1, yawInput)),
            throttle: Math.max(0.4, Math.min(1, throttleInput))
        };

        // Apply the inputs to simulate player control
        this.applyArtificialInputs(artificialInputs, deltaTime);

        // Move the plane forward in the direction it's facing
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(this.mesh.quaternion);
        this.mesh.position.add(forwardDirection.multiplyScalar(this.speed * deltaTime * 60));
    }

    /**
     * Apply artificial inputs to the plane's controls
     * @param {Object} inputs - Contains roll, pitch, yaw, and throttle values (-1 to 1)
     * @param {number} deltaTime - Time since last update in seconds
     */
    applyArtificialInputs(inputs, deltaTime) {
        // Map the artificial inputs to the plane's physical control inputs

        // Apply roll, pitch, and yaw directly to the mesh
        if (inputs.roll !== 0) {
            this.mesh.rotateZ(inputs.roll * this.rollSpeed * deltaTime * 60);
        }

        if (inputs.pitch !== 0) {
            this.mesh.rotateX(inputs.pitch * this.pitchSpeed * deltaTime * 60);
        }

        if (inputs.yaw !== 0) {
            this.mesh.rotateY(inputs.yaw * this.yawSpeed * deltaTime * 60);
        }

        // Handle throttle (speed) separately
        const targetSpeed = this.maxSpeed * inputs.throttle;
        this.speed += (targetSpeed - this.speed) * deltaTime;

        // Make sure we're airborne when flying in IDLE state
        this.isAirborne = true;
    }

    /**
     * Update control surfaces based on AI state rather than player input
     * This overrides the parent class method to avoid relying on inputState
     */
    updateControlSurfaces() {
        // Check if the control surfaces were correctly initialized
        if (!this.leftAileron || !this.rightAileron || !this.elevators || !this.rudder) {
            console.warn('Control surfaces not initialized in EnemyPlane');
            return; // Skip if parts aren't initialized yet
        }

        // Reset rotation of control surfaces
        this.leftAileron.rotation.x = 0;
        this.rightAileron.rotation.x = 0;
        this.elevators.rotation.x = 0;
        this.rudder.rotation.y = 0;

        // Apply rotations based on current motion/direction
        // Get current angular velocity from recent rotations
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.mesh.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);

        // If we're moving toward the current waypoint, apply appropriate control surface visuals
        if (this.waypointQueue.length > 0) {
            const directionToWaypoint = new THREE.Vector3()
                .subVectors(this.waypointQueue[0], this.mesh.position)
                .normalize();

            // Calculate desired rotation adjustments
            const dotRight = right.dot(directionToWaypoint); // Direction of turn (-1 is left, 1 is right)
            const dotUp = up.dot(directionToWaypoint); // Direction of pitch (-1 is down, 1 is up)

            // Apply control surface rotations based on direction
            // Roll - ailerons move in opposite directions
            const aileronRotation = -dotRight * 0.5; // Max rotation 0.5 radians
            this.leftAileron.rotation.x = -aileronRotation;
            this.rightAileron.rotation.x = aileronRotation;

            // Pitch - elevator
            const elevatorRotation = dotUp * 0.3; // Max rotation 0.3 radians
            this.elevators.rotation.x = elevatorRotation;

            // Yaw - rudder
            const rudderRotation = dotRight * 0.3; // Max rotation 0.3 radians
            this.rudder.rotation.y = rudderRotation;
        }
    }

    /**
     * Customize wing trails for enemy planes with a reddish tint
     */
    customizeWingTrails() {
        // Only customize once
        if (this.wingTrailsCustomized) return;

        // Check if wing trails are ready
        if (this.wingTrails && this.wingTrails.left && this.wingTrails.right) {
            // Red tint for enemy planes
            const redTrailColor = 0xff5555;

            if (this.wingTrails.left.mesh && this.wingTrails.left.mesh.material) {
                this.wingTrails.left.mesh.material.color.setHex(redTrailColor);
            }

            if (this.wingTrails.right.mesh && this.wingTrails.right.mesh.material) {
                this.wingTrails.right.mesh.material.color.setHex(redTrailColor);
            }

            // Mark as customized
            this.wingTrailsCustomized = true;
        }
    }

    /**
     * Override the update method to use AI control instead of user input
     * @param {number} deltaTime - Time since last update in seconds
     * @param {Object} inputState - Not used for AI control, can be null
     * @param {THREE.Vector3} playerPosition - Position of the player's plane
     */
    update(deltaTime, inputState, playerPosition) {
        // Handle free fall physics if the plane is destroyed
        if (this.isDestroyed && this.freeFall.active) {
            this.updateFreeFall(deltaTime);

            // Continue updating the explosion effects
            if (this.explosionFX) {
                this.explosionFX.update(deltaTime);
            }

            return; // Skip normal update logic
        }

        // Keep customizing wing trails
        this.customizeWingTrails();

        // Update plane behavior based on AI state
        switch (this.aiState) {
            case 'IDLE':
                this.updateIdleState(deltaTime);
                break;
            case 'CHASE':
                // Chase behavior will be implemented later
                this.updateIdleState(deltaTime);
                break;
            case 'ATTACK':
                // Attack behavior will be implemented later
                this.updateIdleState(deltaTime);
                break;
            default:
                this.updateIdleState(deltaTime);
        }

        // Update propeller animation for visual feedback
        this.updatePropeller(deltaTime);

        // Animate control surfaces based on recent inputs
        this.updateControlSurfaces();

        // Update wing trails if enabled
        if (this.trailsEnabled && this.wingTrails.left && this.wingTrails.right) {
            this.updateWingTrails();
        }

        // Update smoke effects for low health
        if (this.smokeFX) {
            // Calculate health percentage
            const healthPercent = this.currentHealth / this.maxHealth;

            // Emit smoke when health is low
            this.smokeFX.emitSmoke(this, healthPercent, deltaTime);

            // Update smoke particles
            this.smokeFX.update(deltaTime);
        }

        // Update explosion effects if active
        if (this.explosionFX) {
            this.explosionFX.update(deltaTime);
        }

        // Emit flight information updates as usual
        this.emitFlightInfoUpdate();
    }

    /**
     * Handle free fall physics for destroyed plane
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updateFreeFall(deltaTime) {
        // Apply gravity to velocity
        this.freeFall.velocity.y -= this.freeFall.gravity * deltaTime;

        // Apply velocity to position
        this.mesh.position.x += this.freeFall.velocity.x * deltaTime;
        this.mesh.position.y += this.freeFall.velocity.y * deltaTime;
        this.mesh.position.z += this.freeFall.velocity.z * deltaTime;

        // Apply angular velocity (rotation)
        this.mesh.rotation.x += this.freeFall.angularVelocity.x * deltaTime;
        this.mesh.rotation.y += this.freeFall.angularVelocity.y * deltaTime;
        this.mesh.rotation.z += this.freeFall.angularVelocity.z * deltaTime;

        // Check for ground impact
        if (this.mesh.position.y < this.groundHeight) {
            // Stop at ground level
            this.mesh.position.y = this.groundHeight;

            // Reduce velocity dramatically (impact)
            this.freeFall.velocity.multiplyScalar(0.3);
            this.freeFall.velocity.y = 0;

            // Reduce angular velocity (friction)
            this.freeFall.angularVelocity.multiplyScalar(0.7);
        }

        // Update propeller even in free fall (but slowly)
        if (this.propeller) {
            this.propeller.rotation.z += 0.1 * deltaTime;
        }

        // Continue updating smoke effects during free-fall
        if (this.smokeFX) {
            // Use a fixed health percentage for consistent smoke during free-fall
            const freeFailSmokeIntensity = 0.1; // 10% health = heavy smoke

            // Emit smoke from the falling plane
            this.smokeFX.emitSmoke(this, freeFailSmokeIntensity, deltaTime);

            // Update smoke particles
            this.smokeFX.update(deltaTime);
        }
    }

    /**
     * Override fireAmmo to make sure it works for enemy planes
     */
    fireAmmo() {
        // Create velocity vector in the direction the plane is facing
        const velocity = new THREE.Vector3();
        // Get forward direction of the plane and multiply by speed
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        velocity.copy(forward).multiplyScalar(this.speed);

        // Fire bullets
        if (this.ammoSystem) {
            this.ammoSystem.fireBullets(this.mesh, velocity);
        }
    }

    /**
     * Override emitFlightInfoUpdate to identify the source as 'enemy'
     * NOTE: This event is not used for UI updates since we now directly
     * read player plane data in the UIManager.
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
            autoStabilization: this.autoStabilizationEnabled,
            chemtrails: this.trailsEnabled
        }, 'enemy'); // Identify this as coming from an enemy plane
    }

    /**
     * Override dispose to clean up resources
     */
    dispose() {
        // Dispose smoke effects
        if (this.smokeFX) {
            this.smokeFX.dispose();
            this.smokeFX = null;
        }

        // Dispose explosion effects
        if (this.explosionFX) {
            this.explosionFX.dispose();
            this.explosionFX = null;
        }

        // Call parent dispose method
        super.dispose();
    }

    /**
     * Override the destroy method to add explosion and free fall
     */
    destroy() {
        // Don't call super.destroy() since we want to customize behavior

        // Skip if already destroyed
        if (this.isDestroyed) return;

        // Set destroyed state
        this.isDestroyed = true;
        this.currentHealth = 0;

        // Create a large explosion at the plane's position
        if (this.explosionFX) {
            this.explosionFX.createExplosion(this.mesh.position.clone());

            // Play explosion sound
            if (this.eventBus) {
                this.eventBus.emit('sound.play', { sound: 'explosion' });
            }
        }

        // Initialize free fall physics
        // Calculate current plane velocity
        const forwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        this.freeFall.velocity.copy(forwardDirection.multiplyScalar(this.speed * 0.5)); // Reduce forward momentum

        // Add random angular velocity for tumbling
        this.freeFall.angularVelocity.set(
            (Math.random() - 0.5) * 2,  // Random X rotation
            (Math.random() - 0.5) * 0.5, // Less Y rotation (yaw)
            (Math.random() - 0.5) * 3   // More Z rotation (roll)
        );

        // Activate free fall physics
        this.freeFall.active = true;

        // No longer stop smoke - we want it to continue
        // if (this.smokeFX) {
        //     this.smokeFX.stopAndCleanup();
        // }

        // Disable wing trails
        if (this.wingTrails && this.wingTrails.left && this.wingTrails.right) {
            this.wingTrails.left.mesh.visible = false;
            this.wingTrails.right.mesh.visible = false;
        }

        // Emit destroyed event with additional free fall info
        this.eventBus.emit('plane.destroyed', {
            position: this.mesh.position.clone(),
            rotation: this.mesh.rotation.clone(),
            freeFall: true
        }, 'enemy');

        console.log('Enemy plane destroyed and entering free fall');

        // Set up timer to completely remove the plane after 10 seconds
        setTimeout(() => {
            this.removeFromScene();
        }, 10000);
    }

    /**
     * Remove the plane completely from the scene
     */
    removeFromScene() {
        console.log('Removing destroyed enemy plane from scene');

        // Make the plane invisible
        if (this.mesh) {
            this.mesh.visible = false;
        }

        // Clean up explosion effects if they're still active
        if (this.explosionFX) {
            // We don't fully dispose the explosion system since it might be used again
            // But we'll clear any active explosions
            this.explosionFX.activeExplosions = [];
        }

        // Clean up smoke effects
        if (this.smokeFX) {
            // Clear all active particles immediately
            this.smokeFX.clearAllParticles();
        }

        // Notify for debugging/development
        this.eventBus.emit('notification', {
            message: 'Enemy plane removed',
            type: 'info'
        });
    }

    /**
     * Update wing trails
     * Override the parent's implementation to allow for custom trail activation threshold (0.35)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updateWingTrails(deltaTime) {
        // Get speed as percentage (0-1)
        const speedFactor = this.speed / this.maxSpeed;

        // Only generate trails if:
        // 1. The plane is airborne
        // 2. Speed is at least 35% of max speed (speedFactor >= 0.35) - customized for enemy planes
        // 3. Trails are initialized and enabled
        if (!this.isAirborne || speedFactor < 0.35 || !this.wingTrails.left || !this.wingTrails.right || !this.trailsEnabled) {
            // If trails exist and we're below threshold speed, hide them
            if (this.wingTrails.left && this.wingTrails.right && speedFactor < 0.35) {
                this.wingTrails.left.mesh.visible = false;
                this.wingTrails.right.mesh.visible = false;
            }
            return;
        }

        // Make sure trails are visible
        this.wingTrails.left.mesh.visible = this.trailsEnabled;
        this.wingTrails.right.mesh.visible = this.trailsEnabled;

        // Calculate opacity based on speed:
        // - At 35% speed: 0% opacity
        // - At 100% speed: 50% opacity
        // Normalize the speed factor to this range
        const normalizedSpeedFactor = (speedFactor - 0.35) / 0.65; // 0 at 35% speed, 1 at 100% speed
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
        const cameraPosition = new THREE.Vector3(0, 10, 20);
        if (this.scene && this.scene.camera) {
            cameraPosition.copy(this.scene.camera.position);
        }

        // Update each trail
        this.updateSingleTrail('left', opacity, speedFactor, width, cameraPosition);
        this.updateSingleTrail('right', opacity, speedFactor, width, cameraPosition);
    }
} 