// Runway class for creating and managing the runway
import * as THREE from 'three';

export default class Runway {
    constructor(scene) {
        this.scene = scene;
        this.runway = null;

        // Create the runway
        this.createRunway();
        // Create the control tower
        this.createControlTower();
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
     * Create an air traffic control tower
     */
    createControlTower() {
        // Position the tower next to the runway
        const runwayWidth = 30;
        const towerPosition = new THREE.Vector3(
            runwayWidth / 2 + 10, // 10 units away from the edge of the runway
            0,
            0 // Centered along the runway length
        );

        // Create the tower base (a larger rectangle)
        const baseGeometry = new THREE.BoxGeometry(12, 5, 12);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc, // Light grey
            roughness: 0.7,
            metalness: 0.2
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(towerPosition.x, 2.5, towerPosition.z);
        base.castShadow = true;
        base.receiveShadow = true;
        this.scene.add(base);

        // Create the tower column (a taller, thinner rectangle)
        const columnGeometry = new THREE.BoxGeometry(8, 15, 8);
        const columnMaterial = new THREE.MeshStandardMaterial({
            color: 0xdddddd, // Slightly lighter grey
            roughness: 0.6,
            metalness: 0.3
        });
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        column.position.set(towerPosition.x, 12.5, towerPosition.z);
        column.castShadow = true;
        column.receiveShadow = true;
        this.scene.add(column);

        // Create the control room at the top (a wider box with windows)
        const controlRoomGeometry = new THREE.BoxGeometry(12, 6, 12);
        const controlRoomMaterial = new THREE.MeshStandardMaterial({
            color: 0xe0e0e0, // Almost white
            roughness: 0.5,
            metalness: 0.4
        });
        const controlRoom = new THREE.Mesh(controlRoomGeometry, controlRoomMaterial);
        controlRoom.position.set(towerPosition.x, 23, towerPosition.z);
        controlRoom.castShadow = true;
        controlRoom.receiveShadow = true;
        this.scene.add(controlRoom);

        // Add windows to the control room (just dark panels for simplicity)
        this.addControlRoomWindows(towerPosition.x, 23, towerPosition.z);

        // Add a small antenna on top
        const antennaGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
        const antennaMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333, // Dark grey
            roughness: 0.3,
            metalness: 0.8
        });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(towerPosition.x, 28, towerPosition.z);
        antenna.castShadow = true;
        this.scene.add(antenna);
    }

    /**
     * Add windows to the control room
     */
    addControlRoomWindows(x, y, z) {
        // Create a dark blue material for windows
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a3c5e, // Dark blue
            roughness: 0.2,
            metalness: 0.8,
            opacity: 0.7,
            transparent: true
        });

        // Add windows on all four sides
        const windowDepth = 0.2;
        const windowWidth = 10;
        const windowHeight = 4;
        const windowY = y; // Center of the control room

        // Front windows (facing positive Z)
        const frontWindowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
        const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
        frontWindow.position.set(x, windowY, z + 6 + windowDepth);
        frontWindow.rotation.x = 0;
        this.scene.add(frontWindow);

        // Back windows (facing negative Z)
        const backWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
        backWindow.position.set(x, windowY, z - 6 - windowDepth);
        backWindow.rotation.x = Math.PI;
        this.scene.add(backWindow);

        // Left windows (facing negative X)
        const sideWindowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
        const leftWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
        leftWindow.position.set(x - 6 - windowDepth, windowY, z);
        leftWindow.rotation.y = Math.PI / 2;
        this.scene.add(leftWindow);

        // Right windows (facing positive X)
        const rightWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
        rightWindow.position.set(x + 6 + windowDepth, windowY, z);
        rightWindow.rotation.y = -Math.PI / 2;
        this.scene.add(rightWindow);
    }

    /**
     * Update the runway (if needed for animations, etc.)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Currently no updates needed for the runway
    }
} 