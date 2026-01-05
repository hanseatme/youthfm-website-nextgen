// Game Types for Asteroids Server

export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  displayName: string | null;
  color: string;
  x: number;
  y: number;
  score: number;
  isDead: boolean;
  isInvincible: boolean;
  invincibleTimer: number;
  boostType: 'speed' | 'super' | null;
  passedSegment: number;
  trail: TrailPoint[];
}

export interface TrailPoint {
  x: number;
  y: number;
  life: number;
}

export interface Asteroid {
  id: number;
  x: number;
  y: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  seed: number;
  hp: number;
}

export interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Powerup {
  id: number;
  x: number;
  y: number;
  type: 'speed' | 'super';
  radius: number;
}

export interface LevelSegment {
  gapX: number;
  color: string;
}

export interface GameConfig {
  viewportSize: number;
  playerSpeed: number;
  scrollSpeedBase: number;
  scrollSpeedMax: number;
  obstacleGapHeight: number;
  gapWidth: number;
  playerSize: number;
  bulletSpeed: number;
  asteroidSpeedAdd: number;
  spawnRates: {
    asteroid: number;
    powerup: number;
  };
  levelSegments: number;
  warmupSegments: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  viewportSize: 720,
  playerSpeed: 400,
  scrollSpeedBase: 90,
  scrollSpeedMax: 520,
  obstacleGapHeight: 240,
  gapWidth: 130,
  playerSize: 20,
  bulletSpeed: 800,
  asteroidSpeedAdd: 35,
  spawnRates: {
    asteroid: 0.010,
    powerup: 0.0025,
  },
  levelSegments: 48,
  warmupSegments: 2,
};

export interface WorldSnapshot {
  t: number;
  levelSeed: number;
  scrollY: number;
  scrollSpeed: number;
  asteroids: AsteroidSnapshot[];
  powerups: PowerupSnapshot[];
  bullets: BulletSnapshot[];
  players: PlayerSnapshot[];
}

export interface AsteroidSnapshot {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  seed: number;
}

export interface PowerupSnapshot {
  x: number;
  y: number;
  type: 'speed' | 'super';
  radius: number;
}

export interface BulletSnapshot {
  ownerId: string;
  x: number;
  y: number;
  shotId: string;
}

export interface PlayerSnapshot {
  id: string;
  x: number;
  y: number;
  score: number;
  isDead: boolean;
  isInvincible: boolean;
  boostType: 'speed' | 'super' | null;
  boostRemaining: number;
  color: string;
  displayName: string | null;
}

// Network Message Types
export type ClientMessage =
  | { type: 'input'; moveX: number; x?: number; shoot?: boolean; shotId?: string }
  | { type: 'ping'; t: number }
  | { type: 'start' };

export type ServerMessage =
  | { type: 'state'; payload: WorldSnapshot }
  | { type: 'joined'; playerId: string; roomId: string }
  | { type: 'left'; playerId: string }
  | { type: 'gameStart' }
  | { type: 'gameEnd'; scores: Record<string, number> }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong'; t: number; serverTime: number };

export interface RoomState {
  id: string;
  status: 'lobby' | 'running' | 'finished';
  players: Map<string, Player>;
  levelSeed: number;
  scrollY: number;
  scrollSpeed: number;
  elapsed: number;
  asteroids: Asteroid[];
  bullets: Bullet[];
  powerups: Powerup[];
  levelSegments: LevelSegment[];
  nextAsteroidId: number;
  nextPowerupId: number;
  meteorTimer: number;
  lastTickTime: number;
}
