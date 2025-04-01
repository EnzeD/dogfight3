// HitEffect for bullet impacts
import * as THREE from 'three';

export default class HitEffect {
    constructor(scene, eventBus = null) {
        this.scene = scene;
        this.eventBus = eventBus;

        // Pool of hit effect instances
        this.effectPool = [];
        this.maxEffects = 20;

        // Effect properties
        this.lifetime = 800; // ms - increased for longer visibility
        this.baseSize = 3.0; // Base size of the effect - significantly increased for visibility at a distance

        // Create materials for the hit effect
        this.createMaterials();

        // Initialize effect pool
        this.initEffectPool();

        // Set up event listener if eventBus is provided
        if (this.eventBus) {
            this.setupEventListeners();
        }
    }

    /**
     * Set up event listeners for triggering effects
     */
    setupEventListeners() {
        if (!this.eventBus) {
            console.warn('HitEffect has no EventBus, cannot set up event listeners');
            return;
        }

        this.eventBus.on('effect.hit', (data) => {
            if (!data || !data.position) {
                console.error('Hit effect event missing position data');
                return;
            }

            console.log('Triggering hit effect via event at',
                data.position.x.toFixed(2),
                data.position.y.toFixed(2),
                data.position.z.toFixed(2)
            );

            // Create the effect
            this.triggerEffect(data.position);

            // Play hit sound if not specified otherwise
            if (data.playSound !== false) {
                this.eventBus.emit('sound.play', {
                    sound: 'hit',
                    volume: 0.3,
                    // Position the sound in 3D space
                    position: data.position
                });
            }
        });

        console.log('HitEffect event listeners set up successfully');
    }

    /**
     * Create materials for hit effects
     */
    createMaterials() {
        // Create a bright flash material
        this.flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00, // Bright yellow
            transparent: true,
            opacity: 1.0, // Increased from 0.9 for more visibility
            blending: THREE.AdditiveBlending
        });

        // Create a core spark material - brighter orange for better visibility
        this.sparkMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF6600, // More vibrant orange
            transparent: true,
            opacity: 1.0, // Increased for more visibility
            blending: THREE.AdditiveBlending
        });

        // Add a secondary glow material for extra visual impact
        this.glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000, // Red
            transparent: true,
            opacity: 0.9, // Increased from 0.7
            blending: THREE.AdditiveBlending
        });
    }

    /**
     * Initialize pool of hit effect objects
     */
    initEffectPool() {
        for (let i = 0; i < this.maxEffects; i++) {
            // Create a group to hold the effect parts
            const group = new THREE.Group();
            group.visible = false;
            this.scene.add(group);

            // Create a flash sphere
            const flashGeometry = new THREE.SphereGeometry(this.baseSize, 8, 8);
            const flash = new THREE.Mesh(flashGeometry, this.flashMaterial.clone());
            group.add(flash);

            // Add additional outer glow
            const glowGeometry = new THREE.SphereGeometry(this.baseSize * 2.0, 8, 8); // Increased for better visibility
            const glow = new THREE.Mesh(glowGeometry, this.glowMaterial.clone());
            group.add(glow);

            // Create smaller spark particles
            const sparkCount = 12; // Increased from 8 for more dramatic effect
            const sparks = [];

            for (let j = 0; j < sparkCount; j++) {
                const sparkGeometry = new THREE.SphereGeometry(this.baseSize * 0.4, 6, 6); // Larger sparks
                const spark = new THREE.Mesh(sparkGeometry, this.sparkMaterial.clone());
                // Random initial position within the flash radius
                spark.userData.velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ).normalize().multiplyScalar(Math.random() * 10 + 8); // Match the faster speed
                group.add(spark);
                sparks.push(spark);
            }

            // Store the effect in the pool
            this.effectPool.push({
                group,
                flash,
                glow,
                sparks,
                active: false,
                startTime: 0
            });
        }
    }

    /**
     * Trigger a hit effect at the specified position
     * @param {THREE.Vector3} position - Where to show the effect
     */
    triggerEffect(position) {
        // Find an inactive effect
        const effect = this.effectPool.find(e => !e.active);

        // If no inactive effects are available, force cleanup of the oldest active effect
        if (!effect) {
            console.warn('Hit effect pool exhausted, cleaning up oldest effect');

            // Find the oldest active effect
            let oldestEffect = null;
            let oldestTime = Infinity;

            for (const e of this.effectPool) {
                if (e.active && e.startTime < oldestTime) {
                    oldestEffect = e;
                    oldestTime = e.startTime;
                }
            }

            // Force deactivate the oldest effect
            if (oldestEffect) {
                oldestEffect.active = false;
                oldestEffect.group.visible = false;

                // Reset positions and properties
                oldestEffect.flash.scale.set(1, 1, 1);
                oldestEffect.glow.scale.set(1, 1, 1);
                oldestEffect.sparks.forEach(spark => {
                    spark.position.set(0, 0, 0);
                });

                // Use this effect
                return this.triggerEffect(position);
            }

            // If we couldn't find any active effects (shouldn't happen), just return
            return null;
        }

        console.log('Triggering hit effect at', position);

        // Activate the effect
        effect.active = true;
        effect.startTime = performance.now();
        effect.group.visible = true;
        effect.group.position.copy(position);

        // Reset flash and glow scales
        effect.flash.scale.set(1, 1, 1);
        effect.glow.scale.set(1, 1, 1);

        // Reset spark positions
        effect.sparks.forEach(spark => {
            spark.position.set(0, 0, 0);

            // Randomize direction slightly for variation
            spark.userData.velocity.x += (Math.random() - 0.5) * 2;
            spark.userData.velocity.y += (Math.random() - 0.5) * 2;
            spark.userData.velocity.z += (Math.random() - 0.5) * 2;
            spark.userData.velocity.normalize().multiplyScalar(Math.random() * 10 + 8); // Match the faster speed
        });

        return effect;
    }

    /**
     * Update all active hit effects
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        const now = performance.now();

        for (const effect of this.effectPool) {
            if (!effect.active) continue;

            const age = now - effect.startTime;

            if (age > this.lifetime) {
                // Deactivate the effect
                effect.active = false;
                effect.group.visible = false;
                continue;
            }

            // Calculate how far through lifetime (0-1)
            const progress = age / this.lifetime;

            // Update flash - grows initially then fades
            const flashScale = progress < 0.2
                ? 1 + progress * 3 // Increased expansion for more dramatic effect
                : 1.6 - (progress - 0.2) * 1.6; // Increased from 1.4 for larger initial flash

            effect.flash.scale.set(flashScale, flashScale, flashScale);

            // Flash opacity fades out
            effect.flash.material.opacity = 0.9 * (1 - progress);

            // Update glow - grows and fades more slowly
            const glowScale = progress < 0.3
                ? 1 + progress * 2
                : 1.6 - (progress - 0.3) * 1.6 * 0.8;

            effect.glow.scale.set(glowScale, glowScale, glowScale);

            // Glow opacity has a delayed fade
            effect.glow.material.opacity = 0.7 * (1 - Math.max(0, progress - 0.2) / 0.8);

            // Update sparks - they fly outward
            effect.sparks.forEach((spark, index) => {
                // Move sparks based on their velocity and time
                spark.position.addScaledVector(spark.userData.velocity, deltaTime);

                // Scale down sparks as they age
                const sparkScale = 1 - progress * 0.8; // Slower fade for sparks
                spark.scale.set(sparkScale, sparkScale, sparkScale);

                // Fade spark opacity
                spark.material.opacity = 0.9 * (1 - progress);
            });
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Remove all effect objects from the scene
        for (const effect of this.effectPool) {
            this.scene.remove(effect.group);

            // Dispose of geometries and materials
            effect.flash.geometry.dispose();
            effect.flash.material.dispose();
            effect.glow.geometry.dispose();
            effect.glow.material.dispose();

            effect.sparks.forEach(spark => {
                spark.geometry.dispose();
                spark.material.dispose();
            });
        }

        this.effectPool = [];
    }

    /**
     * Stop all active effects and clean up immediately
     * Called when a plane is completely removed from the scene or when effects need to be forcibly cleared
     */
    stopAndCleanup() {
        for (const effect of this.effectPool) {
            if (effect.active) {
                // Deactivate and hide the effect
                effect.active = false;
                effect.group.visible = false;

                // Reset any animations or properties
                effect.flash.scale.set(1, 1, 1);
                effect.glow.scale.set(1, 1, 1);

                // Reset spark positions
                effect.sparks.forEach(spark => {
                    spark.position.set(0, 0, 0);
                });
            }
        }

        // Log cleanup for debugging
        console.log('HitEffect: All effects cleaned up');
    }
} 