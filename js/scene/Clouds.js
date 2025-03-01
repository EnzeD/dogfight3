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

        // Create 3-7 cloud puffs
        const puffCount = 3 + Math.floor(Math.random() * 5);

        // Cloud material - white with slight transparency
        const cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.9
        });

        // Create puffs
        for (let j = 0; j < puffCount; j++) {
            // Random size for each puff
            const puffSize = 5 + Math.random() * 10;

            // Create sphere for cloud puff
            const puffGeometry = new THREE.SphereGeometry(puffSize, 7, 7);
            const puff = new THREE.Mesh(puffGeometry, cloudMaterial);

            // Random position within the cloud
            const puffX = (Math.random() - 0.5) * 10;
            const puffY = (Math.random() - 0.5) * 5;
            const puffZ = (Math.random() - 0.5) * 10;

            puff.position.set(puffX, puffY, puffZ);

            // Add puff to cloud
            cloud.add(puff);
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