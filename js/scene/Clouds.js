// Clouds class for creating and managing clouds
import * as THREE from 'three';

export default class Clouds {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.clouds = [];

        // Cloud settings
        this.cloudCount = 20;
        this.cloudSpread = 500;
        this.cloudHeight = 100;
        this.cloudHeightVariation = 50;

        // Create the clouds
        this.createClouds();
    }

    /**
     * Create cloud instances
     */
    createClouds() {
        for (let i = 0; i < this.cloudCount; i++) {
            this.createCloud();
        }
    }

    /**
     * Create a single cloud
     */
    createCloud() {
        // Create a group to hold cloud parts
        const cloud = new THREE.Group();

        // Random position within the spread area
        const x = (Math.random() - 0.5) * this.cloudSpread;
        const z = (Math.random() - 0.5) * this.cloudSpread;
        const y = this.cloudHeight + (Math.random() - 0.5) * this.cloudHeightVariation;

        cloud.position.set(x, y, z);

        // Create 3-5 cloud sections (fewer sections because they're bigger now)
        const sectionCount = 3 + Math.floor(Math.random() * 3);

        // Cloud material - white with slight transparency
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.9,
            roughness: 0.5,
            metalness: 0.1
        });

        // Create rectangular cloud sections
        for (let j = 0; j < sectionCount; j++) {
            // Larger size for rectangular sections
            const width = 15 + Math.random() * 25;
            const height = 8 + Math.random() * 12;
            const depth = 12 + Math.random() * 20;

            // Create box for cloud section
            const sectionGeometry = new THREE.BoxGeometry(width, height, depth);
            const section = new THREE.Mesh(sectionGeometry, cloudMaterial);

            // Enable shadow casting
            section.castShadow = true;

            // Random position within the cloud
            const sectionX = (Math.random() - 0.5) * 15;
            const sectionY = (Math.random() - 0.5) * 8;
            const sectionZ = (Math.random() - 0.5) * 15;

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
            speed: 0.05 + Math.random() * 0.1 // Random speed for each cloud
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