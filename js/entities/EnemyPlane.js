// Enemy Plane class extending WW2Plane with AI capabilities
import * as THREE from 'three';
import WW2Plane from './WW2Plane.js';

export default class EnemyPlane extends WW2Plane {
    constructor(scene, eventBus) {
        super(scene, eventBus);

        // AI state properties
        this.aiState = 'IDLE'; // Current AI state: 'IDLE', 'CHASE', or 'ATTACK'
        this.detectionRange = 150; // Range at which enemy detects player
        this.attackRange = 80; // Range at which enemy can attack
        this.aimTolerance = 0.85; // How accurate aim needs to be to fire (dot product threshold)

        // Initialize velocity vector
        this.velocity = new THREE.Vector3();

        // Always start as airborne (enemies spawn in the air)
        this.isAirborne = true;
        this.speed = this.maxSpeed * 0.55; // Start at 70% speed

        // Track if we've already customized the wing trails
        this.wingTrailsCustomized = false;

        // Waypoint system for IDLE state
        this.waypointQueue = []; // Queue of waypoints to follow
        this.minWaypoints = 3; // Minimum number of waypoints to have in queue
        this.maxWaypoints = 5; // Maximum number of waypoints to keep in queue
        this.waypointReachedThreshold = 20; // How close the plane needs to get to a waypoint (increased from 15)
        this.idleSpeed = 0.65; // Speed during IDLE mode (increased from 0.55)
        this.idleAltitudeMin = 120; // Minimum altitude for idle flight (increased from 60)
        this.idleAltitudeMax = 320; // Maximum altitude for idle flight (increased from 200)
        this.idleAreaSize = 800; // Size of the patrol area (increased from 300)
        this.waypointChangeInterval = 5; // Force waypoint change every X seconds (increased from 3)
        this.lastWaypointChangeTime = 0;

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

            // Fly toward waypoint
            this.flyTowardDirection(directionToWaypoint, deltaTime);
        } else {
            // If no waypoints, generate a new path
            this.generateInitialPath();
        }
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
        const humanJitter = () => (Math.random() - 0.5) * 0.15; // +/- 0.075 input variation

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
        const baseThrottle = Math.min(1.0, this.idleSpeed + Math.max(0, 0.1 - Math.abs(dotForward - 1) * 0.2));
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
        // We don't use inputState for AI control, so we don't need to create a dummy one
        // The parent class methods that need inputState are overridden in this class

        // Customize wing trails if not already done
        this.customizeWingTrails();

        // Update based on current AI state
        switch (this.aiState) {
            case 'IDLE':
                this.updateIdleState(deltaTime);
                break;
            case 'CHASE':
                // Will be implemented in Phase 3
                this.updateIdleState(deltaTime); // Fallback to IDLE behavior for now
                break;
            case 'ATTACK':
                // Will be implemented in Phase 4
                this.updateIdleState(deltaTime); // Fallback to IDLE behavior for now
                break;
        }

        // Apply gravity if airborne
        if (this.isAirborne) {
            this.applyGravity(deltaTime);
        } else {
            // Keep the plane on the ground when not airborne
            if (this.mesh.position.y > this.groundHeight) {
                this.mesh.position.y = Math.max(this.groundHeight, this.mesh.position.y - 0.1 * deltaTime * 60);
            }
        }

        // Update propeller animation
        this.updatePropeller(deltaTime);

        // Update control surfaces - we use our custom implementation that doesn't need inputState
        this.updateControlSurfaces();

        // Update wing trails
        this.updateWingTrails(deltaTime);

        // Update ammo system - Important for multiplayer bullets to move!
        if (this.ammoSystem) {
            this.ammoSystem.update(deltaTime);
        }

        // Emit flight info update event (engine sound, HUD, etc.)
        this.emitFlightInfoUpdate();
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
} 