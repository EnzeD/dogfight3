# Dogfight3 Multiplayer

A WebGL-based WW2 dogfight simulator with multiplayer support.

## Overview

This project consists of:
1. A browser-based 3D dogfight game built with Three.js
2. A WebSocket server with SSL support for multiplayer functionality

## Client Setup

The game client runs directly in a web browser and automatically connects to the multiplayer server.

### Running Locally

1. Serve the game files using any HTTP server. For example, with Python:
   ```
   python -m http.server 8000
   ```

2. Open a browser and navigate to `http://localhost:8000`

### Multiplayer Options

- By default, the game automatically tries to connect to the multiplayer server
- Use the URL parameter `?singleplayer` to disable multiplayer: `http://localhost:8000?singleplayer`
- Press `M` key in game to toggle the multiplayer connection on/off

## Server Setup

The server supports both standard WebSockets (WS) and secure WebSockets (WSS) with SSL.

### Prerequisites

- Node.js (v14 or newer)
- SSL certificates for secure connections (required for production)

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Configure SSL certificates:
   - Place your SSL key at `/etc/ssl/private/server.key`
   - Place your SSL certificate at `/etc/ssl/certs/server.crt`
   - Place your CA bundle (if applicable) at `/etc/ssl/certs/ca_bundle.crt`
   - Or edit `server.js` to point to your certificate locations

### Running the Server

1. Start the server:
   ```
   npm start
   ```

2. The server will start:
   - HTTP/WebSocket server on port 8080
   - HTTPS/WebSocket Secure server on port 8443 (if SSL certificates are available)

## Server Configuration

The server configuration is in `server.js` and can be modified to suit your needs:

```javascript
const config = {
    http: {
        port: 8080,
        enabled: true
    },
    https: {
        port: 8443,
        enabled: true,
        ssl: {
            key: '/etc/ssl/private/server.key',
            cert: '/etc/ssl/certs/server.crt',
            ca: '/etc/ssl/certs/ca_bundle.crt'
        }
    }
};
```

## Domain Configuration

If you're hosting the game on your own domain:

1. Edit the `domainMapping` object in `js/core/NetworkManager.js` to include your domain:

```javascript
this.domainMapping = {
    'fly.zullo.fun': {
        host: '141.95.17.225',
        port: '8443'
    },
    'your-domain.com': {
        host: 'your-server-ip',
        port: '8443'
    }
};
```

2. Make sure your server has SSL certificates for the domain
3. Ensure your firewall allows connections on ports 8080 and 8443

## Troubleshooting

### Client Connection Issues

- Check browser console for error messages
- Ensure the server IP and port are correct in the NetworkManager.js
- Confirm that your firewall allows WebSocket connections
- For secure connections (WSS), ensure your SSL certificates are valid
- Try the fallback connection with the 'M' key

### Server Issues

- Check server logs for error messages
- Verify SSL certificate paths and permissions
- Ensure ports 8080 and 8443 are open in your firewall
- Check that the Node.js version is compatible

## License

This project is proprietary and not licensed for public use or distribution. 