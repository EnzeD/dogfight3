// Villages.js - Manages procedural village generation with houses and streets
import * as THREE from 'three';

export default class Villages {
    constructor(scene, eventBus, runway, qualitySettings, villageMapData) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.runway = runway; // Reference to the runway
        this.qualitySettings = qualitySettings;
        this.villageMapData = villageMapData; // Static village data from map
        this.villages = []; // Will store village data
        this.houses = []; // Will store all house meshes
        this.streets = []; // Will store all street meshes

        // House prototypes - will be cloned to create instances
        this.housePrototypes = [];

        // Get quality settings
        const settings = this.qualitySettings.getCurrentSettings();
        const villageSettings = settings.villages || {};

        // Village parameters - adjust based on quality
        this.villageCount = villageSettings.count || 2; // Default to medium
        this.housesPerVillage = villageSettings.housesPerVillage || 10; // Default to medium
        this.villageRadius = 800; // Maximum distance from center for villages
        this.streetWidth = 10;

        // Runway safety parameters
        this.runwayBufferDistance = 300; // Distance to keep away from runway
        this.runwayWidth = 50; // Default runway width
        this.runwayLength = 1000; // Default runway length

        console.log(`Creating villages with quality settings: count=${this.villageCount}, houses=${this.housesPerVillage}`);

        // Initialize after next frame to ensure runway is properly initialized
        setTimeout(() => this.init(), 0);
    }

    init() {
        // Create house prototypes
        this.createHousePrototypes();

        // Get runway dimensions if available
        if (this.runway && this.runway.runway) {
            const runwayMesh = this.runway.runway;
            if (runwayMesh.geometry && runwayMesh.geometry.parameters) {
                // PlaneGeometry parameters are (width, height)
                this.runwayWidth = runwayMesh.geometry.parameters.width || this.runwayWidth;
                this.runwayLength = runwayMesh.geometry.parameters.height || this.runwayLength;
                console.log(`Using runway dimensions: ${this.runwayWidth}x${this.runwayLength}`);
            }

            // Visualize the exclusion zone (for debugging)
            // this.visualizeExclusionZone();
        }

        // Generate villages from map data
        this.generateVillages();

        console.log('Villages initialized with', this.houses.length, 'houses and', this.streets.length, 'streets');
    }

    createHousePrototypes() {
        // Create 5 different house types with similar architectural style

        // House Type 1: Basic Square House
        const house1 = this.createBasicHouse(20, 15, 25, 0xD2B48C);
        this.housePrototypes.push(house1);

        // House Type 2: Rectangular House
        const house2 = this.createBasicHouse(30, 15, 20, 0xC2A278);
        this.housePrototypes.push(house2);

        // House Type 3: Small Cottage
        const house3 = this.createBasicHouse(18, 12, 20, 0xE5C29F);
        this.housePrototypes.push(house3);

        // House Type 4: Tall Narrow House
        const house4 = this.createBasicHouse(15, 20, 25, 0xBCA68E);
        this.housePrototypes.push(house4);

        // House Type 5: Large Manor House
        const house5 = this.createBasicHouse(35, 18, 30, 0xC8B098);
        this.housePrototypes.push(house5);
    }

    createBasicHouse(width, height, depth, color) {
        const house = new THREE.Group();

        // Main building body
        const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        house.add(body);

        // Roof (triangular prism)
        const roofHeight = height * 0.6;
        const roofOverhang = 2;

        const roofShape = new THREE.Shape();
        roofShape.moveTo(-width / 2 - roofOverhang, 0);
        roofShape.lineTo(width / 2 + roofOverhang, 0);
        roofShape.lineTo(0, roofHeight);
        roofShape.lineTo(-width / 2 - roofOverhang, 0);

        const extrudeSettings = {
            steps: 1,
            depth: depth + roofOverhang * 2,
            bevelEnabled: false
        };

        const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2
        });

        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = height;
        roof.position.z = -depth / 2 - roofOverhang;
        roof.castShadow = true;
        house.add(roof);

        // Door
        const doorWidth = width * 0.25;
        const doorHeight = height * 0.6;
        const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x5C3A21,
            roughness: 0.8
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.z = depth / 2 + 0.1;
        door.position.y = doorHeight / 2;
        house.add(door);

        // Windows
        const windowSize = width * 0.15;
        const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0xADD8E6,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0x555555
        });

        // Front windows
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(-width / 4, height / 2, depth / 2 + 0.1);
        house.add(window1);

        const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
        window2.position.set(width / 4, height / 2, depth / 2 + 0.1);
        house.add(window2);

        // Side windows
        const window3 = new THREE.Mesh(windowGeometry, windowMaterial);
        window3.position.set(width / 2 + 0.1, height / 2, 0);
        window3.rotation.y = Math.PI / 2;
        house.add(window3);

        const window4 = new THREE.Mesh(windowGeometry, windowMaterial);
        window4.position.set(-width / 2 - 0.1, height / 2, 0);
        window4.rotation.y = -Math.PI / 2;
        house.add(window4);

        return house;
    }

    /**
     * Generate villages based on static map data
     */
    generateVillages() {
        // Check if we have map data
        if (!this.villageMapData || !Array.isArray(this.villageMapData)) {
            console.warn('No village map data provided. No villages will be placed.');
            return;
        }

        console.log(`Generating ${this.villageMapData.length} villages from map data`);

        // Process each village from map data
        this.villageMapData.forEach(village => {
            // Store village data
            this.villages.push({
                x: village.center.x,
                z: village.center.z,
                size: village.size
            });

            // Place houses based on map data
            if (village.houses && Array.isArray(village.houses)) {
                village.houses.forEach(houseData => {
                    this.placeHouse(houseData.x, houseData.z, houseData.type, houseData.rotation);
                });
            }

            // Create streets based on map data
            if (village.streets && Array.isArray(village.streets)) {
                village.streets.forEach(streetData => {
                    const dirX = streetData.x2 - streetData.x1;
                    const dirZ = streetData.z2 - streetData.z1;
                    this.createStreet(
                        streetData.x1,
                        streetData.z1,
                        streetData.x2,
                        streetData.z2,
                        dirX,
                        dirZ
                    );
                });
            }
        });

        console.log(`Generated ${this.villages.length} villages with ${this.houses.length} houses and ${this.streets.length} streets`);
    }

    /**
     * Place a house at specific coordinates with specific type and rotation
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @param {number} type - House type index
     * @param {number} rotation - Rotation in radians
     */
    placeHouse(x, z, type = 0, rotation = 0) {
        // Make sure we have house prototypes
        if (this.housePrototypes.length === 0) {
            console.warn('No house prototypes available');
            return;
        }

        // Get house type (use modulo to ensure valid index)
        const houseType = type % this.housePrototypes.length;
        const house = this.housePrototypes[houseType].clone();

        // Position and rotate house
        house.position.set(x, 0, z);
        house.rotation.y = rotation;

        // Add to scene and store reference
        this.scene.add(house);
        this.houses.push(house);
    }

    /**
     * Check if a position is too close to the runway
     * @param {number} x - X coordinate to check
     * @param {number} z - Z coordinate to check
     * @returns {boolean} - True if too close to runway
     */
    isTooCloseToRunway(x, z) {
        if (!this.runway) {
            // If no runway object, use simpler check around origin
            const safetyDistance = Math.max(this.runwayLength, this.runwayWidth) / 2 + this.runwayBufferDistance;
            return (Math.abs(x) < safetyDistance && Math.abs(z) < safetyDistance);
        }

        // Access the runway mesh directly
        const runwayMesh = this.runway.runway;
        if (!runwayMesh) {
            return false;
        }

        // Get runway position
        const runwayPosition = runwayMesh.position;

        // Get runway dimensions from the mesh if possible, 
        // otherwise use defaults or try to estimate from geometry
        let runwayWidth = this.runwayWidth;
        let runwayLength = this.runwayLength;

        if (runwayMesh.geometry && runwayMesh.geometry.parameters) {
            // PlaneGeometry parameters are (width, height)
            runwayWidth = runwayMesh.geometry.parameters.width || runwayWidth;
            runwayLength = runwayMesh.geometry.parameters.height || runwayLength;
        }

        // Create a rectangle representing the runway plus buffer zone
        const halfLength = (runwayLength / 2) + this.runwayBufferDistance;
        const halfWidth = (runwayWidth / 2) + this.runwayBufferDistance;

        // Check if the point is within the extended runway rectangle
        // Account for runway rotation around X-axis (it's rotated to lie flat)
        if (x >= runwayPosition.x - halfWidth &&
            x <= runwayPosition.x + halfWidth &&
            z >= runwayPosition.z - halfLength &&
            z <= runwayPosition.z + halfLength) {
            return true;
        }

        return false;
    }

    createVillageLayout(centerX, centerZ, houseCount) {
        // Create a grid-based village with streets
        const gridSize = Math.ceil(Math.sqrt(houseCount)) + 1;
        const cellSize = 60; // Distance between houses including street

        // Streets run between houses
        const streetGrid = [];

        // Create the village grid
        for (let x = 0; x < gridSize; x++) {
            streetGrid[x] = [];
            for (let z = 0; z < gridSize; z++) {
                // Not all cells will have houses (about 80% occupancy for natural look)
                streetGrid[x][z] = Math.random() < 0.8;
            }
        }

        // Place houses and create streets
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                const posX = centerX + (x - gridSize / 2) * cellSize;
                const posZ = centerZ + (z - gridSize / 2) * cellSize;

                if (streetGrid[x][z]) {
                    // Place a house
                    this.placeHouse(posX, posZ);

                    // Create streets connecting to neighboring houses
                    this.createStreetConnections(posX, posZ, x, z, gridSize, streetGrid, cellSize);
                }
            }
        }
    }

    createStreetConnections(posX, posZ, gridX, gridZ, gridSize, streetGrid, cellSize) {
        // Check for connections in all four directions
        const directions = [
            { dx: 1, dz: 0 }, // East
            { dx: 0, dz: 1 }, // South
            { dx: -1, dz: 0 }, // West
            { dx: 0, dz: -1 }  // North
        ];

        for (const dir of directions) {
            const nx = gridX + dir.dx;
            const nz = gridZ + dir.dz;

            // Check if neighbor is within grid and has a house
            if (nx >= 0 && nx < gridSize && nz >= 0 && nz < gridSize && streetGrid[nx][nz]) {
                // Create a street between houses
                this.createStreet(
                    posX, posZ,
                    posX + dir.dx * cellSize,
                    posZ + dir.dz * cellSize,
                    dir.dx, dir.dz
                );
            }
        }
    }

    createStreet(x1, z1, x2, z2, dirX, dirZ) {
        // Calculate street dimensions
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));

        // Create street mesh
        const geometry = new THREE.PlaneGeometry(
            Math.abs(dirX) > 0 ? length : this.streetWidth,
            Math.abs(dirZ) > 0 ? length : this.streetWidth
        );

        const material = new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.9,
            metalness: 0.1
        });

        const street = new THREE.Mesh(geometry, material);

        // Position street
        street.position.set((x1 + x2) / 2, 0.1, (z1 + z2) / 2); // Slightly above ground
        street.rotation.x = -Math.PI / 2; // Rotate to lay flat

        // Add to scene and track
        street.receiveShadow = true;
        this.scene.add(street);
        this.streets.push(street);
    }

    update(deltaTime) {
        // Any animation or updates needed for villages
        // Currently nothing to animate, but we could add
        // things like flickering lights in windows at night
    }

    /**
     * Visualize the exclusion zone around the runway (for debugging)
     */
    visualizeExclusionZone() {
        if (!this.runway || !this.runway.runway) return;

        const runwayMesh = this.runway.runway;
        const runwayPosition = runwayMesh.position;

        // Get dimensions
        let runwayWidth = this.runwayWidth;
        let runwayLength = this.runwayLength;

        if (runwayMesh.geometry && runwayMesh.geometry.parameters) {
            runwayWidth = runwayMesh.geometry.parameters.width || runwayWidth;
            runwayLength = runwayMesh.geometry.parameters.height || runwayLength;
        }

        // Create a box to visualize the exclusion zone
        const zoneWidth = runwayWidth + this.runwayBufferDistance * 2;
        const zoneLength = runwayLength + this.runwayBufferDistance * 2;
        const zoneHeight = 30; // Arbitrary height for visibility

        const zoneGeometry = new THREE.BoxGeometry(zoneWidth, zoneHeight, zoneLength);
        const zoneMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.2,
            wireframe: true
        });

        const exclusionZone = new THREE.Mesh(zoneGeometry, zoneMaterial);
        exclusionZone.position.set(
            runwayPosition.x,
            runwayPosition.y + zoneHeight / 2, // Center vertically
            runwayPosition.z
        );

        this.scene.add(exclusionZone);
        console.log('Exclusion zone visualization added');
    }
} 