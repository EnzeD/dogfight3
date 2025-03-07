// Camera class for handling camera behavior and controls
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default class Camera {
    constructor(scene, domElement, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;

        // Camera settings
        this.fieldOfView = 75;
        this.aspectRatio = window.innerWidth / window.innerHeight;
        this.nearClippingPlane = 0.1;
        this.farClippingPlane = 30000;

        // Create the camera
        this.camera = new THREE.PerspectiveCamera(
            this.fieldOfView,
            this.aspectRatio,
            this.nearClippingPlane,
            this.farClippingPlane
        );

        // Initial camera position
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);

        // Camera follow settings
        this.target = null;
        this.isUserControlling = false;
        this.lastUserInteractionTime = 0;
        this.cameraFollowDelay = 1000; // 1 second delay before camera follows again
        this.followDistance = 25;
        this.springStrength = 0.05; // For smooth camera movement

        // Free fall camera settings
        this.freeFallMode = false;
        this.freeFallDistance = 40; // Distance during free fall (farther back to see the plane crash)
        this.freeFallHeight = 15;   // Height during free fall (slightly higher to see better)

        // Dramatic cinematic mode when plane is destroyed
        this.cinematicMode = false;
        this.cinematicTimer = 0;
        this.cinematicDuration = 2000; // ms

        // Create OrbitControls
        this.controls = new OrbitControls(this.camera, domElement);
        this.setupControls();

        // Listen for camera control events
        this.eventBus.on('camera.control', (data) => {
            this.isUserControlling = data.isManual;
            if (data.isManual) {
                this.lastUserInteractionTime = performance.now();
            }
        });

        // Listen for plane destroyed events
        this.eventBus.on('plane.destroyed', (data, source) => {
            // Only switch to free fall mode if the player plane is destroyed
            if (source === 'player') {
                console.log('Camera: Player plane destroyed, switching to free fall camera mode');
                this.freeFallMode = true;
                this.cinematicMode = true;
                this.cinematicTimer = performance.now();

                // Disable orbit controls during cinematic sequence
                this.controls.enabled = false;
            }
        });
    }

    /**
     * Set up the OrbitControls
     */
    setupControls() {
        // Set some reasonable limits for the controls
        this.controls.minDistance = 5;  // Minimum zoom distance
        this.controls.maxDistance = 1000; // Significantly increased to allow seeing much more of the scene

        // Enable damping for smoother camera movement
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Update the controls
        this.controls.update();
    }

    /**
     * Set the target for the camera to follow
     * @param {Object} target - The target object
     */
    setTarget(target) {
        this.target = target;

        // Set initial camera position behind the plane
        if (target && target.mesh) {
            const position = target.mesh.position.clone();
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(target.mesh.quaternion);

            // Position camera behind the plane
            position.add(direction.multiplyScalar(-this.followDistance));
            position.y += 5; // Slightly above the plane

            this.camera.position.copy(position);
            this.controls.target.copy(target.mesh.position);
            this.controls.update();
        }
    }

    /**
     * Update the camera's aspect ratio
     * @param {number} aspectRatio - New aspect ratio
     */
    updateAspect(aspectRatio) {
        this.camera.aspect = aspectRatio;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Get the camera object
     * @returns {THREE.Camera} The camera
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Update camera position to follow the target
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Skip if no target or no target mesh
        if (!this.target || !this.target.mesh) return;

        // Get plane's position and direction
        const planePosition = this.target.mesh.position.clone();
        const planeDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.target.mesh.quaternion);

        // Handle cinematic mode (dramatic camera when plane is first destroyed)
        const currentTime = performance.now();
        if (this.cinematicMode) {
            // Calculate progress through the cinematic sequence (0-1)
            const cinematicProgress = Math.min(1.0, (currentTime - this.cinematicTimer) / this.cinematicDuration);

            // End cinematic mode if timer is complete
            if (cinematicProgress >= 1.0) {
                this.cinematicMode = false;
                this.controls.enabled = true; // Re-enable controls after cinematic
            }

            // Dramatic camera movement: zoom out and up for a better view of the crash
            const startDistance = this.followDistance;
            const endDistance = this.freeFallDistance;
            const cinematicDistance = startDistance + (endDistance - startDistance) * cinematicProgress;

            const startHeight = 5;
            const endHeight = this.freeFallHeight;
            const cinematicHeight = startHeight + (endHeight - startHeight) * cinematicProgress;

            // Set camera to a dramatic position
            const offsetVector = planeDirection.clone().multiplyScalar(-cinematicDistance);
            const desiredPosition = planePosition.clone().add(offsetVector);
            desiredPosition.y += cinematicHeight;

            // Smoothly move camera to the cinematic position
            this.camera.position.lerp(desiredPosition, 0.05);

            // Always look at the plane
            this.controls.target.copy(planePosition);

            return; // Skip normal camera update during cinematic
        }

        // Store previous target position to calculate movement delta
        const previousTargetPosition = this.controls.target.clone();

        // Always update the orbit center to the plane's position
        this.controls.target.copy(planePosition);

        // Calculate how much the plane has moved since last frame
        const positionDelta = planePosition.clone().sub(previousTargetPosition);

        // If the plane has moved, move the camera by the same amount to maintain relative position
        if (positionDelta.lengthSq() > 0.0001) {
            this.camera.position.add(positionDelta);
        }

        // Handle automatic camera behavior only when not manually controlling
        if (!this.isUserControlling &&
            (currentTime - this.lastUserInteractionTime >= this.cameraFollowDelay)) {

            // Different camera behavior for free fall mode
            if (this.freeFallMode && this.target.isDestroyed) {
                // In free fall mode, position camera farther back and slightly higher
                const freeFallOffset = planeDirection.clone().multiplyScalar(-this.freeFallDistance);
                const desiredPosition = planePosition.clone().add(freeFallOffset);
                desiredPosition.y += this.freeFallHeight;

                // Smooth transition to desired position
                this.camera.position.lerp(desiredPosition, this.springStrength);
            }
            else {
                // Normal flight camera follows behind and slightly above
                const idealOffset = planeDirection.clone().multiplyScalar(-this.followDistance);
                idealOffset.y += 5; // Position above the plane

                const desiredPosition = planePosition.clone().add(idealOffset);

                // Smooth transition to ideal position
                this.camera.position.lerp(desiredPosition, this.springStrength);
            }
        }

        // Always update controls
        this.controls.update();
    }
} 