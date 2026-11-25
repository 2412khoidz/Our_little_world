import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/shared/maps';
import {
  PET_MOVEMENT_ACCEPTANCE_SCENARIOS,
  auditActionAnimationCoverage,
  createPetMovementExecutorState,
  deserializePetMovementState,
  findNavAnchor,
  findTilePath,
  getActionAnimationSpec,
  serializePetMovementState,
  tickPetMovement,
  type PetActionIntent,
} from '../../src/shared/petLiving/petMovement';
import { buildHomeMovementBlockedTiles } from '../../src/shared/petLiving/petMovement/petHomeNavLayout';
import { stepPetLocomotion, createLocomotionSnapshot } from '../../src/shared/petLiving/petMovement/petLocomotionModel';
import { buildLabAffordances } from '../../src/shared/petLiving/petLabSimulation';
import { createPetBrainState, snapshotToInput, tickPetBrain } from '../../src/shared/petLiving/petAutonomousController';
import {
  movementTargetFromAffordances,
  selectMovementIntent,
  movementTargetFromAffordances as mapTargets,
} from '../../src/shared/petLiving/petMovement/petMovementBrainAdapter';
import { createDefault8Needs, PET_PERSONALITY_PRESETS } from '../../src/shared/petLiving/petIntelligenceConfig';

const intent = (
  instanceId: string,
  actionId: string,
  targetId: string,
): PetActionIntent => ({
  instanceId,
  actionId,
  targetId,
  affordanceId: targetId,
  score01: 0.9,
  reasonVi: 'test',
  animationHint: actionId,
  interruptible: true,
  estimatedPerformMs: 4000,
  estimatedTravelMs: 2000,
});

describe('Mission 04B-1 — pet movement runtime', () => {
  it('finds path around furniture to food bowl anchor', () => {
    const blocked = buildHomeMovementBlockedTiles();
    const start = { tileX: 8, tileY: 9 };
    const bowl = findNavAnchor('food_bowl')!;
    const goal = { tileX: Math.floor(bowl.anchorPixelX / TILE_SIZE), tileY: Math.floor(bowl.anchorPixelY / TILE_SIZE) };
    const path = findTilePath(start, goal, 16, 12, blocked);
    expect(path.length).toBeGreaterThan(0);
    for (const p of path) {
      expect(blocked.has(`${p.tileX},${p.tileY}`)).toBe(false);
    }
  });

  it('reports unreachable when corridor walled off', () => {
    const blocked = buildHomeMovementBlockedTiles();
    for (let x = 0; x < 16; x += 1) blocked.add(`${x},6`);
    const path = findTilePath({ tileX: 8, tileY: 9 }, { tileX: 3, tileY: 4 }, 16, 12, blocked);
    expect(path).toHaveLength(0);
  });

  it('uses interaction anchor not object center (bowl stand tile)', () => {
    const bowl = findNavAnchor('food_bowl')!;
    expect(bowl.anchorPixelX).not.toBe(bowl.objectPixelX);
    expect(bowl.anchorPixelY).toBeGreaterThan(bowl.objectPixelY - 4);
  });

  it('arrives and proposes movement_ready without inventory side effects', () => {
    let state = createPetMovementExecutorState(8 * TILE_SIZE, 9 * TILE_SIZE);
    const targets = mapTargets(buildLabAffordances());
    let movementReady = false;
    let animationFinished = false;
    for (let i = 0; i < 320; i += 1) {
      const out = tickPetMovement(state, {
        nowMs: i * 100,
        dtMs: 100,
        intent: intent('inst-1', 'eat_bowl', 'food_bowl'),
        interrupt: false,
        targets,
      });
      state = out.state;
      movementReady ||= out.output.proposals.some((p) => p.kind === 'movement_ready');
      animationFinished ||= out.output.proposals.some((p) => p.kind === 'animation_finished');
    }
    expect(movementReady).toBe(true);
    expect(animationFinished).toBe(true);
    expect(state.status === 'idle' || state.status === 'proposed_complete').toBe(true);
  });

  it('cancels when target disappears mid-route', () => {
    let state = createPetMovementExecutorState(8 * TILE_SIZE, 9 * TILE_SIZE);
    let cancelled = false;
    for (let i = 0; i < 120; i += 1) {
      const targets = movementTargetFromAffordances(buildLabAffordances()).filter(
        (t) => i < 80 || t.targetId !== 'pet_bed',
      );
      const out = tickPetMovement(state, {
        nowMs: i * 100,
        dtMs: 100,
        intent: intent('inst-2', 'sleep_cushion', 'pet_bed'),
        interrupt: false,
        targets,
      });
      state = out.state;
      cancelled ||= out.output.proposals.some((p) => p.kind === 'nav_cancelled' || p.kind === 'nav_failed');
    }
    expect(cancelled).toBe(true);
  });

  it('does not false-complete when path blocked from start', () => {
    let state = createPetMovementExecutorState(8 * TILE_SIZE, 9 * TILE_SIZE);
    const blocked = new Set(state.blocked);
    for (let y = 2; y <= 9; y += 1) {
      for (let x = 2; x <= 6; x += 1) blocked.add(`${x},${y}`);
    }
    state = { ...state, blocked };
    let movementReady = false;
    let navFailed = false;
    for (let i = 0; i < 120; i += 1) {
      const out = tickPetMovement(state, {
        nowMs: i * 100,
        dtMs: 100,
        intent: intent('inst-3', 'sunbathe', 'sunny_window'),
        interrupt: false,
        targets: movementTargetFromAffordances(buildLabAffordances()),
      });
      state = out.state;
      movementReady ||= out.output.proposals.some((p) => p.kind === 'movement_ready');
      navFailed ||= out.output.proposals.some((p) => p.kind === 'nav_failed');
    }
    expect(movementReady).toBe(false);
    expect(navFailed || state.status === 'failed' || state.failureReasonVi !== null).toBe(true);
  });

  it('preserves stable instance id through execution', () => {
    let state = createPetMovementExecutorState();
    const id = 'stable-xyz';
    for (let i = 0; i < 50; i += 1) {
      const out = tickPetMovement(state, {
        nowMs: i * 100,
        dtMs: 100,
        intent: intent(id, 'play_yarn', 'yarn_ball'),
        interrupt: false,
        targets: movementTargetFromAffordances(buildLabAffordances()),
      });
      state = out.state;
      if (state.activeInstanceId) expect(state.activeInstanceId).toBe(id);
    }
  });

  it('movement step is frame-rate independent for equal simulated time', () => {
    const start = createLocomotionSnapshot(100, 100);
    const goal = { targetX: 200, targetY: 140, intent: 'move' as const };
    let a = start;
    for (let i = 0; i < 60; i += 1) {
      a = stepPetLocomotion(a, { ...goal, dtSec: 1 / 60, nowMs: i * (1000 / 60) });
    }
    let b = start;
    for (let i = 0; i < 6; i += 1) {
      b = stepPetLocomotion(b, { ...goal, dtSec: 1 / 6, nowMs: i * (1000 / 6) });
    }
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(4);
  });

  it('serialize and restore movement state for reconnect prep', () => {
    let state = createPetMovementExecutorState();
    for (let i = 0; i < 20; i += 1) {
      state = tickPetMovement(state, {
        nowMs: i * 50,
        dtMs: 50,
        intent: intent('ser-1', 'drink_bowl', 'water_bowl'),
        interrupt: false,
        targets: movementTargetFromAffordances(buildLabAffordances()),
      }).state;
    }
    const json = serializePetMovementState(state);
    const back = deserializePetMovementState(json);
    expect(back.activeInstanceId).toBe(state.activeInstanceId);
    expect(back.loco.x).toBeCloseTo(state.loco.x, 1);
  });

  it('brain adapter feeds intent without mutating brain memory', () => {
    const traits = PET_PERSONALITY_PRESETS[0]!.traits;
    const ctx = {
      needs: { ...createDefault8Needs(), hunger: 24 },
      traits,
      emotion: 'relaxed' as const,
      bowlFoodPortions: 1,
      waterBowlVolume: 80,
      isStudying: false,
      partnersSittingSofa: false,
      partnerJustArrived: false,
      hasNewFurnitureId: null,
      nowMs: 1_000_000,
    };
    const affordances = buildLabAffordances();
    let brain = createPetBrainState();
    const memBefore = brain.memory.events.length;
    for (let i = 0; i < 12; i += 1) {
      const tick = tickPetBrain(brain, snapshotToInput({ ...ctx, nowMs: 1_000_000 + i * 2000 }, affordances));
      brain = tick.state;
      const mvIntent = selectMovementIntent(tick.output);
      if (mvIntent) {
        expect(mvIntent.instanceId).toBeTruthy();
        expect(mvIntent.targetId).toBeTruthy();
      }
    }
    expect(brain.memory.events.length).toBe(memBefore);
  });

  it('animation map audit covers supported brain actions', () => {
    const audit = auditActionAnimationCoverage();
    expect(audit.covered.length).toBeGreaterThanOrEqual(15);
    expect(getActionAnimationSpec('eat_bowl').performIntent).toBe('eat');
  });

  it('runs acceptance scenarios and writes traces', () => {
    const outDir = path.join(process.cwd(), 'test-results', 'pet-movement-traces');
    fs.mkdirSync(outDir, { recursive: true });
    for (const [key, run] of Object.entries(PET_MOVEMENT_ACCEPTANCE_SCENARIOS)) {
      const trace = run();
      expect(trace.transitions.length).toBeGreaterThan(0);
      fs.writeFileSync(path.join(outDir, `${key}.json`), JSON.stringify(trace, null, 2));
    }
    expect(fs.readdirSync(outDir).length).toBeGreaterThanOrEqual(6);
  });

  it('deterministic movement replay for hungry scenario', () => {
    const a = PET_MOVEMENT_ACCEPTANCE_SCENARIOS.hungryAroundFurniture();
    const b = PET_MOVEMENT_ACCEPTANCE_SCENARIOS.hungryAroundFurniture();
    expect(a.pathSamples).toEqual(b.pathSamples);
    expect(a.transitions).toEqual(b.transitions);
  });
});