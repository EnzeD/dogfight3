// UI Manager for handling UI elements
import InstructionsPanel from './InstructionsPanel.js';
import FlightInfo from './FlightInfo.js';
import Notifications from './Notifications.js';
import DebugPanel from './DebugPanel.js';
import SettingsMenu from './SettingsMenu.js';
import HealthDisplay from './HealthDisplay.js';
import PlayerCountDisplay from './PlayerCountDisplay.js';
import LeaderboardDisplay from './LeaderboardDisplay.js';

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

        // Multiplayer UI elements
        this.multiplayerIndicator = null;

        // Protection zone state
        this.isInProtectionZone = false;

        // Mobile mode state
        this.isMobileMode = false;
    }

    /**
     * Initialize UI components
     */
    init() {
        // Initialize UI elements
        this.createHUD();

        // Create multiplayer UI elements if needed
        if (this.isMultiplayer) {
            this.createMultiplayerUI();
        }

        // Remove any mobile overlay UI elements that might be present
        this.removeMobileOverlays();

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

    /**
     * Shows a tutorial for mobile touch controls
     */
    showTouchControlsTutorial() {
        // Tutorial removed to create cleaner UI
        console.log('Touch controls tutorial disabled for cleaner UI');
    }

    /**
     * Shows a temporary hint for touch controls that fades out
     */
    showTouchControlHint() {
        // Hint removed to create cleaner UI
        console.log('Touch controls hint disabled for cleaner UI');
    }

    /**
     * Removes any mobile overlay UI elements that might interfere with touch interactions
     */
    removeMobileOverlays() {
        // Remove any existing mobile UI elements
        const mobileUIElements = [
            '.touch-controls-tutorial',
            '.touch-control-hint',
            '.mobile-message',
            '.mobile-fire-button',
            '.tutorial-content',
            '#mobile-fire-button'
        ];

        mobileUIElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                    console.log(`Removed mobile UI element: ${selector}`);
                }
            });
        });

        // Remove any inline styles that might be blocking touch
        document.querySelectorAll('div[style*="position: fixed"]').forEach(el => {
            // Only remove potential UI overlays that might block interaction
            if (el.className &&
                (el.className.includes('tutorial') ||
                    el.className.includes('hint') ||
                    el.className.includes('mobile'))) {
                el.parentNode.removeChild(el);
                console.log('Removed potential UI overlay');
            }
        });
    }

    /**
     * Creates the main HUD elements
     */
    createHUD() {
        // Create UI components - restored from previous code
        this.instructionsPanel = new InstructionsPanel(this.eventBus);
        this.flightInfo = new FlightInfo(this.eventBus);
        this.notifications = new Notifications(this.eventBus);
        this.debugPanel = new DebugPanel(this.eventBus);
        this.settingsMenu = new SettingsMenu(this.eventBus, this.qualitySettings);
        this.healthDisplay = new HealthDisplay(this.eventBus);
        this.leaderboardDisplay = new LeaderboardDisplay(this.eventBus);
    }

    /**
     * Enables mobile-specific UI mode
     */
    enableMobileMode() {
        console.log('Enabling mobile UI mode - hiding desktop UI');

        // First, remove all desktop UI elements
        this.hideAllDesktopUI();

        // Set a flag to indicate we're in mobile mode
        this.isMobileMode = true;
    }

    /**
     * Hides all desktop UI elements to create a clean mobile interface
     */
    hideAllDesktopUI() {
        // Create a style element to hide desktop UI
        const mobileStyle = document.createElement('style');
        mobileStyle.id = 'mobile-ui-style';
        mobileStyle.textContent = `
            /* Hide all desktop UI panels */
            .instructions-panel,
            .flight-info,
            .health-display,
            .debug-panel,
            .settings-panel,
            .leaderboard-display,
            .multiplayer-status,
            .notification-container {
                display: none !important;
            }
            
            /* Style for mobile HUD */
            .mobile-hud {
                position: fixed;
                top: 10px;
                left: 10px;
                display: flex;
                flex-direction: column;
                gap: 5px;
                z-index: 1000;
                font-family: 'Special Elite', monospace;
            }
            
            .mobile-speed-indicator,
            .mobile-altitude-indicator {
                background-color: rgba(0, 0, 0, 0.6);
                border: 1px solid #f8d742;
                padding: 4px 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 80px;
                border-radius: 3px;
            }
            
            .mobile-indicator-label {
                color: #f8d742;
                font-size: 12px;
            }
            
            .mobile-indicator-value {
                color: white;
                font-size: 14px;
            }
            
            /* Mobile menu button */
            .mobile-menu-button {
                position: fixed;
                bottom: 10px;
                right: 10px;
                width: 50px;
                height: 50px;
                background-color: rgba(0, 0, 0, 0.6);
                border: 1px solid #f8d742;
                border-radius: 50%;
                color: #f8d742;
                font-size: 24px;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                z-index: 1000;
            }
            
            /* Mobile menu */
            .mobile-menu {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.85);
                border: 2px solid #f8d742;
                border-radius: 5px;
                width: 80%;
                max-width: 300px;
                z-index: 2000;
                display: none;
            }
            
            .mobile-menu.visible {
                display: block;
            }
            
            .mobile-menu-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid #f8d742;
            }
            
            .mobile-menu-header h3 {
                color: #f8d742;
                margin: 0;
                font-size: 18px;
                font-family: 'Black Ops One', cursive;
            }
            
            .mobile-menu-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
            }
            
            .mobile-menu-content {
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .mobile-menu-item {
                background-color: rgba(50, 50, 50, 0.8);
                border: 1px solid #666;
                border-radius: 3px;
                color: white;
                padding: 10px;
                font-family: 'Special Elite', monospace;
                font-size: 14px;
                cursor: pointer;
                text-align: left;
            }
            
            .mobile-menu-item:active {
                background-color: rgba(80, 80, 80, 0.8);
            }
        `;

        document.head.appendChild(mobileStyle);

        // Hide any existing UI elements programmatically
        const uiElements = [
            '.instructions-panel',
            '.flight-info',
            '.health-display',
            '.debug-panel',
            '.settings-panel',
            '.leaderboard-display',
            '.multiplayer-status',
            '.notification-container'
        ];

        uiElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
            });
        });
    }
} 