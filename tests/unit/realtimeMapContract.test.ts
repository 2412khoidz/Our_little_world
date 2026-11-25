import { describe, expect, it } from 'vitest';
import { movementPacketSchema } from '../../src/shared/realtime';
import { isPositionWithinMapBounds } from '../../src/shared/realtime';

describe('realtime map contract (outdoor)', () => {
  it('movement schema accepts outdoor mapId', () => {
    const parsed = movementPacketSchema.safeParse({
      worldId: 'w1',
      userId: 'u1',
      sessionId: 's1',
      mapId: 'outdoor',
      seq: 1,
      timestampMs: 1,
      x: 256,
      y: 320,
      facing: 'down',
      anim: 'idle',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects legacy unknown map ids', () => {
    const parsed = movementPacketSchema.safeParse({
      worldId: 'w1',
      userId: 'u1',
      sessionId: 's1',
      mapId: 'meadow',
      seq: 1,
      timestampMs: 1,
      x: 8,
      y: 8,
      facing: 'down',
      anim: 'idle',
    });
    expect(parsed.success).toBe(false);
  });

  it('outdoor bounds match 64×64 tiles', () => {
    expect(isPositionWithinMapBounds('outdoor', 1024, 1024)).toBe(true);
    expect(isPositionWithinMapBounds('outdoor', 1025, 100)).toBe(false);
  });
});