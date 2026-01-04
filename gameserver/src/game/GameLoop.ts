import {
  RoomState,
  Player,
  Asteroid,
  Bullet,
  Powerup,
  WorldSnapshot,
  DEFAULT_CONFIG,
  GameConfig,
} from './types.js';
import {
  generateLevelSegments,
  mulberry32,
  getGapForSegmentIndex,
} from './LevelGenerator.js';
import {
  checkObstacleCollision,
  checkAsteroidCollision,
  checkBulletAsteroidCollision,
  checkPowerupCollision,
  updatePlayerPosition,
  updatePlayerTimers,
  activatePowerup,
  getCurrentSegment,
} from './Physics.js';
import { log } from '../utils/logger.js';

const config = DEFAULT_CONFIG;

/**
 * Initialize a new game room state
 */
export function createRoomState(roomId: string, seed: number): RoomState {
  return {
    id: roomId,
    status: 'lobby',
    players: new Map(),
    levelSeed: seed,
    scrollY: 0,
    scrollSpeed: config.scrollSpeedBase,
    elapsed: 0,
    asteroids: [],
    bullets: [],
    powerups: [],
    levelSegments: generateLevelSegments(seed, config),
    nextAsteroidId: 1,
    nextPowerupId: 1,
    meteorTimer: 30 + Math.random() * 60,
    lastTickTime: Date.now(),
  };
}

/**
 * Add a player to the room
 */
export function addPlayer(
  room: RoomState,
  playerId: string,
  displayName: string | null,
  color: string
): Player {
  const existingCount = room.players.size;
  const spacing = 80;
  const offset = (existingCount - (3 - 1) / 2) * spacing;

  const player: Player = {
    id: playerId,
    displayName,
    color,
    x: config.viewportSize / 2 + offset,
    y: config.viewportSize - 150,
    score: 0,
    isDead: false,
    isInvincible: false,
    invincibleTimer: 0,
    boostType: null,
    passedSegment: -1,
    trail: [],
  };

  room.players.set(playerId, player);
  return player;
}

/**
 * Remove a player from the room
 */
export function removePlayer(room: RoomState, playerId: string): boolean {
  return room.players.delete(playerId);
}

/**
 * Start the game
 */
export function startGame(room: RoomState): void {
  room.status = 'running';
  room.elapsed = 0;
  room.scrollY = 0;
  room.scrollSpeed = config.scrollSpeedBase;
  room.asteroids = [];
  room.bullets = [];
  room.powerups = [];
  room.lastTickTime = Date.now();
  room.meteorTimer = 30 + Math.random() * 60;

  // Reset all players
  const playerCount = room.players.size;
  const spacing = 80;
  let idx = 0;

  for (const player of room.players.values()) {
    const offset = (idx - (playerCount - 1) / 2) * spacing;
    player.x = config.viewportSize / 2 + offset;
    player.y = config.viewportSize - 150;
    player.score = 0;
    player.isDead = false;
    player.isInvincible = false;
    player.invincibleTimer = 0;
    player.boostType = null;
    player.passedSegment = -1;
    player.trail = [];
    idx++;
  }

  log.info(`Game started in room ${room.id} with ${playerCount} players`);
}

/**
 * Process a single game tick
 */
export function tick(
  room: RoomState,
  playerInputs: Map<string, { moveX: number; shoot: boolean; shotId: string | null }>
): void {
  if (room.status !== 'running') return;

  const now = Date.now();
  const dt = Math.min(0.1, (now - room.lastTickTime) / 1000); // Cap delta time
  room.lastTickTime = now;
  room.elapsed += dt;

  // Update scroll speed (increases over time)
  const speedMultiplier = 1 + room.elapsed * 0.012;
  room.scrollSpeed = Math.min(config.scrollSpeedMax, config.scrollSpeedBase * speedMultiplier);
  room.scrollY += room.scrollSpeed * dt;

  // Process player inputs and update positions
  for (const [playerId, player] of room.players) {
    if (player.isDead) continue;

    const input = playerInputs.get(playerId);
    const moveX = input?.moveX ?? 0;

    updatePlayerPosition(player, moveX, dt, config);
    updatePlayerTimers(player, dt);

    // Handle shooting
    if (input?.shoot) {
      spawnBullet(room, player, input.shotId);
    }

    // Check segment passing for score
    const currentSeg = getCurrentSegment(room.scrollY, config);
    if (currentSeg > player.passedSegment) {
      const segsPassed = currentSeg - player.passedSegment;
      player.score += segsPassed * 10;
      player.passedSegment = currentSeg;
    }
  }

  // Update bullets
  updateBullets(room, dt);

  // Update asteroids
  updateAsteroids(room, dt);

  // Update powerups
  updatePowerups(room, dt);

  // Spawn new entities
  spawnEntities(room, dt);

  // Check collisions
  checkCollisions(room);

  // Check if all players are dead
  let allDead = true;
  for (const player of room.players.values()) {
    if (!player.isDead) {
      allDead = false;
      break;
    }
  }

  if (allDead && room.players.size > 0) {
    room.status = 'finished';
    log.info(`Game finished in room ${room.id}`);
  }
}

/**
 * Spawn a bullet from a player
 */
function spawnBullet(room: RoomState, player: Player, shotId: string | null): void {
  const bulletId =
    typeof shotId === 'string' && shotId.length > 0
      ? shotId
      : `${player.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  room.bullets.push({
    id: bulletId,
    ownerId: player.id,
    x: player.x,
    y: player.y - 20,
    w: 4,
    h: 15,
  });
}

/**
 * Update all bullets
 */
function updateBullets(room: RoomState, dt: number): void {
  for (let i = room.bullets.length - 1; i >= 0; i--) {
    const bullet = room.bullets[i];
    bullet.y -= config.bulletSpeed * dt;

    // Remove bullets that are off screen
    if (bullet.y < -50) {
      room.bullets.splice(i, 1);
    }
  }
}

/**
 * Update all asteroids
 */
function updateAsteroids(room: RoomState, dt: number): void {
  for (let i = room.asteroids.length - 1; i >= 0; i--) {
    const asteroid = room.asteroids[i];
    asteroid.y += (room.scrollSpeed + config.asteroidSpeedAdd) * dt;
    asteroid.rotation += asteroid.rotSpeed;

    // Remove asteroids that are off screen
    if (asteroid.y > config.viewportSize + 100) {
      room.asteroids.splice(i, 1);
    }
  }
}

/**
 * Update all powerups
 */
function updatePowerups(room: RoomState, dt: number): void {
  for (let i = room.powerups.length - 1; i >= 0; i--) {
    const powerup = room.powerups[i];
    powerup.y += room.scrollSpeed * dt;

    // Remove powerups that are off screen
    if (powerup.y > config.viewportSize + 50) {
      room.powerups.splice(i, 1);
    }
  }
}

/**
 * Spawn new entities based on probability
 */
function spawnEntities(room: RoomState, dt: number): void {
  // Spawn asteroids
  if (Math.random() < config.spawnRates.asteroid * dt * 60) {
    spawnAsteroid(room);
  }

  // Spawn powerups
  if (Math.random() < config.spawnRates.powerup * dt * 60) {
    spawnPowerup(room);
  }

  // Meteor shower timer
  room.meteorTimer -= dt;
  if (room.meteorTimer <= 0) {
    spawnMeteorShower(room);
    room.meteorTimer = 30 + Math.random() * 60;
  }
}

/**
 * Spawn a single asteroid
 */
function spawnAsteroid(room: RoomState): void {
  const size = 30 + Math.random() * 20;
  const seed = Math.floor(Math.random() * 1000000000);

  room.asteroids.push({
    id: room.nextAsteroidId++,
    x: Math.random() * (config.viewportSize - size) + size / 2,
    y: -100,
    radius: size / 2,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.1,
    seed,
    hp: 1,
  });
}

/**
 * Spawn a powerup
 */
function spawnPowerup(room: RoomState): void {
  const isSuper = Math.random() < 0.22;

  room.powerups.push({
    id: room.nextPowerupId++,
    x: Math.random() * (config.viewportSize - 60) + 30,
    y: -50,
    type: isSuper ? 'super' : 'speed',
    radius: 15,
  });
}

/**
 * Spawn a meteor shower (burst of asteroids)
 */
function spawnMeteorShower(room: RoomState): void {
  const count = 7;
  const minSize = 18;
  const maxSize = 28;
  const margin = 18;
  const band = Math.max(1, config.viewportSize - margin * 2);

  for (let i = 0; i < count; i++) {
    const size = minSize + Math.random() * (maxSize - minSize);
    const slotW = band / count;
    const center = margin + (i + 0.5) * slotW;
    const jitter = (Math.random() - 0.5) * slotW * 0.7;
    const x = Math.max(size / 2 + 4, Math.min(config.viewportSize - size / 2 - 4, center + jitter));
    const y = -80 - Math.random() * 220;
    const seed = Math.floor(Math.random() * 1000000000);

    room.asteroids.push({
      id: room.nextAsteroidId++,
      x,
      y,
      radius: size / 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.12,
      seed,
      hp: 1,
    });
  }
}

/**
 * Check all collisions
 */
function checkCollisions(room: RoomState): void {
  // Bullet-Asteroid collisions
  for (let bi = room.bullets.length - 1; bi >= 0; bi--) {
    const bullet = room.bullets[bi];

    for (let ai = room.asteroids.length - 1; ai >= 0; ai--) {
      const asteroid = room.asteroids[ai];

      if (checkBulletAsteroidCollision(bullet, asteroid)) {
        // Award points to bullet owner
        const owner = room.players.get(bullet.ownerId);
        if (owner && !owner.isDead) {
          owner.score += 25;
        }

        // Remove both
        room.bullets.splice(bi, 1);
        room.asteroids.splice(ai, 1);
        break;
      }
    }
  }

  // Player-Asteroid and Player-Obstacle collisions
  for (const player of room.players.values()) {
    if (player.isDead) continue;

    // Check asteroid collisions
    for (const asteroid of room.asteroids) {
      if (checkAsteroidCollision(player, asteroid, config)) {
        killPlayer(player);
        break;
      }
    }

    if (player.isDead) continue;

    // Check obstacle collisions
    if (checkObstacleCollision(player, room.scrollY, room.levelSegments, config)) {
      killPlayer(player);
    }

    if (player.isDead) continue;

    // Check powerup pickups
    for (let pi = room.powerups.length - 1; pi >= 0; pi--) {
      const powerup = room.powerups[pi];

      if (checkPowerupCollision(player, powerup, config)) {
        activatePowerup(player, powerup.type);
        room.powerups.splice(pi, 1);
      }
    }
  }
}

/**
 * Kill a player
 */
function killPlayer(player: Player): void {
  player.isDead = true;
  player.trail = [];
  log.debug(`Player ${player.id} died with score ${player.score}`);
}

/**
 * Create a world snapshot for broadcasting
 */
export function createWorldSnapshot(room: RoomState): WorldSnapshot {
  return {
    t: Date.now(),
    levelSeed: room.levelSeed,
    scrollY: Math.round(room.scrollY * 10) / 10,
    scrollSpeed: Math.round(room.scrollSpeed * 10) / 10,
    asteroids: room.asteroids.map((a) => ({
      x: Math.round(a.x * 10) / 10,
      y: Math.round(a.y * 10) / 10,
      radius: a.radius,
      rotation: a.rotation,
      rotSpeed: a.rotSpeed,
      seed: a.seed,
    })),
    powerups: room.powerups.map((p) => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      type: p.type,
      radius: p.radius,
    })),
    bullets: room.bullets.map((b) => ({
      ownerId: b.ownerId,
      x: Math.round(b.x * 10) / 10,
      y: Math.round(b.y * 10) / 10,
      shotId: b.id,
    })),
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      score: p.score,
      isDead: p.isDead,
      isInvincible: p.isInvincible,
      boostType: p.boostType,
      boostRemaining: Math.round((p.invincibleTimer || 0) * 10) / 10,
      color: p.color,
      displayName: p.displayName,
    })),
  };
}

/**
 * Get final scores
 */
export function getFinalScores(room: RoomState): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [id, player] of room.players) {
    scores[id] = player.score;
  }
  return scores;
}
