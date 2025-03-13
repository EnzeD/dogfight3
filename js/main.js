// WW2 Dogfight Arena - Main Entry Point
import Game from './core/Game.js';
import LandingPage from './ui/LandingPage.js';

let previewGame = null;
let activeGame = null;

/**
 * Detects if the user is on a mobile device
 * @returns {boolean} True if mobile device is detected
 */
function isMobileDevice() {
    // Check for common mobile user agent patterns
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUserAgent = mobileRegex.test(navigator.userAgent);

    // Additional check for screen size/touch points
    const hasTouchScreen = (
        ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
        ('msMaxTouchPoints' in navigator && navigator.msMaxTouchPoints > 0)
    );
    const isSmallScreen = window.innerWidth < 768;

    return isMobileUserAgent || (hasTouchScreen && isSmallScreen);
}

/**
 * Creates and displays a message for mobile users
 */
function showMobileMessage() {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'mobile-message';
    messageContainer.innerHTML = `
        <div class="mobile-message-content">
            <h2>Desktop Only Game</h2>
            <p>WW2 Dogfight Arena is designed for desktop computers with keyboard and mouse controls.</p>
            <p>Please visit this site on a computer for the best experience.</p>
        </div>
    `;

    // Add inline styles for the message
    const style = document.createElement('style');
    style.textContent = `
        .mobile-message {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
        }
        .mobile-message-content {
            max-width: 80%;
            padding: 20px;
            background-color: rgba(50, 50, 50, 0.8);
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }
        .mobile-message h2 {
            color: #ffcc00;
            margin-top: 0;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(messageContainer);
}

/**
 * Starts the game with the selected options
 * @param {Object} options - Game options from landing page
 * @param {string} options.mode - Game mode ('solo' or 'multi')
 * @param {string} options.callsign - Player's callsign (for multiplayer)
 * @param {boolean} options.isMobile - Whether the player is on a mobile device
 * @param {string} options.mobileQuality - Quality setting for mobile ('ultra-low', 'low')
 */
function startGame(options) {
    console.log('Starting game with options:', options);

    // Clean up preview game if it exists
    if (previewGame) {
        // Remove the preview game's canvas
        const oldCanvas = document.querySelector('canvas');
        if (oldCanvas) {
            oldCanvas.remove();
        }
        previewGame = null;
    }

    // Handle different game modes - UPDATE URL FIRST before creating game
    if (options.mode === 'multi') {
        console.log('Starting multiplayer mode with callsign:', options.callsign);

        // Set URL parameter for multiplayer mode
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('multiplayer', 'true');

        // Update URL without reloading page
        window.history.pushState({}, '', currentUrl);
    } else {
        console.log('Starting solo mode');

        // Ensure multiplayer parameter is removed for solo mode
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('multiplayer');

        // Update URL without reloading page
        window.history.pushState({}, '', currentUrl);
    }

    // FIRST create a temp game options object
    const gameOptions = {
        playerCallsign: options.mode === 'multi' ? options.callsign : null,
        isMobile: options.isMobile || false,
        mobileQuality: options.mobileQuality || null
    };

    // Initialize game with options AFTER URL parameters are set
    activeGame = new Game(false, gameOptions);

    // Store game instance globally for debugging if needed
    window.game = activeGame;

    // Store callsign for network manager if in multiplayer mode
    if (options.mode === 'multi' && options.callsign) {
        console.log('Setting player callsign on game instance:', options.callsign);
        activeGame.playerCallsign = options.callsign;

        // Add a diagnostic timeout to check if the callsign is set on the game
        setTimeout(() => {
            console.log('DIAGNOSTIC: Game playerCallsign is:', activeGame.playerCallsign);

            // Check if NetworkManager exists and has the callsign
            if (activeGame.networkManager) {
                console.log('DIAGNOSTIC: NetworkManager playerCallsign is:', activeGame.networkManager.playerCallsign);
            } else {
                console.log('DIAGNOSTIC: NetworkManager not yet initialized');
            }
        }, 2000);
    }

    // Call the new startGame method to properly set game state
    activeGame.startGame();
}

// Initialize the game once the window loads
window.addEventListener('load', () => {
    // Check if user is on a mobile device
    const isMobile = isMobileDevice();
    console.log('Mobile device detected:', isMobile);

    // Create and show landing page - now the landing page handles mobile detection and options
    const landingPage = new LandingPage(startGame);
    landingPage.show();

    // Only create preview game if not on mobile to save resources
    if (!isMobile) {
        console.log('Starting preview mode');
        previewGame = new Game(true);
    }
}); 