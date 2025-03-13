// QualitySettings.js - Manages graphics quality presets
export default class QualitySettings {
    constructor() {
        // Define quality levels
        this.qualityLevels = ['ultra-low', 'low', 'medium', 'high'];

        // Set default quality (medium)
        this.currentQuality = this.loadSavedQuality() || 'medium';

        // Quality presets
        this.presets = {
            // Ultra low quality settings for mobile devices
            'ultra-low': {
                clouds: {
                    count: 20,
                    segmentsX: 3,
                    segmentsY: 2,
                    massive: false,
                    big: 0,         // % chance for big clouds
                    medium: 20,     // % chance for medium clouds
                    small: 80       // % chance for small clouds
                },
                trees: {
                    count: {
                        pine: 3,
                        oak: 2,
                        palm: 1,
                        birch: 2,
                        willow: 0
                    },
                    segments: 3,    // cylinder/cone segments
                    foliageDetail: 0 // subdivisions for foliage
                },
                villages: {
                    count: 0,
                    housesPerVillage: 0
                },
                skyscrapers: {
                    count: 3,
                    segments: 3
                },
                fogDensity: 0.001,  // Very dense fog to hide distant objects
                renderDistance: 1000, // Very short render distance
                maxEnemies: 2,      // Very few enemies
                particleMultiplier: 0.25, // Reduce particles by 75%
                shadowsEnabled: false,
                postProcessing: false,
                textureQuality: 0.25, // Quarter resolution textures
                useInstancedMeshes: true, // Use instanced meshes for better performance
                maxParticles: 50,   // Very few particles
                mobilePriority: {   // What to prioritize on mobile
                    fps: 2,         // High priority for framerate
                    memory: 3,      // Highest priority for memory conservation
                    visual: 0       // Low priority for visuals
                }
            },

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
                fogDensity: 0.0008,  // Denser fog to hide distant objects
                renderDistance: 2000, // Short render distance
                maxEnemies: 3,      // Few enemies
                particleMultiplier: 0.5, // Reduce particles by 50%
                shadowsEnabled: false,
                postProcessing: false,
                textureQuality: 0.5, // Half resolution textures
                useInstancedMeshes: true, // Use instanced meshes for better performance
                maxParticles: 100,  // Few particles
                mobilePriority: {   // What to prioritize on mobile
                    fps: 3,         // Highest priority for framerate
                    memory: 2,      // High priority for memory conservation
                    visual: 1       // Medium priority for visuals
                }
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
                fogDensity: 0.0006,
                renderDistance: 4000, // Medium render distance
                maxEnemies: 5,      // Medium enemy count
                particleMultiplier: 1.0, // Normal particle count
                shadowsEnabled: true,
                postProcessing: true,
                textureQuality: 1.0, // Full resolution textures
                useInstancedMeshes: true, // Use instanced meshes for better performance
                maxParticles: 250,  // Medium particle count
                mobilePriority: null // Not applicable
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
                fogDensity: 0.0004,
                renderDistance: 8000, // Long render distance
                maxEnemies: 8,      // High enemy count
                particleMultiplier: 1.5, // 50% more particles
                shadowsEnabled: true,
                postProcessing: true,
                textureQuality: 1.0, // Full resolution textures
                useInstancedMeshes: false, // Don't need instanced meshes at high quality (better detail)
                maxParticles: 500,  // Lots of particles
                mobilePriority: null // Not applicable
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
     * @param {string} level - Quality level ('ultra-low', 'low', 'medium', or 'high')
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