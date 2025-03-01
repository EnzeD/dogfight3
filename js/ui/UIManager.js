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
    }

    /**
     * Initialize UI components
     */
    init() {
        // Create UI components
        this.instructionsPanel = new InstructionsPanel(this.eventBus);
        this.flightInfo = new FlightInfo(this.eventBus);
        this.notifications = new Notifications(this.eventBus);

        // Listen for events
        this.setupEventListeners();

        console.log('UIManager initialized');
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
    }

    /**
     * Show the instructions panel
     */
    showInstructions() {
        this.instructionsPanel.show();
    }

    /**
     * Hide the instructions panel
     */
    hideInstructions() {
        this.instructionsPanel.hide();
    }

    /**
     * Update UI elements
     * @param {Object} plane - The player's plane
     * @param {number} fps - Current FPS
     */
    update(plane, fps) {
        // Currently no continuous updates needed for UI
        // Updates are handled via events
    }
} 