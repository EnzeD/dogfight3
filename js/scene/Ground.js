// Ground class for creating and managing the ground plane
import * as THREE from 'three';

export default class Ground {
    constructor(scene) {
        this.scene = scene;
        this.ground = null;

        // Create the ground
        this.createGround();
    }

    /**
     * Create the ground plane
     */
    createGround() {
        // Define ground dimensions
        const groundSize = 1000;

        // Create a plane geometry for the ground
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);

        // Create a basic material with a green color
        const groundMaterial = new THREE.MeshBasicMaterial({
            color: 0x3A5F0B, // Dark green color
            side: THREE.DoubleSide // Visible from both sides
        });

        // Create the ground mesh
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);

        // Rotate the plane to lie flat on the ground (rotate around X axis by 90 degrees)
        this.ground.rotation.x = Math.PI / 2;

        // Position the ground at y=0
        this.ground.position.y = 0;

        // Add the ground to the scene
        this.scene.add(this.ground);
    }

    /**
     * Update the ground (if needed for animations, etc.)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Currently no updates needed for the ground
    }
} 