// WW2 Dogfight Arena - Multiplayer WebSocket Server with Static File Serving
const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Server configuration
const PORT = process.env.PORT || 8080;
const UPDATE_INTERVAL = 50; // ms
const DEBUG = true; // Set to true for detailed logging

// Simple profanity filter list
const PROFANITY_LIST = [
    "4r5e", "5h1t", "5hit", "a55", "anal", "anus", "ar5e", "arrse", "arse", "ass",
    "ass-fucker", "asses", "assfucker", "assfukka", "asshole", "assholes", "asswhole",
    "b!tch", "b00bs", "b17ch", "b1tch", "ballbag", "balls", "bastard", "beastial",
    "bitch", "boob", "cawk", "clit", "cock", "coon", "crap", "cunt", "damn", "dick",
    "dildo", "dyke", "f u c k", "f4nny", "fag", "fagging", "faggitt", "faggot", "fagot",
    "fcuk", "fuck", "fuk", "gayboy", "gaygirl", "god-dam", "goddamn", "hell", "homo",
    "jackoff", "jerk-off", "jizz", "knob", "kock", "masturbate", "muff", "nazi",
    "n1gga", "n1gger", "nigg3r", "nigg4h", "nigga", "nigger", "nude", "nudity", "pecker",
    "penis", "piss", "poop", "porn", "prick", "pussy", "retard", "sex", "sh!t", "sh1t",
    "shit", "slut", "smegma", "spunk", "tit", "tosser", "turd", "twat", "vagina",
    "wank", "whore"
];

// Server state
const clients = new Map(); // clientId -> Client object
let lastTimestamp = Date.now();

// Player statistics tracking
const playerStats = new Map(); // clientId -> stats object

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Serve static files from the root directory
app.use(express.static(__dirname));

// Create WebSocket server attached to the HTTP server
const wss = new WebSocket.Server({ server });

console.log(`Server for WW2 Dogfight Arena started on port ${PORT}`);
console.log(`Game will be available at http://localhost:${PORT}`);
console.log(`WebSocket endpoint will be available at ws://localhost:${PORT}`);

/**
 * Debug logging function
 * @param {string} message - The message to log
 */
function logDebug(message) {
    if (DEBUG) {
        console.log(`[DEBUG] ${message}`);
    }
}

/**
 * Sanitize a player's callsign to remove profanity
 * @param {string} callsign - The callsign to sanitize
 * @returns {string} - The sanitized callsign
 */
function sanitizeCallsign(callsign) {
    if (!callsign) return null;

    // Convert to lowercase for comparison
    const lowercaseCallsign = callsign.toLowerCase();

    // Check if the callsign contains any profane words
    const containsProfanity = PROFANITY_LIST.some(word =>
        lowercaseCallsign.includes(word.toLowerCase())
    );

    if (containsProfanity) {
        console.log(`Profanity detected in callsign: ${callsign}`);
        // Generate a random clean name instead
        return `Pilot${Math.floor(Math.random() * 9000) + 1000}`;
    }

    return callsign;
}

/**
 * Get formatted player data for a client
 * @param {Object} client - Client object
 * @returns {Object} - Formatted player data
 */
function getPlayerData(client) {
    return {
        id: client.id,
        callsign: client.callsign || `Pilot${client.id.substring(0, 4)}`,
        position: client.position || { x: 0, y: 0, z: 0 },
        rotation: client.rotation || { x: 0, y: 0, z: 0 },
        health: client.health || 100,
        isDestroyed: client.isDestroyed || false
    };
}

/**
 * Create a new client object
 * @param {string} clientId - The client ID
 * @param {WebSocket} socket - The WebSocket connection
 * @returns {Object} - The new client object
 */
function createClientObject(clientId, socket) {
    // Initialize player stats when a new client is created
    initPlayerStats(clientId);

    return {
        socket,
        id: clientId,
        position: { x: 0, y: 100, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        health: 100,
        isDestroyed: false,
        lastUpdate: Date.now(),
        callsign: null,
        joinTime: Date.now() // Track when player joined
    };
}

/**
 * Initialize stats for a new player
 * @param {string} clientId - The client ID
 */
function initPlayerStats(clientId) {
    playerStats.set(clientId, {
        kills: 0,
        deaths: 0,
        joinTime: Date.now()
    });

    logDebug(`Initialized stats for player ${clientId}`);
}

/**
 * Get stats for a player
 * @param {string} clientId - The client ID
 * @returns {Object} - The player's stats
 */
function getPlayerStats(clientId) {
    // If player doesn't have stats yet, initialize them
    if (!playerStats.has(clientId)) {
        initPlayerStats(clientId);
    }

    return playerStats.get(clientId);
}

/**
 * Get leaderboard data for all players
 * @returns {Array} - Array of player stats for the leaderboard
 */
function getLeaderboardData() {
    const leaderboard = [];

    clients.forEach((client, clientId) => {
        const stats = getPlayerStats(clientId);
        const timeOnServer = Date.now() - stats.joinTime;
        const minutesOnServer = Math.floor(timeOnServer / 60000);

        // Calculate K/D ratio (prevent division by zero)
        const kdRatio = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);

        leaderboard.push({
            id: clientId,
            callsign: client.callsign || 'Unknown',
            kills: stats.kills,
            deaths: stats.deaths,
            kdRatio: kdRatio,
            timeOnServer: minutesOnServer
        });
    });

    // Sort by kills (descending)
    leaderboard.sort((a, b) => b.kills - a.kills);

    return leaderboard;
}

/**
 * Get a list of all connected players except the specified client
 * @param {string} excludeClientId - Client ID to exclude
 * @returns {Array} - Array of player data objects
 */
function getConnectedPlayers(excludeClientId) {
    return Array.from(clients.entries())
        .filter(([id]) => id !== excludeClientId)
        .map(([_, client]) => getPlayerData(client));
}

// Handle new WebSocket connections
wss.on('connection', (socket) => {
    // Generate a unique client ID
    const clientId = uuidv4();
    logDebug(`New client connected: ${clientId}`);

    // Create and store client object
    const client = createClientObject(clientId, socket);
    clients.set(clientId, client);

    // Log connection
    console.log(`Client connected: ${clientId} (Total: ${clients.size})`);

    // Send initial acknowledgment
    sendToClient(clientId, {
        type: 'init_ack',
        clientId: clientId,
        message: 'Connected to WW2 Dogfight Arena Server'
    });

    // Set up event handlers for this client
    setupClientEventHandlers(clientId, socket);

    // Broadcast updated player count to all clients
    broadcastPlayerCount();
});

/**
 * Set up WebSocket event handlers for a client
 * @param {string} clientId - The client ID
 * @param {WebSocket} socket - The WebSocket connection
 */
function setupClientEventHandlers(clientId, socket) {
    // Handle messages from client
    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleClientMessage(clientId, data);
        } catch (error) {
            console.error(`Error processing message from ${clientId}:`, error);
        }
    });

    // Handle disconnection
    socket.on('close', () => {
        handleClientDisconnection(clientId);
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
    });
}

/**
 * Handle client disconnection
 * @param {string} clientId - The client ID
 */
function handleClientDisconnection(clientId) {
    // Get client info before removal
    const client = clients.get(clientId);
    const callsign = client ? client.callsign || 'Unknown pilot' : 'Unknown pilot';

    // Remove client from the map
    clients.delete(clientId);

    // Log disconnection
    console.log(`Client disconnected: ${callsign} (${clientId}) (Remaining: ${clients.size})`);

    // Notify all other clients about the disconnection
    broadcast({
        type: 'player_left',
        playerId: clientId,
        callsign: callsign
    }, clientId);

    // Update player count
    broadcastPlayerCount();
}

/**
 * Handles a message from a client
 * @param {string} clientId - ID of the sending client
 * @param {Object} data - Message data
 */
function handleClientMessage(clientId, data) {
    const client = clients.get(clientId);

    if (!client) {
        console.error(`Received message from unknown client: ${clientId}`);
        return;
    }

    logDebug(`Received ${data.type} message from client ${clientId}`);

    // Route message to appropriate handler based on type
    switch (data.type) {
        case 'init':
            handleInitMessage(clientId, client, data);
            break;
        case 'update':
            handleUpdateMessage(clientId, client, data);
            break;
        case 'fire':
            handleFireMessage(clientId, client, data);
            break;
        case 'damage':
            handleDamageMessage(clientId, client, data);
            break;
        case 'respawn':
            handleRespawnMessage(clientId, client, data);
            break;
        case 'hit_effect':
            handleHitEffectMessage(clientId, client, data);
            break;
        case 'leaderboard':
            handleLeaderboardRequest(clientId);
            break;
        default:
            logDebug(`Unknown message type: ${data.type} from client ${clientId}`);
    }

    // Update client's last activity timestamp
    client.lastUpdate = Date.now();
}

/**
 * Handle client initialization message
 * @param {string} clientId - Client ID
 * @param {Object} client - Client object
 * @param {Object} data - Message data
 */
function handleInitMessage(clientId, client, data) {
    logDebug(`Client ${clientId} initialized with callsign: ${data.callsign}`);

    // Store original callsign for comparison
    const originalCallsign = data.callsign;

    // Sanitize and store callsign
    client.callsign = sanitizeCallsign(data.callsign) || `Pilot${clientId.substring(0, 4)}`;

    // Update position, rotation, and health if provided
    if (data.position) client.position = data.position;
    if (data.rotation) client.rotation = data.rotation;
    if (data.health) client.health = data.health;

    // Notify the client if their callsign was changed
    if (client.callsign !== originalCallsign) {
        sendToClient(clientId, {
            type: 'notification',
            message: `Your callsign was changed to ${client.callsign}`,
            notificationType: 'warning'
        });
        logDebug(`Callsign for client ${clientId} was changed from "${originalCallsign}" to "${client.callsign}"`);
    }

    // Get existing players to send to the new client
    const existingPlayers = getConnectedPlayers(clientId);
    logDebug(`Sending ${existingPlayers.length} existing players to client ${clientId}`);

    // Log the existing players for debugging
    if (DEBUG) {
        existingPlayers.forEach((player, index) => {
            logDebug(`Existing player ${index + 1}: ID=${player.id}, Callsign=${player.callsign}`);
        });
    }

    // Send existing players to the new client
    sendToClient(clientId, {
        type: 'init_ack',
        clientId: clientId,
        players: existingPlayers
    });

    // Notify all other clients about the new player
    const playerData = getPlayerData(client);
    logDebug(`Broadcasting new player to others: ID=${playerData.id}, Callsign=${playerData.callsign}`);

    broadcast({
        type: 'player_joined',
        player: playerData
    }, clientId);

    // Update player count for all clients
    broadcastPlayerCount();
}

/**
 * Handle client update message
 * @param {string} clientId - Client ID
 * @param {Object} client - Client object
 * @param {Object} data - Message data
 */
function handleUpdateMessage(clientId, client, data) {
    // Update client's position, rotation, and other properties
    if (data.player) {
        if (data.player.position) client.position = data.player.position;
        if (data.player.rotation) client.rotation = data.player.rotation;
        if (data.player.velocity) client.velocity = data.player.velocity;
        if (data.player.health !== undefined) client.health = data.player.health;
        if (data.player.isDestroyed !== undefined) client.isDestroyed = data.player.isDestroyed;
    }

    // Forward update to all other clients
    const playerData = getPlayerData(client);
    broadcast({
        type: 'update',
        players: [playerData]
    }, clientId);
}

/**
 * Handle client fire message
 * @param {string} clientId - Client ID
 * @param {Object} client - Client object
 * @param {Object} data - Message data
 */
function handleFireMessage(clientId, client, data) {
    // Forward the fire event to all other clients
    broadcast({
        type: 'fire',
        playerId: clientId,
        position: data.position,
        rotation: data.rotation,
        velocity: data.velocity
    }, clientId);
}

/**
 * Handle client damage message
 * @param {string} clientId - Client ID
 * @param {Object} client - Client object
 * @param {Object} data - Message data
 */
function handleDamageMessage(clientId, client, data) {
    const targetId = data.targetId;
    const targetClient = clients.get(targetId);

    if (!targetClient) {
        logDebug(`Target client ${targetId} not found for damage event`);
        return;
    }

    // Read current health values
    const oldHealth = targetClient.health || 100;

    // Apply damage to target
    const damageAmount = Math.min(data.amount || 10, 100); // Limit max damage
    targetClient.health = Math.max(0, oldHealth - damageAmount);

    logDebug(`Player ${targetClient.callsign} health reduced from ${oldHealth} to ${targetClient.health} (-${damageAmount})`);

    // Check if target was destroyed
    const wasDestroyed = targetClient.health <= 0 && !targetClient.isDestroyed;
    if (wasDestroyed) {
        targetClient.isDestroyed = true;
        targetClient.health = 0;

        // Update kill/death stats
        const sourceStats = getPlayerStats(clientId);
        const targetStats = getPlayerStats(targetId);

        // Increment kill count for the shooter
        sourceStats.kills += 1;

        // Increment death count for the target
        targetStats.deaths += 1;

        logDebug(`Updated stats: ${client.callsign} kills=${sourceStats.kills}, ${targetClient.callsign} deaths=${targetStats.deaths}`);

        logDebug(`Player ${targetClient.callsign} was destroyed by ${client.callsign}`);

        // Notify all clients about the destruction
        broadcastToAll({
            type: 'destroyed',
            playerId: targetId,
            sourceId: clientId
        });

        // Send kill notification
        broadcastToAll({
            type: 'notification',
            message: `${client.callsign} shot down ${targetClient.callsign}!`,
            notificationType: 'success'
        });

        // Send updated leaderboard to all clients
        broadcastLeaderboard();
    }

    // Forward damage event to the target
    sendToClient(targetId, {
        type: 'damage',
        amount: damageAmount,
        sourceId: clientId,
        position: data.position
    });

    // Also broadcast health update to all clients to keep everyone in sync
    broadcastToAll({
        type: 'update',
        players: [getPlayerData(targetClient)]
    });

    // Send hit effect to all clients
    broadcastToAll({
        type: 'hit_effect',
        position: data.position,
        playSound: true
    });
}

/**
 * Handle client respawn message
 * @param {string} clientId - Client ID
 * @param {Object} client - Client object
 * @param {Object} data - Message data
 */
function handleRespawnMessage(clientId, client, data) {
    // Log respawn
    logDebug(`Player ${client.callsign} (${clientId}) is respawning`);

    // Reset client state
    client.isDestroyed = false;
    client.health = 100; // Reset health to full

    // Update position and rotation if provided
    if (data.position) client.position = data.position;
    if (data.rotation) client.rotation = data.rotation;

    // Get full updated player data to broadcast
    const playerData = getPlayerData(client);

    // Add respawn flag to indicate this is a respawn event
    playerData.isRespawned = true;
    playerData.isDestroyed = false; // Force the 'not destroyed' state explicitly
    playerData.respawnTime = Date.now(); // Add timestamp to help clients identify new respawn events

    // Notify all clients about the respawn with full player data
    broadcastToAll({
        type: 'player_respawn',
        player: playerData
    });

    // Also send an update message to ensure health is synchronized
    broadcastToAll({
        type: 'update',
        players: [playerData]
    });

    // Send another update message after a short delay to ensure visibility
    setTimeout(() => {
        // Get fresh player data
        const updatedPlayerData = getPlayerData(client);
        updatedPlayerData.isRespawned = true;
        updatedPlayerData.isDestroyed = false;

        broadcastToAll({
            type: 'update',
            players: [updatedPlayerData]
        });

        logDebug(`Sent follow-up update for respawned player ${client.callsign}`);
    }, 1000);

    // Send notification
    broadcastToAll({
        type: 'notification',
        message: `${client.callsign} respawned!`,
        notificationType: 'info'
    });
}

/**
 * Handle client hit effect message
 * @param {string} clientId - Client ID
 * @param {Object} client - Client object
 * @param {Object} data - Message data
 */
function handleHitEffectMessage(clientId, client, data) {
    // Forward hit effect to all clients
    broadcast({
        type: 'hit_effect',
        playerId: clientId,
        position: data.position,
        playSound: data.playSound
    }, clientId);
}

/**
 * Broadcast a message to all clients except the specified one
 * @param {Object} message - Message to broadcast
 * @param {string} excludeId - Client ID to exclude (optional)
 * @returns {number} - Number of clients message was sent to
 */
function broadcast(message, excludeId = null) {
    let sentCount = 0;

    // Convert message to JSON string once
    const jsonMessage = JSON.stringify(message);

    clients.forEach((client, id) => {
        // Skip excluded client and closed connections
        if (id === excludeId || client.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            client.socket.send(jsonMessage);
            sentCount++;
        } catch (error) {
            console.error(`Error sending message to client ${id}:`, error);
        }
    });

    // Log message if not a common update message
    if (DEBUG && message.type !== 'update') {
        logDebug(`Broadcast ${message.type} to ${sentCount} clients (excluding ${excludeId || 'none'})`);
    }

    return sentCount;
}

/**
 * Broadcast a message to all connected clients
 * @param {Object} message - Message to broadcast
 * @returns {number} - Number of clients message was sent to
 */
function broadcastToAll(message) {
    // Convert message to JSON string once
    const jsonMessage = JSON.stringify(message);
    let sentCount = 0;

    clients.forEach((client, id) => {
        if (client.socket.readyState === WebSocket.OPEN) {
            try {
                client.socket.send(jsonMessage);
                sentCount++;
            } catch (error) {
                console.error(`Error sending message to client ${id}:`, error);
            }
        }
    });

    // Log message if not a common update message
    if (DEBUG && message.type !== 'update') {
        logDebug(`Broadcast ${message.type} to ALL ${sentCount} clients`);
    }

    return sentCount;
}

/**
 * Send a message to a specific client
 * @param {string} clientId - Target client ID
 * @param {Object} message - Message to send
 * @returns {boolean} - Whether the message was sent successfully
 */
function sendToClient(clientId, message) {
    const client = clients.get(clientId);

    // Verify client exists and connection is open
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
        return false;
    }

    try {
        client.socket.send(JSON.stringify(message));

        // Log message if not a common update message
        if (DEBUG && message.type !== 'update') {
            logDebug(`Sent ${message.type} to client ${clientId}`);
        }

        return true;
    } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        return false;
    }
}

/**
 * Broadcast current player count to all clients
 */
function broadcastPlayerCount() {
    const count = clients.size;
    broadcastToAll({
        type: 'player_count',
        count: count
    });
    console.log(`Updated player count: ${count} players`);
}

/**
 * Check for inactive clients and remove them
 */
function cleanupInactiveClients() {
    const now = Date.now();
    const timeout = 30000; // 30 seconds timeout
    let removedCount = 0;

    clients.forEach((client, id) => {
        if (now - client.lastUpdate > timeout) {
            // Log timeout
            console.log(`Client ${id} (${client.callsign || 'Unknown'}) timed out after ${Math.floor((now - client.lastUpdate) / 1000)}s`);

            // Close connection if still open
            if (client.socket.readyState === WebSocket.OPEN) {
                client.socket.close();
            }

            // Remove client
            clients.delete(id);
            removedCount++;

            // Broadcast disconnection
            broadcast({
                type: 'player_left',
                playerId: id,
                callsign: client.callsign || 'Unknown pilot'
            });
        }
    });

    // If any clients were removed, update player count
    if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} inactive clients, ${clients.size} remaining`);
        broadcastPlayerCount();
    }
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

// Start the server
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

/**
 * Broadcast leaderboard to all clients
 */
function broadcastLeaderboard() {
    const leaderboard = getLeaderboardData();

    broadcastToAll({
        type: 'leaderboard',
        data: leaderboard
    });

    logDebug(`Sent leaderboard update to all clients with ${leaderboard.length} players`);
}

/**
 * Handle client leaderboard request
 * @param {string} clientId - Client ID
 */
function handleLeaderboardRequest(clientId) {
    // Get current leaderboard data
    const leaderboard = getLeaderboardData();

    // Send leaderboard to the requesting client
    sendToClient(clientId, {
        type: 'leaderboard',
        data: leaderboard
    });

    logDebug(`Sent leaderboard data to client ${clientId}`);
} 