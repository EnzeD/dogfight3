// Skyscrapers.js - Manages skyscrapers in a Central Business District
import * as THREE from 'three';

export default class Skyscrapers {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;

        // Collection for skyscraper instances
        this.skyscrapers = [];

        // Skyscraper type definitions with meshes and materials
        this.skyscraperTypes = {
            modern: null,
            corporate: null,
            residential: null,
            landmark: null // Add landmark skyscraper type
        };

        // Initialize skyscrapers
        this.init();
    }

    /**
     * Initialize skyscraper types and create instances
     */
    init() {
        this.createSkyscraperTypes();
        this.placeSkyscrapers();
        console.log('CBD initialized with 15 skyscrapers including a landmark tower');
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
     * Create the different skyscraper type templates
     */
    createSkyscraperTypes() {
        // Create materials
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0x88CCEE,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.7
        });

        const concreteMaterial = new THREE.MeshStandardMaterial({
            color: 0xCCCCCC,
            roughness: 0.8,
            metalness: 0.2
        });

        const steelMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.4,
            metalness: 0.8
        });

        // Special materials for landmark building
        const landmarkGlassMaterial = new THREE.MeshStandardMaterial({
            color: 0x22AADD,
            roughness: 0.05,
            metalness: 0.95,
            transparent: true,
            opacity: 0.8
        });

        const goldAccentMaterial = new THREE.MeshStandardMaterial({
            color: 0xD4AF37,
            roughness: 0.3,
            metalness: 0.9
        });

        // Modern glass skyscraper
        this.skyscraperTypes.modern = this.createModernSkyscraper(glassMaterial, steelMaterial);

        // Corporate headquarters-style skyscraper
        this.skyscraperTypes.corporate = this.createCorporateSkyscraper(concreteMaterial, glassMaterial);

        // Residential high-rise
        this.skyscraperTypes.residential = this.createResidentialSkyscraper(concreteMaterial, glassMaterial);

        // Landmark supertall skyscraper
        this.skyscraperTypes.landmark = this.createLandmarkSkyscraper(landmarkGlassMaterial, steelMaterial, goldAccentMaterial);
    }

    /**
     * Create a landmark supertall skyscraper
     */
    createLandmarkSkyscraper(glassMaterial, steelMaterial, accentMaterial) {
        const building = new THREE.Group();

        // Main tower - much taller than others
        const towerHeight = 250; // Significantly taller than other buildings
        const towerWidth = 30;
        const towerGeometry = new THREE.BoxGeometry(towerWidth, towerHeight, towerWidth);
        const tower = new THREE.Mesh(towerGeometry, glassMaterial);
        tower.position.y = towerHeight / 2;
        tower.castShadow = true;
        tower.receiveShadow = true;
        building.add(tower);

        // Base section
        const baseHeight = 20;
        const baseWidth = 50;
        const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
        const base = new THREE.Mesh(baseGeometry, steelMaterial);
        base.position.y = baseHeight / 2;
        base.castShadow = true;
        base.receiveShadow = true;
        building.add(base);

        // Tapered top section
        const topHeight = 40;
        const topGeometry = new THREE.CylinderGeometry(5, towerWidth / 2, topHeight, 8);
        const top = new THREE.Mesh(topGeometry, glassMaterial);
        top.position.y = towerHeight + (topHeight / 2);
        top.castShadow = true;
        top.receiveShadow = true;
        building.add(top);

        // Spire
        const spireHeight = 30;
        const spireGeometry = new THREE.CylinderGeometry(0.5, 3, spireHeight, 8);
        const spire = new THREE.Mesh(spireGeometry, accentMaterial);
        spire.position.y = towerHeight + topHeight + (spireHeight / 2);
        spire.castShadow = true;
        spire.receiveShadow = true;
        building.add(spire);

        // Accent bands every 25 units of height
        const bandCount = Math.floor(towerHeight / 25);
        for (let i = 0; i < bandCount; i++) {
            const bandGeometry = new THREE.BoxGeometry(towerWidth + 2, 3, towerWidth + 2);
            const band = new THREE.Mesh(bandGeometry, accentMaterial);
            band.position.y = (i + 1) * 25;
            band.castShadow = true;
            band.receiveShadow = true;
            building.add(band);
        }

        // Add observation deck near the top
        const deckHeight = 8;
        const deckWidth = towerWidth + 15;
        const deckGeometry = new THREE.BoxGeometry(deckWidth, deckHeight, deckWidth);
        const deck = new THREE.Mesh(deckGeometry, accentMaterial);
        deck.position.y = towerHeight - 30;
        deck.castShadow = true;
        deck.receiveShadow = true;
        building.add(deck);

        return building;
    }

    /**
     * Create a modern glass skyscraper
     */
    createModernSkyscraper(glassMaterial, steelMaterial) {
        const building = new THREE.Group();

        // Main tower - tall and sleek
        const towerHeight = 80 + Math.random() * 40;
        const towerGeometry = new THREE.BoxGeometry(20, towerHeight, 20);
        const tower = new THREE.Mesh(towerGeometry, glassMaterial);
        tower.position.y = towerHeight / 2;
        tower.castShadow = true;
        tower.receiveShadow = true;
        building.add(tower);

        // Steel framework accents
        const frameworkCount = Math.floor(towerHeight / 10);
        for (let i = 0; i < frameworkCount; i++) {
            const frameGeometry = new THREE.BoxGeometry(22, 1, 22);
            const frame = new THREE.Mesh(frameGeometry, steelMaterial);
            frame.position.y = i * 10 + 5;
            frame.castShadow = true;
            frame.receiveShadow = true;
            building.add(frame);
        }

        // Antenna or spire on top
        const spireGeometry = new THREE.CylinderGeometry(0.5, 1, 15, 8);
        const spire = new THREE.Mesh(spireGeometry, steelMaterial);
        spire.position.y = towerHeight + 7.5;
        spire.castShadow = true;
        spire.receiveShadow = true;
        building.add(spire);

        return building;
    }

    /**
     * Create a corporate headquarters-style skyscraper
     */
    createCorporateSkyscraper(concreteMaterial, glassMaterial) {
        const building = new THREE.Group();

        // Base - wider footprint
        const baseHeight = 15;
        const baseGeometry = new THREE.BoxGeometry(40, baseHeight, 40);
        const base = new THREE.Mesh(baseGeometry, concreteMaterial);
        base.position.y = baseHeight / 2;
        base.castShadow = true;
        base.receiveShadow = true;
        building.add(base);

        // Main tower - stepped design
        const towerHeight = 60 + Math.random() * 30;
        const towerWidth = 30;
        const towerDepth = 30;
        const towerGeometry = new THREE.BoxGeometry(towerWidth, towerHeight, towerDepth);
        const tower = new THREE.Mesh(towerGeometry, glassMaterial);
        tower.position.y = baseHeight + (towerHeight / 2);
        tower.castShadow = true;
        tower.receiveShadow = true;
        building.add(tower);

        // Secondary tower elements (stepped design)
        const stepHeight = 15;
        const stepGeometry = new THREE.BoxGeometry(towerWidth * 0.8, stepHeight, towerDepth * 0.8);
        const step = new THREE.Mesh(stepGeometry, concreteMaterial);
        step.position.y = baseHeight + towerHeight + (stepHeight / 2);
        step.castShadow = true;
        step.receiveShadow = true;
        building.add(step);

        // Top section
        const topHeight = 20;
        const topGeometry = new THREE.BoxGeometry(towerWidth * 0.6, topHeight, towerDepth * 0.6);
        const top = new THREE.Mesh(topGeometry, glassMaterial);
        top.position.y = baseHeight + towerHeight + stepHeight + (topHeight / 2);
        top.castShadow = true;
        top.receiveShadow = true;
        building.add(top);

        return building;
    }

    /**
     * Create a residential high-rise
     */
    createResidentialSkyscraper(concreteMaterial, glassMaterial) {
        const building = new THREE.Group();

        // Main structure
        const towerHeight = 50 + Math.random() * 30;
        const towerWidth = 25;
        const towerDepth = 25;
        const towerGeometry = new THREE.BoxGeometry(towerWidth, towerHeight, towerDepth);
        const tower = new THREE.Mesh(towerGeometry, concreteMaterial);
        tower.position.y = towerHeight / 2;
        tower.castShadow = true;
        tower.receiveShadow = true;
        building.add(tower);

        // Add windows (grid pattern)
        const windowSize = 2;
        const windowSpacing = 5;
        const windowsPerSide = Math.floor(towerWidth / windowSpacing);
        const windowsPerFloor = Math.floor(towerHeight / windowSpacing);

        // Add windows to front and back
        for (let floor = 1; floor < windowsPerFloor; floor++) {
            for (let i = 0; i < windowsPerSide; i++) {
                // Calculate window position
                const xPos = (i * windowSpacing) - (towerWidth / 2) + (windowSpacing / 2);
                const yPos = (floor * windowSpacing) - (towerHeight / 2) + (windowSpacing / 2);

                // Front windows
                const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, 0.5);
                const window = new THREE.Mesh(windowGeometry, glassMaterial);
                window.position.set(xPos, yPos, towerDepth / 2 + 0.1);
                window.castShadow = true;
                window.receiveShadow = true;
                tower.add(window);

                // Back windows
                const backWindow = window.clone();
                backWindow.position.z = -towerDepth / 2 - 0.1;
                backWindow.rotation.y = Math.PI;
                backWindow.castShadow = true;
                tower.add(backWindow);
            }
        }

        // Add windows to sides
        for (let floor = 1; floor < windowsPerFloor; floor++) {
            for (let i = 0; i < windowsPerSide; i++) {
                // Calculate window position
                const zPos = (i * windowSpacing) - (towerDepth / 2) + (windowSpacing / 2);
                const yPos = (floor * windowSpacing) - (towerHeight / 2) + (windowSpacing / 2);

                // Left side windows
                const windowGeometry = new THREE.BoxGeometry(0.5, windowSize, windowSize);
                const window = new THREE.Mesh(windowGeometry, glassMaterial);
                window.position.set(-towerWidth / 2 - 0.1, yPos, zPos);
                window.castShadow = true;
                window.receiveShadow = true;
                tower.add(window);

                // Right side windows
                const rightWindow = window.clone();
                rightWindow.position.x = towerWidth / 2 + 0.1;
                rightWindow.rotation.y = Math.PI;
                rightWindow.castShadow = true;
                tower.add(rightWindow);
            }
        }

        // Add balconies to some floors (random)
        const balconyFloors = Math.min(5, Math.floor(windowsPerFloor / 4));
        for (let i = 0; i < balconyFloors; i++) {
            const floor = Math.floor(Math.random() * (windowsPerFloor - 2)) + 2;
            const side = Math.floor(Math.random() * 4); // 0-3 for different sides
            const balconyGeometry = new THREE.BoxGeometry(side % 2 === 0 ? 15 : 3, 1, side % 2 === 0 ? 3 : 15);
            const balcony = new THREE.Mesh(balconyGeometry, concreteMaterial);

            const yPos = (floor * windowSpacing) - (towerHeight / 2) + (windowSpacing / 2);
            let xPos = 0;
            let zPos = 0;

            switch (side) {
                case 0: // front
                    zPos = towerDepth / 2 + 1.5;
                    break;
                case 1: // right
                    xPos = towerWidth / 2 + 1.5;
                    break;
                case 2: // back
                    zPos = -towerDepth / 2 - 1.5;
                    break;
                case 3: // left
                    xPos = -towerWidth / 2 - 1.5;
                    break;
            }

            balcony.position.set(xPos, yPos, zPos);
            balcony.castShadow = true;
            balcony.receiveShadow = true;
            building.add(balcony);
        }

        return building;
    }

    /**
     * Place skyscrapers in the scene in a CBD area
     */
    placeSkyscrapers() {
        // Find a suitable CBD location that avoids the runway 
        const cbdArea = this.findSuitableCBDLocation();

        // Types of buildings to place
        const types = ['modern', 'corporate', 'residential'];

        // Place landmark skyscraper in the center of the CBD
        const landmarkX = (cbdArea.xMin + cbdArea.xMax) / 2;
        const landmarkZ = (cbdArea.zMin + cbdArea.zMax) / 2;

        const landmark = this.skyscraperTypes.landmark.clone();
        landmark.position.set(landmarkX, 0, landmarkZ);
        landmark.userData = { type: 'skyscraper', subtype: 'landmark' }; // Add metadata
        this.scene.add(landmark);
        this.skyscrapers.push({
            mesh: landmark,
            type: 'landmark'
        });

        // Place remaining 14 skyscrapers in the CBD
        for (let i = 0; i < 14; i++) {
            // Get random building type
            const type = types[Math.floor(Math.random() * types.length)];
            const skyscraperTemplate = this.skyscraperTypes[type];

            if (skyscraperTemplate) {
                // Clone the template
                const skyscraper = skyscraperTemplate.clone();

                // Calculate position with spacing so buildings don't overlap
                // This creates a rough grid layout for the CBD
                const gridSize = 4; // 4x4 grid, allowing for 16 buildings max (we use 14 + landmark)
                const cellSize = 80; // 80 units between building centers

                // Calculate grid position (0-3 for x and z)
                const gridX = i % gridSize;
                const gridZ = Math.floor(i / gridSize);

                // Calculate actual position with some randomization within cell
                // Avoid the center where the landmark building is
                let x = cbdArea.xMin + gridX * cellSize + (Math.random() * 30 - 15);
                let z = cbdArea.zMin + gridZ * cellSize + (Math.random() * 30 - 15);

                // Ensure we don't place a building too close to the landmark
                const distToLandmark = Math.sqrt(Math.pow(x - landmarkX, 2) + Math.pow(z - landmarkZ, 2));
                if (distToLandmark < 100) {
                    // If too close, shift it away
                    const angle = Math.atan2(z - landmarkZ, x - landmarkX);
                    x = landmarkX + Math.cos(angle) * 100 + (Math.random() * 20 - 10);
                    z = landmarkZ + Math.sin(angle) * 100 + (Math.random() * 20 - 10);
                }

                // Random rotation (slight variations)
                skyscraper.rotation.y = Math.random() * Math.PI * 2; // Full rotation for more variety

                // Position skyscraper on the ground
                skyscraper.position.set(x, 0, z);
                skyscraper.userData = { type: 'skyscraper', subtype: type }; // Add metadata

                // Add to scene and keep track of it
                this.scene.add(skyscraper);
                this.skyscrapers.push({
                    mesh: skyscraper,
                    type: type
                });
            }
        }

        console.log(`Placed ${this.skyscrapers.length} skyscrapers in the CBD area at position (${landmarkX}, ${landmarkZ})`);
    }

    /**
     * Update method for animation/changes over time
     */
    update(deltaTime) {
        // Could implement subtle effects like lights turning on/off in windows
    }

    /**
     * Removes all skyscrapers from the scene
     */
    clear() {
        // Remove all skyscrapers from the scene
        this.skyscrapers.forEach(skyscraper => {
            this.scene.remove(skyscraper.mesh);
        });

        this.skyscrapers = [];
    }
} 