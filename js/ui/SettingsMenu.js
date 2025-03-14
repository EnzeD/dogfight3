// SettingsMenu.js - Handles the settings menu UI
export default class SettingsMenu {
    constructor(eventBus, qualitySettings) {
        this.eventBus = eventBus;
        this.qualitySettings = qualitySettings;
        this.isVisible = false;
        this.menu = null;

        // Create the menu but keep it hidden initially
        this.createMenu();

        // Listen for events
        this.setupEventListeners();
    }

    /**
     * Create the settings menu UI
     */
    createMenu() {
        // Create menu container
        this.menu = document.createElement('div');
        this.menu.id = 'settings-menu';

        // Style the menu
        this.menu.style.position = 'absolute';
        this.menu.style.top = '50%';
        this.menu.style.left = '50%';
        this.menu.style.transform = 'translate(-50%, -50%)';
        this.menu.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.menu.style.color = 'white';
        this.menu.style.padding = '20px';
        this.menu.style.borderRadius = '10px';
        this.menu.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.6)';
        this.menu.style.zIndex = '1000';
        this.menu.style.minWidth = '300px';
        this.menu.style.display = 'none';
        this.menu.style.textAlign = 'center';
        this.menu.style.fontFamily = 'Arial, sans-serif';
        this.menu.style.backdropFilter = 'blur(8px)';
        this.menu.style.border = '1px solid rgba(255, 255, 255, 0.1)';

        // Add content to the menu
        this.updateMenuContent();

        // Add menu to document
        document.body.appendChild(this.menu);
    }

    /**
     * Update the menu content based on current settings
     */
    updateMenuContent() {
        const currentQuality = this.qualitySettings.getQuality();

        this.menu.innerHTML = `
            <div style="margin-bottom: 10px; font-size: 14px;">
                Dogfight Arena by <a href="https://x.com/NicolasZu" target="_blank" style="color: #4CAF50; text-decoration: none;">@NicolasZu</a>
            </div>
            <h2 style="margin-top: 0; color: #4CAF50; margin-bottom: 20px;">Game Settings</h2>
            
            <div style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px;">Graphics Quality</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <button 
                        id="quality-low" 
                        class="quality-button ${currentQuality === 'low' ? 'active' : ''}"
                        style="
                            flex: 1; 
                            padding: 10px; 
                            margin: 0 5px; 
                            background-color: ${currentQuality === 'low' ? '#2d6a30' : '#444'};
                            border: 1px solid ${currentQuality === 'low' ? '#4CAF50' : '#666'};
                            color: white;
                            border-radius: 5px;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        "
                    >
                        Low
                    </button>
                    <button 
                        id="quality-medium" 
                        class="quality-button ${currentQuality === 'medium' ? 'active' : ''}"
                        style="
                            flex: 1; 
                            padding: 10px; 
                            margin: 0 5px; 
                            background-color: ${currentQuality === 'medium' ? '#2d6a30' : '#444'};
                            border: 1px solid ${currentQuality === 'medium' ? '#4CAF50' : '#666'};
                            color: white;
                            border-radius: 5px;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        "
                    >
                        Medium
                    </button>
                    <button 
                        id="quality-high" 
                        class="quality-button ${currentQuality === 'high' ? 'active' : ''}"
                        style="
                            flex: 1; 
                            padding: 10px; 
                            margin: 0 5px; 
                            background-color: ${currentQuality === 'high' ? '#2d6a30' : '#444'};
                            border: 1px solid ${currentQuality === 'high' ? '#4CAF50' : '#666'};
                            color: white;
                            border-radius: 5px;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        "
                    >
                        High
                    </button>
                </div>
                <div style="font-size: 12px; color: #aaa; margin-bottom: 10px;">
                    Changes to quality require game reload
                </div>
                
                <div style="margin-top: 10px; padding: 10px; background-color: rgba(66, 66, 66, 0.4); border-radius: 5px; text-align: left; font-size: 12px;">
                    <strong>Quality Details:</strong>
                    <ul style="margin: 5px 0; padding-left: 20px; color: #ccc;">
                        <li>Low: Optimized for mobile devices and low-end computers (~15,000 triangles)</li>
                        <li>Medium: Enhanced with high-quality clouds, more AI enemies (20), anti-aliasing and basic shadows</li>
                        <li>High: Best visuals for powerful computers (~140,000 triangles)</li>
                    </ul>
                    <p style="margin: 5px 0; color: #ffbb33;">
                        <strong>Mobile users:</strong> Use "Low" for best performance or "Medium" for better clouds and more enemies.
                    </p>
                </div>
            </div>
            
            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <button 
                    id="save-settings" 
                    style="
                        padding: 10px 20px;
                        background-color: #4CAF50;
                        border: none;
                        color: white;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        margin-right: 10px;
                    "
                >
                    Apply & Reload
                </button>
                <button 
                    id="close-settings" 
                    style="
                        padding: 10px 20px;
                        background-color: #666;
                        border: none;
                        color: white;
                        border-radius: 5px;
                        cursor: pointer;
                    "
                >
                    Cancel
                </button>
            </div>
        `;

        // Add event listeners to buttons
        this.addButtonListeners();
    }

    /**
     * Add event listeners to menu buttons
     */
    addButtonListeners() {
        // Quality setting buttons
        const qualityButtons = ['low', 'medium', 'high'];
        let selectedQuality = this.qualitySettings.getQuality();

        qualityButtons.forEach(quality => {
            const button = document.getElementById(`quality-${quality}`);
            if (button) {
                button.addEventListener('click', () => {
                    // Update selected quality (but don't apply yet)
                    selectedQuality = quality;

                    // Update button styles
                    qualityButtons.forEach(q => {
                        const btn = document.getElementById(`quality-${q}`);
                        if (btn) {
                            btn.style.backgroundColor = (q === quality) ? '#2d6a30' : '#444';
                            btn.style.borderColor = (q === quality) ? '#4CAF50' : '#666';
                        }
                    });
                });
            }
        });

        // Save button
        const saveButton = document.getElementById('save-settings');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                // Only reload if quality has changed
                if (selectedQuality !== this.qualitySettings.getQuality()) {
                    this.qualitySettings.setQuality(selectedQuality);
                    this.hide();

                    // Show loading message
                    this.showLoadingMessage();

                    // Reload the page after a brief delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                } else {
                    this.hide();
                }
            });
        }

        // Close button
        const closeButton = document.getElementById('close-settings');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hide();
            });
        }
    }

    /**
     * Show a loading message when reloading
     */
    showLoadingMessage() {
        const loadingMsg = document.createElement('div');
        loadingMsg.style.position = 'fixed';
        loadingMsg.style.top = '0';
        loadingMsg.style.left = '0';
        loadingMsg.style.width = '100%';
        loadingMsg.style.height = '100%';
        loadingMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        loadingMsg.style.color = 'white';
        loadingMsg.style.display = 'flex';
        loadingMsg.style.alignItems = 'center';
        loadingMsg.style.justifyContent = 'center';
        loadingMsg.style.fontSize = '24px';
        loadingMsg.style.zIndex = '1001';
        loadingMsg.innerHTML = '<div>Reloading game with new settings...</div>';

        document.body.appendChild(loadingMsg);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for ESC key to show/hide menu
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (this.isVisible) {
                    this.hide();
                } else {
                    this.show();
                }
            }
        });

        // Listen for settings menu events
        this.eventBus.on('settings.show', () => this.show());
        this.eventBus.on('settings.hide', () => this.hide());
    }

    /**
     * Show the settings menu
     */
    show() {
        if (this.menu) {
            this.isVisible = true;
            this.menu.style.display = 'block';

            // Update content in case settings changed elsewhere
            this.updateMenuContent();

            // Emit event that menu is shown
            this.eventBus.emit('settings.shown');
        }
    }

    /**
     * Hide the settings menu
     */
    hide() {
        if (this.menu) {
            this.isVisible = false;
            this.menu.style.display = 'none';

            // Emit event that menu is hidden
            this.eventBus.emit('settings.hidden');
        }
    }
} 