// Simple WebSocket server for Dogfight3 multiplayer
const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');

// Create both HTTP and HTTPS servers
const httpServer = http.createServer();

// WebSocket server configuration
const wss = new WebSocket.Server({
    server: httpServer,
    // Allow connections from any origin
    verifyClient: ({ origin, req, secure }) => {
        return true; // Accept all connections for now
    }
});

// Store all connected clients
const clients = new Map();
let nextId = 1;

// Optimization: Keep track of active clients for broadcasting
const activeClients = new Set();

console.log('WebSocket server starting...');

// Start HTTP server
httpServer.listen(8080, () => {
    console.log('WebSocket server started on port 8080');
});

// Optimization: Reuse JSON strings for common messages
const createPlayerUpdateMessage = (clientId, position, rotation, speed) =>
    JSON.stringify({
        type: 'playerUpdate',
        id: clientId,
        position,
        rotation,
        speed
    });

const createFireMessage = (clientId, position, direction, velocity) =>
    JSON.stringify({
        type: 'playerFire',
        id: clientId,
        position,
        direction,
        velocity
    });

wss.on('connection', (ws) => {
    // Assign a unique ID to this client
    const clientId = nextId++;
    const clientData = {
        id: clientId,
        position: { x: 0, y: 10, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        speed: 0
    };

    // Store client information
    clients.set(ws, clientData);
    activeClients.add(ws);

    console.log(`Client ${clientId} connected. Total clients: ${clients.size}`);

    // Send the client their ID
    ws.send(JSON.stringify({
        type: 'init',
        id: clientId
    }));

    // Send all existing players to the new client
    const existingPlayers = [];
    clients.forEach((data, client) => {
        if (client !== ws) {
            existingPlayers.push(data);
        }
    });

    if (existingPlayers.length > 0) {
        ws.send(JSON.stringify({
            type: 'players',
            players: existingPlayers
        }));
    }

    // Handle messages from clients
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Handle player position updates
            if (data.type === 'update') {
                // Update this client's data
                Object.assign(clientData.position, data.position);
                Object.assign(clientData.rotation, data.rotation);
                clientData.speed = data.speed;

                // Create update message once
                const updateMessage = createPlayerUpdateMessage(
                    clientId,
                    data.position,
                    data.rotation,
                    data.speed
                );

                // Broadcast the update to all other active clients
                activeClients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(updateMessage);
                    }
                });
            }
            // Handle firing messages
            else if (data.type === 'fire') {
                // Create fire message once
                const fireMessage = createFireMessage(
                    clientId,
                    data.position,
                    data.direction,
                    data.velocity
                );

                // Broadcast to all other active clients
                activeClients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(fireMessage);
                    }
                });
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log(`Client ${clientId} disconnected`);

        // Remove this client from both collections
        clients.delete(ws);
        activeClients.delete(ws);

        // Create disconnect message once
        const disconnectMessage = JSON.stringify({
            type: 'playerDisconnect',
            id: clientId
        });

        // Notify all other active clients
        activeClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(disconnectMessage);
            }
        });
    });
}); 