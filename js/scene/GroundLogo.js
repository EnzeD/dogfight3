// GroundLogo.js - Creates a clickable logo on the ground like the zeppelin billboard
import * as THREE from 'three';

export default class GroundLogo {
    /**
     * Create a ground logo
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {Object} logoConfig - Configuration for the logo
     */
    constructor(scene, logoConfig) {
        this.scene = scene;
        this.config = logoConfig || {};

        // Store clickable objects for raycasting
        this.clickableObjects = [];
        this.logoMesh = null;

        // Load default texture with fallback
        this.defaultTexture = this.createFallbackTexture();
        new THREE.TextureLoader().load('assets/textures/village1image.png.png',
            // Success callback
            (texture) => {
                this.defaultTexture = texture;
                if (this.logoMesh) {
                    this.logoMesh.material.map = texture;
                    this.logoMesh.material.needsUpdate = true;
                }
            },
            // Progress callback
            null,
            // Error callback - create a fallback texture
            (error) => {
                console.warn('Failed to load your_ad_here.png, using generated fallback texture');
                // Already using the fallback texture generated in constructor
            }
        );

        // Create materials
        this.createMaterials();

        // Create the billboard on ground
        this.createGroundLogo();
    }

    /**
     * Create materials for the logo panel
     */
    createMaterials() {
        // Create billboard background material (dark color)
        this.materials = {
            billboardBg: new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.7,
                metalness: 0.3
            }),
            metal: new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.5,
                metalness: 0.8
            })
        };
    }

    /**
     * Create the ground logo (billboard style)
     */
    createGroundLogo() {
        // Get logo settings
        const adSettings = this.config || {
            position: { x: 700, y: 0.1, z: 400 },
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
                    console.log(`Ground logo texture loaded: ${adSettings.texture}`);
                    // Adjust texture properties for better visibility
                    texture.anisotropy = 16; // Increase anisotropic filtering
                    texture.magFilter = THREE.LinearFilter; // Better magnification filtering
                    texture.minFilter = THREE.LinearMipmapLinearFilter; // Better minification filtering
                },
                // Progress callback
                null,
                // Error callback - texture failed to load
                (error) => {
                    console.error(`Error loading ground logo texture: ${error.message}`);
                    // If loading fails, try to use the default texture
                    adTexture = this.defaultTexture;
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

        // Create billboard group
        this.logoGroup = new THREE.Group();

        // Set position
        const position = adSettings.position || { x: 700, y: 0.1, z: 400 };
        this.logoGroup.position.set(position.x, position.y, position.z);

        // Rotate the entire group 180 degrees around the Y axis
        this.logoGroup.rotation.y = Math.PI;

        // Set billboard dimensions
        const adWidth = adSettings.width || 100;
        const adHeight = adSettings.height || 40;
        const panelDepth = 2; // Thinner since it's lying flat
        const frameWidth = 3; // Frame width

        // Create the panel backing (dark background)
        const panelGeometry = new THREE.BoxGeometry(adWidth, panelDepth, adHeight);
        const panelBacking = new THREE.Mesh(panelGeometry, this.materials.billboardBg);
        panelBacking.position.set(0, 0, 0);

        // Create the frame around the billboard - lying flat
        this.createFlatBillboardFrame(this.logoGroup, adWidth, adHeight, panelDepth, frameWidth);

        // Create the actual ad surface - top side of the flat billboard
        const adSurfaceGeometry = new THREE.PlaneGeometry(adWidth - frameWidth * 2, adHeight - frameWidth * 2);
        this.logoMesh = new THREE.Mesh(adSurfaceGeometry, adMaterial);

        // Position the ad on top of the backing panel
        this.logoMesh.position.set(0, panelDepth / 2 + 0.1, 0);

        // Rotate to lay flat
        this.logoMesh.rotation.x = -Math.PI / 2;

        // Add user data for click handling
        this.logoMesh.userData = {
            type: 'groundLogo',
            id: 'groundLogo_panel',
            clickURL: adSettings.clickURL,
            isClickable: !!adSettings.clickURL
        };

        // Add parts to logo group
        this.logoGroup.add(panelBacking);
        this.logoGroup.add(this.logoMesh);

        // Add to clickable objects if it has a URL
        if (adSettings.clickURL) {
            this.clickableObjects.push(this.logoMesh);
        }

        // Add the logo group to the scene
        this.scene.add(this.logoGroup);
    }

    /**
     * Create a frame around the billboard that's lying flat on the ground
     */
    createFlatBillboardFrame(parentGroup, width, height, depth, frameWidth) {
        // Create frame material (metallic)
        const frameMaterial = this.materials.metal;

        // Top frame (facing North)
        const topFrameGeometry = new THREE.BoxGeometry(width, depth, frameWidth);
        const topFrame = new THREE.Mesh(topFrameGeometry, frameMaterial);
        topFrame.position.set(0, 0, -height / 2 + frameWidth / 2);
        parentGroup.add(topFrame);

        // Bottom frame (facing South)
        const bottomFrameGeometry = new THREE.BoxGeometry(width, depth, frameWidth);
        const bottomFrame = new THREE.Mesh(bottomFrameGeometry, frameMaterial);
        bottomFrame.position.set(0, 0, height / 2 - frameWidth / 2);
        parentGroup.add(bottomFrame);

        // Left frame (facing West)
        const leftFrameGeometry = new THREE.BoxGeometry(frameWidth, depth, height - frameWidth * 2);
        const leftFrame = new THREE.Mesh(leftFrameGeometry, frameMaterial);
        leftFrame.position.set(-width / 2 + frameWidth / 2, 0, 0);
        parentGroup.add(leftFrame);

        // Right frame (facing East)
        const rightFrameGeometry = new THREE.BoxGeometry(frameWidth, depth, height - frameWidth * 2);
        const rightFrame = new THREE.Mesh(rightFrameGeometry, frameMaterial);
        rightFrame.position.set(width / 2 - frameWidth / 2, 0, 0);
        parentGroup.add(rightFrame);
    }

    /**
     * Update the logo texture
     * @param {string} texturePath - Path to the new texture
     */
    updateLogoTexture(texturePath) {
        if (this.logoMesh) {
            const newTexture = new THREE.TextureLoader().load(texturePath);

            const adMaterial = this.logoMesh.material;
            adMaterial.map = newTexture;
            adMaterial.emissiveMap = newTexture;
            adMaterial.needsUpdate = true;
        }
    }

    /**
     * Update the logo click URL
     * @param {string} clickURL - New URL to navigate to when clicked
     */
    updateLogoURL(clickURL) {
        if (this.logoGroup && this.logoGroup.children.length > 2) {
            const adSurface = this.logoGroup.children[2]; // Third child is the ad surface
            adSurface.userData.clickURL = clickURL;
            adSurface.userData.isClickable = !!clickURL;

            // Update clickable objects array
            const index = this.clickableObjects.indexOf(adSurface);
            if (clickURL && index === -1) {
                this.clickableObjects.push(adSurface);
            } else if (!clickURL && index !== -1) {
                this.clickableObjects.splice(index, 1);
            }
        }
    }

    /**
     * Handle hover effect for ground logo
     * @param {Object} intersection - Raycaster intersection object
     * @param {boolean} isHovering - Whether the mouse is hovering over the object
     */
    handleHoverEffect(intersection, isHovering) {
        // When not hovering over any object, reset hover effects
        if (!intersection) {
            if (this.logoGroup) {
                // For flat billboard, only adjust the Y position
                this.logoGroup.position.y = this.config.position.y || 0.1;
            }
            return;
        }

        const object = intersection.object;

        if (object.userData && object.userData.type === 'groundLogo') {
            if (isHovering) {
                // Apply hover effect (slightly raise the billboard)
                this.logoGroup.position.y = (this.config.position.y || 0.1) + 0.3;
                document.body.style.cursor = 'pointer';
            } else {
                // Remove hover effect
                this.logoGroup.position.y = this.config.position.y || 0.1;
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
        // Currently no updates needed for the ground logo
    }

    // Add the wrapper method for compatibility
    createBillboardFrame(parentGroup, width, height, depth, frameWidth) {
        this.createFlatBillboardFrame(parentGroup, width, height, depth, frameWidth);
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

        // Fill with dark green background (ground-like)
        ctx.fillStyle = '#114422';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add a border
        ctx.strokeStyle = '#FFAA00';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Add text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('YOUR AD HERE', canvas.width / 2, canvas.height / 2 - 30);

        ctx.font = '25px Arial';
        ctx.fillText('Place Your Logo on Our Ground', canvas.width / 2, canvas.height / 2 + 30);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
} 