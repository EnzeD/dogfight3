# Billboard System

This document explains how to customize and add billboards to your game.

## Overview

The billboard system allows you to place advertisement panels around the game world. Each billboard consists of:

1. A support pole
2. A rectangular panel that displays an image
3. Optional click functionality to open a URL when clicked

Billboards are defined in the `GameMap` class and rendered using the `Billboard` class.

## Customizing Billboards

### 1. Adding Billboard Textures

Place your billboard texture images in the `assets/textures/` directory. The recommended format is JPEG with dimensions around 1024x512 pixels (landscape orientation).

Example texture files:
- `billboard1.jpg`
- `billboard2.jpg`
- `billboard3.jpg`

### 2. Configuring Billboards in Map.js

Billboard positions and properties are defined in the `Map.js` file. Open this file and locate the `billboards` array in the constructor.

Each billboard has the following properties:

```javascript
{
    position: { x: 0, y: 0, z: 0 },  // 3D position in the world
    rotation: 0,                     // Rotation in radians (0 = facing the runway)
    width: 20,                       // Width of the billboard panel
    height: 10,                      // Height of the billboard panel
    poleHeight: 15,                  // Height of the support pole
    texture: 'assets/textures/billboard1.jpg',  // Path to the texture image
    clickURL: 'https://example.com'  // URL to open when clicked (optional)
}
```

### 3. Adding More Billboards

To add more billboards, simply add more objects to the `billboards` array in `Map.js`:

```javascript
this.billboards = [
    // Existing billboards...
    {
        position: { x: 50, y: 0, z: -100 },
        rotation: Math.PI / 2,  // 90 degrees
        width: 15,
        height: 8,
        poleHeight: 12,
        texture: 'assets/textures/my_new_billboard.jpg',
        clickURL: 'https://mynewwebsite.com'
    }
];
```

## Advanced Customization

For more advanced customization, you can modify the `Billboard.js` file:

- Change the pole appearance by modifying the `poleGeometry` and `poleMaterial`
- Add lighting effects by creating spotlights or point lights
- Create animated billboards by updating the texture in the `update` method

## Troubleshooting

- If billboards don't appear, check the console for errors regarding texture loading
- If clicking doesn't work, ensure the `clickURL` property is set correctly
- For optimization with many billboards, consider implementing level-of-detail (LOD) in the Billboard.js file 