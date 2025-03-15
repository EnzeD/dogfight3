// Input Manager for handling keyboard and mouse input
export default class InputManager {
    constructor(eventBus, controlSettings) {
        this.eventBus = eventBus;
        this.controlSettings = controlSettings;

        // Input state
        this.keysPressed = {};
        this.isUserControllingCamera = false;
        this.lastUserInteractionTime = 0;

        // Mobile touch state
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        this.monoStick = { x: 0, y: 0, active: false, id: null, startX: 0, startY: 0, lastUpdateTime: 0 };
        this.throttleLever = { y: 0, active: false, id: null, startY: 0, currentY: 0, lastUpdateTime: 0, neutralPosition: true };
        this.joystickElements = {
            mono: document.getElementById('monoStick')
        };
        this.throttleElement = {
            lever: document.getElementById('throttleLever'),
            handle: document.getElementById('throttleLever')?.querySelector('.throttle-handle')
        };
        this.fireButtons = {
            main: document.getElementById('fireButton')
        };

        // Track current orientation
        this.isLandscape = window.innerWidth > window.innerHeight;

        // Add analog control values for mobile
        this.analogControls = {
            roll: 0,      // -1 to 1 (left to right)
            pitch: 0,     // -1 to 1 (up to down)
            yaw: 0,       // -1 to 1 (left to right)
            throttle: 0,  // -1 to 1 (down to up, 0 is neutral position)
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
                mono: document.getElementById('monoStick')
            };
            this.throttleElement = {
                lever: document.getElementById('throttleLever'),
                handle: document.getElementById('throttleLever')?.querySelector('.throttle-handle')
            };
            this.fireButtons = {
                main: document.getElementById('fireButton')
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

            // Initialize throttle to neutral position only on first launch
            if (this.throttleLever.neutralPosition) {
                this.resetThrottleToNeutral();
                this.throttleLever.neutralPosition = false;
            }
        }

        // Listen for control settings changes
        this.eventBus.on('controls.invertYAxis', (inverted) => {
            console.log(`Y-axis inversion set to: ${inverted}`);
            // No need to store the value here as we'll read it from controlSettings
        });

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
            this.resetJoystick('mono');

            // Don't reset throttle position, just mark as inactive
            if (this.throttleLever.active) {
                this.throttleLever.active = false;
                this.throttleLever.id = null;
            }
        }
    }

    /**
     * Reset a specific joystick
     * @param {string} side - 'mono'
     */
    resetJoystick(side) {
        if (side === 'mono') {
            this.monoStick.active = false;
            this.monoStick.id = null;
            this.monoStick.x = 0;
            this.monoStick.y = 0;
            this.resetJoystickVisual('mono');

            // Reset analog controls
            this.analogControls.roll = 0;
            this.analogControls.pitch = 0;
            this.analogControls.yaw = 0;
            this.analogControls.targetRollAngle = 0;

            // Emit the reset target roll value
            this.eventBus.emit('input.analog', {
                type: 'targetRoll',
                value: 0
            });

            // Clear associated keys
            this.keysPressed['a'] = false;
            this.keysPressed['d'] = false;
            this.keysPressed['arrowup'] = false;
            this.keysPressed['arrowdown'] = false;
            this.keysPressed['arrowleft'] = false;
            this.keysPressed['arrowright'] = false;
        }
    }

    /**
     * Reset the throttle to the neutral position
     */
    resetThrottleToNeutral() {
        if (!this.throttleElement.lever || !this.throttleElement.handle) return;

        // Reset to neutral position (center of track)
        const leverRect = this.throttleElement.lever.getBoundingClientRect();
        const trackHeight = leverRect.height - 30;
        const neutralPos = trackHeight / 2;

        // Update handle position
        this.throttleElement.handle.style.bottom = `${neutralPos}px`;

        // Update throttle value to 0 (neutral)
        this.analogControls.throttle = 0;

        // Update UI
        this.throttleElement.lever.classList.remove('throttle-accelerating', 'throttle-decelerating');
        this.throttleElement.lever.classList.add('throttle-neutral');

        // Reset boost
        this.analogControls.boost = false;
        this.throttleElement.lever.classList.remove('throttle-boost-active');
        this.keysPressed['shift'] = false;

        // Reset throttle keys
        this.keysPressed['w'] = false;
        this.keysPressed['s'] = false;

        // Emit throttle value
        this.eventBus.emit('input.analog', {
            type: 'throttle',
            value: this.analogControls.throttle,
            boost: this.analogControls.boost
        });
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
        this.resetJoystick('mono');

        // Reset fire buttons
        this.keysPressed[' '] = false;
        if (this.fireButtons.main) this.fireButtons.main.classList.remove('active');

        // Reset throttle to neutral position
        this.resetThrottleToNeutral();

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
            if (touch.identifier === this.monoStick.id) {
                this.resetJoystick('mono');
            } else if (touch.identifier === this.throttleLever.id) {
                this.throttleLever.active = false;
                this.throttleLever.id = null;
                // Keep the throttle position where it is
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
            const fireButton = this.fireButtons.main;
            if (fireButton) {
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

            // If not a UI element, and mono stick not active, make it a mono stick touch
            if (!this.monoStick.active) {
                this.monoStick.active = true;
                this.monoStick.id = touch.identifier;
                this.monoStick.startX = x;
                this.monoStick.startY = y;
                this.monoStick.lastUpdateTime = performance.now();
                this.updateJoystickVisual('mono', x, y, x, y);
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

            if (touch.identifier === this.monoStick.id) {
                // Update the last update time to prevent timeout reset
                this.monoStick.lastUpdateTime = performance.now();

                // Calculate normalized delta for mono stick - Reduce sensitivity by half (divisor from 60 to 120)
                const dx = (x - this.monoStick.startX) / 120; // Reduced sensitivity by half
                const dy = (y - this.monoStick.startY) / 120; // Reduced sensitivity by half

                // Store the raw position for visual feedback
                const rawX = Math.max(-1, Math.min(1, dx));
                const rawY = Math.max(-1, Math.min(1, dy));

                // Apply exponential curve for more precision near center
                // Formula: sign(value) * (value^2)
                // This creates a non-linear response curve - more precise near center, more responsive at extremes
                this.monoStick.x = Math.sign(rawX) * (rawX * rawX);
                this.monoStick.y = Math.sign(rawY) * (rawY * rawY);

                // Calculate the distance from center (0 to 1)
                const distance = Math.min(1, Math.sqrt(dx * dx + dy * dy));

                // Calculate the angle from joystick position (0 is right, 90 is down)
                const angle = Math.atan2(dy, dx);
                const angleDegrees = angle * (180 / Math.PI);

                // Update visual joystick position
                this.updateJoystickVisual('mono', this.monoStick.startX, this.monoStick.startY, x, y, angleDegrees);

                // Only update if the stick is moved enough from center
                if (distance > 0.1) {
                    // Determine direction and control mapping based on the angle

                    // Convert to -180 to 180 range
                    let normalizedAngle = angleDegrees;
                    if (normalizedAngle > 180) normalizedAngle -= 360;

                    // Calculate roll based on x position (left/right)
                    // This creates intuitive roll control: left = roll left, right = roll right
                    this.analogControls.roll = this.monoStick.x;

                    // Calculate pitch and yaw based on direction
                    // Map to 4 main directions:
                    // If inverted: Up = pitch up (dive), Down = pitch down (climb)
                    // If not inverted: Up = pitch down (climb), Down = pitch up (dive)
                    // Left = yaw left
                    // Right = yaw right

                    // Get the magnitude of movement for each axis
                    const absX = Math.abs(this.monoStick.x);
                    const absY = Math.abs(this.monoStick.y);

                    // Check if Y-axis should be inverted
                    const invertY = this.controlSettings ? this.controlSettings.isYAxisInverted() : false;

                    // Determine dominant axis
                    if (absY > absX) {
                        // Vertical movement dominates
                        // Apply inversion if needed
                        this.analogControls.pitch = invertY ? -this.monoStick.y : this.monoStick.y;
                        this.analogControls.yaw = 0;  // No yaw when primarily moving up/down
                    } else {
                        // Horizontal movement dominates
                        this.analogControls.yaw = this.monoStick.x;  // Full yaw effect
                        this.analogControls.pitch = 0;  // No pitch when primarily moving left/right
                    }

                    // Set the throttle knob display angle based on the direction
                    this.analogControls.targetRollAngle = -this.analogControls.roll * 45; // Scale roll for display

                    // Set keyboard controls for backward compatibility - use the raw non-exponential values
                    // for digital detection to maintain responsiveness for key presses
                    this.keysPressed['a'] = rawX < -0.3;
                    this.keysPressed['d'] = rawX > 0.3;

                    if (invertY) {
                        // Inverted controls: Push up to dive, pull down to climb
                        this.keysPressed['arrowup'] = rawY > 0.3;    // Push up to pitch up (dive)
                        this.keysPressed['arrowdown'] = rawY < -0.3;   // Push down to pitch down (climb)
                    } else {
                        // Normal controls: Push up to climb, pull down to dive
                        this.keysPressed['arrowup'] = rawY < -0.3;    // Push up to pitch down (climb)
                        this.keysPressed['arrowdown'] = rawY > 0.3;   // Push down to pitch up (dive)
                    }

                    this.keysPressed['arrowleft'] = rawX < -0.3;  // Push left to yaw left
                    this.keysPressed['arrowright'] = rawX > 0.3;  // Push right to yaw right
                } else {
                    // If stick is close to center, reset controls
                    this.analogControls.roll = 0;
                    this.analogControls.pitch = 0;
                    this.analogControls.yaw = 0;
                    this.analogControls.targetRollAngle = 0;

                    this.keysPressed['a'] = false;
                    this.keysPressed['d'] = false;
                    this.keysPressed['arrowup'] = false;
                    this.keysPressed['arrowdown'] = false;
                    this.keysPressed['arrowleft'] = false;
                    this.keysPressed['arrowright'] = false;
                }

                // Emit the roll angle for the plane
                this.eventBus.emit('input.analog', {
                    type: 'targetRoll',
                    value: this.analogControls.targetRollAngle
                });
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
        let monoStickFound = false;
        let throttleFound = false;

        for (let i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i];
            if (touch.identifier === this.monoStick.id) monoStickFound = true;
            if (touch.identifier === this.throttleLever.id) throttleFound = true;
        }

        // If a control's touch is no longer in the touches list, reset it
        if (this.monoStick.active && !monoStickFound) {
            console.log('Mono joystick touch lost, resetting');
            this.resetJoystick('mono');
        }

        if (this.throttleLever.active && !throttleFound) {
            console.log('Throttle lever touch lost, resetting');
            this.throttleLever.active = false;
            this.throttleLever.id = null;
            // Keep the throttle position where it is
        }
    }

    onTouchEnd(event) {
        for (let touch of event.changedTouches) {
            // Remove this touch ID from our tracking set
            this.activeTouchIds.delete(touch.identifier);

            // Check if this was the mono stick
            if (touch.identifier === this.monoStick.id) {
                this.resetJoystick('mono');
            }
            // Check if this was the throttle
            else if (touch.identifier === this.throttleLever.id) {
                this.throttleLever.active = false;
                this.throttleLever.id = null;
                // Keep the throttle position where it is
            }
            // Check if this was a fire button touch
            else {
                const x = touch.clientX;
                const y = touch.clientY;
                const fireButton = this.fireButtons.main;
                if (fireButton) {
                    const buttonRect = fireButton.getBoundingClientRect();
                    if (x >= buttonRect.left && x <= buttonRect.right &&
                        y >= buttonRect.top && y <= buttonRect.bottom) {
                        this.keysPressed[' '] = false;
                        fireButton.classList.remove('active');
                    }
                }
            }
        }
    }

    updateJoystickVisual(side, baseX, baseY, currentX, currentY, angleDegrees = 0) {
        const joystick = this.joystickElements[side];
        if (!joystick) return;

        // Calculate the distance from the base position
        const dx = currentX - baseX;
        const dy = currentY - baseY;

        // Limit movement to a reasonable distance
        const distance = Math.min(30, Math.sqrt(dx * dx + dy * dy));

        // Calculate the new position for the joystick knob
        const knobX = Math.min(30, Math.max(-30, dx));
        const knobY = Math.min(30, Math.max(-30, dy));

        // Update the joystick knob position using transform
        joystick.style.setProperty('--knob-x', `${knobX}px`);
        joystick.style.setProperty('--knob-y', `${knobY}px`);

        // For mono joystick, show a directional indicator
        if (side === 'mono' && distance > 5) {
            // Set a CSS variable for the direction angle
            joystick.style.setProperty('--direction-angle', `${angleDegrees}deg`);

            // Add appropriate direction classes based on angle
            joystick.classList.remove('direction-up', 'direction-down', 'direction-left', 'direction-right');

            // Determine main direction based on angle
            if (angleDegrees > -45 && angleDegrees < 45) {
                joystick.classList.add('direction-right');
            } else if (angleDegrees >= 45 && angleDegrees < 135) {
                joystick.classList.add('direction-down');
            } else if (angleDegrees >= 135 || angleDegrees < -135) {
                joystick.classList.add('direction-left');
            } else if (angleDegrees >= -135 && angleDegrees < -45) {
                joystick.classList.add('direction-up');
            }
        } else if (distance <= 5) {
            // If close to center, remove direction classes
            joystick.classList.remove('direction-up', 'direction-down', 'direction-left', 'direction-right');
            joystick.style.setProperty('--direction-angle', '0deg');
        }
    }

    resetJoystickVisual(side) {
        const joystick = this.joystickElements[side];
        if (!joystick) return;

        // Reset the joystick knob to center
        joystick.style.setProperty('--knob-x', '0px');
        joystick.style.setProperty('--knob-y', '0px');

        // Clear direction indicators
        joystick.classList.remove('direction-up', 'direction-down', 'direction-left', 'direction-right');
        joystick.style.removeProperty('--direction-angle');
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

        // Calculate center point of the track
        const centerY = leverRect.top + (leverRect.height / 2);

        // Calculate position relative to center (-1 to 1, with 0 at center)
        // Negative when below center (deceleration), positive when above center (acceleration)
        let relativeY = (touchY - centerY) / (trackHeight / 2);
        relativeY = -Math.max(-1, Math.min(1, relativeY)); // Invert so up is positive

        // Update handle position (center is 50% of track height)
        const handlePositionPercent = 50 + (relativeY * 50); // Map -1,1 to 0,100
        const handlePosition = (handlePositionPercent / 100) * trackHeight;
        this.throttleElement.handle.style.bottom = `${handlePosition}px`;

        // Add visual indicator for neutral position if not already present
        if (!this.throttleElement.lever.querySelector('.throttle-neutral-marker')) {
            const neutralMarker = document.createElement('div');
            neutralMarker.className = 'throttle-neutral-marker';
            neutralMarker.style.position = 'absolute';
            neutralMarker.style.width = '100%';
            neutralMarker.style.height = '2px';
            neutralMarker.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            neutralMarker.style.left = '0';
            neutralMarker.style.bottom = `${trackHeight / 2}px`;
            this.throttleElement.lever.appendChild(neutralMarker);
        }

        // Update throttle value (-1 to 1)
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

        // Update throttle UI classes based on position
        this.throttleElement.lever.classList.remove('throttle-accelerating', 'throttle-decelerating', 'throttle-neutral');

        // Add appropriate class based on position
        if (Math.abs(relativeY) < 0.1) {
            this.throttleElement.lever.classList.add('throttle-neutral');
        } else if (relativeY > 0) {
            this.throttleElement.lever.classList.add('throttle-accelerating');
        } else {
            this.throttleElement.lever.classList.add('throttle-decelerating');
        }

        // Set throttle keys based on position
        this.keysPressed['w'] = relativeY > 0.1; // Throttle up when above neutral
        this.keysPressed['s'] = relativeY < -0.1; // Throttle down when below neutral

        // Emit throttle value
        this.eventBus.emit('input.analog', {
            type: 'throttle',
            value: this.analogControls.throttle,
            boost: this.analogControls.boost
        });
    }
} 