// Player Count Display for showing number of connected players
export default class PlayerCountDisplay {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.countText = null;
        this.playerCount = 0;
        this.isMobile = this.checkIfMobile();

        // Create the player count display
        this.createPlayerCountDisplay();

        // Set up event listeners
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
     * Create the player count display container and elements
     */
    createPlayerCountDisplay() {
        // Create container element
        this.container = document.createElement('div');
        this.container.id = 'player-count-container';

        // Style the container
        this.container.style.position = 'absolute';

        // Position in top left for all devices
        this.container.style.top = '15px';
        this.container.style.left = '15px';

        // Check for notched devices (like iPhone X and newer)
        if (this.hasNotch()) {
            this.container.style.top = 'max(15px, env(safe-area-inset-top) + 5px)';
            this.container.style.left = 'max(15px, env(safe-area-inset-left) + 5px)';
        }

        // Adjust size based on device type
        if (this.isMobile) {
            this.container.style.width = 'auto'; // Auto width for mobile
            this.container.style.fontSize = '12px'; // Smaller font on mobile
            this.container.style.padding = '5px 10px';
        } else {
            this.container.style.width = 'auto';
            this.container.style.fontSize = '14px';
            this.container.style.padding = '6px 12px';
        }

        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.borderRadius = '8px';
        this.container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        this.container.style.backdropFilter = 'blur(5px)';
        this.container.style.border = '1px solid rgba(255,255,255,0.1)';
        this.container.style.zIndex = '1000';
        this.container.style.textAlign = 'center'; // Center text

        // Create player count content - simplified for all devices
        this.container.innerHTML = `
            <div style="display: flex; align-items: center;">
                <span><strong>Pilots:</strong> <span id="player-count-value">1</span></span>
            </div>`;

        // Add to document
        document.body.appendChild(this.container);

        // Get reference to the count text element
        this.countText = document.getElementById('player-count-value');
    }

    /**
     * Check if device has a notch (like iPhone X and newer)
     * @returns {boolean} True if the device likely has a notch
     */
    hasNotch() {
        // Check if CSS environment variables are supported
        return typeof CSS !== 'undefined' && CSS.supports('padding-top: env(safe-area-inset-top)');
    }

    /**
     * Set up event listeners for player count updates
     */
    setupEventListeners() {
        // Listen for player count updates from server
        this.eventBus.on('network.playerCount', (data) => {
            this.updatePlayerCount(data.count);
        });
    }

    /**
     * Update the player count display
     * @param {number} count - Number of connected players
     */
    updatePlayerCount(count) {
        this.playerCount = count;

        // Update text
        if (this.countText) {
            this.countText.textContent = count;

            // Change color based on player count
            if (count > 5) {
                this.countText.style.color = '#2ecc71'; // Green for lots of players
            } else if (count > 2) {
                this.countText.style.color = '#f1c40f'; // Yellow for a few players
            } else {
                this.countText.style.color = '#e74c3c'; // Red for few/no players
            }
        }
    }
} 