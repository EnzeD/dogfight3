// SettingsMenu.js - Handles the settings menu UI
export default class SettingsMenu {
    constructor(eventBus, qualitySettings) {
        this.eventBus = eventBus;
        this.qualitySettings = qualitySettings;
        this.isVisible = false;
        this.menu = null;
        this.isMobile = this.checkIfMobile();

        // Create the menu but keep it hidden initially
        this.createMenu();

        // Listen for events
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
     * Create the settings menu UI
     */
    createMenu() {
        // Create menu container
        this.menu = document.createElement('div');
        this.menu.id = 'settings-menu';

        // Style the menu - smaller for mobile
        this.menu.style.position = 'absolute';
        this.menu.style.top = '50%';
        this.menu.style.left = '50%';
        this.menu.style.transform = 'translate(-50%, -50%)';
        this.menu.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.menu.style.color = 'white';
        this.menu.style.padding = this.isMobile ? '15px' : '20px';
        this.menu.style.borderRadius = '10px';
        this.menu.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.6)';
        this.menu.style.zIndex = '1000';
        this.menu.style.minWidth = this.isMobile ? '260px' : '300px';
        this.menu.style.display = 'none';
        this.menu.style.textAlign = 'center';
        this.menu.style.fontFamily = 'Arial, sans-serif';
        this.menu.style.backdropFilter = 'blur(8px)';
        this.menu.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        this.menu.style.fontSize = this.isMobile ? '12px' : '14px';

        // Update menu content with quality settings
        this.updateMenuContent();

        // Add the menu to the document
        document.body.appendChild(this.menu);
    }

    /**
     * Update the menu content based on current quality settings
     */
    updateMenuContent() {
        // Get the current settings
        const quality = this.qualitySettings.quality;
        const shadows = this.qualitySettings.shadows;
        const antialiasing = this.qualitySettings.antialiasing;
        const resolution = this.qualitySettings.resolution;

        // Create the menu content
        let content = `
            <h2 style="margin-top: 0; margin-bottom: ${this.isMobile ? '10px' : '15px'}; font-size: ${this.isMobile ? '16px' : '18px'};">Game Settings</h2>
        `;

        // Quality presets section
        content += `
            <div style="margin-bottom: ${this.isMobile ? '10px' : '15px'}; text-align: left;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Quality Preset:</label>
                <div style="display: flex; gap: 8px;">
                    <button id="quality-low" class="quality-button ${quality === 'low' ? 'selected' : ''}" 
                        style="flex: 1; padding: ${this.isMobile ? '5px' : '8px'}; background-color: ${quality === 'low' ? '#3498db' : 'rgba(50, 50, 50, 0.8)'}; border: none; color: white; border-radius: 4px; cursor: pointer;">
                        Low
                    </button>
                    <button id="quality-medium" class="quality-button ${quality === 'medium' ? 'selected' : ''}" 
                        style="flex: 1; padding: ${this.isMobile ? '5px' : '8px'}; background-color: ${quality === 'medium' ? '#3498db' : 'rgba(50, 50, 50, 0.8)'}; border: none; color: white; border-radius: 4px; cursor: pointer;">
                        Medium
                    </button>
                    <button id="quality-high" class="quality-button ${quality === 'high' ? 'selected' : ''}" 
                        style="flex: 1; padding: ${this.isMobile ? '5px' : '8px'}; background-color: ${quality === 'high' ? '#3498db' : 'rgba(50, 50, 50, 0.8)'}; border: none; color: white; border-radius: 4px; cursor: pointer;">
                        High
                    </button>
                </div>
            </div>
        `;

        // Resolution setting
        content += `
            <div style="margin-bottom: ${this.isMobile ? '10px' : '15px'}; text-align: left;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Resolution:</label>
                <div style="display: flex; gap: 8px;">
                    <button id="resolution-50" class="resolution-button ${resolution === 0.5 ? 'selected' : ''}" 
                        style="flex: 1; padding: ${this.isMobile ? '5px' : '8px'}; background-color: ${resolution === 0.5 ? '#3498db' : 'rgba(50, 50, 50, 0.8)'}; border: none; color: white; border-radius: 4px; cursor: pointer;">
                        50%
                    </button>
                    <button id="resolution-75" class="resolution-button ${resolution === 0.75 ? 'selected' : ''}" 
                        style="flex: 1; padding: ${this.isMobile ? '5px' : '8px'}; background-color: ${resolution === 0.75 ? '#3498db' : 'rgba(50, 50, 50, 0.8)'}; border: none; color: white; border-radius: 4px; cursor: pointer;">
                        75%
                    </button>
                    <button id="resolution-100" class="resolution-button ${resolution === 1.0 ? 'selected' : ''}" 
                        style="flex: 1; padding: ${this.isMobile ? '5px' : '8px'}; background-color: ${resolution === 1.0 ? '#3498db' : 'rgba(50, 50, 50, 0.8)'}; border: none; color: white; border-radius: 4px; cursor: pointer;">
                        100%
                    </button>
                </div>
            </div>
        `;

        // Sound toggle
        content += `
            <div style="margin-bottom: ${this.isMobile ? '15px' : '20px'}; text-align: left;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Sound:</label>
                <button id="toggle-sound" 
                    style="width: 100%; padding: ${this.isMobile ? '5px' : '8px'}; background-color: rgba(50, 50, 50, 0.8); border: none; color: white; border-radius: 4px; cursor: pointer; text-align: left;">
                    Toggle Sound (M)
                </button>
            </div>
        `;

        // Apply and close buttons
        content += `
            <div style="display: flex; gap: 10px; margin-top: ${this.isMobile ? '10px' : '20px'};">
                <button id="settings-apply" 
                    style="flex: 1; padding: ${this.isMobile ? '8px' : '10px'}; background-color: #2ecc71; border: none; color: white; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Apply
                </button>
                <button id="settings-close" 
                    style="flex: 1; padding: ${this.isMobile ? '8px' : '10px'}; background-color: #e74c3c; border: none; color: white; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;

        // Set the content
        this.menu.innerHTML = content;

        // Wait briefly for the DOM to update before adding listeners
        setTimeout(() => {
            // Add event listeners to the buttons
            this.addButtonListeners();
        }, 0);
    }

    /**
     * Add event listeners to the buttons in the menu
     */
    addButtonListeners() {
        // Helper function to safely add listener
        const addSafeListener = (id, callback) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', callback);
            } else {
                console.warn(`Element with ID ${id} not found`);
            }
        };

        // Quality preset buttons
        addSafeListener('quality-low', () => {
            this.qualitySettings.setQualityPreset('low');
            this.updateMenuContent();
            this.showLoadingMessage();
        });

        addSafeListener('quality-medium', () => {
            this.qualitySettings.setQualityPreset('medium');
            this.updateMenuContent();
            this.showLoadingMessage();
        });

        addSafeListener('quality-high', () => {
            this.qualitySettings.setQualityPreset('high');
            this.updateMenuContent();
            this.showLoadingMessage();
        });

        // Resolution buttons
        addSafeListener('resolution-50', () => {
            this.qualitySettings.setResolution(0.5);
            this.updateMenuContent();
            this.showLoadingMessage();
        });

        addSafeListener('resolution-75', () => {
            this.qualitySettings.setResolution(0.75);
            this.updateMenuContent();
            this.showLoadingMessage();
        });

        addSafeListener('resolution-100', () => {
            this.qualitySettings.setResolution(1.0);
            this.updateMenuContent();
            this.showLoadingMessage();
        });

        // Sound toggle button
        addSafeListener('toggle-sound', () => {
            // Emit event to toggle sound
            this.eventBus.emit('sound.toggle');
        });

        // Apply button
        addSafeListener('settings-apply', () => {
            // Apply settings and close the menu
            this.applySettings();
            this.hide();
        });

        // Close button
        addSafeListener('settings-close', () => {
            // Close without applying
            this.hide();
        });
    }

    /**
     * Show a temporary loading message while settings are being applied
     */
    showLoadingMessage() {
        // Create loading message
        const loadingMsg = document.createElement('div');
        loadingMsg.style.position = 'absolute';
        loadingMsg.style.top = '10px';
        loadingMsg.style.left = '0';
        loadingMsg.style.right = '0';
        loadingMsg.style.textAlign = 'center';
        loadingMsg.style.color = '#2ecc71';
        loadingMsg.style.fontStyle = 'italic';
        loadingMsg.style.fontSize = this.isMobile ? '11px' : '13px';
        loadingMsg.textContent = 'Settings applied!';

        // Add to menu
        this.menu.appendChild(loadingMsg);

        // Remove after a short time
        setTimeout(() => {
            loadingMsg.remove();
        }, 1500);
    }

    /**
     * Apply the current settings
     */
    applySettings() {
        // Emit an event to apply settings
        this.eventBus.emit('settings.apply', this.qualitySettings);
    }

    /**
     * Setup event listeners for settings menu
     */
    setupEventListeners() {
        // Listen for the Escape key to close the menu
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Show the settings menu
     */
    show() {
        this.menu.style.display = 'block';
        this.isVisible = true;

        // Emit an event to indicate the settings menu is shown
        this.eventBus.emit('settings.shown');
    }

    /**
     * Hide the settings menu
     */
    hide() {
        this.menu.style.display = 'none';
        this.isVisible = false;

        // Emit an event to indicate the settings menu is hidden
        this.eventBus.emit('settings.hidden');
    }
} 