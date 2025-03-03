// Plane Factory for creating different types of planes
import WW2Plane from './WW2Plane.js';
import EnemyPlane from './EnemyPlane.js';

export default class PlaneFactory {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;
    }

    /**
     * Create a WW2-style plane
     * @returns {WW2Plane} The created plane
     */
    createWW2Plane() {
        return new WW2Plane(this.scene, this.eventBus);
    }

    /**
     * Create an enemy WW2-style plane
     * @returns {EnemyPlane} The created enemy plane
     */
    createEnemyPlane() {
        return new EnemyPlane(this.scene, this.eventBus);
    }

    /**
     * Factory method to create a plane by type
     * @param {string} type - The type of plane to create
     * @returns {Plane} The created plane
     */
    createPlane(type) {
        switch (type.toLowerCase()) {
            case 'enemy':
                return this.createEnemyPlane();
            case 'ww2':
            default:
                return this.createWW2Plane();
        }
    }
} 