// Ammo System for handling bullets
import * as THREE from 'three';

export default class AmmoSystem {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;

        // Bullet properties
        this.bulletSpeed = 1000.0; // Increased from 10.0 to 80.0 for much faster "laser-like" bullets
        this.bulletLifetime = 2000; // ms
        this.bulletSize = 0.08;
        this.fireCooldown = 80; // ms between shots (5x faster than original 80ms)
        this.lastFireTime = 0;

        // Store active bullets
        this.bullets = [];

        // Create bullet material and geometry (reused for performance)
        // Create a more elongated, laser-like appearance
        this.bulletGeometry = new THREE.CylinderGeometry(0.16, 0.16, 1.7, 18);
        // Fix orientation: rotate around Z-axis instead of X-axis to align with forward direction
        this.bulletGeometry.rotateZ(Math.PI / 2);
        this.bulletGeometry.rotateY(Math.PI / 2);

        // Create a glowing material for the bullets
        this.bulletMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.9,
            emissive: 0xFFFF00,
            emissiveIntensity: 2
        });

        // Optional: Create a secondary glow effect
        this.bulletGlowGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8);
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
     * Fire bullets from both wings
     * @param {THREE.Object3D} plane - The plane mesh
     * @param {THREE.Vector3} planeVelocity - The plane's velocity vector
     */
    fireBullets(plane, planeVelocity) {
        const now = performance.now();

        // Check cooldown
        if (now - this.lastFireTime < this.fireCooldown) {
            return;
        }

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

        // Get bullet direction (forward vector of plane)
        const bulletDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuat).normalize();

        // Forward offset - move spawn point ahead of the wing
        const forwardOffset = 3.0; // Units in front of the wing tips

        // Apply forward offset to spawn positions
        leftWingPos.addScaledVector(bulletDirection, forwardOffset);
        rightWingPos.addScaledVector(bulletDirection, forwardOffset);

        // Create bullets at wing positions
        this.createBullet(leftWingPos, bulletDirection, planeVelocity);
        this.createBullet(rightWingPos, bulletDirection, planeVelocity);

        // Play sound effect with debugging
        if (this.debugSound) {
            console.log('Attempting to play gunfire sound');
        }
        this.eventBus.emit('sound.play', { sound: 'gunfire' });
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
        bullet.velocity.copy(direction).multiplyScalar(this.bulletSpeed);

        // Add plane velocity if provided
        if (planeVelocity) {
            bullet.velocity.add(planeVelocity);
        }

        // Add to active bullets
        this.bullets.push(bullet);
    }

    /**
     * Update all active bullets
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        const now = performance.now();
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

        this.bulletPool = [];
        this.bullets = [];
    }
} 