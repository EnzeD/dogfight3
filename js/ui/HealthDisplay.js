// Health Display for showing player's health status
export default class HealthDisplay {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.healthBar = null;
        this.healthText = null;
        this.currentHealth = 100;
        this.maxHealth = 100;
        this.isMobile = this.checkIfMobile();

        // Create the health display
        this.createHealthDisplay();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Check if the device is mobile
     * @returns {boolean} True if mobile device
     */
    checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    }

    /**
     * Create the health display container and elements
     */
    createHealthDisplay() {
        // Create container element
        this.container = document.createElement('div');
        this.container.id = 'health-display-container';

        // Style the container - compact for mobile
        this.container.style.position = 'absolute';
        this.container.style.bottom = '10px';
        this.container.style.right = '10px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.color = 'white';
        this.container.style.padding = '5px 10px';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.fontSize = '12px';
        this.container.style.borderRadius = '8px';
        this.container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        this.container.style.backdropFilter = 'blur(5px)';
        this.container.style.border = '1px solid rgba(255,255,255,0.1)';
        this.container.style.width = 'auto';
        this.container.style.zIndex = '1000';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';

        // Set container content
        this.container.innerHTML = `
            <span style="font-size: 10px; opacity: 0.8;">HEALTH</span>
            <div id="health-bar-container" style="width: 60px; height: 8px; background-color: #333; border-radius: 4px; overflow: hidden; margin-top: 3px;">
                <div id="health-bar" style="width: 100%; height: 100%; background-color: #4CAF50; transition: width 0.3s ease, background-color 0.3s ease;"></div>
            </div>
            <span id="health-text" style="font-size: 11px; font-weight: bold; margin-top: 3px;">100%</span>
        `;

        // Add to document
        document.body.appendChild(this.container);

        // Get references to UI elements
        this.healthBar = document.getElementById('health-bar');
        this.healthText = document.getElementById('health-text');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for damage events
        this.eventBus.on('player.damage', (amount) => {
            // Flash red when taking damage
            this.flashDamage();
        });

        // Listen for heal events
        this.eventBus.on('player.heal', (amount) => {
            // Update health (the actual value will be updated via the plane object)
            this.updateHealth(this.currentHealth + amount, this.maxHealth);
        });

        // Listen for player death
        this.eventBus.on('player.destroyed', () => {
            this.showDestroyed();
        });

        // Listen for player respawn
        this.eventBus.on('player.respawn', () => {
            // Reset health on respawn
            this.updateHealth(this.maxHealth, this.maxHealth);
        });
    }

    /**
     * Update health display
     */
    updateHealth(health, maxHealth) {
        // Store the values
        this.currentHealth = health;
        this.maxHealth = maxHealth;

        // Calculate health percentage
        const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));

        // Update the health bar width
        if (this.healthBar) {
            this.healthBar.style.width = `${healthPercent}%`;

            // Color based on health percentage
            if (healthPercent <= 20) {
                this.healthBar.style.backgroundColor = '#F44336'; // Red for critical health
            } else if (healthPercent <= 50) {
                this.healthBar.style.backgroundColor = '#FF9800'; // Orange for medium health
            } else {
                this.healthBar.style.backgroundColor = '#4CAF50'; // Green for good health
            }
        }

        // Update the health text
        if (this.healthText) {
            this.healthText.textContent = `${Math.round(healthPercent)}%`;
        }
    }

    /**
     * Flash red when taking damage
     */
    flashDamage() {
        if (this.container) {
            // Add flash effect
            this.container.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';

            // Reset after animation
            setTimeout(() => {
                this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }, 150);
        }
    }

    /**
     * Show destroyed state
     */
    showDestroyed() {
        if (this.healthBar && this.healthText) {
            this.healthBar.style.width = '0%';
            this.healthText.textContent = 'DESTROYED';
            this.healthText.style.color = '#F44336';
        }
    }

    /**
     * Update with plane data
     */
    update(planeData) {
        this.updateHealth(planeData.health, planeData.maxHealth);
    }
} 