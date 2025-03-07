// Core Game Controller
import * as THREE from 'three';
import SceneManager from '../scene/SceneManager.js';
import InputManager from './InputManager.js';
import AudioManager from '../audio/AudioManager.js';
import UIManager from '../ui/UIManager.js';
import PlaneFactory from '../entities/PlaneFactory.js';
import EventBus from './EventBus.js';
import NetworkManager from './NetworkManager.js';
import PerformanceMonitor from '../utils/PerformanceMonitor.js';
import QualitySettings from '../utils/QualitySettings.js';

export default class Game {
    constructor() {
        console.log('Initializing Game...');

        // Create event bus for communication between modules
        this.eventBus = new EventBus();

        // Initialize quality settings
        this.qualitySettings = new QualitySettings();
        console.log(`Game quality set to: ${this.qualitySettings.getQuality()}`);

        // Create core systems
        this.sceneManager = new SceneManager(this.eventBus, this.qualitySettings);
        this.inputManager = new InputManager(this.eventBus);
        this.audioManager = new AudioManager(this.eventBus);
        this.uiManager = new UIManager(this.eventBus, this.qualitySettings);
        this.performanceMonitor = new PerformanceMonitor(this.eventBus);

        // Performance tracking
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.lastFpsUpdateTime = 0;

        // Debug performance metrics
        this.perfMetrics = {
            frameTime: 0,
            renderTime: 0,
            updateTime: 0,
            jsHeapSize: 0,
            jsHeapSizeLimit: 0,
            jsHeapSizeUsed: 0,
            objectCount: 0,
            triangleCount: 0
        };
        this.lastMetricsUpdateTime = 0;
        this.debugEnabled = false;

        // Game state
        this.isPaused = false;

        // Initialize array to hold all planes (player and enemies)
        this.planes = [];
        this.enemyPlanes = [];

        // Multiplayer status
        this.isMultiplayer = false;
        this.networkManager = null;

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

        // Store reference to player plane in eventBus for proper event source identification
        this.eventBus.playerPlane = this.playerPlane;

        // Only create an AI enemy in single player mode
        if (!this.isMultiplayer) {
            console.log('Creating enemy plane...');
            this.createEnemyPlane(planeFactory, new THREE.Vector3(20, 30, -20));
        }

        // Initialize multiplayer if enabled by URL param
        this.checkMultiplayerMode();

        // Initialize audio (after plane is created)
        this.audioManager.init();

        // Setup window resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Listen for debug visibility changes
        this.eventBus.on('debug.visibility', (isVisible) => {
            this.debugEnabled = isVisible;
        });

        // Listen for game pause/resume events
        this.eventBus.on('game.pause', () => this.pauseGame());
        this.eventBus.on('game.resume', () => this.resumeGame());

        // Listen for input actions
        this.eventBus.on('input.action', (data) => {
            if (data.action === 'spawnEnemies' && data.state === 'down') {
                this.spawnMultipleEnemies(20);
            } else if (data.action === 'displayHealth' && data.state === 'down') {
                this.displayHealthDebug();
            } else if (data.action === 'debugDamage' && data.state === 'down') {
                this.debugDamagePlayer();
            } else if (data.action === 'debugHeal' && data.state === 'down') {
                this.debugHealPlayer();
            }
        });

        // Start the game loop
        this.animate();

        // Show instructions
        this.uiManager.showInstructions();
    }

    /**
     * Check if multiplayer mode is enabled via URL parameter
     */
    checkMultiplayerMode() {
        const urlParams = new URLSearchParams(window.location.search);
        this.isMultiplayer = urlParams.has('multiplayer');

        if (this.isMultiplayer) {
            console.log('Initializing multiplayer mode');

            // Create network manager
            this.networkManager = new NetworkManager(this.eventBus, this.playerPlane);

            // Connect to server
            const serverUrl = urlParams.get('server') || 'ws://141.95.17.225:8080';
            this.eventBus.emit('network.connect', { serverUrl });

            // Add multiplayer UI indicators
            this.uiManager.showMultiplayerStatus(true);

            // Add toggle for multiplayer connection
            document.addEventListener('keydown', (event) => {
                if (event.key.toLowerCase() === 'p') {
                    if (this.networkManager.connected) {
                        this.eventBus.emit('network.disconnect');
                    } else {
                        this.eventBus.emit('network.connect', { serverUrl });
                    }
                }
            });
        } else {
            console.log('Running in single player mode');
        }
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

    /**
     * Creates multiple enemy planes at random positions around the player
     * @param {number} count - Number of enemy planes to create
     */
    spawnMultipleEnemies(count = 20) {
        // Only allow in single player mode
        if (this.isMultiplayer) {
            console.log('Cannot spawn enemies in multiplayer mode');
            return;
        }

        console.log(`Spawning ${count} enemy planes...`);
        const planeFactory = new PlaneFactory(this.sceneManager.scene, this.eventBus);

        // Get player position as reference
        const playerPos = this.playerPlane.mesh.position.clone();

        // Spawn enemies in a distributed pattern around the player
        for (let i = 0; i < count; i++) {
            // Calculate random position around player
            // Random radius between 150 and 400 units
            const radius = 150 + Math.random() * 250;
            // Random angle around player (full circle)
            const angle = Math.random() * Math.PI * 2;
            // Random height between 100 and 300 units above player
            const height = playerPos.y + 100 + Math.random() * 200;

            // Calculate position
            const x = playerPos.x + Math.cos(angle) * radius;
            const z = playerPos.z + Math.sin(angle) * radius;

            // Create enemy plane at this position
            this.createEnemyPlane(planeFactory, new THREE.Vector3(x, height, z));
        }

        // Notify player
        this.eventBus.emit('notification', {
            message: `${count} enemy planes have entered the area!`,
            duration: 3000
        });
    }

    /**
     * Collects performance metrics for debugging
     * @param {number} currentTime - Current timestamp
     */
    collectPerformanceMetrics(currentTime) {
        // Skip collection if debug is not visible (for performance)
        if (!this.debugEnabled && currentTime - this.lastMetricsUpdateTime < 1000) {
            return;
        }

        // Update collection time
        this.lastMetricsUpdateTime = currentTime;

        // Frame time
        this.perfMetrics.frameTime = this.deltaTime * 1000; // Convert to ms

        // Memory usage (if available)
        if (window.performance && window.performance.memory) {
            this.perfMetrics.jsHeapSize = window.performance.memory.totalJSHeapSize;
            this.perfMetrics.jsHeapSizeLimit = window.performance.memory.jsHeapSizeLimit;
            this.perfMetrics.jsHeapSizeUsed = window.performance.memory.usedJSHeapSize;
        }

        // Scene statistics
        if (this.sceneManager && this.sceneManager.renderer && this.sceneManager.scene) {
            // Count objects in scene
            this.perfMetrics.objectCount = this.sceneManager.scene.children.length;

            // Count triangles
            let triangleCount = 0;
            this.sceneManager.scene.traverse((object) => {
                if (object.isMesh) {
                    const geometry = object.geometry;
                    if (geometry.isBufferGeometry) {
                        if (geometry.index !== null) {
                            triangleCount += geometry.index.count / 3;
                        } else if (geometry.attributes.position) {
                            triangleCount += geometry.attributes.position.count / 3;
                        }
                    }
                }
            });
            this.perfMetrics.triangleCount = Math.round(triangleCount);

            // Update performance monitor with renderer info
            this.performanceMonitor.updateMonitoredObjectCounts(this.sceneManager.renderer);
        }

        // Emit metrics update event
        this.eventBus.emit('debug.metrics', this.perfMetrics);
    }

    animate(currentTime = 0) {
        // Schedule next frame
        requestAnimationFrame(this.animate.bind(this));

        // Skip updates if game is paused
        if (this.isPaused) {
            return;
        }

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

        // Start measuring update time
        const updateStartTime = performance.now();

        // Update game state
        this.update(currentTime);

        // Record update time
        this.perfMetrics.updateTime = performance.now() - updateStartTime;

        // Start measuring render time
        const renderStartTime = performance.now();

        // Render the scene
        this.sceneManager.render();

        // Record render time
        this.perfMetrics.renderTime = performance.now() - renderStartTime;

        // Collect performance metrics
        this.collectPerformanceMetrics(currentTime);
    }

    update(currentTime) {
        // Update the player plane
        if (this.playerPlane) {
            this.playerPlane.update(this.deltaTime, this.inputManager.getInputState());
        }

        // Update enemy planes in single player mode
        if (!this.isMultiplayer) {
            for (const enemyPlane of this.enemyPlanes) {
                if (this.playerPlane) {
                    // Pass player position to enemy AI
                    enemyPlane.update(this.deltaTime, null, this.playerPlane.mesh.position);
                } else {
                    enemyPlane.update(this.deltaTime, null);
                }
            }
        }

        // Update network manager in multiplayer mode
        if (this.isMultiplayer && this.networkManager) {
            this.networkManager.update(currentTime);
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

    /**
     * Pause the game
     */
    pauseGame() {
        if (!this.isPaused) {
            this.isPaused = true;
            console.log('Game paused');

            // Pause scene rendering
            this.sceneManager.pauseGame();
        }
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (this.isPaused) {
            this.isPaused = false;
            console.log('Game resumed');

            // Resume scene rendering
            this.sceneManager.resumeGame();
        }
    }

    /**
     * Display health debug information
     */
    displayHealthDebug() {
        if (this.playerPlane) {
            const health = this.playerPlane.getHealth();
            const maxHealth = this.playerPlane.maxHealth;
            const percentage = Math.round((health / maxHealth) * 100);

            this.eventBus.emit('notification', {
                message: `Health: ${health}/${maxHealth} (${percentage}%)`,
                type: 'info'
            });

            console.log(`Player health: ${health}/${maxHealth} (${percentage}%)`);
            console.log(`Is alive: ${this.playerPlane.isAlive()}`);
            console.log(`Is destroyed: ${this.playerPlane.isDestroyed}`);
        }

        // Debug enemy health if available
        if (this.enemyPlanes && this.enemyPlanes.length > 0) {
            for (let i = 0; i < this.enemyPlanes.length; i++) {
                const enemy = this.enemyPlanes[i];
                if (enemy) {
                    const health = enemy.getHealth();
                    const maxHealth = enemy.maxHealth;
                    const percentage = Math.round((health / maxHealth) * 100);

                    console.log(`Enemy ${i + 1} health: ${health}/${maxHealth} (${percentage}%)`);
                    console.log(`Enemy ${i + 1} is alive: ${enemy.isAlive()}`);
                    console.log(`Enemy ${i + 1} is destroyed: ${enemy.isDestroyed}`);
                }
            }
        }
    }

    /**
     * Apply debug damage to player for testing
     */
    debugDamagePlayer() {
        if (this.playerPlane && this.playerPlane.isAlive()) {
            // Apply 10 damage to player
            const damageAmount = 10;
            this.playerPlane.damage(damageAmount);

            this.eventBus.emit('notification', {
                message: `Debug: Applied ${damageAmount} damage to player`,
                type: 'warning'
            });

            // Display updated health
            this.displayHealthDebug();
        }
    }

    /**
     * Apply debug healing to player for testing
     */
    debugHealPlayer() {
        if (this.playerPlane) {
            // Heal player by 15 points
            const healAmount = 15;
            this.playerPlane.heal(healAmount);

            this.eventBus.emit('notification', {
                message: `Debug: Healed player by ${healAmount}`,
                type: 'success'
            });

            // Display updated health
            this.displayHealthDebug();
        }
    }
} 