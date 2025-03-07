// SmokeFX for damaged planes with low health
import * as THREE from 'three';

export default class SmokeFX {
    constructor(scene) {
        this.scene = scene;

        // Smoke system configuration
        this.maxParticles = 50;
        this.emissionRate = 0.2; // Increased from 0.1 for more particles per frame
        this.particleLifetime = 2000; // ms
        this.spawnTimer = 0;

        // Size parameters
        this.minSize = 0.6;
        this.maxSize = 1.8;

        // Color parameters
        this.smokeColor = new THREE.Color(0x222222);

        // Storage for active particles
        this.particles = [];
        this.particlePool = [];

        // Create material for particles
        this.createMaterial();

        // Initialize particle pool
        this.initParticlePool();
    }

    /**
     * Create material for smoke particles
     */
    createMaterial() {
        // Create a material for smoke particles
        this.smokeMaterial = new THREE.MeshBasicMaterial({
            color: this.smokeColor,
            transparent: true,
            opacity: 0.6,
            depthWrite: false, // Don't occlude other objects
            blending: THREE.NormalBlending
        });
    }

    /**
     * Initialize pool of smoke particles
     */
    initParticlePool() {
        // Create a low-poly sphere for particles
        const smokeGeometry = new THREE.IcosahedronGeometry(1, 0); // Low-poly with 0 subdivisions

        // Create pool of particles
        for (let i = 0; i < this.maxParticles; i++) {
            // Create mesh
            const particle = new THREE.Mesh(smokeGeometry, this.smokeMaterial.clone());
            particle.visible = false;
            this.scene.add(particle);

            // Add to pool
            this.particlePool.push({
                mesh: particle,
                active: false,
                creationTime: 0,
                velocity: new THREE.Vector3(),
                size: 1,
                opacity: 0.6,
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01
                )
            });
        }
    }

    /**
     * Emit smoke from a damaged plane
     * @param {Object} plane - The plane emitting smoke
     * @param {number} healthPercent - Health percentage (0-1)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    emitSmoke(plane, healthPercent, deltaTime) {
        // Only emit smoke when health is low (below 50%)
        if (healthPercent >= 0.5) return;

        // Calculate emission rate based on health percentage
        // Lower health = more smoke, scaling from 50% health to 0%
        const emissionFactor = Math.max(0, 0.5 - healthPercent) / 0.5;

        // Add to spawn timer - higher emission rate as health decreases
        this.spawnTimer += deltaTime * this.emissionRate * emissionFactor * 60;

        // Spawn new particles based on timer
        while (this.spawnTimer >= 1) {
            this.spawnTimer -= 1;
            this.spawnParticle(plane, healthPercent);
        }
    }

    /**
     * Spawn a single smoke particle
     * @param {Object} plane - The plane emitting smoke
     * @param {number} healthPercent - Health percentage (0-1)
     */
    spawnParticle(plane, healthPercent) {
        // Find an inactive particle
        const particle = this.particlePool.find(p => !p.active);
        if (!particle) return;

        // Engine position (slightly behind and below the plane)
        const planePosition = plane.mesh.position.clone();
        const planeQuaternion = plane.mesh.quaternion.clone();

        // Create offset vector (slightly behind and below center)
        const offset = new THREE.Vector3(0, -1, 2);

        // Apply plane's rotation to the offset
        offset.applyQuaternion(planeQuaternion);

        // Apply offset to get emission point
        const emissionPoint = planePosition.clone().add(offset);

        // Activate the particle
        particle.active = true;
        particle.creationTime = performance.now();
        particle.mesh.visible = true;
        particle.mesh.position.copy(emissionPoint);

        // Set random size for variation (health also affects size - lower health = bigger smoke)
        const sizeVariation = this.minSize + (this.maxSize - this.minSize) * Math.random();
        const healthFactor = Math.max(0, 0.5 - healthPercent) / 0.5;
        particle.size = sizeVariation * (1 + healthFactor);
        particle.mesh.scale.set(particle.size, particle.size, particle.size);

        // Set opacity (health affects opacity - lower health = more opaque smoke)
        particle.opacity = (0.3 + Math.random() * 0.3) * (1 + healthFactor * 0.5);
        particle.mesh.material.opacity = particle.opacity;

        // Set initial color (darker for lower health)
        const colorIntensity = 0.15 + 0.1 * healthPercent;
        particle.mesh.material.color.setRGB(colorIntensity, colorIntensity, colorIntensity);

        // Set velocity
        // Slightly influenced by plane's forward direction plus random factor
        const planeVelocity = new THREE.Vector3(0, 0, -1).applyQuaternion(planeQuaternion);

        // Combine plane velocity with upward drift and randomness
        particle.velocity.set(
            (Math.random() - 0.5) * 2,     // Random X
            0.5 + Math.random() * 0.5,     // Upward plus random
            (Math.random() - 0.5) * 2      // Random Z
        );

        // Add to the plane's direction vector (slightly)
        particle.velocity.addScaledVector(planeVelocity, 0.5);

        // Scale the velocity (slower for larger particles)
        const velocityScale = 0.8 + (1 - (particle.size - this.minSize) / (this.maxSize - this.minSize)) * 1.2;
        particle.velocity.multiplyScalar(velocityScale);

        // Add to active particles list
        this.particles.push(particle);
    }

    /**
     * Update all active smoke particles
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        const now = performance.now();
        const toRemove = [];

        // Update each particle
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const age = now - particle.creationTime;

            // Check if lifetime is over
            if (age > this.particleLifetime) {
                toRemove.push(i);
                continue;
            }

            // Calculate how far through lifetime (0-1)
            const progress = age / this.particleLifetime;

            // Move particle based on velocity
            particle.mesh.position.addScaledVector(particle.velocity, deltaTime);

            // Grow particle over time
            const growFactor = 1 + progress * 1.5;
            particle.mesh.scale.set(
                particle.size * growFactor,
                particle.size * growFactor,
                particle.size * growFactor
            );

            // Fade out particle
            particle.mesh.material.opacity = particle.opacity * (1 - progress);

            // Apply rotation for tumbling effect
            particle.mesh.rotation.x += particle.rotationSpeed.x;
            particle.mesh.rotation.y += particle.rotationSpeed.y;
            particle.mesh.rotation.z += particle.rotationSpeed.z;
        }

        // Remove expired particles
        for (let i = toRemove.length - 1; i >= 0; i--) {
            const index = toRemove[i];
            const particle = this.particles[index];

            // Deactivate
            particle.active = false;
            particle.mesh.visible = false;

            // Remove from active list
            this.particles.splice(index, 1);
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Remove all particles from scene
        for (const particle of this.particlePool) {
            this.scene.remove(particle.mesh);
            particle.mesh.geometry.dispose();
            particle.mesh.material.dispose();
        }

        this.particles = [];
        this.particlePool = [];
    }

    /**
     * Stop smoke emission and clean up existing particles
     * Makes existing particles fade out faster
     */
    stopAndCleanup() {
        // Accelerate the fade-out of existing particles
        for (const particle of this.particles) {
            // Get the current age
            const age = performance.now() - particle.creationTime;

            // If the particle is very new, make it disappear quickly
            if (age < 100) {
                particle.mesh.material.opacity = 0.1;
            }

            // Shorten the lifetime of existing particles to make them disappear faster
            const remainingTime = this.particleLifetime - age;
            particle.creationTime = performance.now() - (this.particleLifetime - Math.min(remainingTime, 500));
        }
    }

    /**
     * Clear all particles immediately
     * Used when completely removing a plane from the scene
     */
    clearAllParticles() {
        // Deactivate all particles
        for (const particle of this.particles) {
            particle.active = false;
            particle.mesh.visible = false;
        }

        // Clear the active particles array
        this.particles = [];

        // Reset spawn timer
        this.spawnTimer = 0;
    }
} 