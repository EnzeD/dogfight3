// Core Game Controller
import * as THREE from 'three';
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

        // Initialize array to hold all planes (player and enemies)
        this.planes = [];
        this.enemyPlanes = [];

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
        this.playerPlane = planeFactory.createWW2Plane();
        this.planes.push(this.playerPlane);
        console.log('Player plane created:', this.playerPlane);
        this.sceneManager.setMainActor(this.playerPlane);

        // Create an enemy plane
        console.log('Creating enemy plane...');
        this.createEnemyPlane(planeFactory, new THREE.Vector3(20, 30, -20));

        // Initialize audio (after plane is created)
        this.audioManager.init();

        // Setup window resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Start the game loop
        this.animate();

        // Show instructions
        this.uiManager.showInstructions();
    }

    /**
     * Creates an enemy plane at the specified position
     * @param {PlaneFactory} planeFactory - The factory to use for creating planes
     * @param {THREE.Vector3} position - The position to place the enemy plane
     */
    createEnemyPlane(planeFactory, position) {
        const enemyPlane = planeFactory.createEnemyPlane();

        // Set initial position
        enemyPlane.mesh.position.copy(position);

        // Store the enemy plane
        this.enemyPlanes.push(enemyPlane);
        this.planes.push(enemyPlane);

        console.log('Enemy plane created at position:', position);
        return enemyPlane;
    }

    animate(currentTime = 0) {
        // Schedule next frame
        requestAnimationFrame(this.animate.bind(this));

        // Calculate time delta for smooth animation
        this.deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1); // Cap at 0.1 to prevent huge jumps
        this.lastFrameTime = currentTime;

        // Update FPS counter
        this.frameCount++;

        if (currentTime - this.lastFpsUpdateTime > 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdateTime));
            this.frameCount = 0;
            this.lastFpsUpdateTime = currentTime;
            // Dispatch FPS update event
            this.eventBus.emit('fps.update', this.fps);
        }

        // Update game state
        this.update();

        // Render the scene
        this.sceneManager.render();
    }

    update() {
        // Update the player plane
        if (this.playerPlane) {
            this.playerPlane.update(this.deltaTime, this.inputManager.getInputState());
        }

        // Update enemy planes
        for (const enemyPlane of this.enemyPlanes) {
            if (this.playerPlane) {
                // Pass player position to enemy AI
                enemyPlane.update(this.deltaTime, null, this.playerPlane.mesh.position);
            } else {
                enemyPlane.update(this.deltaTime, null);
            }
        }

        // Update scene elements (camera, environment, etc.)
        this.sceneManager.update(this.deltaTime);

        // Update audio based on game state
        this.audioManager.update(this.playerPlane);

        // Update UI elements
        this.uiManager.update(this.playerPlane, this.fps);
    }

    onWindowResize() {
        this.sceneManager.onResize();
    }
} 