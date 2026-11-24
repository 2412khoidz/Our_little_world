import { describe, expect, it } from 'vitest';
import {
  buildExpansionLandmarks,
  estimateWalkTimeSec,
  findNearestLandmark,
} from '../../src/game/worldSandbox/worldExpansionMap';

describe('World Expansion Map Architecture (M6)', () => {
  it('builds 10 distinct cozy landmarks across both 64x64 and 96x96 layouts within bounds', () => {
    for (const size of [64, 96] as const) {
      const landmarks = buildExpansionLandmarks(size);
      expect(landmarks).toHaveLength(10);
      for (const lm of landmarks) {
        expect(lm.tileX).toBeGreaterThanOrEqual(4);
        expect(lm.tileY).toBeGreaterThanOrEqual(4);
        expect(lm.tileX).toBeLessThan(size - 2);
        expect(lm.tileY).toBeLessThan(size - 2);
      }
      const cottage = landmarks.find((l) => l.id === 'cottage')!;
      const beach = landmarks.find((l) => l.id === 'beach')!;
      const sec = estimateWalkTimeSec(cottage, beach, 84);
      expect(sec).toBeGreaterThan(5);
      expect(sec).toBeLessThan(25);

      const nearest = findNearestLandmark(cottage.tileX, cottage.tileY, landmarks);
      expect(nearest.landmark.id).toBe('cottage');
      expect(nearest.inside).toBe(true);
    }
  });
});
