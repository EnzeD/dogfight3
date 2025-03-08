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

        // Tree instances (static trees based on map data)
        this.staticTrees = [];

        // Performance settings
        this.detailLevel = this.qualitySettings.getCurrentSettings().environmentDetail;
        this.segments = this.detailLevel === 'high' ? 8 : (this.detailLevel === 'medium' ? 6 : 4);
        this.distanceThreshold = 500; // Distance at which to use LOD
        this.maxFoliageSegments = this.detailLevel === 'high' ? 8 : (this.detailLevel === 'medium' ? 6 : 4);

        // Instance-based rendering for similar trees (much more efficient)
        this.useInstancing = true;
        this.instancedMeshes = {};

        // LOD matrices for optimized rendering
        this.lodMatrix = {};

        // Define tree heights for proper scaling
        this.treeHeights = {
            pine: 12,
            oak: 15,
            palm: 10,
            birch: 12,
            willow: 13
        };

        // Get quality settings
        this.quality = this.qualitySettings.getCurrentSettings();

        // Store segment detail based on quality
        this.foliageDetail = this.quality.foliageDetail || 2; // Default to medium

        console.log(`Creating trees with quality settings: segments=${this.segments}, foliageDetail=${this.foliageDetail}`);

        // Initialize trees
        this.init();
    }

    /**
     * Initialize tree types and place them on the map
     */
    init() {
        console.log('Initializing trees with quality level:', this.detailLevel);

        // Create materials with performance-based detail
        const darkGreenMaterial = new THREE.MeshStandardMaterial({
            color: 0x2D4F2D,
            roughness: 0.8,
            metalness: 0.0
        });

        const lightGreenMaterial = new THREE.MeshStandardMaterial({
            color: 0x4A7F3F,
            roughness: 0.8,
            metalness: 0.0
        });

        const tropicalGreenMaterial = new THREE.MeshStandardMaterial({
            color: 0x3A9C35,
            roughness: 0.7,
            metalness: 0.1
        });

        const brightGreenMaterial = new THREE.MeshStandardMaterial({
            color: 0x75A159,
            roughness: 0.8,
            metalness: 0.0
        });

        const yellowGreenMaterial = new THREE.MeshStandardMaterial({
            color: 0x97B85F,
            roughness: 0.8,
            metalness: 0.0
        });

        const brownMaterial = new THREE.MeshStandardMaterial({
            color: 0x7C4D2B,
            roughness: 0.9,
            metalness: 0.1
        });

        const lightBrownMaterial = new THREE.MeshStandardMaterial({
            color: 0xA67D53,
            roughness: 0.8,
            metalness: 0.1
        });

        // Create tree types with optimized geometry
        this.treeTypes.pine = this.createPineTree(darkGreenMaterial, brownMaterial);
        this.treeTypes.oak = this.createOakTree(lightGreenMaterial, brownMaterial);
        this.treeTypes.palm = this.createPalmTree(tropicalGreenMaterial, lightBrownMaterial);
        this.treeTypes.birch = this.createBirchTree(brightGreenMaterial, new THREE.MeshStandardMaterial({
            color: 0xDDDDDD, // White birch trunk
            roughness: 0.7,
            metalness: 0.1
        }));
        this.treeTypes.willow = this.createWillowTree(yellowGreenMaterial, brownMaterial);

        // Generate tree instances if we have tree map data
        if (this.treeMapData) {
            this.placeTreesFromMap();
        }
    }

    /**
     * Set up instanced rendering for more efficient tree rendering
     */
    setupInstancedRendering() {
        // Create instanced meshes for each tree type and component
        const typeKeys = Object.keys(this.treeTypes);

        for (const type of typeKeys) {
            const treeTemplate = this.treeTypes[type];
            const components = [];

            // Create an array of component meshes for instancing
            treeTemplate.traverse(child => {
                if (child.isMesh) {
                    components.push({
                        geometry: child.geometry,
                        material: child.material,
                        matrix: child.matrix.clone(), // Keep original transform
                        parent: child.parent
                    });
                }
            });

            // Count trees of this type in the map data
            let count = 0;
            for (const treeType in this.treeMapData) {
                if (treeType === type && Array.isArray(this.treeMapData[treeType])) {
                    count = this.treeMapData[treeType].length;
                }
            }

            if (count > 0) {
                // Create instanced mesh for each component
                this.instancedMeshes[type] = components.map(component => {
                    const instancedMesh = new THREE.InstancedMesh(
                        component.geometry,
                        component.material,
                        count
                    );
                    instancedMesh.castShadow = true;
                    instancedMesh.receiveShadow = true;
                    this.scene.add(instancedMesh);
                    return instancedMesh;
                });
            }
        }
    }

    /**
     * Create a pine tree with optimized geometry
     */
    createPineTree(foliageMaterial, trunkMaterial) {
        const tree = new THREE.Group();

        // Trunk parameters
        const trunkHeight = 5;
        const trunkRadius = 0.5;

        // Use lower segment count for the trunk
        const trunkSegments = Math.min(this.segments, 6);

        // Create optimized trunk with fewer sides
        const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, trunkSegments);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Cone layers for foliage - reduced segment count 
        const foliageSegments = Math.min(this.maxFoliageSegments, 8);

        // Multiple cones for the foliage with different heights/radiuses
        const foliageLayers = [
            { radius: 3.0, height: 6.0, y: trunkHeight + 3.0 },
            { radius: 2.5, height: 5.0, y: trunkHeight + 5.5 },
            { radius: 1.8, height: 4.0, y: trunkHeight + 7.5 }
        ];

        // If low quality, only use 2 layers
        if (this.detailLevel === 'low') {
            foliageLayers.pop();
        }

        // Create each cone layer
        foliageLayers.forEach(layer => {
            const coneGeometry = new THREE.ConeGeometry(
                layer.radius,
                layer.height,
                foliageSegments, // Radial segments - reduced
                1,              // Height segments - minimized
                false           // Open ended = false
            );

            const cone = new THREE.Mesh(coneGeometry, foliageMaterial);
            cone.position.y = layer.y;
            cone.castShadow = true;
            cone.receiveShadow = true;
            tree.add(cone);
        });

        return tree;
    }

    /**
     * Create an oak tree with optimized geometry
     */
    createOakTree(foliageMaterial, trunkMaterial) {
        const tree = new THREE.Group();

        // Simplified trunk with fewer segments
        const trunkSegments = Math.min(this.segments, 6);
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, trunkSegments);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Create a sparse foliage distribution instead of many individual spheres
        const foliagePositions = [
            { x: 0, y: 7, z: 0, scale: 3.0 },
            { x: 1.5, y: 6, z: 1.5, scale: 2.0 },
            { x: -1.5, y: 6, z: -1.2, scale: 2.2 },
            { x: 1.2, y: 5.5, z: -1.2, scale: 1.8 },
            { x: -1, y: 5.8, z: 1.4, scale: 1.9 }
        ];

        // If low quality, use fewer foliage elements
        const positionsToUse = this.detailLevel === 'low' ?
            foliagePositions.slice(0, 3) : foliagePositions;

        // Use lower quality sphere geometry for foliage
        const foliageSegments = Math.min(this.maxFoliageSegments, 6);

        // Create the foliage clusters
        positionsToUse.forEach(pos => {
            const foliageGeometry = new THREE.SphereGeometry(pos.scale, foliageSegments, foliageSegments);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.set(pos.x, pos.y, pos.z);
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            tree.add(foliage);
        });

        return tree;
    }

    /**
     * Create a palm tree with optimized geometry
     */
    createPalmTree(foliageMaterial, trunkMaterial) {
        const tree = new THREE.Group();

        // Create bent trunk with a curve (optimized with fewer points)
        const trunkSegments = Math.min(this.segments, 6);
        const trunkCurvePoints = [];

        // Generate curve points for trunk
        for (let i = 0; i <= 4; i++) {
            const t = i / 4;
            const x = Math.sin(t * Math.PI * 0.5) * 0.5;
            const y = t * 6;
            const z = 0;
            trunkCurvePoints.push(new THREE.Vector3(x, y, z));
        }

        const trunkCurve = new THREE.CatmullRomCurve3(trunkCurvePoints);
        const trunkGeometry = new THREE.TubeGeometry(trunkCurve, 5, 0.25, trunkSegments, false);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Create simpler palm fronds with fewer detail for low-poly look
        const frondCount = this.detailLevel === 'low' ? 5 :
            (this.detailLevel === 'medium' ? 7 : 9);

        const frondGroup = new THREE.Group();
        frondGroup.position.y = 6;

        // Create simple palm fronds
        for (let i = 0; i < frondCount; i++) {
            const angle = (i / frondCount) * Math.PI * 2;
            const frondLength = 2 + Math.random() * 1.5;

            // Create simple shape for frond
            const frondShape = new THREE.Shape();
            frondShape.moveTo(0, 0);
            frondShape.quadraticCurveTo(0.5, 0.5, 1, 0);
            frondShape.lineTo(frondLength, 0.5);
            frondShape.lineTo(frondLength, -0.5);
            frondShape.lineTo(1, -0.2);
            frondShape.quadraticCurveTo(0.5, -0.5, 0, 0);

            // Simplified extrusion settings
            const extrudeSettings = {
                steps: 1,
                depth: 0.05,
                bevelEnabled: false
            };

            const frondGeometry = new THREE.ExtrudeGeometry(frondShape, extrudeSettings);
            const frond = new THREE.Mesh(frondGeometry, foliageMaterial);

            // Position and rotate
            frond.rotation.x = -Math.PI / 2;
            frond.rotation.z = angle;
            frond.position.y = Math.random() * 0.5;

            // Add 30° upward tilt
            frond.rotation.y = Math.PI / 6;

            frond.castShadow = true;
            frond.receiveShadow = true;
            frondGroup.add(frond);
        }

        tree.add(frondGroup);
        return tree;
    }

    /**
     * Create a birch tree with optimized geometry
     */
    createBirchTree(foliageMaterial, trunkMaterial) {
        const tree = new THREE.Group();

        // Simplified trunk
        const trunkSegments = Math.min(this.segments, 6);
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.3, 6, trunkSegments);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 3;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Simplified foliage (fewer segments)
        const foliageSegments = Math.min(this.maxFoliageSegments, 6);
        const foliageGeometry = new THREE.SphereGeometry(1.8, foliageSegments, foliageSegments);
        // Squash the sphere slightly to make it more elliptical
        foliageGeometry.scale(1, 1.2, 1);

        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 6;
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        tree.add(foliage);

        // Only add small branches in medium/high quality
        if (this.detailLevel !== 'low') {
            // Add a few small branches
            const branchCount = this.detailLevel === 'high' ? 4 : 2;

            for (let i = 0; i < branchCount; i++) {
                const angle = (i / branchCount) * Math.PI * 2;
                const branchGeometry = new THREE.CylinderGeometry(0.05, 0.03, 1, 3);
                const branch = new THREE.Mesh(branchGeometry, trunkMaterial);

                const height = 2.5 + i * 0.7;
                branch.position.set(
                    Math.sin(angle) * 0.3,
                    height,
                    Math.cos(angle) * 0.3
                );

                branch.rotation.z = Math.PI / 2 - angle;
                branch.rotation.y = Math.PI / 2;

                branch.castShadow = true;
                branch.receiveShadow = true;
                tree.add(branch);
            }
        }

        return tree;
    }

    /**
     * Create a willow tree with optimized geometry
     */
    createWillowTree(foliageMaterial, trunkMaterial) {
        const tree = new THREE.Group();

        // Simplified trunk
        const trunkSegments = Math.min(this.segments, 6);
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.7, 5, trunkSegments);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2.5;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Simplified canopy (fewer segments)
        const foliageSegments = Math.min(this.maxFoliageSegments, 6);
        const canopyGeometry = new THREE.SphereGeometry(3, foliageSegments, foliageSegments);
        // Stretch the canopy for willow look
        canopyGeometry.scale(1, 1.2, 1);

        const canopy = new THREE.Mesh(canopyGeometry, foliageMaterial);
        canopy.position.y = 5.5;
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        tree.add(canopy);

        // Only add drooping branches in medium/high quality
        if (this.detailLevel !== 'low') {
            // Add drooping branches (fewer and simpler for optimization)
            const branchCount = this.detailLevel === 'high' ? 6 : 3;

            for (let i = 0; i < branchCount; i++) {
                const angle = (i / branchCount) * Math.PI * 2;

                // Simplified curved branch (fewer points)
                const branchCurvePoints = [];

                // Generate curve points for branch
                for (let j = 0; j <= 4; j++) {
                    const t = j / 4;
                    // Create drooping curve
                    const x = Math.sin(angle) * (2 + t * 2);
                    const y = 6 - t * 3;  // Start high, then droop down
                    const z = Math.cos(angle) * (2 + t * 2);
                    branchCurvePoints.push(new THREE.Vector3(x, y, z));
                }

                const branchCurve = new THREE.CatmullRomCurve3(branchCurvePoints);
                const branchGeometry = new THREE.TubeGeometry(branchCurve, 4, 0.05, 3, false);
                const branch = new THREE.Mesh(branchGeometry, foliageMaterial);

                branch.castShadow = true;
                branch.receiveShadow = true;
                tree.add(branch);
            }
        }

        return tree;
    }

    /**
     * Place trees from map data - SIMPLIFIED VERSION
     */
    placeTreesFromMap() {
        console.log("Placing trees from map data");

        // Clear existing trees
        this.clear();

        // Simpler implementation - create individual trees directly
        for (const treeType in this.treeMapData) {
            if (this.treeTypes[treeType] && Array.isArray(this.treeMapData[treeType])) {
                const treeTemplate = this.treeTypes[treeType];
                const treePositions = this.treeMapData[treeType];

                console.log(`Creating ${treePositions.length} trees of type ${treeType}`);

                treePositions.forEach(tree => {
                    const treeMesh = treeTemplate.clone();

                    // Apply position, rotation, and scale
                    treeMesh.position.set(tree.x, 0, tree.z);
                    treeMesh.rotation.y = tree.rotation || 0;

                    const scale = tree.scale || 1;
                    treeMesh.scale.set(scale, scale, scale);

                    // Enable shadows
                    treeMesh.traverse(object => {
                        if (object.isMesh) {
                            object.castShadow = true;
                            object.receiveShadow = true;
                        }
                    });

                    this.trees.push(treeMesh);
                    this.scene.add(treeMesh);
                });
            }
        }

        console.log(`Placed ${this.trees.length} trees in the scene`);
    }

    /**
     * Update trees (LOD for distant trees)
     */
    update(cameraPosition) {
        // Skip if no camera position
        if (!cameraPosition) return;

        // Simple distance-based LOD
        const distanceThreshold = 500;

        // Create a Vector3 if needed - either use the provided position 
        // or extract position from the camera object
        let cameraPos;
        if (cameraPosition.isVector3) {
            cameraPos = cameraPosition;
        } else if (cameraPosition.position && cameraPosition.position.isVector3) {
            cameraPos = cameraPosition.position;
        } else {
            // Can't calculate distance - skip LOD
            return;
        }

        this.trees.forEach(tree => {
            // Safely calculate distance
            const treePos = tree.position;
            const dx = treePos.x - cameraPos.x;
            const dy = treePos.y - cameraPos.y;
            const dz = treePos.z - cameraPos.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance > distanceThreshold) {
                // For distant trees, only show main parts
                tree.traverse(object => {
                    if (object.isMesh && object.geometry.parameters) {
                        // Hide small details
                        const size = Math.max(
                            object.geometry.parameters.width || 0,
                            object.geometry.parameters.height || 0,
                            object.geometry.parameters.radius || 0
                        );

                        // Hide small details on distant trees
                        if (size < 1.0) {
                            object.visible = false;
                        }
                    }
                });
            } else {
                // Show all parts when close
                tree.traverse(object => {
                    if (object.isMesh) {
                        object.visible = true;
                    }
                });
            }
        });
    }

    /**
     * Remove all trees from the scene
     */
    clear() {
        this.trees.forEach(tree => {
            this.scene.remove(tree);
        });
        this.trees = [];
    }
} 