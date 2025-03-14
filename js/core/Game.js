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
import GameMap from '../scene/Map.js';
import ProtectionZone from '../utils/ProtectionZone.js';

export default class Game {
    /**
     * @param {boolean} previewMode - Whether this is preview mode (landing page background)
     * @param {Object} options - Game options
     * @param {string} options.playerCallsign - Optional player callsign for multiplayer
     */
    constructor(previewMode = false, options = {}) {
        console.log('Initializing Game...');

        // If player callsign is provided in options, store it
        if (options.playerCallsign) {
            this.playerCallsign = options.playerCallsign;
            console.log('Player callsign set during Game initialization:', this.playerCallsign);
        }

        // Create event bus for communication between modules
        this.eventBus = new EventBus();

        // Initialize quality settings
        this.qualitySettings = new QualitySettings();
        console.log(`Game quality set to: ${this.qualitySettings.getQuality()}`);

        // Create the game map (single instance for deterministic world)
        this.map = new GameMap();

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
        this.isPreviewMode = previewMode;

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

        // Only initialize these if not in preview mode
        if (!this.isPreviewMode) {
            this.inputManager.init();
            this.uiManager.init();

            // Create the player's plane (after scene is initialized)
            console.log('Creating player plane...');
            this.createPlayerPlane();

            // Create the runway protection zone
            this.createProtectionZone();

            // Check multiplayer mode after player plane creation
            this.checkMultiplayerMode();

            // Only create an AI enemy in single player mode
            if (!this.isMultiplayer) {
                console.log('Creating enemy plane in single player mode...');
                // Position the enemy plane directly in front of the player for testing
                const planeFactory = new PlaneFactory(this.sceneManager.scene, this.eventBus);
                this.createEnemyPlane(planeFactory, new THREE.Vector3(0, 30, -50));
            }

            // Initialize audio (after plane is created)
            this.audioManager.init();

            // Setup input action handler
            this.setupInputActionHandler();

            // Listen for debug visibility changes
            this.eventBus.on('debug.visibility', (isVisible) => {
                this.debugEnabled = isVisible;
            });

            // Listen for game pause/resume events
            this.eventBus.on('game.pause', () => this.pauseGame());
            this.eventBus.on('game.resume', () => this.resumeGame());

            // Show instructions
            this.uiManager.showInstructions();
        } else {
            // Preview mode setup
            // Set up a cinematic camera view
            this.sceneManager.setCinematicView();

            // Create some AI planes for background action
            const planeFactory = new PlaneFactory(this.sceneManager.scene, this.eventBus);

            // Create planes at various positions for visual interest
            this.createEnemyPlane(planeFactory, new THREE.Vector3(0, 100, -100));
            this.createEnemyPlane(planeFactory, new THREE.Vector3(-100, 150, -50));
            this.createEnemyPlane(planeFactory, new THREE.Vector3(100, 120, -150));
        }

        // Setup window resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Set up raycasting for clickable objects
        this.setupRaycasting();

        // Start the game loop
        this.animate();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for game.start event to start the game when instructions are closed
        this.eventBus.on('game.start', () => {
            this.startGame();
        });
    }

    /**
     * Creates the player plane and initializes related systems
     */
    createPlayerPlane() {
        const planeFactory = new PlaneFactory(this.sceneManager.scene, this.eventBus);
        this.playerPlane = planeFactory.createWW2Plane();
        this.planes.push(this.playerPlane);
        console.log('Player plane created:', this.playerPlane);
        this.sceneManager.setMainActor(this.playerPlane);

        // Position the player plane for testing combat
        this.playerPlane.mesh.position.set(0, 0.5, 35); // On the runway (slightly elevated to avoid clipping)
        this.playerPlane.isAirborne = false; // Start on the ground
        this.playerPlane.speed = 0; // Start stationary

        // Store reference to player plane in eventBus for proper event source identification
        this.eventBus.playerPlane = this.playerPlane;

        // Register planes with ammo system for collision detection
        if (this.playerPlane.ammoSystem) {
            console.log('Registering planes with ammo system for collision detection');
            this.playerPlane.ammoSystem.setPlanes(this.planes);
        }
    }

    /**
     * Sets up input action handlers
     */
    setupInputActionHandler() {
        this.eventBus.on('input.action', (data) => {
            if (data.action === 'restartGame' && data.state === 'down') {
                this.restartGame();
            } else if (data.action === 'spawnEnemies' && data.state === 'down') {
                this.spawnMultipleEnemies(5);
            } else if (data.action === 'displayHealth' && data.state === 'down') {
                this.displayHealthDebug();
            } else if (data.action === 'debugDamage' && data.state === 'down') {
                this.debugDamagePlayer();
            } else if (data.action === 'debugHeal' && data.state === 'down') {
                this.debugHealPlayer();
            } else if (data.action === 'toggleHitboxes' && data.state === 'down') {
                this.toggleHitboxes();
            } else if (data.action === 'toggleLeaderboard' && data.state === 'down') {
                // Toggle leaderboard visibility
                this.eventBus.emit('leaderboard.toggle');
            }
        });
    }

    /**
     * Restart the game after player death
     */
    restartGame() {
        console.log('Restarting game...');

        // Check if player exists and is destroyed
        if (this.playerPlane && this.playerPlane.isDestroyed) {
            // Properly clean up the old player plane
            const oldPlane = this.playerPlane;

            // Force removal of the old plane
            if (oldPlane.removeFromScene) {
                oldPlane.removeFromScene();
            }

            // Remove from planes array
            this.planes = this.planes.filter(plane => plane !== oldPlane);

            // Create a new player plane
            this.createPlayerPlane();

            // Update network manager with new player plane reference in multiplayer mode
            if (this.isMultiplayer && this.networkManager) {
                console.log('Updating NetworkManager with new player plane reference after respawn');
                this.networkManager.updatePlayerPlaneReference(this.playerPlane);
            }

            // Show notification
            this.eventBus.emit('notification', {
                message: 'Game restarted! Good luck!',
                type: 'success'
            });

            // Reset camera mode if needed
            if (this.sceneManager && this.sceneManager.camera) {
                this.sceneManager.camera.freeFallMode = false;
                this.sceneManager.camera.cinematicMode = false;
            }
        } else {
            console.log('Game restart requested but player is not destroyed or does not exist');
        }
    }

    /**
     * Check if multiplayer mode is enabled via URL parameters
     * and set up multiplayer components if needed
     */
    checkMultiplayerMode() {
        const urlParams = new URLSearchParams(window.location.search);
        this.isMultiplayer = urlParams.has('multiplayer');

        if (!this.isMultiplayer) return;

        console.log('Initializing multiplayer mode');

        // Create network manager
        this.networkManager = new NetworkManager(this.eventBus, this.playerPlane);

        // Listen for remote plane creation to register with ammo system
        this._setupNetworkEventHandlers();

        // Set up server-synced health system for multiplayer
        this.setupServerSyncedHealth();

        // Connect to server with callsign if available
        this._connectToMultiplayerServer(urlParams);
    }

    /**
     * Set up network event handlers
     * @private
     */
    _setupNetworkEventHandlers() {
        // Register remote planes for collision detection
        this.eventBus.on('network.plane.created', (remotePlane) => {
            if (!remotePlane || this.planes.includes(remotePlane)) return;

            console.log('Adding remote plane to collision detection');
            this.planes.push(remotePlane);

            // Register with ammo system if available
            if (this.playerPlane && this.playerPlane.ammoSystem) {
                this.playerPlane.ammoSystem.addPlane(remotePlane);

                // Ensure the remote plane has a reference to the scene for bullet creation
                if (!remotePlane.scene && this.sceneManager) {
                    remotePlane.scene = this.sceneManager.scene;
                }
            }
        });

        // Remove planes when they disconnect
        this.eventBus.on('network.plane.removed', (remotePlane) => {
            const index = this.planes.indexOf(remotePlane);
            if (index >= 0) {
                this.planes.splice(index, 1);
                console.log('Removed remote plane from collision detection');
            }

            // Unregister from ammo system if available
            if (this.playerPlane && this.playerPlane.ammoSystem) {
                this.playerPlane.ammoSystem.removePlane(remotePlane);
            }
        });
    }

    /**
     * Connect to the multiplayer server
     * @private
     * @param {URLSearchParams} urlParams - URL parameters
     */
    _connectToMultiplayerServer(urlParams) {
        const serverUrl = urlParams.get('server');
        const connectionData = { serverUrl };

        // Add callsign if it was set
        if (this.playerCallsign) {
            console.log(`Using callsign for multiplayer: ${this.playerCallsign}`);
            connectionData.callsign = this.playerCallsign;
        }

        // Connect to server
        this.eventBus.emit('network.connect', connectionData);

        // Set up protection zone for multiplayer
        if (this.protectionZone && this.networkManager) {
            this.networkManager.setProtectionZone(this.protectionZone);
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

        // Add to ammo system for collision detection
        if (this.playerPlane && this.playerPlane.ammoSystem) {
            this.playerPlane.ammoSystem.addPlane(enemyPlane);
        }

        console.log('Enemy plane created at position:', position);
        return enemyPlane;
    }

    /**
     * Creates multiple enemy planes at random positions around the player
     * @param {number} count - Number of enemy planes to create
     */
    spawnMultipleEnemies(count = 5) {
        // Only allow in single player mode
        if (this.isMultiplayer) {
            console.log('Cannot spawn enemies in multiplayer mode');
            this.eventBus.emit('notification', {
                message: 'Enemy spawning is disabled in multiplayer mode',
                type: 'warning',
                duration: 3000
            });
            return;
        }

        // Get quality settings for max enemy count
        const qualitySettings = this.sceneManager.qualitySettings.getCurrentSettings();
        const maxEnemies = qualitySettings.maxVisibleEnemies || 5; // Default to 5 if not specified

        // Calculate how many more enemies we can add based on quality setting
        const currentEnemyCount = this.enemyPlanes.filter(p => !p.isDestroyed).length;
        const availableSlots = Math.max(0, maxEnemies - currentEnemyCount);

        // If we already have max enemies, don't spawn more
        if (availableSlots <= 0) {
            console.log(`Maximum enemy count reached (${maxEnemies}). Cannot spawn more enemies.`);
            this.eventBus.emit('notification', {
                message: 'Maximum enemy limit reached',
                type: 'warning',
                duration: 2000
            });
            return;
        }

        // Limit the count to available slots
        const actualCount = Math.min(count, availableSlots);

        console.log(`Spawning ${actualCount} enemy planes (max: ${maxEnemies}, current: ${currentEnemyCount})...`);
        const planeFactory = new PlaneFactory(this.sceneManager.scene, this.eventBus);

        // Get player position as reference
        const playerPos = this.playerPlane.mesh.position.clone();

        // Spawn enemies in a distributed pattern around the player
        for (let i = 0; i < actualCount; i++) {
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
        if (actualCount > 0) {
            this.eventBus.emit('notification', {
                message: `${actualCount} enemy plane${actualCount > 1 ? 's' : ''} have entered the area!`,
                type: 'info',
                duration: 3000
            });
        }
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

    /**
     * Check if player is in the protection zone and update UI
     */
    checkProtectionZoneStatus() {
        if (!this.protectionZone || !this.playerPlane || !this.playerPlane.mesh) {
            return;
        }

        const isInZone = this.protectionZone.isInProtectionZone(this.playerPlane.mesh.position);

        // Update UI to show protection zone status
        this.uiManager.showProtectionZoneStatus(isInZone);
    }

    /**
     * Main game update loop
     * @param {number} currentTime - Current timestamp
     */
    update(currentTime) {
        // Update the scene regardless of mode
        this.sceneManager.update(this.deltaTime);

        // Skip other updates if in preview mode
        if (this.isPreviewMode) {
            // Update enemy planes for background action
            for (const enemyPlane of this.enemyPlanes) {
                enemyPlane.update(this.deltaTime, null);
            }
            return;
        }

        // Skip update if game is paused
        if (this.isPaused) {
            return;
        }

        // Regular game update logic
        if (this.playerPlane) {
            // Check if player is in protection zone
            this.checkProtectionZoneStatus();

            this.playerPlane.update(this.deltaTime, this.inputManager.getInputState());
        }

        // Update enemy planes in single player mode
        if (!this.isMultiplayer) {
            for (const enemyPlane of this.enemyPlanes) {
                if (this.playerPlane) {
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

    /**
     * Toggle hitbox visualization
     */
    toggleHitboxes() {
        if (this.playerPlane && this.playerPlane.ammoSystem) {
            this.playerPlane.ammoSystem.toggleHitboxes();

            // Show notification
            this.eventBus.emit('notification', {
                message: `Hitboxes ${this.playerPlane.ammoSystem.showHitboxes ? 'Shown' : 'Hidden'}`,
                type: 'info'
            });
        }
    }

    /**
     * Creates the runway protection zone
     */
    createProtectionZone() {
        console.log('Creating runway protection zone...');
        this.protectionZone = new ProtectionZone(
            this.sceneManager.scene,
            this.eventBus,
            this.map
        );

        // If player plane has been created, set the protection zone
        if (this.playerPlane && this.playerPlane.ammoSystem) {
            this.playerPlane.ammoSystem.setProtectionZone(this.protectionZone);
        }

        // If network manager exists, set the protection zone
        if (this.networkManager) {
            this.networkManager.setProtectionZone(this.protectionZone);
        }

        // Add debug toggle for protection zone visualization
        document.addEventListener('keydown', (event) => {
            if (event.key === 'h' && event.ctrlKey) {
                this.protectionZone.toggleVisualizer(!this.protectionZone.visualizer.visible);
            }
        });

        // Debug message to show how to toggle zone visibility
        console.log('Press Ctrl+H to toggle protection zone visualization');
    }

    /**
     * Sets up server-synced health management for multiplayer mode
     * This ensures health is properly managed by the server in multiplayer
     */
    setupServerSyncedHealth() {
        if (!this.isMultiplayer || !this.playerPlane) return;

        console.log('Setting up server-synced health management');

        // Store original applyDamage method
        const originalApplyDamage = this.playerPlane.applyDamage;

        // In multiplayer, we only apply damage received from the server
        // This prevents desynchronization of health values
        this.playerPlane.applyDamage = (amount, position, source) => {
            // If the damage is coming from the local player or AI in multiplayer,
            // let the server handle the actual health reduction
            if (source !== 'server' && this.isMultiplayer) {
                console.log(`Local damage detected (${amount}), deferring to server`);
                // We still want to show visual effects for the hit
                if (position) {
                    this.eventBus.emit('effect.hit', {
                        position: position,
                        playSound: true
                    });
                }
                // The actual health reduction will happen when the server sends back the update
                return;
            }

            // For damage from the server or in single-player, apply normally
            console.log(`Applying damage: ${amount}, source: ${source || 'unknown'}`);
            originalApplyDamage.call(this.playerPlane, amount, position);
        };

        // Listen for server health updates
        this.eventBus.on('network.health.update', (data) => {
            if (!this.playerPlane) return;

            console.log(`Received server health update: ${data.health}`);

            // Set the health directly based on server value
            this.playerPlane.setHealth(data.health);

            // Update UI
            this.eventBus.emit('player.health.updated', {
                health: data.health,
                maxHealth: this.playerPlane.maxHealth
            });
        });
    }

    /**
     * Set up raycasting for interactive elements
     */
    setupRaycasting() {
        // Create raycaster for mouse interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Add mouse move event listener
        window.addEventListener('mousemove', (event) => this.onMouseMove(event), false);

        // Add click event listener
        window.addEventListener('click', (event) => this.onMouseClick(event), false);
    }

    /**
     * Handle mouse movement for hover effects
     * @param {MouseEvent} event - Mouse move event
     */
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the raycaster
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera.getCamera());

        // Use the scene manager's processRaycast method to handle all interactive objects
        this.sceneManager.processRaycast(this.raycaster, false);
    }

    /**
     * Handle mouse clicks on interactive objects
     * @param {MouseEvent} event - Mouse click event
     */
    onMouseClick(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the raycaster
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera.getCamera());

        // Use the scene manager's processRaycast method with isClicking=true
        this.sceneManager.processRaycast(this.raycaster, true);

        // Play a click sound if available
        if (this.audioManager && this.audioManager.playUISound) {
            this.audioManager.playUISound('click');
        }
    }

    /**
     * Start the game (called when player clicks start button)
     */
    startGame() {
        // Hide the instructions panel
        this.uiManager.hideInstructions();

        // Unpause game if it was paused
        this.resumeGame();

        // Enable input
        this.inputManager.enable();

        // Start engine sound
        this.audioManager.playEngineSound();

        // Emit game started event
        this.eventBus.emit('game.started');

        console.log('Game started');
    }

    /**
     * Return to menu (called when player dies or clicks menu button)
     */
    returnToMenu() {
        // Show the instructions panel
        this.uiManager.showInstructions();

        // Pause game mechanics
        this.pauseGame();

        // Emit menu event
        this.eventBus.emit('game.menu');

        console.log('Returned to menu');
    }
} 