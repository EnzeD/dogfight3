// Clouds class for creating and managing clouds
import * as THREE from 'three';

export default class Clouds {
    constructor(scene, eventBus, qualitySettings, cloudMapData) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.qualitySettings = qualitySettings;
        this.cloudMapData = cloudMapData; // Static cloud data from map
        this.clouds = [];

        // Get quality settings
        const settings = this.qualitySettings.getCurrentSettings();
        const cloudSettings = settings.clouds;

        // Cloud settings - adjusted based on quality level
        this.cloudCount = this.cloudMapData ? this.cloudMapData.count : (cloudSettings.count || 125);
        this.cloudSpread = 8000; // Constant for all qualities
        this.cloudHeight = 400; // Constant for all qualities  
        this.cloudHeightVariation = 250; // Constant for all qualities

        // Geometry detail settings
        this.segmentsX = cloudSettings.segmentsX || 6;
        this.segmentsY = cloudSettings.segmentsY || 4;
        this.allowMassive = cloudSettings.massive !== undefined ? cloudSettings.massive : true;
        this.massiveChance = cloudSettings.massiveChance || 2;
        this.bigChance = cloudSettings.big || 10;
        this.mediumChance = cloudSettings.medium || 38;
        this.smallChance = cloudSettings.small || 50;

        console.log(`Creating clouds with quality settings: count=${this.cloudCount}, segments=${this.segmentsX}x${this.segmentsY}`);

        // Create the clouds
        this.createClouds();
    }

    /**
     * Create cloud instances based on map data if available
     */
    createClouds() {
        if (this.cloudMapData && this.cloudMapData.positions && Array.isArray(this.cloudMapData.positions)) {
            console.log(`Creating ${this.cloudMapData.positions.length} clouds from map data`);

            // Create clouds from map data
            this.cloudMapData.positions.forEach((cloudPos, index) => {
                // Use different sizes for visual variety, cycling through 4 sizes
                let size;
                const sizeIndex = index % 4;

                if (sizeIndex === 0) size = 'small';
                else if (sizeIndex === 1) size = 'medium';
                else if (sizeIndex === 2) size = 'big';
                else size = this.allowMassive ? 'massive' : 'big';

                // Create a cloud at this exact position using the original cloud creation method
                this.createCloudAtPosition(size, cloudPos.x, cloudPos.y, cloudPos.z);
            });

            console.log(`Created ${this.clouds.length} clouds from map data`);
        } else {
            // Fallback to random cloud generation if no map data
            console.warn('No cloud map data provided, using random cloud generation');

            // Create clouds in batches to avoid performance issues during initialization
            const batchSize = 25;
            const createBatch = (startIndex, count) => {
                for (let i = startIndex; i < startIndex + count && i < this.cloudCount; i++) {
                    // Choose a random patch size with bias toward smaller clouds for better performance
                    const sizeIndex = Math.floor(Math.random() * 100);
                    let patchSize;

                    if (this.allowMassive && sizeIndex < this.massiveChance) {
                        patchSize = 'massive'; // Small chance for massive clouds
                    } else if (sizeIndex < (this.massiveChance + this.bigChance)) {
                        patchSize = 'big'; // Chance for big clouds
                    } else if (sizeIndex < (this.massiveChance + this.bigChance + this.mediumChance)) {
                        patchSize = 'medium'; // Chance for medium clouds
                    } else {
                        patchSize = 'small'; // Remaining chance for small clouds
                    }
                    this.createCloud(patchSize);
                }

                // If there are more clouds to create, schedule the next batch
                if (startIndex + count < this.cloudCount) {
                    setTimeout(() => {
                        createBatch(startIndex + count, batchSize);
                    }, 0);
                } else {
                    console.log(`Created ${this.clouds.length} clouds randomly`);
                }
            };

            // Start creating the first batch
            createBatch(0, batchSize);
        }
    }

    /**
     * Create a cloud at a specific position using original cloud creation method
     * @param {string} size - Size category ('small', 'medium', 'big', 'massive')
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    createCloudAtPosition(size = 'medium', x, y, z) {
        // Create a group to hold cloud parts
        const cloud = new THREE.Group();

        // Position the cloud at the exact coordinates from the map
        cloud.position.set(x, y, z);

        // Set section count and scale based on size
        let sectionCount, scale;

        switch (size) {
            case 'massive':
                sectionCount = 5 + Math.floor(Math.random() * 3); // Reduced from 7-10
                scale = 4.0;
                break;
            case 'big':
                sectionCount = 4 + Math.floor(Math.random() * 2); // Reduced from 5-7
                scale = 1.5;
                break;
            case 'medium':
                sectionCount = 3 + Math.floor(Math.random() * 2); // Slightly reduced
                scale = 1.0;
                break;
            case 'small':
                sectionCount = 2; // Fixed at 2 (reduced from 2-3)
                scale = 0.6;
                break;
            default:
                sectionCount = 3;
                scale = 1.0;
        }

        // Cloud material - white with increased transparency
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7,
            roughness: 0.9,
            metalness: 0.1
        });

        // Create cloud sections
        for (let i = 0; i < sectionCount; i++) {
            // Use sphere geometry with detail level based on quality settings
            const cloudGeometry = new THREE.SphereGeometry(
                30,                   // radius
                this.segmentsX,       // widthSegments
                this.segmentsY        // heightSegments
            );

            const section = new THREE.Mesh(cloudGeometry, cloudMaterial);

            // Random position offset for each section
            section.position.set(
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 60
            );

            // Random scale for each section (0.7 to 1.3)
            const sectionScale = 0.7 + Math.random() * 0.6;
            section.scale.set(sectionScale, sectionScale * 0.6, sectionScale);

            // Add section to cloud
            cloud.add(section);
        }

        // Apply overall scale to the cloud
        cloud.scale.set(scale, scale, scale);

        // Add to scene and tracking array
        this.scene.add(cloud);

        // Store with additional data for animations
        this.clouds.push({
            mesh: cloud,
            size: size,
            initialY: y,
            driftSpeed: 0 // No drift for mapped clouds
        });
    }

    /**
     * Create a cloud with random position using original cloud creation method
     * @param {string} size - The size of the cloud patch ('massive', 'big', 'medium', or 'small')
     */
    createCloud(size = 'medium') {
        // Create a group to hold cloud parts
        const cloud = new THREE.Group();

        // Random position within the spread area
        const x = (Math.random() - 0.5) * this.cloudSpread;
        const z = (Math.random() - 0.5) * this.cloudSpread;
        const y = this.cloudHeight + (Math.random() - 0.5) * this.cloudHeightVariation;

        cloud.position.set(x, y, z);

        // Set section count and scale based on size
        let sectionCount, scale;

        switch (size) {
            case 'massive':
                sectionCount = 5 + Math.floor(Math.random() * 3); // Reduced from 7-10
                scale = 4.0;
                break;
            case 'big':
                sectionCount = 4 + Math.floor(Math.random() * 2); // Reduced from 5-7
                scale = 1.5;
                break;
            case 'medium':
                sectionCount = 3 + Math.floor(Math.random() * 2); // Slightly reduced
                scale = 1.0;
                break;
            case 'small':
                sectionCount = 2; // Fixed at 2 (reduced from 2-3)
                scale = 0.6;
                break;
            default:
                sectionCount = 3;
                scale = 1.0;
        }

        // Cloud material - white with increased transparency
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7,
            roughness: 0.9,
            metalness: 0.1
        });

        // Create cloud sections
        for (let i = 0; i < sectionCount; i++) {
            // Use sphere geometry with detail level based on quality settings
            const cloudGeometry = new THREE.SphereGeometry(
                30,                   // radius
                this.segmentsX,       // widthSegments
                this.segmentsY        // heightSegments
            );

            const section = new THREE.Mesh(cloudGeometry, cloudMaterial);

            // Random position offset for each section
            section.position.set(
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 60
            );

            // Random scale for each section (0.7 to 1.3)
            const sectionScale = 0.7 + Math.random() * 0.6;
            section.scale.set(sectionScale, sectionScale * 0.6, sectionScale);

            // Add section to cloud
            cloud.add(section);
        }

        // Apply overall scale to the cloud
        cloud.scale.set(scale, scale, scale);

        // Add to scene and tracking array
        this.scene.add(cloud);

        // Store with additional data for animations
        this.clouds.push({
            mesh: cloud,
            size: size,
            initialY: y,
            driftSpeed: (Math.random() - 0.5) * 10 // Random drift speed for randomly placed clouds
        });
    }

    /**
     * Update method for animation/changes over time
     */
    update(deltaTime) {
        // Update clouds - only animate clouds that have a drift speed
        this.clouds.forEach(cloud => {
            if (cloud.driftSpeed !== 0) {
                // Very subtle drift
                cloud.mesh.position.x += deltaTime * 0.1 * (Math.random() - 0.5);
                cloud.mesh.position.z += deltaTime * 0.1 * (Math.random() - 0.5);

                // Simple vertical bobbing motion
                cloud.mesh.position.y = cloud.initialY + Math.sin(Date.now() * 0.0005) * 5;
            }
        });
    }
} 