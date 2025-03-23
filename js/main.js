// WW2 Dogfight Arena - Main Entry Point
import Game from './core/Game.js';
import LandingPage from './ui/LandingPage.js';
import QualitySettings from './utils/QualitySettings.js';

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
 * Parses URL parameters to check for portal entry
 * @returns {Object|null} Portal entry data or null if not from portal
 */
function checkPortalEntry() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('portal') === 'true') {
        return {
            isPortal: true,
            name: urlParams.get('username') || 'PortalPlayer',
        };
    }

    return null;
}

/**
 * Creates and displays a message for mobile users
 */
function showMobileMessage() {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'mobile-message';

    // Get current quality setting
    const qualitySettings = new QualitySettings();
    const currentQuality = qualitySettings.getQuality();

    messageContainer.innerHTML = `
        <div class="mobile-message-content">
            <h2>Mobile Device Detected</h2>
            <p>You're playing WW2 Dogfight Arena on a mobile device. The game has been optimized for mobile.</p>
            <p>Current quality setting: <strong>${currentQuality.toUpperCase()}</strong></p>
            <p>We recommend either:</p>
            <ul style="text-align: left; padding-left: 30px; margin: 5px 0;">
                <li><strong>Low:</strong> Best performance, basic graphics</li>
                <li><strong>Medium:</strong> High-quality clouds, more enemies (20), with anti-aliasing and shadows</li>
            </ul>
            <p>You can change settings in the game menu (ESC key).</p>
            <button id="continue-button">Continue to Game</button>
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
            max-width: 85%;
            padding: 20px;
            background-color: rgba(50, 50, 50, 0.8);
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }
        .mobile-message h2 {
            color: #ffcc00;
            margin-top: 0;
            font-size: 1.5rem;
        }
        .mobile-message p {
            font-size: 0.9rem;
            line-height: 1.4;
            margin: 10px 0;
        }
        #continue-button {
            background-color: #8b0000;
            color: #fff;
            border: none;
            padding: 10px 20px;
            font-size: 1rem;
            cursor: pointer;
            border-radius: 5px;
            margin-top: 15px;
            transition: background-color 0.3s;
        }
        #continue-button:hover {
            background-color: #b20000;
        }
        @media only screen and (max-height: 500px) {
            .mobile-message h2 {
                font-size: 1.2rem;
                margin: 5px 0;
            }
            .mobile-message p {
                font-size: 0.8rem;
                margin: 5px 0;
            }
            #continue-button {
                padding: 8px 16px;
                font-size: 0.9rem;
                margin-top: 10px;
            }
            .mobile-message-content {
                padding: 15px;
            }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(messageContainer);

    // Add event listener for continue button
    document.getElementById('continue-button').addEventListener('click', () => {
        // Remove the message
        messageContainer.remove();
        style.remove();

        // Start the game
        startPreviewAndLanding();
    });
}

/**
 * Starts the preview and landing page
 */
function startPreviewAndLanding() {
    console.log('Starting preview mode and showing game mode selection screen');

    // Create preview game instance
    previewGame = new Game(true);

    // Create and show landing page
    const landingPage = new LandingPage(startGame);
    landingPage.show();
}

/**
 * Starts the game with the selected options
 * @param {Object} options - Game options from landing page
 * @param {string} options.mode - Game mode ('solo' or 'multi')
 * @param {string} options.callsign - Player's callsign (for multiplayer)
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
        // If this is a portal entry, include additional options
        isPortalEntry: options.isPortalEntry || false,
        startInFlight: options.startInFlight || false,
        initialSpeed: options.initialSpeed || 0
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

// Handle portal entry directly - bypassing normal flow
function handlePortalEntry(portalData) {
    console.log('Portal entry detected:', portalData);

    // Create options object similar to what LandingPage would provide
    const options = {
        mode: 'multi',
        callsign: portalData.name,
        isPortalEntry: true,
        startInFlight: true,
        initialSpeed: 0.6 // 60% of max speed
    };

    // Start the game with these options, bypassing landing page
    startGame(options);
}

// Initialize the game once the window loads
window.addEventListener('load', () => {
    // First check for portal entry
    const portalData = checkPortalEntry();

    if (portalData) {
        // Handle portal entry immediately
        handlePortalEntry(portalData);
        return;
    }

    // Continue with normal startup flow
    // Check if user is on a mobile device
    if (isMobileDevice()) {
        console.log('Mobile device detected, optimizing settings');

        // Ensure low quality setting for mobile users to prevent crashes
        try {
            // Force low quality for mobile - only if user hasn't explicitly set a quality preference
            const qualitySettings = new QualitySettings();
            if (!localStorage.getItem('dogfight_quality')) {
                console.log('Setting quality to low for mobile device');
                qualitySettings.setQuality('low');
            } else {
                console.log('Using saved quality setting: ' + qualitySettings.getQuality());
                // If user has high quality saved, recommend low
                if (qualitySettings.getQuality() === 'high') {
                    console.warn('High quality detected on mobile. Consider switching to low quality for better performance.');
                }
            }
        } catch (e) {
            console.error('Error setting quality for mobile:', e);
        }

        // Skip the mobile message and directly start the game
        startPreviewAndLanding();
    } else {
        // Start preview and show landing page for desktop users
        startPreviewAndLanding();
    }
}); 