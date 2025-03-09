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
        // Define ground dimensions - much larger for horizon effect
        const groundSize = 2000; // Significantly increased for maximum view distance

        // Create a plane geometry for the ground
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);

        // Create a material that can receive shadows
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3A5F0B, // Dark green color
            side: THREE.DoubleSide, // Visible from both sides
            roughness: 0.8, // Makes the ground appear less shiny
            metalness: 0.1
        });

        // Create the ground mesh
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);

        // Enable shadow receiving
        this.ground.receiveShadow = true;

        // Rotate the plane to lie flat on the ground (rotate around X axis by 90 degrees)
        this.ground.rotation.x = Math.PI / 2;

        // Position the ground at y=0, with a slight offset to prevent z-fighting
        this.ground.position.y = -0.5;

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