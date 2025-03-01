// Sky class for creating and managing the sky background
import * as THREE from 'three';

export default class Sky {
    constructor(scene, sun) {
        this.scene = scene;
        this.sky = null;
        this.sun = sun; // Reference to the directional light
        this.visibleSun = null; // Visible sun sphere

        // Create the sky and sun
        this.createSky();
        this.createVisibleSun();
    }

    /**
     * Create the sky background
     */
    createSky() {
        // Create a large box geometry
        const skyGeometry = new THREE.BoxGeometry(5000, 5000, 5000);

        // Create a gradient material with blue at top and lighter blue at bottom
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB, // Light blue color
            side: THREE.BackSide, // Render the material from the inside
            fog: false // Sky shouldn't be affected by fog
        });

        // Create the sky mesh and add it to the scene
        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.sky);
    }

    /**
     * Create the visible sun
     */
    createVisibleSun() {
        if (!this.sun) return; // Skip if there's no directional light

        // Create a sphere for the sun
        const sunGeometry = new THREE.SphereGeometry(15, 16, 16);

        // Create an emissive material (glowing)
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00, // Bright yellow
            fog: false // Sun shouldn't be affected by fog
        });

        // Create the sun mesh
        this.visibleSun = new THREE.Mesh(sunGeometry, sunMaterial);

        // Position the sun in the same direction as the light source
        // We'll normalize and multiply the direction to put it on the "celestial sphere"
        if (this.sun.position) {
            const lightPos = this.sun.position.clone().normalize().multiplyScalar(4900); // Moved 10x further (was 490)
            this.visibleSun.position.copy(lightPos);
        }

        // Add the sun to the scene
        this.scene.add(this.visibleSun);
    }

    /**
     * Update the sky and sun position (if needed for animations)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Currently no updates needed for the sky
        // If you want to animate the sun moving across the sky,
        // that would be implemented here
    }
} 