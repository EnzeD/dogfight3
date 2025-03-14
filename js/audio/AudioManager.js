// Audio Manager for handling game audio
import * as THREE from 'three';

export default class AudioManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // Audio context and nodes
        this.audioContext = null;
        this.engineComponents = null;
        this.engineGainNode = null;

        // Audio state
        this.isSoundInitialized = false;
        this.isAudioStarted = false;
        this.isMuted = false;
        this.autoplayAttempted = false;

        // For listener tracking
        this.lastListenerUpdateTime = 0;
        this.listenerUpdateInterval = 16; // Update every 16ms (approx 60fps)
        this.listenerHasBeenUpdated = false; // Track if listener was ever positioned

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
        // Don't reinitialize if already done
        if (this.audioContext) {
            return;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.error('Web Audio API not supported by browser');
                return;
            }

            // Create audio context
            this.audioContext = new AudioContext();

            // Initialize the listener position to the origin (0,0,0)
            if (this.audioContext.listener) {
                if (this.audioContext.listener.positionX) {
                    // Modern API
                    this.audioContext.listener.positionX.value = 0;
                    this.audioContext.listener.positionY.value = 0;
                    this.audioContext.listener.positionZ.value = 0;

                    // Set forward/up orientation (looking forward along negative Z axis)
                    this.audioContext.listener.forwardX.value = 0;
                    this.audioContext.listener.forwardY.value = 0;
                    this.audioContext.listener.forwardZ.value = -1;
                    this.audioContext.listener.upX.value = 0;
                    this.audioContext.listener.upY.value = 1;
                    this.audioContext.listener.upZ.value = 0;
                } else {
                    // Legacy API
                    this.audioContext.listener.setPosition(0, 0, 0);
                    this.audioContext.listener.setOrientation(0, 0, -1, 0, 1, 0);
                }
                console.log('Audio listener initialized at origin position');
            }

            // Create main gain node for engine sound
            this.engineGainNode = this.audioContext.createGain();
            this.engineGainNode.gain.value = 0;

            // Create effects chain for the engine sound
            this.engineLowpassFilter = this.audioContext.createBiquadFilter();
            this.engineLowpassFilter.type = 'lowpass';
            this.engineLowpassFilter.frequency.value = 800;
            this.engineLowpassFilter.Q.value = 1;

            this.engineHighpassFilter = this.audioContext.createBiquadFilter();
            this.engineHighpassFilter.type = 'highpass';
            this.engineHighpassFilter.frequency.value = 80;

            // Small amount of distortion for richness
            this.engineDistortion = this.audioContext.createWaveShaper();
            this.engineDistortion.curve = this.makeDistortionCurve(5);

            // Engine vibration effect
            this.engineVibrato = this.audioContext.createGain();
            this.engineVibrato.gain.value = 1.0;

            // Connect the chain
            this.engineGainNode.connect(this.engineVibrato);
            this.engineVibrato.connect(this.engineDistortion);
            this.engineDistortion.connect(this.engineLowpassFilter);
            this.engineLowpassFilter.connect(this.engineHighpassFilter);
            this.engineHighpassFilter.connect(this.audioContext.destination);

            this.isSoundInitialized = true;

            // Load engine sound
            this.loadEngineSound();
        } catch (error) {
            console.error('Error creating AudioContext:', error);
        }
    }

    /**
     * Load the engine sound
     */
    loadEngineSound() {
        // Engine sound components
        this.engineComponents = {
            // Main core engine tone (lower frequency)
            core: {
                oscillator: this.audioContext.createOscillator(),
                gain: this.audioContext.createGain()
            },
            // Higher frequency component for engine whine
            whine: {
                oscillator: this.audioContext.createOscillator(),
                gain: this.audioContext.createGain()
            },
            // Rumble component for low end
            rumble: {
                oscillator: this.audioContext.createOscillator(),
                gain: this.audioContext.createGain()
            },
            // Noise component for realism
            noise: {
                node: null,
                gain: this.audioContext.createGain()
            }
        };

        // Initialize core oscillator (primary engine sound)
        const core = this.engineComponents.core;
        core.oscillator.type = 'sawtooth';
        core.oscillator.frequency.value = 55;
        core.gain.gain.value = 0.3;
        core.oscillator.connect(core.gain);
        core.gain.connect(this.engineGainNode);

        // Initialize whine oscillator (higher pitched component)
        const whine = this.engineComponents.whine;
        whine.oscillator.type = 'triangle';
        whine.oscillator.frequency.value = 85;
        whine.gain.gain.value = 0.03;
        whine.oscillator.connect(whine.gain);
        whine.gain.connect(this.engineGainNode);

        // Initialize rumble oscillator (low frequency component)
        const rumble = this.engineComponents.rumble;
        rumble.oscillator.type = 'sine';
        rumble.oscillator.frequency.value = 30;
        rumble.gain.gain.value = 0.6;
        rumble.oscillator.connect(rumble.gain);
        rumble.gain.connect(this.engineGainNode);

        // Create noise component for added texture
        const noise = this.engineComponents.noise;
        const noiseNode = this.audioContext.createBufferSource();
        noiseNode.buffer = this.createNoiseBuffer();
        noiseNode.loop = true;
        noise.node = noiseNode;
        noise.gain.gain.value = 0.05;
        noiseNode.connect(noise.gain);
        noise.gain.connect(this.engineGainNode);

        // Setup LFO for subtle pitch variations
        this.engineLFO = this.audioContext.createOscillator();
        this.engineLFO.type = 'sine';
        this.engineLFO.frequency.value = 4.5;

        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 5.0;

        this.engineLFO.connect(lfoGain);

        // Add subtle pitch variations to the whine component
        lfoGain.connect(whine.oscillator.detune);

        // Start the LFO
        this.engineLFO.start();
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
        if (!this.engineComponents) return;

        Object.values(this.engineComponents).forEach(component => {
            if (component.oscillator && component.oscillator.state !== 'running') {
                component.oscillator.start();
            } else if (component.node && component.node.state !== 'running') {
                component.node.start();
            }
        });

        // Start with a slight fade-in
        if (this.engineGainNode) {
            this.engineGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.engineGainNode.gain.linearRampToValueAtTime(
                0.1,
                this.audioContext.currentTime + 0.5
            );
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
     * Update audio system each frame
     * @param {Object} plane - The player's plane
     */
    update(plane) {
        // First check if audio is started at all
        if (!this.isAudioStarted) {
            return;
        }

        // Update listener position if we have a valid audio context and plane
        if (this.audioContext && plane) {
            this.updateListenerPosition(plane);
        }

        // Skip engine sound updates if sound isn't fully initialized or is muted
        if (!this.isSoundInitialized || this.isMuted) {
            return;
        }

        // Update engine sound based on speed
        if (this.engineComponents && plane) {
            const speedFactor = plane.speed / plane.maxSpeed;

            // Update LFO rate based on speed
            if (this.engineLFO) {
                // LFO gets faster at higher speeds
                const baseLfoRate = 3;
                const maxLfoRate = 7;
                this.engineLFO.frequency.value = baseLfoRate + (maxLfoRate - baseLfoRate) * speedFactor;
            }

            // Core engine tone
            if (this.engineComponents.core) {
                const core = this.engineComponents.core;
                // Adjust frequency based on speed
                const baseCoreFreq = 60;
                const maxCoreFreq = 120;
                const coreFreq = baseCoreFreq + (maxCoreFreq - baseCoreFreq) * speedFactor;
                core.oscillator.frequency.setTargetAtTime(coreFreq, this.audioContext.currentTime, 0.1);

                // Adjust volume based on speed
                const minCoreVol = 0.2;
                const maxCoreVol = 0.4;
                const coreVol = minCoreVol + (maxCoreVol - minCoreVol) * speedFactor;
                core.gain.gain.setTargetAtTime(coreVol, this.audioContext.currentTime, 0.1);
            }

            // Whine component
            if (this.engineComponents.whine) {
                const whine = this.engineComponents.whine;
                // Whine gets higher pitched with speed
                const baseWhineFreq = 65;
                const maxWhineFreq = 280;
                const whineFreq = baseWhineFreq + (maxWhineFreq - baseWhineFreq) * (speedFactor * speedFactor);
                whine.oscillator.frequency.setTargetAtTime(whineFreq, this.audioContext.currentTime, 0.1);

                // Whine gets louder at high speeds
                const minWhineVol = 0.02;
                const maxWhineVol = 0.08;
                let whineVol = minWhineVol;
                if (speedFactor > 0.7) {
                    const whineSpeedFactor = (speedFactor - 0.7) / 0.3;
                    whineVol = minWhineVol + (maxWhineVol - minWhineVol) * whineSpeedFactor;
                }
                whine.gain.gain.setTargetAtTime(whineVol, this.audioContext.currentTime, 0.1);
            }

            // Rumble component
            if (this.engineComponents.rumble) {
                const rumble = this.engineComponents.rumble;
                // Rumble frequency increases with speed
                const baseRumbleFreq = 20;
                const maxRumbleFreq = 45;
                const rumbleFreq = baseRumbleFreq + (maxRumbleFreq - baseRumbleFreq) * speedFactor;
                rumble.oscillator.frequency.setTargetAtTime(rumbleFreq, this.audioContext.currentTime, 0.1);

                // Even stronger rumble present throughout the speed range
                const maxRumbleVol = 0.7;
                // More consistent rumble across speed range
                const rumbleVolCurve = 1 - Math.abs(speedFactor - 0.4) * 0.5;
                const rumbleVol = Math.max(0.3, maxRumbleVol * rumbleVolCurve);
                rumble.gain.gain.setTargetAtTime(rumbleVol, this.audioContext.currentTime, 0.1);
            }

            // Noise component
            if (this.engineComponents.noise) {
                const noise = this.engineComponents.noise;
                // Noise increases with speed
                const minNoiseVol = 0.02;
                const maxNoiseVol = 0.08;
                const noiseVol = minNoiseVol + (maxNoiseVol - minNoiseVol) * speedFactor;
                noise.gain.gain.setTargetAtTime(noiseVol, this.audioContext.currentTime, 0.1);
            }

            // Update filter frequencies
            const baseLowpass = 400;
            const maxLowpass = 1500;
            this.engineLowpassFilter.frequency.setTargetAtTime(
                baseLowpass + (maxLowpass - baseLowpass) * speedFactor,
                this.audioContext.currentTime,
                0.1
            );

            // Overall engine volume
            const minVolume = 0.05;
            const maxVolume = 0.15; // Slightly reduced to avoid being too loud
            const volume = minVolume + (maxVolume - minVolume) * speedFactor;
            this.engineGainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);

            // Add vibrato effect that increases with speed
            // Makes engine sound "shake" more at higher speeds
            const vibratoFreq = 1.8 + speedFactor * 14;
            const vibratoTime = this.audioContext.currentTime;
            // Further increased gain oscillation depth
            this.engineVibrato.gain.setValueAtTime(
                1.0 + 0.25 * speedFactor * Math.sin(vibratoTime * vibratoFreq),
                vibratoTime
            );
        }
    }

    /**
     * Update the audio listener position to match the player's position
     * @param {Object} plane - The player's plane
     */
    updateListenerPosition(plane) {
        if (!this.audioContext || !this.audioContext.listener) {
            console.warn('Audio context or listener not available for position update');
            return;
        }

        if (!plane) {
            console.warn('No plane provided for listener position update');
            return;
        }

        if (!plane.mesh) {
            console.warn('Plane has no mesh for listener position update');
            return;
        }

        try {
            // Get current time
            const now = performance.now();

            // Always update on first call, then throttle updates
            if (!this.listenerHasBeenUpdated || now - this.lastListenerUpdateTime >= this.listenerUpdateInterval) {
                this.lastListenerUpdateTime = now;

                // Get player's position
                const position = plane.mesh.position.clone();

                // Get player's forward and up vectors
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(plane.mesh.quaternion).normalize();
                const up = new THREE.Vector3(0, 1, 0).applyQuaternion(plane.mesh.quaternion).normalize();

                // Log first update and occasionally log additional updates
                if (!this.listenerHasBeenUpdated) {
                    console.log(`FIRST audio listener position set to: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
                } else if (Math.random() < 0.01) { // Log only 1% of the time to avoid console spam
                    console.log(`Audio listener position updated to: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
                }

                // Set listener position
                if (this.audioContext.listener.positionX) {
                    // Modern API
                    this.audioContext.listener.positionX.value = position.x;
                    this.audioContext.listener.positionY.value = position.y;
                    this.audioContext.listener.positionZ.value = position.z;

                    // Set orientation (forward and up vectors)
                    this.audioContext.listener.forwardX.value = forward.x;
                    this.audioContext.listener.forwardY.value = forward.y;
                    this.audioContext.listener.forwardZ.value = forward.z;
                    this.audioContext.listener.upX.value = up.x;
                    this.audioContext.listener.upY.value = up.y;
                    this.audioContext.listener.upZ.value = up.z;
                } else {
                    // Legacy API
                    this.audioContext.listener.setPosition(position.x, position.y, position.z);
                    this.audioContext.listener.setOrientation(
                        forward.x, forward.y, forward.z,
                        up.x, up.y, up.z
                    );
                }

                // Mark that the listener has been updated
                this.listenerHasBeenUpdated = true;
            }
        } catch (error) {
            console.warn('Error updating audio listener position:', error);
        }
    }

    /**
     * Add sound toggle button
     */
    addSoundToggle() {
        // Don't add sound toggle button on mobile
        if (this.isMobile()) {
            return;
        }

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
     * Add audio enabler button
     */
    addAudioEnabler() {
        // Don't add audio enabler button on mobile
        if (this.isMobile()) {
            return;
        }

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
     * Check if the device is mobile
     * @returns {boolean} True if mobile device
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
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
     * @param {number} volumeFactor - Optional volume factor based on distance (0-1)
     * @param {Object} options - Optional settings like position
     */
    playGunfireSound(volumeFactor = 1.0, options = {}) {
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

            // Ensure volumeFactor is a valid number between 0 and 1
            if (typeof volumeFactor !== 'number' || isNaN(volumeFactor)) {
                volumeFactor = 1.0;
            }
            volumeFactor = Math.max(0, Math.min(1, volumeFactor));

            // Create gain node with distance-based attenuation
            const gainNode = this.audioContext.createGain();
            const baseVolume = 0.4; // Base volume for local gunfire
            gainNode.gain.value = baseVolume * volumeFactor;

            // Get planeId for logging
            const planeId = options.planeId || 'unknown';

            console.log(`Playing gunfire for ${planeId} with volume factor: ${volumeFactor.toFixed(2)}, final gain: ${gainNode.gain.value.toFixed(2)}`);

            // Optional: Add lowpass filter to soften harshness
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';

            // Apply more filtering to distant sounds to simulate air absorption
            if (volumeFactor < 0.7) {
                // Lower frequencies pass through better at a distance
                filter.frequency.value = 2000 + (volumeFactor * 2000); // 2000-4000Hz based on distance
            } else {
                filter.frequency.value = 4000; // Normal close-range value
            }

            // Create a panner node for spatial audio if position is provided
            let panner = null;
            if (options && options.position && this.audioContext.createPanner) {
                try {
                    const position = options.position;

                    // Debug the position we're using for audio
                    console.log(`Creating spatial audio for gunfire at: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);

                    panner = this.audioContext.createPanner();
                    panner.panningModel = 'HRTF'; // Higher quality 3D spatial model
                    panner.distanceModel = 'exponential';
                    panner.refDistance = 100;
                    panner.maxDistance = 2000;
                    panner.rolloffFactor = 1.5;

                    // Set the position of the sound
                    panner.setPosition(
                        position.x || 0,
                        position.y || 0,
                        position.z || 0
                    );
                } catch (error) {
                    console.warn('Spatial audio not supported, falling back to stereo', error);
                    panner = null;
                }
            } else {
                // Log why we're not using spatial audio
                const reason = !options ? 'no options' :
                    !options.position ? 'no position' :
                        !this.audioContext.createPanner ? 'no panner support' :
                            'unknown';
                console.log(`Not using spatial audio for gunfire: ${reason}`);
            }

            // Create a simple reverb effect for spatial feel
            try {
                const convolver = this.audioContext.createConvolver();
                const reverbBuffer = this.createReverbEffect(0.1); // Short reverb
                convolver.buffer = reverbBuffer;

                // Connect nodes
                source.connect(filter);
                filter.connect(gainNode);

                // Mix dry/wet signal for reverb
                const dryGain = this.audioContext.createGain();
                const wetGain = this.audioContext.createGain();
                dryGain.gain.value = 0.8;
                wetGain.gain.value = 0.2;

                // If we have a panner, insert it in the chain
                if (panner) {
                    gainNode.connect(panner);
                    panner.connect(dryGain);
                    panner.connect(convolver);
                } else {
                    gainNode.connect(dryGain);
                    gainNode.connect(convolver);
                }

                convolver.connect(wetGain);
                dryGain.connect(this.audioContext.destination);
                wetGain.connect(this.audioContext.destination);
            } catch (error) {
                // Fallback without reverb if convolver fails
                console.warn('Reverb unavailable, using basic sound', error);
                source.connect(filter);
                filter.connect(gainNode);

                // If we have a panner, insert it in the chain
                if (panner) {
                    gainNode.connect(panner);
                    panner.connect(this.audioContext.destination);
                } else {
                    gainNode.connect(this.audioContext.destination);
                }
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
     * Create hit sound effect
     * @returns {AudioBufferSourceNode} The hit sound source
     */
    createHitSound() {
        if (!this.audioContext || !this.isAudioStarted) return null;

        try {
            // Create an audio buffer source
            const hitSound = this.audioContext.createOscillator();
            const hitGain = this.audioContext.createGain();

            // Configure oscillator for a "hit" sound
            hitSound.type = 'square';
            hitSound.frequency.setValueAtTime(120, this.audioContext.currentTime);
            hitSound.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.1);

            // Configure gain node (for volume envelope)
            hitGain.gain.setValueAtTime(0.7, this.audioContext.currentTime);
            hitGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

            // Add distortion for a "hit" character
            const distortion = this.audioContext.createWaveShaper();
            distortion.curve = this.makeDistortionCurve(100);

            // Create a low-pass filter for a "thud" quality
            const lowpass = this.audioContext.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(800, this.audioContext.currentTime);
            lowpass.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.1);

            // Connect the nodes
            hitSound.connect(distortion);
            distortion.connect(lowpass);
            lowpass.connect(hitGain);
            hitGain.connect(this.audioContext.destination);

            return {
                oscillator: hitSound,
                gain: hitGain,
                lowpass: lowpass,
                distortion: distortion
            };
        } catch (error) {
            console.error('Error creating hit sound:', error);
            return null;
        }
    }

    /**
     * Make a distortion curve for the hit sound
     * @param {number} amount - Amount of distortion
     * @returns {Float32Array} Distortion curve
     */
    makeDistortionCurve(amount) {
        const k = amount;
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < samples; ++i) {
            const x = i * 2 / samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }

        return curve;
    }

    /**
     * Play hit sound effect
     */
    playHitSound() {
        if (!this.audioContext || !this.isAudioStarted) return;

        try {
            const hitSoundNodes = this.createHitSound();
            if (!hitSoundNodes) return;

            // Start the oscillator
            hitSoundNodes.oscillator.start();

            // Stop after a short duration
            hitSoundNodes.oscillator.stop(this.audioContext.currentTime + 0.15);

            // Cleanup after sound finishes
            setTimeout(() => {
                hitSoundNodes.oscillator.disconnect();
                hitSoundNodes.gain.disconnect();
                hitSoundNodes.lowpass.disconnect();
                hitSoundNodes.distortion.disconnect();
            }, 200);

        } catch (error) {
            console.error('Error playing hit sound:', error);
        }
    }

    /**
     * Create explosion sound effect
     * @returns {Object} Audio nodes for the explosion sound
     */
    createExplosionSound() {
        if (!this.audioContext || !this.isAudioStarted) return null;

        try {
            // Create oscillators for a complex explosion sound
            const lowOscillator = this.audioContext.createOscillator();
            const noiseBuffer = this.createNoiseBuffer();
            const noiseSource = this.audioContext.createBufferSource();

            // Create gain nodes for volume control
            const mainGain = this.audioContext.createGain();
            const lowGain = this.audioContext.createGain();
            const noiseGain = this.audioContext.createGain();

            // Configure low rumble oscillator
            lowOscillator.type = 'sine';
            lowOscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
            lowOscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 1.5);

            // Configure noise
            noiseSource.buffer = noiseBuffer;

            // Configure gain envelope
            mainGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            mainGain.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + 0.1); // Fast attack
            mainGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2.0); // Long decay

            // Set individual component gains
            lowGain.gain.setValueAtTime(0.7, this.audioContext.currentTime);
            noiseGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

            // Create a compressor for more punch
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-10, this.audioContext.currentTime);
            compressor.knee.setValueAtTime(10, this.audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
            compressor.attack.setValueAtTime(0, this.audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

            // Create a low-pass filter
            const lowpass = this.audioContext.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(800, this.audioContext.currentTime);
            lowpass.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 1.0);

            // Distortion for more grit
            const distortion = this.audioContext.createWaveShaper();
            distortion.curve = this.makeDistortionCurve(100);

            // Connect the nodes
            lowOscillator.connect(lowGain);
            noiseSource.connect(noiseGain);

            lowGain.connect(mainGain);
            noiseGain.connect(mainGain);

            mainGain.connect(distortion);
            distortion.connect(lowpass);
            lowpass.connect(compressor);
            compressor.connect(this.audioContext.destination);

            return {
                lowOscillator: lowOscillator,
                noiseSource: noiseSource,
                lowGain: lowGain,
                noiseGain: noiseGain,
                mainGain: mainGain,
                compressor: compressor,
                lowpass: lowpass,
                distortion: distortion
            };
        } catch (error) {
            console.error('Error creating explosion sound:', error);
            return null;
        }
    }

    /**
     * Create a noise buffer for explosion sound
     * @returns {AudioBuffer} Buffer containing noise
     */
    createNoiseBuffer() {
        // Create a 1-second buffer of noise
        const bufferSize = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    /**
     * Play explosion sound effect
     */
    playExplosionSound() {
        if (!this.audioContext || !this.isAudioStarted || this.isMuted) return;

        try {
            const explosionNodes = this.createExplosionSound();
            if (!explosionNodes) return;

            // Start the sound sources
            explosionNodes.lowOscillator.start();
            explosionNodes.noiseSource.start();

            // Stop after duration
            explosionNodes.lowOscillator.stop(this.audioContext.currentTime + 2.0);
            explosionNodes.noiseSource.stop(this.audioContext.currentTime + 2.0);

            // Cleanup
            setTimeout(() => {
                try {
                    explosionNodes.lowOscillator.disconnect();
                    explosionNodes.noiseSource.disconnect();
                    explosionNodes.lowGain.disconnect();
                    explosionNodes.noiseGain.disconnect();
                    explosionNodes.mainGain.disconnect();
                    explosionNodes.compressor.disconnect();
                    explosionNodes.lowpass.disconnect();
                    explosionNodes.distortion.disconnect();
                } catch (e) {
                    console.error('Error cleaning up explosion sound nodes:', e);
                }
            }, 3000);

        } catch (error) {
            console.error('Error playing explosion sound:', error);
        }
    }

    /**
     * Set up event listeners for audio events
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

        // Listen for sound toggle event from settings menu
        this.eventBus.on('sound.toggle', () => {
            this.toggleSound();
        });

        // Listen for sound events
        this.eventBus.on('sound.play', (data) => {
            // Process gunfire sound events
            if (data.sound === 'gunfire') {
                // Extract audio options from data
                const options = {
                    position: data.position || null,
                    distance: data.distance || 0,
                    planeId: data.planeId || 'local'  // Track which plane is firing
                };

                // Log detailed debugging for spatial sound setup
                if (options.position) {
                    console.log(`Gunfire event from ${options.planeId} with position:`, options.position);
                }

                // Ensure audio is started
                if (!this.isAudioStarted) {
                    console.log(`Gunfire event from ${options.planeId} received, initializing audio`);
                    this.startAudio();
                    // Small delay to allow audio initialization before playing
                    setTimeout(() => {
                        this.playGunfireSound(data.volumeFactor, options);
                    }, 100);
                } else {
                    this.playGunfireSound(data.volumeFactor, options);
                }
            }

            // Handle hit sound effects
            if (data.sound === 'hit') {
                // Ensure audio is started
                if (!this.isAudioStarted) {
                    console.log('Hit sound event received, initializing audio');
                    this.startAudio();
                }
                this.playHitSound();
            }

            // Handle explosion sound effects
            if (data.sound === 'explosion') {
                // Ensure audio is started
                if (!this.isAudioStarted) {
                    console.log('Explosion sound event received, initializing audio');
                    this.startAudio();
                }
                this.playExplosionSound();
            }
        });
    }
}