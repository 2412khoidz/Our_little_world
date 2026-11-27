export function fishingReelMotion(progress: number, elapsedMs: number, activelyPulling = true) {
  const engage = Math.max(0, Math.min(1, elapsedMs / 240));
  const cycle = (1 + Math.sin(elapsedMs / 105)) * 0.5;
  const effort = engage * (activelyPulling ? 0.6 + 0.4 * cycle : 0.15 + 0.15 * cycle);
  return {
    bend: effort,
    lineShorten: Math.max(0, Math.min(1, progress)) * 0.58 + effort * 0.055,
    liftPx: effort * 4,
  };
}
