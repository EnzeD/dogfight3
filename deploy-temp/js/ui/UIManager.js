// UI Manager for handling UI elements
import InstructionsPanel from './InstructionsPanel.js';
import FlightInfo from './FlightInfo.js';
import Notifications from './Notifications.js';

export default class UIManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // UI components
        this.instructionsPanel = null;
        this.flightInfo = null;
        this.notifications = null;

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
        // Create multiplayer indicator
        this.multiplayerIndicator = document.createElement('div');
        this.multiplayerIndicator.className = 'multiplayer-indicator';
        this.multiplayerIndicator.innerHTML = `
            <div class="multiplayer-status">
                <span class="status-dot"></span>
                <span class="status-text">Multiplayer: Disconnected</span>
            </div>
            <div class="multiplayer-info">
                Press 'M' to toggle connection
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .multiplayer-indicator {
                position: fixed;
                bottom: 10px;
                right: 10px;
                background-color: rgba(0, 0, 0, 0.5);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                display: none;
            }
            .multiplayer-status {
                display: flex;
                align-items: center;
                margin-bottom: 5px;
            }
            .status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: red;
                margin-right: 8px;
            }
            .status-dot.connected {
                background-color: #00ff00;
            }
            .multiplayer-info {
                font-size: 12px;
                opacity: 0.8;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(this.multiplayerIndicator);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for flight info updates
        this.eventBus.on('flight.info.update', (data) => {
            this.flightInfo.update(data);
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

        this.eventBus.on('network.disconnect', () => {
            this.updateMultiplayerStatus('Disconnected', false);
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
        if (this.multiplayerIndicator) {
            this.multiplayerIndicator.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Update the multiplayer status indicator
     * @param {string} status - Status message to display
     * @param {boolean} connected - Whether connected to server
     */
    updateMultiplayerStatus(status, connected = false) {
        if (!this.multiplayerIndicator) return;

        const statusDot = this.multiplayerIndicator.querySelector('.status-dot');
        const statusText = this.multiplayerIndicator.querySelector('.status-text');

        if (statusDot) {
            if (connected) {
                statusDot.classList.add('connected');
            } else {
                statusDot.classList.remove('connected');
            }
        }

        if (statusText) {
            statusText.textContent = `Multiplayer: ${status}`;
        }
    }

    /**
     * Update UI elements
     * @param {Object} plane - The player's plane
     * @param {number} fps - Current FPS
     */
    update(plane, fps) {
        // No updates needed here as individual components update via events
    }
} 