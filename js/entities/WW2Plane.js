// WW2 Plane class for creating a WW2-style aircraft
import * as THREE from 'three';
import Plane from './Plane.js';
import AmmoSystem from './AmmoSystem.js';

export default class WW2Plane extends Plane {
    constructor(scene, eventBus) {
        super(scene, eventBus);

        // WW2 plane specific properties
        this.fuselageLength = 8;
        this.fuselageWidth = 1.6;
        this.fuselageHeight = 1.8;
        this.wingSpan = 10;

        // Create the WW2 plane mesh
        this.createMesh();

        // Initialize wing trails after mesh is created
        // Parameters: wingSpan, wingHeight, wingZ position
        console.log("Wing dimensions:", this.wingSpan, this.fuselageHeight / 5, -0.5);
        this.initWingTrails(
            this.wingSpan,           // Pass the wingspan 
            this.fuselageHeight / 5, // Wing height - matches wings.position.y in createMesh
            -0.5                     // Wing Z position - matches wings.position.z in createMesh
        );

        // Initialize ammo system
        this.ammoSystem = new AmmoSystem(scene, eventBus);
    }

    /**
     * Create the WW2 plane mesh based on the original game.js implementation
     */
    createMesh() {
        console.log('Creating WW2 plane mesh from original game.js implementation...');

        // Create a group to hold all plane parts
        this.mesh = new THREE.Group();

        // Color scheme for WW2 plane (olive drab/khaki)
        const fuselageColor = 0x5A5A3C; // Olive drab
        const wingsColor = 0x6B6B4B;    // Slightly lighter olive
        const cockpitColor = 0x88CCFF;  // Light blue for glass
        const detailColor = 0x3A3A28;   // Darker for details
        const controlSurfaceColor = 0x7B7B5B; // Slightly different color for control surfaces

        // FUSELAGE (main body) - more authentic WW2 shape
        const fuselageLength = this.fuselageLength;
        const fuselageWidth = this.fuselageWidth;
        const fuselageHeight = this.fuselageHeight;

        // Create tapered fuselage for more realistic shape 
        const fuselageGeometry = new THREE.BoxGeometry(fuselageWidth, fuselageHeight, fuselageLength);
        fuselageGeometry.computeVertexNormals(); // Ensure normals are computed

        const fuselageMaterial = new THREE.MeshStandardMaterial({
            color: fuselageColor,
            roughness: 0.7,
            metalness: 0.1
        });
        const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
        fuselage.position.set(0, 0, 0);
        fuselage.castShadow = true;
        fuselage.receiveShadow = true;
        this.mesh.add(fuselage);

        // Create a nose cone (slightly tapered front section) - REDUCED SEGMENTS
        const noseLength = 2;
        // Reduced segments from 8 to 6
        const noseGeometry = new THREE.CylinderGeometry(0.8, 1.2, noseLength, 6);
        noseGeometry.computeVertexNormals(); // Ensure normals are computed
        const noseMaterial = new THREE.MeshStandardMaterial({
            color: fuselageColor,
            roughness: 0.7,
            metalness: 0.1
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.rotation.x = Math.PI / 2; // Rotate to align with fuselage
        nose.position.set(0, 0, -fuselageLength / 2 - noseLength / 2 + 0.3);
        nose.castShadow = true;
        nose.receiveShadow = true;
        this.mesh.add(nose);

        // Engine cowling (cylinder around the front of the nose) - REDUCED SEGMENTS
        const cowlingRadius = 1.1;
        const cowlingLength = 0.8;
        // Reduced segments from 16 to 8
        const cowlingGeometry = new THREE.CylinderGeometry(cowlingRadius, cowlingRadius, cowlingLength, 8);
        cowlingGeometry.computeVertexNormals(); // Ensure normals are computed
        const cowlingMaterial = new THREE.MeshStandardMaterial({
            color: detailColor,
            roughness: 0.5,
            metalness: 0.3
        });
        const cowling = new THREE.Mesh(cowlingGeometry, cowlingMaterial);
        cowling.rotation.x = Math.PI / 2;
        cowling.position.set(0, 0, -fuselageLength / 2 - noseLength + 0.8);
        cowling.castShadow = true;
        cowling.receiveShadow = true;
        this.mesh.add(cowling);

        // WINGS - COMBINED MAIN WING WITH LEFT/RIGHT WINGS FOR FEWER OBJECTS
        const wingSpan = this.wingSpan;
        const wingChord = 2.5; // Wing depth (front to back)
        const wingThickness = 0.25;
        const aileronWidth = wingSpan * 0.25; // 25% of wing span for ailerons
        const aileronChord = wingChord * 0.3; // 30% of wing chord

        // Create wing using standard BoxGeometry but with better material settings
        const wingGeometry = new THREE.BoxGeometry(wingSpan, wingThickness, wingChord);

        // Make sure vertex normals are computed - this helps with lighting
        wingGeometry.computeVertexNormals();

        const wingMaterial = new THREE.MeshStandardMaterial({
            color: wingsColor,
            flatShading: false,      // Use smooth shading instead of flat shading
            roughness: 0.7,          // More realistic surface
            metalness: 0.1,          // Slightly metallic for a painted metal look
            envMapIntensity: 0.5     // Reduce environment map reflections
        });

        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.position.set(0, fuselageHeight / 5, -0.5);
        wings.castShadow = true;
        wings.receiveShadow = true;
        this.mesh.add(wings);

        // Create ailerons with matching material properties
        const aileronGeometry = new THREE.BoxGeometry(aileronWidth, wingThickness, aileronChord);
        // Move geometry origin to front edge (closer to nose)
        aileronGeometry.translate(0, 0, aileronChord / 2);

        // Make sure vertex normals are computed
        aileronGeometry.computeVertexNormals();

        const aileronMaterial = new THREE.MeshStandardMaterial({
            color: controlSurfaceColor,
            flatShading: false,      // Use smooth shading
            roughness: 0.7,          // Match wing material properties
            metalness: 0.1,
            polygonOffset: true,     // Keep the z-fighting prevention
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });

        // Left aileron
        this.leftAileron = new THREE.Mesh(aileronGeometry, aileronMaterial);
        this.leftAileron.position.set(-wingSpan / 2 + aileronWidth / 2, fuselageHeight / 5 + 0.001, -1.25 + wingChord / 2);
        this.leftAileron.name = "leftAileron";
        this.leftAileron.castShadow = true;
        this.leftAileron.receiveShadow = true;
        this.mesh.add(this.leftAileron);

        // Right aileron
        this.rightAileron = new THREE.Mesh(aileronGeometry, aileronMaterial.clone());
        this.rightAileron.position.set(wingSpan / 2 - aileronWidth / 2, fuselageHeight / 5 + 0.001, -1.25 + wingChord / 2);
        this.rightAileron.name = "rightAileron";
        this.rightAileron.castShadow = true;
        this.rightAileron.receiveShadow = true;
        this.mesh.add(this.rightAileron);

        // COCKPIT - SIMPLIFIED
        const cockpitLength = 2;
        const cockpitWidth = 1.1;
        const cockpitHeight = 0.8;
        const cockpitGeometry = new THREE.BoxGeometry(cockpitWidth, cockpitHeight, cockpitLength);
        cockpitGeometry.computeVertexNormals(); // Ensure normals are computed
        const cockpitMaterial = new THREE.MeshStandardMaterial({
            color: cockpitColor,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1,   // More glassy
            metalness: 0.3
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, fuselageHeight / 2 + cockpitHeight / 2 - 0.1, 0);
        cockpit.castShadow = true;
        cockpit.receiveShadow = true;
        this.mesh.add(cockpit);

        // Add canopy frame (simplified - just top frame)
        const frameWidth = 0.05;
        const frameGeometry = new THREE.BoxGeometry(cockpitWidth + frameWidth, frameWidth, cockpitLength + frameWidth);
        frameGeometry.computeVertexNormals(); // Ensure normals are computed
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: detailColor,
            roughness: 0.5,
            metalness: 0.3
        });
        const topFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        topFrame.position.set(0, fuselageHeight / 2 + cockpitHeight - 0.1, 0);
        topFrame.castShadow = true;
        topFrame.receiveShadow = true;
        this.mesh.add(topFrame);

        // TAIL SECTION
        // Vertical stabilizer (fin)
        const tailFinHeight = 1.8;
        const tailFinLength = 1.5;
        const tailFinThickness = 0.15;
        const tailFinGeometry = new THREE.BoxGeometry(tailFinThickness, tailFinHeight, tailFinLength);
        tailFinGeometry.computeVertexNormals(); // Ensure normals are computed
        const tailMaterial = new THREE.MeshStandardMaterial({
            color: wingsColor,
            roughness: 0.7,
            metalness: 0.1
        });
        const tailFin = new THREE.Mesh(tailFinGeometry, tailMaterial);
        tailFin.position.set(0, fuselageHeight / 2 + tailFinHeight / 2 - 0.3, fuselageLength / 2 - tailFinLength / 2);
        tailFin.castShadow = true;
        tailFin.receiveShadow = true;
        this.mesh.add(tailFin);

        // Rudder - control surface on vertical stabilizer
        const rudderHeight = tailFinHeight * 0.8;
        const rudderLength = tailFinLength * 0.5;
        const rudderThickness = tailFinThickness;
        const rudderGeometry = new THREE.BoxGeometry(rudderThickness, rudderHeight, rudderLength);
        rudderGeometry.computeVertexNormals(); // Ensure normals are computed
        // Move the geometry origin to the front edge (where it connects to the fin)
        rudderGeometry.translate(0, 0, rudderLength / 2);
        const rudderMaterial = new THREE.MeshStandardMaterial({
            color: controlSurfaceColor,
            // Add slight offset to prevent z-fighting
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            roughness: 0.7,
            metalness: 0.1
        });
        this.rudder = new THREE.Mesh(rudderGeometry, rudderMaterial);
        // Move rudder slightly back to prevent z-fighting
        this.rudder.position.set(0, fuselageHeight / 2 + tailFinHeight / 2 - 0.3, fuselageLength / 2 + 0.001);
        this.rudder.name = "rudder";
        this.rudder.castShadow = true;
        this.rudder.receiveShadow = true;
        this.mesh.add(this.rudder);

        // Horizontal stabilizer
        const tailWingSpan = 4;
        const tailWingLength = 1.5;
        const tailWingThickness = 0.15;
        const tailWingGeometry = new THREE.BoxGeometry(tailWingSpan, tailWingThickness, tailWingLength);
        tailWingGeometry.computeVertexNormals(); // Ensure normals are computed
        const horizontalStabilizer = new THREE.Mesh(tailWingGeometry, tailMaterial.clone());
        horizontalStabilizer.position.set(0, fuselageHeight / 4, fuselageLength / 2 - tailWingLength / 2);
        horizontalStabilizer.castShadow = true;
        horizontalStabilizer.receiveShadow = true;
        this.mesh.add(horizontalStabilizer);

        // Elevators - control surfaces on horizontal stabilizer
        const elevatorSpan = tailWingSpan * 0.8;
        const elevatorLength = tailWingLength * 0.4;
        const elevatorThickness = tailWingThickness;
        const elevatorGeometry = new THREE.BoxGeometry(elevatorSpan, elevatorThickness, elevatorLength);
        // Move the geometry origin to the front edge (where it connects to the stabilizer)
        elevatorGeometry.translate(0, 0, elevatorLength / 2);
        const elevatorMaterial = new THREE.MeshPhongMaterial({
            color: controlSurfaceColor,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });
        this.elevators = new THREE.Mesh(elevatorGeometry, elevatorMaterial);
        this.elevators.position.set(0, fuselageHeight / 4 + 0.001, fuselageLength / 2);
        this.elevators.name = "elevators";
        this.elevators.castShadow = true;
        this.elevators.receiveShadow = true;
        this.mesh.add(this.elevators);

        // PROPELLER - SIMPLIFIED
        const propellerWidth = 0.15;
        const propellerHeight = 3;
        const propellerDepth = 0.3;

        // Create two-blade propeller
        const propBladeGeometry = new THREE.BoxGeometry(propellerWidth, propellerHeight, propellerDepth);
        const propellerMaterial = new THREE.MeshPhongMaterial({
            color: 0x222222 // Dark grey/black
        });

        this.propeller = new THREE.Group(); // Create a group for the propeller

        // First blade
        const blade1 = new THREE.Mesh(propBladeGeometry, propellerMaterial);
        blade1.castShadow = true;
        blade1.receiveShadow = true;
        this.propeller.add(blade1);

        // Second blade (rotated 90 degrees)
        const blade2 = new THREE.Mesh(propBladeGeometry, propellerMaterial);
        blade2.rotation.z = Math.PI / 2;
        blade2.castShadow = true;
        blade2.receiveShadow = true;
        this.propeller.add(blade2);

        // Add propeller center cap - REDUCED SEGMENTS
        // Reduced segments from 16,16 to 8,8
        const capGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const capMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const propCap = new THREE.Mesh(capGeometry, capMaterial);
        propCap.castShadow = true;
        propCap.receiveShadow = true;
        this.propeller.add(propCap);

        // Position the propeller at the front of the fuselage
        this.propeller.position.set(0, 0, -fuselageLength / 2 - noseLength - 0.2);
        this.mesh.add(this.propeller);

        // LANDING GEAR - REDUCED SEGMENTS, SIMPLIFIED
        // Main wheels (2) - REDUCED SEGMENTS
        const wheelRadius = 0.4;
        const wheelThickness = 0.25;
        // Reduced segments from 16 to 8
        const wheelSegments = 8;
        const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, wheelSegments);
        const wheelMaterial = new THREE.MeshPhongMaterial({
            color: 0x222222
        });

        // Add wheel struts (the metal parts connecting wheels to fuselage)
        const strutHeight = 1.6;
        const strutWidth = 0.1;
        const strutDepth = 0.1;
        const strutGeometry = new THREE.BoxGeometry(strutWidth, strutHeight, strutDepth);
        const strutMaterial = new THREE.MeshPhongMaterial({ color: detailColor });

        // LEFT WHEEL ASSEMBLY
        const leftWheelGroup = new THREE.Group();

        const leftStrut = new THREE.Mesh(strutGeometry, strutMaterial);
        leftStrut.castShadow = true;
        leftStrut.receiveShadow = true;
        leftWheelGroup.add(leftStrut);

        const leftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        leftWheel.rotation.z = Math.PI / 2;
        leftWheel.position.set(0, -strutHeight / 2 - wheelRadius / 2, 0);
        leftWheel.castShadow = true;
        leftWheel.receiveShadow = true;
        leftWheelGroup.add(leftWheel);

        leftWheelGroup.position.set(-fuselageWidth - 1.0, -0.2, -1);
        this.mesh.add(leftWheelGroup);

        // RIGHT WHEEL ASSEMBLY
        const rightWheelGroup = new THREE.Group();

        const rightStrut = new THREE.Mesh(strutGeometry, strutMaterial);
        rightStrut.castShadow = true;
        rightStrut.receiveShadow = true;
        rightWheelGroup.add(rightStrut);

        const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        rightWheel.rotation.z = Math.PI / 2;
        rightWheel.position.set(0, -strutHeight / 2 - wheelRadius / 2, 0);
        rightWheel.castShadow = true;
        rightWheel.receiveShadow = true;
        rightWheelGroup.add(rightWheel);

        rightWheelGroup.position.set(fuselageWidth + 1.0, -0.2, -1);
        this.mesh.add(rightWheelGroup);

        // REAR WHEEL - REDUCED SEGMENTS
        const rearWheelRadius = 0.25;
        const rearWheelGeometry = new THREE.CylinderGeometry(rearWheelRadius, rearWheelRadius, wheelThickness, wheelSegments);
        const rearWheel = new THREE.Mesh(rearWheelGeometry, wheelMaterial);
        rearWheel.rotation.z = Math.PI / 2;
        rearWheel.position.set(0, -fuselageHeight / 2 - rearWheelRadius / 2, fuselageLength / 2 - 0.5);
        rearWheel.castShadow = true;
        rearWheel.receiveShadow = true;
        this.mesh.add(rearWheel);

        // Calculate the correct height for the plane to sit on its wheels
        const lowestPointY = -0.2 - (strutHeight / 2) - wheelRadius; // -1.4
        const planeHeight = Math.abs(lowestPointY); // 1.4

        // Set the groundHeight property for use in the flight mechanics
        this.groundHeight = planeHeight;
        console.log(`Setting plane ground height to ${this.groundHeight}`);

        // Position the plane on the runway with the wheels touching the ground
        this.mesh.position.set(0, this.groundHeight, 40);

        // Add the plane to the scene
        this.scene.add(this.mesh);

        console.log('WW2 plane mesh created and added to scene');
    }

    /**
     * Fire ammo from both wings
     */
    fireAmmo() {
        // Create velocity vector in the direction the plane is facing
        const velocity = new THREE.Vector3();
        // Get forward direction of the plane and multiply by speed
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        velocity.copy(forward).multiplyScalar(this.speed);

        // Set source plane for collision detection
        this.ammoSystem.currentSourcePlane = this;

        // Fire bullets
        this.ammoSystem.fireBullets(this.mesh, velocity);

        // Emit firing event for multiplayer
        if (this.eventBus) {
            this.eventBus.emit('plane.fire', {
                position: this.mesh.position.clone(),
                direction: forward,
                velocity: velocity,
                planeMesh: this.mesh
            });
        }
    }

    /**
     * Update WW2 plane each frame
     * @param {number} deltaTime - Time since last update in seconds
     * @param {Object} inputState - Current input state
     */
    update(deltaTime, inputState) {
        // Call the parent update method
        super.update(deltaTime, inputState);

        // Update ammo system
        this.ammoSystem.update(deltaTime);

        // Check for firing
        if (inputState.keysPressed[' ']) {
            this.fireAmmo();
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        super.dispose();

        // Clean up ammo system
        if (this.ammoSystem) {
            this.ammoSystem.dispose();
        }
    }
} 