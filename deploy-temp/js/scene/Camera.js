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
        const currentTime = performance.now();
        if (!this.isUserControlling &&
            (currentTime - this.lastUserInteractionTime >= this.cameraFollowDelay)) {

            // Calculate ideal camera position based on plane's position and direction
            const idealOffset = planeDirection.clone().multiplyScalar(-this.followDistance);
            idealOffset.y += 5; // Position camera above the plane

            // Calculate speed-based look-ahead distance
            const speed = this.target.speed || 0;
            const maxSpeed = this.target.maxSpeed || 1;
            const lookAheadDistance = 10 + (speed / maxSpeed) * 20;

            // Calculate look target ahead of the plane (for smoother following)
            const lookTarget = planePosition.clone().add(
                planeDirection.clone().multiplyScalar(lookAheadDistance)
            );

            // Smoothly move camera to ideal position
            const idealPosition = planePosition.clone().add(idealOffset);
            this.camera.position.lerp(idealPosition, this.springStrength);
        }

        // Always update controls
        this.controls.update();
    }
} 