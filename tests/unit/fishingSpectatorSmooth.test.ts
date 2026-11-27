// @vitest-environment node
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { tryHandleDonorDevLan, type DevLanDonorDb } from '../../src/server/devLanDonorRoute';
import {
  createTidefallFishingIdle,
  type TidefallFishingState,
} from '../../src/shared/donor/tidefall-phaser/tidefallFishingFsm';
import { stepSpectatorFishingState } from '../../src/shared/donor/tidefall-phaser/tidefallFishingSpectator';

describe('ChillFishing spectator 60fps smoothing & non-blocking SSE broadcast', () => {
  it('interpolates pointerNorm, progress and targetCenter while keeping elapsedMs moving smoothly', () => {
    let state: TidefallFishingState = {
      ...createTidefallFishingIdle(),
      phase: 'minigame',
      pointerNorm: 0.2,
      pointerDir: 1,
      pointerSpeed: 1.4,
      progress: 0.4,
      targetCenter: 0.5,
      targetWidth: 0.28,
    };

    const startElapsed = state.elapsedMs;
    const steps: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      state = stepSpectatorFishingState(
        state,
        {
          phase: 'minigame',
          progress: 0.72,
          pointerNorm: 0.78,
          targetCenter: 0.62,
          targetWidth: 0.28,
          pointerDir: 1,
          pointerSpeed: 1.4,
        },
        0.016,
      );
      steps.push(state.pointerNorm);
    }

    expect(state.elapsedMs).toBeGreaterThan(startElapsed + 180);
    // Smooth progression rather than staying frozen or jumping beyond clamped bounds
    expect(steps[0]!).toBeGreaterThan(0.2);
    expect(steps[0]!).toBeLessThan(0.78);
    expect(state.pointerNorm).toBeLessThanOrEqual(0.96);
    expect(state.pointerNorm).toBeGreaterThanOrEqual(0.04);
    expect(state.progress).toBeGreaterThan(0.45);
    expect(state.progress).toBeLessThanOrEqual(0.72);
    expect(state.targetCenter).toBeGreaterThan(0.5);
    expect(state.targetCenter).toBeLessThanOrEqual(0.62);
  });

  it('broadcasts donor_fishing_sync via SSE without flushing synchronous disk saveDb during sync ticks', async () => {
    const saveDb = vi.fn();
    const broadcastEvent = vi.fn();
    const v015: DevLanDonorDb & Record<string, unknown> = {
      donorFishSession: {
        'w-1': {
          seed: 123,
          startedAtMs: 1000,
          spotId: 'gull_bay',
          previewName: 'Salmon',
          phase: 'minigame',
          progressPermille: 400,
          pointerNorm: 0.3,
          anglerUserId: 'u-may',
          updatedAtMs: 1000,
        },
      },
    };

    let statusCode = 200;
    let bodyOut = '';
    const req = Readable.from([]) as unknown as { method: string; url: string };
    req.method = 'POST';
    req.url = '/donor/fishing/sync';
    const res = new EventEmitter() as EventEmitter & {
      statusCode: number;
      setHeader: () => void;
      end: (chunk?: string) => void;
    };
    Object.defineProperty(res, 'statusCode', {
      get: () => statusCode,
      set: (v: number) => {
        statusCode = v;
      },
    });
    res.setHeader = () => {};
    res.end = (chunk = '') => {
      bodyOut += chunk;
    };

    const handled = await tryHandleDonorDevLan({
      req: req as never,
      res: res as never,
      route: '/donor/fishing/sync',
      body: {
        worldId: 'w-1',
        spotId: 'gull_bay',
        phase: 'minigame',
        progressPermille: 650,
        pointerNorm: 0.74,
        targetCenter: 0.55,
        targetWidth: 0.25,
        pointerDir: -1,
        pointerSpeed: 1.5,
      },
      worldId: 'w-1',
      v015,
      sendJson: (r, status, payload) => {
        r.statusCode = status;
        r.end(JSON.stringify(payload));
      },
      getInventoryList: () => [],
      setInventoryList: () => {},
      saveDb,
      broadcastEvent,
      isWorldMember: () => true,
      userId: 'u-may',
    });

    expect(handled).toBe(true);
    expect(statusCode).toBe(200);
    expect(JSON.parse(bodyOut).ok).toBe(true);
    expect(saveDb).not.toHaveBeenCalled();
    expect(broadcastEvent).toHaveBeenCalledWith(
      'w-1',
      'donor_fishing_sync',
      expect.objectContaining({
        spotId: 'gull_bay',
        phase: 'minigame',
        progressPermille: 650,
        pointerNorm: 0.74,
        targetCenter: 0.55,
        targetWidth: 0.25,
        pointerDir: -1,
        pointerSpeed: 1.5,
      }),
    );
  });
});
