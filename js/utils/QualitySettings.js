// QualitySettings.js - Manages graphics quality presets
export default class QualitySettings {
    constructor() {
        // Define quality levels
        this.qualityLevels = ['low', 'medium', 'high'];

        // Set default quality (medium)
        this.currentQuality = this.loadSavedQuality() || 'medium';

        // Quality presets
        this.presets = {
            // Low quality settings
            low: {
                clouds: {
                    count: 50,
                    segmentsX: 4,
                    segmentsY: 3,
                    massive: false,
                    big: 5,         // % chance for big clouds
                    medium: 35,     // % chance for medium clouds
                    small: 60       // % chance for small clouds
                },
                trees: {
                    count: {
                        pine: 6,
                        oak: 5,
                        palm: 3,
                        birch: 4,
                        willow: 2
                    },
                    segments: 4,    // cylinder/cone segments
                    foliageDetail: 1 // subdivisions for foliage
                },
                villages: {
                    count: 1,
                    housesPerVillage: 6
                },
                skyscrapers: {
                    count: 5,
                    segments: 4
                },
                fogDensity: 0.0008  // Denser fog to hide distant objects
            },

            // Medium quality settings (default)
            medium: {
                clouds: {
                    count: 125,
                    segmentsX: 6,
                    segmentsY: 4,
                    massive: true,
                    massiveChance: 2, // % chance for massive clouds
                    big: 10,       // % chance for big clouds
                    medium: 38,    // % chance for medium clouds
                    small: 50      // % chance for small clouds
                },
                trees: {
                    count: {
                        pine: 15,
                        oak: 12,
                        palm: 8,
                        birch: 10,
                        willow: 5
                    },
                    segments: 6,    // cylinder/cone segments
                    foliageDetail: 2 // subdivisions for foliage
                },
                villages: {
                    count: 2,
                    housesPerVillage: 10
                },
                skyscrapers: {
                    count: 10,
                    segments: 6
                },
                fogDensity: 0.0006
            },

            // High quality settings
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
                fogDensity: 0.0004
            }
        };
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