// Ammo System for handling bullets
import * as THREE from 'three';
import HitEffect from '../effects/HitEffect.js';

export default class AmmoSystem {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;

        // Bullet properties
        this.bulletSpeed = 1500.0; // Increased from 1000.0 for even faster bullets
        this.bulletLifetime = 200; // Reduced from 2000ms to 750 for shorter lifetime
        this.bulletSize = 0.08;
        this.fireCooldown = 80; // ms between shots (5x faster than original 80ms)
        this.lastFireTime = 0;
        this.bulletDamage = 10; // Damage amount per bullet hit

        // Heat system properties
        this.heat = 0;
        this.maxHeat = 100;
        this.heatPerShot = 4;
        this.coolingRate = 60; // Units per second
        this.isOverheated = false;
        this.overheatCooldownTime = 4000; // ms to cool down from overheat
        this.overheatStartTime = 0;

        // Flag to control sound effects (enabled by default for player's bullets)
        this.playSoundEffects = true;

        // Store active bullets
        this.bullets = [];

        // Collision detection properties
        this.collisionRadius = 8.0; // Changed from 12.0 to 8.0 for a more balanced hitbox
        this.showHitboxes = false; // Toggle for debugging hitboxes

        // Reference to planes for collision detection
        this.planes = [];

        // Reference to the protection zone
        this.protectionZone = null;

        // Collection of hitbox visualizers (for debugging)
        this.hitboxVisualizers = {};

        // Initialize hit effect system with eventBus
        this.hitEffect = new HitEffect(scene, eventBus);

        // Create bullet material and geometry (reused for performance)
        // Create a more elongated, laser-like appearance
        this.bulletGeometry = new THREE.CylinderGeometry(0.20, 0.20, 2.0, 18);
        // Fix orientation: rotate around Z-axis instead of X-axis to align with forward direction
        this.bulletGeometry.rotateZ(Math.PI / 2);
        this.bulletGeometry.rotateY(Math.PI / 2);

        // Create a glowing material for the bullets
        this.bulletMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 1.0,
            emissive: 0xFFFF00,
            emissiveIntensity: 3
        });

        // Optional: Create a secondary glow effect
        this.bulletGlowGeometry = new THREE.CylinderGeometry(0.10, 0.10, 0.8, 8);
        this.bulletGlowGeometry.rotateZ(Math.PI / 2); // Fix orientation here too
        this.bulletGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFAA00, // Slightly orange/yellow
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending // Additive blending for glow effect
        });

        // Bullet system
        this.bulletPool = [];
        this.bulletGlowPool = [];
        this.maxBullets = 200; // Increased due to faster firing rate

        // Initialize bullet pool
        this.initBulletPool();

        // Debug flag for sound issues
        this.debugSound = false; // Turn off debug messages for production

        // Set up event listeners for heat system
        this.setupHeatEventListeners();
    }

    /**
     * Set up event listeners for the heat system
     */
    setupHeatEventListeners() {
        // Emit initial heat state
        this.eventBus.emit('weapon.heat', {
            heat: this.heat,
            maxHeat: this.maxHeat
        });
    }

    /**
     * Initialize a pool of bullet objects for reuse
     */
    initBulletPool() {
        for (let i = 0; i < this.maxBullets; i++) {
            // Create main bullet
            const bullet = new THREE.Mesh(this.bulletGeometry, this.bulletMaterial);
            bullet.visible = false;
            this.scene.add(bullet);

            // Create optional glow effect
            const glow = new THREE.Mesh(this.bulletGlowGeometry, this.bulletGlowMaterial);
            glow.visible = false;
            this.scene.add(glow);

            this.bulletPool.push({
                mesh: bullet,
                glowMesh: glow,
                active: false,
                velocity: new THREE.Vector3(),
                creationTime: 0
            });
        }
    }

    /**
     * Set planes array for collision detection
     * @param {Array} planes - Array of planes to check for collisions
     */
    setPlanes(planes) {
        this.planes = planes;

        // Create hitbox visualizers for all planes
        for (const plane of planes) {
            this.createHitboxVisualizer(plane);
        }
    }

    /**
     * Add a plane to collision detection
     * @param {Plane} plane - Plane to add to collision detection
     */
    addPlane(plane) {
        if (!this.planes.includes(plane)) {
            this.planes.push(plane);
            this.createHitboxVisualizer(plane);
        }
    }

    /**
     * Remove a plane from collision detection
     * @param {Plane} plane - Plane to remove from collision detection
     */
    removePlane(plane) {
        const index = this.planes.indexOf(plane);
        if (index !== -1) {
            this.planes.splice(index, 1);
        }
    }

    /**
     * Set the protection zone reference
     * @param {ProtectionZone} protectionZone - The protection zone
     */
    setProtectionZone(protectionZone) {
        this.protectionZone = protectionZone;
    }

    /**
     * Check for collisions between bullets and planes
     * @returns {Array} - Array of collision objects
     */
    checkCollisions() {
        const collisions = [];
        const toRemove = [];

        // Skip if no planes to check
        if (!this.planes || this.planes.length === 0) {
            return collisions;
        }

        // Check each bullet against each plane
        for (let i = 0; i < this.bullets.length; i++) {
            const bullet = this.bullets[i];

            // Skip inactive bullets
            if (!bullet.active) continue;

            // Store bullet origin plane for excluding self-collisions
            const bulletSourcePlane = bullet.sourcePlane;

            // Check if bullet is in protection zone
            const isBulletInProtectionZone = this.protectionZone &&
                this.protectionZone.isInProtectionZone(bullet.mesh.position);

            for (const plane of this.planes) {
                // Skip if plane is destroyed
                if (!plane.isAlive()) continue;

                // Skip if bullet belongs to this plane (prevent shooting yourself)
                if (bulletSourcePlane === plane) continue;

                // Check if plane is in protection zone
                const isPlaneInProtectionZone = this.protectionZone &&
                    this.protectionZone.isInProtectionZone(plane.mesh.position);

                // Skip collision if either the bullet or the plane is in the protection zone
                if (isBulletInProtectionZone || isPlaneInProtectionZone) {
                    // If bullet is in protection zone, we might want to remove it visually
                    if (isBulletInProtectionZone) {
                        toRemove.push(i);
                    }
                    continue;
                }

                // Get plane position (assume plane mesh has position property)
                const planePosition = plane.mesh.position;

                // Simple distance-based collision detection
                const distance = bullet.mesh.position.distanceTo(planePosition);

                if (distance < this.collisionRadius) {
                    // Get collision position (exact bullet position for better visuals)
                    const collisionPosition = bullet.mesh.position.clone();

                    // Log collision
                    console.log(`Bullet collision detected! Distance: ${distance.toFixed(2)}, Threshold: ${this.collisionRadius}`);
                    console.log(`Collision position: ${collisionPosition.x.toFixed(2)}, ${collisionPosition.y.toFixed(2)}, ${collisionPosition.z.toFixed(2)}`);
                    console.log(`Plane is local player: ${plane === this.eventBus.playerPlane}`);

                    // Collision detected
                    collisions.push({
                        bullet: bullet,
                        plane: plane,
                        position: collisionPosition
                    });

                    // Create hit effect at collision position
                    this.hitEffect.triggerEffect(collisionPosition);

                    // Apply damage to the plane with impact position
                    plane.damage(this.bulletDamage, collisionPosition);

                    // Play hit sound
                    this.eventBus.emit('sound.play', { sound: 'hit' });

                    // Mark bullet for removal
                    toRemove.push(i);

                    // Break inner loop as this bullet has hit something
                    break;
                }
            }
        }

        // Log collision count for debugging
        if (collisions.length > 0) {
            console.log(`Found ${collisions.length} collisions this frame`);
        }

        // Remove bullets that hit something (in reverse order to avoid index issues)
        for (let i = toRemove.length - 1; i >= 0; i--) {
            const index = toRemove[i];
            const bullet = this.bullets[index];

            // Deactivate the bullet and its glow
            bullet.active = false;
            bullet.mesh.visible = false;
            bullet.glowMesh.visible = false;

            // Remove from active bullets array
            this.bullets.splice(index, 1);

            // MEMORY LEAK FIX: Return to pool instead of leaving in limbo
            if (!this.bulletPool.includes(bullet)) {
                this.bulletPool.push(bullet);
            }
        }

        return collisions;
    }

    /**
     * Fire bullets from both wings
     * @param {THREE.Object3D} plane - The plane mesh
     * @param {THREE.Vector3} planeVelocity - The plane's velocity vector
     */
    fireBullets(plane, planeVelocity) {
        const now = performance.now();

        // Check cooldown and overheat state
        if (now - this.lastFireTime < this.fireCooldown || this.isOverheated) {
            return;
        }

        // Add heat when firing
        this.heat = Math.min(this.maxHeat, this.heat + this.heatPerShot);

        // Check for overheat
        if (this.heat >= this.maxHeat && !this.isOverheated) {
            this.isOverheated = true;
            this.overheatStartTime = now;
            this.eventBus.emit('weapon.overheat');
            this.eventBus.emit('sound.play', { sound: 'overheat' });
            return;
        }

        // Emit current heat level
        this.eventBus.emit('weapon.heat', {
            heat: this.heat,
            maxHeat: this.maxHeat
        });

        this.lastFireTime = now;

        // Get wing positions (left and right wing tips)
        const leftWingPos = new THREE.Vector3();
        const rightWingPos = new THREE.Vector3();

        // Get the plane's world position and orientation
        const planePos = new THREE.Vector3();
        const planeQuat = new THREE.Quaternion();
        const planeScale = new THREE.Vector3();

        plane.matrixWorld.decompose(planePos, planeQuat, planeScale);

        // Calculate wing positions based on wingspan
        const wingOffset = 5; // Half of wingspan

        // Wing positions in local space
        const leftWingLocal = new THREE.Vector3(-wingOffset, 0, 0);
        const rightWingLocal = new THREE.Vector3(wingOffset, 0, 0);

        // Convert to world space
        leftWingLocal.applyQuaternion(planeQuat);
        rightWingLocal.applyQuaternion(planeQuat);

        leftWingPos.addVectors(planePos, leftWingLocal);
        rightWingPos.addVectors(planePos, rightWingLocal);

        // Get central forward direction (for convergence focal point)
        const centerDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat).normalize();

        // Forward offset - move spawn point ahead of the wing
        const forwardOffset = 3.0; // Units in front of the wing tips

        // Apply forward offset to spawn positions
        leftWingPos.addScaledVector(centerDirection, forwardOffset);
        rightWingPos.addScaledVector(centerDirection, forwardOffset);

        // Convergence distance - where bullets will meet
        const convergenceDistance = 300; // Increased from 100 to 300 units for a much farther convergence point

        // Calculate focal point where bullets should converge
        const focalPoint = planePos.clone().addScaledVector(centerDirection, convergenceDistance);

        // Calculate direction vectors from wing positions to focal point
        const leftBulletDirection = focalPoint.clone().sub(leftWingPos).normalize();
        const rightBulletDirection = focalPoint.clone().sub(rightWingPos).normalize();

        // Create bullets at wing positions with converging directions
        this.createBullet(leftWingPos, leftBulletDirection, planeVelocity);
        this.createBullet(rightWingPos, rightBulletDirection, planeVelocity);

        // Play sound effect only if enabled
        if (this.playSoundEffects) {
            if (this.debugSound) {
                console.log('Attempting to play gunfire sound');
            }

            // Use the actual firing position for positional audio (average of the two wing positions)
            const firingPosition = new THREE.Vector3();
            firingPosition.addVectors(leftWingPos, rightWingPos).multiplyScalar(0.5);

            // Local player gunfire is always at full volume
            this.eventBus.emit('sound.play', {
                sound: 'gunfire',
                volumeFactor: 1.0,  // Full volume for local player
                distance: 0,        // Zero distance (we're the source)
                position: firingPosition, // Use the actual firing position
                planeId: 'local-player' // Identify as local player
            });
        }
    }

    /**
     * Create a single bullet from the pool
     * @param {THREE.Vector3} position - Starting position
     * @param {THREE.Vector3} direction - Direction to travel
     * @param {THREE.Vector3} planeVelocity - The plane's velocity to add to bullets
     */
    createBullet(position, direction, planeVelocity) {
        // Find an inactive bullet in the pool
        const bullet = this.bulletPool.find(b => !b.active);

        if (!bullet) {
            console.warn('Bullet pool exhausted');
            return;
        }

        // Activate the bullet
        bullet.active = true;
        bullet.creationTime = performance.now();

        // Store reference to source plane for collision detection
        // This assumes the plane mesh was passed to fireBullets
        bullet.sourcePlane = this.currentSourcePlane;

        // Set main bullet
        bullet.mesh.visible = true;
        bullet.mesh.position.copy(position);

        // Fixed orientation: align bullet with direction of travel
        const bulletUpVector = new THREE.Vector3(0, 0, 1); // Use forward vector
        bullet.mesh.quaternion.setFromUnitVectors(
            bulletUpVector,
            direction
        );

        // Set glow effect
        bullet.glowMesh.visible = true;
        bullet.glowMesh.position.copy(position);
        bullet.glowMesh.quaternion.copy(bullet.mesh.quaternion);

        // Set velocity: direction * speed + plane velocity
        bullet.velocity = direction.clone().multiplyScalar(this.bulletSpeed);

        // Add plane velocity if provided and valid
        if (planeVelocity &&
            !isNaN(planeVelocity.x) &&
            !isNaN(planeVelocity.y) &&
            !isNaN(planeVelocity.z)) {
            bullet.velocity.add(planeVelocity);
        }

        // Log velocity for debugging (in case of remote bullets)
        if (this.currentSourcePlane && this.currentSourcePlane.isRemotePlayer) {
            console.log('Remote bullet velocity:', bullet.velocity);
        }

        // Add to active bullets
        this.bullets.push(bullet);
    }

    /**
     * Update all active bullets and heat system
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        const now = performance.now();

        // Update heat system
        if (this.isOverheated) {
            // Check if cooldown period is over
            if (now - this.overheatStartTime >= this.overheatCooldownTime) {
                this.isOverheated = false;
                this.heat = 0;
                this.eventBus.emit('weapon.cooled');
                this.eventBus.emit('weapon.heat', {
                    heat: this.heat,
                    maxHeat: this.maxHeat
                });
            }
        } else {
            // Cool down weapon when not firing
            if (now - this.lastFireTime > this.fireCooldown) {
                this.heat = Math.max(0, this.heat - this.coolingRate * deltaTime);
                this.eventBus.emit('weapon.heat', {
                    heat: this.heat,
                    maxHeat: this.maxHeat
                });
            }
        }

        const toRemove = [];

        // Update each bullet
        for (let i = 0; i < this.bullets.length; i++) {
            const bullet = this.bullets[i];

            // Move bullet and its glow
            bullet.mesh.position.addScaledVector(bullet.velocity, deltaTime);
            bullet.glowMesh.position.copy(bullet.mesh.position);

            // Optional: Add trail effect by scaling the glow based on velocity
            // Calculate bullet speed
            const speed = bullet.velocity.length();
            // Scale the glow length based on speed
            bullet.glowMesh.scale.z = 1.0 + speed * 0.05;

            // Check if bullet lifetime is over
            if (now - bullet.creationTime > this.bulletLifetime) {
                toRemove.push(i);
            }
        }

        // Check for collisions with planes
        this.checkCollisions();

        // Update hit effects
        this.hitEffect.update(deltaTime);

        // Update hitbox visualizers
        this.updateHitboxVisualizers();

        // Remove expired bullets (in reverse order to avoid index issues)
        for (let i = toRemove.length - 1; i >= 0; i--) {
            const index = toRemove[i];
            const bullet = this.bullets[index];

            // Deactivate the bullet and its glow
            bullet.active = false;
            bullet.mesh.visible = false;
            bullet.glowMesh.visible = false;

            // Remove from active bullets array
            this.bullets.splice(index, 1);

            // MEMORY LEAK FIX: Return to pool instead of leaving in limbo
            if (!this.bulletPool.includes(bullet)) {
                this.bulletPool.push(bullet);
            }
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Remove all bullets from scene
        for (const bullet of this.bulletPool) {
            this.scene.remove(bullet.mesh);
            this.scene.remove(bullet.glowMesh);
        }

        // Dispose of geometries and materials
        this.bulletGeometry.dispose();
        this.bulletMaterial.dispose();
        this.bulletGlowGeometry.dispose();
        this.bulletGlowMaterial.dispose();

        // Dispose of hitbox visualizers
        for (const planeId in this.hitboxVisualizers) {
            const visualizer = this.hitboxVisualizers[planeId];
            if (visualizer.mesh) {
                this.scene.remove(visualizer.mesh);
                visualizer.mesh.geometry.dispose();
                visualizer.mesh.material.dispose();
            }
        }
        this.hitboxVisualizers = {};

        // First immediately stop and clean up all hit effects
        if (this.hitEffect) {
            this.hitEffect.stopAndCleanup();
            // Then dispose of hit effect system
            this.hitEffect.dispose();
        }

        this.bulletPool = [];
        this.bullets = [];
    }

    /**
     * Create a hitbox visualizer for a plane
     * @param {Object} plane - The plane to create a hitbox for
     */
    createHitboxVisualizer(plane) {
        // Create a low-poly sphere as the hitbox visualizer
        const geometry = new THREE.IcosahedronGeometry(this.collisionRadius, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });

        const hitboxMesh = new THREE.Mesh(geometry, material);
        hitboxMesh.visible = this.showHitboxes;
        this.scene.add(hitboxMesh);

        // Store the visualizer with the plane ID as the key
        const planeId = plane.id || Math.random().toString(36).substr(2, 9);
        this.hitboxVisualizers[planeId] = {
            mesh: hitboxMesh,
            plane: plane
        };

        return hitboxMesh;
    }

    /**
     * Update the positions of all hitbox visualizers
     */
    updateHitboxVisualizers() {
        if (!this.showHitboxes) return;

        for (const planeId in this.hitboxVisualizers) {
            const visualizer = this.hitboxVisualizers[planeId];
            if (visualizer.plane && visualizer.plane.mesh) {
                visualizer.mesh.position.copy(visualizer.plane.mesh.position);
            }
        }
    }

    /**
     * Toggle the visibility of hitbox visualizers
     * @param {boolean} show - Whether to show or hide the hitboxes
     */
    toggleHitboxes(show) {
        this.showHitboxes = show !== undefined ? show : !this.showHitboxes;

        for (const planeId in this.hitboxVisualizers) {
            const visualizer = this.hitboxVisualizers[planeId];
            if (visualizer.mesh) {
                visualizer.mesh.visible = this.showHitboxes;
            }
        }
    }
} 