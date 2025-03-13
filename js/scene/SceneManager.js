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

        // Main actor (plane)
        this.mainActor = null;

        // Game state
        this.isMainMenuActive = true; // Default to true since game starts at menu
        this.adsClickable = false; // Control whether ads are clickable

        // Get current quality settings
        this.settings = this.qualitySettings.getCurrentSettings();

        // Mobile optimization flags
        this.isMobile = this.settings.mobilePriority !== null;
        this.useMemoryOptimization = this.isMobile && this.settings.mobilePriority.memory >= 2;

        // Initialize the game map - contains static positions for all elements
        this.gameMap = new GameMap();

        // Memory monitoring for mobile
        this.lastMemoryCheck = 0;
        this.memoryCheckInterval = 5000; // Check every 5 seconds
        this.memoryWarningShown = false;
        this.disposedForMemory = {
            farElements: false,
            shadows: false,
            postProcessing: false,
            textures: false,
            sponsorshipOptimized: false
        };
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

        // Create scene elements with static map data - conditional based on quality settings
        this.sky = new Sky(this.scene, this.sun); // Pass the sun to the sky
        this.ground = new Ground(this.scene);
        this.runway = new Runway(this.scene, this.gameMap.runway); // Pass runway config from map

        // Only create these elements if not using extreme memory optimization
        if (!this.useMemoryOptimization || this.settings.clouds.count > 0) {
            this.clouds = new Clouds(this.scene, this.eventBus, this.qualitySettings, this.gameMap.clouds); // Pass cloud config
        }

        if (!this.useMemoryOptimization || this.settings.trees.count.pine > 0) {
            this.trees = new Trees(this.scene, this.eventBus, this.qualitySettings, this.gameMap.trees); // Pass tree config
        }

        if (!this.useMemoryOptimization || this.settings.villages.count > 0) {
            this.villages = new Villages(this.scene, this.eventBus, this.runway, this.qualitySettings, this.gameMap.villages); // Pass village config
        }

        if (!this.useMemoryOptimization || this.settings.skyscrapers.count > 0) {
            this.skyscrapers = new Skyscrapers(this.scene, this.eventBus, this.qualitySettings, this.gameMap.skyscrapers); // Pass skyscraper config
        }

        // Always create sponsorship elements regardless of quality settings
        // These are critical for revenue generation
        this.billboards = new Billboard(this.scene, this.gameMap.billboards); // Pass billboard config
        this.zeppelin = new Zeppelin(this.scene, this.gameMap.zeppelin); // Pass zeppelin config
        this.groundLogo = new GroundLogo(this.scene, this.gameMap.groundLogo); // Pass ground logo config

        // Optimize sponsorship elements for mobile if in ultra-low or low quality mode
        if (this.isMobile && (this.qualitySettings.getQuality() === 'ultra-low' || this.qualitySettings.getQuality() === 'low')) {
            console.log('Optimizing sponsorship elements for mobile');
            this.optimizeSponsorshipElements();
        }

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

        // Set initial state
        this.adsClickable = !this.isMainMenuActive;

        // Register for performance warnings
        this.eventBus.on('performance.warning', this.handlePerformanceWarning.bind(this));

        // Setup regular memory checks for mobile
        if (this.isMobile) {
            console.log('Mobile device detected, enabling memory monitoring');
            this.eventBus.on('game.update', this.checkMemoryUsage.bind(this));
        }
    }

    /**
     * Check memory usage on mobile devices and take action if needed
     * @param {number} currentTime - Current game time
     */
    checkMemoryUsage(currentTime) {
        // Only check periodically to avoid performance impact
        if (!this.isMobile || currentTime - this.lastMemoryCheck < this.memoryCheckInterval) {
            return;
        }

        this.lastMemoryCheck = currentTime;

        // Check if memory API is available (Chrome/Edge only)
        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

            console.log(`Memory usage: ${Math.round(usedRatio * 100)}% (${Math.round(memory.usedJSHeapSize / 1048576)}MB / ${Math.round(memory.jsHeapSizeLimit / 1048576)}MB)`);

            // If memory usage is high, start optimization steps
            if (usedRatio > 0.7 && !this.disposedForMemory.farElements) {
                console.warn('Memory usage high (70%+), removing distant elements');
                this.disposeFarElements();
                this.disposedForMemory.farElements = true;
                this.showMemoryWarning('Performance optimized: Reduced world elements');
            }

            if (usedRatio > 0.8 && !this.disposedForMemory.shadows) {
                console.warn('Memory usage very high (80%+), disabling shadows');
                this.disableShadows();
                this.disposedForMemory.shadows = true;
                this.showMemoryWarning('Performance optimized: Disabled shadows');
            }

            // At 85% usage, further optimize sponsorship elements without removing them
            if (usedRatio > 0.85 && !this.disposedForMemory.sponsorshipOptimized) {
                console.warn('Memory usage very high (85%+), further optimizing sponsorship elements');
                this.furtherOptimizeSponsorshipElements();
                this.disposedForMemory.sponsorshipOptimized = true;
                this.showMemoryWarning('Performance optimized: Simplified sponsorship elements');
            }

            if (usedRatio > 0.9) {
                console.error('Memory usage critical (90%+), recommending refresh');
                this.showMemoryWarning('Memory usage critical! Game may crash soon. Consider refreshing the page.', 'error');
            }
        }
    }

    /**
     * Further optimize sponsorship elements when memory usage is critical
     * This reduces their quality but keeps them visible
     */
    furtherOptimizeSponsorshipElements() {
        // Further simplify billboards if they exist
        if (this.billboards && this.billboards.simplifyForLowMemory) {
            this.billboards.simplifyForLowMemory();
        } else if (this.billboards) {
            // If no specific method exists, use a generic approach to simplify
            console.log('Simplifying billboards for low memory conditions');

            // Reduce texture resolution to absolute minimum
            this.scene.traverse(object => {
                if (object.userData && object.userData.type === 'billboard' && object.material) {
                    const materials = Array.isArray(object.material) ? object.material : [object.material];

                    materials.forEach(material => {
                        // Turn off all special effects
                        if (material.roughness) material.roughness = 1;
                        if (material.metalness) material.metalness = 0;

                        // Set lowest possible texture resolution
                        for (const propName in material) {
                            const prop = material[propName];
                            if (prop && prop.isTexture) {
                                // Use nearest filtering for both min and mag filters
                                prop.minFilter = THREE.NearestFilter;
                                prop.magFilter = THREE.NearestFilter;
                                prop.generateMipmaps = false;

                                // If this is not the main texture, remove it to save memory
                                if (propName !== 'map') {
                                    material[propName] = null;
                                }
                            }
                        }
                    });
                }
            });
        }

        // Keep sponsorship elements visible but reduce their complexity
        // This is a balance between performance and keeping ads visible
        if (this.zeppelin) {
            console.log('Simplifying zeppelin for low memory conditions');
            this.scene.traverse(object => {
                if (object.userData && object.userData.type === 'zeppelinAd') {
                    // Preserve main texture but remove any additional effects
                    if (object.material) {
                        const materials = Array.isArray(object.material) ? object.material : [object.material];
                        materials.forEach(material => {
                            // Simplify material properties
                            material.transparent = true;
                            material.opacity = 0.9; // Slightly transparent to improve performance
                            material.depthWrite = false; // Disable depth writing for better performance
                            material.flatShading = true; // Use flat shading for better performance
                        });
                    }
                }
            });
        }

        // For ground logo, remove any animations but keep the basic logo
        if (this.groundLogo) {
            console.log('Simplifying ground logo for low memory conditions');
            this.scene.traverse(object => {
                if (object.userData && object.userData.type === 'groundLogo') {
                    // Simplify material if possible
                    if (object.material) {
                        object.material.transparent = true;
                        object.material.opacity = 0.85;
                        object.material.depthWrite = false;
                    }
                }
            });
        }
    }

    /**
     * Remove far elements to save memory
     */
    disposeFarElements() {
        // Remove distant objects that aren't essential for gameplay
        if (this.clouds) {
            // Keep only 1/3 of the clouds
            const cloudCount = this.clouds.disposeDistant(0.33);
            console.log(`Removed ${cloudCount} distant clouds to save memory`);
        }

        if (this.trees) {
            // Keep only 1/4 of the trees
            const treeCount = this.trees.disposeDistant(0.25);
            console.log(`Removed ${treeCount} distant trees to save memory`);
        }

        if (this.villages) {
            // Remove all but the closest village
            this.villages.disposeDistant(0.1);
        }

        if (this.skyscrapers) {
            // Remove distant skyscrapers
            this.skyscrapers.disposeDistant(0.5);
        }

        // Force garbage collection (not directly possible in JS, but this helps)
        this.scene.background = this.scene.background.clone();

        // Tell the renderer to clear its cache
        this.renderer.dispose();
    }

    /**
     * Disable shadows to save memory and processing power
     */
    disableShadows() {
        if (this.sun) {
            this.sun.castShadow = false;
        }

        // Disable shadow maps in renderer
        this.renderer.shadowMap.enabled = false;

        // Traverse scene and disable shadows on all objects
        this.scene.traverse(object => {
            if (object.isMesh) {
                object.castShadow = false;
                object.receiveShadow = false;
            }
        });
    }

    /**
     * Show a memory warning to the user
     * @param {string} message - Warning message to display
     * @param {string} type - Type of warning (info, warning, error)
     */
    showMemoryWarning(message, type = 'warning') {
        this.eventBus.emit('notification', {
            message: message,
            type: type,
            duration: 5000
        });

        if (type === 'error' && !this.memoryWarningShown) {
            // More prominent warning for critical issues
            this.eventBus.emit('ui.memory.critical', message);
            this.memoryWarningShown = true;
        }
    }

    /**
     * Handle performance warnings from the performance monitor
     * @param {Object} data - Performance warning data
     */
    handlePerformanceWarning(data) {
        if (this.isMobile && data.type === 'memory') {
            console.warn('Performance monitor reported memory issue:', data);

            // Take more aggressive action if we get an explicit memory warning
            if (!this.disposedForMemory.textures) {
                this.reduceTextureQuality();
                this.disposedForMemory.textures = true;
                this.showMemoryWarning('Performance optimized: Reduced texture quality');
            }
        }
    }

    /**
     * Reduce texture quality to save memory
     */
    reduceTextureQuality() {
        // Loop through all materials in the scene
        this.scene.traverse(object => {
            if (object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];

                materials.forEach(material => {
                    // Reduce texture sizes where possible
                    for (const propName in material) {
                        const prop = material[propName];
                        if (prop && prop.isTexture) {
                            prop.minFilter = THREE.NearestFilter;
                            prop.magFilter = THREE.NearestFilter;
                            prop.generateMipmaps = false;
                        }
                    }
                });
            }
        });
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
        // Get quality settings
        const quality = this.qualitySettings.getQuality();
        const isMobile = this.isMobile;

        // Determine appropriate renderer settings based on device and quality
        const rendererOptions = {
            antialias: !isMobile && quality !== 'ultra-low', // Disable antialiasing on mobile and ultra-low
            powerPreference: isMobile ? 'low-power' : 'high-performance',
            precision: isMobile ? 'mediump' : 'highp', // Use medium precision on mobile
            depth: true,
            stencil: !isMobile, // Disable stencil buffer on mobile to save memory
            failIfMajorPerformanceCaveat: false // Don't fail on low-end devices
        };

        console.log(`Creating renderer with options:`, rendererOptions);

        this.renderer = new THREE.WebGLRenderer(rendererOptions);

        // Set size with lower pixel ratio for mobile
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Reduce pixel ratio on mobile to improve performance
        if (isMobile) {
            // Force 1.0 pixel ratio on ultra-low, cap at 1.5 for low
            const maxPixelRatio = quality === 'ultra-low' ? 1.0 :
                (quality === 'low' ? Math.min(1.5, window.devicePixelRatio) :
                    window.devicePixelRatio);
            this.renderer.setPixelRatio(maxPixelRatio);
        } else {
            this.renderer.setPixelRatio(window.devicePixelRatio);
        }

        // Configure shadow settings based on quality
        if (quality === 'ultra-low') {
            this.renderer.shadowMap.enabled = false;
        } else if (quality === 'low') {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.BasicShadowMap; // Less quality, better performance
        } else {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        // Disable some expensive features on mobile
        if (isMobile) {
            this.renderer.physicallyCorrectLights = false;
            this.renderer.outputEncoding = THREE.LinearEncoding; // Skip sRGB conversion
        } else {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }

        // Configure optimized clearing behavior
        this.renderer.autoClear = true;
        this.renderer.sortObjects = true;

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
        this.sun.shadow.mapSize.width = 16384 / 2;
        this.sun.shadow.mapSize.height = 16384 / 2;
        this.sun.shadow.camera.near = 10;
        this.sun.shadow.camera.far = 4000;
        this.sun.shadow.camera.left = -1500;
        this.sun.shadow.camera.right = 1500;
        this.sun.shadow.camera.top = 1500;
        this.sun.shadow.camera.bottom = -1500;
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

        // Find intersections
        const intersects = raycaster.intersectObjects(allClickableObjects);

        // Keep track of which component handles the current hover
        let runwayHandled = false;
        let billboardHandled = false;
        let zeppelinAdHandled = false;
        let groundLogoHandled = false;

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

        // Reset cursor if no hover is active
        if (!runwayHandled && !billboardHandled && !zeppelinAdHandled && !groundLogoHandled) {
            document.body.style.cursor = 'auto';
        }
    }

    /**
     * Optimize sponsorship elements for mobile devices
     * Reduces complexity while keeping elements visible
     */
    optimizeSponsorshipElements() {
        // Optimize billboards
        if (this.billboards) {
            // Only call optimizeForMobile if it exists
            if (typeof this.billboards.optimizeForMobile === 'function') {
                this.billboards.optimizeForMobile();
            } else {
                console.log('Billboard.optimizeForMobile not implemented, using generic optimization');
                this.applyGenericOptimization(this.billboards);
            }
        }

        // Optimize zeppelin
        if (this.zeppelin) {
            // Only call optimizeForMobile if it exists
            if (typeof this.zeppelin.optimizeForMobile === 'function') {
                this.zeppelin.optimizeForMobile();
            } else {
                console.log('Zeppelin.optimizeForMobile not implemented, using generic optimization');
                this.applyGenericOptimization(this.zeppelin);
            }
        }

        // Optimize ground logo
        if (this.groundLogo) {
            // Only call optimizeForMobile if it exists
            if (typeof this.groundLogo.optimizeForMobile === 'function') {
                this.groundLogo.optimizeForMobile();
            } else {
                console.log('GroundLogo.optimizeForMobile not implemented, using generic optimization');
                this.applyGenericOptimization(this.groundLogo);
            }
        }

        // Apply texture optimization to all sponsorship elements
        this.applyTextureOptimization();
    }

    /**
     * Apply generic optimization to a component
     * @param {Object} component - The component to optimize
     */
    applyGenericOptimization(component) {
        // Skip if component doesn't have a root object
        if (!component.object && !component.mesh) {
            return;
        }

        const root = component.object || component.mesh;

        // Reduce geometry complexity if possible
        root.traverse(object => {
            if (object.geometry) {
                // If the geometry has a simplify method, use it
                if (typeof object.geometry.simplify === 'function') {
                    object.geometry.simplify(0.5); // Simplify by 50%
                }

                // Dispose of any unused attributes to save memory
                for (const key in object.geometry.attributes) {
                    const attribute = object.geometry.attributes[key];
                    if (!attribute.isRequired) {
                        object.geometry.deleteAttribute(key);
                    }
                }
            }
        });
    }

    /**
     * Apply texture optimization to sponsorship elements
     */
    applyTextureOptimization() {
        // Apply texture optimization to all sponsorship elements
        this.scene.traverse(object => {
            if (object.material &&
                (object.userData.type === 'billboard' ||
                    object.userData.type === 'zeppelinAd' ||
                    object.userData.type === 'groundLogo')) {

                const materials = Array.isArray(object.material) ? object.material : [object.material];

                materials.forEach(material => {
                    // Reduce texture quality
                    for (const propName in material) {
                        const prop = material[propName];
                        if (prop && prop.isTexture) {
                            // Use lower resolution filtering
                            prop.minFilter = THREE.NearestFilter;
                            prop.magFilter = THREE.LinearFilter;
                            prop.generateMipmaps = false;

                            // If the texture has a custom resolution multiplier property
                            if (prop.userData && prop.userData.originalImage) {
                                // Create a smaller version of the texture for mobile
                                const originalImg = prop.userData.originalImage;
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');

                                // Reduce to 50% or 25% depending on quality
                                const scale = this.qualitySettings.getQuality() === 'ultra-low' ? 0.25 : 0.5;
                                canvas.width = originalImg.width * scale;
                                canvas.height = originalImg.height * scale;

                                ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
                                prop.image = canvas;
                                prop.needsUpdate = true;
                            }
                        }
                    }
                });
            }
        });
    }
} 