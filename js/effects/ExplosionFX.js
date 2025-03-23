// ExplosionFX for plane destruction
import * as THREE from 'three';

export default class ExplosionFX {
    constructor(scene) {
        this.scene = scene;

        // Explosion parameters
        this.lifetime = 2000; // ms
        this.baseSize = 7.0; // Large size for dramatic effect

        // Create materials for the explosion effect
        this.createMaterials();

        // Active explosions
        this.activeExplosions = [];
    }

    /**
     * Create materials for explosion effects
     */
    createMaterials() {
        // Create a bright core material
        this.coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFAA, // Bright yellow-white
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        // Create a fiery blast material
        this.blastMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF5500, // Orange-red
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        // Create a smoke ring material
        this.smokeMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222, // Dark gray
            transparent: true,
            opacity: 0.6,
            blending: THREE.NormalBlending,
            depthWrite: false
        });
    }

    /**
     * Create a complete explosion effect at the specified position
     * @param {THREE.Vector3} position - Position for the explosion
     */
    createExplosion(position) {
        // Create a group to hold all parts of the explosion
        const group = new THREE.Group();
        group.position.copy(position);
        this.scene.add(group);

        // Create core flash sphere
        const coreGeometry = new THREE.SphereGeometry(this.baseSize * 0.5, 12, 12);
        const core = new THREE.Mesh(coreGeometry, this.coreMaterial.clone());
        group.add(core);

        // Create blast wave sphere
        const blastGeometry = new THREE.SphereGeometry(this.baseSize * 0.8, 16, 16);
        const blast = new THREE.Mesh(blastGeometry, this.blastMaterial.clone());
        group.add(blast);

        // Create smoke ring (torus)
        const smokeRingGeometry = new THREE.TorusGeometry(this.baseSize * 0.7, this.baseSize * 0.3, 12, 24);
        const smokeRing = new THREE.Mesh(smokeRingGeometry, this.smokeMaterial.clone());
        smokeRing.rotation.x = Math.PI / 2; // Orient the ring 
        group.add(smokeRing);

        // Create debris particles
        const debrisCount = 30;
        const debris = [];

        for (let i = 0; i < debrisCount; i++) {
            // Create a small icosahedron for each debris piece
            const debrisGeometry = new THREE.IcosahedronGeometry(
                this.baseSize * 0.1 * (0.5 + Math.random() * 0.5), // Random sizing
                0 // Low poly
            );

            // Randomize debris color (orange to black)
            const colorFactor = Math.random();
            const color = new THREE.Color(
                0.8 * colorFactor,
                0.3 * colorFactor,
                0.0
            );

            const debrisMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });

            const debrisPiece = new THREE.Mesh(debrisGeometry, debrisMaterial);

            // Random starting position (slightly offset from center)
            debrisPiece.position.set(
                (Math.random() - 0.5) * this.baseSize * 0.3,
                (Math.random() - 0.5) * this.baseSize * 0.3,
                (Math.random() - 0.5) * this.baseSize * 0.3
            );

            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );

            // Add to debris array with velocity
            debris.push({
                mesh: debrisPiece,
                velocity: velocity,
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2
                )
            });

            group.add(debrisPiece);
        }

        // Create and store the explosion with its start time
        const explosion = {
            group: group,
            core: core,
            blast: blast,
            smokeRing: smokeRing,
            debris: debris,
            startTime: performance.now()
        };

        this.activeExplosions.push(explosion);

        return explosion;
    }

    /**
     * Update all active explosions
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        const now = performance.now();
        const toRemove = [];

        for (let i = 0; i < this.activeExplosions.length; i++) {
            const explosion = this.activeExplosions[i];
            const age = now - explosion.startTime;

            // Remove expired explosions
            if (age > this.lifetime) {
                toRemove.push(i);
                continue;
            }

            // Calculate life progress (0-1)
            const progress = age / this.lifetime;

            // Near the end of lifetime, start fading everything out quickly
            const nearEnd = progress > 0.9;

            // Update core - expands then quickly fades
            if (explosion.core) {
                // Rapid initial expansion
                const coreScale = progress < 0.2
                    ? 1 + progress * 8 // Fast expansion in first 20% of lifetime
                    : 2.6 - (progress - 0.2) * 3.25; // Slower shrink after

                explosion.core.scale.set(coreScale, coreScale, coreScale);

                // Fast fade out
                explosion.core.material.opacity = nearEnd
                    ? 0 // Force to zero near end
                    : progress < 0.3
                        ? 1.0 // Full opacity initially
                        : Math.max(0, 1.0 - (progress - 0.3) * 3); // Rapid fade
            }

            // Update blast wave - expands and fades more gradually
            if (explosion.blast) {
                // Continuous expansion
                const blastScale = 1 + progress * 5;
                explosion.blast.scale.set(blastScale, blastScale, blastScale);

                // Medium fade rate
                explosion.blast.material.opacity = nearEnd
                    ? 0 // Force to zero near end
                    : Math.max(0, 0.8 - progress * 0.8);
            }

            // Update smoke ring - expands slowly and fades last
            if (explosion.smokeRing) {
                // Continuous expansion
                const ringScale = 1 + progress * 3;
                explosion.smokeRing.scale.set(ringScale, ringScale, ringScale);

                // Smoke becomes more visible for a while, then fades
                explosion.smokeRing.material.opacity = nearEnd
                    ? 0 // Force to zero near end
                    : progress < 0.3
                        ? 0.1 + progress * 1.5 // Quickly becomes more visible
                        : 0.6 - (progress - 0.3) * 0.75; // Then slow fade
            }

            // Update debris
            for (const debris of explosion.debris) {
                // Apply gravity (increasing downward velocity)
                debris.velocity.y -= 9.8 * deltaTime;

                // Move debris
                debris.mesh.position.x += debris.velocity.x * deltaTime;
                debris.mesh.position.y += debris.velocity.y * deltaTime;
                debris.mesh.position.z += debris.velocity.z * deltaTime;

                // Rotate debris
                debris.mesh.rotation.x += debris.rotationSpeed.x;
                debris.mesh.rotation.y += debris.rotationSpeed.y;
                debris.mesh.rotation.z += debris.rotationSpeed.z;

                // Fade debris
                if (debris.mesh.material.opacity > 0) {
                    debris.mesh.material.opacity = nearEnd
                        ? 0 // Force to zero near end
                        : Math.max(0, 0.8 - progress * 0.8);
                }
            }
        }

        // Remove expired explosions
        for (let i = toRemove.length - 1; i >= 0; i--) {
            const index = toRemove[i];
            const explosion = this.activeExplosions[index];

            // Remove from scene
            this.scene.remove(explosion.group);

            // Dispose geometries and materials
            if (explosion.core) {
                explosion.core.geometry.dispose();
                explosion.core.material.dispose();
            }

            if (explosion.blast) {
                explosion.blast.geometry.dispose();
                explosion.blast.material.dispose();
            }

            if (explosion.smokeRing) {
                explosion.smokeRing.geometry.dispose();
                explosion.smokeRing.material.dispose();
            }

            for (const debris of explosion.debris) {
                debris.mesh.geometry.dispose();
                debris.mesh.material.dispose();
            }

            // Remove from active list
            this.activeExplosions.splice(index, 1);
        }
    }

    /**
     * Clean up all resources
     */
    dispose() {
        // Remove all active explosions
        for (const explosion of this.activeExplosions) {
            this.scene.remove(explosion.group);

            // Dispose geometries and materials
            if (explosion.core) {
                explosion.core.geometry.dispose();
                explosion.core.material.dispose();
            }

            if (explosion.blast) {
                explosion.blast.geometry.dispose();
                explosion.blast.material.dispose();
            }

            if (explosion.smokeRing) {
                explosion.smokeRing.geometry.dispose();
                explosion.smokeRing.material.dispose();
            }

            for (const debris of explosion.debris) {
                debris.mesh.geometry.dispose();
                debris.mesh.material.dispose();
            }
        }

        this.activeExplosions = [];
    }

    /**
     * Stop all explosions and clean up resources
     */
    stopAndCleanup() {
        // Remove all active explosions
        for (const explosion of this.activeExplosions) {
            this.scene.remove(explosion.group);

            // Dispose geometries and materials
            if (explosion.core) {
                explosion.core.geometry.dispose();
                explosion.core.material.dispose();
            }

            if (explosion.blast) {
                explosion.blast.geometry.dispose();
                explosion.blast.material.dispose();
            }

            if (explosion.smokeRing) {
                explosion.smokeRing.geometry.dispose();
                explosion.smokeRing.material.dispose();
            }

            for (const debris of explosion.debris) {
                debris.mesh.geometry.dispose();
                debris.mesh.material.dispose();
            }
        }

        // Clear the active explosions array
        this.activeExplosions = [];
    }
} 