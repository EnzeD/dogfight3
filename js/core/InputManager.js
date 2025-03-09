// Input Manager for handling keyboard and mouse input
export default class InputManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // Input state
        this.keysPressed = {};
        this.isUserControllingCamera = false;
        this.lastUserInteractionTime = 0;

        // Touch input state
        this.touchControls = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            throttle: 0,  // Value between -1 and 1
            roll: 0,      // Value between -1 and 1
            pitch: 0,     // Value between -1 and 1
            yaw: 0        // Value between -1 and 1
        };

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

        // Setup touch event listeners for mobile devices
        document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

        // Handle any remaining overlays that might be blocking touch
        this.removeTouchBlockers();

        console.log('InputManager initialized with touch controls for mobile');
    }

    /**
     * Creates touch-specific UI controls for mobile devices
     */
    createMobileTouchControls() {
        // Mobile controls now handled without visible UI overlays
        console.log('Mobile touch controls initialized without UI overlay');
    }

    /**
     * Remove any elements that might be blocking touch events
     */
    removeTouchBlockers() {
        // Target problematic overlays
        const overlays = document.querySelectorAll('.mobile-message, .touch-controls-tutorial, .touch-control-hint');
        overlays.forEach(overlay => {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
                console.log('Removed touch blocking overlay:', overlay.className);
            }
        });

        // Also look for any fire buttons
        const fireButtons = document.querySelectorAll('#mobile-fire-button, .mobile-fire-button');
        fireButtons.forEach(button => {
            if (button && button.parentNode) {
                button.parentNode.removeChild(button);
                console.log('Removed fire button');
            }
        });
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
        this.isUserControllingCamera = true;
        this.lastUserInteractionTime = performance.now();
        this.eventBus.emit('camera.control', { isManual: true });
    }

    onMouseUp(event) {
        this.isUserControllingCamera = false;
        this.eventBus.emit('camera.control', { isManual: false });
    }

    onMouseMove(event) {
        if (this.isUserControllingCamera) {
            this.lastUserInteractionTime = performance.now();
        }
    }

    /**
     * Handle touch start events for mobile controls
     * @param {TouchEvent} event - The touch event
     */
    onTouchStart(event) {
        // Don't prevent default to allow interaction with UI elements
        // Only prevent default for specific game controls to avoid iOS issues

        // Ignore if touching a UI element
        if (this.isTouchingUIElement(event)) {
            return;
        }

        this.touchControls.active = true;
        this.lastUserInteractionTime = performance.now();

        // Store the starting touch position
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            this.touchControls.startX = touch.clientX;
            this.touchControls.startY = touch.clientY;
            this.touchControls.currentX = touch.clientX;
            this.touchControls.currentY = touch.clientY;
        }

        // If touching the left side of the screen, we'll use it for flight controls
        // If touching the right side, we'll use it for camera controls
        const screenWidth = window.innerWidth;
        const touchX = event.touches[0].clientX;

        if (touchX < screenWidth / 2) {
            // Left side - flight controls
            // We'll handle these in the touchMove event

            // Visual feedback
            this.showTouchFeedback(touchX, event.touches[0].clientY, 'left');
        } else {
            // Right side - camera controls
            this.isUserControllingCamera = true;
            this.eventBus.emit('camera.control', { isManual: true });

            // Visual feedback
            this.showTouchFeedback(touchX, event.touches[0].clientY, 'right');
        }
    }

    /**
     * Handle touch move events for mobile controls
     * @param {TouchEvent} event - The touch event
     */
    onTouchMove(event) {
        // Only prevent default for game controls, not for UI interactions
        if (this.touchControls.active && event.touches.length > 0 && !this.isTouchingUIElement(event)) {
            event.preventDefault();
        }

        if (!this.touchControls.active || event.touches.length === 0) return;

        const touch = event.touches[0];
        this.touchControls.currentX = touch.clientX;
        this.touchControls.currentY = touch.clientY;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Calculate deltas
        const deltaX = this.touchControls.currentX - this.touchControls.startX;
        const deltaY = this.touchControls.currentY - this.touchControls.startY;

        // Normalize based on screen size to get values between -1 and 1
        const normalizedDeltaX = Math.max(-1, Math.min(1, deltaX / (screenWidth / 4)));
        const normalizedDeltaY = Math.max(-1, Math.min(1, deltaY / (screenHeight / 4)));

        // If on the left side of the screen, control the plane
        if (touch.clientX < screenWidth / 2) {
            // Vertical movement controls throttle
            this.touchControls.throttle = -normalizedDeltaY;

            // Horizontal movement controls roll
            this.touchControls.roll = normalizedDeltaX;

            // Emit continuous events for flight controls
            if (this.touchControls.throttle > 0.2) {
                this.eventBus.emit('input.action', { action: 'throttleUp', state: 'down' });
            } else if (this.touchControls.throttle < -0.2) {
                this.eventBus.emit('input.action', { action: 'throttleDown', state: 'down' });
            }

            if (this.touchControls.roll > 0.2) {
                this.eventBus.emit('input.action', { action: 'rollRight', state: 'down' });
            } else if (this.touchControls.roll < -0.2) {
                this.eventBus.emit('input.action', { action: 'rollLeft', state: 'down' });
            }

            // Update visual feedback
            this.updateTouchFeedback('left', normalizedDeltaX, normalizedDeltaY);
        }
        // If on the right side, control camera and pitch/yaw
        else {
            // Update last interaction time for camera
            this.lastUserInteractionTime = performance.now();

            // Pitch and yaw controls
            this.touchControls.pitch = normalizedDeltaY;
            this.touchControls.yaw = normalizedDeltaX;

            if (this.touchControls.pitch > 0.2) {
                this.eventBus.emit('input.action', { action: 'pitchUp', state: 'down' });
            } else if (this.touchControls.pitch < -0.2) {
                this.eventBus.emit('input.action', { action: 'pitchDown', state: 'down' });
            }

            if (this.touchControls.yaw > 0.2) {
                this.eventBus.emit('input.action', { action: 'yawRight', state: 'down' });
            } else if (this.touchControls.yaw < -0.2) {
                this.eventBus.emit('input.action', { action: 'yawLeft', state: 'down' });
            }

            // Update visual feedback
            this.updateTouchFeedback('right', normalizedDeltaX, normalizedDeltaY);
        }
    }

    /**
     * Handle touch end events for mobile controls
     * @param {TouchEvent} event - The touch event
     */
    onTouchEnd(event) {
        // Don't prevent default on elements that should be interactive
        if (!this.isTouchingUIElement(event)) {
            event.preventDefault();
        }

        this.touchControls.active = false;

        // Reset all controls
        this.touchControls.throttle = 0;
        this.touchControls.roll = 0;
        this.touchControls.pitch = 0;
        this.touchControls.yaw = 0;

        // Reset camera control
        this.isUserControllingCamera = false;
        this.eventBus.emit('camera.control', { isManual: false });

        // Reset all actions to up state
        this.eventBus.emit('input.action', { action: 'throttleUp', state: 'up' });
        this.eventBus.emit('input.action', { action: 'throttleDown', state: 'up' });
        this.eventBus.emit('input.action', { action: 'rollRight', state: 'up' });
        this.eventBus.emit('input.action', { action: 'rollLeft', state: 'up' });
        this.eventBus.emit('input.action', { action: 'pitchUp', state: 'up' });
        this.eventBus.emit('input.action', { action: 'pitchDown', state: 'up' });
        this.eventBus.emit('input.action', { action: 'yawRight', state: 'up' });
        this.eventBus.emit('input.action', { action: 'yawLeft', state: 'up' });

        // Remove touch feedback
        this.removeTouchFeedback();
    }

    /**
     * Check if a touch event is touching a UI element that should handle its own events
     * @param {TouchEvent} event - The touch event
     * @returns {boolean} True if touching a UI element
     */
    isTouchingUIElement(event) {
        if (!event.touches || event.touches.length === 0) return false;

        const touch = event.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);

        // Check if the element or its parents are UI elements
        let currentElement = element;
        while (currentElement) {
            // Check class name for common UI elements
            if (currentElement.className && (
                currentElement.className.includes('button') ||
                currentElement.className.includes('menu') ||
                currentElement.className.includes('ui-') ||
                currentElement.className.includes('hud')
            )) {
                return true;
            }

            // Move up the DOM tree
            currentElement = currentElement.parentElement;
        }

        return false;
    }

    /**
     * Shows touch feedback for better user experience
     * @param {number} x - X coordinate of touch
     * @param {number} y - Y coordinate of touch
     * @param {string} side - Which side of the screen ('left' or 'right')
     */
    showTouchFeedback(x, y, side) {
        // Remove any existing feedback
        this.removeTouchFeedback();

        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `touch-feedback ${side}-control`;
        feedback.style.position = 'fixed';
        feedback.style.left = `${x}px`;
        feedback.style.top = `${y}px`;
        feedback.style.transform = 'translate(-50%, -50%)';
        feedback.style.width = '60px';
        feedback.style.height = '60px';
        feedback.style.borderRadius = '50%';
        feedback.style.border = '2px solid rgba(248, 215, 66, 0.7)';
        feedback.style.pointerEvents = 'none';
        feedback.style.zIndex = '1000';

        // Add direction indicator
        const indicator = document.createElement('div');
        indicator.className = 'touch-indicator';
        indicator.style.position = 'absolute';
        indicator.style.left = '50%';
        indicator.style.top = '50%';
        indicator.style.width = '10px';
        indicator.style.height = '10px';
        indicator.style.borderRadius = '50%';
        indicator.style.backgroundColor = 'rgba(248, 215, 66, 0.9)';
        indicator.style.transform = 'translate(-50%, -50%)';

        feedback.appendChild(indicator);
        document.body.appendChild(feedback);
    }

    /**
     * Updates the touch feedback visualization
     * @param {string} side - Which side of the screen ('left' or 'right')
     * @param {number} deltaX - Normalized X delta (-1 to 1)
     * @param {number} deltaY - Normalized Y delta (-1 to 1)
     */
    updateTouchFeedback(side, deltaX, deltaY) {
        const feedback = document.querySelector(`.touch-feedback.${side}-control`);
        if (!feedback) return;

        const indicator = feedback.querySelector('.touch-indicator');
        if (!indicator) return;

        // Calculate position within the circular feedback (max 20px from center)
        const maxDistance = 20;
        const x = deltaX * maxDistance;
        const y = deltaY * maxDistance;

        // Update indicator position
        indicator.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }

    /**
     * Removes touch feedback elements
     */
    removeTouchFeedback() {
        const feedbacks = document.querySelectorAll('.touch-feedback');
        feedbacks.forEach(el => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }

    /**
     * Get the current input state
     * @returns {Object} Current input state
     */
    getInputState() {
        return {
            keysPressed: this.keysPressed,
            isUserControllingCamera: this.isUserControllingCamera,
            lastUserInteractionTime: this.lastUserInteractionTime,
            touchControls: this.touchControls
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
} 