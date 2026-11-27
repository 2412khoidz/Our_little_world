import type { PetAnimState } from '../petVisualTypes';
import { licensedCatFrameSeriesForState } from '../petCare/petCareLicensedCatMaps';

/** Advance licensed Frakassets frame index for 2D/3D rigs (not a static billboard). */
export function stepLicensedCatFrame(
  anim: PetAnimState,
  cursor: number,
  frameMs: number,
  deltaMs: number,
  accumMs: number,
): { frameIndex: number; nextCursor: number; nextAccum: number } {
  const series = licensedCatFrameSeriesForState(anim);
  const nextAccum = accumMs + deltaMs;
  if (series.length <= 1 || nextAccum < frameMs) {
    return {
      frameIndex: series[cursor] ?? series[0] ?? 48,
      nextCursor: cursor,
      nextAccum,
    };
  }
  const nextCursor = (cursor + 1) % series.length;
  return {
    frameIndex: series[nextCursor] ?? 48,
    nextCursor,
    nextAccum: 0,
  };
}