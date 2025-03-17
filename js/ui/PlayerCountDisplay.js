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

        // The Health bar is at bottom: 10px, right: 10px
        // Increase spacing to prevent overlap
        this.container.style.bottom = '75px'; // Increased from 55px to 75px to prevent overlap
        this.container.style.right = '10px';  // Aligned with health bar

        // Check for notched devices (like iPhone X and newer)
        if (this.hasNotch()) {
            this.container.style.bottom = 'max(75px, env(safe-area-inset-bottom) + 75px)';
            this.container.style.right = 'max(10px, env(safe-area-inset-right) + 5px)';
        }

        // Match the styling with the health/heat displays
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.fontSize = '12px';
        this.container.style.padding = '5px 10px';
        this.container.style.borderRadius = '8px';
        this.container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        this.container.style.backdropFilter = 'blur(5px)';
        this.container.style.border = '1px solid rgba(255,255,255,0.1)';
        this.container.style.zIndex = '1000';
        this.container.style.textAlign = 'center';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.width = 'auto';
        this.container.style.transform = 'translateZ(0)'; // Hardware acceleration

        // Create player count content with styling matching health/heat displays
        this.container.innerHTML = `
            <span style="font-size: 10px; opacity: 0.8;">PILOTS</span>
            <span id="player-count-value" style="font-size: 11px; font-weight: bold; margin-top: 3px;">1</span>
        `;

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

            // Change color based on player count with smoother transitions
            this.countText.style.transition = 'color 0.3s ease';
            if (count > 5) {
                this.countText.style.color = '#2ecc71'; // Green for lots of players
            } else if (count > 2) {
                this.countText.style.color = '#f1c40f'; // Yellow for a few players
            } else {
                this.countText.style.color = '#FFD700'; // Gold for few players (changed from red)
            }
        }
    }
} 