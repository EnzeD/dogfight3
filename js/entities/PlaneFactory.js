// Plane Factory for creating different types of planes
import WW2Plane from './WW2Plane.js';
import EnemyPlane from './EnemyPlane.js';
import PlayerWW2Plane from './PlayerWW2Plane.js';

export default class PlaneFactory {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;
    }

    /**
     * Create a WW2-style plane for the player with enhanced destruction effects
     * @returns {PlayerWW2Plane} The created plane with explosion and free fall effects
     */
    createWW2Plane() {
        return new PlayerWW2Plane(this.scene, this.eventBus);
    }

    /**
     * Create an enemy WW2-style plane
     * @returns {EnemyPlane} The created enemy plane
     */
    createEnemyPlane() {
        return new EnemyPlane(this.scene, this.eventBus);
    }

    /**
     * Create a plane for remote players in multiplayer
     * @returns {EnemyPlane} The created remote player plane
     */
    createRemotePlayerPlane() {
        console.log('Creating remote player plane');

        // Using EnemyPlane as the base for remote players
        const remotePlane = new EnemyPlane(this.scene, this.eventBus);

        // Add any remote-player specific customizations here
        remotePlane.isRemotePlayer = true;

        return remotePlane;
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
            case 'remote':
                return this.createRemotePlayerPlane();
            case 'ww2':
            default:
                return this.createWW2Plane();
        }
    }
} 