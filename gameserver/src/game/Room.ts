import type { WebSocket } from 'uWebSockets.js';
import { RoomState, WorldSnapshot } from './types.js';
import {
  createRoomState,
  addPlayer,
  removePlayer,
  startGame,
  tick,
  createWorldSnapshot,
  getFinalScores,
} from './GameLoop.js';
import { hashStringToSeed } from './LevelGenerator.js';
import {
  PlayerConnection,
  PlayerData,
  createPlayerConnection,
  handleMessage,
} from '../network/MessageHandler.js';
import {
  encodeServerMessage,
  createJoinedMessage,
  createLeftMessage,
  createGameStartMessage,
  createGameEndMessage,
} from '../network/Protocol.js';
import { log } from '../utils/logger.js';

export interface Room {
  id: string;
  roundNumber: number;
  state: RoomState;
  connections: Map<string, PlayerConnection>;
  playerInputs: Map<string, { moveX: number; shoot: boolean; shotId: string | null }>;
  lastBroadcastTime: number;
  tickInterval: ReturnType<typeof setInterval> | null;
}

// Room timeout in ms (5 minutes of inactivity)
const ROOM_TIMEOUT_MS = 300000;

/**
 * Room Manager - handles all game rooms
 */
export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private tickRate: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(tickRate: number = 30) {
    this.tickRate = tickRate;
    this.startCleanupTimer();
  }

  /**
   * Create or get a room
   */
  getOrCreateRoom(roomId: string, roundNumber: number = 1): Room {
    let room = this.rooms.get(roomId);

    if (!room) {
      const seed = hashStringToSeed(`${roomId}:${roundNumber}`);
      const state = createRoomState(roomId, seed);

      room = {
        id: roomId,
        roundNumber,
        state,
        connections: new Map(),
        playerInputs: new Map(),
        lastBroadcastTime: Date.now(),
        tickInterval: null,
      };

      this.rooms.set(roomId, room);
      log.info(`🆕 Room created: ${roomId} (round ${roundNumber})`);
    }

    if (room.roundNumber !== roundNumber && room.state.status !== 'running') {
      this.resetRoomForRound(room, roundNumber);
    }

    return room;
  }

  private resetRoomForRound(room: Room, roundNumber: number): void {
    const seed = hashStringToSeed(`${room.id}:${roundNumber}`);
    const previousPlayers = Array.from(room.state.players.values()).map((p) => ({
      id: p.id,
      displayName: p.displayName,
      color: p.color,
    }));

    room.roundNumber = roundNumber;
    room.state = createRoomState(room.id, seed);

    // Re-add known players so the lobby still has a consistent roster.
    for (const p of previousPlayers) {
      addPlayer(room.state, p.id, p.displayName, p.color);
    }

    room.playerInputs.clear();
    for (const playerId of room.connections.keys()) {
      room.playerInputs.set(playerId, { moveX: 0, shoot: false, shotId: null });
    }

    log.info(`Room ${room.id} reset for round ${roundNumber}`);
  }

  private broadcastRoomState(room: Room): void {
    const snapshot = createWorldSnapshot(room.state);
    const stateMsg = encodeServerMessage({ type: 'state', payload: snapshot });
    this.broadcastToRoom(room, stateMsg);
  }

  /**
   * Get an existing room
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Join a player to a room
   */
  joinRoom(
    roomId: string,
    playerId: string,
    displayName: string | null,
    color: string,
    ws: WebSocket<PlayerData>,
    roundNumber: number = 1
  ): boolean {
    const room = this.getOrCreateRoom(roomId, roundNumber);
    const isReconnect = room.connections.has(playerId);
    const isKnownPlayer = room.state.players.has(playerId);

    // Check if room is full
    if (room.connections.size >= 4 && !isReconnect && !isKnownPlayer) {
      log.warn(`Room ${roomId} is full, rejecting player ${playerId}`);
      return false;
    }

    // Check if game already running
    if (room.state.status === 'running' && !isReconnect && !isKnownPlayer) {
      log.warn(`Game already running in room ${roomId}, rejecting player ${playerId}`);
      return false;
    }

    // If a previous match finished, return to lobby to allow starting a new round.
    if (room.state.status === 'finished') {
      room.state.status = 'lobby';
    }

    // Ensure player exists in game state (reconnect-safe)
    if (!isKnownPlayer) {
      addPlayer(room.state, playerId, displayName, color);
    } else {
      const existingPlayer = room.state.players.get(playerId);
      if (existingPlayer) {
        existingPlayer.displayName = displayName;
        existingPlayer.color = color;
      }
    }

    // Create connection
    const previousWs = room.connections.get(playerId)?.ws || null;
    const connection = createPlayerConnection(ws, playerId, roomId);
    room.connections.set(playerId, connection);
    room.playerInputs.set(playerId, { moveX: 0, shoot: false, shotId: null });

    if (previousWs && previousWs !== ws) {
      try {
        previousWs.close();
      } catch {
        // ignore
      }
    }

    // Send joined confirmation
    const joinedMsg = encodeServerMessage(createJoinedMessage(playerId, roomId));
    ws.send(joinedMsg, true);

    // Immediately send current state so the client can render even in lobby/reconnect.
    const snapshot = createWorldSnapshot(room.state);
    const stateMsg = encodeServerMessage({ type: 'state', payload: snapshot });
    ws.send(stateMsg, true);

    // If the game is already running (reconnect), notify the client so it can resume UI.
    if (room.state.status === 'running') {
      const startMsg = encodeServerMessage(createGameStartMessage());
      ws.send(startMsg, true);
    }

    // Broadcast updated state to everyone (lobby player count, etc).
    this.broadcastRoomState(room);

    log.info(
      `${isReconnect ? 'Player rejoined' : 'Player joined'} ${roomId}: ${playerId} (${room.connections.size} players)`
    );
    return true;
  }

  /**
   * Leave a player from a room
   */
  leaveRoom(roomId: string, playerId: string, ws?: WebSocket<PlayerData>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Ignore stale close events when a player reconnected and replaced their socket.
    const existing = room.connections.get(playerId);
    if (ws && existing && existing.ws !== ws) {
      log.debug(`Ignoring stale leave for player ${playerId} in room ${roomId}`);
      return;
    }

    // During a running match we keep the player in the state (as dead) so:
    // - remaining players can still finish the match deterministically
    // - reconnecting players can spectate the rest of the round
    if (room.state.status === 'running') {
      const player = room.state.players.get(playerId);
      if (player) {
        player.isDead = true;
        player.trail = [];
      }
    } else {
      // Remove from game state
      removePlayer(room.state, playerId);
    }

    // Remove connection
    room.connections.delete(playerId);
    room.playerInputs.delete(playerId);

    // Notify other players
    const leftMsg = encodeServerMessage(createLeftMessage(playerId));
    this.broadcastToRoom(room, leftMsg);

    // Also broadcast the latest state so lobby UIs update roster/positions.
    this.broadcastRoomState(room);

    log.info(`Player ${playerId} left room ${roomId} (${room.connections.size} players remaining)`);

    // Clean up empty rooms
    if (room.connections.size === 0) {
      this.destroyRoom(roomId);
    }
  }

  /**
   * Start the game in a room
   */
  startGameInRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.state.status !== 'lobby' && room.state.status !== 'finished') {
      log.warn(`Cannot start game in room ${roomId}, status: ${room.state.status}`);
      return false;
    }

    if (room.connections.size < 1) {
      log.warn(`Cannot start game in room ${roomId}, not enough players`);
      return false;
    }

    // Ensure input slots exist for all current players (reconnect-safe).
    for (const playerId of room.state.players.keys()) {
      if (!room.playerInputs.has(playerId)) {
        room.playerInputs.set(playerId, { moveX: 0, shoot: false, shotId: null });
      }
    }

    startGame(room.state);

    // Log game start
    const playerNames = Array.from(room.state.players.values())
      .map(p => p.displayName || p.id.slice(0, 8))
      .join(', ');
    log.info(`🎮 Game started in room ${roomId} with ${room.connections.size} players: [${playerNames}]`);

    // Notify all players
    const startMsg = encodeServerMessage(createGameStartMessage());
    this.broadcastToRoom(room, startMsg);

    // Start game loop
    this.startGameLoop(room);

    return true;
  }

  /**
   * Handle incoming message from a player
   */
  handlePlayerMessage(roomId: string, playerId: string, data: ArrayBuffer): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const connection = room.connections.get(playerId);
    if (!connection) return;

    handleMessage(
      connection,
      data,
      (id, moveX, shoot, shotId) => {
        room.playerInputs.set(id, { moveX, shoot, shotId });
      },
      (id) => {
        // Handle start request from client
        log.info(`Player ${id} requested game start in room ${roomId}`);
        this.startGameInRoom(roomId);
      }
    );
  }

  /**
   * Start the game loop for a room
   */
  private startGameLoop(room: Room): void {
    if (room.tickInterval) {
      clearInterval(room.tickInterval);
    }

    const tickMs = 1000 / this.tickRate;

    room.tickInterval = setInterval(() => {
      if (room.state.status !== 'running') {
        this.stopGameLoop(room);
        return;
      }

      // If a player stops sending inputs (e.g. frozen tab / network stall), mark them dead
      // so the match can still conclude.
      const now = Date.now();
      const inputTimeoutMs = 15000;
      for (const [playerId, player] of room.state.players) {
        if (player.isDead) continue;
        const conn = room.connections.get(playerId);
        if (!conn) continue;
        if (now - conn.lastInputTime > inputTimeoutMs) {
          player.isDead = true;
          player.trail = [];
          room.playerInputs.set(playerId, { moveX: 0, shoot: false, shotId: null });
          log.warn(`Marking player ${playerId} dead due to inactivity in room ${room.id}`);
        }
      }

      // Process tick
      tick(room.state, room.playerInputs);

      // Reset shoot flags
      for (const input of room.playerInputs.values()) {
        input.shoot = false;
        input.shotId = null;
      }

      // Broadcast state
      const snapshot = createWorldSnapshot(room.state);
      const stateMsg = encodeServerMessage({ type: 'state', payload: snapshot });
      this.broadcastToRoom(room, stateMsg);

      // Check if game ended (status may have changed during tick)
      const currentStatus = room.state.status as string;
      if (currentStatus === 'finished') {
        const scores = getFinalScores(room.state);

        // Log game end with scores
        const scoreList = Object.entries(scores)
          .sort(([, a], [, b]) => b - a)
          .map(([id, score]) => {
            const player = room.state.players.get(id);
            const name = player?.displayName || id.slice(0, 8);
            return `${name}: ${score}`;
          })
          .join(', ');
        log.info(`🏁 Game ended in room ${room.id} - Scores: [${scoreList}]`);

        const endMsg = encodeServerMessage(createGameEndMessage(scores));
        this.broadcastToRoom(room, endMsg);
        this.stopGameLoop(room);
      }
    }, tickMs);
  }

  /**
   * Stop the game loop for a room
   */
  private stopGameLoop(room: Room): void {
    if (room.tickInterval) {
      clearInterval(room.tickInterval);
      room.tickInterval = null;
    }
  }

  /**
   * Broadcast a message to all players in a room
   */
  private broadcastToRoom(room: Room, message: ArrayBuffer | Uint8Array): void {
    for (const connection of room.connections.values()) {
      try {
        connection.ws.send(message, true);
      } catch {
        // Connection might be closed
      }
    }
    room.lastBroadcastTime = Date.now();
  }

  /**
   * Destroy a room
   */
  private destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.stopGameLoop(room);

    // Close all connections
    for (const connection of room.connections.values()) {
      try {
        connection.ws.close();
      } catch {
        // Already closed
      }
    }

    this.rooms.delete(roomId);
    log.info(`Room destroyed: ${roomId}`);
  }

  /**
   * Start cleanup timer for inactive rooms
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [roomId, room] of this.rooms) {
        // Check if room is inactive
        if (room.state.status === 'lobby' && now - room.lastBroadcastTime > ROOM_TIMEOUT_MS) {
          log.info(`Cleaning up inactive room: ${roomId}`);
          this.destroyRoom(roomId);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Get room stats
   */
  getStats(): { rooms: number; players: number } {
    let players = 0;
    for (const room of this.rooms.values()) {
      players += room.connections.size;
    }
    return { rooms: this.rooms.size, players };
  }

  /**
   * Shutdown the room manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const roomId of this.rooms.keys()) {
      this.destroyRoom(roomId);
    }
  }
}
