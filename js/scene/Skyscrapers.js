// Skyscrapers.js - Manages skyscrapers in a Central Business District
import * as THREE from 'three';

export default class Skyscrapers {
    constructor(scene, eventBus, qualitySettings, skyscraperMapData) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.qualitySettings = qualitySettings;
        this.skyscraperMapData = skyscraperMapData; // Static skyscraper data from map

        // Collection for skyscraper instances
        this.skyscrapers = [];

        // Skyscraper type definitions with meshes and materials
        this.skyscraperTypes = {
            modern: null,      // Will be 1940s art deco style
            glass: null,       // Will be early glass/steel style
            office: null,      // Will be brick/stone style
            corporate: null,
            residential: null,
            landmark: null     // Will be Empire State style
        };

        // Central Business District location
        this.cbdCenter = null;

        // Performance settings
        this.detailLevel = this.qualitySettings.getCurrentSettings().environmentDetail;
        this.maxSegments = this.detailLevel === 'high' ? 8 : (this.detailLevel === 'medium' ? 6 : 4);
        this.useWindowTextures = this.detailLevel !== 'high'; // Use textures for windows except in high detail
        this.maxWindowsPerSide = this.detailLevel === 'high' ? 8 : (this.detailLevel === 'medium' ? 6 : 4);
        this.distanceThreshold = 600; // Distance at which to reduce detail

        // Height multiplier for taller buildings (increased from 3x to 5x)
        this.heightMultiplier = 5.0;

        // Window textures (used instead of geometry for optimization)
        this.windowTextures = {
            regular: this.createWindowTexture(0x88AACC, 4, 6),
            small: this.createWindowTexture(0x88AACC, 6, 8),
            artDeco: this.createArtDecoWindowTexture(),
            neonLit: this.createNeonLitWindowTexture()
        };

        // Get quality settings
        const settings = this.qualitySettings.getCurrentSettings();
        const skyscraperSettings = settings.skyscrapers || {};

        // Store settings
        this.buildingCount = skyscraperSettings.count || 10; // Default to medium
        this.segments = skyscraperSettings.segments || 6; // Default to medium

        console.log(`Creating 1940s-style skyscrapers with quality settings: segments=${this.segments}`);

        // Initialize skyscrapers
        this.init();
    }

    /**
     * Initialize skyscraper types and create instances
     */
    init() {
        this.createSkyscraperTypes();
        this.placeSkyscrapers();
        console.log(`CBD initialized with ${this.skyscrapers.length} skyscrapers`);
    }

    /**
     * Find a suitable location for the CBD that avoids the runway
     * @returns {Object} The CBD area bounds
     */
    findSuitableCBDLocation() {
        // Define several potential CBD locations to try
        const cbdSize = 300; // 300x300 units

        // Just return a fixed position that's far from runway (which is usually at origin)
        // This is a simpler approach than using events, but still places the CBD away from the runway
        return {
            xMin: 600,
            xMax: 900,
            zMin: 600,
            zMax: 900
        };
    }

    /**
     * Create a texture pattern for windows
     */
    createWindowTexture(color, xCount, yCount) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Background color (building material)
        ctx.fillStyle = '#555555';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw windows
        const windowWidth = canvas.width / xCount * 0.7;
        const windowHeight = canvas.height / yCount * 0.7;
        const spacingX = (canvas.width - windowWidth * xCount) / (xCount + 1);
        const spacingY = (canvas.height - windowHeight * yCount) / (yCount + 1);

        ctx.fillStyle = '#' + new THREE.Color(color).getHexString();

        for (let x = 0; x < xCount; x++) {
            for (let y = 0; y < yCount; y++) {
                const xPos = spacingX + x * (windowWidth + spacingX);
                const yPos = spacingY + y * (windowHeight + spacingY);
                ctx.fillRect(xPos, yPos, windowWidth, windowHeight);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    /**
     * Create Art Deco style window pattern with decorative elements
     */
    createArtDecoWindowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Background color (building material)
        ctx.fillStyle = '#CCCCAA'; // Limestone color
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw a grid of windows
        const rows = 8;
        const cols = 6;
        const windowWidth = canvas.width / cols * 0.7;
        const windowHeight = canvas.height / rows * 0.7;
        const spacingX = (canvas.width - windowWidth * cols) / (cols + 1);
        const spacingY = (canvas.height - windowHeight * rows) / (rows + 1);

        // Window color
        ctx.fillStyle = '#88AACC';

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const xPos = spacingX + x * (windowWidth + spacingX);
                const yPos = spacingY + y * (windowHeight + spacingY);

                // Draw window with art deco frame
                ctx.fillRect(xPos, yPos, windowWidth, windowHeight);

                // Art deco decorative border
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#BBAA55'; // Gold/brass color
                ctx.strokeRect(xPos - 2, yPos - 2, windowWidth + 4, windowHeight + 4);

                // Add details to windows every few floors
                if (y % 3 === 0) {
                    ctx.fillStyle = '#BBAA55';
                    // Decorative horizontal band
                    ctx.fillRect(xPos - 5, yPos - 5, windowWidth + 10, 5);
                    ctx.fillStyle = '#88AACC';
                }
            }
        }

        // Add horizontal decorative bands
        ctx.fillStyle = '#BBAA55';
        for (let i = 1; i < rows; i += 3) {
            const y = (canvas.height / rows) * i;
            ctx.fillRect(0, y - 3, canvas.width, 6);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    /**
     * Create 1940s neon-lit nighttime window pattern
     */
    createNeonLitWindowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Dark building material at night
        ctx.fillStyle = '#222222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Window grid
        const rows = 10;
        const cols = 8;
        const windowWidth = canvas.width / cols * 0.6;
        const windowHeight = canvas.height / rows * 0.6;
        const spacingX = (canvas.width - windowWidth * cols) / (cols + 1);
        const spacingY = (canvas.height - windowHeight * rows) / (rows + 1);

        // Create 1940s "lit windows at night" effect
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const xPos = spacingX + x * (windowWidth + spacingX);
                const yPos = spacingY + y * (windowHeight + spacingY);

                // Randomize which windows are lit vs dark (realistic 1940s nighttime office building)
                const isLit = Math.random() > 0.4; // 60% of windows lit

                if (isLit) {
                    // Create warm glow for lit windows
                    const gradient = ctx.createRadialGradient(
                        xPos + windowWidth / 2, yPos + windowHeight / 2, 0,
                        xPos + windowWidth / 2, yPos + windowHeight / 2, windowWidth / 1.5
                    );

                    // Warm yellow light gradient
                    gradient.addColorStop(0, 'rgba(255, 230, 150, 0.9)');
                    gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

                    // Draw glowing window
                    ctx.fillStyle = '#FFDB7A';
                    ctx.fillRect(xPos, yPos, windowWidth, windowHeight);

                    // Draw glow
                    ctx.fillStyle = gradient;
                    ctx.fillRect(
                        xPos - windowWidth / 2,
                        yPos - windowHeight / 2,
                        windowWidth * 2,
                        windowHeight * 2
                    );
                } else {
                    // Dark window
                    ctx.fillStyle = '#334455';
                    ctx.fillRect(xPos, yPos, windowWidth, windowHeight);
                }
            }
        }

        // Add some neon sign effect at the top (typical of 1940s buildings)
        if (Math.random() > 0.5) {
            const neonColor = Math.random() > 0.5 ? '#FF5577' : '#77DDFF';
            ctx.fillStyle = neonColor;
            ctx.fillRect(canvas.width * 0.3, 20, canvas.width * 0.4, 15);

            // Neon glow
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, 25, 0,
                canvas.width / 2, 25, 30
            );
            gradient.addColorStop(0, neonColor);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(canvas.width * 0.2, 5, canvas.width * 0.6, 40);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    /**
     * Create skyscraper types - optimized for lower triangle count with authentic 1940s styles
     */
    createSkyscraperTypes() {
        console.log('Creating optimized 1940s skyscraper types');

        // Create basic materials
        const brickMaterial = new THREE.MeshStandardMaterial({
            color: 0xA65E44, // Reddish brown brick color
            roughness: 0.9,
            metalness: 0.1
        });

        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0xCCCCAA, // Limestone color
            roughness: 0.7,
            metalness: 0.1
        });

        const concreteMaterial = new THREE.MeshStandardMaterial({
            color: 0xBBBBBB, // Concrete gray
            roughness: 0.8,
            metalness: 0.0
        });

        const steelMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555, // Dark steel
            roughness: 0.5,
            metalness: 0.6
        });

        // Basic window material
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0x88AACC, // Blue-tinted glass
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.7
        });

        // Window textured materials for optimization
        const windowMaterialRegular = stoneMaterial.clone();
        windowMaterialRegular.map = this.windowTextures.regular;

        const windowMaterialSmall = stoneMaterial.clone();
        windowMaterialSmall.map = this.windowTextures.small;

        // Art Deco window material (more authentic 1940s look)
        const windowMaterialArtDeco = stoneMaterial.clone();
        windowMaterialArtDeco.map = this.windowTextures.artDeco;

        // Night-time lit windows for some buildings
        const windowMaterialNeonLit = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.3,
            metalness: 0.2,
            map: this.windowTextures.neonLit,
            emissive: 0x555555,
            emissiveMap: this.windowTextures.neonLit,
            emissiveIntensity: 0.5
        });

        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0xBBAA55, // Brass/gold accent for Art Deco
            roughness: 0.3,
            metalness: 0.9
        });

        // Create all skyscraper types - with authentic 1940s styles
        this.skyscraperTypes.modern = this.createArtDecoSkyscraper(stoneMaterial, windowMaterialArtDeco, accentMaterial);
        this.skyscraperTypes.glass = this.createEarly40sGlassSteelSkyscraper(windowMaterialRegular, steelMaterial);
        this.skyscraperTypes.office = this.createBrickSkyscraper(brickMaterial, windowMaterialRegular);
        this.skyscraperTypes.corporate = this.createWoolworthStyleSkyscraper(stoneMaterial, windowMaterialArtDeco, accentMaterial);
        this.skyscraperTypes.residential = this.createRadiatorSkyscraper(brickMaterial, windowMaterialRegular, steelMaterial);
        this.skyscraperTypes.landmark = this.createEmpireStateStyleSkyscraper(stoneMaterial, steelMaterial, accentMaterial, windowMaterialNeonLit);
    }

    /**
     * Create an Art Deco style skyscraper (1920s-40s) - Optimized version
     */
    createArtDecoSkyscraper(stoneMaterial, windowMaterial, accentMaterial) {
        const group = new THREE.Group();

        // Segments reduced for optimization
        const segments = Math.min(this.maxSegments, 6);

        // Base section (wider)
        const baseWidth = 25;
        const baseDepth = 25;
        const baseHeight = 10 * this.heightMultiplier;
        const base = this.createBuildingComponent(baseWidth, baseHeight, baseDepth, stoneMaterial, segments);
        base.position.y = baseHeight / 2;
        group.add(base);

        // Middle section (narrower)
        const middleWidth = 20;
        const middleDepth = 20;
        const middleHeight = 40 * this.heightMultiplier;
        const middle = this.createBuildingComponent(middleWidth, middleHeight, middleDepth, windowMaterial, segments);
        middle.position.y = baseHeight + middleHeight / 2;
        group.add(middle);

        // Top section (smallest)
        const topWidth = 15;
        const topDepth = 15;
        const topHeight = 12 * this.heightMultiplier;
        const top = this.createBuildingComponent(topWidth, topHeight, topDepth, stoneMaterial, segments);
        top.position.y = baseHeight + middleHeight + topHeight / 2;
        group.add(top);

        // Art Deco crown with stepped design (very 1940s)
        const crownWidth = 12;
        const crownDepth = 12;
        const crownHeight = 6 * this.heightMultiplier;
        const crown = this.createBuildingComponent(crownWidth, crownHeight, crownDepth, accentMaterial, segments);
        crown.position.y = baseHeight + middleHeight + topHeight + crownHeight / 2;
        group.add(crown);

        // Decorative stepped cap (typical Art Deco feature)
        const capWidth = 8;
        const capDepth = 8;
        const capHeight = 4 * this.heightMultiplier;
        const cap = this.createBuildingComponent(capWidth, capHeight, capDepth, accentMaterial, segments);
        cap.position.y = baseHeight + middleHeight + topHeight + crownHeight + capHeight / 2;
        group.add(cap);

        // Only add detailed windows in high detail mode
        if (!this.useWindowTextures) {
            // Add fewer windows with larger size for optimization
            const windowCount = Math.min(this.maxWindowsPerSide, 6);
            this.addGridWindows(base, windowCount, 2, windowCount, glassMaterial);
            this.addGridWindows(middle, windowCount - 1, 6, windowCount - 1, glassMaterial);
            this.addGridWindows(top, windowCount - 2, 2, windowCount - 2, glassMaterial);
        }

        // Enable shadows
        group.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        // Store original height for scaling
        group.userData = { originalHeight: baseHeight + middleHeight + topHeight + crownHeight + capHeight };

        return group;
    }

    /**
     * Create an early 1940s glass/steel skyscraper - Optimized version
     */
    createEarly40sGlassSteelSkyscraper(windowMaterial, steelMaterial) {
        const group = new THREE.Group();

        // Segments reduced for optimization
        const segments = Math.min(this.maxSegments, 6);

        // Base section (wider)
        const baseWidth = 20;
        const baseDepth = 20;
        const baseHeight = 10 * this.heightMultiplier;
        const base = this.createBuildingComponent(baseWidth, baseHeight, baseDepth, steelMaterial, segments);
        base.position.y = baseHeight / 2;
        group.add(base);

        // Main building block
        const width = 18;
        const depth = 18;
        const height = 55 * this.heightMultiplier;
        const main = this.createBuildingComponent(width, height, depth, windowMaterial, segments);
        main.position.y = baseHeight + height / 2;
        group.add(main);

        // Secondary tower (smaller section)
        const secondaryWidth = 12;
        const secondaryDepth = 12;
        const secondaryHeight = 15 * this.heightMultiplier;
        const secondary = this.createBuildingComponent(secondaryWidth, secondaryHeight, secondaryDepth, windowMaterial, segments);
        secondary.position.y = baseHeight + height + secondaryHeight / 2;
        group.add(secondary);

        // Add vertical steel elements (common in 1940s skyscrapers)
        const steelStripWidth = 1;
        const steelStripDepth = depth + 0.2;
        const steelStripHeight = height * 0.95;

        // Left vertical steel strip
        const leftSteel = this.createBuildingComponent(steelStripWidth, steelStripHeight, steelStripDepth, steelMaterial, segments);
        leftSteel.position.set(-width / 2 + 0, baseHeight + height / 2, 0);
        group.add(leftSteel);

        // Right vertical steel strip
        const rightSteel = this.createBuildingComponent(steelStripWidth, steelStripHeight, steelStripDepth, steelMaterial, segments);
        rightSteel.position.set(width / 2 - 0, baseHeight + height / 2, 0);
        group.add(rightSteel);

        // Only add detailed windows in high detail mode
        if (!this.useWindowTextures) {
            // Add fewer windows with larger size for optimization
            const windowCount = Math.min(this.maxWindowsPerSide, 6);
            this.addGridWindows(main, windowCount, 8, windowCount, glassMaterial);
            this.addGridWindows(secondary, windowCount - 2, 2, windowCount - 2, glassMaterial);
        }

        // Enable shadows
        group.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        // Store original height for scaling
        group.userData = { originalHeight: baseHeight + height + secondaryHeight };

        return group;
    }

    /**
     * Create a brick skyscraper typical of 1940s - Optimized version
     */
    createBrickSkyscraper(brickMaterial, windowMaterial) {
        const group = new THREE.Group();

        // Segments reduced for optimization
        const segments = Math.min(this.maxSegments, 6);

        // Base dimensions
        const width = 20;
        const depth = 20;
        const height = 50 * this.heightMultiplier;

        // Main building
        const main = this.createBuildingComponent(width, height, depth, brickMaterial, segments);
        main.position.y = height / 2;
        group.add(main);

        // Window sections (using a textured material instead of geometric windows)
        const windowSectionWidth = width * 0.8;
        const windowSectionDepth = 0.5;
        const windowSectionHeight = height * 0.8;

        // Front windows
        const frontWindows = this.createBuildingComponent(
            windowSectionWidth, windowSectionHeight, windowSectionDepth,
            windowMaterial, segments
        );
        frontWindows.position.set(0, height / 2, depth / 2 + 0.1);
        group.add(frontWindows);

        // Back windows
        const backWindows = this.createBuildingComponent(
            windowSectionWidth, windowSectionHeight, windowSectionDepth,
            windowMaterial, segments
        );
        backWindows.position.set(0, height / 2, -depth / 2 - 0.1);
        backWindows.rotation.y = Math.PI;
        group.add(backWindows);

        // Side windows
        const sideWindowWidth = 0.5;
        const sideWindowHeight = windowSectionHeight;
        const sideWindowDepth = depth * 0.8;

        const rightWindows = this.createBuildingComponent(
            sideWindowWidth, sideWindowHeight, sideWindowDepth,
            windowMaterial, segments
        );
        rightWindows.position.set(width / 2 + 0.1, height / 2, 0);
        rightWindows.rotation.y = Math.PI / 2;
        group.add(rightWindows);

        const leftWindows = this.createBuildingComponent(
            sideWindowWidth, sideWindowHeight, sideWindowDepth,
            windowMaterial, segments
        );
        leftWindows.position.set(-width / 2 - 0.1, height / 2, 0);
        leftWindows.rotation.y = -Math.PI / 2;
        group.add(leftWindows);

        // Decorative brick crown (typical of 1940s buildings)
        const crownWidth = width + 2;
        const crownDepth = depth + 2;
        const crownHeight = 3 * this.heightMultiplier;
        const crown = this.createBuildingComponent(crownWidth, crownHeight, crownDepth, brickMaterial, segments);
        crown.position.y = height + crownHeight / 2;
        group.add(crown);

        // Enable shadows
        group.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        // Store original height for scaling
        group.userData = { originalHeight: height + crownHeight };

        return group;
    }

    /**
     * Create a Woolworth-style Art Deco skyscraper (popular 1940s style)
     */
    createWoolworthStyleSkyscraper(stoneMaterial, windowMaterial, accentMaterial) {
        const group = new THREE.Group();

        // Segments reduced for optimization
        const segments = Math.min(this.maxSegments, 6);

        // Base section
        const baseWidth = 30;
        const baseDepth = 30;
        const baseHeight = 15 * this.heightMultiplier;
        const base = this.createBuildingComponent(baseWidth, baseHeight, baseDepth, stoneMaterial, segments);
        base.position.y = baseHeight / 2;
        group.add(base);

        // Middle section - characteristic wide middle section
        const middleWidth = 25;
        const middleDepth = 25;
        const middleHeight = 40 * this.heightMultiplier;
        const middle = this.createBuildingComponent(middleWidth, middleHeight, middleDepth, windowMaterial, segments);
        middle.position.y = baseHeight + middleHeight / 2;
        group.add(middle);

        // Upper section with setbacks
        const upper1Width = 20;
        const upper1Depth = 20;
        const upper1Height = 20 * this.heightMultiplier;
        const upper1 = this.createBuildingComponent(upper1Width, upper1Height, upper1Depth, windowMaterial, segments);
        upper1.position.y = baseHeight + middleHeight + upper1Height / 2;
        group.add(upper1);

        // Next setback
        const upper2Width = 16;
        const upper2Depth = 16;
        const upper2Height = 15 * this.heightMultiplier;
        const upper2 = this.createBuildingComponent(upper2Width, upper2Height, upper2Depth, windowMaterial, segments);
        upper2.position.y = baseHeight + middleHeight + upper1Height + upper2Height / 2;
        group.add(upper2);

        // Distinctive Gothic crown
        const crownWidth = 12;
        const crownDepth = 12;
        const crownHeight = 10 * this.heightMultiplier;
        const crown = this.createBuildingComponent(crownWidth, crownHeight, crownDepth, accentMaterial, segments);
        crown.position.y = baseHeight + middleHeight + upper1Height + upper2Height + crownHeight / 2;
        group.add(crown);

        // Decorative spire
        const spireHeight = 8 * this.heightMultiplier;
        const spireGeometry = new THREE.ConeGeometry(3, spireHeight, segments);
        const spire = new THREE.Mesh(spireGeometry, accentMaterial);
        spire.position.y = baseHeight + middleHeight + upper1Height + upper2Height + crownHeight + spireHeight / 2;
        spire.castShadow = true;
        group.add(spire);

        // Enable shadows
        group.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        // Store original height for scaling
        group.userData = { originalHeight: baseHeight + middleHeight + upper1Height + upper2Height + crownHeight + spireHeight };

        return group;
    }

    /**
     * Create a Radiator-style skyscraper (distinctive 1940s style)
     */
    createRadiatorSkyscraper(brickMaterial, windowMaterial, steelMaterial) {
        const group = new THREE.Group();

        // Segments reduced for optimization
        const segments = Math.min(this.maxSegments, 6);

        // Base section
        const baseWidth = 30;
        const baseDepth = 20;
        const baseHeight = 10 * this.heightMultiplier;
        const base = this.createBuildingComponent(baseWidth, baseHeight, baseDepth, brickMaterial, segments);
        base.position.y = baseHeight / 2;
        group.add(base);

        // Build a "radiator plan" building (central shaft with wings)
        const shaftWidth = 18;
        const shaftDepth = 14;
        const shaftHeight = 60 * this.heightMultiplier;
        const shaft = this.createBuildingComponent(shaftWidth, shaftHeight, shaftDepth, windowMaterial, segments);
        shaft.position.y = baseHeight + shaftHeight / 2;
        group.add(shaft);

        // Add the characteristic "wings" of a radiator building
        const wingThickness = 8;
        const wingDepth = 20;
        const wingHeight = 56 * this.heightMultiplier;

        // Left wing
        const leftWing = this.createBuildingComponent(wingThickness, wingHeight, wingDepth, windowMaterial, segments);
        leftWing.position.set(-shaftWidth / 2 - wingThickness / 2 + 1, baseHeight + wingHeight / 2, 0);
        group.add(leftWing);

        // Right wing
        const rightWing = this.createBuildingComponent(wingThickness, wingHeight, wingDepth, windowMaterial, segments);
        rightWing.position.set(shaftWidth / 2 + wingThickness / 2 - 1, baseHeight + wingHeight / 2, 0);
        group.add(rightWing);

        // Decorative top for shaft
        const topWidth = 20;
        const topDepth = 16;
        const topHeight = 5 * this.heightMultiplier;
        const top = this.createBuildingComponent(topWidth, topHeight, topDepth, steelMaterial, segments);
        top.position.y = baseHeight + shaftHeight + topHeight / 2;
        group.add(top);

        // Enable shadows
        group.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        // Store original height for scaling
        group.userData = { originalHeight: baseHeight + shaftHeight + topHeight };

        return group;
    }

    /**
     * Create an Empire State Building style skyscraper - Optimized version
     */
    createEmpireStateStyleSkyscraper(stoneMaterial, steelMaterial, accentMaterial, windowMaterial) {
        // Iconic Art Deco landmark in Empire State Building style
        const group = new THREE.Group();

        // Segments reduced for optimization
        const segments = Math.min(this.maxSegments, 6);

        // Base section 
        const baseWidth = 40;
        const baseDepth = 40;
        const baseHeight = 15 * this.heightMultiplier;
        const base = this.createBuildingComponent(baseWidth, baseHeight, baseDepth, stoneMaterial, segments);
        base.position.y = baseHeight / 2;
        group.add(base);

        // Lower setback section
        const lower1Width = 35;
        const lower1Depth = 35;
        const lower1Height = 25 * this.heightMultiplier;
        const lower1 = this.createBuildingComponent(lower1Width, lower1Height, lower1Depth, windowMaterial, segments);
        lower1.position.y = baseHeight + lower1Height / 2;
        group.add(lower1);

        // Main tower section
        const mainWidth = 25;
        const mainDepth = 25;
        const mainHeight = 45 * this.heightMultiplier;
        const main = this.createBuildingComponent(mainWidth, mainHeight, mainDepth, windowMaterial, segments);
        main.position.y = baseHeight + lower1Height + mainHeight / 2;
        group.add(main);

        // Top section
        const topWidth = 15;
        const topDepth = 15;
        const topHeight = 10 * this.heightMultiplier;
        const top = this.createBuildingComponent(topWidth, topHeight, topDepth, stoneMaterial, segments);
        top.position.y = baseHeight + lower1Height + mainHeight + topHeight / 2;
        group.add(top);

        // Decorative spire - simplified but imposing
        const spireHeight = 20 * this.heightMultiplier;
        const spireGeometry = new THREE.ConeGeometry(3, spireHeight, segments);
        const spire = new THREE.Mesh(spireGeometry, accentMaterial);
        spire.position.y = baseHeight + lower1Height + mainHeight + topHeight + spireHeight / 2;
        spire.castShadow = true;
        group.add(spire);

        // Add decorative horizontal elements (typical of Empire State)
        const bandHeight = 1 * this.heightMultiplier;
        const band1 = this.createBuildingComponent(lower1Width + 2, bandHeight, lower1Depth + 2, accentMaterial, segments);
        band1.position.y = baseHeight;
        group.add(band1);

        const band2 = this.createBuildingComponent(mainWidth + 2, bandHeight, mainDepth + 2, accentMaterial, segments);
        band2.position.y = baseHeight + lower1Height;
        group.add(band2);

        const band3 = this.createBuildingComponent(topWidth + 2, bandHeight, topDepth + 2, accentMaterial, segments);
        band3.position.y = baseHeight + lower1Height + mainHeight;
        group.add(band3);

        // Only add detailed windows in high detail mode
        if (!this.useWindowTextures) {
            // Add fewer windows with larger size for optimization
            const windowCount = Math.min(this.maxWindowsPerSide, 6);
            this.addGridWindows(base, windowCount, 2, windowCount, glassMaterial);
            this.addGridWindows(lower1, windowCount - 1, 4, windowCount - 1, glassMaterial);
            this.addGridWindows(main, windowCount - 2, 7, windowCount - 2, glassMaterial);
            this.addGridWindows(top, windowCount - 3, 2, windowCount - 3, glassMaterial);
        }

        // Enable shadows
        group.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        // Store original height for scaling
        const totalHeight = baseHeight + lower1Height + mainHeight + topHeight + spireHeight;
        group.userData = { originalHeight: totalHeight };

        return group;
    }

    /**
     * Add grid of windows to a building mesh - used only in high detail mode
     */
    addGridWindows(buildingMesh, xCount, yCount, zCount, glassMaterial) {
        // Skip if using window textures for optimization
        if (this.useWindowTextures) return;

        const geometry = buildingMesh.geometry;
        const size = new THREE.Vector3();
        const box = new THREE.Box3().setFromObject(buildingMesh);
        box.getSize(size);

        const width = size.x;
        const height = size.y;
        const depth = size.z;

        const windowSize = Math.min(width, depth) / (Math.max(xCount, zCount) * 2);
        const windowDepth = 0.1;

        const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize * 1.5, windowDepth, 1, 1, 1);

        // Reduce number of windows for optimization
        const maxWindows = Math.max(4, xCount * yCount * zCount / 4);
        let windowCount = 0;

        // Front and back face windows
        for (let y = 0; y < yCount && windowCount < maxWindows; y++) {
            for (let x = 0; x < xCount && windowCount < maxWindows; x++) {
                if (Math.random() < 0.7) { // Add some randomness to reduce window count
                    // Front face
                    const frontWindow = new THREE.Mesh(windowGeometry, glassMaterial);
                    const xPos = (-width / 2) + (width / (xCount + 1)) * (x + 1);
                    const yPos = (-height / 2) + (height / (yCount + 1)) * (y + 1);
                    frontWindow.position.set(xPos, yPos, depth / 2);
                    buildingMesh.add(frontWindow);
                    windowCount++;

                    // Back face
                    if (windowCount < maxWindows && Math.random() < 0.8) {
                        const backWindow = new THREE.Mesh(windowGeometry, glassMaterial);
                        backWindow.position.set(xPos, yPos, -depth / 2);
                        backWindow.rotation.y = Math.PI;
                        buildingMesh.add(backWindow);
                        windowCount++;
                    }
                }
            }
        }

        // Side face windows (fewer)
        if (windowCount < maxWindows) {
            for (let y = 0; y < yCount && windowCount < maxWindows; y++) {
                for (let z = 0; z < zCount / 2 && windowCount < maxWindows; z++) {
                    if (Math.random() < 0.6) { // Add some randomness to reduce window count
                        // Right face (fewer windows)
                        const rightWindow = new THREE.Mesh(windowGeometry, glassMaterial);
                        const yPos = (-height / 2) + (height / (yCount + 1)) * (y + 1);
                        const zPos = (-depth / 2) + (depth / (zCount + 1)) * (z + 1);
                        rightWindow.position.set(width / 2, yPos, zPos);
                        rightWindow.rotation.y = Math.PI / 2;
                        buildingMesh.add(rightWindow);
                        windowCount++;

                        // Left face (fewer windows)
                        if (windowCount < maxWindows && Math.random() < 0.7) {
                            const leftWindow = new THREE.Mesh(windowGeometry, glassMaterial);
                            leftWindow.position.set(-width / 2, yPos, zPos);
                            leftWindow.rotation.y = -Math.PI / 2;
                            buildingMesh.add(leftWindow);
                            windowCount++;
                        }
                    }
                }
            }
        }
    }

    /**
     * Create a building component with optimized geometry
     */
    createBuildingComponent(width, height, depth, material, segments = 1) {
        // Use minimal segments to reduce triangle count
        const geometry = new THREE.BoxGeometry(
            width,
            height,
            depth,
            segments,  // Lower widthSegments
            segments,  // Lower heightSegments
            segments   // Lower depthSegments
        );

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    /**
     * Place skyscrapers according to map data - with distance-based LOD
     */
    placeSkyscrapers() {
        if (!this.skyscraperMapData || !this.skyscraperMapData.buildings) {
            console.warn('No skyscraper map data available');
            return;
        }

        // Clear existing skyscrapers
        this.clear();

        // Use the pre-defined center from the map
        this.cbdCenter = {
            x: this.skyscraperMapData.center.x,
            z: this.skyscraperMapData.center.z
        };

        // Create skyscrapers from map data
        this.skyscraperMapData.buildings.forEach(building => {
            // Skip buildings randomly for additional optimization (if many buildings)
            if (this.skyscraperMapData.buildings.length > 10 &&
                this.detailLevel === 'low' &&
                Math.random() < 0.3) {
                return;
            }

            // Get the skyscraper type
            const skyscraperType = this.skyscraperTypes[building.type];
            if (!skyscraperType) {
                console.warn(`Unknown skyscraper type: ${building.type}`);
                return;
            }

            // Clone the skyscraper type
            const skyscraper = skyscraperType.clone();

            // Apply original height scaling first
            const originalHeight = skyscraper.userData.originalHeight;
            const scale = building.height / originalHeight;
            skyscraper.scale.set(1, scale, 1);

            // Position the skyscraper
            skyscraper.position.set(building.x, 0, building.z);

            // Rotate the skyscraper
            skyscraper.rotation.y = building.rotation || 0;

            // Enable shadows for all buildings
            skyscraper.traverse(object => {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });

            // Add to skyscrapers array and scene
            this.skyscrapers.push(skyscraper);
            this.scene.add(skyscraper);
        });
    }

    /**
     * Update skyscrapers based on camera distance for LOD
     */
    update(deltaTime) {
        if (!this.camera) {
            // Find camera in scene
            this.camera = this.scene.children.find(child =>
                child.type === 'PerspectiveCamera' || child.type === 'OrthographicCamera'
            );

            if (!this.camera) return;
        }

        // Apply distance-based LOD
        this.skyscrapers.forEach(skyscraper => {
            const distance = this.camera.position.distanceTo(skyscraper.position);

            // For distant buildings, simplify further by hiding small parts
            if (distance > this.distanceThreshold) {
                // Hide small details when far away
                skyscraper.children.forEach(child => {
                    // Hide very small components to reduce draw calls
                    if (child.geometry &&
                        (child.geometry.parameters.width < 5 ||
                            child.geometry.parameters.height < 5 ||
                            child.geometry.parameters.depth < 5)) {
                        child.visible = false;
                    }
                });
            } else {
                // Show all parts when close
                skyscraper.children.forEach(child => {
                    child.visible = true;
                });
            }
        });
    }

    /**
     * Clear all skyscrapers
     */
    clear() {
        for (const skyscraper of this.skyscrapers) {
            this.scene.remove(skyscraper);
        }
        this.skyscrapers = [];
    }
} 