// Clouds class for creating and managing clouds
import * as THREE from 'three';

export default class Clouds {
    constructor(scene, eventBus, qualitySettings) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.qualitySettings = qualitySettings;
        this.clouds = [];

        // Get quality settings
        const settings = this.qualitySettings.getCurrentSettings();
        const cloudSettings = settings.clouds;

        // Cloud settings - adjusted based on quality level
        this.cloudCount = cloudSettings.count || 125; // Medium default
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
     * Create cloud instances
     */
    createClouds() {
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
                setTimeout(() => createBatch(startIndex + count, batchSize), 0);
            } else {
                console.log(`Created ${this.clouds.length} clouds with current quality settings`);
            }
        };

        // Start creating the first batch
        createBatch(0, batchSize);
    }

    /**
     * Create a single cloud
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
        this.clouds.push(cloud);

        return cloud;
    }

    /**
     * Update clouds (e.g., for animation)
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Example: Simple cloud drift animation
        this.clouds.forEach(cloud => {
            // Very subtle drift
            cloud.position.x += deltaTime * 0.1 * (Math.random() - 0.5);
            cloud.position.z += deltaTime * 0.1 * (Math.random() - 0.5);
        });
    }
} 