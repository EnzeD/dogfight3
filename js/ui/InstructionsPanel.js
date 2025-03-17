// Instructions Panel for displaying game instructions
export default class InstructionsPanel {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.panel = null;
        this.isMobile = this.checkIfMobile();

        // Create the panel
        this.createPanel();
    }

    /**
     * Check if the device is mobile
     * @returns {boolean} True if mobile device
     */
    checkIfMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    }

    /**
     * Create the instructions panel
     */
    createPanel() {
        // Create panel element
        this.panel = document.createElement('div');
        this.panel.id = 'instructions-panel';

        // Style the panel
        this.panel.style.position = 'absolute';
        this.panel.style.top = '10px';
        this.panel.style.left = '10px';
        this.panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.panel.style.color = 'white';
        this.panel.style.padding = this.isMobile ? '10px' : '15px';
        this.panel.style.fontFamily = 'Arial, sans-serif';
        this.panel.style.fontSize = this.isMobile ? '12px' : '14px';
        this.panel.style.borderRadius = '8px';
        this.panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        this.panel.style.backdropFilter = 'blur(5px)';
        this.panel.style.border = '1px solid rgba(255,255,255,0.1)';
        this.panel.style.maxWidth = this.isMobile ? '250px' : '360px';
        this.panel.style.transition = 'opacity 0.3s ease';
        this.panel.style.zIndex = '1000';

        // Set panel content based on device type
        if (this.isMobile) {
            // Simplified content for mobile
            this.panel.innerHTML = `
                <h2 style="margin-top: 0; font-size: 16px; color: #FFD700;">Dogfight Arena</h2>
                <p style="font-size: 11px; margin-bottom: 5px;"><strong>Flight Controls:</strong></p>
                <ul style="padding-left: 15px; font-size: 11px; margin-top: 5px; margin-bottom: 5px;">
                    <li>W/Z - Increase throttle</li>
                    <li>S - Decrease throttle</li>
                    <li>A/Q - Roll left, D - Roll right</li>
                    <li>Arrows - Pitch/Yaw</li>
                    <li>Space - Fire weapons</li>
                </ul>
                <p style="margin-bottom: 0; font-style: italic; text-align: center; font-size: 10px;">
                    Tap to close
                </p>
            `;
        } else {
            // Enhanced desktop version with improved styling
            this.panel.innerHTML = `
                <h2 style="margin: 0 0 15px 0; color: #FFD700; font-size: 22px; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); text-align: center; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px;">Dogfight Arena</h2>

                <div style="background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 12px; margin-bottom: 12px; border-left: 3px solid #3498db;">
                    <h3 style="margin-top: 0; margin-bottom: 8px; color: #3498db; font-size: 16px;">Flight Controls:</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px;">
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">W/Z</span>
                            <span>Increase throttle</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">Shift+W/Z</span>
                            <span>Boost (3x)</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">S</span>
                            <span>Decrease throttle</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">A/Q</span>
                            <span>Roll left</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">D</span>
                            <span>Roll right</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">↑</span>
                            <span>Pitch down</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">↓</span>
                            <span>Pitch up</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">←</span>
                            <span>Yaw left</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">→</span>
                            <span>Yaw right</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">F</span>
                            <span>Auto-stabilization</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3); color: #ff7675;">Space</span>
                            <span style="color: #ff7675;">Fire weapons</span>
                        </div>
                    </div>
                </div>

                <div style="background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 12px; margin-bottom: 12px; border-left: 3px solid #e74c3c;">
                    <h3 style="margin-top: 0; margin-bottom: 8px; color: #e74c3c; font-size: 16px;">Camera Controls:</h3>
                    <div style="display: flex; align-items: center; font-size: 13px;">
                        <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">Left Click + Drag</span>
                        <span>Rotate camera</span>
                    </div>
                </div>

                <div style="background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 12px; margin-bottom: 12px; border-left: 3px solid #2ecc71;">
                    <h3 style="margin-top: 0; margin-bottom: 8px; color: #2ecc71; font-size: 16px;">Game Controls:</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px;">
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">E</span>
                            <span>Spawn 5 enemies</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">R</span>
                            <span>Restart after death</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span class="key" style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 4px; padding: 2px 6px; margin-right: 5px; min-width: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">TAB</span>
                            <span>Show/hide leaderboard</span>
                        </div>
                    </div>
                </div>

                <p style="margin-bottom: 0; font-style: italic; text-align: center; font-size: 12px; opacity: 0.7; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 4px;">
                    Click this panel to close
                </p>
            `;
        }

        // Add click event to hide the panel
        this.panel.addEventListener('click', () => {
            this.hide();
        });

        // Initially hide the panel
        this.panel.style.display = 'none';
        this.panel.style.opacity = '0';

        // Add to document
        document.body.appendChild(this.panel);
    }

    /**
     * Show the instructions panel
     */
    show() {
        this.panel.style.display = 'block';

        // Use setTimeout to ensure the transition works
        setTimeout(() => {
            this.panel.style.opacity = '1';

            // Emit event that instructions are shown
            if (this.eventBus) {
                this.eventBus.emit('instructions.shown');
            }
        }, 10);
    }

    /**
     * Hide the instructions panel
     */
    hide() {
        this.panel.style.opacity = '0';

        // Emit event that instructions are being hidden
        if (this.eventBus) {
            this.eventBus.emit('instructions.hidden');

            // Also emit an event to start the game
            this.eventBus.emit('game.start');
        }

        // Remove from DOM after transition
        setTimeout(() => {
            this.panel.style.display = 'none';
        }, 300);
    }
} 