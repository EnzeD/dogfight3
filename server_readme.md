# WW2 Dogfight Arena - Local Multiplayer Testing Server

This server allows you to test the multiplayer functionality of WW2 Dogfight Arena locally without needing an external server.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later recommended)
- npm (comes with Node.js)

## Installation

1. Install the required dependencies:

```bash
npm install ws uuid
```

## Running the Server

1. Start the server:

```bash
node server.js
```

You should see output like:

```
WebSocket server for WW2 Dogfight Arena started on port 8080
Connect to this server by using the URL parameter: ?multiplayer&server=ws://localhost:8080
```

## Connecting Clients

1. Open the game in your browser with the following URL parameters:

```
http://your-game-url/?multiplayer&server=ws://localhost:8080
```

2. For multiple clients, you can:
   - Open multiple browser windows/tabs with the same URL
   - Use different browsers (Chrome, Firefox, etc.)
   - Connect from other devices on your local network using your computer's local IP address
     (e.g., `?multiplayer&server=ws://192.168.1.5:8080`)

## Testing Multiple Players

1. Start the server
2. Open the game in multiple browser windows with the URL parameters
3. Use the game controls (press 'P' to toggle connection)
4. Observe the other players in each window
5. Test combat by firing at other planes (normal firing controls)

## Multiplayer Features

- **AI Planes Disabled**: In multiplayer mode, AI enemy planes are automatically disabled
- **Player Synchronization**: Position, rotation, and speed synchronized between clients
- **Combat System**: 
  - Bullets fired by one player visible to all other players
  - Collision detection works correctly between players
  - Damage is properly synchronized
  - Health display updates for all clients
  - Destruction effects and sound are visible to all players
- **Notifications**: Players receive notifications about multiplayer events

## Server Features

- **Automatic client ID assignment**: Each client gets a unique ID
- **Player position and rotation synchronization**: Smooth movement of all players
- **Weapons firing synchronization**: See other players' bullets
- **Health and Damage System**: Full combat system with health tracking
- **Automatic cleanup of inactive clients**: Clients that don't send updates are removed
- **Graceful shutdown**: Clean server shutdown with CTRL+C
- **Debug Logging**: Detailed logs to help diagnose issues (can be turned off)

## Troubleshooting

- **Connection Issues**: Make sure the server is running and the URL parameters are correct
- **Missing Players**: Check the server console to see if clients are connecting properly
- **Combat Not Working**: Ensure all clients are using the latest version of the code
- **Client Timeouts**: Clients that don't send updates for 30 seconds will be disconnected
- **Network Errors**: If connecting from another device, ensure firewall settings allow connections to port 8080

## Debugging

If you're having issues with the multiplayer functionality:

1. Check the server console for detailed logs
2. Set `DEBUG = true` in server.js for more verbose logging
3. Look for errors in the browser console
4. Verify that the NetworkManager is properly connected

## Notes

- This is a local testing server and not intended for production use
- No authentication or security measures are implemented
- Performance may degrade with many connected clients 