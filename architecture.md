# WW2 Dogfight Arena - Architecture Documentation

## Overview

This document describes the modular architecture implemented for the WW2 Dogfight Arena game. The architecture follows a component-based design pattern, with clear separation of concerns and well-defined communication channels between modules.

## Goals of the Architecture

1. **Modularity**: Each component has a single responsibility and can be developed, tested, and maintained independently.
2. **Extensibility**: New features can be added with minimal changes to existing code.
3. **Maintainability**: Code is organized in a way that makes it easy to understand and modify.
4. **Reusability**: Components can be reused in other projects or in different parts of the same project.
5. **Testability**: Components can be tested in isolation.

## Directory Structure

```
/js
  /core
    - Game.js (main game controller)
    - EventBus.js (communication system)
    - InputManager.js (input handling)
  /scene
    - SceneManager.js (scene management)
    - Camera.js (camera behavior)
    - Sky.js (sky background)
    - Ground.js (ground plane)
    - Runway.js (runway)
    - Clouds.js (cloud generation and animation)
    - Trees.js (tree generation and placement)
    - Villages.js (village generation and placement)
    - Skyscrapers.js (skyscraper generation and placement)
  /entities
    - Entity.js (base entity class)
    - Plane.js (base plane class)
    - WW2Plane.js (specific plane implementation)
    - PlaneFactory.js (factory for creating planes)
    - AmmoSystem.js (ammunition and bullet management)
  /ui
    - UIManager.js (UI management)
    - InstructionsPanel.js (game instructions)
    - FlightInfo.js (flight information display)
    - Notifications.js (notification system)
  /audio
    - AudioManager.js (audio system)
  /utils
    - MathUtils.js (math helper functions)
  - main.js (entry point)
```

## Core Components

### Game.js

The central controller for the game. It initializes all other systems, manages the game loop, and coordinates updates between components.

**Responsibilities**:
- Initialize all game systems
- Manage the game loop (animation frame)
- Update all components each frame
- Handle window resize events
- Track and report performance metrics (FPS)

### EventBus.js

A simple event system that allows components to communicate without direct dependencies.

**Responsibilities**:
- Register event listeners
- Emit events to registered listeners
- Remove event listeners

### InputManager.js

Handles all user input (keyboard, mouse) and translates it into game actions.

**Responsibilities**:
- Listen for keyboard and mouse events
- Maintain the current input state
- Emit input events via the EventBus
- Provide input state to other components

## Scene Components

### SceneManager.js

Manages the 3D scene, including creation, rendering, and updates.

**Responsibilities**:
- Create and manage the Three.js scene
- Create and manage the renderer
- Initialize scene elements (sky, ground, runway, clouds, trees, villages, skyscrapers)
- Update scene elements
- Render the scene
- Track the main actor (player's plane)

### Camera.js

Manages the camera and its behavior, including following the player's plane.

**Responsibilities**:
- Create and manage the Three.js camera
- Handle camera controls (OrbitControls)
- Follow the player's plane
- Handle camera transitions

### Sky.js, Ground.js, Runway.js, Clouds.js

These components manage specific elements of the 3D environment.

**Responsibilities**:
- Create and manage their respective 3D meshes
- Update their state (e.g., cloud animation)
- Respond to events (if needed)

### Trees.js, Villages.js, Skyscrapers.js

These components add rich environmental details to the scene.

**Responsibilities**:
- Generate procedural content for the environment
- Create and manage complex 3D models and instances
- Place objects logically in the world (avoiding runway, etc.)
- Optimize rendering through instancing and LOD techniques

## Entity Components

### Entity.js

Base class for all game entities.

**Responsibilities**:
- Provide common functionality for all entities
- Manage position, rotation, and scale
- Add/remove from scene

### Plane.js

Base class for all aircraft, extending Entity.js.

**Responsibilities**:
- Implement flight mechanics
- Handle player input for flight controls
- Manage plane state (speed, altitude, etc.)
- Update control surfaces based on input
- Collision detection

### WW2Plane.js

Specific implementation of a WW2-style aircraft, extending Plane.js.

**Responsibilities**:
- Create the 3D model for the WW2 plane
- Define plane-specific properties
- Handle plane-specific behavior

### PlaneFactory.js

Factory for creating different types of planes.

**Responsibilities**:
- Create plane instances based on type
- Initialize planes with proper settings

### AmmoSystem.js

Manages ammunition and bullet physics for planes.

**Responsibilities**:
- Create and manage bullet objects
- Handle bullet physics and collision detection
- Maintain object pools for performance
- Track bullet lifetimes and clean up expired bullets
- Implement firing mechanics with cooldown times

## UI Components

### UIManager.js

Manages all UI elements.

**Responsibilities**:
- Initialize UI components
- Update UI based on game state
- Handle UI events

### InstructionsPanel.js, FlightInfo.js, Notifications.js

These components manage specific UI elements.

**Responsibilities**:
- Create and manage their respective DOM elements
- Update their content based on game state
- Handle user interactions with UI elements

## Audio Components

### AudioManager.js

Manages all game audio.

**Responsibilities**:
- Initialize the audio system
- Load and play sounds
- Update sound parameters based on game state
- Handle audio controls (mute, volume)
- Manage positional audio for 3D sound effects
- Handle audio transitions and fading

## Utility Components

### MathUtils.js

Provides common math functions used throughout the game.

**Responsibilities**:
- Provide static utility methods for math operations
- Implement complex math algorithms needed for flight mechanics

## Main Entry Point

### main.js

The entry point for the game application.

**Responsibilities**:
- Check for device compatibility
- Initialize the Game
- Handle mobile device detection and messaging

## Communication Between Components

Components communicate with each other primarily through the EventBus, which implements a publish-subscribe pattern. This allows components to remain decoupled while still being able to respond to events from other components.

### Key Event Flows:

1. **Input to Plane Movement**:
   - InputManager detects key presses
   - InputManager updates its internal state
   - Game requests input state during update
   - Game passes input state to Plane
   - Plane updates its movement based on input

2. **Plane State to UI**:
   - Plane updates its state (speed, altitude, etc.)
   - Plane emits events with updated state
   - UIManager listens for these events
   - UIManager updates UI components accordingly

3. **Audio Updates**:
   - Game passes plane state to AudioManager
   - AudioManager updates sound parameters based on plane state

4. **Weapons System**:
   - Input triggers weapon firing
   - AmmoSystem creates and manages bullets
   - AmmoSystem updates bullet positions
   - AmmoSystem handles bullet collisions

## Benefits of This Architecture

1. **Decoupled Components**: Changes to one component don't affect others.
2. **Clear Responsibilities**: Each component has a well-defined purpose.
3. **Easy to Extend**: New features can be added by creating new components.
4. **Maintainable Code**: Organized structure makes it easier to understand and modify.
5. **Reusable Components**: Components can be reused in other projects.

## Future Enhancements

The modular architecture makes it easy to add new features:

1. **New Plane Types**: Add new plane classes that extend Plane.js.
2. **Enemy AI**: Add AI components for enemy planes.
3. **Mission System**: Add components for mission objectives and progression.
4. **Multiplayer**: Add networking components for multiplayer gameplay.
5. **Weather Effects**: Add dynamic weather system components. 