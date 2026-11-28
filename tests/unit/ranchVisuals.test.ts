import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import ranchActions from '../../public/assets/farming/ranch-actions.json';
import ranchFishing from '../../public/assets/farming/ranch-fishing.json';
import {
  farmActionAnimations, fishingAtlasFrame, fishingStripForPhase, harvestDropTrees, machineAtlasFrame,
  machineFrameKey, machineJobProgress, machinePhase, machinePhaseFrames, ranchMinnowFrame,
} from '../../src/shared/art/ranchActionAtlas';
import { applyDeepFarmMutation, createEmptyDeepFarmState, projectDeepFarmSnapshot } from '../../src/shared/farming/deepFarmState';
import { confirmedDeepFarmEffects, confirmedPlotEffects } from '../../src/shared/farming/confirmedFarmVisualEffects';
import { createWorkshopsState, queueWorkshopJob, WORKSHOP_DEFS } from '../../src/shared/farming/workshops';
import type { FarmPlotView } from '../../src/shared/farming/farmSnapshotTypes';
import { FarmActionEffects, WorkshopMachineVisuals } from '../../src/game/farming/RanchActionVisuals';
import type Phaser from 'phaser';

vi.mock('phaser', () => ({
  default: { Animations: { Events: { ANIMATION_COMPLETE: 'animationcomplete' } } },
}));

describe('Farm & Ranch Life presentation', () => {
  it('maps the persisted queue to donor machine stages at exact deadlines', () => {
    const first = { startMs: 100, endMs: 200 };
    const second = { startMs: 200, endMs: 300 };
    expect(machinePhase([], 150)).toBe('idle');
    expect(machinePhase([first], 99)).toBe('idle');
    expect(machinePhase([first], 100)).toBe('working');
    expect(machinePhase([first, second], 200)).toBe('ready');
    expect(machinePhase([second], 200)).toBe('working');
    expect(machineJobProgress(first, 50)).toBe(0);
    expect(machineJobProgress(first, 150)).toBe(0.5);
    expect(machineJobProgress(first, 200)).toBe(1);
  });

  it('packs every used frame inside an existing atlas with a shared UI crop', () => {
    for (const doc of [ranchActions, ranchFishing]) {
      const png = readFileSync(`public${doc.meta.image}`);
      expect(png.readUInt32BE(16)).toBe(doc.meta.size.w);
      expect(png.readUInt32BE(20)).toBe(doc.meta.size.h);
      for (const { frame } of Object.values(doc.frames)) {
        expect(frame.x + frame.w).toBeLessThanOrEqual(doc.meta.size.w);
        expect(frame.y + frame.h).toBeLessThanOrEqual(doc.meta.size.h);
      }
    }
    const actions = ranchActions.frames as Record<string, { frame: typeof ranchMinnowFrame }>;
    for (const { id } of WORKSHOP_DEFS) {
      for (const [phase, indices] of Object.entries(machinePhaseFrames)) {
        expect(machineAtlasFrame(id, phase as keyof typeof machinePhaseFrames)).toEqual(actions[machineFrameKey(id, indices[0])]?.frame);
        for (const index of indices) expect(actions[machineFrameKey(id, index)]?.frame).toBeDefined();
      }
    }
    for (const [key, { count }] of Object.entries(farmActionAnimations)) {
      for (let i = 0; i < count; i += 1) expect(actions[`${key}_${i}`]?.frame).toBeDefined();
    }
    for (const tree of harvestDropTrees) expect(actions[`fruit_${tree}_1`]?.frame).toBeDefined();
  });

  it('anchors confirmed plot changes and skips repeated, untouched, or auto-watered cells', () => {
    const empty: FarmPlotView = {
      plotId: 9, soil: 'empty', cropSku: null, plantedAtMs: null, waterCount: 0, growthPermille: 0,
      ready: false, harvestReadyAtMs: null, growthStage: null,
    };
    const tilled: FarmPlotView = { ...empty, soil: 'tilled' };
    const planted: FarmPlotView = { ...empty, soil: 'planted', cropSku: 'wheat', plantedAtMs: 100 };
    expect(confirmedPlotEffects([], [tilled])).toEqual([]);
    expect(confirmedPlotEffects([empty], [tilled])).toEqual([{ plotId: 9, action: 'till' }]);
    expect(confirmedPlotEffects([tilled], [planted])).toEqual([{ plotId: 9, action: 'plant' }]);
    expect(confirmedPlotEffects([planted], [{ ...planted, waterCount: 1 }])).toEqual([{ plotId: 9, action: 'water' }]);
    expect(confirmedPlotEffects([planted], [{ ...planted, waterCount: 1, autoWatered: true }])).toEqual([]);
    expect(confirmedPlotEffects([planted], [{ ...planted, growthPermille: 999 }])).toEqual([]);
    expect(confirmedPlotEffects([planted], [{ ...planted, plantedAtMs: 200 }])).toEqual([{ plotId: 9, action: 'harvest' }]);
    expect(confirmedPlotEffects([planted], [tilled])).toEqual([{ plotId: 9, action: 'harvest' }]);
  });

  it('plays one livestock effect for an accepted action and skips initial snapshots and replays', () => {
    const nowMs = 50_000;
    const worldId = 'test-world';
    const actorId = 'may';
    const world = createEmptyDeepFarmState(10, nowMs);
    const base = { worldId, actorId, inventoryItems: [], walletCoins: 400, nowMs };
    const adopted = applyDeepFarmMutation({
      ...base, state: world, params: { worldId, idempotencyKey: 'adopt', kind: 'adopt_livestock', speciesId: 'chicken' },
    });
    if (!adopted.ok) throw new Error(adopted.messageVi);
    const animalId = adopted.state.livestock.animals[0]!.animalId;
    const params = { worldId, idempotencyKey: 'pet', kind: 'pet_livestock', animalId } as const;
    const petted = applyDeepFarmMutation({ ...base, state: adopted.state, params });
    if (!petted.ok) throw new Error(petted.messageVi);
    const before = projectDeepFarmSnapshot(worldId, adopted.state, adopted.walletCoins, nowMs);
    const after = projectDeepFarmSnapshot(worldId, petted.state, petted.walletCoins, nowMs + 1);

    expect(confirmedDeepFarmEffects(null, after)).toEqual([]);
    expect(confirmedDeepFarmEffects(before, after)).toEqual([{ kind: 'pet', animalId }]);
    expect(confirmedDeepFarmEffects(after, after)).toEqual([]);
    expect(confirmedDeepFarmEffects(after, before)).toEqual([]);
    expect(applyDeepFarmMutation({ ...base, state: petted.state, params: { ...params, idempotencyKey: 'second-pet' } }))
      .toMatchObject({ ok: false, code: 'ALREADY_PETTED' });
  });

  it('cleans completed and interrupted effects and bounds bursts', () => {
    function makeSprite() {
      return {
        setScale: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(),
        once: vi.fn(), destroy: vi.fn(), play: vi.fn(),
      };
    }
    const scene = { add: { sprite: vi.fn(makeSprite) }, anims: { exists: () => true } };
    const effects = new FarmActionEffects(scene as unknown as Phaser.Scene);
    for (let i = 0; i < 20; i += 1) effects.play('fx_till', 10, 12, 15, 1);
    expect(scene.add.sprite).toHaveBeenCalledTimes(16);
    const first = scene.add.sprite.mock.results[0]!.value;
    const second = scene.add.sprite.mock.results[1]!.value;
    first.once.mock.calls[0]![1]();
    expect(first.destroy).toHaveBeenCalledTimes(1);
    effects.destroy();
    expect(first.destroy).toHaveBeenCalledTimes(1);
    expect(second.destroy).toHaveBeenCalledTimes(1);
    effects.play('fx_pet', 10, 12, 15, 1);
    expect(scene.add.sprite).toHaveBeenCalledTimes(17);
    effects.destroy();
  });

  it('schedules one machine deadline and cancels it when leaving the map', () => {
    vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout'] });
    try {
      const scene = { add: { sprite: vi.fn(() => ({
        setOrigin: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(), setFrame: vi.fn(), destroy: vi.fn(), play: vi.fn(),
      })) } };
      const machines = new WorkshopMachineVisuals(scene as unknown as Phaser.Scene, 150, 180, 16);
      const queued = queueWorkshopJob(createWorkshopsState(), 'mill', 'flour', 1000, 'may');
      if (!queued.ok) throw new Error(queued.messageVi);
      const mill = scene.add.sprite.mock.results[0]!.value;
      machines.sync(queued.state, 500);
      expect(mill.play).not.toHaveBeenCalled();
      vi.advanceTimersByTime(500);
      expect(mill.play).toHaveBeenCalledWith('machine_mill');
      expect(vi.getTimerCount()).toBe(1);
      machines.destroy();
      expect(mill.destroy).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('distinguishes cast, wait, bite, reel, landed and closed without creating a bite phase', () => {
    expect(fishingStripForPhase('idle')).toBeNull();
    expect(fishingStripForPhase('casting')).toBe('bobber_float');
    expect(fishingStripForPhase('waiting')).toBe('bobber_float');
    expect(fishingStripForPhase('bite')).toBe('bobber_bite');
    expect(fishingStripForPhase('minigame')).toBe('bobber_float');
    expect(fishingStripForPhase('reeling')).toBe('bobber_float');
    expect(fishingStripForPhase('landed')).toBeNull();
    expect(fishingAtlasFrame('bobber_bite', 270)).toEqual(ranchFishing.frames.bobber_bite_3.frame);
    expect(fishingAtlasFrame('bobber_float', 560)).toEqual(ranchFishing.frames.bobber_float_0.frame);
    expect(ranchMinnowFrame).toEqual(ranchFishing.frames.fish_minnow_0.frame);
  });
});
