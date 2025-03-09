// Runway class for creating and managing the runway
import * as THREE from 'three';

export default class Runway {
    constructor(scene, runwayMapData) {
        this.scene = scene;
        this.runwayMapData = runwayMapData; // Static runway data from map
        this.runway = null;

        // =====================================================================
        // LOGO MIRRORING CONFIGURATION
        // =====================================================================
        // Edit these settings to control how logos appear on each face
        // Set mirrorHorizontal to true to flip the logo horizontally (left-to-right)
        // Set mirrorVertical to true to flip the logo vertically (upside-down)
        //
        // Adjust these settings to ensure all logos appear correctly
        // when viewed from outside the control tower
        // =====================================================================
        this.logoMirrorConfig = {
            'front': {
                mirrorHorizontal: true,
                mirrorVertical: false
            },
            'back': {
                mirrorHorizontal: true,
                mirrorVertical: false
            },
            'left': {
                mirrorHorizontal: false, // Currently mirroring the left side horizontally
                mirrorVertical: false
            },
            'right': {
                mirrorHorizontal: false,
                mirrorVertical: false
            }
        };

        // Store clickable objects for raycasting
        this.clickableObjects = [];

        // URL to navigate to when logo panels are clicked
        this.logoClickURL = "http://coderabbit.ai/?utm_campaign=flyzullofun&utm_source=ingameclick&utm_medium=game";

        // Create the runway
        this.createRunway();
        // Create the control tower
        this.createControlTower();
    }

    /**
     * Create the runway using map data if available
     */
    createRunway() {
        // Define runway dimensions - use map data if available
        const runwayWidth = this.runwayMapData ? this.runwayMapData.width : 30;
        const runwayLength = this.runwayMapData ? this.runwayMapData.length : 150;
        const position = this.runwayMapData ? this.runwayMapData.position : { x: 0, y: 0.02, z: -30 };
        const rotation = this.runwayMapData ? this.runwayMapData.rotation : 0;

        console.log(`Creating runway with dimensions: ${runwayWidth}x${runwayLength} at position: ${position.x}, ${position.y}, ${position.z}`);

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

        // Apply additional rotation from map if specified
        this.runway.rotation.z = rotation;

        // Position the runway based on map data
        this.runway.position.set(position.x, position.y, position.z);

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
            centerStripe.position.set(0, 0.08, z - 30); // Slightly above runway

            this.scene.add(centerStripe);
        }

        // Create threshold markings at both ends
        const thresholdGeometry = new THREE.PlaneGeometry(runwayWidth, 2);

        // Start threshold
        const startThreshold = new THREE.Mesh(thresholdGeometry, markingMaterial);
        startThreshold.receiveShadow = true;
        startThreshold.rotation.x = Math.PI / 2;
        startThreshold.position.set(0, 0.08, -runwayLength / 2 + 1 - 30); // Apply the Z offset
        this.scene.add(startThreshold);

        // End threshold
        const endThreshold = new THREE.Mesh(thresholdGeometry, markingMaterial);
        endThreshold.receiveShadow = true;
        endThreshold.rotation.x = Math.PI / 2;
        endThreshold.position.set(0, 0.08, runwayLength / 2 - 1 - 30); // Apply the Z offset
        this.scene.add(endThreshold);
    }

    /**
     * Create the control tower
     */
    createControlTower() {
        // Position the tower next to the runway
        const runwayWidth = 30;
        const towerPosition = new THREE.Vector3(
            runwayWidth / 2 + 30, // 10 units away from the edge of the runway
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

        // Create the control room at the top with a clean design (no protruding screen panel)
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

        // Add a flat roof on top of the control room
        const roofGeometry = new THREE.BoxGeometry(13, 0.5, 13);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999, // Dark grey roof
            roughness: 0.9,
            metalness: 0.1
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(towerPosition.x, 26.25, towerPosition.z);
        roof.castShadow = true;
        roof.receiveShadow = true;
        this.scene.add(roof);

        // Add windows to the control room
        this.addControlRoomWindows(towerPosition.x, 23, towerPosition.z);

        // Add Code Rabbit logo to all 4 sides of the control room
        this.addLogoToControlRoom(towerPosition.x, 23, towerPosition.z);

        // Add a taller antenna on top
        const antennaHeight = 8; // Increased from 4 to 8
        const antennaGeometry = new THREE.CylinderGeometry(0.2, 0.2, antennaHeight, 8);
        const antennaMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333, // Dark grey
            roughness: 0.3,
            metalness: 0.8
        });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        const antennaY = 26.5 + (antennaHeight / 2); // Position on top of the roof
        antenna.position.set(towerPosition.x, antennaY, towerPosition.z);
        antenna.castShadow = true;
        this.scene.add(antenna);

        // Add a flag using the CR_Icon-orange@2x.png
        this.addFlagToAntenna(towerPosition.x, antennaY, towerPosition.z, antennaHeight);
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

        // Add windows on all four sides - smaller height to leave room for logo
        const windowDepth = 0.2;
        const windowWidth = 10;
        const windowHeight = 3; // Reduced height to provide more space for logo
        const windowY = y - 0.5; // Lower position to leave space at the top for logo

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
     * Add Code Rabbit logo to all 4 sides of the control room
     * @param {number} x - X position of the control room
     * @param {number} y - Y position of the control room
     * @param {number} z - Z position of the control room
     */
    addLogoToControlRoom(x, y, z) {
        // Load the SVG as a texture
        const textureLoader = new THREE.TextureLoader();

        // Simple black material for the background panels
        const blackMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.6,
            metalness: 0.2,
            side: THREE.DoubleSide
        });

        // Create panels on all 4 sides
        this.createLogoPanel(x, y, z, 'front');
        this.createLogoPanel(x, y, z, 'back');
        this.createLogoPanel(x, y, z, 'left');
        this.createLogoPanel(x, y, z, 'right');

        // Add lights for visibility
        this.addLogoLights(x, y, z);
    }

    /**
     * Create a single logo panel on one side of the tower
     * @param {number} x - Center X position of the tower
     * @param {number} y - Center Y position of the tower
     * @param {number} z - Center Z position of the tower
     * @param {string} side - Which side of the tower ('front', 'back', 'left', 'right')
     */
    createLogoPanel(x, y, z, side) {
        // Panel dimensions - large enough to be clearly visible
        const panelWidth = 12;
        const panelHeight = 3.5;
        const heightPosition = y + 1.5; // Position higher up from the center
        const distanceFromWall = 6.3; // Further from the wall to ensure visibility

        // Create the black background panel
        const panelGeometry = new THREE.BoxGeometry(panelWidth, panelHeight, 0.2);
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000, // Black
            roughness: 0.6,
            metalness: 0.3,
            side: THREE.DoubleSide
        });

        // Position and rotate based on which side we're on
        let panelX = x;
        let panelY = heightPosition;
        let panelZ = z;
        let rotationY = 0;

        switch (side) {
            case 'front':
                panelZ = z + distanceFromWall;
                rotationY = Math.PI;  // Rotate 180 degrees to face outward
                break;
            case 'back':
                panelZ = z - distanceFromWall;
                rotationY = 0;  // No rotation needed for back
                break;
            case 'left':
                panelX = x - distanceFromWall;
                rotationY = -Math.PI / 2;  // Rotate -90 degrees to face outward
                break;
            case 'right':
                panelX = x + distanceFromWall;
                rotationY = Math.PI / 2;  // Rotate 90 degrees to face outward
                break;
        }

        // Create and position the panel
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.set(panelX, panelY, panelZ);
        panel.rotation.y = rotationY;
        panel.castShadow = false;
        panel.receiveShadow = true;
        this.scene.add(panel);

        // Now add the logo on top of the panel
        const logoWidth = panelWidth * 0.9; // Slightly smaller than the panel
        const logoHeight = panelHeight * 0.7;
        const logoGeometry = new THREE.PlaneGeometry(logoWidth, logoHeight);

        // Create a new canvas texture with the logo properly oriented
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 512;
        logoCanvas.height = 128;
        const ctx = logoCanvas.getContext('2d');

        // Load the SVG image into an Image object
        const img = new Image();
        img.src = 'assets/code-rabbit-logo-dark.svg';

        // When image loads, draw it on the canvas
        img.onload = () => {
            // Clear the canvas
            ctx.clearRect(0, 0, logoCanvas.width, logoCanvas.height);

            // Get mirroring settings for this side from the configuration
            const mirrorConfig = this.logoMirrorConfig[side];
            const mirrorHorizontal = mirrorConfig ? mirrorConfig.mirrorHorizontal : false;
            const mirrorVertical = mirrorConfig ? mirrorConfig.mirrorVertical : false;

            // Apply transformations based on mirror settings
            ctx.save();

            // Apply horizontal mirroring if needed
            if (mirrorHorizontal) {
                ctx.translate(logoCanvas.width, 0);
                ctx.scale(-1, 1);
            }

            // Apply vertical mirroring if needed
            if (mirrorVertical) {
                ctx.translate(0, logoCanvas.height);
                ctx.scale(1, -1);
            }

            // Draw the image with applied transformations
            ctx.drawImage(img, 0, 0, logoCanvas.width, logoCanvas.height);

            // Restore original context
            ctx.restore();

            // Create a texture from the canvas
            const logoTexture = new THREE.CanvasTexture(logoCanvas);
            logoTexture.minFilter = THREE.LinearFilter;
            logoTexture.magFilter = THREE.LinearFilter;
            logoTexture.needsUpdate = true;

            // Create material with the properly oriented logo
            const logoMaterial = new THREE.MeshStandardMaterial({
                map: logoTexture,
                transparent: true,
                side: THREE.DoubleSide,
                roughness: 0.3,
                metalness: 0.5,
                emissive: new THREE.Color(0xffffff),
                emissiveIntensity: 0.8,
                emissiveMap: logoTexture
            });

            // Create logo mesh and position it just in front of the panel
            const logo = new THREE.Mesh(logoGeometry, logoMaterial);

            // Position logo slightly in front of the black panel
            const offset = 0.15; // Offset from the panel surface

            // Calculate the correct offset direction based on rotation
            let offsetX = 0, offsetZ = 0;
            if (side === 'front') offsetZ = offset;
            else if (side === 'back') offsetZ = -offset;
            else if (side === 'left') offsetX = -offset;
            else if (side === 'right') offsetX = offset;

            logo.position.set(panelX + offsetX, panelY, panelZ + offsetZ);
            logo.rotation.y = rotationY;
            logo.castShadow = false;
            logo.receiveShadow = false;

            // Store the URL to navigate to when clicked
            logo.userData = {
                isClickable: true,
                url: this.logoClickURL,
                side: side
            };

            // Add to the scene and to clickable objects array
            this.scene.add(logo);
            this.clickableObjects.push(logo);
        };
    }

    /**
     * Add spotlights to illuminate the logos
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    addLogoLights(x, y, z) {
        // Panel height position
        const heightPosition = y + 1.5;
        const distanceFromWall = 6.3;
        const lightDistance = 2.5; // How far back the light is from the panel

        // Light properties
        const lightColor = 0xffffff;
        const intensity = 3.0;
        const distance = 15;
        const angle = Math.PI / 8;
        const penumbra = 0.2;

        // Function to add a spotlight for a specific side
        const addSpotlight = (side) => {
            let lightX = x;
            let lightY = heightPosition;
            let lightZ = z;
            let targetX = x;
            let targetY = heightPosition;
            let targetZ = z;

            // Position light and target based on side
            switch (side) {
                case 'front':
                    lightZ = z + distanceFromWall + lightDistance;
                    targetZ = z + distanceFromWall;
                    break;
                case 'back':
                    lightZ = z - distanceFromWall - lightDistance;
                    targetZ = z - distanceFromWall;
                    break;
                case 'left':
                    lightX = x - distanceFromWall - lightDistance;
                    targetX = x - distanceFromWall;
                    break;
                case 'right':
                    lightX = x + distanceFromWall + lightDistance;
                    targetX = x + distanceFromWall;
                    break;
            }

            // Create spotlight
            const light = new THREE.SpotLight(lightColor, intensity, distance, angle, penumbra);
            light.position.set(lightX, lightY, lightZ);

            // Create target
            const target = new THREE.Object3D();
            target.position.set(targetX, targetY, targetZ);
            light.target = target;

            // Add to scene
            this.scene.add(light);
            this.scene.add(target);
        };

        // Add lights for all sides
        addSpotlight('front');
        addSpotlight('back');
        addSpotlight('left');
        addSpotlight('right');
    }

    /**
     * Add a flag to the antenna using the orange Code Rabbit icon
     * @param {number} x - X position of the antenna
     * @param {number} y - Y position of the antenna center
     * @param {number} z - Z position of the antenna
     * @param {number} antennaHeight - Height of the antenna
     */
    addFlagToAntenna(x, y, z, antennaHeight) {
        // Load the CR_Icon-orange@2x.png texture
        const textureLoader = new THREE.TextureLoader();
        const flagTexture = textureLoader.load('assets/CR_Icon-orange@2x.png');

        // Flag dimensions - rectangular flag shape
        const flagWidth = 4;  // Width (extending from pole)
        const flagHeight = 4; // Height

        // Create a simple rectangular flag geometry
        const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight);

        // Create the black material for the flag base
        const blackMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide
        });

        // Create the flag mesh
        const flagMesh = new THREE.Mesh(flagGeometry, blackMaterial);

        // Create a slightly smaller plane for the logo
        const logoWidth = flagWidth * 0.8;
        const logoHeight = flagHeight * 0.8;
        const logoGeometry = new THREE.PlaneGeometry(logoWidth, logoHeight);

        // Create material with the texture
        const logoMaterial = new THREE.MeshBasicMaterial({
            map: flagTexture,
            transparent: true,
            side: THREE.DoubleSide
        });

        // Create the logo mesh for both sides
        const logoFront = new THREE.Mesh(logoGeometry, logoMaterial);
        logoFront.position.set(0, 0, 0.01); // Slightly in front
        flagMesh.add(logoFront);

        const logoBack = new THREE.Mesh(logoGeometry, logoMaterial);
        logoBack.position.set(0, 0, -0.01); // Slightly in back
        logoBack.rotation.y = Math.PI; // Rotate to face the other direction
        flagMesh.add(logoBack);

        // Position the flag at the top of the antenna
        const flagPosY = y + (antennaHeight / 3 - 1); // Position at the top third

        // The flag should be aligned with the left edge at the antenna
        // Move the flag by half its width to the right of the antenna
        const flagPosX = x + (flagWidth / 2);

        // Create a group for the flag to apply proper rotation
        const flagGroup = new THREE.Group();
        flagGroup.add(flagMesh);

        // Position and rotate the flag to hang correctly from the pole
        flagGroup.position.set(flagPosX, flagPosY, z);

        // Attach the flag to the scene
        this.scene.add(flagGroup);
    }

    /**
     * Update the runway (if needed for animations, etc.)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Currently no updates needed for the runway
    }

    /**
     * Get all clickable objects in the runway scene
     * @returns {Array} Array of clickable objects with their associated data
     */
    getClickableObjects() {
        return this.clickableObjects;
    }

    /**
     * Handle hover effects for clickable objects
     * @param {Object} intersection - The intersection object from raycasting
     * @param {boolean} isHovering - Whether the object is being hovered over
     */
    handleHoverEffect(intersection, isHovering) {
        // Handle case when not hovering over any object (intersection is null)
        if (!intersection) {
            // Reset all clickable objects to their normal state
            this.clickableObjects.forEach(obj => {
                obj.scale.set(1, 1, 1);
                if (obj.material && obj.material.emissiveIntensity !== undefined) {
                    obj.material.emissiveIntensity = 0.8; // Reset brightness
                    obj.material.needsUpdate = true;
                }
            });
            return;
        }

        if (intersection.object.userData && intersection.object.userData.isClickable) {
            const obj = intersection.object;
            if (isHovering) {
                // Scale up slightly and brighten when hovered
                obj.scale.set(1.05, 1.05, 1.05);
                if (obj.material.emissiveIntensity) {
                    obj.material.emissiveIntensity = 1.2; // Increase brightness
                    obj.material.needsUpdate = true;
                }
                // Change cursor to pointer
                document.body.style.cursor = 'pointer';
            } else {
                // Reset to normal when not hovered
                obj.scale.set(1, 1, 1);
                if (obj.material.emissiveIntensity) {
                    obj.material.emissiveIntensity = 0.8; // Reset brightness
                    obj.material.needsUpdate = true;
                }
                // Reset cursor
                document.body.style.cursor = 'auto';
            }
        }
    }
} 