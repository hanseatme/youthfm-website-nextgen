import uWS from 'uWebSockets.js';
import jwt from 'jsonwebtoken';
import { RoomManager } from './game/Room.js';
import { PlayerData } from './network/MessageHandler.js';
import { encodeServerMessage, createErrorMessage } from './network/Protocol.js';
import { log } from './utils/logger.js';

// Configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const TICK_RATE = parseInt(process.env.TICK_RATE || '30', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim());

// Initialize room manager
const roomManager = new RoomManager(TICK_RATE);

// Parse query string
function parseQueryString(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!query) return params;

  for (const pair of query.split('&')) {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  }

  return params;
}

// Verify JWT token
function verifyToken(
  token: string
): { userId: string; roomId: string; displayName?: string; color?: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      roomId: string;
      displayName?: string;
      color?: string;
      type?: string;
    };

    if (decoded.type !== 'asteroids') {
      log.warn('Invalid token type');
      return null;
    }

    return decoded;
  } catch (error) {
    log.warn('Token verification failed', { error });
    return null;
  }
}

// Check CORS origin
function isOriginAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes('*')) return true;
  return ALLOWED_ORIGINS.some((allowed) => {
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin.endsWith(`.${domain}`);
    }
    return origin === allowed || origin === `https://${allowed}` || origin === `http://${allowed}`;
  });
}

// Create uWebSockets app
const app = uWS.App();

// Health check endpoint
app.get('/health', (res) => {
  const stats = roomManager.getStats();

  res.writeHeader('Content-Type', 'application/json');
  res.writeHeader('Access-Control-Allow-Origin', '*');
  res.end(
    JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      rooms: stats.rooms,
      players: stats.players,
      tickRate: TICK_RATE,
    })
  );
});

// Stats endpoint
app.get('/stats', (res) => {
  const stats = roomManager.getStats();

  res.writeHeader('Content-Type', 'application/json');
  res.writeHeader('Access-Control-Allow-Origin', '*');
  res.end(
    JSON.stringify({
      rooms: stats.rooms,
      players: stats.players,
      tickRate: TICK_RATE,
      memoryUsage: process.memoryUsage(),
    })
  );
});

// WebSocket endpoint
app.ws<PlayerData>('/ws', {
  // Compression settings
  compression: uWS.SHARED_COMPRESSOR,
  maxPayloadLength: 16 * 1024, // 16KB max message size
  idleTimeout: 120, // 2 minutes

  // Upgrade handler - authentication happens here
  upgrade: (res, req, context) => {
    const query = req.getQuery();
    const params = parseQueryString(query);
    const origin = req.getHeader('origin') || '';

    // Check origin
    if (!isOriginAllowed(origin)) {
      log.warn(`Rejected connection from origin: ${origin}`);
      res.writeStatus('403 Forbidden').end('Origin not allowed');
      return;
    }

    // Verify token
    const token = params.token;
    if (!token) {
      log.warn('Connection rejected: missing token');
      res.writeStatus('401 Unauthorized').end('Missing token');
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      log.warn('Connection rejected: invalid token');
      res.writeStatus('401 Unauthorized').end('Invalid token');
      return;
    }

    // Check if room is provided and matches token
    const roomId = params.room || decoded.roomId;
    if (!roomId || roomId !== decoded.roomId) {
      log.warn('Connection rejected: room mismatch');
      res.writeStatus('400 Bad Request').end('Room mismatch');
      return;
    }

    const roundNumber = Math.max(1, parseInt(params.round || '1', 10) || 1);

    // User data to attach to WebSocket
    const userData: PlayerData = {
      playerId: decoded.userId,
      roomId,
      displayName: decoded.displayName || null,
      color: decoded.color || '#00ffff',
      roundNumber,
    };

    // Upgrade the connection
    res.upgrade(
      userData,
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'),
      context
    );
  },

  // Connection opened
  open: (ws) => {
    const data = ws.getUserData();
    log.info(`WebSocket connected: ${data.playerId} in room ${data.roomId}`);

    // Join room
    const success = roomManager.joinRoom(
      data.roomId,
      data.playerId,
      data.displayName,
      data.color,
      ws,
      data.roundNumber
    );

    if (!success) {
      const errorMsg = encodeServerMessage(
        createErrorMessage('ROOM_FULL', 'Room is full or game already started')
      );
      ws.send(errorMsg, true);
      ws.close();
    }
  },

  // Message received
  message: (ws, message, isBinary) => {
    const data = ws.getUserData();

    if (!isBinary) {
      log.warn(`Received non-binary message from ${data.playerId}`);
      return;
    }

    roomManager.handlePlayerMessage(data.roomId, data.playerId, message);
  },

  // Connection closed
  close: (ws, code, message) => {
    const data = ws.getUserData();
    log.info(`WebSocket closed: ${data.playerId} (code: ${code})`);

    roomManager.leaveRoom(data.roomId, data.playerId, ws);
  },

  // Drain - backpressure handling
  drain: (ws) => {
    const data = ws.getUserData();
    log.debug(`WebSocket backpressure drained: ${data.playerId}`);
  },
});

// Start server
app.listen(HOST, PORT, (listenSocket) => {
  if (listenSocket) {
    log.info(`Asteroids Game Server started on ${HOST}:${PORT}`);
    log.info(`Tick rate: ${TICK_RATE} Hz`);
    log.info(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  } else {
    log.error(`Failed to start server on ${HOST}:${PORT}`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('Received SIGTERM, shutting down...');
  roomManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  log.info('Received SIGINT, shutting down...');
  roomManager.shutdown();
  process.exit(0);
});
