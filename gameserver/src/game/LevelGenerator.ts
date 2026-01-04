import { LevelSegment, DEFAULT_CONFIG, GameConfig } from './types.js';

/**
 * Mulberry32 PRNG - same algorithm as client for deterministic levels
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string to a numeric seed
 */
export function hashStringToSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generate deterministic level segments for the game
 */
export function generateLevelSegments(
  seed: number,
  config: GameConfig = DEFAULT_CONFIG
): LevelSegment[] {
  const rng = mulberry32((seed || 1) >>> 0);
  const segments: LevelSegment[] = [];

  const gapH = config.obstacleGapHeight;
  const timeToNext = gapH / config.scrollSpeedMax;
  const maxDelta = Math.max(120, Math.min(260, config.playerSpeed * timeToNext * 1.2));

  let lastGapX = config.viewportSize / 2;

  for (let i = 0; i < config.levelSegments; i++) {
    const minX = Math.max(config.gapWidth / 2 + 20, lastGapX - maxDelta);
    const maxX = Math.min(config.viewportSize - config.gapWidth / 2 - 20, lastGapX + maxDelta);
    const gapX = minX + (maxX - minX) * rng();
    const hue = Math.floor(rng() * 360);

    segments.push({
      gapX,
      color: `hsl(${hue}, 70%, 50%)`,
    });

    lastGapX = gapX;
  }

  // Rotate so the loop boundary is as smooth as possible
  let bestIdx = 0;
  let bestDelta = Infinity;
  for (let i = 1; i < segments.length; i++) {
    const d = Math.abs(segments[i].gapX - segments[i - 1].gapX);
    if (d < bestDelta) {
      bestDelta = d;
      bestIdx = i;
    }
  }

  if (bestIdx > 0) {
    return segments.slice(bestIdx).concat(segments.slice(0, bestIdx));
  }

  return segments;
}

/**
 * Get the gap info for a specific segment index
 */
export function getGapForSegmentIndex(
  segmentIndex: number,
  levelSegments: LevelSegment[],
  config: GameConfig = DEFAULT_CONFIG
): { gapX: number; gapWidth: number; color: string } {
  if (segmentIndex < config.warmupSegments) {
    return {
      gapX: config.viewportSize / 2,
      gapWidth: config.viewportSize * 2, // Wide open for warmup
      color: '#00ffff',
    };
  }

  const idx = (segmentIndex - config.warmupSegments) % config.levelSegments;
  const seg = levelSegments[idx] || { gapX: config.viewportSize / 2, color: '#00ffff' };

  return {
    gapX: seg.gapX,
    gapWidth: config.gapWidth,
    color: seg.color,
  };
}

/**
 * Create asteroid shape points (for collision detection consistency)
 */
export function createAsteroidShape(radius: number, seed: number): { x: number; y: number }[] {
  const rng = mulberry32((seed || 1) >>> 0);
  const points: { x: number; y: number }[] = [];
  const segments = 8;

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const r = radius * (0.8 + rng() * 0.4);
    points.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }

  return points;
}
