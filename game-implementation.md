# implementation.md

This document provides a step-by-step guide for a developer to implement *WW2 Dogfight Arena*, a minimalist WW2-inspired flight game, using JavaScript and Three.js, as specified in the Game Design Document (GDD). Follow these steps to build the game.

## Prerequisites
- Ensure you have basic knowledge of HTML, CSS, and JavaScript.
- Install Node.js (optional, for local development).
- Use a text editor (e.g., VS Code).
- Test the game in a modern web browser (e.g., Chrome, Firefox).

## Step 1: Set Up the Project Structure ✅
1. **Create Project Directory** ✅
   - Make a new folder called `ww2-dogfight-arena`.
   - Inside it, create three files: `index.html`, `style.css`, and `game.js`.
   
   **Implementation details:**
   - Created the project directory structure with the three required files.

2. **Configure the HTML File** ✅
   - In `index.html`, set up a basic HTML5 structure.
   - Link to the Three.js library via a CDN (e.g., `https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js`).
   - Include `style.css` and `game.js` with appropriate tags.
   - Leave the `<body>` empty—Three.js will append the canvas dynamically.
   
   **Implementation details:**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>WW2 Dogfight Arena</title>
       <!-- Three.js library from CDN -->
       <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
       <!-- Custom CSS -->
       <link rel="stylesheet" href="style.css">
   </head>
   <body>
       <!-- Three.js will append the canvas here dynamically -->
       
       <!-- Custom game script -->
       <script src="game.js"></script>
   </body>
   </html>
   ```

3. **Style the Page** ✅
   - In `style.css`, remove default margins and hide overflow on the body.
   - Ensure the canvas (added later by Three.js) displays as a block element and fills the screen.
   
   **Implementation details:**
   ```css
   /* Reset default margin and hide overflow */
   body {
       margin: 0;
       padding: 0;
       overflow: hidden;
       width: 100%;
       height: 100vh;
   }

   /* Ensure the canvas fills the screen */
   canvas {
       display: block;
       width: 100%;
       height: 100%;
   }
   ```

4. **Test the Setup** ✅
   - Open `index.html` in a browser to confirm it loads without errors (a blank page is expected).
   
   **Implementation details:**
   - Added a console log in `game.js` to verify script loading:
   ```javascript
   // WW2 Dogfight Arena - Game Implementation
   console.log('Game script loaded successfully!');
   ```
   - Tested in browser and confirmed the page loads correctly with no visible content (as expected).
   - Verified script loading via browser console, which displayed the log message.

## Step 2: Initialize the Three.js Scene ✅
1. **Set Up the 3D Environment** ✅
   - In `game.js`, initialize a Three.js scene, a perspective camera, and a WebGL renderer.
   - Set the renderer size to match the window's inner width and height.
   - Append the renderer's DOM element to the document body.
   - Position the camera slightly above and back from the origin.
   
   **Implementation details:**
   ```javascript
   // Initialize global variables
   let scene, camera, renderer;
   let sky;

   // Set up the 3D environment
   function init() {
       // Create the scene
       scene = new THREE.Scene();
       
       // Create the camera (perspective)
       const fieldOfView = 75;
       const aspectRatio = window.innerWidth / window.innerHeight;
       const nearClippingPlane = 0.1;
       const farClippingPlane = 1000;
       camera = new THREE.PerspectiveCamera(
           fieldOfView,
           aspectRatio,
           nearClippingPlane,
           farClippingPlane
       );
       
       // Position the camera slightly above and back from the origin
       camera.position.set(0, 5, 10);
       camera.lookAt(0, 0, 0);
       
       // Create the renderer
       renderer = new THREE.WebGLRenderer({ antialias: true });
       renderer.setSize(window.innerWidth, window.innerHeight);
       document.body.appendChild(renderer.domElement);
       
       // Create sky background
       createSky();
       
       // Handle window resizing
       window.addEventListener('resize', onWindowResize);
   }
   ```

2. **Add an Animation Loop** ✅
   - Create a function that uses `requestAnimationFrame` to continuously render the scene.
   - Call this function to start the rendering loop.
   
   **Implementation details:**
   ```javascript
   // Animation loop
   function animate() {
       // Request the next animation frame
       requestAnimationFrame(animate);
       
       // Render the scene
       renderer.render(scene, camera);
   }

   // Initialize the scene and start the animation loop
   init();
   animate();
   ```

3. **Handle Window Resizing** ✅
   - Add an event listener for the `resize` event to update the camera's aspect ratio and renderer size.
   
   **Implementation details:**
   ```javascript
   // Handle window resizing
   function onWindowResize() {
       // Update camera aspect ratio
       camera.aspect = window.innerWidth / window.innerHeight;
       camera.updateProjectionMatrix();
       
       // Update renderer size
       renderer.setSize(window.innerWidth, window.innerHeight);
   }
   ```

4. **Add a Sky Background** ✅
   - Create a large box geometry to act as the sky.
   - Apply a basic material with a light blue color and configure it to render from the inside.
   - Add this sky object to the scene.
   
   **Implementation details:**
   ```javascript
   // Create the sky background
   function createSky() {
       // Create a large box geometry
       const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
       
       // Create a basic material with light blue color
       const skyMaterial = new THREE.MeshBasicMaterial({
           color: 0x87CEEB, // Light blue color
           side: THREE.BackSide // Render the material from the inside
       });
       
       // Create the sky mesh and add it to the scene
       sky = new THREE.Mesh(skyGeometry, skyMaterial);
       scene.add(sky);
   }
   ```

5. **Test** ✅
   - Reload the browser to verify the background appears as a light blue sky.
   
   **Implementation details:**
   - Loaded the HTML file in a browser and verified that:
     - A light blue sky background filled the entire screen
     - No errors were displayed in the console
     - The display adjusted properly when resizing the browser window

## Step 3: Build the Runway ✅
1. **Create the Runway** ✅
   - Define a plane geometry for the runway with appropriate dimensions (e.g., wide and long).
   - Use a basic material with a dark grey color.
   - Rotate the plane to lie flat on the ground and add it to the scene.
   
   **Implementation details:**
   ```javascript
   // Create the runway
   function createRunway() {
       // Define runway dimensions
       const runwayWidth = 20;
       const runwayLength = 100;
       
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
   ```
   
   - Also added the runway variable to the global variables:
   ```javascript
   // Initialize global variables
   let scene, camera, renderer;
   let sky, runway;
   ```
   
   - And called the createRunway function in init():
   ```javascript
   function init() {
       // ... existing code ...
       
       // Create sky background
       createSky();
       
       // Create the runway
       createRunway();
       
       // ... existing code ...
   }
   ```

2. **Test** ✅
   - Reload the browser to ensure a dark grey runway is visible against the sky.
   
   **Implementation details:**
   - Loaded the HTML file in a browser and verified that:
     - The dark grey runway was clearly visible as a horizontal rectangular plane
     - The runway was properly positioned on the ground
     - The runway was correctly rotated to lie flat
     - No visual glitches or rendering issues were observed

## Step 4: Add the Plane ✅
1. **Create the Plane Model** ✅
   - Define a simple geometry to represent the plane.
   - Apply a basic material with a grey color.
   - Position the plane slightly above the runway and near its starting end.
   - Rotate the plane to face forward along the runway.
   - Add the plane to the scene.
   
   **Implementation details:**
   ```javascript
   // Create the plane
   function createPlane() {
       // Create a group to hold all plane parts
       plane = new THREE.Group();
   
       // FUSELAGE (main body)
       const fuselageLength = 5;
       const fuselageWidth = 1;
       const fuselageHeight = 1.2;
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
       wings.position.set(0, fuselageHeight/2, -0.2);
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
       cockpit.position.set(0, fuselageHeight/2 + cockpitHeight/2, -1);
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
       tailFin.position.set(0, fuselageHeight/2 + tailFinHeight/2, fuselageLength/2 - tailFinLength/2);
       plane.add(tailFin);
   
       // TAIL (horizontal stabilizer)
       const tailWingSpan = 2.5;
       const tailWingLength = 1;
       const tailWingThickness = 0.15;
       const tailWingGeometry = new THREE.BoxGeometry(tailWingSpan, tailWingThickness, tailWingLength);
       const tailWing = new THREE.Mesh(tailWingGeometry, tailMaterial);
       
       // Position horizontal tail at the back of the fuselage
       tailWing.position.set(0, fuselageHeight/4, fuselageLength/2 - tailWingLength/2);
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
       propeller.position.set(0, 0, -fuselageLength/2 - propellerDepth/2);
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
       leftWheel.position.set(-fuselageWidth - 0.2, -fuselageHeight/2 - wheelRadius + 0.2, 0);
       plane.add(leftWheel);
       
       // Right wheel
       const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
       rightWheel.rotation.z = Math.PI / 2; // Rotate to stand up like a wheel
       rightWheel.position.set(fuselageWidth + 0.2, -fuselageHeight/2 - wheelRadius + 0.2, 0);
       plane.add(rightWheel);
       
       // Rear wheel (smaller)
       const rearWheelRadius = 0.2;
       const rearWheelGeometry = new THREE.CylinderGeometry(rearWheelRadius, rearWheelRadius, wheelThickness, wheelSegments);
       const rearWheel = new THREE.Mesh(rearWheelGeometry, wheelMaterial);
       rearWheel.rotation.z = Math.PI / 2; // Rotate to stand up like a wheel
       rearWheel.position.set(0, -fuselageHeight/2 - rearWheelRadius + 0.1, fuselageLength/2 - rearWheelRadius);
       plane.add(rearWheel);
   
       // Position the entire plane on the runway
       // The wheels should touch the ground (y = 0)
       plane.position.set(0, fuselageHeight/2 + wheelRadius - 0.2, 40);
       
       // Orient the plane to face along the runway (Z-axis)
       plane.rotation.y = 0; // Facing the correct direction for takeoff
       
       // Add the plane group to the scene
       scene.add(plane);
   }
   ```
   
   - Also added the plane variable to the global variables:
   ```javascript
   // Initialize global variables
   let scene, camera, renderer;
   let sky, runway, plane;
   ```
   
   - And called the createPlane function in init():
   ```javascript
   function init() {
       // ... existing code ...
       
       // Create the runway
       createRunway();
       
       // Create the plane
       createPlane();
       
       // ... existing code ...
   }
   ```

2. **Adjust the Camera** ✅
   - Position the camera behind and above the plane.
   - Orient the camera to look at the plane's position.
   
   **Implementation details:**
   ```javascript
   // Position the camera and set up OrbitControls
   function setupCamera() {
       // Position the camera behind and slightly above the plane for a better view
       camera.position.set(0, 5, 55);
       
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
       
       // Update the controls
       controls.update();
   }
   ```
   
   - Added instructions to help users understand camera controls:
   ```javascript
   function addInstructions() {
       const instructions = document.createElement('div');
       instructions.style.position = 'absolute';
       instructions.style.top = '10px';
       instructions.style.left = '10px';
       instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
       instructions.style.color = 'white';
       instructions.style.padding = '10px';
       instructions.style.fontFamily = 'Arial, sans-serif';
       instructions.style.fontSize = '14px';
       instructions.style.borderRadius = '5px';
       instructions.innerHTML = `
           <strong>Camera Controls:</strong><br>
           - Left Click + Drag: Rotate camera<br>
           - Right Click + Drag: Pan camera<br>
           - Scroll: Zoom in/out
       `;
       document.body.appendChild(instructions);
   }
   ```
   
   - Added OrbitControls script to HTML file:
   ```html
   <!-- Three.js library from CDN -->
   <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
   <!-- OrbitControls for camera movement -->
   <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/controls/OrbitControls.js"></script>
   ```

3. **Test** ✅
   - Reload the browser to confirm the plane is visible on the runway.
   
   **Implementation details:**
   - Loaded the HTML file in a browser and verified that:
     - The WW2-style aircraft model was visible on the runway
     - The plane had all the requested components (wings, transparent cockpit, wheels, tail)
     - The plane was correctly positioned with wheels touching the ground
     - The plane was oriented properly for takeoff
     - Camera controls functioned correctly, allowing the user to examine the plane from different angles

## Step 5: Implement Flight Mechanics
1. **Define Flight Variables**
   - Declare variables at the top of `game.js` for speed, maximum speed, minimum takeoff speed, and an airborne state flag.

2. **Set Up Keyboard Input**
   - Create an object to track which keys are pressed.
   - Add event listeners for `keydown` and `keyup` to update this object.

3. **Update Plane Movement**
   - In the animation loop, add logic to:
     - Increase speed when the throttle-up key (W or Z) is pressed, up to a maximum.
     - Decrease speed when the throttle-down key (S) is pressed, down to zero.
     - Move the plane forward based on its speed.
     - Check if speed exceeds the takeoff threshold to enable flight.

4. **Implement Flight Controls**
   - In the animation loop, add logic to:
     - Pitch up when Down Arrow is pressed (rotate around x-axis).
     - Pitch down when Up Arrow is pressed.
     - Roll left when A or Q is pressed (rotate around z-axis).
     - Roll right when D is pressed.
     - Yaw left when Left Arrow is pressed (rotate around y-axis).
     - Yaw right when Right Arrow is pressed.
   - Use small, incremental rotations for smooth control.

5. **Handle Takeoff and Flight**
   - When airborne, update the plane's position based on its orientation and speed.
   - Allow the plane to climb or descend according to pitch.

6. **Test**
   - Reload the browser and test throttle, takeoff, and all flight controls.

## Step 6: Polish and Debug
1. **Adjust Camera**
   - Experiment with camera positioning (e.g., a chase camera) for an optimal view.
   - Update the camera to follow the plane dynamically.

2. **Tweak Physics**
   - Adjust speed increments, rotation rates, and takeoff threshold for a realistic feel.
   - Prevent unrealistic behavior (e.g., rolling on the ground).

3. **Validate Controls**
   - Ensure all specified inputs (WASD, ZQSD, arrows) function as intended.

4. **Test Responsiveness**
   - Resize the browser window to confirm the game adapts correctly.

## Step 7: Finalize
1. **Minimalist Check**
   - Verify the game includes only the runway, plane, and sky—no additional elements.
   - Confirm no combat or scoring mechanics are present.

2. **Deploy**
   - Test in multiple browsers for compatibility.
   - Optionally, host online (e.g., GitHub Pages).

3. **Document**
   - Create a brief README with setup instructions and player controls.

## Notes
- Keep dependencies minimal (only Three.js).
- Prioritize core mechanics: acceleration, takeoff, and flight.
- Use simple physics (e.g., linear speed increase, basic rotation).
- Refer to the GDD for specifics on controls and visuals.