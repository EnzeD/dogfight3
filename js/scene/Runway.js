// Runway class for creating and managing the runway
import * as THREE from 'three';

export default class Runway {
    constructor(scene) {
        this.scene = scene;
        this.runway = null;

        // Create the runway
        this.createRunway();
    }

    /**
     * Create the runway
     */
    createRunway() {
        // Define runway dimensions
        const runwayWidth = 20;
        const runwayLength = 100;

        // Create a plane geometry for the runway
        const runwayGeometry = new THREE.PlaneGeometry(runwayWidth, runwayLength);

        // Create a basic material with a dark grey color
        const runwayMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333, // Dark grey color
            side: THREE.DoubleSide // Visible from both sides
        });

        // Create the runway mesh
        this.runway = new THREE.Mesh(runwayGeometry, runwayMaterial);

        // Rotate the plane to lie flat on the ground (rotate around X axis by 90 degrees)
        this.runway.rotation.x = Math.PI / 2;

        // Position the runway at the center of the scene, on the ground
        this.runway.position.y = 0.01; // Slightly above zero to avoid z-fighting with the ground

        // Add the runway to the scene
        this.scene.add(this.runway);

        // Add runway markings
        this.addRunwayMarkings();
    }

    /**
     * Add markings to the runway
     */
    addRunwayMarkings() {
        // Define dimensions for runway markings
        const runwayWidth = 20;
        const runwayLength = 100;
        const stripeWidth = 1;
        const stripeLength = 10;
        const stripeSpacing = 10;

        // Create a white material for the markings
        const markingMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF, // White color
            side: THREE.DoubleSide
        });

        // Create center line markings
        for (let z = -runwayLength / 2 + stripeLength / 2; z < runwayLength / 2; z += stripeLength + stripeSpacing) {
            const centerStripeGeometry = new THREE.PlaneGeometry(stripeWidth, stripeLength);
            const centerStripe = new THREE.Mesh(centerStripeGeometry, markingMaterial);

            centerStripe.rotation.x = Math.PI / 2;
            centerStripe.position.set(0, 0.02, z); // Slightly above runway

            this.scene.add(centerStripe);
        }

        // Create threshold markings at both ends
        const thresholdGeometry = new THREE.PlaneGeometry(runwayWidth, 2);

        // Start threshold
        const startThreshold = new THREE.Mesh(thresholdGeometry, markingMaterial);
        startThreshold.rotation.x = Math.PI / 2;
        startThreshold.position.set(0, 0.02, -runwayLength / 2 + 1);
        this.scene.add(startThreshold);

        // End threshold
        const endThreshold = new THREE.Mesh(thresholdGeometry, markingMaterial);
        endThreshold.rotation.x = Math.PI / 2;
        endThreshold.position.set(0, 0.02, runwayLength / 2 - 1);
        this.scene.add(endThreshold);
    }

    /**
     * Update the runway (if needed for animations, etc.)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Currently no updates needed for the runway
    }
} 