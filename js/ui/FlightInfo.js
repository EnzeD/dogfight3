// Flight Info for displaying flight information
export default class FlightInfo {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.panel = null;
        this.speedValue = null;
        this.fpsValue = null;
        this.isMobile = this.checkIfMobile();

        // Create the panel
        this.createPanel();

        // Listen for input events to update boost status
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
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for input actions to detect boost state
        this.eventBus.on('input.action', (data) => {
            // Mobile UI doesn't show boost status
        });
    }

    /**
     * Create the flight info panel - simplified for mobile
     */
    createPanel() {
        // Create panel element
        this.panel = document.createElement('div');
        this.panel.id = 'flight-info-panel';

        // Style the panel - much smaller for mobile
        this.panel.style.position = 'absolute';
        this.panel.style.bottom = '10px';
        this.panel.style.left = '10px';
        this.panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.panel.style.color = 'white';
        this.panel.style.padding = '5px 10px';
        this.panel.style.fontFamily = 'Arial, sans-serif';
        this.panel.style.fontSize = '12px';
        this.panel.style.borderRadius = '8px';
        this.panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        this.panel.style.backdropFilter = 'blur(5px)';
        this.panel.style.border = '1px solid rgba(255,255,255,0.1)';
        this.panel.style.width = 'auto';
        this.panel.style.zIndex = '1000';
        this.panel.style.display = 'flex';
        this.panel.style.alignItems = 'center';
        this.panel.style.gap = '10px';

        // Set panel content - simplified for mobile
        this.panel.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center;">
                <span style="font-size: 10px; opacity: 0.8;">SPEED</span>
                <span id="speed-value" style="font-weight: bold;">0%</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center;">
                <span style="font-size: 10px; opacity: 0.8;">FPS</span>
                <span id="fps-value" style="font-weight: bold;">0</span>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.panel);

        // Get references to elements
        this.speedValue = document.getElementById('speed-value');
        this.fpsValue = document.getElementById('fps-value');
    }

    /**
     * Update flight info
     * @param {Object} data - Flight data
     */
    update(data) {
        // Update speed - simplified
        if (this.speedValue) {
            const percentValue = Math.round(data.speed);
            this.speedValue.textContent = `${percentValue}%`;

            // Color coding based on speed
            if (percentValue >= 70) {
                this.speedValue.style.color = '#e74c3c'; // Red for high speed
            } else if (percentValue >= 30) {
                this.speedValue.style.color = '#f1c40f'; // Yellow for medium speed
            } else {
                this.speedValue.style.color = '#2ecc71'; // Green for low speed
            }
        }
    }

    /**
     * Update FPS display
     * @param {number} fps - Current FPS
     */
    updateFPS(fps) {
        if (this.fpsValue) {
            this.fpsValue.textContent = fps;

            // Color code based on performance
            if (fps >= 50) {
                this.fpsValue.style.color = '#4CAF50'; // Green for good FPS
            } else if (fps >= 30) {
                this.fpsValue.style.color = '#FF9800'; // Orange for acceptable FPS
            } else {
                this.fpsValue.style.color = '#F44336'; // Red for poor FPS
            }
        }
    }
} 