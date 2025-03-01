// Core Game Controller
import SceneManager from '../scene/SceneManager.js';
import InputManager from './InputManager.js';
import AudioManager from '../audio/AudioManager.js';
import UIManager from '../ui/UIManager.js';
import PlaneFactory from '../entities/PlaneFactory.js';
import EventBus from './EventBus.js';

export default class Game {
    constructor() {
        console.log('Initializing Game...');

        // Create event bus for communication between modules
        this.eventBus = new EventBus();

        // Create core systems
        this.sceneManager = new SceneManager(this.eventBus);
        this.inputManager = new InputManager(this.eventBus);
        this.audioManager = new AudioManager(this.eventBus);
        this.uiManager = new UIManager(this.eventBus);

        // Performance tracking
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.lastFpsUpdateTime = 0;

        // Initialize the game
        this.init();
    }

    init() {
        console.log('Game init...');

        // Initialize managers
        this.sceneManager.init();
        this.inputManager.init();
        this.uiManager.init();

        // Create the player's plane (after scene is initialized)
        console.log('Creating player plane...');
        const planeFactory = new PlaneFactory(this.sceneManager.scene, this.eventBus);
        this.plane = planeFactory.createWW2Plane();
        console.log('Player plane created:', this.plane);
        this.sceneManager.setMainActor(this.plane);

        // Initialize audio (after plane is created)
        this.audioManager.init();

        // Setup window resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Start the game loop
        this.animate();

        // Show instructions
        this.uiManager.showInstructions();
    }

    animate(currentTime = 0) {
        // Schedule next frame
        requestAnimationFrame(this.animate.bind(this));

        // Calculate time delta for smooth animation
        this.deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1); // Cap at 0.1 to prevent huge jumps
        this.lastFrameTime = currentTime;

        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.lastFpsUpdateTime >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / (currentTime - this.lastFpsUpdateTime));
            this.frameCount = 0;
            this.lastFpsUpdateTime = currentTime;
            // Dispatch FPS update event
            this.eventBus.emit('fps.update', this.fps);
        }

        // Update all game systems
        this.update();

        // Render the scene
        this.sceneManager.render();
    }

    update() {
        // Update the plane first
        if (this.plane) {
            this.plane.update(this.deltaTime, this.inputManager.getInputState());
        }

        // Update scene elements (camera, environment, etc.)
        this.sceneManager.update(this.deltaTime);

        // Update audio based on game state
        this.audioManager.update(this.plane);

        // Update UI elements
        this.uiManager.update(this.plane, this.fps);
    }

    onWindowResize() {
        this.sceneManager.onResize();
    }
} 