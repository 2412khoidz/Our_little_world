/**
 * Dev-only simulation executor: confirms brain completions, accounts for resources,
 * writes memory — separate from production brain (Mission 04B authoritative path).
 */

import type { PetActionCompletionEvent, PetMemoryWriteIntent } from './petBrainContract04B';
import type { Pet8Needs } from './petIntelligenceConfig';
import { appendBoundedMemory, PET_MEMORY_PERSIST_CAP, type PetMemoryEvent } from './petPrimitivesAdapter';

export interface LabWorldResources {
  bowlFoodPortions: number;
  waterBowlVolume: number;
}

export interface LabSimulationExecutorState {
  resources: LabWorldResources;
  needs: Pet8Needs;
  memoryEvents: PetMemoryEvent[];
  confirmedInstanceIds: Set<string>;
  transitionLog: LabTransitionRecord[];
}

export interface LabTransitionRecord {
  atMs: number;
  phase: string;
  instanceId: string | null;
  actionId: string | null;
  targetId: string | null;
  detailVi: string;
}

export function createLabSimulationExecutor(
  needs: Pet8Needs,
  resources: LabWorldResources,
): LabSimulationExecutorState {
  return {
    resources: { ...resources },
    needs: { ...needs },
    memoryEvents: [],
    confirmedInstanceIds: new Set(),
    transitionLog: [],
  };
}

export function logLabTransition(
  sim: LabSimulationExecutorState,
  record: Omit<LabTransitionRecord, 'detailVi'> & { detailVi: string },
): LabSimulationExecutorState {
  return {
    ...sim,
    transitionLog: [...sim.transitionLog, record],
  };
}

/** Exactly-once confirmation of a proposed completion from the brain. */
export function confirmLabCompletion(
  sim: LabSimulationExecutorState,
  completion: PetActionCompletionEvent,
  instanceId: string,
): { sim: LabSimulationExecutorState; memoryIntents: PetMemoryWriteIntent[] } {
  if (sim.confirmedInstanceIds.has(instanceId)) {
    return { sim, memoryIntents: [] };
  }
  if (completion.kind !== 'completed') {
    const next = {
      ...sim,
      confirmedInstanceIds: new Set(sim.confirmedInstanceIds).add(instanceId),
    };
    return { sim: next, memoryIntents: [] };
  }

  const resources = { ...sim.resources };
  let needs = { ...sim.needs };
  const memoryIntents: PetMemoryWriteIntent[] = [];
  const action = completion.intent.actionId;

  if (action === 'eat_bowl') {
    if (resources.bowlFoodPortions <= 0) {
      const next = {
        ...sim,
        confirmedInstanceIds: new Set(sim.confirmedInstanceIds).add(instanceId),
      };
      return { sim: next, memoryIntents: [] };
    }
    resources.bowlFoodPortions -= 1;
    needs = { ...needs, hunger: Math.min(100, needs.hunger + 22) };
    memoryIntents.push({
      id: `lab-fed-${instanceId}`,
      kind: 'fed',
      atMs: completion.atMs,
      caregiverId: 'autonomous',
      tags: ['bowl'],
    });
  } else if (action === 'drink_bowl') {
    if (resources.waterBowlVolume <= 5) {
      const next = {
        ...sim,
        confirmedInstanceIds: new Set(sim.confirmedInstanceIds).add(instanceId),
      };
      return { sim: next, memoryIntents: [] };
    }
    resources.waterBowlVolume = Math.max(0, resources.waterBowlVolume - 18);
    needs = { ...needs, thirst: Math.min(100, needs.thirst + 22) };
    memoryIntents.push({
      id: `lab-drank-${instanceId}`,
      kind: 'explored',
      atMs: completion.atMs,
      caregiverId: 'autonomous',
      tags: ['water'],
    });
  } else if (action === 'sleep_cushion' || action === 'nap_on_sofa' || action === 'sunbathe') {
    needs = { ...needs, energy: Math.min(100, needs.energy + 12) };
    memoryIntents.push({
      id: `lab-slept-${instanceId}`,
      kind: 'slept',
      atMs: completion.atMs,
      caregiverId: 'autonomous',
    });
  } else if (action === 'play_yarn' || action === 'chase_ball') {
    needs = {
      ...needs,
      fun: Math.min(100, needs.fun + 14),
      energy: Math.max(25, needs.energy - 6),
    };
    memoryIntents.push({
      id: `lab-played-${instanceId}`,
      kind: 'played',
      atMs: completion.atMs,
      caregiverId: 'autonomous',
    });
  } else {
    memoryIntents.push({
      id: `lab-explore-${instanceId}`,
      kind: 'explored',
      atMs: completion.atMs,
      caregiverId: 'autonomous',
    });
  }

  let memoryEvents = sim.memoryEvents;
  for (const m of memoryIntents) {
    memoryEvents = appendBoundedMemory(
      memoryEvents,
      {
        id: m.id,
        kind: m.kind as PetMemoryEvent['kind'],
        atMs: m.atMs,
        caregiverId: m.caregiverId === 'autonomous' ? null : m.caregiverId,
        tags: m.tags ? [...m.tags] : undefined,
      },
      PET_MEMORY_PERSIST_CAP,
    );
  }

  const confirmed = new Set(sim.confirmedInstanceIds);
  confirmed.add(instanceId);

  return {
    sim: {
      ...sim,
      resources,
      needs,
      memoryEvents,
      confirmedInstanceIds: confirmed,
    },
    memoryIntents,
  };
}