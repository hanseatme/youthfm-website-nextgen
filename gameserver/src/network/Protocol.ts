import { ClientMessage, ServerMessage } from '../game/types.js';

/**
 * Encode a server message to binary (JSON as UTF-8)
 */
export function encodeServerMessage(message: ServerMessage): Uint8Array {
  const json = JSON.stringify(message);
  return new TextEncoder().encode(json);
}

/**
 * Decode a client message from binary (JSON as UTF-8)
 */
export function decodeClientMessage(data: ArrayBuffer): ClientMessage | null {
  try {
    const str = new TextDecoder().decode(data);
    const decoded = JSON.parse(str);

    if (!decoded || typeof decoded !== 'object' || !decoded.type) {
      return null;
    }

    switch (decoded.type) {
      case 'input': {
        // Optional shotId for client-side bullet prediction reconciliation.
        // Keep it short to avoid abuse and ensure it stays within maxPayloadLength.
        // Only meaningful when shoot=true.
        const shotId =
          typeof decoded.shotId === 'string' && decoded.shotId.length > 0
            ? decoded.shotId.slice(0, 80)
            : undefined;
        // Client sends authoritative x position to prevent drift from different update rates
        const x = typeof decoded.x === 'number' ? decoded.x : undefined;
        return {
          type: 'input',
          moveX: typeof decoded.moveX === 'number' ? Math.max(-1, Math.min(1, decoded.moveX)) : 0,
          shoot: Boolean(decoded.shoot),
          ...(x !== undefined ? { x } : {}),
          ...(shotId ? { shotId } : {}),
        };
      }

      case 'ping':
        return {
          type: 'ping',
          t: typeof decoded.t === 'number' ? decoded.t : Date.now(),
        };

      case 'start':
        return { type: 'start' };

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Create error message
 */
export function createErrorMessage(code: string, message: string): ServerMessage {
  return { type: 'error', code, message };
}

/**
 * Create joined message
 */
export function createJoinedMessage(playerId: string, roomId: string): ServerMessage {
  return { type: 'joined', playerId, roomId };
}

/**
 * Create left message
 */
export function createLeftMessage(playerId: string): ServerMessage {
  return { type: 'left', playerId };
}

/**
 * Create game start message
 */
export function createGameStartMessage(): ServerMessage {
  return { type: 'gameStart' };
}

/**
 * Create game end message
 */
export function createGameEndMessage(scores: Record<string, number>): ServerMessage {
  return { type: 'gameEnd', scores };
}

/**
 * Create pong message
 */
export function createPongMessage(clientTime: number): ServerMessage {
  return { type: 'pong', t: clientTime, serverTime: Date.now() };
}
