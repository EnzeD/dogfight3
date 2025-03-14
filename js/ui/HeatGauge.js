// Heat Gauge for showing weapon heat status
export default class HeatGauge {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.heatBar = null;
        this.heatText = null;
        this.currentHeat = 0;
        this.maxHeat = 100;
        this.isOverheated = false;
        this.isMobile = this.checkIfMobile();

        // Create the heat gauge
        this.createHeatGauge();

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
     * Create the heat gauge container and elements
     */
    createHeatGauge() {
        // Create container element
        this.container = document.createElement('div');
        this.container.id = 'heat-gauge-container';

        // Style the container - compact for mobile
        this.container.style.position = 'absolute';
        this.container.style.bottom = '10px';
        this.container.style.right = '90px'; // Position next to health display
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
            <span style="font-size: 10px; opacity: 0.8;">HEAT</span>
            <div id="heat-bar-container" style="width: 60px; height: 8px; background-color: #333; border-radius: 4px; overflow: hidden; margin-top: 3px;">
                <div id="heat-bar" style="width: 0%; height: 100%; background-color: #2196F3; transition: width 0.3s ease, background-color 0.3s ease;"></div>
            </div>
            <span id="heat-text" style="font-size: 11px; font-weight: bold; margin-top: 3px;">0%</span>
        `;

        // Add to document
        document.body.appendChild(this.container);

        // Get references to UI elements
        this.heatBar = document.getElementById('heat-bar');
        this.heatText = document.getElementById('heat-text');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for heat updates
        this.eventBus.on('weapon.heat', (data) => {
            this.updateHeat(data.heat, data.maxHeat);
        });

        // Listen for overheat state
        this.eventBus.on('weapon.overheat', () => {
            this.showOverheated();
        });

        // Listen for weapon cooldown complete
        this.eventBus.on('weapon.cooled', () => {
            this.showCooled();
        });
    }

    /**
     * Update heat display
     */
    updateHeat(heat, maxHeat) {
        // Store the values
        this.currentHeat = heat;
        this.maxHeat = maxHeat;

        // Calculate heat percentage
        const heatPercent = Math.max(0, Math.min(100, (heat / maxHeat) * 100));

        // Update the heat bar width
        if (this.heatBar) {
            this.heatBar.style.width = `${heatPercent}%`;

            // Color based on heat percentage
            if (heatPercent >= 80) {
                this.heatBar.style.backgroundColor = '#F44336'; // Red for high heat
            } else if (heatPercent >= 50) {
                this.heatBar.style.backgroundColor = '#FF9800'; // Orange for medium heat
            } else {
                this.heatBar.style.backgroundColor = '#2196F3'; // Blue for low heat
            }
        }

        // Update the heat text
        if (this.heatText) {
            this.heatText.textContent = `${Math.round(heatPercent)}%`;
        }
    }

    /**
     * Show overheated state
     */
    showOverheated() {
        this.isOverheated = true;
        if (this.container) {
            // Add overheat effect
            this.container.style.backgroundColor = 'rgba(244, 67, 54, 0.7)';
            if (this.heatText) {
                this.heatText.textContent = 'OVERHEAT';
                this.heatText.style.color = '#F44336';
            }
        }
    }

    /**
     * Show cooled state
     */
    showCooled() {
        this.isOverheated = false;
        if (this.container) {
            // Reset to normal state
            this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            if (this.heatText) {
                this.heatText.style.color = 'white';
            }
        }
    }

    /**
     * Update with weapon data
     */
    update(weaponData) {
        this.updateHeat(weaponData.heat, weaponData.maxHeat);
    }
} 