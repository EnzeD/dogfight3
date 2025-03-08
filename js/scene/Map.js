// Map.js - Static map definition for deterministic world generation
// This ensures all players see the exact same map layout in multiplayer

export default class GameMap {
    constructor() {
        // Map configuration - all positions and settings are fixed for deterministic generation

        // Runway configuration
        this.runway = {
            position: { x: 0, y: 0, z: 0 },
            rotation: 0,         // In radians
            width: 50,           // Width of the runway
            length: 1000         // Length of the runway
        };

        // Tree configurations with exact positions
        this.trees = {
            // Base tree types and their fixed positions (no randomness)
            pine: [
                { x: -950, y: 0, z: -800, scale: 2.7, rotation: 0.3 },
                { x: -850, y: 0, z: -700, scale: 2.5, rotation: 1.2 },
                { x: -720, y: 0, z: -650, scale: 3.1, rotation: 4.1 },
                { x: -600, y: 0, z: -750, scale: 2.3, rotation: 2.7 },
                { x: -500, y: 0, z: -850, scale: 2.9, rotation: 5.2 },
                { x: -400, y: 0, z: -700, scale: 2.8, rotation: 0.8 },
                { x: -300, y: 0, z: -600, scale: 3.0, rotation: 3.5 },
                { x: -200, y: 0, z: -900, scale: 2.6, rotation: 1.0 },
                { x: -100, y: 0, z: -750, scale: 2.4, rotation: 2.4 },
                { x: 100, y: 0, z: -800, scale: 2.5, rotation: 0.6 },
                { x: 250, y: 0, z: -700, scale: 2.7, rotation: 4.8 },
                { x: 400, y: 0, z: -900, scale: 3.2, rotation: 2.3 },
                { x: 600, y: 0, z: -600, scale: 2.4, rotation: 1.5 },
                { x: 800, y: 0, z: -800, scale: 2.8, rotation: 3.7 },
                { x: 900, y: 0, z: -700, scale: 2.6, rotation: 5.6 }
            ],
            oak: [
                { x: 500, y: 0, z: -200, scale: 3.2, rotation: 1.1 },
                { x: 600, y: 0, z: -150, scale: 2.8, rotation: 3.5 },
                { x: 700, y: 0, z: -100, scale: 3.0, rotation: 0.5 },
                { x: 800, y: 0, z: -50, scale: 2.7, rotation: 2.8 },
                { x: 900, y: 0, z: 0, scale: 3.3, rotation: 5.1 },
                { x: 800, y: 0, z: 50, scale: 2.9, rotation: 1.8 },
                { x: 700, y: 0, z: 100, scale: 2.6, rotation: 4.2 },
                { x: 600, y: 0, z: 150, scale: 3.1, rotation: 0.7 },
                { x: 500, y: 0, z: 200, scale: 2.5, rotation: 3.1 },
                { x: 900, y: 0, z: 250, scale: 2.8, rotation: 5.3 },
                { x: 800, y: 0, z: 300, scale: 3.2, rotation: 1.4 },
                { x: 700, y: 0, z: 280, scale: 2.7, rotation: 2.9 }
            ],
            palm: [
                { x: -150, y: 0, z: 650, scale: 3.0, rotation: 0.9 },
                { x: -100, y: 0, z: 700, scale: 2.8, rotation: 2.5 },
                { x: -50, y: 0, z: 750, scale: 3.2, rotation: 4.7 },
                { x: 0, y: 0, z: 800, scale: 2.7, rotation: 1.3 },
                { x: 50, y: 0, z: 850, scale: 3.1, rotation: 3.6 },
                { x: 100, y: 0, z: 900, scale: 2.9, rotation: 5.4 },
                { x: 150, y: 0, z: 950, scale: 2.6, rotation: 0.4 },
                { x: 180, y: 0, z: 800, scale: 3.0, rotation: 2.0 }
            ],
            birch: [
                { x: -900, y: 0, z: 150, scale: 2.5, rotation: 1.7 },
                { x: -850, y: 0, z: 200, scale: 2.8, rotation: 3.9 },
                { x: -800, y: 0, z: 250, scale: 3.1, rotation: 0.1 },
                { x: -750, y: 0, z: 300, scale: 2.6, rotation: 2.3 },
                { x: -700, y: 0, z: 350, scale: 2.9, rotation: 4.5 },
                { x: -650, y: 0, z: 400, scale: 3.2, rotation: 1.9 },
                { x: -600, y: 0, z: 450, scale: 2.7, rotation: 3.3 },
                { x: -550, y: 0, z: 500, scale: 3.0, rotation: 5.5 },
                { x: -500, y: 0, z: 550, scale: 2.5, rotation: 0.2 },
                { x: -650, y: 0, z: 580, scale: 2.8, rotation: 1.6 }
            ],
            willow: [
                { x: 350, y: 0, z: 450, scale: 3.3, rotation: 1.0 },
                { x: 400, y: 0, z: 500, scale: 2.9, rotation: 3.2 },
                { x: 450, y: 0, z: 550, scale: 3.1, rotation: 5.7 },
                { x: 500, y: 0, z: 600, scale: 2.7, rotation: 0.8 },
                { x: 550, y: 0, z: 650, scale: 3.0, rotation: 2.6 }
            ]
        };

        // Village configurations
        this.villages = [
            {
                center: { x: -800, z: -350 },
                size: 12,
                houses: [
                    { x: -820, z: -370, type: 0, rotation: 0.5 },
                    { x: -780, z: -350, type: 1, rotation: 1.2 },
                    { x: -760, z: -380, type: 2, rotation: 0.0 },
                    { x: -840, z: -330, type: 1, rotation: 2.1 },
                    { x: -810, z: -310, type: 0, rotation: 4.5 },
                    { x: -770, z: -320, type: 2, rotation: 3.3 },
                    { x: -750, z: -350, type: 1, rotation: 0.7 },
                    { x: -790, z: -390, type: 0, rotation: 1.9 },
                    { x: -830, z: -400, type: 2, rotation: 5.3 },
                    { x: -850, z: -360, type: 1, rotation: 2.8 },
                    { x: -780, z: -420, type: 0, rotation: 0.3 },
                    { x: -730, z: -370, type: 2, rotation: 4.1 }
                ],
                streets: [
                    { x1: -820, z1: -370, x2: -780, z2: -350 },
                    { x1: -780, z1: -350, x2: -760, z2: -380 },
                    { x1: -760, z1: -380, x2: -840, z2: -330 },
                    { x1: -840, z1: -330, x2: -810, z2: -310 },
                    { x1: -810, z1: -310, x2: -770, z2: -320 },
                    { x1: -770, z1: -320, x2: -750, z2: -350 },
                    { x1: -750, z1: -350, x2: -790, z2: -390 },
                    { x1: -790, z1: -390, x2: -830, z2: -400 },
                    { x1: -830, z1: -400, x2: -850, z2: -360 },
                    { x1: -850, z1: -360, x2: -780, z2: -420 }
                ]
            },
            {
                center: { x: 700, z: 450 },
                size: 10,
                houses: [
                    { x: 680, z: 430, type: 1, rotation: 0.2 },
                    { x: 720, z: 440, type: 0, rotation: 1.5 },
                    { x: 670, z: 470, type: 2, rotation: 3.1 },
                    { x: 730, z: 420, type: 1, rotation: 4.7 },
                    { x: 750, z: 460, type: 0, rotation: 0.9 },
                    { x: 700, z: 490, type: 2, rotation: 2.3 },
                    { x: 660, z: 450, type: 1, rotation: 5.6 },
                    { x: 710, z: 410, type: 0, rotation: 1.1 },
                    { x: 740, z: 480, type: 2, rotation: 2.7 },
                    { x: 690, z: 460, type: 1, rotation: 3.9 }
                ],
                streets: [
                    { x1: 680, z1: 430, x2: 720, z2: 440 },
                    { x1: 720, z1: 440, x2: 670, z2: 470 },
                    { x1: 670, z1: 470, x2: 730, z2: 420 },
                    { x1: 730, z1: 420, x2: 750, z2: 460 },
                    { x1: 750, z1: 460, x2: 700, z2: 490 },
                    { x1: 700, z1: 490, x2: 660, z2: 450 },
                    { x1: 660, z1: 450, x2: 710, z2: 410 },
                    { x1: 710, z1: 410, x2: 740, z2: 480 }
                ]
            }
        ];

        // Skyscraper configurations
        this.skyscrapers = {
            center: { x: 150, z: -600 },
            radius: 150,
            buildings: [
                { x: -100, z: -250, height: 120, width: 30, depth: 30, type: 'modern', rotation: 0.3 },
                { x: -70, z: -280, height: 150, width: 25, depth: 25, type: 'glass', rotation: 1.2 },
                { x: -30, z: -320, height: 100, width: 35, depth: 35, type: 'office', rotation: 0.0 },
                { x: 20, z: -340, height: 180, width: 20, depth: 20, type: 'modern', rotation: 5.1 },
                { x: 60, z: -290, height: 130, width: 28, depth: 28, type: 'glass', rotation: 2.7 },
                { x: 90, z: -260, height: 160, width: 22, depth: 22, type: 'office', rotation: 3.9 },
                { x: 40, z: -230, height: 140, width: 32, depth: 32, type: 'modern', rotation: 0.5 },
                { x: -20, z: -200, height: 170, width: 24, depth: 24, type: 'glass', rotation: 1.8 },
                { x: -60, z: -220, height: 110, width: 36, depth: 36, type: 'office', rotation: 4.2 }
            ]
        };

        // Cloud configurations
        this.clouds = {
            count: 30,
            positions: [
                { x: -800, y: 150, z: -400 },
                { x: -600, y: 180, z: -700 },
                { x: -300, y: 160, z: -500 },
                { x: -100, y: 170, z: -600 },
                { x: 200, y: 190, z: -800 },
                { x: 500, y: 200, z: -300 },
                { x: 700, y: 150, z: -100 },
                { x: 600, y: 160, z: 200 },
                { x: 400, y: 180, z: 400 },
                { x: 200, y: 170, z: 600 },
                { x: 0, y: 190, z: 800 },
                { x: -200, y: 200, z: 600 },
                { x: -400, y: 150, z: 400 },
                { x: -600, y: 160, z: 200 },
                { x: -800, y: 180, z: 0 },
                { x: -700, y: 170, z: -200 },
                { x: -500, y: 190, z: -600 },
                { x: -100, y: 200, z: -100 },
                { x: 300, y: 150, z: -400 },
                { x: 500, y: 160, z: -700 },
                { x: 800, y: 180, z: -500 },
                { x: 600, y: 170, z: 800 },
                { x: 100, y: 190, z: 500 },
                { x: -300, y: 200, z: 700 },
                { x: -700, y: 150, z: 600 },
                { x: -500, y: 160, z: 100 },
                { x: -200, y: 180, z: -800 },
                { x: 400, y: 170, z: -100 },
                { x: 700, y: 190, z: 400 },
                { x: 100, y: 200, z: -300 }
            ]
        };
    }
} 