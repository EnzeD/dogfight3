// UI Manager for handling UI elements
import InstructionsPanel from './InstructionsPanel.js';
import FlightInfo from './FlightInfo.js';
import Notifications from './Notifications.js';
import DebugPanel from './DebugPanel.js';
import SettingsMenu from './SettingsMenu.js';
import HealthDisplay from './HealthDisplay.js';
import PlayerCountDisplay from './PlayerCountDisplay.js';
import LeaderboardDisplay from './LeaderboardDisplay.js';
import HeatGauge from './HeatGauge.js';

export default class UIManager {
    constructor(eventBus, qualitySettings) {
        this.eventBus = eventBus;
        this.qualitySettings = qualitySettings;

        // UI components
        this.instructionsPanel = null;
        this.flightInfo = null;
        this.notifications = null;
        this.debugPanel = null;
        this.settingsMenu = null;
        this.healthDisplay = null;
        this.playerCountDisplay = null;
        this.leaderboardDisplay = null;
        this.heatGauge = null;
        this.optionsButton = null;

        // Multiplayer UI elements
        this.multiplayerIndicator = null;

        // Protection zone state
        this.isInProtectionZone = false;

        // Check if mobile device
        this.isMobile = this.checkIfMobile();
    }

    /**
     * Check if the device is mobile
     * @returns {boolean} True if mobile device
     */
    checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    }

    /**
     * Initialize UI components
     */
    init() {
        // Create UI components
        if (!this.isMobile) {
            // For desktop, show full UI
            this.instructionsPanel = new InstructionsPanel(this.eventBus);
        }

        this.flightInfo = new FlightInfo(this.eventBus);
        this.notifications = new Notifications(this.eventBus);
        this.debugPanel = new DebugPanel(this.eventBus);
        this.settingsMenu = new SettingsMenu(this.eventBus, this.qualitySettings);
        this.healthDisplay = new HealthDisplay(this.eventBus);
        this.leaderboardDisplay = new LeaderboardDisplay(this.eventBus);
        this.heatGauge = new HeatGauge(this.eventBus);

        // Create multiplayer indicator (hidden by default)
        this.createMultiplayerUI();

        // Create options button for mobile
        if (this.isMobile) {
            this.createOptionsButton();
        }

        // Listen for events
        this.setupEventListeners();

        console.log('UIManager initialized');
    }

    /**
     * Create options button for mobile
     */
    createOptionsButton() {
        this.optionsButton = document.createElement('button');
        this.optionsButton.id = 'options-button';

        // Style the button
        this.optionsButton.style.position = 'absolute';
        this.optionsButton.style.top = '10px';
        this.optionsButton.style.right = '10px';
        this.optionsButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.optionsButton.style.color = 'white';
        this.optionsButton.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        this.optionsButton.style.borderRadius = '8px';
        this.optionsButton.style.padding = '6px 10px';
        this.optionsButton.style.fontSize = '12px';
        this.optionsButton.style.fontFamily = 'Arial, sans-serif';
        this.optionsButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
        this.optionsButton.style.cursor = 'pointer';
        this.optionsButton.style.zIndex = '1001';
        this.optionsButton.style.backdropFilter = 'blur(5px)';

        // Set button text
        this.optionsButton.textContent = 'Options';

        // Add click event listener
        this.optionsButton.addEventListener('click', () => {
            this.settingsMenu.show();
        });

        // Add to document
        document.body.appendChild(this.optionsButton);
    }

    /**
     * Create multiplayer UI elements
     */
    createMultiplayerUI() {
        // Multiplayer indicator removed as requested
        // Method kept empty to maintain compatibility
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for flight info updates
        this.eventBus.on('flight.info.update', (data, source) => {
            //console.log(`Flight info update from source: ${source || 'unknown'}`);

            // Only show flight info for the player's plane, not the enemy planes
            if (!source || source === 'player') {
                // NOTE: We're now using the direct update method in the update() function
                // This event handler is kept as a backup but shouldn't be needed
                this.flightInfo.update(data);
            }
        });

        // Listen for FPS updates
        this.eventBus.on('fps.update', (fps) => {
            this.flightInfo.updateFPS(fps);
        });

        // Listen for notification events
        this.eventBus.on('notification', (data) => {
            this.notifications.show(data.message, data.type);
        });

        // Listen for multiplayer connection events
        this.eventBus.on('network.connect', () => {
            this.updateMultiplayerStatus('Connecting...');
        });

        this.eventBus.on('network.connected', () => {
            this.updateMultiplayerStatus('Connected', true);

            // Initialize player count display when connected to multiplayer
            if (!this.playerCountDisplay) {
                this.playerCountDisplay = new PlayerCountDisplay(this.eventBus);
            }
        });

        this.eventBus.on('network.disconnect', () => {
            this.updateMultiplayerStatus('Disconnected', false);
        });

        // Pause game when settings menu is shown
        this.eventBus.on('settings.shown', () => {
            this.eventBus.emit('game.pause');
        });

        // Resume game when settings menu is hidden
        this.eventBus.on('settings.hidden', () => {
            this.eventBus.emit('game.resume');
        });
    }

    /**
     * Show instructions panel
     */
    showInstructions() {
        // Don't show instructions on mobile
        if (this.isMobile) {
            // Emit game.start directly instead of showing instructions
            this.eventBus.emit('game.start');
            return;
        }

        if (this.instructionsPanel) {
            this.instructionsPanel.show();
        }
    }

    /**
     * Hide instructions panel
     */
    hideInstructions() {
        if (this.instructionsPanel) {
            this.instructionsPanel.hide();
        }
    }

    /**
     * Show or hide the multiplayer status indicator
     * @param {boolean} show - Whether to show the indicator
     */
    showMultiplayerStatus(show) {
        // Multiplayer indicator no longer exists, method kept for compatibility
    }

    /**
     * Update the multiplayer status indicator
     * @param {string} status - Status message to display
     * @param {boolean} connected - Whether connected to server
     */
    updateMultiplayerStatus(status, connected = false) {
        // Multiplayer indicator no longer exists, method kept for compatibility
    }

    /**
     * Update UI elements
     * @param {Object} plane - The player's plane
     * @param {number} fps - Current FPS
     */
    update(plane, fps) {
        // Explicitly update flight info with player plane data
        if (plane && this.flightInfo) {
            // Get altitude (y position)
            const altitude = Math.max(0, plane.mesh.position.y);

            // Get speed as percentage of max speed
            const speedPercent = (plane.speed / plane.maxSpeed) * 100;

            // Directly update the flight info
            this.flightInfo.update({
                speed: speedPercent,
                altitude: altitude,
                isAirborne: plane.isAirborne,
                autoStabilization: plane.autoStabilizationEnabled,
                chemtrails: plane.trailsEnabled
            });

            // Update health display
            if (this.healthDisplay) {
                this.healthDisplay.update({
                    health: plane.currentHealth,
                    maxHealth: plane.maxHealth,
                    isDestroyed: plane.isDestroyed
                });
            }

            // Update heat gauge if weapon system is available
            if (this.heatGauge && plane.weaponSystem) {
                this.heatGauge.update({
                    heat: plane.weaponSystem.heat,
                    maxHeat: plane.weaponSystem.maxHeat
                });
            }
        }

        // Update FPS display
        if (this.flightInfo) {
            this.flightInfo.updateFPS(fps);
        }
    }

    /**
     * Show or hide the protection zone status
     * @param {boolean} isInZone - Whether the player is in a protection zone
     */
    showProtectionZoneStatus(isInZone) {
        // Track state change to avoid spamming notifications
        if (isInZone === this.isInProtectionZone) {
            return;
        }

        this.isInProtectionZone = isInZone;

        // Show notification when entering or leaving the zone
        if (isInZone) {
            this.notifications.show('Entered Runway Protection Zone - Combat Disabled', 'info', 3000);
        } else {
            this.notifications.show('Exited Runway Protection Zone - Combat Enabled', 'warning', 3000);
        }
    }
} 