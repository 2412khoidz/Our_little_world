/**
 * Stroke / brush sampling adapted from SawyerHood/nintendogs-threejs `play.ts` (petting section).
 * 2D zones for licensed cat billboard — no dog rig.
 */
import type { PetCareZone } from '../../shared/petLiving/petCare/petCareTypes';

export interface StrokeSample {
  t: number;
  nx: number;
  ny: number;
}

export type OlwCatStrokeMode = 'normal' | 'brush';

export class OlwCatStrokeBrain {
  mode: OlwCatStrokeMode = 'normal';
  private samples: StrokeSample[] = [];
  private last: StrokeSample | null = null;
  private affectionBurst = 0;

  setMode(mode: OlwCatStrokeMode): void {
    this.mode = mode;
  }

  zoneFromNorm(nx: number, ny: number): PetCareZone | 'none' {
    if (nx < 0.08 || nx > 0.92 || ny < 0.08 || ny > 0.92) return 'none';
    if (ny < 0.38) return 'head';
    if (ny > 0.72) return 'chin';
    return 'back';
  }

  /** `@returns` stroke speed in normalized units per second (donor-style). */
  stroke(nx: number, ny: number, nowMs = performance.now()): { zone: PetCareZone; speed: number } | null {
    const zone = this.zoneFromNorm(nx, ny);
    if (zone === 'none') return null;
    const sample: StrokeSample = { t: nowMs, nx, ny };
    let speed = 0;
    if (this.last) {
      const dt = Math.max(1, nowMs - this.last.t) / 1000;
      const dx = nx - this.last.nx;
      const dy = ny - this.last.ny;
      speed = Math.sqrt(dx * dx + dy * dy) / dt;
    }
    this.last = sample;
    this.samples.push(sample);
    if (this.samples.length > 24) this.samples.shift();
    if (speed > 0.12) this.affectionBurst = Math.min(1, this.affectionBurst + speed * 0.08 * (this.mode === 'brush' ? 1.3 : 1));
    return { zone, speed };
  }

  endStroke(): void {
    this.last = null;
    this.samples = [];
  }

  consumeBrushSparkle(): boolean {
    if (this.mode !== 'brush' || this.affectionBurst < 0.35) return false;
    this.affectionBurst = 0;
    return true;
  }
}