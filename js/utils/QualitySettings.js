// QualitySettings.js - Manages graphics quality presets
export default class QualitySettings {
    constructor() {
        // Define quality levels
        this.qualityLevels = ['low', 'medium', 'high'];

        // Initialize properties needed by the UI
        this.quality = 'medium';  // Default quality level
        this.shadows = true;      // Default shadow setting
        this.antialiasing = true; // Default antialiasing setting
        this.resolution = 1.0;    // Default resolution (100%)

        // Set default quality (medium) or auto-detect for mobile
        const isMobile = this.detectMobileDevice();
        this.currentQuality = this.loadSavedQuality() || (isMobile ? 'low' : 'medium');

        // Update the quality property to match currentQuality
        this.quality = this.currentQuality;

        if (isMobile && !this.loadSavedQuality()) {
            console.log('Mobile device detected, automatically setting quality to low');
        }

        // Quality presets
        this.presets = {
            // Low quality settings - Optimized for mobile
            low: {
                clouds: {
                    count: 20,                 // Drastically reduced from 50
                    segmentsX: 3,              // Reduced from 4
                    segmentsY: 2,              // Reduced from 3
                    massive: false,
                    big: 3,                    // Reduced from 5
                    medium: 25,                // Reduced from 35
                    small: 72                  // Increased from 60
                },
                trees: {
                    totalCount: 20,           // Total of 20 trees for low quality
                    count: {
                        pine: 8,               // Prioritize pines (most efficient)
                        oak: 5,
                        palm: 3,
                        birch: 4,
                        willow: 0              // No willows in low quality
                    },
                    segments: 3,               // Reduced from 4
                    foliageDetail: 0           // Minimum detail
                },
                villages: {
                    count: 0,                  // Removed for mobile
                    housesPerVillage: 3        // Reduced from 6
                },
                skyscrapers: {
                    count: 2,                  // Reduced from 5
                    segments: 3                // Reduced from 4
                },
                fogDensity: 0.001,             // Increased to hide more distant objects
                shadowsEnabled: false,         // Disable shadows
                effectsQuality: 'minimal',     // Minimal effects
                maxVisibleEnemies: 5,          // Updated to minimum of 5 enemies
                drawDistance: 2000,            // Shorter draw distance
                textureQuality: 'low',         // Low texture quality
                antialiasing: false            // No anti-aliasing
            },

            // Medium quality settings - Based on low settings but with better visuals
            medium: {
                clouds: {
                    count: 300,                 // Same as high
                    segmentsX: 8,               // Same as high
                    segmentsY: 6,               // Same as high
                    massive: true,              // Same as high
                    massiveChance: 5,           // Same as high
                    big: 15,                    // Same as high
                    medium: 35,                 // Same as high
                    small: 45                   // Same as high
                },
                trees: {
                    totalCount: 50,            // Total of 50 trees for medium quality
                    count: {
                        pine: 15,              // Distributed across types
                        oak: 12,
                        palm: 8,
                        birch: 10,
                        willow: 5               // Some willows in medium
                    },
                    segments: 4,               // Moderate detail
                    foliageDetail: 1           // Some foliage detail
                },
                villages: {
                    count: 0,                  // Same as low
                    housesPerVillage: 3        // Same as low
                },
                skyscrapers: {
                    count: 2,                  // Same as low
                    segments: 3                // Same as low
                },
                fogDensity: 0.001,             // Same as low
                shadowsEnabled: true,          // Enable shadows (difference from low)
                effectsQuality: 'minimal',     // Same as low
                maxVisibleEnemies: 20,         // More enemies for medium quality
                drawDistance: 2000,            // Same as low
                textureQuality: 'low',         // Same as low
                antialiasing: true             // Enable anti-aliasing (difference from low)
            },

            // High quality settings - Updated for 150 trees
            high: {
                clouds: {
                    count: 300,
                    segmentsX: 8,
                    segmentsY: 6,
                    massive: true,
                    massiveChance: 5, // % chance for massive clouds
                    big: 15,       // % chance for big clouds
                    medium: 35,    // % chance for medium clouds
                    small: 45      // % chance for small clouds
                },
                trees: {
                    totalCount: 150,           // Total of 150 trees for high quality
                    count: {
                        pine: 50,              // Distributed across types
                        oak: 35,
                        palm: 20,
                        birch: 25,
                        willow: 20              // More willows in high quality
                    },
                    segments: 8,    // cylinder/cone segments
                    foliageDetail: 3 // subdivisions for foliage
                },
                villages: {
                    count: 3,
                    housesPerVillage: 15
                },
                skyscrapers: {
                    count: 15,
                    segments: 8
                },
                fogDensity: 0.0004,
                shadowsEnabled: true,           // Enable shadows
                effectsQuality: 'high',         // Full effects
                maxVisibleEnemies: 8,           // Maximum enemies
                drawDistance: 5000,             // Long draw distance
                textureQuality: 'high',         // High texture quality
                antialiasing: true              // Full anti-aliasing
            }
        };

        // Update shadows and antialiasing based on current quality
        const settings = this.presets[this.currentQuality];
        this.shadows = settings.shadowsEnabled;
        this.antialiasing = settings.antialiasing;
    }

    /**
     * Detect if user is on a mobile device
     * @returns {boolean} True if mobile device is detected
     */
    detectMobileDevice() {
        // Check for mobile user agent
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUserAgent = mobileRegex.test(navigator.userAgent);

        // Check for touch screen and small viewport
        const hasTouchScreen = (
            ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
            ('msMaxTouchPoints' in navigator && navigator.msMaxTouchPoints > 0)
        );
        const isSmallScreen = window.innerWidth < 768;

        return isMobileUserAgent || (hasTouchScreen && isSmallScreen);
    }

    /**
     * Get current quality level
     * @returns {string} Quality level name
     */
    getQuality() {
        return this.currentQuality;
    }

    /**
     * Set quality level
     * @param {string} level - Quality level ('low', 'medium', or 'high')
     * @returns {boolean} True if quality was changed, false otherwise
     */
    setQuality(level) {
        if (!this.qualityLevels.includes(level) || level === this.currentQuality) {
            return false;
        }

        this.currentQuality = level;
        this.saveQuality(level);
        return true;
    }

    /**
     * Get settings for current quality level
     * @returns {Object} Quality settings
     */
    getCurrentSettings() {
        return this.presets[this.currentQuality];
    }

    /**
     * Get settings for a specific quality level
     * @param {string} level - Quality level
     * @returns {Object} Quality settings
     */
    getSettings(level) {
        return this.presets[level] || this.presets.medium;
    }

    /**
     * Save quality level to localStorage
     * @param {string} level - Quality level
     */
    saveQuality(level) {
        try {
            localStorage.setItem('dogfight_quality', level);
        } catch (e) {
            console.warn('Could not save quality setting:', e);
        }
    }

    /**
     * Load quality level from localStorage
     * @returns {string|null} Saved quality level or null
     */
    loadSavedQuality() {
        try {
            const saved = localStorage.getItem('dogfight_quality');
            if (saved && this.qualityLevels.includes(saved)) {
                return saved;
            }
        } catch (e) {
            console.warn('Could not load quality setting:', e);
        }
        return null;
    }

    /**
     * Set quality preset and update all related settings
     * @param {string} preset - Quality preset ('low', 'medium', 'high')
     */
    setQualityPreset(preset) {
        if (this.qualityLevels.includes(preset)) {
            this.quality = preset;
            this.currentQuality = preset;

            // Update related settings
            const settings = this.presets[preset];
            this.shadows = settings.shadowsEnabled;
            this.antialiasing = settings.antialiasing;

            // Save the quality setting
            this.saveQuality(preset);

            console.log(`Quality preset changed to ${preset}`);
        } else {
            console.warn(`Invalid quality preset: ${preset}`);
        }
    }

    /**
     * Set resolution scaling
     * @param {number} scale - Resolution scale (0.5, 0.75, 1.0)
     */
    setResolution(scale) {
        if ([0.5, 0.75, 1.0].includes(scale)) {
            this.resolution = scale;
            console.log(`Resolution set to ${scale * 100}%`);
        } else {
            console.warn(`Invalid resolution scale: ${scale}`);
        }
    }
} 