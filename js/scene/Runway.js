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

        // Add French and EU flags
        this.addFlags(towerPosition.x, towerPosition.z);
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
     * Add flags to the control tower
     * @param {number} x - X coordinate for flag position
     * @param {number} z - Z coordinate for flag position
     */
    addFlags(x, z) {
        // Create poles for the flags
        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, // Light grey/silver
            roughness: 0.3,
            metalness: 0.8
        });

        // Flag dimensions
        const flagWidth = 1.5;
        const flagHeight = 1;

        // French flag on one side of the tower
        const frenchPole = new THREE.Mesh(poleGeometry, poleMaterial);
        frenchPole.position.set(x + 4, 27, z + 4); // Top right corner of control room
        frenchPole.castShadow = true;
        this.scene.add(frenchPole);

        // Create the French flag (blue, white, red)
        const frenchFlagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight);

        // Create the three colored stripes
        // Blue stripe
        const blueStripeMaterial = new THREE.MeshBasicMaterial({
            color: 0x0055A4, // French blue
            side: THREE.DoubleSide
        });
        const blueStripe = new THREE.Mesh(
            new THREE.PlaneGeometry(flagWidth / 3, flagHeight),
            blueStripeMaterial
        );
        blueStripe.position.set(x + 4 + flagWidth / 2 - flagWidth / 3, 26.5, z + 4 + 0.4);

        // White stripe
        const whiteStripeMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF, // White
            side: THREE.DoubleSide
        });
        const whiteStripe = new THREE.Mesh(
            new THREE.PlaneGeometry(flagWidth / 3, flagHeight),
            whiteStripeMaterial
        );
        whiteStripe.position.set(x + 4 + flagWidth / 2, 26.5, z + 4 + 0.4);

        // Red stripe
        const redStripeMaterial = new THREE.MeshBasicMaterial({
            color: 0xEF4135, // French red
            side: THREE.DoubleSide
        });
        const redStripe = new THREE.Mesh(
            new THREE.PlaneGeometry(flagWidth / 3, flagHeight),
            redStripeMaterial
        );
        redStripe.position.set(x + 4 + flagWidth / 2 + flagWidth / 3, 26.5, z + 4 + 0.4);

        // Create a group for the French flag
        const frenchFlag = new THREE.Group();
        frenchFlag.add(blueStripe);
        frenchFlag.add(whiteStripe);
        frenchFlag.add(redStripe);

        // Make the flag face forward
        frenchFlag.rotation.y = Math.PI / 4; // Angle it slightly

        this.scene.add(frenchFlag);

        // EU flag on the other side of the tower
        const euPole = new THREE.Mesh(poleGeometry, poleMaterial);
        euPole.position.set(x - 4, 27, z + 4); // Top left corner of control room
        euPole.castShadow = true;
        this.scene.add(euPole);

        // Create the EU flag (blue with yellow stars)
        const euFlagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight);
        const euFlagMaterial = new THREE.MeshBasicMaterial({
            color: 0x003399, // EU blue
            side: THREE.DoubleSide
        });
        const euFlag = new THREE.Mesh(euFlagGeometry, euFlagMaterial);
        euFlag.position.set(x - 4 - flagWidth / 2, 26.5, z + 4 + 0.4);
        euFlag.rotation.y = -Math.PI / 4; // Angle it slightly
        this.scene.add(euFlag);

        // Add the circle of stars to the EU flag
        this.addEUStars(x - 4 - flagWidth / 2, 26.5, z + 4 + 0.4, flagWidth / 2 * 0.4, euFlag.rotation.y);
    }

    /**
     * Add stars to the EU flag in a circle pattern
     * @param {number} x - X center position
     * @param {number} y - Y center position
     * @param {number} z - Z center position
     * @param {number} radius - Radius of the star circle
     * @param {number} rotation - Rotation of the flag
     */
    addEUStars(x, y, z, radius, rotation) {
        const starMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFCC00, // EU gold/yellow
            side: THREE.DoubleSide
        });

        // Create 12 stars in a circle
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const starX = x + Math.sin(angle) * radius;
            const starY = y;
            const starZ = z + Math.cos(angle) * radius;

            // Create a simple star using a small circle (for simplicity)
            const starGeometry = new THREE.CircleGeometry(0.06, 5); // Pentagon star
            const star = new THREE.Mesh(starGeometry, starMaterial);
            star.position.set(starX, starY, starZ);
            star.rotation.y = rotation; // Match flag rotation

            this.scene.add(star);
        }
    }

    /**
     * Update the runway (if needed for animations, etc.)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Currently no updates needed for the runway
    }
} 