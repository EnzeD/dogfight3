// Player WW2 Plane class with advanced destruction effects
import * as THREE from 'three';
import WW2Plane from './WW2Plane.js';
import SmokeFX from '../effects/SmokeFX.js';
import ExplosionFX from '../effects/ExplosionFX.js';

export default class PlayerWW2Plane extends WW2Plane {
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

        // Listen for plane damage and update smoke
        this.setupDamageListener();
    }

    /**
     * Set up damage event listeners for smoke effects
     */
    setupDamageListener() {
        if (this.eventBus) {
            // Listen for plane damage events to update smoke
            this.eventBus.on('plane.damage', (data, source) => {
                // Only respond to player damage events
                if (source === 'player') {
                    console.log('Player plane damaged:', data);
                }
            });

            // Listen for plane destroyed events
            this.eventBus.on('plane.destroyed', (data, source) => {
                // Only respond to player destruction events
                if (source === 'player' && !this.freeFall.active) {
                    console.log('Player plane destroyed, initiating free fall');
                    // If not already in free fall, initiate it
                    this.initiateFreefall();
                }
            });
        }
    }

    /**
     * Update method override to handle free fall physics
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} inputState - Input state object
     */
    update(deltaTime, inputState) {
        // Handle free fall physics if the plane is destroyed
        if (this.isDestroyed && this.freeFall.active) {
            this.updateFreeFall(deltaTime);

            // Continue updating the explosion effects
            if (this.explosionFX) {
                this.explosionFX.update(deltaTime);
            }

            // Update hit effects to ensure they animate out properly
            if (this.ammoSystem && this.ammoSystem.hitEffect) {
                this.ammoSystem.hitEffect.update(deltaTime);
            }

            // Still update propeller and flight info, but skip normal controls
            this.updatePropeller(deltaTime);
            this.emitFlightInfoUpdate();
            return;
        }

        // Call the parent update method for normal behavior
        super.update(deltaTime, inputState);

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
     * Initiate free fall mode after destruction
     * Called when plane is destroyed or by event listener
     */
    initiateFreefall() {
        if (this.freeFall.active) return; // Already in free fall

        console.log('Player plane initiating free fall');

        // Calculate current plane velocity
        const forwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        this.freeFall.velocity.copy(forwardDirection.multiplyScalar(this.speed * 0.5));

        // Add random angular velocity for tumbling
        this.freeFall.angularVelocity.set(
            (Math.random() - 0.5) * 2,  // Random X rotation (pitch)
            (Math.random() - 0.5) * 0.5, // Less Y rotation (yaw)
            (Math.random() - 0.5) * 3   // More Z rotation (roll)
        );

        // Activate free fall physics
        this.freeFall.active = true;

        // No longer stop smoke - we want it to continue during free-fall
        // if (this.smokeFX) {
        //     this.smokeFX.stopAndCleanup();
        // }
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

                // Also emit destroyed event
                this.eventBus.emit('plane.destroyed', {
                    position: this.mesh.position.clone(),
                    rotation: this.mesh.rotation.clone(),
                    freeFall: true
                }, 'player');

                // Show game over notification
                this.eventBus.emit('notification', {
                    message: 'You were shot down!',
                    type: 'error',
                    duration: 5000 // Longer duration for important message
                });

                // Show restart message immediately
                setTimeout(() => {
                    this.eventBus.emit('notification', {
                        message: 'Press R to restart',
                        type: 'info',
                        duration: 10000
                    });
                }, 1000); // Short delay so it appears after the "shot down" message
            }
        }

        // Initiate free fall
        this.initiateFreefall();

        // Disable wing trails
        if (this.wingTrails && this.wingTrails.left && this.wingTrails.right) {
            this.wingTrails.left.mesh.visible = false;
            this.wingTrails.right.mesh.visible = false;
        }

        console.log('Player plane destroyed and entering free fall');

        // Keep the timeout for cleanup, but the player can restart before this happens
        setTimeout(() => {
            this.removeFromScene();
        }, 10000);
    }

    /**
     * Remove the plane completely from the scene
     */
    removeFromScene() {
        console.log('Removing destroyed player plane from scene');

        // Make the plane invisible
        if (this.mesh) {
            this.mesh.visible = false;
        }

        // Clean up explosion effects if they're still active
        if (this.explosionFX) {
            // Use the proper cleanup method instead of directly accessing the array
            this.explosionFX.stopAndCleanup();
        }

        // Clean up smoke effects
        if (this.smokeFX) {
            // Clear all active particles immediately
            this.smokeFX.clearAllParticles();
        }

        // Clean up ammo system and associated hit effects
        if (this.ammoSystem) {
            // Stop and clean up hit effects first
            if (this.ammoSystem.hitEffect) {
                this.ammoSystem.hitEffect.stopAndCleanup();
                console.log('Cleaned up hit effects for player plane');
            }

            // We don't dispose the ammo system entirely as it might be needed for restart
        }

        // Notify for debugging only
        console.log('Player plane removed from scene');
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
} 