// Flight Info for displaying flight information
export default class FlightInfo {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.panel = null;
        this.speedGauge = null;
        this.speedNeedle = null;
        this.speedValue = null;
        this.altitudeValue = null;
        this.statusValue = null;
        this.fpsValue = null;
        this.autoStabValue = null;
        this.boostValue = null; // Added boost indicator
        this.takeoffSpeed = 10; // Minimum speed percentage required for takeoff (changed from 20 to 10)

        // Create the panel
        this.createPanel();

        // Listen for input events to update boost status
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for input actions to detect boost state
        this.eventBus.on('input.action', (data) => {
            if (data.action === 'boost') {
                if (data.state === 'down') {
                    this.showBoostActive(true);
                } else if (data.state === 'up') {
                    this.showBoostActive(false);
                }
            }
        });
    }

    /**
     * Update boost indicator state
     * @param {boolean} isActive - Whether boost is active
     */
    showBoostActive(isActive) {
        if (this.boostValue) {
            this.boostValue.style.display = isActive ? 'inline' : 'none';
        }
    }

    /**
     * Create the flight info panel
     */
    createPanel() {
        // Create panel element
        this.panel = document.createElement('div');
        this.panel.id = 'flight-info-panel';

        // Style the panel
        this.panel.style.position = 'absolute';
        this.panel.style.bottom = '10px';
        this.panel.style.left = '10px';
        this.panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.panel.style.color = 'white';
        this.panel.style.padding = '10px';
        this.panel.style.fontFamily = 'Arial, sans-serif';
        this.panel.style.fontSize = '14px';
        this.panel.style.borderRadius = '8px';
        this.panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        this.panel.style.backdropFilter = 'blur(5px)';
        this.panel.style.border = '1px solid rgba(255,255,255,0.1)';
        this.panel.style.width = '250px';
        this.panel.style.zIndex = '1000';

        // Set panel content
        this.panel.innerHTML = `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <span><strong>Speed:</strong></span>
                    <span id="speed-value">0%</span>
                </div>
                <div id="speed-gauge-container" style="position: relative; width: 100%; height: 20px; background-color: #333; border-radius: 10px; overflow: hidden; margin-bottom: 2px;">
                    <div id="speed-gauge-background" style="display: flex; width: 100%; height: 100%;">
                        <div style="flex: 1; background: linear-gradient(to right, #3498db, #2ecc71);"></div>
                        <div style="flex: 1; background: linear-gradient(to right, #2ecc71, #f1c40f);"></div>
                        <div style="flex: 1; background: linear-gradient(to right, #f1c40f, #e74c3c);"></div>
                    </div>
                    <div id="speed-gauge-ticks" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: space-between; padding: 0 5px;">
                        <div style="width: 1px; height: 10px; background-color: rgba(255,255,255,0.5); margin-top: 5px;"></div>
                        <div style="width: 1px; height: 10px; background-color: rgba(255,255,255,0.5); margin-top: 5px;"></div>
                        <div style="width: 1px; height: 10px; background-color: rgba(255,255,255,0.5); margin-top: 5px;"></div>
                        <div style="width: 1px; height: 10px; background-color: rgba(255,255,255,0.5); margin-top: 5px;"></div>
                        <div style="width: 1px; height: 10px; background-color: rgba(255,255,255,0.5); margin-top: 5px;"></div>
                    </div>
                    <!-- Takeoff minimum speed indicator -->
                    <div id="takeoff-speed-indicator" style="position: absolute; top: 0; left: ${this.takeoffSpeed}%; height: 100%; width: 2px; background-color: #FF5722; z-index: 2;">
                        <div style="position: absolute; top: -15px; left: -18px; background-color: #FF5722; color: white; font-size: 9px; padding: 2px 4px; border-radius: 3px; white-space: nowrap;">
                            TAKEOFF
                        </div>
                    </div>
                    <div id="speed-gauge-overlay" style="position: absolute; top: 0; right: 0; height: 100%; width: 100%; background-color: rgba(0,0,0,0.7); transform-origin: right center; transition: transform 0.3s ease-out;"></div>
                    <div id="speed-needle" style="position: absolute; top: 0; left: 0%; height: 100%; width: 2px; background-color: white; transition: left 0.3s ease-out; box-shadow: 0 0 5px rgba(255,255,255,0.7); z-index: 3;"></div>
                </div>
                <div id="speed-gauge-labels" style="display: flex; justify-content: space-between; font-size: 10px; opacity: 0.7;">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span><strong>Altitude:</strong></span>
                <span id="altitude-value">0 m</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span><strong>Status:</strong></span>
                <span id="status-value">Grounded</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span><strong>Auto-Stabilization:</strong></span>
                <span id="auto-stab-value">Enabled</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="display: flex; align-items: center;">
                    <strong>Boost:</strong>
                    <span id="boost-value" style="display: none; margin-left: 5px; background-color: #FF5722; color: white; padding: 2px 5px; border-radius: 3px; font-size: 11px; font-weight: bold;">ACTIVE</span>
                    <span style="margin-left: 5px; font-size: 11px; color: #aaa;">(Hold SHIFT)</span>
                </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span><strong>FPS:</strong></span>
                <span id="fps-value">0</span>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.panel);

        // Get references to elements
        this.speedGauge = document.getElementById('speed-gauge-overlay');
        this.speedNeedle = document.getElementById('speed-needle');
        this.speedValue = document.getElementById('speed-value');
        this.altitudeValue = document.getElementById('altitude-value');
        this.statusValue = document.getElementById('status-value');
        this.autoStabValue = document.getElementById('auto-stab-value');
        this.fpsValue = document.getElementById('fps-value');
        this.boostValue = document.getElementById('boost-value');
    }

    /**
     * Update flight info
     * @param {Object} data - Flight data
     */
    update(data) {
        // Update speed
        if (this.speedGauge && this.speedNeedle && this.speedValue) {
            // Update the overlay to reveal gauge (transform from left to right)
            const percentValue = Math.round(data.speed);
            this.speedGauge.style.transform = `scaleX(${1 - percentValue / 100})`;

            // Update the needle position
            this.speedNeedle.style.left = `${percentValue}%`;

            // Update text value
            this.speedValue.textContent = `${percentValue}%`;

            // Change speed value color based on takeoff readiness
            if (percentValue >= this.takeoffSpeed) {
                this.speedValue.style.color = '#4CAF50'; // Green when ready for takeoff
            } else {
                this.speedValue.style.color = 'white'; // Normal color when below takeoff speed
            }
        }

        // Update altitude
        if (this.altitudeValue) {
            this.altitudeValue.textContent = `${Math.round(data.altitude)} m`;
        }

        // Update status
        if (this.statusValue) {
            this.statusValue.textContent = data.isAirborne ? 'Airborne' : 'Grounded';
            this.statusValue.style.color = data.isAirborne ? '#4CAF50' : 'white';
        }

        // Update auto-stabilization
        if (this.autoStabValue) {
            this.autoStabValue.textContent = data.autoStabilization ? 'Enabled' : 'Disabled';
            this.autoStabValue.style.color = data.autoStabilization ? '#4CAF50' : '#FF9800';
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