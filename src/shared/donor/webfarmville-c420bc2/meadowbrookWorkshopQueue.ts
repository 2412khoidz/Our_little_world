/**
 * Vendored workshop queue scheduling from Meadowbrook / webfarmville@c420bc2.
 * Source: `shared/src/logic/reducer.ts` craft + collectCrafts; `content/workshops.ts`.
 *
 * SPDX-License-Identifier: MIT — Copyright (c) 2026 Shiz0id
 */
import { craftMs, workshopSlots, workshopLevel, type WorkshopLevel } from './content/workshops';
import type { BuildingDef, RecipeDef } from './content/buildingsTypes';

export interface WorkshopQueueJob {
  readonly recipeId: string;
  readonly endMs: number;
}

export interface WorkshopBuildingState {
  level: number;
  queue: WorkshopQueueJob[];
}

export interface InventoryLike {
  [sku: string]: number | undefined;
}

export interface CraftEnqueueResult {
  readonly building: WorkshopBuildingState;
  readonly inventory: InventoryLike;
  readonly events: readonly { type: 'queued'; recipeId: string; endMs: number }[];
}

export interface CraftCollectResult {
  readonly building: WorkshopBuildingState;
  readonly inventory: InventoryLike;
  readonly outputs: readonly { sku: string; qty: number }[];
  readonly events: readonly (
    | { type: 'collected'; sku: string; qty: number }
    | { type: 'workshopBonus'; sku: string; qty: number }
  )[];
}

function findRecipe(def: BuildingDef, recipeId: string): RecipeDef | undefined {
  return def.recipes.find((r) => r.id === recipeId);
}

export function maxQueueSlots(building: WorkshopBuildingState, def: Pick<BuildingDef, 'slots'>): number {
  return workshopSlots(building, def);
}

export function enqueueCraft(
  building: WorkshopBuildingState,
  def: BuildingDef,
  recipeId: string,
  inventory: InventoryLike,
  nowMs: number,
  _rng01: () => number = () => 0,
): CraftEnqueueResult {
  const recipe = findRecipe(def, recipeId);
  if (!recipe) throw new Error('RECIPE_UNKNOWN');
  if (building.queue.length >= maxQueueSlots(building, def)) throw new Error('QUEUE_FULL');
  for (const [sku, qty] of Object.entries(recipe.inputs)) {
    if ((inventory[sku] ?? 0) < qty) throw new Error(`NEED_${sku}`);
  }
  const nextInv = { ...inventory };
  for (const [sku, qty] of Object.entries(recipe.inputs)) {
    nextInv[sku] = (nextInv[sku] ?? 0) - qty;
    if (nextInv[sku] === 0) delete nextInv[sku];
  }
  const lastEnd = building.queue.length > 0 ? building.queue[building.queue.length - 1]!.endMs : 0;
  const start = Math.max(nowMs, lastEnd);
  const endMs = start + craftMs(building, recipe);
  const queue = [...building.queue, { recipeId: recipe.id, endMs }];
  return {
    building: { ...building, queue },
    inventory: nextInv,
    events: [{ type: 'queued', recipeId: recipe.id, endMs }],
  };
}

export function collectFinishedCrafts(
  building: WorkshopBuildingState,
  def: BuildingDef,
  nowMs: number,
  inventory: InventoryLike,
  rng01: () => number = () => 0,
): CraftCollectResult {
  const remaining: WorkshopQueueJob[] = [];
  const outputs: { sku: string; qty: number }[] = [];
  const events: CraftCollectResult['events'][number][] = [];
  const nextInv = { ...inventory };
  const bonusChance = workshopLevel(building).bonus;
  for (const job of building.queue) {
    if (job.endMs > nowMs) {
      remaining.push(job);
      continue;
    }
    const recipe = findRecipe(def, job.recipeId);
    if (!recipe) continue;
    const sku = recipe.output;
    nextInv[sku] = (nextInv[sku] ?? 0) + recipe.qty;
    outputs.push({ sku, qty: recipe.qty });
    events.push({ type: 'collected', sku, qty: recipe.qty });
    if (bonusChance > 0 && rng01() < bonusChance) {
      nextInv[sku] = (nextInv[sku] ?? 0) + 1;
      outputs.push({ sku, qty: 1 });
      events.push({ type: 'workshopBonus', sku, qty: 1 });
    }
  }
  return {
    building: { ...building, queue: remaining },
    inventory: nextInv,
    outputs,
    events,
  };
}

export { craftMs, workshopLevel, type WorkshopLevel };