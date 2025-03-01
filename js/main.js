// WW2 Dogfight Arena - Main Entry Point
import Game from './core/Game.js';

// Initialize the game once the window loads
window.addEventListener('load', () => {
    console.log('Game loading...');
    const game = new Game();
    // Store the game instance globally for debugging if needed
    window.game = game;
}); 