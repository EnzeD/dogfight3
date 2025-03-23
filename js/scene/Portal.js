// Portal.js - Class for creating and managing a portal in the game
import * as THREE from 'three';

export default class Portal {
    /**
     * Create a portal
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {Object} mapData - Data from the map for portal placement
     */
    constructor(scene, mapData) {
        this.scene = scene;
        this.mapData = mapData || {};
        this.portal = null;
        this.particles = [];
        this.portalGroup = new THREE.Group();
        this.time = 0;

        // Default values if not provided in mapData
        this.position = this.mapData.position || { x: 0, y: 30, z: 200 };
        this.rotation = this.mapData.rotation || 0;
        this.radius = this.mapData.radius || 25; // Should be large enough for a plane
        this.tubeRadius = this.mapData.tubeRadius || 2;
        this.tubularSegments = this.mapData.tubularSegments || 64;
        this.radialSegments = this.mapData.radialSegments || 16;

        // Create the portal
        this.createPortal();

        // Add the portal group to the scene
        this.scene.add(this.portalGroup);
    }

    /**
     * Create the portal
     */
    createPortal() {
        // Create portal geometry (torus)
        const torusGeometry = new THREE.TorusGeometry(
            this.radius,
            this.tubeRadius,
            this.radialSegments,
            this.tubularSegments
        );

        // Create emissive material with green glow
        const torusMaterial = new THREE.MeshStandardMaterial({
            color: 0x00FF44,
            emissive: 0x00FF44,
            emissiveIntensity: 1.0,
            roughness: 0.3,
            metalness: 0.7,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });

        // Create the portal ring
        this.portal = new THREE.Mesh(torusGeometry, torusMaterial);

        // Create swirling galaxy inner disk
        this.createGalaxyDisk();

        // Create particle system for the portal effect
        this.createParticleSystem();

        // Position and rotate the portal
        this.portalGroup.position.set(this.position.x, this.position.y, this.position.z);
        this.portalGroup.rotation.y = this.rotation;

        // Add the portal and disk to the group
        this.portalGroup.add(this.portal);
    }

    /**
     * Create a swirling galaxy-like disk for the portal
     */
    createGalaxyDisk() {
        // Create texture-based approach for better performance than shader
        const diskGeometry = new THREE.CircleGeometry(this.radius * 0.95, 32);

        // Create canvas for procedural galaxy texture
        const size = 512; // Power of 2 for better performance
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Fill background with black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        // Create radial gradient for galaxy center
        const centerX = size / 2;
        const centerY = size / 2;
        const innerRadius = 0;
        const outerRadius = size / 2;

        const gradient = ctx.createRadialGradient(
            centerX, centerY, innerRadius,
            centerX, centerY, outerRadius
        );

        // Add purple/galaxy colors
        gradient.addColorStop(0, 'rgba(120, 0, 170, 0.8)');   // Bright purple center
        gradient.addColorStop(0.3, 'rgba(80, 0, 130, 0.6)');  // Dark purple
        gradient.addColorStop(0.6, 'rgba(30, 0, 60, 0.4)');   // Very dark purple
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');         // Transparent edge

        // Apply gradient
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Add spiral arms - optimized with fewer arms for performance
        const armCount = 2; // Fewer arms for better performance
        const armWidth = 0.7;
        const armTightness = 4;

        ctx.globalCompositeOperation = 'lighten';

        for (let arm = 0; arm < armCount; arm++) {
            const armOffset = (Math.PI * 2 / armCount) * arm;

            for (let r = 5; r < size / 2; r += 3) { // Skip pixels for performance
                // Spiral equation
                const angle = (r / 30) * armTightness + armOffset;
                const x = centerX + Math.cos(angle) * r;
                const y = centerY + Math.sin(angle) * r;

                // Determine opacity based on distance from center
                const opacity = Math.max(0, 1 - (r / (size / 2)));
                const width = r * armWidth / 50;

                // Add purple/magenta/blue stars in the arm
                const hue = Math.random() > 0.7 ? 280 : 260; // Mostly purple, some blue
                const lightness = 50 + Math.random() * 30;

                ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${opacity * 0.7})`;

                // Draw fewer, larger points for better performance
                ctx.beginPath();
                ctx.arc(x, y, width * (0.5 + Math.random()), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Add a few bright stars for detail, but not too many
        for (let i = 0; i < 30; i++) {
            const radius = Math.random() * (size / 2);
            const angle = Math.random() * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            // Random star size - a few larger stars for emphasis
            const starSize = Math.random() > 0.8 ? 2 + Math.random() * 2 : 1 + Math.random();

            // Random bright color - mostly purple/white
            const starHue = Math.random() > 0.7 ? 280 : 260;
            ctx.fillStyle = `hsla(${starHue}, 80%, 90%, 0.9)`;

            ctx.beginPath();
            ctx.arc(x, y, starSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Store texture reference so we can animate it
        this.galaxyTexture = texture;

        // Create material with the galaxy texture
        const diskMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            depthWrite: false // Performance optimization
        });

        // Create two disks for parallax swirl effect
        this.portalDisk1 = new THREE.Mesh(diskGeometry, diskMaterial);
        this.portalDisk2 = new THREE.Mesh(diskGeometry.clone(), diskMaterial.clone());

        // Position disks slightly apart for parallax effect
        this.portalDisk1.position.z = 0.1;
        this.portalDisk2.position.z = -0.1;

        // Add to portal group
        this.portalGroup.add(this.portalDisk1);
        this.portalGroup.add(this.portalDisk2);
    }

    /**
     * Create a particle system for the portal
     */
    createParticleSystem() {
        const particleCount = 300;
        const particleGeometry = new THREE.BufferGeometry();
        const vertices = [];

        // Create particles in a toroidal shape
        for (let i = 0; i < particleCount; i++) {
            // Generate positions around the torus
            const angle1 = Math.random() * Math.PI * 2;
            const angle2 = Math.random() * Math.PI * 2;

            const mainRadius = this.radius;
            const tubeRadius = this.tubeRadius * 1.8; // Slightly larger than the torus

            const x = (mainRadius + tubeRadius * Math.cos(angle2)) * Math.cos(angle1);
            const y = (mainRadius + tubeRadius * Math.cos(angle2)) * Math.sin(angle1);
            const z = tubeRadius * Math.sin(angle2);

            vertices.push(x, y, z);
        }

        particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00FF88,
            size: 0.8,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        // Create particle system
        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.portalGroup.add(this.particles);
    }

    /**
     * Update the portal for animation
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        this.time += deltaTime;

        // Animate the portal rotation slowly
        this.portal.rotation.z = this.time * 0.1;

        // Animate the galaxy disks with different speeds for parallax swirl effect
        if (this.portalDisk1 && this.portalDisk2) {
            this.portalDisk1.rotation.z = -this.time * 0.15;
            this.portalDisk2.rotation.z = -this.time * 0.25;
        }

        // Animate the particles
        if (this.particles.geometry.attributes.position) {
            const positions = this.particles.geometry.attributes.position.array;

            for (let i = 0; i < positions.length; i += 3) {
                // Get current position
                const x = positions[i];
                const y = positions[i + 1];
                const z = positions[i + 2];

                // Calculate distance from center
                const distance = Math.sqrt(x * x + y * y + z * z);

                // Normalize to get direction
                const nx = x / distance;
                const ny = y / distance;
                const nz = z / distance;

                // Add slight pulsing movement
                const pulse = Math.sin(this.time * 3 + i * 0.01) * 0.2;

                // Update position with pulsing
                positions[i] = x + nx * pulse;
                positions[i + 1] = y + ny * pulse;
                positions[i + 2] = z + nz * pulse;
            }

            this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }
}
