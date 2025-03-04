// Base Entity class for all game objects
import * as THREE from 'three';

export default class Entity {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scale = { x: 1, y: 1, z: 1 };
    }

    /**
     * Initialize the entity
     */
    init() {
        // To be implemented by subclasses
    }

    /**
     * Update the entity
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // To be implemented by subclasses
    }

    /**
     * Set the position of the entity
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    setPosition(x, y, z) {
        this.position = { x, y, z };

        if (this.mesh) {
            this.mesh.position.set(x, y, z);
        }
    }

    /**
     * Set the rotation of the entity
     * @param {number} x - X rotation (radians)
     * @param {number} y - Y rotation (radians)
     * @param {number} z - Z rotation (radians)
     */
    setRotation(x, y, z) {
        this.rotation = { x, y, z };

        if (this.mesh) {
            this.mesh.rotation.set(x, y, z);
        }
    }

    /**
     * Set the scale of the entity
     * @param {number} x - X scale
     * @param {number} y - Y scale
     * @param {number} z - Z scale
     */
    setScale(x, y, z) {
        this.scale = { x, y, z };

        if (this.mesh) {
            this.mesh.scale.set(x, y, z);
        }
    }

    /**
     * Add the entity to the scene
     */
    addToScene() {
        if (this.mesh && this.scene) {
            this.scene.add(this.mesh);
        }
    }

    /**
     * Remove the entity from the scene
     */
    removeFromScene() {
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
        }
    }
} 