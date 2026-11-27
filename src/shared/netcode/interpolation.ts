import type { MapId } from '../types';

export interface RemoteMotionSample {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  anim: 'idle' | 'walk';
  mapId: MapId;
  seq: number;
  receivedAtMonoMs: number;
}

export interface MapPixelBounds {
  maxW: number;
  maxH: number;
}

export const SNAP_DISTANCE_PX = 96;
export const SETTLE_DISTANCE_PX = 0.35;
export const MAX_EXTRAPOLATION_MS = 160;
export const MAX_VELOCITY_PX_PER_SEC = 180;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function clampVelocity(vx: number, vy: number): { vx: number; vy: number } {
  const speed = Math.hypot(vx, vy);
  if (!Number.isFinite(speed) || speed <= 0.001) return { vx: 0, vy: 0 };
  if (speed <= MAX_VELOCITY_PX_PER_SEC) return { vx, vy };
  const scale = MAX_VELOCITY_PX_PER_SEC / speed;
  return { vx: vx * scale, vy: vy * scale };
}

/**
 * Adaptive remote entity interpolator with bounded extrapolation and correction smoothing,
 * inspired by Kaetram-Open / BrowserQuest movement transitions while preventing rubber-banding.
 */
export class RemoteMotionInterpolator {
  private currentX: number;
  private currentY: number;
  private targetX: number;
  private targetY: number;
  private vx = 0;
  private vy = 0;
  private anim: 'idle' | 'walk' = 'idle';
  private mapId: MapId;
  private lastSampleMonoMs: number;

  constructor(initialX: number, initialY: number, mapId: MapId, nowMonoMs = 0) {
    this.currentX = initialX;
    this.currentY = initialY;
    this.targetX = initialX;
    this.targetY = initialY;
    this.mapId = mapId;
    this.lastSampleMonoMs = nowMonoMs;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY };
  }

  getTarget(): { x: number; y: number } {
    return { x: this.targetX, y: this.targetY };
  }

  pushSample(sample: RemoteMotionSample, bounds: MapPixelBounds, snapOverride = false): void {
    const clampedX = clamp(sample.x, 0, bounds.maxW);
    const clampedY = clamp(sample.y, 0, bounds.maxH);
    const mapChanged = sample.mapId !== this.mapId;
    const distFromCurrent = Math.hypot(clampedX - this.currentX, clampedY - this.currentY);

    if (snapOverride || mapChanged || distFromCurrent > SNAP_DISTANCE_PX) {
      this.currentX = clampedX;
      this.currentY = clampedY;
      this.targetX = clampedX;
      this.targetY = clampedY;
      this.vx = 0;
      this.vy = 0;
      this.anim = sample.anim;
      this.mapId = sample.mapId;
      this.lastSampleMonoMs = sample.receivedAtMonoMs;
      return;
    }

    if (sample.anim === 'idle') {
      this.vx = 0;
      this.vy = 0;
    } else if (
      typeof sample.vx === 'number' &&
      typeof sample.vy === 'number' &&
      Number.isFinite(sample.vx) &&
      Number.isFinite(sample.vy)
    ) {
      const clampedVel = clampVelocity(sample.vx, sample.vy);
      this.vx = clampedVel.vx;
      this.vy = clampedVel.vy;
    } else {
      const dtSec = (sample.receivedAtMonoMs - this.lastSampleMonoMs) / 1000;
      if (dtSec >= 0.03 && dtSec <= 0.6) {
        const derived = clampVelocity(
          (clampedX - this.targetX) / dtSec,
          (clampedY - this.targetY) / dtSec,
        );
        this.vx = derived.vx;
        this.vy = derived.vy;
      } else {
        this.vx = 0;
        this.vy = 0;
      }
    }

    this.targetX = clampedX;
    this.targetY = clampedY;
    this.anim = sample.anim;
    this.mapId = sample.mapId;
    this.lastSampleMonoMs = sample.receivedAtMonoMs;
  }

  step(
    nowMonoMs: number,
    deltaMs: number,
    networkJitterMs: number,
    bounds: MapPixelBounds,
  ): { x: number; y: number; moving: boolean } {
    const dtMs = Math.max(0, Math.min(100, deltaMs));
    let goalX = this.targetX;
    let goalY = this.targetY;

    if (this.anim === 'walk' && (this.vx !== 0 || this.vy !== 0)) {
      const ageMs = Math.max(0, nowMonoMs - this.lastSampleMonoMs);
      const rawExtrapMs = Math.min(ageMs, MAX_EXTRAPOLATION_MS);
      // Taper extrapolation slightly after 100ms so packet pauses glide to a soft stop.
      const effectiveExtrapMs =
        rawExtrapMs <= 100 ? rawExtrapMs : 100 + (rawExtrapMs - 100) * 0.5;
      goalX = clamp(this.targetX + (this.vx * effectiveExtrapMs) / 1000, 0, bounds.maxW);
      goalY = clamp(this.targetY + (this.vy * effectiveExtrapMs) / 1000, 0, bounds.maxH);
    }

    const dx = goalX - this.currentX;
    const dy = goalY - this.currentY;
    const dist = Math.hypot(dx, dy);

    if (dist < SETTLE_DISTANCE_PX) {
      const settledMoving = this.anim === 'walk' && Math.hypot(this.vx, this.vy) > 4;
      this.currentX = goalX;
      this.currentY = goalY;
      return { x: this.currentX, y: this.currentY, moving: settledMoving };
    }

    const safeJitter = Number.isFinite(networkJitterMs) ? Math.max(0, networkJitterMs) : 0;
    let smoothing = clamp(16 - safeJitter * 0.04, 8, 16);
    if (dist > 24) {
      smoothing = Math.min(20, smoothing + (dist - 24) * 0.12);
    }

    const alpha = 1 - Math.exp((-smoothing * dtMs) / 1000);
    const prevX = this.currentX;
    const prevY = this.currentY;
    this.currentX = clamp(this.currentX + dx * alpha, 0, bounds.maxW);
    this.currentY = clamp(this.currentY + dy * alpha, 0, bounds.maxH);

    // Clamp to goal without overshooting when idle
    if (this.anim === 'idle' && Math.hypot(goalX - this.currentX, goalY - this.currentY) < SETTLE_DISTANCE_PX) {
      this.currentX = goalX;
      this.currentY = goalY;
    }

    const stepDist = Math.hypot(this.currentX - prevX, this.currentY - prevY);
    return {
      x: this.currentX,
      y: this.currentY,
      moving: stepDist > 0.05 || (this.anim === 'walk' && dist > SETTLE_DISTANCE_PX),
    };
  }
}
