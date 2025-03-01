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
        const runwayWidth = 30;
        const runwayLength = 150;

        // Create a plane geometry for the runway
        const runwayGeometry = new THREE.PlaneGeometry(runwayWidth, runwayLength);

        // Create a material that can receive shadows
        const runwayMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333, // Dark grey color
            side: THREE.DoubleSide, // Visible from both sides
            roughness: 0.9, // Rough asphalt-like surface
            metalness: 0.1
        });

        // Create the runway mesh
        this.runway = new THREE.Mesh(runwayGeometry, runwayMaterial);

        // Enable shadow receiving
        this.runway.receiveShadow = true;

        // Rotate the plane to lie flat on the ground (rotate around X axis by 90 degrees)
        this.runway.rotation.x = Math.PI / 2;

        // Position the runway at the center of the scene, on the ground
        // Move it 30 units in negative Z direction so plane starts at the beginning
        this.runway.position.set(0, 0.02, -30); // Slightly above zero to avoid z-fighting with the ground

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
        const runwayWidth = 30;
        const runwayLength = 150;
        const stripeWidth = 1;
        const stripeLength = 10;
        const stripeSpacing = 10;

        // Create a white material for the markings that can receive shadows
        const markingMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF, // White color
            side: THREE.DoubleSide,
            roughness: 0.6, // Slightly smoother than the runway
            metalness: 0.1,
            emissive: 0x333333, // Slight emissive to make markings more visible
            emissiveIntensity: 0.2
        });

        // Create center line markings
        for (let z = -runwayLength / 2 + stripeLength / 2; z < runwayLength / 2; z += stripeLength + stripeSpacing) {
            const centerStripeGeometry = new THREE.PlaneGeometry(stripeWidth, stripeLength);
            const centerStripe = new THREE.Mesh(centerStripeGeometry, markingMaterial);

            // Enable shadow receiving
            centerStripe.receiveShadow = true;

            centerStripe.rotation.x = Math.PI / 2;
            // Apply the same -30 Z offset as the runway
            centerStripe.position.set(0, 0.04, z - 30); // Slightly above runway

            this.scene.add(centerStripe);
        }

        // Create threshold markings at both ends
        const thresholdGeometry = new THREE.PlaneGeometry(runwayWidth, 2);

        // Start threshold
        const startThreshold = new THREE.Mesh(thresholdGeometry, markingMaterial);
        startThreshold.receiveShadow = true;
        startThreshold.rotation.x = Math.PI / 2;
        startThreshold.position.set(0, 0.04, -runwayLength / 2 + 1 - 30); // Apply the Z offset
        this.scene.add(startThreshold);

        // End threshold
        const endThreshold = new THREE.Mesh(thresholdGeometry, markingMaterial);
        endThreshold.receiveShadow = true;
        endThreshold.rotation.x = Math.PI / 2;
        endThreshold.position.set(0, 0.04, runwayLength / 2 - 1 - 30); // Apply the Z offset
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