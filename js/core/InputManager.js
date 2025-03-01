// Input Manager for handling keyboard and mouse input
export default class InputManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // Input state
        this.keysPressed = {};
        this.isUserControllingCamera = false;
        this.lastUserInteractionTime = 0;

        // Key mappings
        this.keyMappings = {
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
            ' ': 'toggleAutoStabilization',
            'c': 'toggleCameraMode'
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

        console.log('InputManager initialized');
    }

    onKeyDown(event) {
        const key = event.key.toLowerCase();

        // Only process if the key wasn't already pressed (prevents key repeat)
        if (!this.keysPressed[key]) {
            this.keysPressed[key] = true;

            // Emit specific events for one-time actions
            const action = this.keyMappings[key];
            if (action) {
                this.eventBus.emit('input.action', { action, state: 'down' });
            }
        }
    }

    onKeyUp(event) {
        const key = event.key.toLowerCase();
        this.keysPressed[key] = false;

        // Emit key up event
        const action = this.keyMappings[key];
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
     * Get the current input state
     * @returns {Object} Current input state
     */
    getInputState() {
        return {
            keysPressed: this.keysPressed,
            isUserControllingCamera: this.isUserControllingCamera,
            lastUserInteractionTime: this.lastUserInteractionTime
        };
    }

    /**
     * Check if a specific action is active
     * @param {string} action - The action to check
     * @returns {boolean} Whether the action is active
     */
    isActionActive(action) {
        for (const [key, mappedAction] of Object.entries(this.keyMappings)) {
            if (mappedAction === action && this.keysPressed[key]) {
                return true;
            }
        }
        return false;
    }
} 