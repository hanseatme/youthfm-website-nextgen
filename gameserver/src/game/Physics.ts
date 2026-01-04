import {
  Player,
  Asteroid,
  Bullet,
  Powerup,
  LevelSegment,
  GameConfig,
  DEFAULT_CONFIG,
} from './types.js';
import { getGapForSegmentIndex } from './LevelGenerator.js';

/**
 * Check circle-circle collision
 */
export function circleCollision(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < r1 + r2;
}

/**
 * Check if a point is inside a rectangle
 */
export function pointInRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Check rectangle-rectangle collision
 */
export function rectCollision(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
): boolean {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * Check if player collides with obstacle segment
 */
export function checkObstacleCollision(
  player: Player,
  scrollY: number,
  levelSegments: LevelSegment[],
  config: GameConfig = DEFAULT_CONFIG
): boolean {
  if (player.isInvincible) return false;

  const gapH = config.obstacleGapHeight;
  const playerRadius = config.playerSize;

  // Get visible segments
  const minY = -80;
  const maxY = config.viewportSize + 80;
  const minSeg = Math.max(0, Math.floor((scrollY - maxY) / gapH) - 1);
  const maxSeg = Math.max(0, Math.ceil((scrollY - minY) / gapH) - 1);

  for (let seg = minSeg; seg <= maxSeg; seg++) {
    const obstacleY = -gapH * (seg + 1) + scrollY;
    const gap = getGapForSegmentIndex(seg, levelSegments, config);

    // Skip if obstacle is not near player
    if (Math.abs(obstacleY - player.y) > playerRadius + 10) continue;

    // Check if player is within the gap
    const halfGap = gap.gapWidth / 2;
    const gapLeft = gap.gapX - halfGap;
    const gapRight = gap.gapX + halfGap;

    // Player is hitting the wall if outside the gap
    if (player.x - playerRadius < gapLeft || player.x + playerRadius > gapRight) {
      return true;
    }
  }

  return false;
}

/**
 * Check if player collides with an asteroid
 */
export function checkAsteroidCollision(
  player: Player,
  asteroid: Asteroid,
  config: GameConfig = DEFAULT_CONFIG
): boolean {
  if (player.isInvincible) return false;

  return circleCollision(
    player.x,
    player.y,
    config.playerSize * 0.8, // Slightly smaller hitbox for fairness
    asteroid.x,
    asteroid.y,
    asteroid.radius * 0.9
  );
}

/**
 * Check if bullet hits an asteroid
 */
export function checkBulletAsteroidCollision(bullet: Bullet, asteroid: Asteroid): boolean {
  // Simple rect-circle approximation
  const bulletCenterX = bullet.x;
  const bulletCenterY = bullet.y - bullet.h / 2;

  return circleCollision(
    bulletCenterX,
    bulletCenterY,
    Math.max(bullet.w, bullet.h) / 2,
    asteroid.x,
    asteroid.y,
    asteroid.radius
  );
}

/**
 * Check if player collects a powerup
 */
export function checkPowerupCollision(
  player: Player,
  powerup: Powerup,
  config: GameConfig = DEFAULT_CONFIG
): boolean {
  if (player.isDead) return false;

  return circleCollision(player.x, player.y, config.playerSize, powerup.x, powerup.y, powerup.radius);
}

/**
 * Get the current segment index based on scroll position
 */
export function getCurrentSegment(
  scrollY: number,
  config: GameConfig = DEFAULT_CONFIG
): number {
  return Math.floor(scrollY / config.obstacleGapHeight);
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Update player position based on input
 */
export function updatePlayerPosition(
  player: Player,
  inputX: number,
  dt: number,
  config: GameConfig = DEFAULT_CONFIG
): void {
  if (player.isDead) return;

  const speedMultiplier = player.isInvincible ? 1.5 : 1.0;
  const moveSpeed = config.playerSpeed * speedMultiplier;

  player.x += inputX * moveSpeed * dt;
  player.x = clamp(player.x, config.playerSize, config.viewportSize - config.playerSize);

  // Update trail
  player.trail.push({
    x: player.x,
    y: player.y,
    life: 1.0,
  });

  // Limit trail length
  if (player.trail.length > 20) {
    player.trail.shift();
  }
}

/**
 * Update player timers
 */
export function updatePlayerTimers(player: Player, dt: number): void {
  if (player.isDead) return;

  if (player.isInvincible) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) {
      player.isInvincible = false;
      player.invincibleTimer = 0;
      player.boostType = null;
    }
  }

  // Update trail life
  for (let i = player.trail.length - 1; i >= 0; i--) {
    player.trail[i].life -= dt * 5;
    if (player.trail[i].life <= 0) {
      player.trail.splice(i, 1);
    }
  }
}

/**
 * Activate a powerup for a player
 */
export function activatePowerup(player: Player, type: 'speed' | 'super'): void {
  const isSuper = type === 'super';
  const duration = isSuper ? 8.0 : 4.0;

  player.boostType = type;
  player.isInvincible = true;
  player.invincibleTimer = duration;
}
