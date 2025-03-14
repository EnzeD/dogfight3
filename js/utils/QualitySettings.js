// QualitySettings.js - Manages graphics quality presets
export default class QualitySettings {
    constructor() {
        // Define quality levels
        this.qualityLevels = ['low', 'medium', 'high'];

        // Set default quality (medium) or auto-detect for mobile
        const isMobile = this.detectMobileDevice();
        this.currentQuality = this.loadSavedQuality() || (isMobile ? 'low' : 'medium');

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
                    count: {
                        pine: 3,               // Reduced from 6
                        oak: 2,                // Reduced from 5
                        palm: 1,               // Reduced from 3
                        birch: 2,              // Reduced from 4
                        willow: 0              // Removed
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
                maxVisibleEnemies: 3,          // Limit visible enemies
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
                    count: {
                        pine: 3,               // Same as low
                        oak: 2,                // Same as low
                        palm: 1,               // Same as low
                        birch: 2,              // Same as low
                        willow: 0              // Same as low
                    },
                    segments: 3,               // Same as low
                    foliageDetail: 0           // Same as low
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
                maxVisibleEnemies: 20,         // Increased from 3 to 20 as requested
                drawDistance: 2000,            // Same as low
                textureQuality: 'low',         // Same as low
                antialiasing: true             // Enable anti-aliasing (difference from low)
            },

            // High quality settings - Unchanged
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
                    count: {
                        pine: 30,
                        oak: 25,
                        palm: 15,
                        birch: 20,
                        willow: 10
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
} 