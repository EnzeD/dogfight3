// Simple WebSocket server for Dogfight3 multiplayer
const WebSocket = require('ws');

// Create a WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

// Store all connected clients
const clients = new Map();
let nextId = 1;

console.log('WebSocket server started on port 8080');

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
                clientData.position = data.position;
                clientData.rotation = data.rotation;
                clientData.speed = data.speed;

                // Broadcast the update to all other clients
                clients.forEach((_, client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'playerUpdate',
                            id: clientId,
                            position: data.position,
                            rotation: data.rotation,
                            speed: data.speed
                        }));
                    }
                });
            }
            // Handle firing messages
            else if (data.type === 'fire') {
                // Broadcast the firing event to all other clients
                clients.forEach((_, client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'playerFire',
                            id: clientId,
                            position: data.position,
                            direction: data.direction,
                            velocity: data.velocity
                        }));
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

        // Remove this client
        clients.delete(ws);

        // Notify all other clients about this disconnection
        clients.forEach((_, client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'playerDisconnect',
                    id: clientId
                }));
            }
        });
    });
}); 