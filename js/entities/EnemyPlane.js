// Enemy Plane class extending WW2Plane with simplified AI capabilities
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

        // Initialize velocity vector
        this.velocity = new THREE.Vector3();

        // Always start as airborne (enemies spawn in the air)
        this.isAirborne = true;
        this.speed = this.maxSpeed * 0.35; // Start at 35% of max speed

        // Track if we've already customized the wing trails
        this.wingTrailsCustomized = false;

        // Simplified waypoint system
        this.waypoints = []; // Only 3 fixed waypoints
        this.currentWaypointIndex = 0;
        this.waypointReachedThreshold = 20; // How close the plane needs to get to a waypoint

        // Flight parameters
        this.minAltitude = 150; // Medium altitude
        this.maxAltitude = 300; // High altitude
        this.worldBounds = {
            minX: -2000,
            maxX: 2000,
            minY: this.minAltitude,
            maxY: this.maxAltitude,
            minZ: -2000,
            maxZ: 2000
        };

        // Smoothing parameters
        this.turnSpeed = 0.35; // Lower value for smoother, wider turns
        this.bankFactor = 0.45; // Lower value for gentler banking
        this.humanErrorFactor = 0.08; // Small human error for more realistic flight

        // Speed settings
        this.speedVariationCounter = 0;
        this.speedVariationInterval = Math.random() * 10 + 5; // 5-15 seconds between speed changes
        this.currentSpeedTarget = this.speed;
        this.speedAcceleration = 0.01; // How quickly speed changes
        this.speedVariationRange = { min: 0.35, max: 0.65 }; // 35%-65% of max speed

        // Generate initial waypoints
        this.generateWaypoints();

        // Listen for damage events for smoke effects
        this.eventBus.on('plane.damage', (data) => {
            if (data.plane === this) {
                // Just update smoke effects, no evasion
                // Visual feedback only
            }
        });
    }

    /**
     * Generate three simple waypoints in a triangle pattern
     */
    generateWaypoints() {
        // Clear any existing waypoints
        this.waypoints = [];

        // Get a starting position
        const startPos = this.mesh.position.clone();

        // Calculate random altitude within our medium-high range
        const getRandomAltitude = () =>
            this.minAltitude + Math.random() * (this.maxAltitude - this.minAltitude);

        // Create three waypoints in a triangle pattern
        // This creates a simple patrol route without complex maneuvers

        // First waypoint - ahead and to the right
        const wp1 = new THREE.Vector3(
            startPos.x + 150 + Math.random() * 50,
            getRandomAltitude(),
            startPos.z + 150 + Math.random() * 50
        );

        // Second waypoint - ahead and to the left
        const wp2 = new THREE.Vector3(
            startPos.x - 150 - Math.random() * 50,
            getRandomAltitude(),
            startPos.z + 150 + Math.random() * 50
        );

        // Third waypoint - behind, completing the triangle
        const wp3 = new THREE.Vector3(
            startPos.x + Math.random() * 50 - 25, // Small random offset from start
            getRandomAltitude(),
            startPos.z - 150 - Math.random() * 50
        );

        // Add waypoints to the array
        this.waypoints.push(wp1, wp2, wp3);

        // Ensure all waypoints are within world bounds
        this.waypoints.forEach(wp => {
            wp.x = Math.max(this.worldBounds.minX, Math.min(this.worldBounds.maxX, wp.x));
            wp.y = Math.max(this.worldBounds.minY, Math.min(this.worldBounds.maxY, wp.y));
            wp.z = Math.max(this.worldBounds.minZ, Math.min(this.worldBounds.maxZ, wp.z));
        });
    }

    /**
     * Check if the current waypoint has been reached
     * @returns {boolean} True if the current waypoint is reached
     */
    reachedWaypoint() {
        if (this.waypoints.length === 0) return true;

        const currentWaypoint = this.waypoints[this.currentWaypointIndex];
        const distanceToWaypoint = this.mesh.position.distanceTo(currentWaypoint);
        return distanceToWaypoint < this.waypointReachedThreshold;
    }

    /**
     * Update the plane's flight behavior
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateFlight(deltaTime) {
        // Update human-like speed variations
        this.updateSpeed(deltaTime);

        // If we've reached the current waypoint, move to the next
        if (this.reachedWaypoint()) {
            this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;

            // Occasionally change speed when reaching a waypoint
            if (Math.random() < 0.4) { // 40% chance to change speed at waypoints
                this.currentSpeedTarget = this.getRandomSpeedInRange();
            }
        }

        // Ensure we have a valid waypoint
        if (this.waypoints.length > 0) {
            const currentWaypoint = this.waypoints[this.currentWaypointIndex];

            // Calculate direction to the current waypoint
            const directionToWaypoint = new THREE.Vector3()
                .subVectors(currentWaypoint, this.mesh.position)
                .normalize();

            // Small random deviation for more natural flight
            if (Math.random() < 0.05) { // Occasional small corrections
                const randomDeviation = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.03,
                    (Math.random() - 0.5) * 0.03,
                    (Math.random() - 0.5) * 0.03
                );
                directionToWaypoint.add(randomDeviation).normalize();
            }

            // Fly toward waypoint
            this.flyTowardDirection(directionToWaypoint, deltaTime);
        }
    }

    /**
     * Update speed with human-like variations
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateSpeed(deltaTime) {
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
        const humanJitter = () => (Math.random() - 0.5) * this.humanErrorFactor;

        // Calculate control inputs - gentler inputs for smoother flight
        const rollInput = -dotRight * this.bankFactor + humanJitter() * Math.abs(dotRight);
        const pitchInput = dotUp * this.turnSpeed + humanJitter() * Math.abs(dotUp);
        const yawInput = dotRight * this.turnSpeed * 0.3 + humanJitter() * 0.05;

        // Base throttle on current target speed
        const baseThrottle = Math.min(1.0, this.currentSpeedTarget + 0.05);
        const throttleInput = baseThrottle;

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

        // Make sure we're airborne when flying
        this.isAirborne = true;
    }

    /**
     * Update control surfaces based on flight behavior
     */
    updateControlSurfaces() {
        // Check if the control surfaces were correctly initialized
        if (!this.leftAileron || !this.rightAileron || !this.elevators || !this.rudder) {
            return; // Skip if parts aren't initialized yet
        }

        // Reset rotation of control surfaces
        this.leftAileron.rotation.x = 0;
        this.rightAileron.rotation.x = 0;
        this.elevators.rotation.x = 0;
        this.rudder.rotation.y = 0;

        // Get current angular velocity from recent rotations
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.mesh.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);

        // Calculate dot product with world up to determine bank angle
        const bankAngle = up.dot(new THREE.Vector3(0, 1, 0));

        // Apply aileron rotation based on bank angle
        const aileronRotation = (1 - bankAngle) * 0.5;
        this.leftAileron.rotation.x = -aileronRotation;
        this.rightAileron.rotation.x = aileronRotation;

        // Determine elevator position based on pitch
        const pitchAngle = forward.dot(new THREE.Vector3(0, 1, 0));
        this.elevators.rotation.x = -pitchAngle * 0.5;

        // Determine rudder position based on yaw movement
        const yawMovement = forward.dot(new THREE.Vector3(1, 0, 0));
        this.rudder.rotation.y = yawMovement * 0.5;
    }

    /**
     * Customize wing trails for enemy planes with a reddish tint
     */
    customizeWingTrails() {
        // Only customize once
        if (this.wingTrailsCustomized) return;

        // Check if wing trails are ready
        if (this.wingTrails && this.wingTrails.left && this.wingTrails.right) {
            // Use the default white color (same as player)
            // No need to set a custom color

            // Mark as customized
            this.wingTrailsCustomized = true;
        }
    }

    /**
     * Update the plane's behavior and state
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} inputState - Not used for AI planes
     * @param {THREE.Vector3} playerPosition - The player's position (not used for peaceful AI)
     */
    update(deltaTime, inputState, playerPosition) {
        // Handle free fall physics if the plane is destroyed
        if (this.isDestroyed && this.freeFall.active) {
            this.updateFreeFall(deltaTime);

            // Continue updating the explosion effects
            if (this.explosionFX) {
                this.explosionFX.update(deltaTime);
            }

            // Continue updating wing trails even in free fall
            if (this.wingTrails && this.wingTrails.left && this.wingTrails.right) {
                this.updateWingTrails(deltaTime);
            }

            return; // Skip normal update logic
        }

        // Keep customizing wing trails
        this.customizeWingTrails();

        // If this is a remote player in multiplayer, only update animation and visuals
        if (this.isRemotePlayer) {
            // Update propeller animation for visual feedback
            this.updatePropeller(deltaTime);

            // Animate control surfaces based on recent inputs
            this.updateControlSurfaces();

            // Always update wing trails for remote players
            if (this.wingTrails && this.wingTrails.left && this.wingTrails.right) {
                this.updateWingTrails(deltaTime);
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

            // Emit flight information updates
            this.emitFlightInfoUpdate();

            return; // Skip AI behavior for remote players
        }

        // Standard AI behavior for non-remote planes
        // Update flight behavior - simple waypoint navigation
        this.updateFlight(deltaTime);

        // Update propeller animation for visual feedback
        this.updatePropeller(deltaTime);

        // Animate control surfaces based on recent inputs
        this.updateControlSurfaces();

        // Update wing trails if enabled
        if (this.trailsEnabled && this.wingTrails && this.wingTrails.left && this.wingTrails.right) {
            this.updateWingTrails(deltaTime);
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

        // Emit flight information updates
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

        // Update hit effects during free-fall to ensure they animate out properly
        if (this.ammoSystem && this.ammoSystem.hitEffect) {
            this.ammoSystem.hitEffect.update(deltaTime);
        }
    }

    /**
     * Override emitFlightInfoUpdate to identify the source as 'enemy'
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
        }, 'enemy');
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
        this.freeFall.velocity.copy(forwardDirection.multiplyScalar(this.speed * 0.5));

        // Add random angular velocity for tumbling
        this.freeFall.angularVelocity.set(
            (Math.random() - 0.5) * 2,  // Random X rotation
            (Math.random() - 0.5) * 0.5, // Less Y rotation (yaw)
            (Math.random() - 0.5) * 3   // More Z rotation (roll)
        );

        // Activate free fall physics
        this.freeFall.active = true;

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

        // Set up timer to completely remove the plane after 10 seconds
        setTimeout(() => {
            this.removeFromScene();
        }, 10000);
    }

    /**
     * Remove the plane from the scene
     */
    removeFromScene() {
        // Skip if already removed
        if (!this.mesh) return;

        // Dispose any active effects
        if (this.smokeFX) {
            this.smokeFX.stopAndCleanup();
        }

        if (this.explosionFX) {
            this.explosionFX.stopAndCleanup();
        }

        // Clean up ammo system and associated hit effects
        if (this.ammoSystem) {
            // Stop and clean up hit effects first
            if (this.ammoSystem.hitEffect) {
                this.ammoSystem.hitEffect.stopAndCleanup();
            }

            // Then dispose of the full ammo system
            this.ammoSystem.dispose();
        }

        // Remove the mesh from the scene
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }

        // Notify about removal
        this.eventBus.emit('plane.removed', { id: this.id }, 'enemy');

        // Dispose resources
        this.dispose();
    }

    /**
     * Update wing trails
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updateWingTrails(deltaTime) {
        // Get speed as percentage (0-1)
        const speedFactor = this.speed / this.maxSpeed;

        // Make sure maxSpeed is properly initialized
        if (!this.maxSpeed || this.maxSpeed <= 0) {
            this.maxSpeed = 100; // Default max speed if not set properly
        }

        // Create wing trails if they don't exist yet
        if (!this.wingTrails || !this.wingTrails.left || !this.wingTrails.right) {
            console.log("Initializing missing wing trails for plane");
            // Default wing span for a WW2 fighter
            const wingSpan = 10;
            const wingHeight = 0;
            const wingZ = 0;
            this.initWingTrails(wingSpan, wingHeight, wingZ);
            this.customizeWingTrails();
        }

        // Initialize trailsEnabled if it's undefined
        if (this.trailsEnabled === undefined) {
            this.trailsEnabled = true;
        }

        // Only generate trails if:
        // 1. The plane is airborne
        // 2. Speed is at least 35% of max speed
        // 3. Trails are initialized and enabled
        if (!this.isAirborne || speedFactor < 0.35 || !this.wingTrails.left || !this.wingTrails.right || !this.trailsEnabled) {
            // If trails exist and we're below threshold speed, hide them
            if (this.wingTrails.left && this.wingTrails.right && speedFactor < 0.35) {
                this.wingTrails.left.mesh.visible = false;
                this.wingTrails.right.mesh.visible = false;
            }
            return;
        }

        // Special case for multiplayer - if this is a remote player, always show trails
        if (this.isRemotePlayer && (this.wingTrails.left && this.wingTrails.right)) {
            this.wingTrails.left.mesh.visible = true;
            this.wingTrails.right.mesh.visible = true;
        } else {
            // Standard case - make sure trails are visible based on trailsEnabled flag
            this.wingTrails.left.mesh.visible = this.trailsEnabled;
            this.wingTrails.right.mesh.visible = this.trailsEnabled;
        }

        // Calculate opacity based on speed
        const normalizedSpeedFactor = (speedFactor - 0.35) / 0.65; // 0 at 35% speed, 1 at 100% speed
        const opacity = normalizedSpeedFactor * 0.5; // 0.5 max opacity

        // Calculate width based on speed
        const width = this.trailBaseWidth + (speedFactor * 0.2); // Width increases slightly with speed

        // Get camera position for trail orientation
        const cameraPosition = new THREE.Vector3();

        // Try to find camera in scene
        let cameraFound = false;
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.isCamera && !cameraFound) {
                    cameraPosition.copy(object.position);
                    cameraFound = true;
                }
            });
        }

        // Update left and right trails
        this.updateSingleTrail('left', opacity, speedFactor, width, cameraPosition);
        this.updateSingleTrail('right', opacity, speedFactor, width, cameraPosition);

        // Update last positions
        if (!this.wingTrails.left.lastPos) {
            this.wingTrails.left.lastPos = new THREE.Vector3();
        }
        if (!this.wingTrails.right.lastPos) {
            this.wingTrails.right.lastPos = new THREE.Vector3();
        }

        this.wingTrails.left.lastPos.copy(this.getWingTipPosition('left'));
        this.wingTrails.right.lastPos.copy(this.getWingTipPosition('right'));
    }
} 