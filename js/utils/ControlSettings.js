// ControlSettings.js - Manages control settings like inverted flight controls
export default class ControlSettings {
    constructor() {
        // Initialize with inverted controls by default
        this.invertYAxis = true;  // Default to inverted controls

        // Load saved settings if available
        this.loadSavedSettings();
    }

    /**
     * Get the current Y-axis inversion setting
     * @returns {boolean} True if Y-axis is inverted
     */
    isYAxisInverted() {
        return this.invertYAxis;
    }

    /**
     * Set Y-axis inversion
     * @param {boolean} inverted - Whether Y-axis should be inverted
     */
    setInvertYAxis(inverted) {
        this.invertYAxis = !!inverted;  // Convert to boolean
        this.saveSettings();
        return this.invertYAxis;
    }

    /**
     * Toggle Y-axis inversion
     * @returns {boolean} New inversion state
     */
    toggleInvertYAxis() {
        this.invertYAxis = !this.invertYAxis;
        this.saveSettings();
        return this.invertYAxis;
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            const settings = {
                invertYAxis: this.invertYAxis
            };
            localStorage.setItem('dogfight_control_settings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Could not save control settings:', e);
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSavedSettings() {
        try {
            const savedSettings = localStorage.getItem('dogfight_control_settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.invertYAxis = !!settings.invertYAxis;  // Convert to boolean
            }
        } catch (e) {
            console.warn('Could not load control settings:', e);
        }
    }
} 