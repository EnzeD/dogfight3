// LeaderboardDisplay.js - Displays leaderboard with player stats
export default class LeaderboardDisplay {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.visible = false;
        this.leaderboardData = [];
        this.isPlayerDead = false;
        this.manuallyToggled = false;

        // Create DOM elements
        this.createElements();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Create DOM elements for the leaderboard
     */
    createElements() {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'leaderboard-container';
        this.container.style.display = 'none';

        // Set these attributes to prevent focus/tab issues
        this.container.setAttribute('tabindex', '-1');
        this.container.setAttribute('aria-hidden', 'true');

        // Create header
        const header = document.createElement('div');
        header.className = 'leaderboard-header';
        header.innerHTML = '<h2>LEADERBOARD</h2>';

        // Create table
        this.table = document.createElement('table');
        this.table.className = 'leaderboard-table';

        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Rank</th>
                <th>Pilot</th>
                <th>Kills</th>
                <th>Deaths</th>
                <th>K/D</th>
                <th>Time (min)</th>
            </tr>
        `;

        // Create table body
        this.tbody = document.createElement('tbody');

        // Assemble table
        this.table.appendChild(thead);
        this.table.appendChild(this.tbody);

        // Assemble container
        this.container.appendChild(header);
        this.container.appendChild(this.table);

        // Add to document
        document.body.appendChild(this.container);

        // Add styles
        this.addStyles();
    }

    /**
     * Add CSS styles for the leaderboard
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .leaderboard-container {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.85);
                border: 2px solid #446688;
                border-radius: 8px;
                padding: 20px;
                color: #ffffff;
                font-family: 'Arial', sans-serif;
                min-width: 600px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                z-index: 1000;
            }
            
            .leaderboard-header {
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #446688;
                padding-bottom: 10px;
            }
            
            .leaderboard-header h2 {
                margin: 0;
                color: #88aadd;
                font-size: 24px;
            }
            
            .leaderboard-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .leaderboard-table th,
            .leaderboard-table td {
                padding: 10px;
                text-align: center;
                border-bottom: 1px solid #333;
            }
            
            .leaderboard-table th {
                background-color: #2a465e;
                color: #ffffff;
            }
            
            .leaderboard-table tbody tr:nth-child(odd) {
                background-color: rgba(50, 50, 50, 0.4);
            }
            
            .leaderboard-table tbody tr:nth-child(even) {
                background-color: rgba(40, 40, 40, 0.4);
            }
            
            .leaderboard-table tbody tr:hover {
                background-color: rgba(70, 100, 140, 0.4);
            }
            
            .leaderboard-table .current-player {
                background-color: rgba(60, 120, 180, 0.4) !important;
                font-weight: bold;
            }
            
            .leaderboard-table .highlight {
                color: #ffaa33;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for leaderboard data updates
        this.eventBus.on('leaderboard.update', (data) => {
            this.updateLeaderboard(data);
        });

        // Listen for toggle leaderboard command (TAB key)
        this.eventBus.on('leaderboard.toggle', () => {
            this.toggleVisibility();
        });

        // Listen for player destroyed event to automatically show leaderboard
        this.eventBus.on('plane.destroyed', (data, source) => {
            if (source === 'player') {
                this.isPlayerDead = true;
                this.show();
            }
        });

        // Listen for player respawn to hide leaderboard if it was auto-shown
        this.eventBus.on('game.restarted', () => {
            this.isPlayerDead = false;
            // Hide leaderboard upon respawn only if we didn't manually toggle it
            if (this.visible && !this.manuallyToggled) {
                this.hide();
            }
        });

        // Add global event to prevent TAB from manipulating focus within game elements
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Tab' && this.visible) {
                // Prevent default focus behavior when leaderboard is shown
                event.preventDefault();
                return false;
            }
        });
    }

    /**
     * Update the leaderboard with new data
     * @param {Array} data - Leaderboard data
     */
    updateLeaderboard(data) {
        // Store the data
        this.leaderboardData = data;

        // Only update DOM if visible
        if (this.visible) {
            this.renderLeaderboard();
        }
    }

    /**
     * Render the leaderboard with current data
     */
    renderLeaderboard() {
        // Clear the table body
        this.tbody.innerHTML = '';

        // Get the client ID to highlight current player
        const clientId = this.eventBus.clientId;

        // Add rows for each player
        this.leaderboardData.forEach((player, index) => {
            const row = document.createElement('tr');

            // Add 'current-player' class if this is the current player
            if (player.id === clientId) {
                row.className = 'current-player';
            }

            // Add row content
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${player.callsign}</td>
                <td class="highlight">${player.kills}</td>
                <td>${player.deaths}</td>
                <td>${player.kdRatio}</td>
                <td>${player.timeOnServer}</td>
            `;

            this.tbody.appendChild(row);
        });
    }

    /**
     * Toggle leaderboard visibility
     */
    toggleVisibility() {
        // Set flag to indicate manual toggle
        this.manuallyToggled = !this.visible;

        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show the leaderboard
     */
    show() {
        this.visible = true;
        this.container.style.display = 'block';
        this.renderLeaderboard();

        // Request fresh data from server
        this.eventBus.emit('network.request.leaderboard');
    }

    /**
     * Hide the leaderboard
     */
    hide() {
        this.visible = false;
        this.container.style.display = 'none';
    }

    /**
     * Check if the leaderboard is currently visible
     * @returns {boolean} Visibility state
     */
    isVisible() {
        return this.visible;
    }
} 