// ProtectionZone.js - Defines and manages protected areas in the game
import * as THREE from 'three';

export default class ProtectionZone {
    constructor(scene, eventBus, map) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.map = map;

        // Protection zone properties
        this.enabled = true;
        this.radius = 150; // Half-sphere radius around runway
        this.height = 200; // Maximum height of protection

        // Cache the runway center for faster checks
        this.runwayCenter = new THREE.Vector3(
            this.map.runway.position.x,
            this.map.runway.position.y,
            this.map.runway.position.z
        );

        // Create visual representation for debugging
        this.createVisualizer();

        // By default, hide the visualizer
        this.toggleVisualizer(false);
    }

    /**
     * Check if a point is within the protection zone
     * @param {THREE.Vector3} position - The position to check
     * @returns {boolean} - True if within protection zone
     */
    isInProtectionZone(position) {
        if (!this.enabled) return false;

        // Calculate horizontal distance to runway center
        const horizontalDist = Math.sqrt(
            Math.pow(position.x - this.runwayCenter.x, 2) +
            Math.pow(position.z - this.runwayCenter.z, 2)
        );

        // Check if point is within radius and below height
        return (horizontalDist <= this.radius &&
            position.y <= this.height);
    }

    /**
     * Create a visualizer for the protection zone
     */
    createVisualizer() {
        // Create a half-sphere geometry
        const geometry = new THREE.SphereGeometry(this.radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);

        // Create a transparent material
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });

        // Create the mesh
        this.visualizer = new THREE.Mesh(geometry, material);

        // Position at runway center
        this.visualizer.position.copy(this.runwayCenter);

        // Add to scene
        this.scene.add(this.visualizer);
    }

    /**
     * Toggle the visualizer visibility
     * @param {boolean} show - Whether to show the visualizer
     */
    toggleVisualizer(show) {
        if (this.visualizer) {
            this.visualizer.visible = show;
        }
    }

    /**
     * Enable or disable the protection zone
     * @param {boolean} enabled - Whether the zone is enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
} 