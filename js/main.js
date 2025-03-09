// WW2 Dogfight Arena - Main Entry Point
import Game from './core/Game.js';
import LandingPage from './ui/LandingPage.js';

let previewGame = null;
let activeGame = null;

// Add iOS detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
console.log('Device detection:', {
    userAgent: navigator.userAgent,
    isIOS: isIOS,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    hasTouch: 'ontouchstart' in window
});

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
 * Displays diagnostic information on the screen
 */
function showDiagnosticInfo() {
    const diagContainer = document.createElement('div');
    diagContainer.className = 'diagnostic-info';
    diagContainer.style.position = 'fixed';
    diagContainer.style.top = '10px';
    diagContainer.style.left = '10px';
    diagContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
    diagContainer.style.color = '#fff';
    diagContainer.style.padding = '10px';
    diagContainer.style.borderRadius = '5px';
    diagContainer.style.fontSize = '12px';
    diagContainer.style.fontFamily = 'monospace';
    diagContainer.style.zIndex = '10000';
    diagContainer.style.maxWidth = '80%';

    // Fill with diagnostic info
    diagContainer.innerHTML = `
        <div>User Agent: ${navigator.userAgent}</div>
        <div>Screen: ${window.innerWidth}x${window.innerHeight} (${window.devicePixelRatio}x)</div>
        <div>iOS: ${isIOS ? 'Yes' : 'No'}</div>
        <div>Touch: ${'ontouchstart' in window ? 'Yes' : 'No'}</div>
        <div id="webgl-info">WebGL: Checking...</div>
        <div id="audio-info">Audio: Waiting...</div>
    `;

    document.body.appendChild(diagContainer);

    // Check WebGL
    setTimeout(() => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            const webglInfo = document.getElementById('webgl-info');

            if (gl) {
                const info = {
                    vendor: gl.getParameter(gl.VENDOR),
                    renderer: gl.getParameter(gl.RENDERER),
                    version: gl.getParameter(gl.VERSION)
                };
                webglInfo.innerHTML = `WebGL: Available<br>- ${info.vendor}<br>- ${info.renderer}`;
            } else {
                webglInfo.innerHTML = 'WebGL: Not available';
                webglInfo.style.color = '#ff5555';
            }
        } catch (e) {
            const webglInfo = document.getElementById('webgl-info');
            webglInfo.innerHTML = `WebGL: Error (${e.message})`;
            webglInfo.style.color = '#ff5555';
        }
    }, 1000);

    // Update audio status
    window.updateAudioStatus = (status) => {
        const audioInfo = document.getElementById('audio-info');
        if (audioInfo) {
            audioInfo.innerHTML = `Audio: ${status}`;
        }
    };
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

    // Remove any potential mobile overlays or touch blockers
    // This helps ensure iOS devices can interact with the game
    removeAllMobileOverlays();

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
        playerCallsign: options.mode === 'multi' ? options.callsign : null
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
}

/**
 * Removes all mobile overlays and touch blockers
 */
function removeAllMobileOverlays() {
    // Check if we're on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // List of selectors that might be blocking touches
    const overlaySelectors = [
        '.mobile-message',
        '.touch-controls-tutorial',
        '.touch-control-hint',
        '#mobile-fire-button',
        '.mobile-fire-button',
        '.tutorial-content',
        '.tutorial-close',
        // Desktop UI elements shown in screenshot
        '.instructions-panel',
        '.flight-info',
        '.health-display',
        '.debug-panel',
        '.settings-panel',
        '.leaderboard-display',
        '.multiplayer-status',
        '.notification-container'
    ];

    // Remove each type of overlay
    overlaySelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
                console.log(`Removed overlay: ${selector}`);
            }
        });
    });

    // Also check for any fixed position elements that might be overlays
    document.querySelectorAll('div[style*="position: fixed"]').forEach(el => {
        // Only remove if it matches typical overlay patterns or if we're on mobile
        if (el.className && (
            el.className.includes('tutorial') ||
            el.className.includes('hint') ||
            el.className.includes('mobile') ||
            el.className.includes('message') ||
            (isMobile && (
                el.className.includes('panel') ||
                el.className.includes('info') ||
                el.className.includes('display') ||
                el.className.includes('hud') ||
                el.className.includes('status')
            ))
        )) {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
                console.log('Removed fixed position overlay');
            }
        }
    });

    // For mobile devices, add a CSS rule to hide all desktop UI
    if (isMobile && !document.getElementById('hide-desktop-ui')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'hide-desktop-ui';
        styleElement.textContent = `
            /* Hide all desktop UI on mobile */
            .instructions-panel,
            .flight-info,
            .health-display,
            .debug-panel,
            .settings-panel,
            .leaderboard-display,
            .multiplayer-status,
            .notification-container,
            div[id*="panel"],
            div[id*="info"],
            div[id*="hud"],
            div[id*="display"],
            div[id*="status"] {
                display: none !important;
            }
        `;
        document.head.appendChild(styleElement);
    }
}

// Initialize the game once the window loads
window.addEventListener('load', () => {
    console.log('Window loaded, initializing game...');

    // Clean up any mobile UI that might still be present
    const mobileElements = document.querySelectorAll('.mobile-fire-button, .touch-control-hint, .touch-controls-tutorial');
    mobileElements.forEach(el => {
        if (el) el.remove();
    });

    try {
        // MOBILE COMPATIBILITY: Now allowing mobile devices to run the game for testing
        console.log('Starting preview mode and showing game mode selection screen');

        // Create preview game instance
        previewGame = new Game(true);

        // Create and show landing page
        const landingPage = new LandingPage(startGame);
        landingPage.show();
    } catch (error) {
        console.error('Error initializing game:', error);

        // Show a user-friendly error message
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h2>Game Initialization Error</h2>
                <p>There was a problem loading the game. This might be due to compatibility issues with your device.</p>
                <p>Error details: ${error.message}</p>
                <button id="retry-button">Retry</button>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .error-message {
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
            .error-content {
                max-width: 80%;
                padding: 20px;
                background-color: rgba(50, 50, 50, 0.8);
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            }
            .error-content h2 {
                color: #ffcc00;
                margin-top: 0;
            }
            #retry-button {
                background-color: #ffcc00;
                color: #000;
                border: none;
                padding: 10px 20px;
                margin-top: 15px;
                cursor: pointer;
                font-weight: bold;
                border-radius: 5px;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(errorContainer);

        // Add retry button functionality
        document.getElementById('retry-button').addEventListener('click', () => {
            window.location.reload();
        });
    }
}); 