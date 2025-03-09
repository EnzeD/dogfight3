// Scene Manager for handling the 3D scene, camera, and rendering
import * as THREE from 'three';
import Sky from './Sky.js';
import Ground from './Ground.js';
import Runway from './Runway.js';
import Clouds from './Clouds.js';
import Camera from './Camera.js';
import Trees from './Trees.js';  // Import the new Trees class
import Villages from './Villages.js';  // Import the new Villages class
import Skyscrapers from './Skyscrapers.js';  // Import the new Skyscrapers class
import GameMap from './Map.js';  // Import the GameMap class for static map data

export default class SceneManager {
    constructor(eventBus, qualitySettings) {
        this.eventBus = eventBus;
        this.qualitySettings = qualitySettings;

        // Three.js components
        this.scene = null;
        this.renderer = null;

        // Scene elements
        this.sky = null;
        this.ground = null;
        this.runway = null;
        this.clouds = null;
        this.camera = null;
        this.sun = null; // Store reference to the sun light
        this.fog = null; // Store reference to the fog
        this.trees = null; // Store reference to the trees
        this.villages = null; // Store reference to the villages
        this.skyscrapers = null; // Store reference to the skyscrapers

        // Main actor (plane)
        this.mainActor = null;

        // Get current quality settings
        this.settings = this.qualitySettings.getCurrentSettings();

        // Initialize the game map - contains static positions for all elements
        this.gameMap = new GameMap();
    }

    init() {
        // Create the scene
        this.scene = new THREE.Scene();

        // Set scene background color (will be replaced by sky)
        this.scene.background = new THREE.Color(0x87CEEB);

        // Create the renderer
        this.createRenderer();

        // Create and setup camera (before other elements that might need it)
        this.camera = new Camera(this.scene, this.renderer.domElement, this.eventBus);

        // Add fog to the scene
        this.createFog();

        // Add lighting
        this.createLighting();

        // Create scene elements with static map data
        this.sky = new Sky(this.scene, this.sun); // Pass the sun to the sky
        this.ground = new Ground(this.scene);
        this.runway = new Runway(this.scene, this.gameMap.runway); // Pass runway config from map
        this.clouds = new Clouds(this.scene, this.eventBus, this.qualitySettings, this.gameMap.clouds); // Pass cloud config
        this.trees = new Trees(this.scene, this.eventBus, this.qualitySettings, this.gameMap.trees); // Pass tree config
        this.villages = new Villages(this.scene, this.eventBus, this.runway, this.qualitySettings, this.gameMap.villages); // Pass village config
        this.skyscrapers = new Skyscrapers(this.scene, this.eventBus, this.qualitySettings, this.gameMap.skyscrapers); // Pass skyscraper config

        console.log(`SceneManager initialized with quality: ${this.qualitySettings.getQuality()}`);
    }

    /**
     * Create fog for the scene
     */
    createFog() {
        // Add exponential fog - less intensive than linear fog
        // Parameters: color, density
        const fogDensity = this.settings.fogDensity || 0.0004;
        this.fog = new THREE.FogExp2(0xCFE8FF, fogDensity);
        this.scene.fog = this.fog;
        console.log(`Scene fog created with density: ${fogDensity}`);
    }

    /**
     * Create the WebGL renderer
     */
    createRenderer() {
        try {
            // Check for WebGL support
            if (!this.isWebGLAvailable()) {
                this.showWebGLError();
                return;
            }

            // Create renderer with more iOS-friendly settings
            this.renderer = new THREE.WebGLRenderer({
                antialias: this.qualitySettings.getCurrentSettings().antialias,
                powerPreference: 'default',
                alpha: true,
                precision: 'highp',
                failIfMajorPerformanceCaveat: false
            });

            // Use more conservative settings on mobile
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio on mobile
            } else {
                this.renderer.setPixelRatio(window.devicePixelRatio);
            }

            this.renderer.setSize(window.innerWidth, window.innerHeight);

            // Only enable shadows if not on mobile
            this.renderer.shadowMap.enabled = !isMobile || this.qualitySettings.getQuality() === 'high';
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // Append the canvas to the document body
            document.body.appendChild(this.renderer.domElement);

            // Handle the loading screen
            this.hideLoadingScreen();

            // Setup resize handler
            window.addEventListener('resize', this.onResize.bind(this));

            console.log('WebGL renderer initialized successfully');
        } catch (error) {
            console.error('Error initializing WebGL renderer:', error);
            this.showWebGLError();
        }
    }

    /**
     * Check if WebGL is available
     * @returns {boolean} Whether WebGL is available
     */
    isWebGLAvailable() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext &&
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    /**
     * Show an error message when WebGL is not available
     */
    showWebGLError() {
        // Remove loading screen if present
        this.hideLoadingScreen();

        const message = document.createElement('div');
        message.id = 'webgl-error';
        message.innerHTML = `
            <div class="error-content">
                <h2>WebGL Not Available</h2>
                <p>Your browser or device doesn't seem to support WebGL, which is required for this game.</p>
                <p>Please try a different browser or device.</p>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #webgl-error {
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
        `;

        document.head.appendChild(style);
        document.body.appendChild(message);

        console.error('WebGL not available');
    }

    /**
     * Hide the loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    /**
     * Create lighting for the scene
     */
    createLighting() {
        // Add ambient light for general illumination - reduced intensity for better shadow contrast
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.18);
        this.scene.add(ambientLight);

        // Add directional light for sun-like illumination
        this.sun = new THREE.DirectionalLight(0xFFD580, 1.6);
        this.sun.position.set(800, 600, 400);
        this.sun.castShadow = true;

        // Configure shadow properties - optimized for smooth but crisp shadows
        this.sun.shadow.mapSize.width = 16384;
        this.sun.shadow.mapSize.height = 16384;
        this.sun.shadow.camera.near = 10;
        this.sun.shadow.camera.far = 6000;
        this.sun.shadow.camera.left = -2000;
        this.sun.shadow.camera.right = 2000;
        this.sun.shadow.camera.top = 2000;
        this.sun.shadow.camera.bottom = -2000;
        this.sun.shadow.bias = -0.00004;
        this.sun.shadow.normalBias = 0.003;
        this.sun.shadow.radius = 1.5;

        // Ensure shadows are enabled
        this.sun.castShadow = true;

        // Optimize shadow map by making it follow the camera
        this.sun.shadow.camera.matrixAutoUpdate = true;

        // Use PCFSoftShadowMap for smooth but try to keep crisp with other settings
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Add helper to visualize shadow camera (useful for debugging - comment out in production)
        // const shadowCameraHelper = new THREE.CameraHelper(this.sun.shadow.camera);
        // this.scene.add(shadowCameraHelper);

        this.scene.add(this.sun);

        // Add a hemisphere light for sky/ground color variation
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x548c2f, 0.5);
        this.scene.add(hemisphereLight);

        console.log('Scene lighting created with smooth yet crisp shadows');
    }

    /**
     * Set the main actor (plane) for the scene
     * @param {Object} actor - The main actor object
     */
    setMainActor(actor) {
        this.mainActor = actor;

        // Inform the camera about the main actor
        if (this.camera) {
            this.camera.setTarget(actor);
        }
    }

    /**
     * Set up a cinematic camera view for the preview mode
     */
    setCinematicView() {
        // Position camera for a dramatic view
        this.camera.camera.position.set(200, 150, 200);
        this.camera.camera.lookAt(0, 50, 0);

        // Create a slow circular motion for the camera
        this.cinematicAngle = 0;
        this.cinematicRadius = 250;
        this.cinematicHeight = 150;
        this.cinematicLookAtHeight = 50;
        this.cinematicRotationSpeed = 0.05; // radians per second
    }

    /**
     * Update the scene
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update cinematic camera if in that mode
        if (this.cinematicAngle !== undefined) {
            // Update camera position in a circular pattern
            this.cinematicAngle += this.cinematicRotationSpeed * deltaTime;

            // Calculate new camera position
            const x = Math.cos(this.cinematicAngle) * this.cinematicRadius;
            const z = Math.sin(this.cinematicAngle) * this.cinematicRadius;

            // Update camera position and look target
            this.camera.camera.position.set(x, this.cinematicHeight, z);
            this.camera.camera.lookAt(0, this.cinematicLookAtHeight, 0);
        }

        // Update clouds
        if (this.clouds) {
            this.clouds.update(deltaTime);
        }

        // Update sky (will update the sun position if implemented)
        if (this.sky) {
            this.sky.update(deltaTime);
        }

        // Update trees if needed
        if (this.trees) {
            this.trees.update(deltaTime);
        }

        // Update villages if needed
        if (this.villages) {
            this.villages.update(deltaTime);
        }

        // Update skyscrapers if needed
        if (this.skyscrapers) {
            this.skyscrapers.update(deltaTime);
        }

        // Update camera to follow the main actor
        if (this.camera && this.mainActor) {
            this.camera.update(deltaTime);
        }
    }

    /**
     * Render the scene
     */
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera.camera);
        }
    }

    /**
     * Resize handler
     */
    onResize() {
        if (this.camera && this.renderer) {
            // Update camera aspect ratio
            this.camera.onResize();

            // Update renderer
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    /**
     * Handle game pause
     */
    pauseGame() {
        // Potentially reduce rendering during pause
        if (this.renderer) {
            this.renderer.setAnimationLoop(null);
        }
    }

    /**
     * Handle game resume
     */
    resumeGame() {
        // Restore rendering
        if (this.renderer) {
            this.renderer.setAnimationLoop(() => this.eventBus.emit('animation.frame'));
        }
    }
} 