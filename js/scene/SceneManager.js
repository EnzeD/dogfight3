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
import Billboard from './Billboard.js';  // Import the new Billboard class
import Zeppelin from './Zeppelin.js';  // Import the new Zeppelin class
import GroundLogo from './GroundLogo.js';  // Import the new GroundLogo class
import Portal from './Portal.js';  // Import the new Portal class
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
        this.billboards = null; // Store reference to the billboards
        this.zeppelin = null; // Store reference to the zeppelin
        this.groundLogo = null; // Store reference to the ground logo
        this.groundLogo2 = null; // Store reference to the second ground logo
        this.portal = null; // Store reference to the portal

        // Main actor (plane)
        this.mainActor = null;

        // Game time tracker
        this.time = 0;

        // Game state
        this.isMainMenuActive = true; // Default to true since game starts at menu
        this.adsClickable = false; // Control whether ads are clickable

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

        // Store eventBus in scene userData so it can be accessed by components
        this.scene.userData.eventBus = this.eventBus;

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
        this.billboards = new Billboard(this.scene, this.gameMap.billboards); // Pass billboard config
        this.zeppelin = new Zeppelin(this.scene, this.gameMap.zeppelin); // Pass zeppelin config
        this.groundLogo = new GroundLogo(this.scene, this.gameMap.groundLogo); // Pass ground logo config
        this.groundLogo2 = new GroundLogo(this.scene, this.gameMap.groundLogo2); // Pass second ground logo config
        this.portal = new Portal(this.scene, this.gameMap.portal); // Pass portal config

        console.log(`SceneManager initialized with quality: ${this.qualitySettings.getQuality()}`);

        // Listen for game state changes
        this.eventBus.on('game.started', () => {
            this.isMainMenuActive = false;
            this.adsClickable = true; // Enable ad clicks once game has started
        });

        this.eventBus.on('game.menu', () => {
            this.isMainMenuActive = true;
            this.adsClickable = false; // Disable ad clicks when on menu
        });

        // Listen for settings apply event
        this.eventBus.on('settings.apply', (qualitySettings) => {
            this.applySettings(qualitySettings);
        });

        // Set initial state
        this.adsClickable = !this.isMainMenuActive;
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
        // Get antialiasing setting from quality settings
        const useAntialiasing = this.settings.antialiasing !== undefined ?
            this.settings.antialiasing : true;

        console.log(`Creating renderer with antialiasing: ${useAntialiasing}`);

        this.renderer = new THREE.WebGLRenderer({
            antialias: useAntialiasing,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Limit pixel ratio for better performance on high-DPI displays
        const maxPixelRatio = useAntialiasing ? 2 : 1;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));

        // Enable shadows based on quality setting
        this.renderer.shadowMap.enabled = this.settings.shadowsEnabled !== undefined ?
            this.settings.shadowsEnabled : true;

        // Use appropriate shadow map type based on quality level
        if (this.qualitySettings.getQuality() === 'low') {
            this.renderer.shadowMap.type = THREE.BasicShadowMap;
        } else if (this.qualitySettings.getQuality() === 'medium') {
            // For medium quality, use PCFShadowMap (basic soft shadows, less intensive than PCFSoftShadowMap)
            this.renderer.shadowMap.type = THREE.PCFShadowMap;
        } else {
            // For high quality, use PCFSoftShadowMap (high quality soft shadows)
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        console.log(`Renderer created with shadowMap.enabled: ${this.renderer.shadowMap.enabled}, ` +
            `shadowMap.type: ${this.renderer.shadowMap.type === THREE.BasicShadowMap ? 'BasicShadowMap' :
                (this.renderer.shadowMap.type === THREE.PCFShadowMap ? 'PCFShadowMap' : 'PCFSoftShadowMap')}, ` +
            `pixelRatio: ${this.renderer.getPixelRatio()}`);

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

        // Configure shadow properties based on quality settings
        const quality = this.qualitySettings.getQuality();
        let shadowMapSize, shadowBias, shadowNormalBias, shadowRadius;

        // Scale shadow quality based on quality preset
        if (quality === 'low') {
            // Low quality shadows (disabled in settings, but configured in case enabled)
            shadowMapSize = 1024;
            shadowBias = -0.0001;
            shadowNormalBias = 0.02;
            shadowRadius = 4;
        } else if (quality === 'medium') {
            // Medium quality shadows
            shadowMapSize = 2048;
            shadowBias = -0.00006;
            shadowNormalBias = 0.01;
            shadowRadius = 2;
        } else {
            // High quality shadows
            shadowMapSize = 8192;
            shadowBias = -0.00004;
            shadowNormalBias = 0.003;
            shadowRadius = 1.5;
        }

        // Apply shadow settings
        this.sun.shadow.mapSize.width = shadowMapSize;
        this.sun.shadow.mapSize.height = shadowMapSize;
        this.sun.shadow.camera.near = 10;
        this.sun.shadow.camera.far = 4000;
        this.sun.shadow.camera.left = -1500;
        this.sun.shadow.camera.right = 1500;
        this.sun.shadow.camera.top = 1500;
        this.sun.shadow.camera.bottom = -1500;
        this.sun.shadow.bias = shadowBias;
        this.sun.shadow.normalBias = shadowNormalBias;
        this.sun.shadow.radius = shadowRadius;

        console.log(`Shadow settings applied for ${quality} quality: mapSize=${shadowMapSize}, radius=${shadowRadius}`);

        // Ensure shadows are enabled
        this.sun.castShadow = this.settings.shadowsEnabled !== undefined ?
            this.settings.shadowsEnabled : true;

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

        // If the main actor is set, we're likely in gameplay and not on the menu
        if (actor) {
            this.isMainMenuActive = false;
            this.adsClickable = true;
        }

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
        // Update game time
        this.time += deltaTime;

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

        // Update the portal animation
        if (this.portal) {
            this.portal.update(deltaTime);

            // Check for portal collision with main actor if we have both
            if (this.mainActor && !this.isMainMenuActive) {
                this.portal.checkCollision(this.mainActor, this.time || 0);
            }
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

        // Update billboards if needed
        if (this.billboards) {
            this.billboards.update(deltaTime);
        }

        // Update zeppelin if needed
        if (this.zeppelin) {
            this.zeppelin.update(deltaTime);
        }

        // Update ground logo if needed
        if (this.groundLogo) {
            this.groundLogo.update(deltaTime);
        }

        // Update second ground logo if needed
        if (this.groundLogo2) {
            this.groundLogo2.update(deltaTime);
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

    /**
     * Process raycasting to handle hovering and clicking on objects
     * @param {THREE.Raycaster} raycaster - The raycaster for intersection testing
     * @param {boolean} isClicking - Whether the user is clicking
     */
    processRaycast(raycaster, isClicking) {
        // Get all clickable objects from various components
        let allClickableObjects = [];

        // Add runway clickable objects
        if (this.runway && this.runway.getClickableObjects) {
            allClickableObjects = allClickableObjects.concat(this.runway.getClickableObjects());
        }

        // Add billboard clickable objects
        if (this.billboards && this.billboards.getClickableObjects) {
            allClickableObjects = allClickableObjects.concat(this.billboards.getClickableObjects());
        }

        // Add zeppelin ad clickable objects
        if (this.zeppelin && this.zeppelin.getClickableObjects) {
            allClickableObjects = allClickableObjects.concat(this.zeppelin.getClickableObjects());
        }

        // Add ground logo clickable objects
        if (this.groundLogo && this.groundLogo.getClickableObjects) {
            allClickableObjects = allClickableObjects.concat(this.groundLogo.getClickableObjects());
        }

        // Add second ground logo clickable objects
        if (this.groundLogo2 && this.groundLogo2.getClickableObjects) {
            allClickableObjects = allClickableObjects.concat(this.groundLogo2.getClickableObjects());
        }

        // ... any other clickable objects from other components ...

        // Find intersections
        const intersects = raycaster.intersectObjects(allClickableObjects);

        // Keep track of which component handles the current hover
        let runwayHandled = false;
        let billboardHandled = false;
        let zeppelinAdHandled = false;
        let groundLogoHandled = false;
        let groundLogo2Handled = false;

        // Handle intersections
        if (intersects.length > 0) {
            const firstIntersect = intersects[0];
            const userData = firstIntersect.object.userData;

            // Handle billboard hover effect
            if (this.billboards && userData && userData.type === 'billboard') {
                // Show hover effect only if ads are clickable or we're in gameplay
                if (this.adsClickable) {
                    this.billboards.handleHoverEffect(firstIntersect, true);
                    billboardHandled = true;
                    document.body.style.cursor = 'pointer';

                    // Handle click if user is clicking
                    if (isClicking && userData.clickURL) {
                        window.open(userData.clickURL, '_blank');
                    }
                }
            }

            // Handle zeppelin ad hover effect
            if (this.zeppelin && userData && userData.type === 'zeppelinAd') {
                // Show hover effect only if ads are clickable or we're in gameplay
                if (this.adsClickable) {
                    this.zeppelin.handleHoverEffect(firstIntersect, true);
                    zeppelinAdHandled = true;
                    document.body.style.cursor = 'pointer';

                    // Handle click if user is clicking
                    if (isClicking && userData.clickURL) {
                        window.open(userData.clickURL, '_blank');
                    }
                }
            }

            // Handle runway logo hover effect
            // Check for isClickable and url properties as used in Runway.js
            if (this.runway && userData && userData.isClickable && userData.url) {
                // Show hover effect only if ads are clickable or we're in gameplay
                if (this.adsClickable) {
                    this.runway.handleHoverEffect(firstIntersect, true);
                    runwayHandled = true;
                    document.body.style.cursor = 'pointer';

                    // Handle click if user is clicking
                    if (isClicking) {
                        window.open(userData.url, '_blank');
                    }
                }
            }

            // Handle ground logo hover effect
            if (this.groundLogo && userData && userData.type === 'groundLogo') {
                // Show hover effect only if ads are clickable or we're in gameplay
                if (this.adsClickable) {
                    this.groundLogo.handleHoverEffect(firstIntersect, true);
                    groundLogoHandled = true;
                    document.body.style.cursor = 'pointer';

                    // Handle click if user is clicking
                    if (isClicking && userData.clickURL) {
                        window.open(userData.clickURL, '_blank');
                    }
                }
            }

            // Handle second ground logo hover effect
            if (this.groundLogo2 && userData && userData.type === 'groundLogo') {
                // Show hover effect only if ads are clickable or we're in gameplay
                if (this.adsClickable) {
                    this.groundLogo2.handleHoverEffect(firstIntersect, true);
                    groundLogo2Handled = true;
                    document.body.style.cursor = 'pointer';

                    // Handle click if user is clicking
                    if (isClicking && userData.clickURL) {
                        window.open(userData.clickURL, '_blank');
                    }
                }
            }
        }

        // Reset any hover effects for components that aren't being hovered
        if (this.runway && !runwayHandled) {
            this.runway.handleHoverEffect(null, false);
        }

        if (this.billboards && !billboardHandled) {
            this.billboards.handleHoverEffect(null, false);
        }

        if (this.zeppelin && !zeppelinAdHandled) {
            this.zeppelin.handleHoverEffect(null, false);
        }

        // Reset ground logo hover effect if not handled
        if (this.groundLogo && !groundLogoHandled) {
            this.groundLogo.handleHoverEffect(null, false);
        }

        // Reset second ground logo hover effect if not handled
        if (this.groundLogo2 && !groundLogo2Handled) {
            this.groundLogo2.handleHoverEffect(null, false);
        }

        // Reset cursor if no hover is active
        if (!runwayHandled && !billboardHandled && !zeppelinAdHandled && !groundLogoHandled && !groundLogo2Handled) {
            document.body.style.cursor = 'auto';
        }
    }

    /**
     * Apply quality settings including resolution
     * @param {QualitySettings} qualitySettings - The quality settings object
     */
    applySettings(qualitySettings) {
        console.log('Applying scene settings...');

        // Update local reference to settings
        this.qualitySettings = qualitySettings;
        this.settings = qualitySettings.getCurrentSettings();

        // Apply resolution setting
        if (this.renderer) {
            // Get the resolution scale (0.5, 0.75, or 1.0)
            const resolutionScale = qualitySettings.resolution || 1.0;

            // Apply the resolution scale to the renderer
            this.renderer.setPixelRatio(window.devicePixelRatio * resolutionScale);

            console.log(`Applied resolution scale: ${resolutionScale} (${Math.round(resolutionScale * 100)}%)`);

            // Force a resize to update everything
            this.onResize();
        }

        // Apply other settings as needed
        // Update fog density
        if (this.fog && this.settings.fogDensity) {
            this.fog.density = this.settings.fogDensity;
            console.log(`Updated fog density: ${this.settings.fogDensity}`);
        }

        // Update shadow settings
        if (this.renderer) {
            this.renderer.shadowMap.enabled = this.settings.shadowsEnabled !== undefined ?
                this.settings.shadowsEnabled : true;
            console.log(`Updated shadows enabled: ${this.renderer.shadowMap.enabled}`);
        }
    }
} 