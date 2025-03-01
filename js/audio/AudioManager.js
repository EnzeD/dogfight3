// Audio Manager for handling game audio
export default class AudioManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // Audio context and nodes
        this.audioContext = null;
        this.engineSound = null;
        this.engineGainNode = null;

        // Audio state
        this.isSoundInitialized = false;
        this.isAudioStarted = false;
        this.isMuted = false;
        this.autoplayAttempted = false;

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Initialize the audio system
     */
    init() {
        // Create audio context
        this.initAudioContext();

        // Add audio enabler button (as fallback)
        this.addAudioEnabler();

        // Add sound toggle button
        this.addSoundToggle();

        // Try to autoplay
        this.attemptAutoplay();

        console.log('AudioManager initialized');
    }

    /**
     * Attempt to autoplay audio
     */
    attemptAutoplay() {
        // Only try once
        if (this.autoplayAttempted) return;
        this.autoplayAttempted = true;

        // Add a listener for any user interaction to enable audio
        const autoplayHandler = () => {
            // Start audio on first user interaction
            if (!this.isAudioStarted) {
                this.startAudio();

                // Remove the listeners after first interaction
                document.removeEventListener('click', autoplayHandler);
                document.removeEventListener('keydown', autoplayHandler);
                document.removeEventListener('touchstart', autoplayHandler);
            }
        };

        // Add listeners for common user interactions
        document.addEventListener('click', autoplayHandler);
        document.addEventListener('keydown', autoplayHandler);
        document.addEventListener('touchstart', autoplayHandler);

        // Try to start audio immediately (may be blocked by browser)
        setTimeout(() => {
            this.startAudio();
        }, 1000);
    }

    /**
     * Initialize the audio context
     */
    initAudioContext() {
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // Create gain node for engine sound
            this.engineGainNode = this.audioContext.createGain();
            this.engineGainNode.gain.value = 0;
            this.engineGainNode.connect(this.audioContext.destination);

            this.isSoundInitialized = true;

            // Load engine sound
            this.loadEngineSound();
        } catch (error) {
            console.error('Audio initialization failed:', error);
            this.eventBus.emit('notification', {
                message: 'Audio initialization failed',
                type: 'error'
            });
        }
    }

    /**
     * Load the engine sound
     */
    loadEngineSound() {
        // Create a simple oscillator for engine sound
        this.engineSound = this.audioContext.createOscillator();
        this.engineSound.type = 'sawtooth';
        this.engineSound.frequency.value = 10;
        this.engineSound.connect(this.engineGainNode);
    }

    /**
     * Start the audio system
     */
    startAudio() {
        if (this.isSoundInitialized && !this.isAudioStarted) {
            // Resume audio context (needed for Chrome's autoplay policy)
            this.audioContext.resume().then(() => {
                // Start engine sound
                this.startEngineSound();

                this.isAudioStarted = true;

                // Notify user
                this.eventBus.emit('notification', {
                    message: 'Audio enabled',
                    type: 'success'
                });

                // Update audio enabler button
                const enablerButton = document.getElementById('audio-enabler');
                if (enablerButton) {
                    enablerButton.style.display = 'none';
                }
            }).catch(error => {
                console.warn('Could not auto-start audio. User interaction required.', error);
            });
        }
    }

    /**
     * Start the engine sound
     */
    startEngineSound() {
        if (this.engineSound && this.engineSound.state !== 'running') {
            // Start the oscillator
            this.engineSound.start();
        }
    }

    /**
     * Toggle sound on/off
     */
    toggleSound() {
        this.isMuted = !this.isMuted;

        // Update gain value based on mute state
        if (this.engineGainNode) {
            this.engineGainNode.gain.value = this.isMuted ? 0 : 0.2;
        }

        // Update sound toggle button
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.innerHTML = this.isMuted ? '🔇' : '🔊';
        }

        // Notify user
        this.eventBus.emit('notification', {
            message: this.isMuted ? 'Sound muted' : 'Sound enabled',
            type: 'info'
        });
    }

    /**
     * Update audio based on game state
     * @param {Object} plane - The player's plane
     */
    update(plane) {
        if (!this.isSoundInitialized || !this.isAudioStarted || this.isMuted) {
            return;
        }

        // Update engine sound based on speed
        if (this.engineSound && plane) {
            // Adjust frequency based on speed
            const baseFrequency = 50;
            const maxFrequency = 100;
            const speedFactor = plane.speed / plane.maxSpeed;

            const frequency = baseFrequency + (maxFrequency - baseFrequency) * speedFactor;
            this.engineSound.frequency.value = frequency;

            // Adjust volume based on speed
            const minVolume = 0.05;
            const maxVolume = 0.2;
            const volume = minVolume + (maxVolume - minVolume) * speedFactor;

            this.engineGainNode.gain.value = volume;
        }
    }

    /**
     * Add audio enabler button
     */
    addAudioEnabler() {
        const enablerButton = document.createElement('button');
        enablerButton.id = 'audio-enabler';

        // Style the button
        enablerButton.style.position = 'absolute';
        enablerButton.style.bottom = '10px';
        enablerButton.style.right = '10px';
        enablerButton.style.padding = '10px 15px';
        enablerButton.style.backgroundColor = 'rgba(33, 150, 243, 0.8)';
        enablerButton.style.color = 'white';
        enablerButton.style.border = 'none';
        enablerButton.style.borderRadius = '5px';
        enablerButton.style.cursor = 'pointer';
        enablerButton.style.fontFamily = 'Arial, sans-serif';
        enablerButton.style.fontSize = '14px';
        enablerButton.style.zIndex = '1000';

        // Set button text
        enablerButton.textContent = 'Enable Audio';

        // Add click event
        enablerButton.addEventListener('click', () => {
            this.startAudio();
        });

        // Add to document
        document.body.appendChild(enablerButton);
    }

    /**
     * Add sound toggle button
     */
    addSoundToggle() {
        const soundToggle = document.createElement('button');
        soundToggle.id = 'sound-toggle';

        // Style the button
        soundToggle.style.position = 'absolute';
        soundToggle.style.bottom = '10px';
        soundToggle.style.right = '120px';
        soundToggle.style.width = '40px';
        soundToggle.style.height = '40px';
        soundToggle.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        soundToggle.style.color = 'white';
        soundToggle.style.border = 'none';
        soundToggle.style.borderRadius = '50%';
        soundToggle.style.cursor = 'pointer';
        soundToggle.style.fontSize = '20px';
        soundToggle.style.display = 'flex';
        soundToggle.style.alignItems = 'center';
        soundToggle.style.justifyContent = 'center';
        soundToggle.style.zIndex = '1000';

        // Set button text
        soundToggle.innerHTML = '🔊';

        // Add click event
        soundToggle.addEventListener('click', () => {
            this.toggleSound();
        });

        // Add to document
        document.body.appendChild(soundToggle);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for key events to toggle sound
        document.addEventListener('keydown', (event) => {
            if (event.key === 'm') {
                this.toggleSound();
            }
        });
    }
}