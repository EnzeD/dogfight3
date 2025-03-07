// WW2 Dogfight Arena - Local Multiplayer WebSocket Server
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Server configuration
const PORT = process.env.PORT || 8080;
const UPDATE_INTERVAL = 50; // ms
const DEBUG = true; // Set to true for detailed logging

// Server state
const clients = new Map(); // clientId -> WebSocket connection
let lastTimestamp = Date.now();

// Create WebSocket server
const server = new WebSocket.Server({ port: PORT });

console.log(`WebSocket server for WW2 Dogfight Arena started on port ${PORT}`);
console.log(`Connect to this server by using the URL parameter: ?multiplayer&server=ws://localhost:${PORT}`);

// Debug function that only logs when DEBUG is true
function logDebug(message) {
    if (DEBUG) {
        console.log(`[DEBUG] ${message}`);
    }
}

/**
 * Get a serializable player object with all required fields
 * @param {Object} client - Client object
 * @returns {Object} - Player object with all fields
 */
function getPlayerData(client) {
    return {
        id: client.id,
        position: client.position,
        rotation: client.rotation,
        speed: client.speed,
        health: client.health,
        isDestroyed: client.isDestroyed
    };
}

// Handle new connections
server.on('connection', (socket) => {
    // Generate a unique client ID
    const clientId = uuidv4();

    console.log(`New client connected: ${clientId}`);

    // Store client connection
    clients.set(clientId, {
        socket,
        id: clientId,
        position: { x: 0, y: 100, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        speed: 0,
        health: 100,
        isDestroyed: false,
        lastUpdate: Date.now()
    });

    // Log the number of connected clients
    console.log(`Total connected clients: ${clients.size}`);

    // Send client their unique ID
    socket.send(JSON.stringify({
        type: 'init',
        id: clientId
    }));
    logDebug(`Sent init message to client ${clientId}`);

    // Send list of existing players
    const existingPlayers = Array.from(clients.entries())
        .filter(([id]) => id !== clientId)
        .map(([_, client]) => getPlayerData(client));

    socket.send(JSON.stringify({
        type: 'players',
        players: existingPlayers
    }));
    logDebug(`Sent existing ${existingPlayers.length} players to client ${clientId}`);

    // Broadcast new player to all other clients
    broadcast({
        type: 'playerUpdate',
        ...getPlayerData(clients.get(clientId))
    }, clientId);
    logDebug(`Broadcasted new player ${clientId} to other clients`);

    // Handle messages from client
    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            logDebug(`Received ${data.type} message from client ${clientId}`);
            handleClientMessage(clientId, data);
        } catch (error) {
            console.error(`Error processing message from ${clientId}:`, error);
        }
    });

    // Handle disconnection
    socket.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);

        // Remove client from the list
        clients.delete(clientId);

        // Log the number of connected clients after disconnection
        console.log(`Total connected clients: ${clients.size}`);

        // Broadcast player disconnection
        broadcast({
            type: 'playerDisconnect',
            id: clientId
        });
        logDebug(`Broadcasted disconnect of client ${clientId}`);
    });
});

/**
 * Handle messages from clients
 * @param {string} clientId - ID of the client
 * @param {Object} data - Message data
 */
function handleClientMessage(clientId, data) {
    const client = clients.get(clientId);
    if (!client) {
        console.error(`Client ${clientId} not found for message type ${data.type}`);
        return;
    }

    switch (data.type) {
        case 'update':  // Changed from 'playerUpdate' to 'update' to match NetworkManager
            // Update client position and rotation
            client.position = data.position;
            client.rotation = data.rotation;
            client.speed = data.speed || 0;

            // Update health and destroyed state if provided
            if (data.health !== undefined) {
                client.health = data.health;
            }
            if (data.isDestroyed !== undefined) {
                client.isDestroyed = data.isDestroyed;
            }

            client.lastUpdate = Date.now();

            // Broadcast update to all other clients with complete player data
            broadcast({
                type: 'playerUpdate',  // This stays as 'playerUpdate' for receivers
                ...getPlayerData(client)
            }, clientId);
            break;

        case 'fire':  // Changed from 'playerFire' to 'fire' to match NetworkManager
            logDebug(`Client ${clientId} fired a weapon`);
            // Broadcast fire event to all other clients
            broadcast({
                type: 'playerFire',  // This stays as 'playerFire' for receivers
                id: clientId,
                position: data.position,
                direction: data.direction,
                velocity: data.velocity
            }, clientId);
            break;

        case 'hitEffect':
            // Handle visual effect without damage (purely visual sync)
            if (data.position) {
                logDebug(`Client ${clientId} triggered a hit effect at position ${JSON.stringify(data.position)}`);

                // Broadcast hit effect to all other clients
                broadcast({
                    type: 'hitEffect',
                    id: clientId,
                    position: data.position
                }, clientId);
            }
            break;

        case 'damage':
            // Handle damage event
            const targetId = data.targetId;
            const damageAmount = data.amount || 10;
            const impactPosition = data.position; // Get impact position from message

            console.log(`Client ${clientId} damaged client ${targetId} for ${damageAmount} points`);

            const targetClient = clients.get(targetId);
            if (targetClient) {
                // Apply damage to target
                const oldHealth = targetClient.health;
                targetClient.health = Math.max(0, targetClient.health - damageAmount);

                // Log the health change with percentages
                console.log(`Client ${targetId} health reduced from ${oldHealth} (${(oldHealth / 100 * 100).toFixed(0)}%) to ${targetClient.health} (${(targetClient.health / 100 * 100).toFixed(0)}%)`);

                // Send notification to the damaged client
                if (targetClient.socket && targetClient.socket.readyState === WebSocket.OPEN) {
                    targetClient.socket.send(JSON.stringify({
                        type: 'notification',
                        message: `You were hit! Health: ${Math.round(targetClient.health)}%`,
                        duration: 2000,
                        type: 'warning'
                    }));
                }

                // Broadcast health update to ALL clients (including the source and target)
                broadcastToAll({
                    type: 'playerHealth',
                    ...getPlayerData(targetClient),
                    impactPosition: impactPosition // Include impact position
                });

                // Check if destroyed
                if (targetClient.health <= 0 && !targetClient.isDestroyed) {
                    targetClient.isDestroyed = true;

                    console.log(`Client ${targetId} was destroyed by client ${clientId}`);

                    // Send notification to the shooter
                    if (client.socket && client.socket.readyState === WebSocket.OPEN) {
                        client.socket.send(JSON.stringify({
                            type: 'notification',
                            message: `You shot down an enemy plane!`,
                            duration: 3000,
                            type: 'success'
                        }));
                    }

                    // Broadcast destroyed state to ALL clients (including the source)
                    broadcastToAll({
                        type: 'playerDestroyed',
                        ...getPlayerData(targetClient),
                        impactPosition: impactPosition // Include last impact position
                    });

                    console.log('Broadcasted destruction event to all clients');
                }

                // Log server-side state of all clients after damage
                console.log("Current client health states:");
                clients.forEach((c, id) => {
                    console.log(`Client ${id}: health=${c.health}, destroyed=${c.isDestroyed}`);
                });
            } else {
                console.error(`Target client ${targetId} not found for damage from ${clientId}`);
            }
            break;

        default:
            console.log(`Unknown message type from ${clientId}:`, data.type);
    }
}

/**
 * Broadcast a message to all clients except the sender
 * @param {Object} message - Message to broadcast
 * @param {string} excludeId - ID of client to exclude
 */
function broadcast(message, excludeId = null) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    clients.forEach((client, id) => {
        if (id !== excludeId && client.socket.readyState === WebSocket.OPEN) {
            client.socket.send(messageStr);
            sentCount++;
        }
    });

    if (DEBUG && message.type !== 'playerUpdate') {  // Don't log position updates to avoid spam
        logDebug(`Broadcast ${message.type} message to ${sentCount} clients (excluding ${excludeId})`);
    }
}

/**
 * Broadcast a message to ALL clients including the sender
 * @param {Object} message - Message to broadcast
 */
function broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    clients.forEach((client, id) => {
        if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.send(messageStr);
            sentCount++;
        }
    });

    if (DEBUG && message.type !== 'playerUpdate') {  // Don't log position updates to avoid spam
        logDebug(`Broadcast ${message.type} message to ALL ${sentCount} clients (including sender)`);
    }
}

/**
 * Check for inactive clients and remove them
 */
function cleanupInactiveClients() {
    const now = Date.now();
    const timeout = 30000; // 30 seconds timeout

    clients.forEach((client, id) => {
        if (now - client.lastUpdate > timeout) {
            console.log(`Client ${id} timed out and will be removed`);

            // Close connection
            if (client.socket.readyState === WebSocket.OPEN) {
                client.socket.close();
            }

            // Remove client
            clients.delete(id);

            // Broadcast disconnection
            broadcast({
                type: 'playerDisconnect',
                id: id
            });
        }
    });
}

// Clean up inactive clients every minute
setInterval(cleanupInactiveClients, 60000);

// Handle server shutdown
process.on('SIGINT', () => {
    console.log('Server shutting down...');

    // Close all client connections
    clients.forEach((client) => {
        if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.close();
        }
    });

    // Close server
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
}); 