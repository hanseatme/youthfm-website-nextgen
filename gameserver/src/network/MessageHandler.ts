import type { WebSocket } from 'uWebSockets.js';
import { ClientMessage } from '../game/types.js';
import { decodeClientMessage, encodeServerMessage, createPongMessage } from './Protocol.js';
import { log } from '../utils/logger.js';

export interface PlayerConnection {
  ws: WebSocket<PlayerData>;
  playerId: string;
  roomId: string;
  lastInput: { moveX: number; x: number | null; shoot: boolean; shotId: string | null };
  lastInputTime: number;
  lastSeenTime: number;
  shootCooldown: number;
}

export interface PlayerData {
  playerId: string;
  roomId: string;
  displayName: string | null;
  color: string;
  roundNumber: number;
}

// Shoot cooldown in ms
const SHOOT_COOLDOWN_MS = 120;

/**
 * Handle incoming message from a player
 */
export function handleMessage(
  connection: PlayerConnection,
  data: ArrayBuffer,
  onInput: (playerId: string, moveX: number, x: number | null, shoot: boolean, shotId: string | null) => void,
  onStart?: (playerId: string) => void
): void {
  const message = decodeClientMessage(data);

  if (!message) {
    log.warn(`Invalid message from player ${connection.playerId}`);
    return;
  }

  connection.lastSeenTime = Date.now();

  switch (message.type) {
    case 'input':
      handleInputMessage(connection, message, onInput);
      break;

    case 'ping':
      handlePingMessage(connection, message);
      break;

    case 'start':
      if (onStart) {
        onStart(connection.playerId);
      }
      break;

    default:
      log.warn(`Unknown message type from player ${connection.playerId}`);
  }
}

/**
 * Handle input message
 */
function handleInputMessage(
  connection: PlayerConnection,
  message: ClientMessage & { type: 'input' },
  onInput: (playerId: string, moveX: number, x: number | null, shoot: boolean, shotId: string | null) => void
): void {
  const now = Date.now();

  // Check shoot cooldown
  let canShoot = message.shoot || false;
  if (canShoot && now - connection.shootCooldown < SHOOT_COOLDOWN_MS) {
    canShoot = false;
  }

  if (canShoot) {
    connection.shootCooldown = now;
  }

  const shotId =
    canShoot && typeof message.shotId === 'string' && message.shotId.length > 0
      ? message.shotId
      : null;

  // Client-sent x position (authoritative to prevent drift)
  const x = typeof message.x === 'number' ? message.x : null;

  connection.lastInput = {
    moveX: message.moveX,
    x,
    shoot: canShoot,
    shotId,
  };
  connection.lastInputTime = now;
  connection.lastSeenTime = now;

  onInput(connection.playerId, message.moveX, x, canShoot, shotId);
}

/**
 * Handle ping message
 */
function handlePingMessage(
  connection: PlayerConnection,
  message: ClientMessage & { type: 'ping' }
): void {
  connection.lastSeenTime = Date.now();
  const pong = createPongMessage(message.t);
  const encoded = encodeServerMessage(pong);

  try {
    connection.ws.send(encoded, true);
  } catch {
    // Connection might be closed
  }
}

/**
 * Create a new player connection
 */
export function createPlayerConnection(
  ws: WebSocket<PlayerData>,
  playerId: string,
  roomId: string
): PlayerConnection {
  return {
    ws,
    playerId,
    roomId,
    lastInput: { moveX: 0, x: null, shoot: false, shotId: null },
    lastInputTime: Date.now(),
    lastSeenTime: Date.now(),
    shootCooldown: 0,
  };
}
