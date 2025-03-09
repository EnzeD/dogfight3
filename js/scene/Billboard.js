// Billboard.js - Class for creating and managing billboards in the game
import * as THREE from 'three';

export default class Billboard {
    /**
     * Create a billboard system
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {Object} mapData - Data from the map for billboard placement
     */
    constructor(scene, mapData) {
        this.scene = scene;
        this.mapData = mapData || [];
        this.billboards = [];
        this.clickableObjects = [];

        // Load default texture if needed
        this.defaultTexture = new THREE.TextureLoader().load('assets/textures/billboard_default.jpg');

        // Create billboards based on map data
        this.createBillboards();
    }

    /**
     * Create all billboards from map data
     */
    createBillboards() {
        if (!this.mapData || this.mapData.length === 0) {
            console.warn('No billboard data provided in map');
            return;
        }

        // Create each billboard from the map data
        this.mapData.forEach((billboardData, index) => {
            this.createSingleBillboard(billboardData, index);
        });
    }

    /**
     * Create a single billboard
     * @param {Object} data - Individual billboard data
     * @param {number} index - Index of the billboard
     */
    createSingleBillboard(data, index) {
        const {
            position = { x: 0, y: 0, z: 0 },
            rotation = 0,
            width = 20,
            height = 10,
            poleHeight = 15,
            texture = '',
            clickURL = ''
        } = data;

        // Create a group to hold the billboard parts
        const billboardGroup = new THREE.Group();
        billboardGroup.position.set(position.x, position.y, position.z);
        billboardGroup.rotation.y = rotation;

        // 1. Create the pole (support structure)
        const poleGeometry = new THREE.CylinderGeometry(0.8, 0.8, poleHeight, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.7,
            metalness: 0.3
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = poleHeight / 2;
        pole.castShadow = true;
        billboardGroup.add(pole);

        // 2. Create the billboard panel
        const panelGeometry = new THREE.PlaneGeometry(width, height);

        // Load the texture or use default
        let billboardTexture;
        if (texture) {
            billboardTexture = new THREE.TextureLoader().load(texture);
        } else {
            billboardTexture = this.defaultTexture;
        }

        const panelMaterial = new THREE.MeshStandardMaterial({
            map: billboardTexture,
            side: THREE.DoubleSide,
            roughness: 0.4,
            metalness: 0.1
        });

        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.y = poleHeight + height / 2;
        panel.castShadow = true;
        panel.receiveShadow = true;

        // Store clickURL in userData for later use in click handling
        panel.userData = {
            type: 'billboard',
            id: `billboard_${index}`,
            clickURL: clickURL,
            isClickable: !!clickURL
        };

        // Add to clickable objects if it has a URL
        if (clickURL) {
            this.clickableObjects.push(panel);
        }

        billboardGroup.add(panel);

        // Add to scene and store reference
        this.scene.add(billboardGroup);
        this.billboards.push({
            group: billboardGroup,
            panel: panel,
            pole: pole,
            data: data
        });
    }

    /**
     * Update a billboard's texture
     * @param {number} index - Index of the billboard to update
     * @param {string} texturePath - Path to the new texture
     */
    updateBillboardTexture(index, texturePath) {
        if (index >= 0 && index < this.billboards.length) {
            const billboard = this.billboards[index];
            const newTexture = new THREE.TextureLoader().load(texturePath);

            const panelMaterial = billboard.panel.material;
            panelMaterial.map = newTexture;
            panelMaterial.needsUpdate = true;
        }
    }

    /**
     * Update a billboard's click URL
     * @param {number} index - Index of the billboard to update
     * @param {string} clickURL - New URL to navigate to when clicked
     */
    updateBillboardURL(index, clickURL) {
        if (index >= 0 && index < this.billboards.length) {
            const billboard = this.billboards[index];
            billboard.panel.userData.clickURL = clickURL;
            billboard.panel.userData.isClickable = !!clickURL;

            // Update clickable objects array
            const panelIndex = this.clickableObjects.indexOf(billboard.panel);
            if (clickURL && panelIndex === -1) {
                this.clickableObjects.push(billboard.panel);
            } else if (!clickURL && panelIndex !== -1) {
                this.clickableObjects.splice(panelIndex, 1);
            }
        }
    }

    /**
     * Handle hover effect for billboard
     * @param {Object} intersection - Raycaster intersection object
     * @param {boolean} isHovering - Whether the mouse is hovering over the object
     */
    handleHoverEffect(intersection, isHovering) {
        // When not hovering over any object, reset hover effects
        if (!intersection) {
            // Reset all billboards to normal state
            this.billboards.forEach(billboard => {
                if (billboard.panel) {
                    billboard.panel.scale.set(1, 1, 1);
                }
            });
            return;
        }

        const object = intersection.object;

        if (object.userData && object.userData.type === 'billboard') {
            if (isHovering) {
                // Apply hover effect (slight scale up or highlight)
                object.scale.set(1.05, 1.05, 1.05);
                document.body.style.cursor = 'pointer';
            } else {
                // Remove hover effect
                object.scale.set(1, 1, 1);
                document.body.style.cursor = 'auto';
            }
        }
    }

    /**
     * Get all clickable objects for raycasting
     * @returns {Array} Array of clickable 3D objects
     */
    getClickableObjects() {
        return this.clickableObjects;
    }

    /**
     * Update method called on each frame
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Any animations or updates can go here
    }
} 