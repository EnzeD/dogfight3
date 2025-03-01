// WW2 Dogfight Arena - Main Entry Point
import Game from './core/Game.js';

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

// Initialize the game once the window loads
window.addEventListener('load', () => {
    // Check if user is on a mobile device
    if (isMobileDevice()) {
        console.log('Mobile device detected, showing message instead of loading game');
        showMobileMessage();
    } else {
        console.log('Game loading...');
        const game = new Game();
        // Store the game instance globally for debugging if needed
        window.game = game;
    }
}); 