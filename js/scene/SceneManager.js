// Scene Manager for handling the 3D scene, camera, and rendering
import * as THREE from 'three';
import Sky from './Sky.js';
import Ground from './Ground.js';
import Runway from './Runway.js';
import Clouds from './Clouds.js';
import Camera from './Camera.js';

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

        // Create and setup camera (after renderer is created)
        this.camera = new Camera(this.scene, this.renderer.domElement, this.eventBus);

        console.log('SceneManager initialized');
    }

    /**
     * Create fog for the scene
     */
    createFog() {
        // Add exponential fog - less intensive than linear fog
        // Parameters: color, density
        this.fog = new THREE.FogExp2(0xCFE8FF, 0.0015);
        this.scene.fog = this.fog;
        console.log('Scene fog created');
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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        // Add directional light for sun-like illumination
        this.sun = new THREE.DirectionalLight(0xFFD580, 1.0); // Sunny yellow color
        this.sun.position.set(300, 200, 100);
        this.sun.castShadow = true;

        // Configure shadow properties - keep shadow map small for performance
        this.sun.shadow.mapSize.width = 1024;
        this.sun.shadow.mapSize.height = 1024;
        this.sun.shadow.camera.near = 10;
        this.sun.shadow.camera.far = 500;
        this.sun.shadow.camera.left = -200;
        this.sun.shadow.camera.right = 200;
        this.sun.shadow.camera.top = 200;
        this.sun.shadow.camera.bottom = -200;
        this.sun.shadow.bias = -0.0005; // Reduce shadow acne

        this.scene.add(this.sun);

        // Add a hemisphere light for sky/ground color variation
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x548c2f, 0.6);
        this.scene.add(hemisphereLight);

        console.log('Scene lighting created');
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