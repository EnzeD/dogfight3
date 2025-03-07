// Health Display for showing player's health status
export default class HealthDisplay {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.healthBar = null;
        this.healthText = null;
        this.currentHealth = 100;
        this.maxHealth = 100;

        // Create the health display
        this.createHealthDisplay();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Create the health display container and elements
     */
    createHealthDisplay() {
        // Create container element
        this.container = document.createElement('div');
        this.container.id = 'health-display-container';

        // Style the container
        this.container.style.position = 'absolute';
        this.container.style.bottom = '10px'; // Align with the bottom edge
        this.container.style.right = '10px'; // Align with the right edge
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.color = 'white';
        this.container.style.padding = '10px';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.fontSize = '14px';
        this.container.style.borderRadius = '8px';
        this.container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        this.container.style.backdropFilter = 'blur(5px)';
        this.container.style.border = '1px solid rgba(255,255,255,0.1)';
        this.container.style.width = '250px'; // Match the width of flight info panel
        this.container.style.zIndex = '1000';

        // Create health bar content with simpler implementation that matches the style of the speed bar
        this.container.innerHTML = `
            <div style="margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <span><strong>Health:</strong></span>
                    <span id="health-value">100%</span>
                </div>
                <div id="health-gauge-container" style="position: relative; width: 100%; height: 20px; background-color: #333; border-radius: 10px; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to right, #e74c3c, #f1c40f, #2ecc71);"></div>
                    <div id="health-bar" style="position: absolute; top: 0; left: 0; height: 100%; width: 100%; background-color: rgba(0,0,0,0.7); transform-origin: right; transition: transform 0.3s ease;"></div>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.container);

        // Get references to elements
        this.healthBar = document.getElementById('health-bar');
        this.healthText = document.getElementById('health-value');
    }

    /**
     * Set up event listeners for health updates
     */
    setupEventListeners() {
        // Listen for health update events
        this.eventBus.on('plane.health.update', (data, source) => {
            if (source === 'player') {
                this.updateHealth(data.newHealth, data.maxHealth);
            }
        });

        // Listen for damage events
        this.eventBus.on('plane.damage', (data, source) => {
            if (source === 'player') {
                this.updateHealth(data.newHealth, data.maxHealth);
                this.flashDamage();
            }
        });

        // Listen for destroyed event
        this.eventBus.on('plane.destroyed', (data, source) => {
            if (source === 'player') {
                this.updateHealth(0, this.maxHealth);
                this.showDestroyed();
            }
        });

        // Also listen for regular flight info updates as a backup
        this.eventBus.on('flight.info.update', (data, source) => {
            if (source === 'player' && data.health !== undefined) {
                this.updateHealth(data.health, this.maxHealth);
                if (data.isDestroyed) {
                    this.showDestroyed();
                }
            }
        });
    }

    /**
     * Update the health display
     * @param {number} health - Current health
     * @param {number} maxHealth - Maximum health
     */
    updateHealth(health, maxHealth) {
        this.currentHealth = health;
        this.maxHealth = maxHealth || this.maxHealth;

        // Calculate percentage
        const percentage = Math.max(0, Math.min(100, Math.round((health / this.maxHealth) * 100)));

        // Update health bar width using transform scale from right origin
        if (this.healthBar) {
            this.healthBar.style.transform = `scaleX(${1 - percentage / 100})`;
        }

        // Update text
        if (this.healthText) {
            this.healthText.textContent = `${percentage}%`;

            // Update color based on health percentage
            if (percentage <= 25) {
                this.healthText.style.color = '#e74c3c'; // Red for low health
            } else if (percentage <= 50) {
                this.healthText.style.color = '#f1c40f'; // Yellow for medium health
            } else {
                this.healthText.style.color = '#2ecc71'; // Green for good health
            }
        }
    }

    /**
     * Show visual effect when taking damage
     */
    flashDamage() {
        if (this.container) {
            // Add a flash effect to the container
            this.container.style.boxShadow = '0 0 15px rgba(231, 76, 60, 0.8)';
            this.container.style.border = '1px solid rgba(231, 76, 60, 0.6)';

            // Reset after animation
            setTimeout(() => {
                this.container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                this.container.style.border = '1px solid rgba(255,255,255,0.1)';
            }, 500);
        }
    }

    /**
     * Show destroyed state
     */
    showDestroyed() {
        if (this.container && this.healthText) {
            this.healthText.innerHTML = '<span style="color: #e74c3c; font-weight: bold;">DESTROYED</span>';
            this.container.style.boxShadow = '0 0 15px rgba(231, 76, 60, 0.8)';
            this.container.style.border = '1px solid rgba(231, 76, 60, 0.6)';
        }
    }

    /**
     * Direct method to update health display from UIManager
     * @param {Object} planeData - Data from the player's plane
     */
    update(planeData) {
        if (planeData.health !== undefined) {
            this.updateHealth(planeData.health, this.maxHealth);

            if (planeData.isDestroyed) {
                this.showDestroyed();
            }
        }
    }
} 