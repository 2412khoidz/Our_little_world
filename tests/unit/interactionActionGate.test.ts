import { describe, expect, it } from 'vitest';
import { EMPTY_HELD_ITEM } from '../../src/shared/interaction/interactionResolver';
import { validateActionAgainstLatestFrame } from '../../src/features/home/interactionActionGate';
import type { ContextualResolution } from '../../src/shared/interaction/interactionTypes';

const resolution: ContextualResolution = {
  targetId: 'door-to-garden',
  primary: {
    code: 'use_portal',
    keyHint: 'J',
    labelVi: 'Ra khu vườn',
    targetId: 'door-to-garden',
    available: true,
  },
  secondary: null,
};

describe('validateActionAgainstLatestFrame', () => {
  it('rejects when mapId changed since prompt', () => {
    const ok = validateActionAgainstLatestFrame(
      resolution,
      {
        mapId: 'home',
        playerX: 120,
        playerY: 176,
        facing: 'down',
        interactables: [
          {
            id: 'door-to-garden',
            kind: 'portal',
            labelVi: 'Ra khu vườn',
            x: 120,
            y: 176,
            maxRadiusPx: 30,
          },
        ],
      },
      'garden',
      EMPTY_HELD_ITEM,
      'primary',
    );
    expect(ok).toBe(false);
  });

  it('accepts when frame and action still match', () => {
    const frame = {
      mapId: 'home' as const,
      playerX: 120,
      playerY: 176,
      facing: 'down' as const,
      interactables: [
        {
          id: 'door-to-garden',
          kind: 'portal' as const,
          labelVi: 'Ra khu vườn',
          x: 120,
          y: 176,
          maxRadiusPx: 30,
        },
      ],
    };
    expect(validateActionAgainstLatestFrame(resolution, frame, 'home', EMPTY_HELD_ITEM, 'primary')).toBe(true);
  });
});