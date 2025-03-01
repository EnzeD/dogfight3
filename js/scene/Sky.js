// Sky class for creating and managing the sky background
import * as THREE from 'three';

export default class Sky {
    constructor(scene) {
        this.scene = scene;
        this.sky = null;

        // Create the sky
        this.createSky();
    }

    /**
     * Create the sky background
     */
    createSky() {
        // Create a large box geometry
        const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);

        // Create a basic material with light blue color
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB, // Light blue color
            side: THREE.BackSide // Render the material from the inside
        });

        // Create the sky mesh and add it to the scene
        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.sky);
    }

    /**
     * Update the sky (if needed for animations, etc.)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Currently no updates needed for the sky
    }
} 