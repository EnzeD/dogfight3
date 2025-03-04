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

export default class SceneManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

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
    }

    init() {
        // Create the scene
        this.scene = new THREE.Scene();

        // Set scene background color (will be replaced by sky)
        this.scene.background = new THREE.Color(0x87CEEB);

        // Add fog to the scene
        this.createFog();

        // Create the renderer
        this.createRenderer();

        // Add lighting
        this.createLighting();

        // Create scene elements
        this.sky = new Sky(this.scene, this.sun); // Pass the sun to the sky
        this.ground = new Ground(this.scene);
        this.runway = new Runway(this.scene);
        this.clouds = new Clouds(this.scene, this.eventBus);
        this.trees = new Trees(this.scene, this.eventBus); // Initialize trees
        this.villages = new Villages(this.scene, this.eventBus, this.runway); // Pass runway to villages
        this.skyscrapers = new Skyscrapers(this.scene, this.eventBus); // Initialize skyscrapers

        // Create and setup camera (after renderer is created)
        this.camera = new Camera(this.scene, this.renderer.domElement, this.eventBus);

        console.log('SceneManager initialized with CBD area added');
    }

    /**
     * Create fog for the scene
     */
    createFog() {
        // Add exponential fog - less intensive than linear fog
        // Parameters: color, density
        this.fog = new THREE.FogExp2(0xCFE8FF, 0.0004); // Further reduced from 0.0008 for extreme distance viewing
        this.scene.fog = this.fog;
        console.log('Scene fog created with extended view distance');
    }

    /**
     * Create the WebGL renderer
     */
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Add the renderer's canvas to the DOM
        document.body.appendChild(this.renderer.domElement);
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
     * Update scene elements
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
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
} 