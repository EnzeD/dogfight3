// Trees.js - Manages different types of trees in the scene
import * as THREE from 'three';

export default class Trees {
    constructor(scene, eventBus, qualitySettings, treeMapData) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.qualitySettings = qualitySettings;
        this.treeMapData = treeMapData; // Static tree positions from map data

        // Collections for tree instances
        this.trees = [];

        // Tree type definitions with meshes and materials
        this.treeTypes = {
            pine: null,
            oak: null,
            palm: null,
            birch: null,
            willow: null
        };

        // Get quality settings
        const settings = this.qualitySettings.getCurrentSettings();
        this.quality = settings.trees || {};

        // Store segment detail based on quality
        this.segments = this.quality.segments || 6; // Default to medium
        this.foliageDetail = this.quality.foliageDetail || 2; // Default to medium

        console.log(`Creating trees with quality settings: segments=${this.segments}, foliageDetail=${this.foliageDetail}`);

        // Initialize trees
        this.init();
    }

    /**
     * Initialize tree types and create instances
     */
    init() {
        this.createTreeTypes();
        this.placeTrees();
        console.log(`Trees initialized with ${this.trees.length} instances`);
    }

    /**
     * Create the 5 different tree type templates
     */
    createTreeTypes() {
        // Create materials
        const darkGreenMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d4c1e,
            roughness: 0.8,
            metalness: 0.2
        });

        const lightGreenMaterial = new THREE.MeshStandardMaterial({
            color: 0x506b2f,
            roughness: 0.9,
            metalness: 0.1
        });

        const tropicalGreenMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a9c2e,
            roughness: 0.7,
            metalness: 0.2
        });

        const brightGreenMaterial = new THREE.MeshStandardMaterial({
            color: 0x7cba3f,
            roughness: 0.8,
            metalness: 0.1
        });

        const yellowGreenMaterial = new THREE.MeshStandardMaterial({
            color: 0x8fb742,
            roughness: 0.9,
            metalness: 0.1
        });

        const brownMaterial = new THREE.MeshStandardMaterial({
            color: 0x5d4037,
            roughness: 0.9,
            metalness: 0.0
        });

        const lightBrownMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b6b4c,
            roughness: 0.8,
            metalness: 0.1
        });

        // 1. Pine Tree (conical shape with trunk)
        this.treeTypes.pine = this.createPineTree(darkGreenMaterial, brownMaterial);

        // 2. Oak Tree (broad canopy with thick trunk)
        this.treeTypes.oak = this.createOakTree(lightGreenMaterial, brownMaterial);

        // 3. Palm Tree (tall trunk with fronds at top)
        this.treeTypes.palm = this.createPalmTree(tropicalGreenMaterial, lightBrownMaterial);

        // 4. Birch Tree (tall, thin trunk with light foliage)
        this.treeTypes.birch = this.createBirchTree(brightGreenMaterial, new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            roughness: 0.7,
            metalness: 0.2
        }));

        // 5. Willow Tree (drooping, weeping foliage)
        this.treeTypes.willow = this.createWillowTree(yellowGreenMaterial, brownMaterial);
    }

    /**
     * Create a pine tree model
     */
    createPineTree(foliageMaterial, trunkMaterial) {
        const tree = new THREE.Group();

        // Create trunk
        const trunkHeight = 15;
        const trunkRadius = 0.5;

        // Use quality-based segment count for trunk
        const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, this.segments);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Create pine foliage layers (cones stacked on top of each other)
        const layerCount = 4;
        const baseRadius = 6;
        const topRadius = 1;

        for (let i = 0; i < layerCount; i++) {
            const layerHeight = 6;
            const ratio = 1 - (i / layerCount);
            const layerRadius = baseRadius * ratio + topRadius * (1 - ratio);

            // Use quality-based segment count for foliage
            const coneGeometry = new THREE.ConeGeometry(
                layerRadius,
                layerHeight,
                this.segments,
                this.foliageDetail
            );

            const cone = new THREE.Mesh(coneGeometry, foliageMaterial);

            // Position cones from bottom to top
            const layerPosition = trunkHeight * 0.6 + (layerHeight * 0.6 * i);
            cone.position.y = layerPosition;

            cone.castShadow = true;
            cone.receiveShadow = true;
            tree.add(cone);
        }

        return tree;
    }

    /**
     * Create an oak tree model
     */
    createOakTree(foliageMaterial, trunkMaterial) {
        const tree = new THREE.Group();

        // Create trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 10);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        trunk.castShadow = false;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Create canopy (several overlapping spheres)
        const canopyPositions = [
            { x: 0, y: 5.5, z: 0, scale: 2.8 },
            { x: 1.5, y: 5, z: 0, scale: 2.2 },
            { x: -1.5, y: 5, z: 0, scale: 2.2 },
            { x: 0, y: 5, z: 1.5, scale: 2.2 },
            { x: 0, y: 5, z: -1.5, scale: 2.2 }
        ];

        canopyPositions.forEach(pos => {
            const foliageGeometry = new THREE.SphereGeometry(pos.scale, 8, 8);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.set(pos.x, pos.y, pos.z);
            foliage.castShadow = false;
            foliage.receiveShadow = true;
            tree.add(foliage);
        });

        return tree;
    }

    /**
     * Create a palm tree model
     */
    createPalmTree(foliageMaterial, trunkMaterial) {
        const tree = new THREE.Group();

        // Create curved trunk
        const trunkCurvePoints = [];
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const x = Math.sin(t * Math.PI * 0.2) * 0.5;
            const y = t * 7;
            const z = 0;
            trunkCurvePoints.push(new THREE.Vector3(x, y, z));
        }

        const trunkCurve = new THREE.CatmullRomCurve3(trunkCurvePoints);
        const trunkGeometry = new THREE.TubeGeometry(trunkCurve, 20, 0.25, 8, false);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = false;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Create palm fronds
        const frondCount = 9;
        for (let i = 0; i < frondCount; i++) {
            const frondGroup = new THREE.Group();

            // Create a single frond using custom geometry
            const frondShape = new THREE.Shape();
            frondShape.moveTo(0, 0);
            frondShape.bezierCurveTo(0.1, 1, 0.8, 1.5, 0.3, 3);
            frondShape.lineTo(-0.3, 3);
            frondShape.bezierCurveTo(-0.8, 1.5, -0.1, 1, 0, 0);

            const extrudeSettings = {
                steps: 1,
                depth: 0.1,
                bevelEnabled: false
            };

            const frondGeometry = new THREE.ExtrudeGeometry(frondShape, extrudeSettings);
            const frond = new THREE.Mesh(frondGeometry, foliageMaterial);
            frond.scale.set(1, 1, 0.1);
            frond.castShadow = false;
            frond.receiveShadow = true;

            // Rotate and position frond
            frond.rotation.x = Math.PI / 2;
            frond.rotation.z = (i * (Math.PI * 2)) / frondCount;

            frondGroup.add(frond);
            frondGroup.position.y = 7;
            frondGroup.rotation.x = Math.PI / 6;
            frondGroup.rotation.y = (i * (Math.PI * 2)) / frondCount;

            tree.add(frondGroup);
        }

        return tree;
    }

    /**
     * Create a birch tree model
     */
    createBirchTree(foliageMaterial, trunkMaterial) {
        const tree = new THREE.Group();

        // Create tall, thin trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.3, 6, 8);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 3;
        trunk.castShadow = false;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Create foliage (elongated ellipsoid)
        const foliageGeometry = new THREE.SphereGeometry(1.8, 8, 8);
        foliageGeometry.scale(1, 1.5, 1);
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 6;
        foliage.castShadow = false;
        foliage.receiveShadow = true;
        tree.add(foliage);

        // Add detail - a few small branches
        for (let i = 0; i < 5; i++) {
            const branchGeometry = new THREE.CylinderGeometry(0.05, 0.03, 1, 4);
            const branch = new THREE.Mesh(branchGeometry, trunkMaterial);

            // Position branches at different heights and rotations
            const height = 2 + i * 0.8;
            const angle = i * Math.PI * 0.4;

            branch.position.set(
                Math.sin(angle) * 0.2,
                height,
                Math.cos(angle) * 0.2
            );

            branch.rotation.z = Math.PI / 2 - angle;
            branch.castShadow = false;

            tree.add(branch);
        }

        return tree;
    }

    /**
     * Create a willow tree model
     */
    createWillowTree(foliageMaterial, trunkMaterial) {
        const tree = new THREE.Group();

        // Create trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.7, 5, 8);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2.5;
        trunk.castShadow = false;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Create main canopy
        const canopyGeometry = new THREE.SphereGeometry(3, 10, 10);
        canopyGeometry.scale(1, 0.7, 1);
        const canopy = new THREE.Mesh(canopyGeometry, foliageMaterial);
        canopy.position.y = 5.5;
        canopy.castShadow = false;
        canopy.receiveShadow = true;
        tree.add(canopy);

        // Create drooping branches
        const branchCount = 16;
        for (let i = 0; i < branchCount; i++) {
            const branchCurvePoints = [];
            const angle = (i / branchCount) * Math.PI * 2;
            const radius = 2.5;

            for (let j = 0; j <= 10; j++) {
                const t = j / 10;
                const x = Math.cos(angle) * radius * (1 - 0.3 * t);
                const y = 5.5 - t * 4;
                const z = Math.sin(angle) * radius * (1 - 0.3 * t);
                branchCurvePoints.push(new THREE.Vector3(x, y, z));
            }

            const branchCurve = new THREE.CatmullRomCurve3(branchCurvePoints);
            const branchGeometry = new THREE.TubeGeometry(branchCurve, 20, 0.05, 4, false);
            const branch = new THREE.Mesh(branchGeometry, foliageMaterial);
            branch.castShadow = false;
            branch.receiveShadow = true;
            tree.add(branch);
        }

        return tree;
    }

    /**
     * Place trees using static map data instead of random positions
     */
    placeTrees() {
        // Check if we have map data
        if (!this.treeMapData) {
            console.warn('No tree map data provided. No trees will be placed.');
            return;
        }

        // Place each tree type according to map data
        Object.entries(this.treeMapData).forEach(([treeType, positions]) => {
            if (!Array.isArray(positions) || !this.treeTypes[treeType]) {
                return; // Skip if not valid data or tree type doesn't exist
            }

            console.log(`Placing ${positions.length} ${treeType} trees from map data`);

            positions.forEach(treeData => {
                // Clone the template for this tree type
                const tree = this.treeTypes[treeType].clone();

                // Use exact scale, position and rotation from map data
                const scale = treeData.scale || 3.0;
                tree.scale.set(scale, scale, scale);

                // Set position from map data
                tree.position.set(treeData.x, treeData.y, treeData.z);

                // Set rotation from map data
                tree.rotation.y = treeData.rotation || 0;

                // Add to scene and keep track of it
                this.scene.add(tree);
                this.trees.push({
                    mesh: tree,
                    type: treeType
                });
            });
        });

        console.log(`Placed ${this.trees.length} trees in the scene with quality level: ${this.qualitySettings.getQuality()}`);
    }

    /**
     * Update method for animation/changes over time
     */
    update(deltaTime) {
        // Could implement subtle tree movements (wind effect, etc.)
    }

    /**
     * Removes all trees from the scene
     */
    clear() {
        // Remove all trees from the scene
        this.trees.forEach(tree => {
            this.scene.remove(tree.mesh);
        });

        this.trees = [];
    }
} 