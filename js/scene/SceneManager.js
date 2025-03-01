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

        // Main actor (plane)
        this.mainActor = null;
    }

    init() {
        // Create the scene
        this.scene = new THREE.Scene();

        // Set scene background color (will be replaced by sky)
        this.scene.background = new THREE.Color(0x87CEEB);

        // Create the renderer
        this.createRenderer();

        // Add lighting
        this.createLighting();

        // Create scene elements
        this.sky = new Sky(this.scene);
        this.ground = new Ground(this.scene);
        this.runway = new Runway(this.scene);
        this.clouds = new Clouds(this.scene, this.eventBus);

        // Create and setup camera (after renderer is created)
        this.camera = new Camera(this.scene, this.renderer.domElement, this.eventBus);

        console.log('SceneManager initialized');
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
        // Add ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add directional light for sun-like illumination
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;

        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;

        this.scene.add(directionalLight);

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