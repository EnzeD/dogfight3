// WW2 Dogfight Arena - Game Implementation
console.log('Game script loaded successfully!');

// Initialize global variables
let scene, camera, renderer;
let controls; // For camera controls
let sky, runway, plane;
let ground; // Ground plane
let clouds = []; // Array to store cloud objects

// Sound-related variables
let audioContext;
let engineSound;
let engineGainNode;
let isSoundInitialized = false;

// Flight mechanics variables
let speed = 0;
let maxSpeed = 0.5; // A reasonable max speed
let minTakeoffSpeed = 0.1; // 60% of max speed needed for takeoff
let acceleration = 0.001; // Simple, consistent acceleration
let deceleration = 0.002; // Reduced from 0.005 for slower deceleration
let isAirborne = false;
let keysPressed = {};
let propellerRotation = 0;

// Auto-stabilization flag - enabled by default
let autoStabilizationEnabled = true;

// Frame rate calculation variables
let frameCount = 0;
let fps = 0;
let lastTime = performance.now();
let deltaTime = 0;
let lastFrameTime = 0;

// Camera follow variables
let isUserControllingCamera = false;
let lastUserInteractionTime = 0;
let cameraFollowDelay = 1000; // 1 second delay before camera follows again
let followDistance = 25; // Increased from 15 for a wider view

// Flight control sensitivity
const rollSpeed = 0.02;
const pitchSpeed = 0.015;
const yawSpeed = 0.015;

// Set up the 3D environment
function init() {
    // Create the scene
    scene = new THREE.Scene();

    // Set scene background color
    scene.background = new THREE.Color(0x87CEEB);

    // Create the camera (perspective)
    const fieldOfView = 75;
    const aspectRatio = window.innerWidth / window.innerHeight;
    const nearClippingPlane = 0.1;
    const farClippingPlane = 2000; // Increased from 1000 to match larger environment
    camera = new THREE.PerspectiveCamera(
        fieldOfView,
        aspectRatio,
        nearClippingPlane,
        farClippingPlane
    );

    // Create the renderer using the separated function
    createRenderer();

    // Create sky background
    createSky();

    // Create the ground
    createGround();

    // Create the runway
    createRunway();

    // Create clouds
    createClouds();

    // Create the plane
    createPlane();

    // Position the camera and set up controls
    setupCamera();

    // Handle window resizing
    window.addEventListener('resize', onWindowResize);

    // Add instructions
    addInstructions();

    // Setup keyboard controls
    setupControls();

    // Track mouse state for camera control
    setupMouseTracking();

    // Initialize sound system
    initSound();

    // Add a sound toggle button
    addSoundToggle();

    // Initialize lastFrameTime for delta time calculations
    lastFrameTime = performance.now();
}

// Create the sky background
function createSky() {
    // Create a larger box geometry
    const skyGeometry = new THREE.BoxGeometry(2000, 2000, 2000);

    // Create a gradient sky using a CustomShaderMaterial
    // Create vertex and fragment shaders for gradient sky
    const vertexShader = `
        varying vec3 vWorldPosition;
        
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        
        varying vec3 vWorldPosition;
        
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
    `;

    // Create shader material with our custom shaders
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x0077ff) },  // Deep blue
            bottomColor: { value: new THREE.Color(0x8fbcd4) }, // Light blue
            offset: { value: 500 },
            exponent: { value: 0.6 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false
    });

    // Create the sky mesh and add it to the scene
    sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);

    // Also set the scene background color as fallback
    scene.background = new THREE.Color(0x87CEEB);
}

// Create a green ground plane
function createGround() {
    // Create a larger plane geometry for the ground with more segments for terrain variation
    const groundSize = 2000;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 128, 128);

    // Create a better looking material for the ground
    const groundMaterial = new THREE.MeshBasicMaterial({
        color: 0x3D9E56, // Richer green color
        side: THREE.DoubleSide,
    });

    // Create the ground mesh
    ground = new THREE.Mesh(groundGeometry, groundMaterial);

    // Add some terrain variation (subtle hills and valleys)
    const positions = ground.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        // Skip the center area near the runway (keep it flat)
        const x = positions[i];
        const z = positions[i + 2];
        const distanceFromCenter = Math.sqrt(x * x + z * z);

        if (distanceFromCenter > 100) {
            // Apply more displacement the further from center
            const displacementFactor = Math.min(1.0, (distanceFromCenter - 100) / 500);

            // Create terrain using multiple frequencies of noise
            const noise =
                Math.sin(x * 0.02 + z * 0.03) * 2 +
                Math.sin(x * 0.04 - z * 0.01) * 1 +
                Math.sin(x * 0.01 + z * 0.05) * 0.5;

            positions[i + 1] = noise * 8 * displacementFactor;
        }
    }

    // Update normals after changing vertices
    ground.geometry.computeVertexNormals();

    // Rotate the ground to lie flat (rotate around X axis by 90 degrees)
    ground.rotation.x = Math.PI / 2;

    // Position the ground at y=0
    ground.position.y = -0.15; // Slightly below zero to avoid z-fighting with runway

    // Add the ground to the scene
    scene.add(ground);
}

// Create clouds (white translucent cubes)
function createClouds() {
    // Define the cloud parameters
    const cloudCount = 40; // Increased from 20
    const cloudMinSize = 15; // Increased from 10
    const cloudMaxSize = 40; // Increased from 30
    const cloudMinHeight = 40; // Increased from 30
    const cloudMaxHeight = 200; // Increased from 150
    const cloudAreaSize = 1000; // Doubled from 500

    // Create clouds
    for (let i = 0; i < cloudCount; i++) {
        // Random cloud size
        const cloudSize = cloudMinSize + Math.random() * (cloudMaxSize - cloudMinSize);

        // Create a cube geometry for the cloud
        const cloudGeometry = new THREE.BoxGeometry(cloudSize, cloudSize / 2, cloudSize);

        // Create a translucent white material for the cloud
        const cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF, // White color
            transparent: true,
            opacity: 0.5 + Math.random() * 0.3 // Random opacity between 0.5 and 0.8
        });

        // Create the cloud mesh
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);

        // Position the cloud at a random location
        cloud.position.x = (Math.random() - 0.5) * cloudAreaSize;
        cloud.position.y = cloudMinHeight + Math.random() * (cloudMaxHeight - cloudMinHeight);
        cloud.position.z = (Math.random() - 0.5) * cloudAreaSize;

        // Add a small random rotation to make clouds look more natural
        cloud.rotation.x = Math.random() * 0.2;
        cloud.rotation.y = Math.random() * Math.PI;
        cloud.rotation.z = Math.random() * 0.2;

        // Add the cloud to the scene and to our clouds array
        scene.add(cloud);
        clouds.push(cloud);
    }
}

// Create the runway
function createRunway() {
    // Define larger runway dimensions
    const runwayWidth = 30; // Increased from 20
    const runwayLength = 150; // Increased from 100

    // Create a plane geometry for the runway
    const runwayGeometry = new THREE.PlaneGeometry(runwayWidth, runwayLength);

    // Create a basic material with a dark grey color
    const runwayMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333, // Dark grey color
        side: THREE.DoubleSide // Visible from both sides
    });

    // Create the runway mesh
    runway = new THREE.Mesh(runwayGeometry, runwayMaterial);

    // Rotate the plane to lie flat on the ground (rotate around X axis by 90 degrees)
    runway.rotation.x = Math.PI / 2;

    // Position the runway at the center of the scene, on the ground
    runway.position.y = -0.01; // Slightly below zero to avoid z-fighting with other elements

    // Add the runway to the scene
    scene.add(runway);
}

// Create the plane - scale up by 50%
function createPlane() {
    // Create a group to hold all plane parts
    plane = new THREE.Group();

    // FUSELAGE (main body) - increased size by 50%
    const fuselageLength = 7.5; // Increased from 5
    const fuselageWidth = 1.5; // Increased from 1
    const fuselageHeight = 1.8; // Increased from 1.2
    const fuselageGeometry = new THREE.BoxGeometry(fuselageWidth, fuselageHeight, fuselageLength);
    const fuselageMaterial = new THREE.MeshBasicMaterial({
        color: 0x5A5A5A // Medium grey for the fuselage
    });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);

    // Center of the fuselage is at the origin of the group
    fuselage.position.set(0, 0, 0);
    plane.add(fuselage);

    // WINGS
    const wingSpan = 7;
    const wingChord = 2;
    const wingThickness = 0.2;
    const wingGeometry = new THREE.BoxGeometry(wingSpan, wingThickness, wingChord);
    const wingMaterial = new THREE.MeshBasicMaterial({
        color: 0x777777 // Slightly lighter grey for the wings
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);

    // Position wings on top of the fuselage, slightly towards the front
    wings.position.set(0, fuselageHeight / 2, -0.2);
    plane.add(wings);

    // COCKPIT (transparent)
    const cockpitLength = 1.5;
    const cockpitWidth = 0.8;
    const cockpitHeight = 0.6;
    const cockpitGeometry = new THREE.BoxGeometry(cockpitWidth, cockpitHeight, cockpitLength);
    const cockpitMaterial = new THREE.MeshBasicMaterial({
        color: 0x88CCFF, // Light blue
        transparent: true,
        opacity: 0.6
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);

    // Position cockpit on top of the fuselage, towards the front
    cockpit.position.set(0, fuselageHeight / 2 + cockpitHeight / 2, -1);
    plane.add(cockpit);

    // TAIL (vertical stabilizer)
    const tailFinHeight = 1.2;
    const tailFinLength = 1;
    const tailFinThickness = 0.15;
    const tailFinGeometry = new THREE.BoxGeometry(tailFinThickness, tailFinHeight, tailFinLength);
    const tailMaterial = new THREE.MeshBasicMaterial({
        color: 0x777777 // Same as wings
    });
    const tailFin = new THREE.Mesh(tailFinGeometry, tailMaterial);

    // Position tail fin at the back of the fuselage
    tailFin.position.set(0, fuselageHeight / 2 + tailFinHeight / 2, fuselageLength / 2 - tailFinLength / 2);
    plane.add(tailFin);

    // TAIL (horizontal stabilizer)
    const tailWingSpan = 2.5;
    const tailWingLength = 1;
    const tailWingThickness = 0.15;
    const tailWingGeometry = new THREE.BoxGeometry(tailWingSpan, tailWingThickness, tailWingLength);
    const tailWing = new THREE.Mesh(tailWingGeometry, tailMaterial);

    // Position horizontal tail at the back of the fuselage
    tailWing.position.set(0, fuselageHeight / 4, fuselageLength / 2 - tailWingLength / 2);
    plane.add(tailWing);

    // PROPELLER
    const propellerWidth = 1.8;
    const propellerHeight = 0.1;
    const propellerDepth = 0.05;
    const propellerGeometry = new THREE.BoxGeometry(propellerWidth, propellerHeight, propellerDepth);
    const propellerMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333 // Dark grey
    });
    const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);

    // Position the propeller at the front of the fuselage
    propeller.position.set(0, 0, -fuselageLength / 2 - propellerDepth / 2);
    plane.add(propeller);

    // LANDING GEAR / WHEELS
    // Main wheels (2)
    const wheelRadius = 0.3;
    const wheelThickness = 0.2;
    const wheelSegments = 12;
    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, wheelSegments);
    const wheelMaterial = new THREE.MeshBasicMaterial({
        color: 0x222222 // Very dark grey, almost black
    });

    // Left wheel
    const leftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    leftWheel.rotation.z = Math.PI / 2; // Rotate to stand up like a wheel
    leftWheel.position.set(-fuselageWidth - 0.2, -fuselageHeight / 2 - wheelRadius + 0.3, 0);
    plane.add(leftWheel);

    // Right wheel
    const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    rightWheel.rotation.z = Math.PI / 2; // Rotate to stand up like a wheel
    rightWheel.position.set(fuselageWidth + 0.2, -fuselageHeight / 2 - wheelRadius + 0.3, 0);
    plane.add(rightWheel);

    // Rear wheel (smaller)
    const rearWheelRadius = 0.2;
    const rearWheelGeometry = new THREE.CylinderGeometry(rearWheelRadius, rearWheelRadius, wheelThickness, wheelSegments);
    const rearWheel = new THREE.Mesh(rearWheelGeometry, wheelMaterial);
    rearWheel.rotation.z = Math.PI / 2; // Rotate to stand up like a wheel
    rearWheel.position.set(0, -fuselageHeight / 2 - rearWheelRadius + 0.2, fuselageLength / 2 - rearWheelRadius);
    plane.add(rearWheel);

    // Position the entire plane on the runway - adjust position for larger plane
    plane.position.set(0, fuselageHeight / 2 + 0.45, 60); // Moved further along runway (from 40 to 60)

    // Orient the plane to face along the runway (Z-axis)
    plane.rotation.y = 0; // Remove the 180 degree rotation so it faces the other way

    // Add the plane group to the scene
    scene.add(plane);
}

// Position the camera and set up OrbitControls
function setupCamera() {
    // Position the camera behind and slightly above the plane for a better view
    camera.position.set(0, 5, plane.position.z + 25);

    // Create OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Set the target to the plane's position
    controls.target.copy(plane.position);

    // Set some reasonable limits for the controls
    controls.minDistance = 5;  // Minimum zoom distance
    controls.maxDistance = 100; // Maximum zoom distance

    // Enable damping for smoother camera movement
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Add event listeners to detect user camera control
    controls.addEventListener('start', function () {
        isUserControllingCamera = true;
        lastUserInteractionTime = performance.now();
    });

    controls.addEventListener('end', function () {
        // Don't immediately set to false - we'll use a timer to determine when to resume following
        lastUserInteractionTime = performance.now();

        // Update follow distance from current camera position
        const distanceToTarget = camera.position.distanceTo(controls.target);
        followDistance = Math.max(8, Math.min(50, distanceToTarget));
    });

    // Handle mouse wheel to directly adjust follow distance without changing camera control state
    // Add { passive: false } option to tell the browser we'll be calling preventDefault()
    window.addEventListener('wheel', function (event) {
        // Get wheel direction (positive for zoom out, negative for zoom in)
        const delta = Math.sign(event.deltaY);

        // Adjust follow distance by the delta (2 units per wheel step)
        followDistance += delta * 2;

        // Clamp follow distance to reasonable values
        followDistance = Math.max(8, Math.min(50, followDistance));

        // Prevent default behavior to avoid browser zooming
        event.preventDefault();

        // No need to update isUserControllingCamera or lastUserInteractionTime
        // This allows the camera to remain in auto-follow mode while adjusting distance
    }, { passive: false }); // Add this option to fix the passive listener issue

    // Update the controls
    controls.update();
}

// Set up keyboard input
function setupControls() {
    // Track key presses
    window.addEventListener('keydown', function (event) {
        keysPressed[event.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', function (event) {
        keysPressed[event.key.toLowerCase()] = false;
    });
}

// Update flight information display
function updateFlightInfo() {
    // Remove existing flight info if it exists
    const existingInfo = document.getElementById('flight-info');
    if (existingInfo) {
        existingInfo.remove();
    }

    // Create new flight info display
    const flightInfo = document.createElement('div');
    flightInfo.id = 'flight-info';
    flightInfo.style.position = 'absolute';
    flightInfo.style.bottom = '10px';
    flightInfo.style.right = '10px';
    flightInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';  // More opacity for better readability
    flightInfo.style.color = 'white';
    flightInfo.style.padding = '15px';  // Increased padding
    flightInfo.style.fontFamily = 'Arial, sans-serif';
    flightInfo.style.fontSize = '14px';
    flightInfo.style.borderRadius = '8px';  // Rounded corners
    flightInfo.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';  // Subtle shadow
    flightInfo.style.backdropFilter = 'blur(5px)';  // Blur effect (works in modern browsers)
    flightInfo.style.border = '1px solid rgba(255,255,255,0.1)';  // Subtle border

    // Format speed as percentage of max
    const speedPercent = Math.round((speed / maxSpeed) * 100);
    const takeoffPercent = Math.round((minTakeoffSpeed / maxSpeed) * 100);

    // Calculate altitude in meters (roughly)
    const altitude = Math.max(0, Math.floor((plane.position.y - 0.8) * 10));

    // Add visual indicators for speed
    const speedBar = createProgressBar(speedPercent, takeoffPercent);

    // Add status message with color-coding
    let statusMessage = '';
    let statusColor = '';

    if (!isAirborne && speed < minTakeoffSpeed) {
        statusMessage = 'On Ground (Need more speed for takeoff)';
        statusColor = '#FFA500'; // Orange
    } else if (!isAirborne && speed >= minTakeoffSpeed) {
        statusMessage = 'Ready for Takeoff!';
        statusColor = '#00FF00'; // Green
    } else if (isAirborne) {
        statusMessage = 'Airborne';
        statusColor = '#00BFFF'; // Sky blue
    }

    flightInfo.innerHTML = `
        <strong style="font-size:16px;">Flight Status</strong><br>
        <div style="margin-top:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span>Speed:</span> 
                <span>${speedPercent}%</span>
            </div>
            ${speedBar}
        </div>
        <div style="margin-top:8px;">
            <span>Altitude:</span> <span>${altitude} m</span>
        </div>
        <div style="margin-top:8px;">
            <span>Status:</span> <span style="color:${statusColor};font-weight:bold;">${statusMessage}</span>
        </div>
        <div style="margin-top:8px;font-size:12px;opacity:0.8;">
            FPS: ${fps}
        </div>
    `;

    document.body.appendChild(flightInfo);
}

// Helper function to create a visual progress bar
function createProgressBar(currentValue, thresholdValue) {
    const barWidth = 150;
    const barHeight = 10;

    return `
        <div style="width:${barWidth}px;height:${barHeight}px;background-color:rgba(255,255,255,0.2);border-radius:5px;overflow:hidden;position:relative;">
            <div style="width:${currentValue}%;height:100%;background-color:${currentValue < thresholdValue ? '#FFA500' : '#00FF00'};"></div>
            <div style="position:absolute;top:0;left:${thresholdValue}%;width:2px;height:100%;background-color:white;"></div>
        </div>
    `;
}

// Animation loop - simplified to avoid duplicate calculations
function animate() {
    // Request the next animation frame
    requestAnimationFrame(animate);

    // Calculate current time and delta time
    const currentTime = performance.now();
    deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 0.1); // Cap at 0.1 to prevent huge jumps
    lastFrameTime = currentTime;

    // Update FPS counter
    frameCount++;
    if (currentTime - lastTime >= 1000) {
        fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
    }

    // Update plane movement
    updatePlaneMovement();

    // Animate clouds
    animateClouds();

    // Update camera to follow plane if needed
    updateCameraFollow();

    // Update sound effects
    updateSound();

    // Render the scene
    renderer.render(scene, camera);
}

// Show a notification message to the user
function showNotification(message, type = 'info') {
    // Remove existing notification if present
    const existingNotification = document.getElementById('game-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'game-notification';
    notification.style.position = 'absolute';
    notification.style.top = '20%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.padding = '15px 25px';
    notification.style.borderRadius = '10px';
    notification.style.fontSize = '24px';
    notification.style.fontWeight = 'bold';
    notification.style.color = 'white';
    notification.style.textAlign = 'center';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    notification.style.pointerEvents = 'none'; // Don't interfere with clicking
    notification.style.textShadow = '0 0 5px rgba(0,0,0,0.5)';

    // Set style based on notification type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = 'rgba(40, 167, 69, 0.8)';
            break;
        case 'warning':
            notification.style.backgroundColor = 'rgba(255, 193, 7, 0.8)';
            break;
        case 'error':
            notification.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
            break;
        default: // info
            notification.style.backgroundColor = 'rgba(0, 123, 255, 0.8)';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Fade in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);

    // Auto-remove after a few seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 500);
    }, 3000);
}

// Update plane movement based on controls
function updatePlaneMovement() {
    // --- Handle throttle controls with simplified logic ---
    if ((keysPressed['w'] || keysPressed['z'])) {
        // Increase speed when W or Z is pressed
        speed += acceleration * deltaTime * 60;
        if (speed > maxSpeed) speed = maxSpeed;
    } else if (keysPressed['s']) {
        // Decrease speed when S is pressed
        speed -= deceleration * deltaTime * 60;
        if (speed < 0) speed = 0;
    }

    // Rotate propeller based on speed
    const propeller = plane.children.find(child =>
        child.position.z < -2 && child.geometry && child.geometry.parameters && child.geometry.parameters.width > 1.5);

    if (propeller) {
        propellerRotation += speed * 5; // Faster rotation for visual feedback
        propeller.rotation.z = propellerRotation;
    }

    // Check if plane has reached takeoff speed
    if (speed >= minTakeoffSpeed && !isAirborne) {
        isAirborne = true;
        console.log("Taking off!");
        showNotification("Taking Off! 🛫", "success");
    }

    // Handle flight controls
    const rotationAmount = deltaTime * 60; // Base rotation amount for frame-rate independence

    if (isAirborne) {
        // --- AIRBORNE CONTROLS - SIMPLIFIED ---

        // Create a rotation quaternion for local rotations
        const pitchQuaternion = new THREE.Quaternion();
        const yawQuaternion = new THREE.Quaternion();
        const rollQuaternion = new THREE.Quaternion();

        // Roll control (left/right tilt) - Simple direct input
        if (keysPressed['a'] || keysPressed['q']) {
            // Roll axis is always the plane's local Z axis
            rollQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollSpeed * rotationAmount);
            plane.quaternion.multiply(rollQuaternion);
        }
        if (keysPressed['d']) {
            // Roll in the opposite direction
            rollQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -rollSpeed * rotationAmount);
            plane.quaternion.multiply(rollQuaternion);
        }

        // Pitch control (up/down) - Related to the plane's local X axis
        if (keysPressed['arrowup']) {
            // Pitch down around the plane's local X axis
            pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitchSpeed * rotationAmount);
            plane.quaternion.multiply(pitchQuaternion);
        }
        if (keysPressed['arrowdown']) {
            // Pitch up around the plane's local X axis
            pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchSpeed * rotationAmount);
            plane.quaternion.multiply(pitchQuaternion);
        }

        // Yaw control (left/right turn) - Related to the plane's local Y axis
        if (keysPressed['arrowleft']) {
            // Yaw left around the plane's local Y axis
            yawQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawSpeed * rotationAmount);
            plane.quaternion.multiply(yawQuaternion);
        }
        if (keysPressed['arrowright']) {
            // Yaw right around the plane's local Y axis
            yawQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yawSpeed * rotationAmount);
            plane.quaternion.multiply(yawQuaternion);
        }
    } else {
        // --- GROUND CONTROLS ---

        // Only allow turning on the ground
        if (keysPressed['arrowleft']) {
            plane.rotation.y += yawSpeed * 0.5 * rotationAmount;
        }
        if (keysPressed['arrowright']) {
            plane.rotation.y -= yawSpeed * 0.5 * rotationAmount;
        }

        // Reset orientation when on ground
        if (plane.rotation.x !== 0 || plane.rotation.z !== 0) {
            // Reset to level flight orientation
            plane.rotation.x = 0;
            plane.rotation.z = 0;
        }
    }

    // --- MOVEMENT ---

    // Calculate forward vector based on plane's rotation
    const forwardVector = new THREE.Vector3(0, 0, -1);
    forwardVector.applyQuaternion(plane.quaternion);

    // Scale by speed - use deltaTime for frame-rate independence
    forwardVector.multiplyScalar(speed);

    // Move plane in the forward direction
    plane.position.add(forwardVector);

    // --- SIMPLIFIED FLIGHT PHYSICS ---

    if (isAirborne) {
        // Simple lift calculation based on speed
        const liftFactor = 0.01;
        const lift = speed * liftFactor;

        // Apply lift to plane's position
        plane.position.y += lift * deltaTime * 60;

        // Handle landing
        if (plane.position.y < 0.8) {
            plane.position.y = 0.8;

            // Land if speed is below takeoff speed
            if (speed < minTakeoffSpeed * 0.8) { // 80% of takeoff speed to prevent bouncing
                if (isAirborne) {
                    showNotification("Landed Successfully! 🛬", "success");
                }
                isAirborne = false;
                console.log("Landing!");

                // Reset to level flight orientation
                const resetRotation = new THREE.Euler(0, plane.rotation.y, 0);
                plane.quaternion.setFromEuler(resetRotation);
            }
        }
    } else {
        // Keep plane on the ground
        plane.position.y = 0.8;
    }

    // Update flight information display
    updateFlightInfo();
}

// Make camera follow the plane with smoother transitions
function updateCameraFollow() {
    // Get the plane's direction vector (forward direction)
    const planeDirection = new THREE.Vector3(0, 0, -1);
    planeDirection.applyQuaternion(plane.quaternion);

    // Create a camera position that's behind the plane
    // Calculate offset based on plane direction and follow distance
    const cameraOffset = planeDirection.clone().multiplyScalar(-followDistance);

    // Add height offset that increases with speed for a more dynamic feel
    const heightOffset = 3 + (speed / maxSpeed) * 2;
    cameraOffset.y += heightOffset;

    // Calculate the desired camera position by adding offset to plane position
    const desiredCameraPos = plane.position.clone().add(cameraOffset);

    // ALWAYS update the controls target to the plane's current position
    // This ensures the camera always pivots around the plane, regardless of speed
    controls.target.copy(plane.position);

    if (isUserControllingCamera) {
        // When user is controlling camera, don't update the camera position
        // This allows free orbit around the plane
    } else {
        // Immediate target transition when auto-following
        // Immediately snap camera position to behind the plane
        camera.position.copy(desiredCameraPos);
    }

    // Adjust the follow distance based on plane speed
    const targetFollowDistance = 15 + (speed / maxSpeed) * 10;
    followDistance += (targetFollowDistance - followDistance) * 0.05;

    // Always update controls
    controls.update();
}

// Add instructions to the page
function addInstructions() {
    const instructions = document.createElement('div');
    instructions.id = 'instructions-panel';
    instructions.style.position = 'absolute';
    instructions.style.top = '10px';
    instructions.style.left = '10px';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // More opacity for better readability
    instructions.style.color = 'white';
    instructions.style.padding = '15px'; // Increased padding
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.fontSize = '14px';
    instructions.style.borderRadius = '8px'; // Rounded corners
    instructions.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)'; // Subtle shadow
    instructions.style.backdropFilter = 'blur(5px)'; // Blur effect (works in modern browsers)
    instructions.style.border = '1px solid rgba(255,255,255,0.1)'; // Subtle border
    instructions.style.maxWidth = '300px';
    instructions.style.transition = 'opacity 0.3s ease';

    // Allow hiding the instructions panel by clicking
    instructions.addEventListener('click', function () {
        this.style.opacity = '0';
        setTimeout(() => {
            this.style.display = 'none';
        }, 300);
    });

    instructions.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <strong style="font-size:16px;">WW2 Dogfight Arena Controls</strong>
            <div style="font-size:12px;opacity:0.7;cursor:pointer;">[Click to hide]</div>
        </div>
        
        <div style="margin-top:12px;">
            <strong style="color:#00BFFF;">Throttle Controls:</strong>
            <div style="margin:5px 0 10px 10px;">
                <div>W/Z: Increase throttle</div>
                <div>S: Decrease throttle</div>
            </div>
            
            <strong style="color:#00BFFF;">Flight Controls:</strong>
            <div style="margin:5px 0 10px 10px;">
                <div>A/Q: Roll left (tilt wings)</div>
                <div>D: Roll right (tilt wings)</div>
                <div>Up Arrow: Pitch down (nose down)</div>
                <div>Down Arrow: Pitch up (nose up)</div>
                <div>Left Arrow: Yaw left (turn left)</div>
                <div>Right Arrow: Yaw right (turn right)</div>
            </div>
            
            <strong style="color:#00BFFF;">Camera Controls:</strong>
            <div style="margin:5px 0 0 10px;">
                <div>Left Click + Drag: Rotate camera</div>
                <div>Right Click + Drag: Pan camera</div>
                <div>Scroll: Zoom in/out</div>
                <div style="color:#FFD700">Camera returns behind plane when released</div>
            </div>
        </div>
    `;

    document.body.appendChild(instructions);

    // Add a button to show instructions again if hidden
    const showInstructionsBtn = document.createElement('div');
    showInstructionsBtn.id = 'show-instructions-btn';
    showInstructionsBtn.style.position = 'absolute';
    showInstructionsBtn.style.top = '10px';
    showInstructionsBtn.style.left = '10px';
    showInstructionsBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    showInstructionsBtn.style.color = 'white';
    showInstructionsBtn.style.padding = '8px 12px';
    showInstructionsBtn.style.fontFamily = 'Arial, sans-serif';
    showInstructionsBtn.style.fontSize = '12px';
    showInstructionsBtn.style.borderRadius = '5px';
    showInstructionsBtn.style.cursor = 'pointer';
    showInstructionsBtn.style.display = 'none';
    showInstructionsBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    showInstructionsBtn.textContent = 'Show Controls';

    showInstructionsBtn.addEventListener('click', function () {
        const instructionsPanel = document.getElementById('instructions-panel');
        instructionsPanel.style.display = 'block';
        setTimeout(() => {
            instructionsPanel.style.opacity = '1';
        }, 10);
        this.style.display = 'none';
    });

    document.body.appendChild(showInstructionsBtn);

    // Update the click handler to show the button when instructions are hidden
    instructions.addEventListener('click', function () {
        this.style.opacity = '0';
        setTimeout(() => {
            this.style.display = 'none';
            showInstructionsBtn.style.display = 'block';
        }, 300);
    });
}

// Handle window resizing
function onWindowResize() {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Update controls
    controls.update();
}

// Animate clouds with subtle movement
function animateClouds() {
    // Use a single time calculation for all clouds
    const time = performance.now() * 0.0001;

    // Move clouds very slightly to create a gentle floating effect
    for (let i = 0; i < clouds.length; i++) {
        const cloud = clouds[i];
        // Use pre-calculated frequency based on cloud index for variation
        const frequency = 0.1 + (i % 5) * 0.02;

        // Apply subtle vertical movement
        cloud.position.y += Math.sin(time * frequency) * 0.01 * deltaTime * 60;

        // Apply very slight rotation (less frequently than position changes)
        cloud.rotation.z += 0.0001 * deltaTime * 60;
    }
}

// Create the renderer
function createRenderer() {
    // Create WebGL renderer with improved settings
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });

    // Set pixel ratio with a cap to prevent performance issues on high-DPI displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Set renderer size to match window
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Enable shadow mapping for better visuals if needed later
    renderer.shadowMap.enabled = false;

    // Add to DOM
    document.body.appendChild(renderer.domElement);
}

// Add mouse tracking for better camera control
function setupMouseTracking() {
    // Track mouse button state
    window.addEventListener('mousedown', function () {
        isUserControllingCamera = true;

        // Display a small indication that camera control is manual
        showCameraControlIndicator(true);
    });

    window.addEventListener('mouseup', function () {
        // IMMEDIATELY set to false when mouse is released - no delay
        isUserControllingCamera = false;

        // Show notification that auto-follow is active again
        showCameraControlIndicator(false);
    });

    // Track mouse movement while buttons are pressed
    window.addEventListener('mousemove', function (event) {
        // Only count as interaction if a mouse button is pressed
        if (event.buttons > 0) {
            isUserControllingCamera = true;
        }
    });

    // More responsive touch controls for mobile devices
    window.addEventListener('touchstart', function () {
        isUserControllingCamera = true;
        showCameraControlIndicator(true);
    });

    window.addEventListener('touchend', function () {
        // IMMEDIATELY set to false when touch ends - no delay
        isUserControllingCamera = false;
        showCameraControlIndicator(false);
    });
}

// Show a small indicator for camera control status
function showCameraControlIndicator(isManual) {
    // Remove existing indicator if present
    const existingIndicator = document.getElementById('camera-control-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Create a small indicator element
    const indicator = document.createElement('div');
    indicator.id = 'camera-control-indicator';
    indicator.style.position = 'absolute';
    indicator.style.bottom = '5px';
    indicator.style.left = '5px';
    indicator.style.padding = '5px 8px';
    indicator.style.fontSize = '12px';
    indicator.style.color = 'white';
    indicator.style.backgroundColor = isManual ? 'rgba(255,165,0,0.7)' : 'rgba(0,128,0,0.7)';
    indicator.style.borderRadius = '3px';
    indicator.style.transition = 'opacity 0.5s';
    indicator.style.opacity = '0';

    // Show appropriate message
    indicator.textContent = isManual ? 'Manual Camera Control' : 'Auto-Follow Active';

    // Add to document
    document.body.appendChild(indicator);

    // Fade in
    setTimeout(() => {
        indicator.style.opacity = '1';
    }, 10);

    // Auto-remove after a few seconds
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.style.opacity = '0';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.remove();
                }
            }, 500);
        }
    }, 2000);
}

// Initialize the scene and start the animation loop
init();
animate();

// Initialize sound system
function initSound() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create a gain node for volume control
        engineGainNode = audioContext.createGain();
        engineGainNode.gain.value = 0; // Start with zero volume
        engineGainNode.connect(audioContext.destination);

        // Create an oscillator for the engine sound
        engineSound = audioContext.createOscillator();
        engineSound.type = 'sawtooth'; // Harsh sound like an engine
        engineSound.frequency.value = 60; // Starting frequency
        engineSound.connect(engineGainNode);
        engineSound.start();

        isSoundInitialized = true;
        console.log("Sound system initialized");
    } catch (error) {
        console.warn("WebAudio not supported or error initializing:", error);
        isSoundInitialized = false;
    }
}

// Update engine sound based on speed
function updateSound() {
    if (!isSoundInitialized) return;

    // Map speed to frequency (engine pitch)
    const minFreq = 50;
    const maxFreq = 120;
    const frequency = minFreq + (speed / maxSpeed) * (maxFreq - minFreq);

    // Map speed to volume
    const minVolume = 0;
    const maxVolume = 0.2; // Keep volume reasonable
    const volume = minVolume + (speed / maxSpeed) * (maxVolume - minVolume);

    // Apply smooth changes
    engineSound.frequency.setTargetAtTime(frequency, audioContext.currentTime, 0.1);
    engineGainNode.gain.setTargetAtTime(volume, audioContext.currentTime, 0.1);
}

// Add a sound toggle button
function addSoundToggle() {
    const soundToggle = document.createElement('div');
    soundToggle.id = 'sound-toggle';
    soundToggle.style.position = 'absolute';
    soundToggle.style.top = '10px';
    soundToggle.style.right = '10px';
    soundToggle.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    soundToggle.style.color = 'white';
    soundToggle.style.padding = '8px 12px';
    soundToggle.style.fontFamily = 'Arial, sans-serif';
    soundToggle.style.fontSize = '12px';
    soundToggle.style.borderRadius = '5px';
    soundToggle.style.cursor = 'pointer';
    soundToggle.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    soundToggle.innerHTML = '🔊 Sound On';

    let isMuted = false;

    soundToggle.addEventListener('click', function () {
        if (!isSoundInitialized) {
            // Try to initialize sound if not already done
            initSound();
            if (!isSoundInitialized) {
                this.innerHTML = '❌ Sound Not Supported';
                return;
            }
        }

        isMuted = !isMuted;

        if (isMuted) {
            // Mute sound
            if (engineGainNode) engineGainNode.gain.value = 0;
            this.innerHTML = '🔇 Sound Off';
        } else {
            // Unmute sound
            // Volume will be set in updateSound()
            this.innerHTML = '🔊 Sound On';
        }
    });

    document.body.appendChild(soundToggle);
} 