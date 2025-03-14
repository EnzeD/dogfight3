// Zeppelin.js - Creates a magnificent zeppelin hovering over the city
import * as THREE from 'three';

export default class Zeppelin {
    constructor(scene, zeppelinConfig) {
        this.scene = scene;
        this.config = zeppelinConfig || {};

        // Zeppelin components
        this.body = null;
        this.zeppelinGroup = new THREE.Group(); // Main container for all zeppelin parts

        // Advertisement components
        this.adPanels = [];
        this.clickableObjects = [];

        // Animation properties
        this.floatAmplitude = 0.5; // Maximum float distance
        this.floatSpeed = 0.2;     // Speed of floating motion
        this.currentAngle = 0;     // Current animation angle

        // Quality settings with fallbacks and null checking
        const quality = this.config.quality || {};
        this.segments = quality.segments || 16;
        this.radialSegments = quality.radialSegments || 8;
        this.detailLevel = quality.detailLevel || 'medium';

        // Default ad texture
        this.defaultTexture = this.createFallbackTexture();
        new THREE.TextureLoader().load('assets/textures/zeppelin_ad_default.png',
            // Success callback
            (texture) => {
                this.defaultTexture = texture;
                this.updateAdTextures(texture);
            },
            // Progress callback
            null,
            // Error callback - create a fallback texture
            (error) => {
                console.warn('Failed to load zeppelin_ad_default.png, using generated fallback texture');
                // Already using the fallback texture generated in constructor
            }
        );

        // Materials
        this.materials = {
            hull: null,
            metal: null,
            fabric: null,
            billboardBg: null
        };

        // Initialize
        this.createMaterials();
        this.createZeppelin();

        // Add zeppelin group to the scene
        this.scene.add(this.zeppelinGroup);

        console.log(`Zeppelin created with quality level: ${this.detailLevel}, segments: ${this.segments}`);
    }

    /**
     * Create materials for the zeppelin
     */
    createMaterials() {
        // Get colors from config or use defaults
        const hullColor = this.config.colors?.hull || 0xD5D8DC;
        const fabricColor = this.config.colors?.fabric || 0x800020;

        // Silver metallic material for the hull
        this.materials.hull = new THREE.MeshStandardMaterial({
            color: hullColor,
            metalness: 0.3,
            roughness: 0.5,
            envMapIntensity: 1.0
        });

        // Dark metal for structural parts
        this.materials.metal = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });

        // Fabric material for flags and decorations
        this.materials.fabric = new THREE.MeshStandardMaterial({
            color: fabricColor, // Burgundy red
            metalness: 0.0,
            roughness: 0.9
        });

        // Billboard panel background material (dark)
        this.materials.billboardBg = new THREE.MeshStandardMaterial({
            color: 0x0C0D13, // rgb(12, 13, 19) - dark background
            metalness: 0.4,
            roughness: 0.6
        });
    }

    /**
     * Create the entire zeppelin
     */
    createZeppelin() {
        console.log('Creating zeppelin with configuration:', this.config);

        // Create the main body
        this.createBody();

        // Add company logo/advertisement to the left side only
        this.addCompanyLogo();

        // Position the zeppelin
        const position = this.config.position || { x: 0, y: 0, z: 0 };
        this.zeppelinGroup.position.set(position.x, position.y, position.z);

        // Scale the zeppelin
        const scale = this.config.scale || 1;
        this.zeppelinGroup.scale.set(scale, scale, scale);

        // Rotate the zeppelin
        if (this.config.rotation) {
            if (typeof this.config.rotation.y !== 'undefined') {
                this.zeppelinGroup.rotation.y = this.config.rotation.y;
            }
        }
    }

    /**
     * Create the main hull/body of the zeppelin
     */
    createBody() {
        // Create main hull (elongated ellipsoid shape)
        const bodyGeometry = new THREE.CapsuleGeometry(
            20, // radius
            120, // length
            this.segments, // radial segments (configurable)
            this.segments * 2  // heightSegments (configurable)
        );

        this.body = new THREE.Mesh(bodyGeometry, this.materials.hull);
        this.body.castShadow = true;
        this.body.receiveShadow = true;

        // Rotate to align with z-axis
        this.body.rotation.z = Math.PI / 2;

        this.zeppelinGroup.add(this.body);

        // Add hull details - rings around the body
        this.addHullRings();

        // Add company logo/name on the sides
        this.addCompanyLogo();

        // Add bottom reinforcement
        this.addBottomReinforcement();
    }

    /**
     * Add structural rings around the hull for detail
     */
    addHullRings() {
        const ringPositions = [-50, -25, 0, 25, 50];
        const ringRadius = 20.5; // Slightly larger than hull radius
        const ringThickness = 0.5;

        ringPositions.forEach(pos => {
            const ringGeometry = new THREE.TorusGeometry(
                ringRadius,    // ring radius
                ringThickness, // tube radius
                this.radialSegments, // radial segments (configurable)
                this.segments * 2    // tubular segments (configurable)
            );

            const ring = new THREE.Mesh(ringGeometry, this.materials.metal);
            ring.castShadow = true;

            // Position along the hull
            ring.position.x = pos;

            this.zeppelinGroup.add(ring);
        });
    }

    /**
     * Add company logo/name on the sides of the zeppelin
     */
    addCompanyLogo() {
        // Get advertisement settings
        const adSettings = this.config.advertisement || {
            texture: '',
            clickURL: '',
            width: 100,
            height: 40
        };

        // Create a texture for the advertisement
        let adTexture;
        if (adSettings.texture) {
            adTexture = new THREE.TextureLoader().load(adSettings.texture,
                // Success callback - texture loaded successfully
                (texture) => {
                    console.log(`Zeppelin advertisement texture loaded: ${adSettings.texture}`);
                    // Adjust texture properties for better visibility
                    texture.anisotropy = 16; // Increase anisotropic filtering
                    texture.magFilter = THREE.LinearFilter; // Better magnification filtering
                    texture.minFilter = THREE.LinearMipmapLinearFilter; // Better minification filtering
                },
                // Progress callback
                null,
                // Error callback - texture failed to load
                (error) => {
                    console.error(`Error loading zeppelin ad texture: ${error.message}`);
                    // If loading fails, try to use the default texture
                    adTexture = this.defaultTexture;
                    this.updateAdTextures(adTexture);
                }
            );
        } else {
            adTexture = this.defaultTexture;
        }

        // Create material with the ad texture - Increased contrast and brightness
        const adMaterial = new THREE.MeshBasicMaterial({
            map: adTexture,
            transparent: true,
            side: THREE.DoubleSide,
            color: 0xFFFFFF, // White to ensure full brightness
            emissive: 0x333333, // Slight emissive property to increase visibility
            emissiveMap: adTexture // Use same texture for emissive to enhance contrast
        });

        // Create ad panel group
        const adPanelGroup = new THREE.Group();

        // Increase advertisement panel size for better visibility
        const adWidth = (adSettings.width || 100) * 1.2;
        const adHeight = (adSettings.height || 40) * 1.2;
        const panelDepth = 1.5; // Slightly thicker for the larger panel
        const frameWidth = 3; // Wider frame for the larger billboard

        // Create the panel backing (dark background)
        const panelGeometry = new THREE.BoxGeometry(adWidth, adHeight, panelDepth);
        const panelBacking = new THREE.Mesh(panelGeometry, this.materials.billboardBg);
        panelBacking.position.set(0, 0, -panelDepth / 2); // Slight offset for the frame
        adPanelGroup.add(panelBacking);

        // Create the frame around the billboard
        this.createBillboardFrame(adPanelGroup, adWidth, adHeight, panelDepth, frameWidth);

        // Create the actual ad surface
        const adSurfaceGeometry = new THREE.PlaneGeometry(adWidth - frameWidth * 2, adHeight - frameWidth * 2);
        const adSurface = new THREE.Mesh(adSurfaceGeometry, adMaterial);
        adSurface.position.set(0, 0, panelDepth / 2 + 0.1); // Slightly in front of the panel
        adPanelGroup.add(adSurface);

        // IMPORTANT: Position the ad panel on the OUTSIDE of the zeppelin, only on the left side
        // Position the ad panel on the side of the zeppelin at approximately the middle
        // Use positive Z for left side when facing forward
        adPanelGroup.position.set(0, 0, 23); // Positive Z to place it on the left side of the zeppelin

        // Add user data for click handling to the entire group
        adSurface.userData = {
            type: 'zeppelinAd',
            id: 'zeppelinAd_panel',
            clickURL: adSettings.clickURL,
            isClickable: !!adSettings.clickURL
        };

        this.adPanels = [adSurface]; // Store the clickable surface
        this.zeppelinGroup.add(adPanelGroup);

        // Add panel to clickable objects if it has a URL
        this.clickableObjects = [];
        if (adSettings.clickURL) {
            this.clickableObjects.push(adSurface);
        }
    }

    /**
     * Create a frame around the billboard
     */
    createBillboardFrame(parentGroup, width, height, depth, frameWidth) {
        // Create frame material (metallic)
        const frameMaterial = this.materials.metal;

        // Top frame
        const topFrameGeometry = new THREE.BoxGeometry(width, frameWidth, depth + 0.5);
        const topFrame = new THREE.Mesh(topFrameGeometry, frameMaterial);
        topFrame.position.set(0, height / 2 - frameWidth / 2, 0);
        parentGroup.add(topFrame);

        // Bottom frame
        const bottomFrameGeometry = new THREE.BoxGeometry(width, frameWidth, depth + 0.5);
        const bottomFrame = new THREE.Mesh(bottomFrameGeometry, frameMaterial);
        bottomFrame.position.set(0, -height / 2 + frameWidth / 2, 0);
        parentGroup.add(bottomFrame);

        // Left frame
        const leftFrameGeometry = new THREE.BoxGeometry(frameWidth, height - frameWidth * 2, depth + 0.5);
        const leftFrame = new THREE.Mesh(leftFrameGeometry, frameMaterial);
        leftFrame.position.set(-width / 2 + frameWidth / 2, 0, 0);
        parentGroup.add(leftFrame);

        // Right frame
        const rightFrameGeometry = new THREE.BoxGeometry(frameWidth, height - frameWidth * 2, depth + 0.5);
        const rightFrame = new THREE.Mesh(rightFrameGeometry, frameMaterial);
        rightFrame.position.set(width / 2 - frameWidth / 2, 0, 0);
        parentGroup.add(rightFrame);
    }

    /**
     * Update advertisement textures if they change at runtime
     * @param {THREE.Texture} newTexture - The new texture to apply
     */
    updateAdTextures(newTexture) {
        this.adPanels.forEach(panel => {
            if (panel.material) {
                panel.material.map = newTexture;
                panel.material.needsUpdate = true;
            }
        });
    }

    /**
     * Update advertisement click URL
     * @param {string} newURL - The new URL to navigate to when clicked
     */
    updateAdURL(newURL) {
        this.adPanels.forEach(panel => {
            panel.userData.clickURL = newURL;
            panel.userData.isClickable = !!newURL;
        });

        // Update clickable objects array
        this.clickableObjects = [];
        if (newURL) {
            this.adPanels.forEach(panel => {
                this.clickableObjects.push(panel);
            });
        }

        console.log(`Zeppelin ad URL updated to: ${newURL}`);
    }

    /**
     * Handle hover effect for advertisement
     * @param {Object} intersection - Raycaster intersection object
     * @param {boolean} isHovering - Whether mouse is hovering over the object
     */
    handleHoverEffect(intersection, isHovering) {
        // Reset all ad panels to normal state if not hovering over any
        if (!intersection) {
            this.adPanels.forEach(panel => {
                panel.scale.set(1, 1, 1);
            });
            return;
        }

        const object = intersection.object;

        if (object.userData && object.userData.type === 'zeppelinAd') {
            if (isHovering) {
                // Apply hover effect
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
     * Get clickable objects for raycasting
     * @returns {Array} Array of clickable 3D objects
     */
    getClickableObjects() {
        return this.clickableObjects;
    }

    /**
     * Add a subtle reinforcement strip along the bottom of the hull
     */
    addBottomReinforcement() {
        // Only add for medium and high detail levels
        if (this.detailLevel === 'low') return;

        // Create a slightly curved plate for the bottom
        const bottomPlateGeometry = new THREE.CylinderGeometry(
            5, // top radius
            5, // bottom radius
            100, // height
            this.radialSegments, // segments (configurable)
            1, // height segments
            true, // open-ended
            Math.PI * 0.7, // start angle
            Math.PI * 0.6 // angle length (less than full circle)
        );

        const bottomPlate = new THREE.Mesh(bottomPlateGeometry, this.materials.metal);
        bottomPlate.rotation.x = Math.PI / 2; // Rotate to align with hull
        bottomPlate.position.y = -19; // Position at bottom of hull

        this.zeppelinGroup.add(bottomPlate);

        // Add some rivets along the reinforcement for detail
        if (this.detailLevel === 'high') {
            this.addRivets(bottomPlate);
        }
    }

    /**
     * Add decorative rivets to a bottom plate
     */
    addRivets(bottomPlate) {
        const rivetGeometry = new THREE.SphereGeometry(0.3, 4, 4);
        const positions = [
            [-40, 0, 0], [-30, 0, 0], [-20, 0, 0], [-10, 0, 0],
            [0, 0, 0], [10, 0, 0], [20, 0, 0], [30, 0, 0], [40, 0, 0]
        ];

        positions.forEach(pos => {
            const rivet = new THREE.Mesh(rivetGeometry, this.materials.metal);
            rivet.position.set(pos[0], bottomPlate.position.y - 0.3, pos[2]);
            this.zeppelinGroup.add(rivet);
        });
    }

    /**
     * Update the zeppelin for animation (called on each frame)
     */
    update(deltaTime) {
        // Update animation angle
        this.currentAngle += this.floatSpeed * deltaTime;

        // Create floating motion
        const floatOffset = Math.sin(this.currentAngle) * this.floatAmplitude;

        // Safely get position.y with fallback
        const baseY = (this.config.position && this.config.position.y) ? this.config.position.y : 350;
        this.zeppelinGroup.position.y = baseY + floatOffset;

        // Add slight rotation for natural movement (with safety checks)
        if (this.config.rotation && typeof this.config.rotation.y !== 'undefined') {
            this.zeppelinGroup.rotation.y = this.config.rotation.y + (Math.sin(this.currentAngle * 0.2) * 0.02);
        }
    }

    /**
     * Create a fallback texture when the default ad texture cannot be loaded
     * @returns {THREE.Texture} A generated fallback texture
     */
    createFallbackTexture() {
        // Create a canvas
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Fill with dark blue background
        ctx.fillStyle = '#113366';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add a border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Add text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('YOUR AD HERE', canvas.width / 2, canvas.height / 2 - 30);

        ctx.font = '25px Arial';
        ctx.fillText('Fly High with Our Airlines', canvas.width / 2, canvas.height / 2 + 30);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
} 