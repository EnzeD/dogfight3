// Input Manager for handling keyboard and mouse input
export default class InputManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // Input state
        this.keysPressed = {};
        this.isUserControllingCamera = false;
        this.lastUserInteractionTime = 0;

        // Mobile touch state
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        this.leftStick = { x: 0, y: 0, active: false, id: null, startX: 0, startY: 0, lastUpdateTime: 0 };
        this.rightStick = { x: 0, y: 0, active: false, id: null, startX: 0, startY: 0, lastUpdateTime: 0 };
        this.throttleLever = { y: 0, active: false, id: null, startY: 0, currentY: 0, lastUpdateTime: 0 };
        this.joystickElements = {
            left: document.getElementById('leftJoystick'),
            right: document.getElementById('rightJoystick')
        };
        this.throttleElement = {
            lever: document.getElementById('throttleLever'),
            handle: document.getElementById('throttleLever')?.querySelector('.throttle-handle')
        };
        this.fireButtons = {
            left: document.getElementById('leftFireButton'),
            right: document.getElementById('rightFireButton')
        };

        // Track current orientation
        this.isLandscape = window.innerWidth > window.innerHeight;

        // Add analog control values for mobile
        this.analogControls = {
            roll: 0,      // -1 to 1 (left to right)
            pitch: 0,     // -1 to 1 (up to down)
            yaw: 0,       // -1 to 1 (left to right)
            throttle: 0,  // 0 to 1 (down to up)
            boost: false, // Boolean for boost state
            targetRollAngle: 0 // Target roll angle in degrees (-45 to 45)
        };

        // Track active touch IDs to detect orphaned touches
        this.activeTouchIds = new Set();

        // Disable camera control on mobile
        if (this.isMobile) {
            this.isUserControllingCamera = false;
        }

        // Key mappings
        this.keyMap = {
            // Throttle controls
            'w': 'throttleUp',
            'z': 'throttleUp', // For AZERTY keyboards
            's': 'throttleDown',
            'shift': 'boost',   // Added shift key for boost

            // Roll controls
            'a': 'rollLeft',
            'q': 'rollLeft', // For AZERTY keyboards
            'd': 'rollRight',

            // Pitch and yaw controls
            'arrowup': 'pitchDown',
            'arrowdown': 'pitchUp',
            'arrowleft': 'yawLeft',
            'arrowright': 'yawRight',

            // Additional controls
            'f': 'toggleAutoStabilization',
            ' ': 'fireAmmo',
            'c': 'toggleCameraMode',
            'e': 'spawnEnemies',    // Add enemy spawn shortcut
            'h': 'displayHealth',   // Health debug key
            't': 'toggleTrails',    // Toggle wing trails
            'j': 'debugDamage',     // Test damage system
            'k': 'debugHeal',       // Test healing system
            'r': 'restartGame',     // Restart game after player death
            'b': 'toggleHitboxes',   // Toggle hitbox visualization
            'tab': 'toggleLeaderboard' // Toggle leaderboard display
        };
    }

    init() {
        // Setup keyboard event listeners
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));

        // Setup mouse event listeners for camera control
        document.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));

        // Setup touch controls for mobile
        if (this.isMobile) {
            this.setupTouchControls();
            this.overrideExistingTouchListeners();

            // Re-initialize UI elements that might not have been available during construction
            this.joystickElements = {
                left: document.getElementById('leftJoystick'),
                right: document.getElementById('rightJoystick')
            };
            this.throttleElement = {
                lever: document.getElementById('throttleLever'),
                handle: document.getElementById('throttleLever')?.querySelector('.throttle-handle')
            };
            this.fireButtons = {
                left: document.getElementById('leftFireButton'),
                right: document.getElementById('rightFireButton')
            };

            // Add global touch end listener to catch any missed touch ends
            window.addEventListener('touchend', this.onGlobalTouchEnd.bind(this), true);
            window.addEventListener('touchcancel', this.onGlobalTouchEnd.bind(this), true);

            // Add visibility change listener to reset controls when app loses focus
            document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));

            // Add orientation change listener
            window.addEventListener('resize', this.onOrientationChange.bind(this));

            // Initial orientation check
            this.checkOrientation();
        }

        console.log('InputManager initialized');
    }

    /**
     * Handle orientation changes
     */
    onOrientationChange() {
        this.checkOrientation();
    }

    /**
     * Check and update the current orientation
     */
    checkOrientation() {
        const wasLandscape = this.isLandscape;
        this.isLandscape = window.innerWidth > window.innerHeight;

        // If orientation changed, reset controls to prevent issues
        if (wasLandscape !== this.isLandscape) {
            console.log(`Orientation changed to ${this.isLandscape ? 'landscape' : 'portrait'}`);

            // Reset joysticks when orientation changes
            this.resetJoystick('left');
            this.resetJoystick('right');

            // Don't reset throttle position, just mark as inactive
            if (this.throttleLever.active) {
                this.throttleLever.active = false;
                this.throttleLever.id = null;
            }
        }
    }

    /**
     * Reset a specific joystick
     * @param {string} side - 'left' or 'right'
     */
    resetJoystick(side) {
        if (side === 'left') {
            this.leftStick.active = false;
            this.leftStick.id = null;
            this.leftStick.x = 0;
            this.leftStick.y = 0;
            this.resetJoystickVisual('left');

            // Reset analog controls
            this.analogControls.roll = 0;
            this.analogControls.targetRollAngle = 0;

            // Emit the reset target roll value
            this.eventBus.emit('input.analog', {
                type: 'targetRoll',
                value: 0
            });

            // Clear associated keys
            this.keysPressed['a'] = false;
            this.keysPressed['d'] = false;
        } else if (side === 'right') {
            this.rightStick.active = false;
            this.rightStick.id = null;
            this.rightStick.x = 0;
            this.rightStick.y = 0;
            this.resetJoystickVisual('right');

            // Reset analog controls
            this.analogControls.yaw = 0;
            this.analogControls.pitch = 0;

            // Clear associated keys
            this.keysPressed['arrowup'] = false;
            this.keysPressed['arrowdown'] = false;
            this.keysPressed['arrowleft'] = false;
            this.keysPressed['arrowright'] = false;
        }
    }

    /**
     * Handle visibility change events (app going to background/foreground)
     */
    onVisibilityChange() {
        if (document.hidden) {
            // App is going to background, reset all controls
            this.resetAllControls();
        }
    }

    /**
     * Reset all controls to their default state
     */
    resetAllControls() {
        // Reset joysticks
        this.resetJoystick('left');
        this.resetJoystick('right');

        // Reset fire buttons
        this.keysPressed[' '] = false;
        if (this.fireButtons.left) this.fireButtons.left.classList.remove('active');
        if (this.fireButtons.right) this.fireButtons.right.classList.remove('active');

        // Don't reset throttle position, just mark it as inactive
        this.throttleLever.active = false;
        this.throttleLever.id = null;

        // Clear all active touch IDs
        this.activeTouchIds.clear();
    }

    /**
     * Global touch end handler to catch any missed touch ends
     */
    onGlobalTouchEnd(event) {
        // Process all changed touches
        for (let touch of event.changedTouches) {
            // Remove this touch ID from our tracking set
            this.activeTouchIds.delete(touch.identifier);

            // If this was a joystick touch that wasn't properly handled, reset it
            if (touch.identifier === this.leftStick.id) {
                this.resetJoystick('left');
            } else if (touch.identifier === this.rightStick.id) {
                this.resetJoystick('right');
            } else if (touch.identifier === this.throttleLever.id) {
                this.throttleLever.active = false;
                this.throttleLever.id = null;
            }
        }
    }

    setupTouchControls() {
        // Touch event listeners
        window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.onTouchEnd.bind(this));
        window.addEventListener('touchcancel', this.onTouchEnd.bind(this));

        // Explicitly tell the game that camera should not be manually controlled on mobile
        this.eventBus.emit('camera.control', { isManual: false });
    }

    /**
     * Override any existing touch event listeners that might affect camera control
     */
    overrideExistingTouchListeners() {
        // Create a global variable to signal that touch events should not affect camera
        window.isMobileTouchControl = true;

        // Override OrbitControls touch events if they exist
        if (window.THREE && window.THREE.OrbitControls) {
            const originalHandleTouchStart = window.THREE.OrbitControls.prototype.onTouchStart;
            window.THREE.OrbitControls.prototype.onTouchStart = function (event) {
                if (window.isMobileTouchControl) return;
                originalHandleTouchStart.call(this, event);
            };

            const originalHandleTouchMove = window.THREE.OrbitControls.prototype.onTouchMove;
            window.THREE.OrbitControls.prototype.onTouchMove = function (event) {
                if (window.isMobileTouchControl) return;
                originalHandleTouchMove.call(this, event);
            };
        }

        // Force camera to auto-follow mode
        this.eventBus.emit('camera.control', { isManual: false });

        // Periodically ensure camera is not in manual control mode
        setInterval(() => {
            if (this.isUserControllingCamera) {
                this.isUserControllingCamera = false;
                this.eventBus.emit('camera.control', { isManual: false });
            }
        }, 500);
    }

    onTouchStart(event) {
        event.preventDefault(); // Prevent scrolling

        // Ensure camera is not manually controlled on mobile
        if (this.isUserControllingCamera) {
            this.isUserControllingCamera = false;
            this.eventBus.emit('camera.control', { isManual: false });
        }

        for (let touch of event.changedTouches) {
            const x = touch.clientX;
            const y = touch.clientY;

            // Add this touch ID to our tracking set
            this.activeTouchIds.add(touch.identifier);

            // Check for fire button touches
            if (y < window.innerHeight - 180) { // Above joysticks
                const isLeftSide = x < window.innerWidth / 2;
                const fireButton = isLeftSide ? this.fireButtons.left : this.fireButtons.right;
                const buttonRect = fireButton.getBoundingClientRect();

                if (x >= buttonRect.left && x <= buttonRect.right &&
                    y >= buttonRect.top && y <= buttonRect.bottom) {
                    this.keysPressed[' '] = true;
                    fireButton.classList.add('active');
                    return;
                }
            }

            // Check for throttle lever touch
            if (this.throttleElement.lever) {
                const leverRect = this.throttleElement.lever.getBoundingClientRect();
                if (x >= leverRect.left && x <= leverRect.right &&
                    y >= leverRect.top && y <= leverRect.bottom) {
                    this.throttleLever.active = true;
                    this.throttleLever.id = touch.identifier;
                    this.throttleLever.startY = y;
                    this.throttleLever.currentY = y;
                    this.throttleLever.lastUpdateTime = performance.now();
                    this.updateThrottlePosition(y);
                    return;
                }
            }

            // Left side of screen controls roll only
            if (x < window.innerWidth / 3 && !this.leftStick.active) {
                this.leftStick.active = true;
                this.leftStick.id = touch.identifier;
                this.leftStick.startX = x;
                this.leftStick.startY = y;
                this.leftStick.lastUpdateTime = performance.now();
                this.updateJoystickVisual('left', x, y, x, y);
            }
            // Right side controls pitch and yaw
            else if (x >= window.innerWidth * 2 / 3 && !this.rightStick.active) {
                this.rightStick.active = true;
                this.rightStick.id = touch.identifier;
                this.rightStick.startX = x;
                this.rightStick.startY = y;
                this.rightStick.lastUpdateTime = performance.now();
                this.updateJoystickVisual('right', x, y, x, y);
            }
        }
    }

    onTouchMove(event) {
        event.preventDefault(); // Prevent scrolling

        // Ensure camera is not manually controlled on mobile
        if (this.isUserControllingCamera) {
            this.isUserControllingCamera = false;
            this.eventBus.emit('camera.control', { isManual: false });
        }

        for (let touch of event.changedTouches) {
            const x = touch.clientX;
            const y = touch.clientY;

            if (touch.identifier === this.leftStick.id) {
                // Update the last update time to prevent timeout reset
                this.leftStick.lastUpdateTime = performance.now();

                // Calculate normalized delta for left stick
                const dx = (x - this.leftStick.startX) / 60; // Adjust divisor for sensitivity
                const dy = (y - this.leftStick.startY) / 60;

                // Store the raw position for visual feedback
                this.leftStick.x = Math.max(-1, Math.min(1, dx));
                this.leftStick.y = Math.max(-1, Math.min(1, dy));

                // Calculate the distance from center (0 to 1)
                const distance = Math.min(1, Math.sqrt(dx * dx + dy * dy));

                // Only update if the stick is moved enough from center
                if (distance > 0.1) {
                    // For roll control, we allow full 360-degree rotation
                    // Calculate the angle from the joystick position
                    const angle = Math.atan2(dy, dx);

                    // Convert angle to degrees (-180 to 180)
                    let angleDegrees = angle * (180 / Math.PI);

                    // Adjust the angle to match the expected roll orientation:
                    // - Top of joystick (0° in atan2) should be 0° roll (normal flight)
                    // - Right of joystick (90° in atan2) should be 90° roll (right wing up)
                    // - Bottom of joystick (180° in atan2) should be 180° roll (inverted flight)
                    // - Left of joystick (-90° in atan2) should be 270° roll (left wing up)
                    let rollAngleDegrees = angleDegrees + 90;
                    // Normalize to -180 to 180 range
                    if (rollAngleDegrees > 180) rollAngleDegrees -= 360;
                    if (rollAngleDegrees < -180) rollAngleDegrees += 360;

                    // Map the joystick position to a target roll angle
                    // Scale by distance from center to allow proportional control
                    // Full 360-degree rotation is now possible
                    // Use a signed value to maintain consistent directionality
                    const targetRollAngle = -rollAngleDegrees * distance;

                    this.analogControls.targetRollAngle = targetRollAngle;

                    // For compatibility with existing code, set the key states based on
                    // the actual joystick position, not the plane's orientation
                    // This fixes the inversion bug when plane is oriented beyond 90/-90 degrees
                    // Note: these are only used as fallbacks and for the propeller control
                    this.keysPressed['a'] = (angleDegrees > 90 || angleDegrees < -90);
                    this.keysPressed['d'] = (angleDegrees >= -90 && angleDegrees <= 90);
                } else {
                    // If stick is close to center, target level flight
                    this.analogControls.targetRollAngle = 0;
                    this.keysPressed['a'] = false;
                    this.keysPressed['d'] = false;
                }

                // Update visual joystick position - show both axes for better visual feedback
                this.updateJoystickVisual('left', this.leftStick.startX, this.leftStick.startY, x, y);

                // Emit the target roll angle for the plane to gradually roll toward
                this.eventBus.emit('input.analog', {
                    type: 'targetRoll',
                    value: this.analogControls.targetRollAngle
                });
            }
            else if (touch.identifier === this.rightStick.id) {
                // Update the last update time to prevent timeout reset
                this.rightStick.lastUpdateTime = performance.now();

                // Calculate normalized delta for right stick (pitch and yaw)
                const dx = (x - this.rightStick.startX) / 60;
                const dy = (y - this.rightStick.startY) / 60;

                this.rightStick.x = Math.max(-1, Math.min(1, dx));
                this.rightStick.y = Math.max(-1, Math.min(1, dy));

                // Update visual joystick position
                this.updateJoystickVisual('right', this.rightStick.startX, this.rightStick.startY, x, y);

                // Store analog values
                this.analogControls.yaw = this.rightStick.x;      // Left/right for yaw
                this.analogControls.pitch = this.rightStick.y;    // Up/down for pitch

                // Map to controls - right stick controls pitch and yaw
                this.keysPressed['arrowup'] = this.rightStick.y < -0.3;    // Push up to pitch down
                this.keysPressed['arrowdown'] = this.rightStick.y > 0.3;   // Push down to pitch up
                this.keysPressed['arrowleft'] = this.rightStick.x < -0.3;  // Push left to yaw left
                this.keysPressed['arrowright'] = this.rightStick.x > 0.3;  // Push right to yaw right
            }
            else if (touch.identifier === this.throttleLever.id) {
                // Update the last update time
                this.throttleLever.lastUpdateTime = performance.now();
                this.throttleLever.currentY = y;
                this.updateThrottlePosition(y);
            }
        }

        // Check if we have any active touches for our controls
        // If not, make sure the controls are reset
        let leftStickFound = false;
        let rightStickFound = false;
        let throttleFound = false;

        for (let i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i];
            if (touch.identifier === this.leftStick.id) leftStickFound = true;
            if (touch.identifier === this.rightStick.id) rightStickFound = true;
            if (touch.identifier === this.throttleLever.id) throttleFound = true;
        }

        // If a control's touch is no longer in the touches list, reset it
        if (this.leftStick.active && !leftStickFound) {
            console.log('Left joystick touch lost, resetting');
            this.resetJoystick('left');
        }

        if (this.rightStick.active && !rightStickFound) {
            console.log('Right joystick touch lost, resetting');
            this.resetJoystick('right');
        }

        if (this.throttleLever.active && !throttleFound) {
            console.log('Throttle touch lost, marking as inactive');
            this.throttleLever.active = false;
            this.throttleLever.id = null;
        }
    }

    onTouchEnd(event) {
        for (let touch of event.changedTouches) {
            // Remove this touch ID from our tracking set
            this.activeTouchIds.delete(touch.identifier);

            // Check if this was a fire button touch
            const isLeftSide = touch.clientX < window.innerWidth / 2;
            if (touch.clientY < window.innerHeight - 180) { // Above joysticks
                const fireButton = isLeftSide ? this.fireButtons.left : this.fireButtons.right;
                const buttonRect = fireButton.getBoundingClientRect();

                if (touch.clientX >= buttonRect.left && touch.clientX <= buttonRect.right &&
                    touch.clientY >= buttonRect.top && touch.clientY <= buttonRect.bottom) {
                    this.keysPressed[' '] = false;
                    fireButton.classList.remove('active');
                    continue; // Use continue instead of return to process other touches
                }
            }

            if (touch.identifier === this.leftStick.id) {
                this.leftStick.active = false;
                this.leftStick.id = null;
                this.leftStick.x = 0;
                this.leftStick.y = 0;
                this.resetJoystickVisual('left');

                // Reset analog controls
                this.analogControls.roll = 0;

                // When stick is released, set target roll to level (0 degrees)
                this.analogControls.targetRollAngle = 0;

                // Emit the reset target roll value
                this.eventBus.emit('input.analog', {
                    type: 'targetRoll',
                    value: 0
                });

                // Clear associated keys
                this.keysPressed['a'] = false;
                this.keysPressed['d'] = false;
            }
            else if (touch.identifier === this.rightStick.id) {
                this.rightStick.active = false;
                this.rightStick.id = null;
                this.rightStick.x = 0;
                this.rightStick.y = 0;
                this.resetJoystickVisual('right');

                // Reset analog controls
                this.analogControls.yaw = 0;
                this.analogControls.pitch = 0;

                // Clear associated keys
                this.keysPressed['arrowup'] = false;
                this.keysPressed['arrowdown'] = false;
                this.keysPressed['arrowleft'] = false;
                this.keysPressed['arrowright'] = false;
            }
            else if (touch.identifier === this.throttleLever.id) {
                this.throttleLever.active = false;
                this.throttleLever.id = null;
                // Note: We don't reset the throttle position when touch ends
                // This allows the throttle to stay where it was set
            }
        }
    }

    updateJoystickVisual(side, baseX, baseY, currentX, currentY) {
        const joystick = this.joystickElements[side];
        if (!joystick) return;

        // Calculate the distance from the base position
        const dx = currentX - baseX;
        const dy = currentY - baseY;

        // For left joystick (roll control), we want to show a visual indicator of the target roll angle
        let distance, knobX, knobY;

        if (side === 'left') {
            // For left stick, limit movement to a reasonable distance
            distance = Math.min(30, Math.sqrt(dx * dx + dy * dy));

            // Calculate the new position for the joystick knob
            knobX = Math.min(30, Math.max(-30, dx));
            knobY = Math.min(30, Math.max(-30, dy));

            // Add a visual indicator of the target roll angle
            if (distance > 5) {
                // Calculate the angle from joystick position
                const angle = Math.atan2(dy, dx);
                const angleDegrees = angle * (180 / Math.PI);

                // Adjust the angle to match the expected roll orientation
                let rollAngleDegrees = angleDegrees + 90;
                // Normalize to -180 to 180 range
                if (rollAngleDegrees > 180) rollAngleDegrees -= 360;
                if (rollAngleDegrees < -180) rollAngleDegrees += 360;

                // Add a class to show the roll direction
                // Right half of joystick = roll right, left half = roll left
                if (angleDegrees >= -90 && angleDegrees <= 90) {
                    joystick.classList.add('roll-right');
                    joystick.classList.remove('roll-left');
                } else {
                    joystick.classList.add('roll-left');
                    joystick.classList.remove('roll-right');
                }

                // Set a CSS variable for the roll angle that can be used for visual effects
                // The line indicator should rotate to show the target roll angle
                joystick.style.setProperty('--roll-angle', `${rollAngleDegrees}deg`);
            } else {
                // If close to center, remove roll direction classes
                joystick.classList.remove('roll-left', 'roll-right');
                joystick.style.setProperty('--roll-angle', '0deg');
            }
        } else {
            // For right stick, keep the existing behavior
            distance = Math.min(30, Math.sqrt(dx * dx + dy * dy));
            const angle = Math.atan2(dy, dx);
            knobX = distance * Math.cos(angle);
            knobY = distance * Math.sin(angle);
        }

        // Update the joystick knob position using transform
        joystick.style.setProperty('--knob-x', `${knobX}px`);
        joystick.style.setProperty('--knob-y', `${knobY}px`);
    }

    resetJoystickVisual(side) {
        const joystick = this.joystickElements[side];
        if (!joystick) return;

        // Reset the joystick knob to center
        joystick.style.setProperty('--knob-x', '0px');
        joystick.style.setProperty('--knob-y', '0px');

        // For left joystick, also clear roll angle indicators
        if (side === 'left') {
            joystick.classList.remove('roll-left', 'roll-right');
            joystick.style.removeProperty('--roll-angle');
        }
    }

    onKeyDown(event) {
        const key = event.key.toLowerCase();

        // Prevent default browser behavior for certain keys
        if (key === 'tab') {
            event.preventDefault();
        }

        // Only process if the key wasn't already pressed (prevents key repeat)
        if (!this.keysPressed[key]) {
            this.keysPressed[key] = true;

            // Emit specific events for one-time actions
            const action = this.keyMap[key];
            if (action) {
                this.eventBus.emit('input.action', { action, state: 'down' });
            }
        }
    }

    onKeyUp(event) {
        const key = event.key.toLowerCase();

        // Prevent default browser behavior for certain keys
        if (key === 'tab') {
            event.preventDefault();
        }

        this.keysPressed[key] = false;

        // Emit key up event
        const action = this.keyMap[key];
        if (action) {
            this.eventBus.emit('input.action', { action, state: 'up' });
        }
    }

    onMouseDown(event) {
        // Only handle mouse events on desktop
        if (!this.isMobile) {
            this.isUserControllingCamera = true;
            this.lastUserInteractionTime = performance.now();
            this.eventBus.emit('camera.control', { isManual: true });
        }
    }

    onMouseUp(event) {
        // Only handle mouse events on desktop
        if (!this.isMobile) {
            this.isUserControllingCamera = false;
            this.eventBus.emit('camera.control', { isManual: false });
        }
    }

    onMouseMove(event) {
        // Only handle mouse events on desktop
        if (!this.isMobile && this.isUserControllingCamera) {
            this.lastUserInteractionTime = performance.now();
        }
    }

    /**
     * Get the current input state
     * @returns {Object} Current input state
     */
    getInputState() {
        // On mobile, always report camera as not being manually controlled
        const isManualCamera = this.isMobile ? false : this.isUserControllingCamera;

        return {
            keysPressed: this.keysPressed,
            isUserControllingCamera: isManualCamera,
            lastUserInteractionTime: this.lastUserInteractionTime,
            analogControls: this.analogControls
        };
    }

    /**
     * Check if a specific action is active
     * @param {string} action - The action to check
     * @returns {boolean} Whether the action is active
     */
    isActionActive(action) {
        for (const [key, mappedAction] of Object.entries(this.keyMap)) {
            if (mappedAction === action && this.keysPressed[key]) {
                return true;
            }
        }
        return false;
    }

    /**
     * Update the throttle position based on touch position
     * @param {number} touchY - The Y position of the touch
     */
    updateThrottlePosition(touchY) {
        if (!this.throttleElement.lever || !this.throttleElement.handle) return;

        const leverRect = this.throttleElement.lever.getBoundingClientRect();
        const trackHeight = leverRect.height - 30; // Subtract handle height

        // Calculate position within the track (0 at bottom, 1 at top)
        let relativeY = (leverRect.bottom - touchY) / trackHeight;
        relativeY = Math.max(0, Math.min(1, relativeY));

        // Update handle position
        const handlePosition = relativeY * trackHeight;
        this.throttleElement.handle.style.bottom = `${handlePosition}px`;

        // Update throttle value (0 to 1)
        this.analogControls.throttle = relativeY;

        // Check if boost is active (when throttle is at max)
        const isBoost = relativeY > 0.95;
        if (isBoost !== this.analogControls.boost) {
            this.analogControls.boost = isBoost;
            if (isBoost) {
                this.throttleElement.lever.classList.add('throttle-boost-active');
                this.keysPressed['shift'] = true;
            } else {
                this.throttleElement.lever.classList.remove('throttle-boost-active');
                this.keysPressed['shift'] = false;
            }
        }

        // Set throttle keys based on position
        this.keysPressed['w'] = relativeY > 0.1; // Throttle up when not at minimum
        this.keysPressed['s'] = relativeY < 0.1; // Throttle down only at minimum

        // Emit throttle value
        this.eventBus.emit('input.analog', {
            type: 'throttle',
            value: this.analogControls.throttle,
            boost: this.analogControls.boost
        });
    }
} 