// Audio Manager for handling game audio
import * as THREE from 'three';

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

            // Create main gain node for engine sound
            this.engineGainNode = this.audioContext.createGain();
            this.engineGainNode.gain.value = 0;

            // Create effects chain for the engine sound
            this.engineLowpassFilter = this.audioContext.createBiquadFilter();
            this.engineLowpassFilter.type = 'lowpass';
            this.engineLowpassFilter.frequency.value = 600; // Lower from 800
            this.engineLowpassFilter.Q.value = 1;

            this.engineHighpassFilter = this.audioContext.createBiquadFilter();
            this.engineHighpassFilter.type = 'highpass';
            this.engineHighpassFilter.frequency.value = 60; // Lower from 80

            // Small amount of distortion for richness
            this.engineDistortion = this.audioContext.createWaveShaper();
            this.engineDistortion.curve = this.makeDistortionCurve(7); // Increased from 5

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
        core.oscillator.frequency.value = 55; // Lower from 60
        core.gain.gain.value = 0.25; // Lower from 0.3
        core.oscillator.connect(core.gain);
        core.gain.connect(this.engineGainNode);

        // Initialize whine oscillator (higher pitched component)
        const whine = this.engineComponents.whine;
        whine.oscillator.type = 'triangle';
        whine.oscillator.frequency.value = 80; // Lower from 100/120
        whine.gain.gain.value = 0.03; // Further reduced from 0.05
        whine.oscillator.connect(whine.gain);
        whine.gain.connect(this.engineGainNode);

        // Initialize rumble oscillator (low frequency component)
        const rumble = this.engineComponents.rumble;
        rumble.oscillator.type = 'sine';
        rumble.oscillator.frequency.value = 30; // Further lowered from 35
        rumble.gain.gain.value = 0.6; // Increased from 0.4
        rumble.oscillator.connect(rumble.gain);
        rumble.gain.connect(this.engineGainNode);

        // Create noise component for added texture
        const noise = this.engineComponents.noise;
        const noiseNode = this.audioContext.createBufferSource();
        noiseNode.buffer = this.createNoiseBuffer();
        noiseNode.loop = true;
        noise.node = noiseNode;
        noise.gain.gain.value = 0.07; // Increased from 0.05
        noiseNode.connect(noise.gain);
        noise.gain.connect(this.engineGainNode);

        // Setup LFO for subtle pitch variations
        this.engineLFO = this.audioContext.createOscillator();
        this.engineLFO.type = 'sine';
        this.engineLFO.frequency.value = 4; // Slightly reduced from 4.5

        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 5; // Increased from 3.5/2

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
     * Update audio based on game state
     * @param {Object} plane - The player's plane
     */
    update(plane) {
        if (!this.isSoundInitialized || !this.isAudioStarted || this.isMuted) {
            return;
        }

        // Update engine sound based on speed
        if (this.engineComponents && plane) {
            const speedFactor = plane.speed / plane.maxSpeed;

            // Update LFO rate based on speed
            if (this.engineLFO) {
                // LFO gets faster at higher speeds
                const baseLfoRate = 2.5; // Reduced from 3
                const maxLfoRate = 6; // Reduced from 7
                this.engineLFO.frequency.value = baseLfoRate + (maxLfoRate - baseLfoRate) * speedFactor;
            }

            // Core engine tone
            if (this.engineComponents.core) {
                const core = this.engineComponents.core;
                // Adjust frequency based on speed
                const baseCoreFreq = 55; // Reduced from 60
                const maxCoreFreq = 110; // Reduced from 120
                const coreFreq = baseCoreFreq + (maxCoreFreq - baseCoreFreq) * speedFactor;
                core.oscillator.frequency.setTargetAtTime(coreFreq, this.audioContext.currentTime, 0.1);

                // Adjust volume based on speed
                const minCoreVol = 0.15; // Reduced from 0.2
                const maxCoreVol = 0.35; // Reduced from 0.4
                const coreVol = minCoreVol + (maxCoreVol - minCoreVol) * speedFactor;
                core.gain.gain.setTargetAtTime(coreVol, this.audioContext.currentTime, 0.1);
            }

            // Whine component
            if (this.engineComponents.whine) {
                const whine = this.engineComponents.whine;
                // Whine gets higher pitched with speed
                const baseWhineFreq = 70; // Reduced from 80/120
                const maxWhineFreq = 280; // Reduced from 350/500
                const whineFreq = baseWhineFreq + (maxWhineFreq - baseWhineFreq) * (speedFactor * speedFactor);
                whine.oscillator.frequency.setTargetAtTime(whineFreq, this.audioContext.currentTime, 0.1);

                // Whine gets louder at high speeds
                const minWhineVol = 0.02; // Reduced from 0.03/0.05
                const maxWhineVol = 0.08; // Reduced from 0.12/0.2
                let whineVol = minWhineVol;
                if (speedFactor > 0.7) { // Increased threshold from 0.6
                    // Only increase whine volume at very high speeds
                    const whineSpeedFactor = (speedFactor - 0.7) / 0.3;
                    whineVol = minWhineVol + (maxWhineVol - minWhineVol) * whineSpeedFactor;
                }
                whine.gain.gain.setTargetAtTime(whineVol, this.audioContext.currentTime, 0.1);
            }

            // Rumble component
            if (this.engineComponents.rumble) {
                const rumble = this.engineComponents.rumble;
                // Rumble frequency increases with speed
                const baseRumbleFreq = 20; // Reduced from 25/30
                const maxRumbleFreq = 45; // Reduced from 50/60
                const rumbleFreq = baseRumbleFreq + (maxRumbleFreq - baseRumbleFreq) * speedFactor;
                rumble.oscillator.frequency.setTargetAtTime(rumbleFreq, this.audioContext.currentTime, 0.1);

                // Rumble is stronger and present throughout more of the speed range
                const maxRumbleVol = 0.7; // Increased from 0.5/0.3
                // Peak at around 40% speed but maintain more presence at higher speeds
                const rumbleVolCurve = 1 - Math.abs(speedFactor - 0.4) * 0.5; // Reduced from 0.8/1.25
                const rumbleVol = Math.max(0.3, maxRumbleVol * rumbleVolCurve); // Increased min from 0.2/0.1
                rumble.gain.gain.setTargetAtTime(rumbleVol, this.audioContext.currentTime, 0.1);
            }

            // Noise component
            if (this.engineComponents.noise) {
                const noise = this.engineComponents.noise;
                // Noise increases with speed
                const minNoiseVol = 0.03; // Increased from 0.02
                const maxNoiseVol = 0.1; // Increased from 0.08
                const noiseVol = minNoiseVol + (maxNoiseVol - minNoiseVol) * speedFactor;
                noise.gain.gain.setTargetAtTime(noiseVol, this.audioContext.currentTime, 0.1);
            }

            // Update filter frequencies
            const baseLowpass = 300; // Reduced from 400
            const maxLowpass = 1200; // Reduced from 1500
            this.engineLowpassFilter.frequency.setTargetAtTime(
                baseLowpass + (maxLowpass - baseLowpass) * speedFactor,
                this.audioContext.currentTime,
                0.1
            );

            // Overall engine volume
            const minVolume = 0.07; // Increased from 0.05
            const maxVolume = 0.17; // Increased from 0.15
            const volume = minVolume + (maxVolume - minVolume) * speedFactor;
            this.engineGainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);

            // Add stronger vibrato effect that increases with speed
            // Makes engine sound "shake" more at higher speeds
            const vibratoFreq = 2 + speedFactor * 15; // Increased from 12/10
            const vibratoTime = this.audioContext.currentTime;
            // Increased gain oscillation depth
            this.engineVibrato.gain.setValueAtTime(
                1.0 + 0.25 * speedFactor * Math.sin(vibratoTime * vibratoFreq), // Increased from 0.15/0.05
                vibratoTime
            );
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
        if (!this.audioContext || !this.isAudioStarted || this.isMuted) return;

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

        // Listen for sound events
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

            // Handle hit sound effects
            if (data.sound === 'hit') {
                // Ensure audio is started
                if (!this.isAudioStarted) {
                    console.log('Hit sound event received, initializing audio');
                    this.startAudio();
                    // Small delay to allow audio initialization before playing
                    setTimeout(() => {
                        this.playHitSound();
                    }, 100);
                } else {
                    this.playHitSound();
                }
            }

            // Handle explosion sound effects
            if (data.sound === 'explosion') {
                // Ensure audio is started
                if (!this.isAudioStarted) {
                    console.log('Explosion sound event received, initializing audio');
                    this.startAudio();
                    // Small delay to allow audio initialization before playing
                    setTimeout(() => {
                        this.playExplosionSound();
                    }, 100);
                } else {
                    this.playExplosionSound();
                }
            }
        });
    }
}