// Player Count Display for showing number of connected players
export default class PlayerCountDisplay {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.countText = null;
        this.playerCount = 0;

        // Create the player count display
        this.createPlayerCountDisplay();

        // Set up event listeners
        this.setupEventListeners();
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
        this.container.style.bottom = '80px'; // Position above the health display
        this.container.style.right = '10px'; // Align with the right edge
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.color = 'white';
        this.container.style.padding = '10px';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.fontSize = '14px';
        this.container.style.borderRadius = '8px';
        this.container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        this.container.style.backdropFilter = 'blur(5px)';
        this.container.style.border = '1px solid rgba(255,255,255,0.1)';
        this.container.style.width = '250px'; // Match the width of health display
        this.container.style.zIndex = '1000';

        // Create player count content
        this.container.innerHTML = `
            <div style="margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>Pilots in Battle:</strong></span>
                    <span id="player-count-value">1</span>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.container);

        // Get reference to the count text element
        this.countText = document.getElementById('player-count-value');
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