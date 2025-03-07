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

        // Don't attempt autoplay - removed to prevent automatic sound starting
        // this.attemptAutoplay();

        console.log('AudioManager initialized');
    }

    /**
     * Attempt to autoplay audio - this is now only called when explicitly requested
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

        // No longer try to start audio immediately
        // We'll wait for explicit user interaction
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
        enablerButton.style.top = '10px';
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
        enablerButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';

        // Set button text
        enablerButton.textContent = 'Click to Enable Audio';

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
        soundToggle.style.top = '10px';
        soundToggle.style.right = '200px'; // Increased to prevent overlap
        soundToggle.style.padding = '10px 15px';
        soundToggle.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        soundToggle.style.color = 'white';
        soundToggle.style.border = 'none';
        soundToggle.style.borderRadius = '5px';
        soundToggle.style.cursor = 'pointer';
        soundToggle.style.fontFamily = 'Arial, sans-serif';
        soundToggle.style.fontSize = '14px';
        soundToggle.style.zIndex = '1000';
        soundToggle.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
        soundToggle.style.whiteSpace = 'nowrap'; // Prevent text wrapping

        // Set button text - include mute key information
        soundToggle.innerHTML = '🔊 <small>(or press \'M\')</small>';

        // Add click event
        soundToggle.addEventListener('click', () => {
            this.toggleSound();
        });

        // Add to document
        document.body.appendChild(soundToggle);
    }

    /**
     * Create a synthetic gunfire sound
     * @returns {AudioBuffer} The generated gunfire sound buffer
     */
    createGunfireSound() {
        try {
            // Create short buffer for gunfire sound
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.15; // Slightly longer for more impact
            const bufferSize = sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
            const data = buffer.getChannelData(0);

            // Create a more realistic gunfire sound
            for (let i = 0; i < bufferSize; i++) {
                // Amplitude envelope with initial attack
                const t = i / bufferSize;

                // Create a sharp attack followed by quick decay
                let amplitude;
                if (t < 0.05) {
                    // Initial explosion/crack (sharp attack)
                    amplitude = 0.9 + 0.1 * Math.sin(t * 120);
                } else {
                    // Decay phase with oscillation
                    const decay = Math.exp(-15 * (t - 0.05));
                    amplitude = decay * 0.9;
                }

                // Mix different noise types for richer sound
                // White noise + lower frequency components
                const noise = Math.random() * 2 - 1;
                const lowFreq = Math.sin(i * 0.02) * 0.1;
                const midFreq = Math.sin(i * 0.2) * 0.05;

                // Combine components with amplitude envelope
                data[i] = amplitude * (noise * 0.8 + lowFreq + midFreq);
            }

            // Apply slight distortion for more edge
            for (let i = 0; i < bufferSize; i++) {
                // Soft clipping for a bit of distortion
                data[i] = Math.tanh(data[i] * 1.5);
            }

            return buffer;
        } catch (error) {
            console.error('Error creating gunfire sound:', error);
            return null;
        }
    }

    /**
     * Play gunfire sound
     */
    playGunfireSound() {
        if (!this.isAudioStarted || this.isMuted) {
            console.log('Cannot play gunfire sound: audio not started or muted');
            return;
        }

        try {
            // Create the gunfire sound buffer on demand
            const gunfireBuffer = this.createGunfireSound();
            if (!gunfireBuffer) {
                console.error('Failed to create gunfire sound');
                return;
            }

            // Create source and gain nodes
            const source = this.audioContext.createBufferSource();
            source.buffer = gunfireBuffer;

            // Add slight pitch variation for more realistic machine gun effect
            source.detune.value = (Math.random() * 200 - 100); // Random detune +/- 100 cents

            // Create gain node
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0.4; // Slightly lower volume to avoid clipping

            // Optional: Add lowpass filter to soften harshness
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 4000;

            // Create a simple reverb effect for spatial feel
            try {
                const convolver = this.audioContext.createConvolver();
                const reverbBuffer = this.createReverbEffect(0.1); // Short reverb
                convolver.buffer = reverbBuffer;

                // Connect nodes with reverb
                source.connect(filter);
                filter.connect(gainNode);

                // Mix dry/wet signal for reverb
                const dryGain = this.audioContext.createGain();
                const wetGain = this.audioContext.createGain();
                dryGain.gain.value = 0.8;
                wetGain.gain.value = 0.2;

                gainNode.connect(dryGain);
                gainNode.connect(convolver);
                convolver.connect(wetGain);

                dryGain.connect(this.audioContext.destination);
                wetGain.connect(this.audioContext.destination);
            } catch (error) {
                // Fallback without reverb if convolver fails
                console.warn('Reverb unavailable, using basic sound', error);
                source.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
            }

            // Play sound
            source.start(0);
            console.log('Enhanced gunfire sound played');
        } catch (error) {
            console.error('Error playing gunfire sound:', error);
        }
    }

    /**
     * Create a simple reverb effect
     * @param {number} duration - Duration in seconds
     * @returns {AudioBuffer} Reverb impulse response
     */
    createReverbEffect(duration) {
        // Create impulse response for reverb
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        const leftChannel = impulse.getChannelData(0);
        const rightChannel = impulse.getChannelData(1);

        // Fill with decaying noise
        for (let i = 0; i < length; i++) {
            const t = i / length;
            // Exponential decay
            const decay = Math.exp(-6 * t);

            // Random noise with decay
            leftChannel[i] = (Math.random() * 2 - 1) * decay;
            rightChannel[i] = (Math.random() * 2 - 1) * decay;
        }

        return impulse;
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

            // Also initialize audio on space key (firing)
            if (event.key === ' ' && !this.isAudioStarted) {
                console.log('Space key pressed, initializing audio');
                this.startAudio();
            }
        });

        // Listen for gunfire events
        this.eventBus.on('sound.play', (data) => {
            if (data.sound === 'gunfire') {
                // Ensure audio is started
                if (!this.isAudioStarted) {
                    console.log('Gunfire event received, initializing audio');
                    this.startAudio();
                    // Small delay to allow audio initialization before playing
                    setTimeout(() => {
                        this.playGunfireSound();
                    }, 100);
                } else {
                    this.playGunfireSound();
                }
            }
        });
    }
}