# WW2 Dogfight Arena - Architecture Documentation

## Overview

This document describes the modular architecture implemented for the WW2 Dogfight Arena game. The architecture follows a component-based design pattern, with clear separation of concerns and well-defined communication channels between modules.

## Goals of the Architecture

1. **Modularity**: Each component has a single responsibility and can be developed, tested, and maintained independently.
2. **Extensibility**: New features can be added with minimal changes to existing code.
3. **Maintainability**: Code is organized in a way that makes it easy to understand and modify.
4. **Reusability**: Components can be reused in other projects or in different parts of the same project.
5. **Testability**: Components can be tested in isolation.
6. **Performance**: The architecture is optimized for smooth gameplay with performance monitoring capabilities.
7. **Scalability**: Support for features like multiplayer and quality settings adjustments.

## Directory Structure

```
/js
  /core
    - Game.js (main game controller)
    - EventBus.js (communication system)
    - InputManager.js (input handling)
    - NetworkManager.js (multiplayer networking)
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
    - Plane.js (base plane class with health system)
    - WW2Plane.js (specific plane implementation)
    - EnemyPlane.js (AI-controlled enemy planes with combat behavior)
    - PlaneFactory.js (factory for creating planes)
    - AmmoSystem.js (ammunition, bullet management and collision detection)
  /effects
    - ExplosionFX.js (explosion effects for destroyed planes)
    - SmokeFX.js (smoke effects for damaged planes)
    - HitEffect.js (visual effects for bullet impacts)
  /ui
    - UIManager.js (UI management)
    - InstructionsPanel.js (game instructions)
    - FlightInfo.js (flight information display)
    - HealthDisplay.js (player and enemy health visualization)
    - Notifications.js (notification system)
  /audio
    - AudioManager.js (audio system)
  /utils
    - MathUtils.js (math helper functions)
    - PerformanceMonitor.js (performance tracking and optimization)
    - QualitySettings.js (graphics quality management)
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
- Initialize and manage enemy planes
- Handle multiplayer coordination
- Control game pause/resume functionality
- Coordinate combat mechanics and state

### EventBus.js

A simple event system that allows components to communicate without direct dependencies.

**Responsibilities**:
- Register event listeners
- Emit events to registered listeners
- Remove event listeners
- Facilitate communication between all game components
- Handle combat-related events (damage, destruction)

### InputManager.js

Handles all user input (keyboard, mouse) and translates it into game actions.

**Responsibilities**:
- Listen for keyboard and mouse events
- Maintain the current input state
- Emit input events via the EventBus
- Provide input state to other components
- Handle weapon firing controls

### NetworkManager.js

Manages multiplayer functionality and network communication.

**Responsibilities**:
- Connect to multiplayer servers
- Handle WebSocket communication
- Synchronize player positions and actions
- Create and manage remote player entities
- Handle network events (connections, disconnections, errors)
- Optimize network traffic with interpolation
- Synchronize health and combat information

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
- Apply quality settings to scene elements

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
- Scale detail based on quality settings

### Trees.js, Villages.js, Skyscrapers.js

These components add rich environmental details to the scene.

**Responsibilities**:
- Generate procedural content for the environment
- Create and manage complex 3D models and instances
- Place objects logically in the world (avoiding runway, etc.)
- Optimize rendering through instancing and LOD techniques
- Adjust density and detail based on quality settings

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
- Implement health system with damage and destruction
- Emit health-related events (damage, health updates, destruction)
- Handle destroyed state and transitions

### WW2Plane.js

Specific implementation of a WW2-style aircraft, extending Plane.js.

**Responsibilities**:
- Create the 3D model for the WW2 plane
- Define plane-specific properties
- Handle plane-specific behavior
- Implement weapon firing mechanics
- Manage wing trails and visual effects

### EnemyPlane.js

AI-controlled enemy plane implementation, extending WW2Plane.js.

**Responsibilities**:
- Implement AI state machine (IDLE, CHASE, ATTACK, EVADE)
- Handle autonomous flight behavior
- Generate and follow waypoints
- React to player proximity
- Manage sophisticated combat behavior:
  - Target position prediction and leading
  - Firing decisions and burst patterns
  - Evasive maneuvers when damaged
  - Tactical positioning during attacks
  - Variable aggression levels
- Control plane movement with artificial inputs
- Provide realistic flight patterns and behaviors
- Implement free-fall physics for destroyed planes
- Listen and respond to damage events
- Perform health-based decision making

### PlaneFactory.js

Factory for creating different types of planes.

**Responsibilities**:
- Create plane instances based on type (player, enemy)
- Initialize planes with proper settings
- Create remote player planes for multiplayer

### AmmoSystem.js

Manages ammunition and bullet physics for planes.

**Responsibilities**:
- Create and manage bullet objects
- Handle bullet physics and collision detection
- Maintain object pools for performance
- Track bullet lifetimes and clean up expired bullets
- Implement firing mechanics with cooldown times
- Support network synchronization for multiplayer
- Apply damage to planes when hits are detected
- Trigger hit effects and sounds
- Exclude firing plane from collision with its own bullets

## Effects Components

### ExplosionFX.js

Manages explosion effects for destroyed planes.

**Responsibilities**:
- Create particle systems for explosions
- Handle explosion animations and lifecycle
- Manage fire and smoke effects
- Add screen shake for nearby explosions
- Clean up resources when animations complete

### SmokeFX.js

Manages smoke effects for damaged planes.

**Responsibilities**:
- Create smoke particle systems
- Adjust smoke intensity based on plane health
- Position smoke emitters on damaged planes
- Update smoke particles with realistic physics
- Clean up particles after they expire

### HitEffect.js

Manages visual effects for bullet impacts.

**Responsibilities**:
- Create spark/impact effects at bullet collision points
- Handle impact animation lifecycle
- Optimize performance by pooling effect resources
- Scale effects based on quality settings

## UI Components

### UIManager.js

Manages all UI elements.

**Responsibilities**:
- Initialize UI components
- Update UI based on game state
- Handle UI events
- Display quality and performance settings
- Show multiplayer status information
- Manage health display and combat UI elements

### InstructionsPanel.js, FlightInfo.js, Notifications.js

These components manage specific UI elements.

**Responsibilities**:
- Create and manage their respective DOM elements
- Update their content based on game state
- Handle user interactions with UI elements

### HealthDisplay.js

Visualizes health status for player and enemy planes.

**Responsibilities**:
- Display health bar with percentage
- Update dynamically as health changes
- Provide visual feedback for damage (red flash)
- Show appropriate indication for destroyed state
- Change color based on health level (green/yellow/red)
- Coordinate with instruction panel for display timing

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
- Optimize audio processing based on quality settings
- Play appropriate combat sounds (firing, impacts, explosions)

## Utility Components

### MathUtils.js

Provides common math functions used throughout the game.

**Responsibilities**:
- Provide static utility methods for math operations
- Implement complex math algorithms needed for flight mechanics

### PerformanceMonitor.js

Monitors and optimizes game performance.

**Responsibilities**:
- Track frame rate and performance metrics
- Monitor memory usage for potential leaks
- Analyze performance trends
- Provide data for performance-based optimizations
- Alert when performance drops below acceptable levels

### QualitySettings.js

Manages graphics quality settings for the game.

**Responsibilities**:
- Define quality presets (low, medium, high)
- Store and retrieve user quality preferences
- Provide quality settings to other components
- Allow runtime quality adjustments
- Balance visual quality with performance

## Main Entry Point

### main.js

The entry point for the game application.

**Responsibilities**:
- Check for device compatibility
- Initialize the Game
- Handle mobile device detection and messaging
- Store game instance for debugging

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
   - Combat events trigger appropriate sound effects

4. **Weapons System and Combat**:
   - Input triggers weapon firing
   - AmmoSystem creates and manages bullets
   - AmmoSystem updates bullet positions
   - AmmoSystem checks for collisions with planes
   - On collision, AmmoSystem applies damage via plane.damage() method
   - Plane emits damage event with source information
   - HitEffect creates visual impact at collision point
   - HealthDisplay updates to show new health values
   - Damage may trigger evasive maneuvers in enemy planes

5. **Health System**:
   - Planes track health values internally
   - Damage calls reduce health and emit events
   - When health reaches zero, plane.destroyed is set to true
   - Destroyed planes enter freefall physics mode
   - ExplosionFX triggers at destruction point
   - UI updates to show destroyed state
   - Dead planes persist in scene with countdown before removal

6. **Enemy AI Behavior**:
   - Game provides player position to EnemyPlane
   - EnemyPlane determines appropriate AI state (IDLE, CHASE, ATTACK, EVADE)
   - EnemyPlane generates waypoints or pursues player based on state
   - AI uses target prediction for leading shots during ATTACK state
   - EnemyPlane fires weapons in controlled bursts when conditions are met
   - When damaged, AI evaluates whether to perform evasive maneuvers
   - Evasion probability increases at lower health values

7. **Multiplayer Synchronization**:
   - NetworkManager receives updates from server
   - NetworkManager updates remote player positions
   - NetworkManager sends local player updates to server
   - Remote firing events create bullets via AmmoSystem
   - Health and damage information synchronized over network

8. **Performance Optimization**:
   - PerformanceMonitor tracks metrics
   - QualitySettings adjusts detail levels as needed
   - SceneManager applies quality settings to scene elements

## Benefits of This Architecture

1. **Decoupled Components**: Changes to one component don't affect others.
2. **Clear Responsibilities**: Each component has a well-defined purpose.
3. **Easy to Extend**: New features can be added by creating new components.
4. **Maintainable Code**: Organized structure makes it easier to understand and modify.
5. **Reusable Components**: Components can be reused in other projects.
6. **Performance Monitoring**: Built-in performance tracking for optimizations.
7. **Scalable Design**: Architecture supports multiplayer and advanced features.

## Implemented Enhancements

The modular architecture has successfully facilitated the addition of new features:

1. **Enemy AI**: Added sophisticated AI-controlled enemy planes with realistic behavior and combat capabilities.
2. **Combat System**: Implemented comprehensive health, damage, and destruction systems with appropriate visual effects.
3. **Multiplayer**: Added networking components for multiplayer gameplay with synchronized combat.
4. **Performance Optimization**: Added monitoring and quality adjustment systems.
5. **Mobile Detection**: Added mobile device detection and appropriate messaging.
6. **Enhanced Visual Feedback**: Added smoke, explosion, and hit effects for combat visualization.
7. **UI Enhancements**: Added health display and combat-related information to the UI.

## Future Enhancements

The architecture is prepared for additional enhancements:

1. **Enhanced Mission System**: Add components for advanced mission objectives and progression.
2. **Weather Effects**: Add dynamic weather system components.
3. **Advanced AI Formations**: Extend the AI to support coordinated group tactics.
4. **VR Support**: The modular design could be extended to support VR interfaces.
5. **Advanced Physics**: The flight model could be enhanced with more realistic physics.
6. **Weapon Variety**: The combat system could be extended to support different weapon types.
7. **Damage Modeling**: Implement more detailed damage effects on specific plane components.
8. **Mission Progression**: Add a campaign mode with progressive difficulty and objectives. 