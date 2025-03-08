// UI Manager for handling UI elements
import InstructionsPanel from './InstructionsPanel.js';
import FlightInfo from './FlightInfo.js';
import Notifications from './Notifications.js';
import DebugPanel from './DebugPanel.js';
import SettingsMenu from './SettingsMenu.js';
import HealthDisplay from './HealthDisplay.js';

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

        // Multiplayer UI elements
        this.multiplayerIndicator = null;
    }

    /**
     * Initialize UI components
     */
    init() {
        // Create UI components
        this.instructionsPanel = new InstructionsPanel(this.eventBus);
        this.flightInfo = new FlightInfo(this.eventBus);
        this.notifications = new Notifications(this.eventBus);
        this.debugPanel = new DebugPanel(this.eventBus);
        this.settingsMenu = new SettingsMenu(this.eventBus, this.qualitySettings);
        this.healthDisplay = new HealthDisplay(this.eventBus);

        // Create multiplayer indicator (hidden by default)
        this.createMultiplayerUI();

        // Listen for events
        this.setupEventListeners();

        console.log('UIManager initialized');
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
        this.instructionsPanel.show();
    }

    /**
     * Hide instructions panel
     */
    hideInstructions() {
        this.instructionsPanel.hide();
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
        }

        // Update FPS display
        if (this.flightInfo) {
            this.flightInfo.updateFPS(fps);
        }
    }
} 