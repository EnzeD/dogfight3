# Enemy Airplane AI Implementation Plan

## Overview
This document outlines the implementation plan for creating a realistic enemy airplane AI for the WW2 Dogfight Arena game. The AI will control enemy planes that exhibit realistic flight behavior and combat tactics against the player.

## AI State Machine
The enemy AI will follow a state machine with three primary states:
1. **IDLE** - Flying in a natural pattern when no player is nearby
2. **CHASE** - Pursuing the player when in detection range
3. **ATTACK** - Firing weapons when aim and distance conditions are met

## Implementation Steps

### Phase 1: Basic Enemy Plane Setup
1. Create an `EnemyPlane` class that extends `WW2Plane`
   - Override the `update` method to use AI control instead of user input
   - Set distinct appearance (reddish color scheme)
   - Add detection ranges for chase and attack states
   - Add a state machine property to track current AI state

```javascript
// Example properties to add
this.aiState = 'IDLE'; // Current AI state: 'IDLE', 'CHASE', or 'ATTACK'
this.detectionRange = 150; // Range at which enemy detects player
this.attackRange = 80; // Range at which enemy can attack
this.aimTolerance = 0.85; // How accurate aim needs to be to fire (dot product threshold)
this.colorScheme = {
    fuselage: 0x8B0000, // Dark red
    wings: 0x990000,    // Slightly lighter red
    details: 0x660000   // Darker red for details
};
```

**TESTING CHECKPOINT 1:**
- Verify enemy plane appears with correct red color scheme
- Verify plane has basic physics working (gravity, etc.)
- Confirm plane state starts as 'IDLE'

## Phase 1 Implementation Summary

### Date: March 3, 2023

Phase 1 of the enemy AI has been successfully implemented with the following components:

1. **EnemyPlane Class**
   - Created a new `EnemyPlane` class that extends `WW2Plane`
   - Added AI state properties (`aiState`, `detectionRange`, `attackRange`, `aimTolerance`)
   - Used the same color scheme as the player for now
   - Overridden the update method to use AI control instead of player input
   - For Phase 1, the plane remains stationary in the sky

2. **PlaneFactory Updates**
   - Added `createEnemyPlane()` method to the PlaneFactory
   - Updated `createPlane(type)` to handle 'enemy' type

3. **Game Class Integration**
   - Added arrays to track all planes and enemy planes separately
   - Added `createEnemyPlane()` method to create and position enemy planes
   - Updated the update loop to handle player and enemy planes differently
   - Enemy planes now receive the player's position for future AI behavior implementation

### Phase 2: IDLE State Behavior
1. Implement waypoint generation system
   - Create random points in 3D space within game boundaries
   - Generate new waypoints when current one is reached

2. Implement smooth flight toward waypoints
   - Calculate direction to waypoint
   - Apply appropriate roll, pitch and yaw to turn toward waypoint
   - Maintain consistent speed

```javascript
// Example idle behavior method
updateIdleState(deltaTime) {
    // Check if we need a new waypoint
    if (!this.currentWaypoint || this.reachedWaypoint()) {
        this.generateNewWaypoint();
    }
    
    // Calculate direction to waypoint
    const directionToWaypoint = new THREE.Vector3()
        .subVectors(this.currentWaypoint, this.mesh.position)
        .normalize();
    
    // Fly toward waypoint with smooth banking
    this.flyTowardDirection(directionToWaypoint, deltaTime);
}
```

**TESTING CHECKPOINT 2:**
- Verify enemy plane flies smoothly between random waypoints
- Confirm turns look natural with appropriate banking
- Check that plane stays within game boundaries

### Phase 3: State Transitions & CHASE State
1. Implement detection logic
   - Calculate distance to player
   - Transition to CHASE when player is within detection range
   - Transition back to IDLE when player leaves detection range

2. Implement chase behavior
   - Calculate intercept course (aim ahead of player)
   - Apply appropriate controls to pursue player
   - Maintain optimal chase distance

```javascript
// Example state management method
updateAIState(deltaTime, playerPosition) {
    // Calculate distance to player
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    
    // State transitions
    switch(this.aiState) {
        case 'IDLE':
            if (distanceToPlayer < this.detectionRange) {
                this.aiState = 'CHASE';
                // Optional: play audio or visual effect for detection
            }
            break;
            
        case 'CHASE':
            if (distanceToPlayer > this.detectionRange * 1.2) { // Add hysteresis
                this.aiState = 'IDLE';
            } else if (distanceToPlayer < this.attackRange && this.hasGoodAim()) {
                this.aiState = 'ATTACK';
            }
            break;
            
        case 'ATTACK':
            if (distanceToPlayer > this.attackRange || !this.hasGoodAim()) {
                this.aiState = 'CHASE';
            }
            break;
    }
}
```

**TESTING CHECKPOINT 3:**
- Verify enemy detects player at appropriate range
- Confirm enemy pursues player when in CHASE state
- Check that enemy returns to IDLE when player leaves range

### Phase 4: ATTACK State & Combat Behavior
1. Implement aim calculation
   - Determine if enemy has clear shot at player
   - Calculate lead position for moving target
   - Add slight randomization for realistic aiming error

2. Implement attack behavior
   - Fire weapons when aim is good and in range
   - Implement cooldown between firing
   - Add evasive maneuvers after attack runs

```javascript
// Example attack methods
hasGoodAim() {
    // Get direction vectors
    const enemyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    const toPlayer = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
    
    // Dot product measures alignment (1.0 = perfect alignment)
    const aimQuality = enemyForward.dot(toPlayer);
    
    return aimQuality > this.aimTolerance;
}

updateAttackState(deltaTime) {
    // Try to maintain optimal attack position
    this.maintainAttackPosition(deltaTime);
    
    // Fire weapons if cooldown complete
    if (this.weaponCooldown <= 0) {
        this.fireAmmo();
        this.weaponCooldown = 2.0; // 2 second cooldown
    } else {
        this.weaponCooldown -= deltaTime;
    }
}
```

**TESTING CHECKPOINT 4:**
- Verify enemy fires weapons when in good position
- Confirm weapons cooldown is working correctly
- Check that enemy maintains proper attack position

### Phase 5: Difficulty Levels & Polish
1. Implement difficulty settings
   - Adjust detection ranges, aim accuracy, and response time
   - Create different enemy types (rookie, veteran, ace)
   - Scale parameters based on game difficulty

2. Add polish and special behaviors
   - Wing trails for visibility
   - Sound effects for detection and state changes
   - Special maneuvers (evasive action when taking damage)
   - Formation flying for multiple enemies

```javascript
// Example difficulty scaling
setDifficulty(level) { // 'rookie', 'veteran', 'ace'
    switch(level) {
        case 'rookie':
            this.detectionRange = 120;
            this.attackRange = 60;
            this.aimTolerance = 0.9; // Needs more accurate aim to fire
            this.reactionTime = 1.2; // Slower reactions
            break;
            
        case 'veteran':
            this.detectionRange = 150;
            this.attackRange = 80;
            this.aimTolerance = 0.85;
            this.reactionTime = 0.8;
            break;
            
        case 'ace':
            this.detectionRange = 180;
            this.attackRange = 100;
            this.aimTolerance = 0.8; // Can fire from less ideal positions
            this.reactionTime = 0.5; // Quick reactions
            break;
    }
}
```

**FINAL TESTING:**
- Test with multiple enemies simultaneously
- Verify different difficulty levels work correctly
- Check performance optimization with many enemies

## Integration Steps

1. Modify the `Game` class to spawn enemy planes
2. Add enemy plane factory to `PlaneFactory`
3. Create tracking system for all active planes
4. Update game scoring based on enemy planes shot down

## Advanced Features (Future Enhancement)
- Squad-based tactics where multiple enemies coordinate
- Learning behavior where AI improves based on player tactics
- Mission-specific enemy behaviors (defend area, escort, etc.)

## Phase 2 Implementation Summary

### Date: March 4, 2023

Phase 2 of the enemy AI has been successfully implemented, adding idle flight behavior:

1. **Waypoint System**
   - Added a waypoint generation system that creates random navigation points
   - Implemented boundary checks to keep planes within the game area
   - Created a reachedWaypoint() method to detect when a waypoint is reached
   - Added a timeout system to prevent planes from getting stuck trying to reach unreachable waypoints

2. **Flight Behavior**
   - Implemented smooth flight toward waypoints with realistic banking
   - Created a flyTowardDirection() method that converts a target direction into control inputs
   - Added applyArtificialInputs() method to simulate player-like control of the plane
   - Implemented updateIdleState() to manage the overall idle behavior flow

3. **AI State Management**
   - Updated the update() method to handle different AI states (IDLE, CHASE, ATTACK)
   - Added physics and control surface updates for realistic movement
   - Prepared structure for future CHASE and ATTACK implementations

### Key Parameters
- Patrol area size: 300 units square
- Minimum altitude: 30 units
- Maximum altitude: 120 units
- Idle flight speed: 70% of maximum speed
- Turn speed factor: 0.7 (controls responsiveness)
- Bank factor: 0.8 (controls how much the plane banks during turns)

### Next Steps
- Implement Phase 3: CHASE state and detection logic
- Add transitions between IDLE and CHASE states based on player proximity
- Implement intercept course calculation for efficient pursuit

### Notes for Developers
- The enemy plane now patrols in a natural-looking flight pattern
- Waypoints are generated randomly within the defined patrol area
- The plane maintains a reasonable altitude range (30-120 units)
- Control inputs are calculated to produce smooth, realistic flight behavior

### Bug Fixes (March 4, 2023)
- Fixed an issue where the enemy plane was trying to call `applyRotation` which doesn't exist
- Updated rotation handling to directly use the mesh's rotation methods
- Fixed velocity calculation and position updates to match the parent Plane class
- Ensured the enemy plane is always set to airborne state
- Simplified the flight mechanics to be more robust and consistent
- Removed references to non-existent methods from the parent class
