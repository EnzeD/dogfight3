// Clouds class for creating and managing clouds
import * as THREE from 'three';

export default class Clouds {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.clouds = [];

        // Cloud settings
        this.cloudCount = 200; // Increased from 20 to 200 (10x more)
        this.cloudSpread = 1500; // Increased from 500 to 1500 for wider spread
        this.cloudHeight = 200; // Increased height
        this.cloudHeightVariation = 80; // More variation in height

        // Create the clouds
        this.createClouds();
    }

    /**
     * Create cloud instances
     */
    createClouds() {
        // Create different patches of clouds - massive, big, medium, and small
        const patchSizes = ['massive', 'big', 'medium', 'small'];

        // Create clouds in batches to avoid performance issues during initialization
        const batchSize = 50;
        const createBatch = (startIndex, count) => {
            for (let i = startIndex; i < startIndex + count && i < this.cloudCount; i++) {
                // Choose a random patch size with bias toward smaller clouds for better performance
                const sizeIndex = Math.floor(Math.random() * 100);
                let patchSize;
                if (sizeIndex < 5) {
                    patchSize = 'massive'; // 5% chance for massive clouds
                } else if (sizeIndex < 15) {
                    patchSize = 'big'; // 10% chance for big clouds
                } else if (sizeIndex < 45) {
                    patchSize = 'medium'; // 30% chance for medium clouds
                } else {
                    patchSize = 'small'; // 55% chance for small clouds
                }
                this.createCloud(patchSize);
            }

            // If there are more clouds to create, schedule the next batch
            if (startIndex + count < this.cloudCount) {
                setTimeout(() => createBatch(startIndex + count, batchSize), 0);
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
                sectionCount = 7 + Math.floor(Math.random() * 4); // More sections for massive clouds
                scale = 4.5; // 3x the size of big clouds
                break;
            case 'big':
                sectionCount = 5 + Math.floor(Math.random() * 3);
                scale = 1.5;
                break;
            case 'medium':
                sectionCount = 3 + Math.floor(Math.random() * 3);
                scale = 1.0;
                break;
            case 'small':
                sectionCount = 2 + Math.floor(Math.random() * 2);
                scale = 0.6;
                break;
            default:
                sectionCount = 3 + Math.floor(Math.random() * 3);
                scale = 1.0;
        }

        // Cloud material - white with increased transparency
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7, // More transparent
            roughness: 0.5,
            metalness: 0.1
        });

        // Create rectangular cloud sections
        for (let j = 0; j < sectionCount; j++) {
            // Size for rectangular sections scaled by patch size
            const width = (15 + Math.random() * 25) * scale;
            const height = (8 + Math.random() * 12) * scale;
            const depth = (12 + Math.random() * 20) * scale;

            // Create box for cloud section
            const sectionGeometry = new THREE.BoxGeometry(width, height, depth);
            const section = new THREE.Mesh(sectionGeometry, cloudMaterial);

            // Enable shadow casting
            section.castShadow = true;

            // Random position within the cloud (scaled by patch size)
            const sectionX = (Math.random() - 0.5) * 15 * scale;
            const sectionY = (Math.random() - 0.5) * 8 * scale;
            const sectionZ = (Math.random() - 0.5) * 15 * scale;

            section.position.set(sectionX, sectionY, sectionZ);

            // Add slight random rotation for variety
            section.rotation.y = Math.random() * Math.PI * 0.25;

            // Add section to cloud
            cloud.add(section);
        }

        // Add cloud to scene and store in array
        this.scene.add(cloud);
        this.clouds.push({
            mesh: cloud,
            speed: 0.05 + Math.random() * 0.1, // Random speed for each cloud
            size: size // Store the cloud size
        });
    }

    /**
     * Update cloud positions for animation
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Move clouds slowly across the sky
        for (const cloud of this.clouds) {
            cloud.mesh.position.x += cloud.speed * deltaTime * 10;

            // If cloud moves too far, reset to the other side
            if (cloud.mesh.position.x > this.cloudSpread / 2) {
                cloud.mesh.position.x = -this.cloudSpread / 2;
                cloud.mesh.position.z = (Math.random() - 0.5) * this.cloudSpread;
                cloud.mesh.position.y = this.cloudHeight + (Math.random() - 0.5) * this.cloudHeightVariation;
            }
        }
    }
} 