import { describe, expect, it } from 'vitest';
import { avatarWalkAnimKey } from '../../src/game/art/avatarDiagonalWalk';
import { movementPacketSchema } from '../../src/shared/realtime';

describe('avatar diagonal walk', () => {
  it('builds walk anim keys for diagonal facings', () => {
    expect(avatarWalkAnimKey('avatar:demo', 'down-right')).toBe('avatar:demo:walk-down-right');
  });

  it('movement schema accepts optional facing8', () => {
    const parsed = movementPacketSchema.safeParse({
      worldId: 'w',
      userId: 'u',
      sessionId: 's',
      mapId: 'home',
      seq: 1,
      timestampMs: 1,
      x: 100,
      y: 100,
      facing: 'down',
      facing8: 'down-left',
      anim: 'walk',
    });
    expect(parsed.success).toBe(true);
  });
});