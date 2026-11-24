/**
 * Deterministic daily engine for the economy simulator.
 *
 * One simulated day = one household session. All randomness comes from the
 * seeded `RngStream`; all time comes from `state.nowMs`. No wall clock, no DOM.
 */

import { createRng, deriveSeed } from '../../rng.ts';
import { isMilestoneAtOrBefore } from '../types.ts';
import type { RngStream } from '../../rng.ts';
import { CATALOG_BY_SKU, computeSellLot, itemsForMilestone } from '../catalogConfig.ts';
import { applyLedgerEntry, createWallet, replayLedger } from '../ledgerMath.ts';
import type { CoinLedgerEntry } from '../ledgerMath.ts';
import { completeOrder, generateOrderBoard, orderWindowIndex } from '../orderBoard.ts';
import type { OrderBoardState } from '../orderBoard.ts';
import type { ItemDefinition, ItemQuality } from '../types.ts';
import {
  ACTION_SECONDS,
  FISH_TABLE,
  QUALITY_WEIGHTS,
} from './config.ts';
import type { DecorSink } from './config.ts';
import type { PersonaDefinition, SimProfile, SimStats, StrategyId } from './types.ts';

export type QualityCounts = Record<ItemQuality, number>;
export interface QualityInventory {
  [sku: string]: QualityCounts;
}

export interface Plot {
  readonly sku: string;
  readonly readyAtMs: number;
}

export interface WorldState {
  day: number;
  nowMs: number;
  coins: number;
  inventory: QualityInventory;
  soldTodayByGroup: Record<string, number>;
  groupUnitsSold: Record<string, number>;
  plots: Plot[];
  ledger: CoinLedgerEntry[];
  entrySeq: number;
  activeSeconds: number;
  stats: SimStats;
  decorPurchases: string[];
  actionLog: string[];
  /** Server seed that also drives the deterministic order board. */
  seed: number;
  orderBoard: OrderBoardState | null;
}

export interface SessionClock {
  remaining: number;
  used: number;
}

function emptyStats(): SimStats {
  return {
    foraged: 0,
    harvests: 0,
    fishCaught: 0,
    dishesCooked: 0,
    itemsSold: 0,
    itemsBought: 0,
    decorBought: 0,
    seedsPlanted: 0,
  };
}

export function createWorld(startingCoins: number, nowMs: number, seed = 0): WorldState {
  const state: WorldState = {
    day: 1,
    nowMs,
    coins: 0,
    inventory: {},
    soldTodayByGroup: {},
    groupUnitsSold: {},
    plots: [],
    ledger: [],
    entrySeq: 0,
    activeSeconds: 0,
    stats: emptyStats(),
    decorPurchases: [],
    actionLog: [],
    seed,
    orderBoard: null,
  };
  if (startingCoins > 0) {
    recordCoin(state, 'grant', startingCoins, 'starter_wallet');
  }
  return state;
}

function recordCoin(
  state: WorldState,
  kind: CoinLedgerEntry['kind'],
  amount: number,
  reason: string,
): void {
  if (amount <= 0) {
    return;
  }
  state.entrySeq += 1;
  const entry: CoinLedgerEntry = {
    id: `e${state.entrySeq}`,
    kind,
    deltaCoins: amount,
    reason,
    idempotencyKey: `d${state.day}-${state.entrySeq}`,
    createdAt: state.nowMs,
  };
  state.coins = applyLedgerEntry(createWallet(state.coins), entry).coins;
  state.ledger.push(entry);
}

// --------------------------------------------------------------------------
// Quality-aware inventory
// --------------------------------------------------------------------------

function countsFor(inventory: QualityInventory, sku: string): QualityCounts {
  const existing = inventory[sku];
  if (existing) {
    return existing;
  }
  const created: QualityCounts = { normal: 0, silver: 0, gold: 0 };
  inventory[sku] = created;
  return created;
}

export function addItems(
  inventory: QualityInventory,
  sku: string,
  qty: number,
  quality: ItemQuality,
): void {
  if (qty <= 0) {
    return;
  }
  countsFor(inventory, sku)[quality] += qty;
}

export function qtyOf(inventory: QualityInventory, sku: string): number {
  const counts = inventory[sku];
  if (!counts) {
    return 0;
  }
  return counts.normal + counts.silver + counts.gold;
}

/** Consumes lowest quality first; returns false (and changes nothing) when short. */
export function removeItems(inventory: QualityInventory, sku: string, qty: number): boolean {
  if (qty <= 0) {
    return true;
  }
  const counts = inventory[sku];
  if (!counts || qtyOf(inventory, sku) < qty) {
    return false;
  }
  let left = qty;
  for (const quality of ['normal', 'silver', 'gold'] as const) {
    const take = Math.min(counts[quality], left);
    counts[quality] -= take;
    left -= take;
    if (left === 0) {
      break;
    }
  }
  if (counts.normal + counts.silver + counts.gold === 0) {
    delete inventory[sku];
  }
  return true;
}

/** Inventory valued at base sell price (quality ignored), for milestone reports. */
/** Cost basis of standing crops (seeds planted but not harvested yet). */
export function plotValueCoins(state: WorldState): number {
  let total = 0;
  for (const plot of state.plots) {
    const item = CATALOG_BY_SKU.get(plot.sku);
    const seedInput = item?.inputs[0];
    const seed = seedInput ? CATALOG_BY_SKU.get(seedInput.sku) : undefined;
    total += seed && seed.storeBuy !== null ? seed.storeBuy : 0;
  }
  return total;
}

export function inventoryValueCoins(inventory: QualityInventory): number {
  let total = 0;
  for (const sku of Object.keys(inventory)) {
    const item = CATALOG_BY_SKU.get(sku);
    if (!item) {
      continue;
    }
    total += qtyOf(inventory, sku) * item.sellPrice;
  }
  return total;
}

function rollQuality(item: ItemDefinition, rng: RngStream): ItemQuality {
  if (item.qualityTiers.length <= 1) {
    return item.qualityTiers[0] ?? 'normal';
  }
  const options = QUALITY_WEIGHTS.filter((option) => item.qualityTiers.includes(option.value));
  if (options.length === 0) {
    return 'normal';
  }
  return rng.weighted(options);
}

// --------------------------------------------------------------------------
// Day planning
// --------------------------------------------------------------------------

interface ActivityBudget {
  forage: number;
  farm: number;
  fish: number;
  cook: number;
}

function effectiveWeights(persona: PersonaDefinition, profile: SimProfile): ActivityBudget {
  const enabled: ActivityBudget = {
    forage: profile.features.forage ? 1 : 0,
    farm: profile.features.farming ? 1 : 0,
    fish: profile.features.fishing ? 1 : 0,
    cook: profile.features.cooking ? 1 : 0,
  };
  const chatty: ActivityBudget = {
    forage: enabled.forage * persona.weights.forage,
    farm: enabled.farm * persona.weights.farm,
    fish: enabled.fish * persona.weights.fish,
    cook: enabled.cook * persona.weights.cook,
  };
  const total = chatty.forage + chatty.farm + chatty.fish + chatty.cook;
  if (total > 0) {
    return chatty;
  }
  // A persona that only wants a feature this milestone does not have yet
  // (e.g. optimizer before farming ships) falls back to the enabled activities.
  const activeCount = enabled.forage + enabled.farm + enabled.fish + enabled.cook;
  if (activeCount === 0) {
    return { forage: 0, farm: 0, fish: 0, cook: 0 };
  }
  return {
    forage: enabled.forage / activeCount,
    farm: enabled.farm / activeCount,
    fish: enabled.fish / activeCount,
    cook: enabled.cook / activeCount,
  };
}

function allocateBudget(remainingSeconds: number, weights: ActivityBudget): ActivityBudget {
  const total = weights.forage + weights.farm + weights.fish + weights.cook;
  if (total <= 0 || remainingSeconds <= 0) {
    return { forage: 0, farm: 0, fish: 0, cook: 0 };
  }
  const share = (weight: number): number => Math.floor((remainingSeconds * weight) / total);
  return {
    forage: share(weights.forage),
    farm: share(weights.farm),
    fish: share(weights.fish),
    cook: share(weights.cook),
  };
}

function harvestBatch(state: WorldState, item: ItemDefinition, rng: RngStream): void {
  addItems(state.inventory, item.sku, item.batchQty, rollQuality(item, rng));
  state.stats.harvests += 1;
}

function harvestReadyPlots(state: WorldState, clock: SessionClock, rng: RngStream): void {
  for (let index = 0; index < state.plots.length; index += 1) {
    const plot = state.plots[index];
    if (!plot || plot.readyAtMs > state.nowMs) {
      continue;
    }
    if (clock.remaining < ACTION_SECONDS.harvest) {
      return;
    }
    const item = CATALOG_BY_SKU.get(plot.sku);
    state.plots.splice(index, 1);
    index -= 1;
    if (!item) {
      continue;
    }
    harvestBatch(state, item, rng);
    clock.remaining -= ACTION_SECONDS.harvest;
    clock.used += ACTION_SECONDS.harvest;
  }
}

function runForage(
  state: WorldState,
  profile: SimProfile,
  sliceSeconds: number,
  rng: RngStream,
): number {
  if (!profile.features.forage || sliceSeconds < ACTION_SECONDS.forage) {
    return 0;
  }
  const capacity =
    profile.forage.points * Math.max(1, Math.floor(sliceSeconds / profile.forage.respawnSeconds) + 1);
  const byBudget = Math.floor(sliceSeconds / ACTION_SECONDS.forage);
  const units = Math.min(capacity, byBudget);
  if (units <= 0) {
    return 0;
  }
  const herbWeight = 70;
  const branchWeight = 30;
  for (let index = 0; index < units; index += 1) {
    const sku =
      profile.forage.skus.length > 1 && rng.chance(branchWeight / (herbWeight + branchWeight))
        ? (profile.forage.skus[1] as string)
        : (profile.forage.skus[0] as string);
    addItems(state.inventory, sku, 1, 'normal');
    state.stats.foraged += 1;
  }
  return units * ACTION_SECONDS.forage;
}

/** Expected net coins per active second for one crop cycle (normal quality). */
function cropRatePerSecond(item: ItemDefinition): number {
  const seedInput = item.inputs[0];
  const seed = seedInput ? CATALOG_BY_SKU.get(seedInput.sku) : undefined;
  const seedCost = seed && seed.storeBuy !== null && seedInput ? seed.storeBuy * seedInput.qty : 0;
  const revenue = item.sellPrice * item.batchQty;
  // Interaction seconds only: growth happens while the player is offline or busy
  // with another activity, so it is not part of the player's active cost.
  const activeSeconds = ACTION_SECONDS.plant + ACTION_SECONDS.harvest;
  return (revenue - seedCost) / Math.max(1, activeSeconds);
}

export function availableCrops(profile: SimProfile): ItemDefinition[] {
  return itemsForMilestone(profile.milestone).filter(
    (entry) =>
      entry.milestone === 'V0.2.1' &&
      entry.inputs.length > 0 &&
      entry.batchDurationMs > 0 &&
      entry.group !== 'dish' &&
      entry.group !== 'fish',
  );
}

function pickCrop(
  persona: PersonaDefinition,
  strategy: StrategyId,
  crops: readonly ItemDefinition[],
  rng: RngStream,
): ItemDefinition {
  if (strategy === 'monoculture' || persona.id === 'optimizer') {
    let best = crops[0] as ItemDefinition;
    let bestRate = cropRatePerSecond(best);
    for (const crop of crops) {
      const rate = cropRatePerSecond(crop);
      if (rate > bestRate || (rate === bestRate && crop.sku < best.sku)) {
        best = crop;
        bestRate = rate;
      }
    }
    return best;
  }
  if (persona.id === 'decorator') {
    const flowers = crops.filter((crop) => crop.group === 'flower');
    if (flowers.length > 0 && rng.chance(0.7)) {
      return rng.pick(flowers);
    }
  }
  if (persona.id === 'mixed_craft_fish') {
    const veggies = crops.filter((crop) => crop.group === 'veg' || crop.group === 'grain');
    if (veggies.length > 0) {
      return rng.pick(veggies);
    }
  }
  return rng.pick(crops);
}

export function pickBestCropForReport(crops: readonly ItemDefinition[]): ItemDefinition | null {
  let best: ItemDefinition | null = null;
  let bestRate = -1;
  for (const crop of crops) {
    const rate = cropRatePerSecond(crop);
    if (rate > bestRate || (rate === bestRate && best !== null && crop.sku < best.sku)) {
      best = crop;
      bestRate = rate;
    }
  }
  return best;
}

function runFarm(
  state: WorldState,
  profile: SimProfile,
  persona: PersonaDefinition,
  sliceSeconds: number,
  rng: RngStream,
  strategy: StrategyId,
): number {
  if (!profile.features.farming || profile.plotCount <= 0) {
    return 0;
  }
  if (sliceSeconds < ACTION_SECONDS.plant) {
    return 0;
  }
  const crops = availableCrops(profile);
  if (crops.length === 0) {
    return 0;
  }
  let clock = 0;
  while (clock + ACTION_SECONDS.plant <= sliceSeconds) {
    // Harvest anything that matured while the household was working.
    const maturedIndex = state.plots.findIndex(
      (plot) => plot.readyAtMs <= state.nowMs + clock * 1_000,
    );
    if (maturedIndex >= 0) {
      if (clock + ACTION_SECONDS.harvest > sliceSeconds) {
        break;
      }
      const plot = state.plots[maturedIndex] as Plot;
      state.plots.splice(maturedIndex, 1);
      const item = CATALOG_BY_SKU.get(plot.sku);
      if (item) {
        harvestBatch(state, item, rng);
      }
      clock += ACTION_SECONDS.harvest;
      continue;
    }
    if (state.plots.length >= profile.plotCount) {
      break;
    }
    const crop = pickCrop(persona, strategy, crops, rng);
    const seedInput = crop.inputs[0];
    if (!seedInput) {
      break;
    }
    const seed = CATALOG_BY_SKU.get(seedInput.sku);
    if (!seed || seed.storeBuy === null) {
      break;
    }
    const seedCost = seed.storeBuy * seedInput.qty;
    if (state.coins < seedCost) {
      break;
    }
    if (seedCost > 0) {
      recordCoin(state, 'spend', seedCost, `buy_${seed.sku}`);
    }
    state.stats.itemsBought += seedInput.qty;
    state.plots.push({
      sku: crop.sku,
      readyAtMs: state.nowMs + clock * 1_000 + crop.batchDurationMs,
    });
    state.stats.seedsPlanted += 1;
    clock += ACTION_SECONDS.plant;
  }
  return clock;
}

function runFishing(state: WorldState, sliceSeconds: number, rng: RngStream): number {
  if (sliceSeconds < ACTION_SECONDS.fish) {
    return 0;
  }
  let clock = 0;
  while (clock + ACTION_SECONDS.fish <= sliceSeconds) {
    const affordable = FISH_TABLE.filter((fish) => {
      const bait = CATALOG_BY_SKU.get(fish.baitSku);
      const cost = bait && bait.storeBuy !== null ? bait.storeBuy : 0;
      return state.coins >= cost;
    });
    if (affordable.length === 0) {
      break;
    }
    const chosen = rng.weighted(
      affordable.map((fish) => ({ value: fish, weight: fish.weight })),
    );
    const bait = CATALOG_BY_SKU.get(chosen.baitSku);
    const baitCost = bait && bait.storeBuy !== null ? bait.storeBuy : 0;
    if (baitCost > 0) {
      recordCoin(state, 'spend', baitCost, `buy_${chosen.baitSku}`);
      state.stats.itemsBought += 1;
    }
    const fish = CATALOG_BY_SKU.get(chosen.sku);
    if (fish) {
      addItems(state.inventory, fish.sku, 1, rollQuality(fish, rng));
      state.stats.fishCaught += 1;
    }
    clock += ACTION_SECONDS.fish;
  }
  return clock;
}

function availableDishes(profile: SimProfile): ItemDefinition[] {
  return itemsForMilestone(profile.milestone).filter(
    (entry) => entry.group === 'dish' && entry.inputs.length > 0,
  );
}

function cookOne(state: WorldState, dish: ItemDefinition): boolean {
  let purchaseCost = 0;
  const purchases: { sku: string; qty: number }[] = [];
  for (const input of dish.inputs) {
    const missing = input.qty - qtyOf(state.inventory, input.sku);
    if (missing <= 0) {
      continue;
    }
    const definition = CATALOG_BY_SKU.get(input.sku);
    if (!definition || definition.storeBuy === null) {
      return false;
    }
    purchaseCost += definition.storeBuy * missing;
    purchases.push({ sku: input.sku, qty: missing });
  }
  if (state.coins < purchaseCost) {
    return false;
  }
  if (purchaseCost > 0) {
    recordCoin(state, 'spend', purchaseCost, 'buy_pantry');
  }
  for (const purchase of purchases) {
    addItems(state.inventory, purchase.sku, purchase.qty, 'normal');
    state.stats.itemsBought += purchase.qty;
  }
  for (const input of dish.inputs) {
    if (!removeItems(state.inventory, input.sku, input.qty)) {
      return false;
    }
  }
  addItems(state.inventory, dish.sku, dish.batchQty, 'normal');
  state.stats.dishesCooked += 1;
  return true;
}

function runCooking(
  state: WorldState,
  profile: SimProfile,
  sliceSeconds: number,
  rng: RngStream,
): number {
  if (!profile.features.cooking || sliceSeconds < ACTION_SECONDS.cook) {
    return 0;
  }
  const dishes = availableDishes(profile);
  if (dishes.length === 0) {
    return 0;
  }
  let clock = 0;
  while (clock + ACTION_SECONDS.cook <= sliceSeconds) {
    const order = rng.shuffle(dishes);
    let cooked = false;
    for (const dish of order) {
      if (cookOne(state, dish)) {
        cooked = true;
        break;
      }
    }
    if (!cooked) {
      break;
    }
    clock += ACTION_SECONDS.cook;
  }
  return clock;
}

/** Sells everything sellable through the Shipping Bin, with soft saturation. */
function flattenInventory(inventory: QualityInventory): Record<string, number> {
  const flat: Record<string, number> = {};
  for (const sku of Object.keys(inventory)) {
    flat[sku] = qtyOf(inventory, sku);
  }
  return flat;
}

/**
 * Fulfils whatever the deterministic NPC board asks for and the household can
 * supply. Unsatisfied orders simply expire with no penalty.
 */
function fulfillOrders(state: WorldState, profile: SimProfile): number {
  if (!profile.features.orders) {
    return 0;
  }
  const windowIndex = orderWindowIndex(state.nowMs);
  if (!state.orderBoard || state.orderBoard.windowIndex !== windowIndex) {
    state.orderBoard = generateOrderBoard({
      seed: state.seed,
      windowIndex,
      milestone: profile.milestone,
      nowMs: state.nowMs,
    });
  }
  let seconds = 0;
  for (const order of state.orderBoard.orders) {
    if (!order) {
      continue;
    }
    const completion = completeOrder(state.orderBoard, {
      orderId: order.orderId,
      inventory: flattenInventory(state.inventory),
      nowMs: state.nowMs,
      idempotencyKey: `order-${state.day}-${order.orderId}`,
      actorId: 'household',
    });
    if (!completion.ok) {
      continue;
    }
    for (const line of order.requirements) {
      removeItems(state.inventory, line.sku, line.qty);
    }
    recordCoin(state, 'earn', completion.rewardCoins, 'order_board');
    state.orderBoard = completion.board;
    seconds += ACTION_SECONDS.order;
  }
  return seconds;
}

/** Sells everything sellable through the Shipping Bin, with soft saturation. */
export function sellAll(state: WorldState): number {
  let seconds = 0;
  for (const sku of Object.keys(state.inventory).sort()) {
    const item = CATALOG_BY_SKU.get(sku);
    const counts = state.inventory[sku];
    if (!item || !counts) {
      continue;
    }
    if (item.sellPrice <= 0 || item.sellChannels.length === 0) {
      continue;
    }
    for (const quality of ['gold', 'silver', 'normal'] as const) {
      const qty = counts[quality];
      if (qty <= 0) {
        continue;
      }
      const start = state.soldTodayByGroup[item.group] ?? 0;
      const quote = computeSellLot(sku, quality, start, qty);
      recordCoin(state, 'earn', quote.totalCoins, `sell_${sku}`);
      state.soldTodayByGroup[item.group] = start + qty;
      state.groupUnitsSold[item.group] = (state.groupUnitsSold[item.group] ?? 0) + qty;
      counts[quality] = 0;
      state.stats.itemsSold += qty;
      seconds += ACTION_SECONDS.sell;
    }
    if (counts.normal + counts.silver + counts.gold === 0) {
      delete state.inventory[sku];
    }
  }
  return seconds;
}

function buyDecor(
  state: WorldState,
  persona: PersonaDefinition,
  decorSinks: readonly { id: string; cost: number }[],
  rng: RngStream,
): number {
  const next = decorSinks.find(
    (sink) => !state.decorPurchases.includes(sink.id) && state.coins >= sink.cost,
  );
  if (!next) {
    return 0;
  }
  if (!rng.chance(persona.decorAffinity01)) {
    return 0;
  }
  recordCoin(state, 'spend', next.cost, `decor_${next.id}`);
  state.decorPurchases.push(next.id);
  state.stats.decorBought += 1;
  return ACTION_SECONDS.decor;
}

/** One household session. Returns the active seconds actually consumed. */
export function runDay(
  state: WorldState,
  persona: PersonaDefinition,
  profile: SimProfile,
  rng: RngStream,
  strategy: StrategyId,
  decorSinks: readonly DecorSink[],
): number {
  const [minSeconds, maxSeconds] = persona.dailyActiveSeconds;
  const sessionLength = rng.int(minSeconds, maxSeconds + 1);
  const clock: SessionClock = { remaining: sessionLength, used: 0 };

  harvestReadyPlots(state, clock, rng);

  const weights = effectiveWeights(persona, profile);
  const budget = allocateBudget(clock.remaining, weights);

  const spent = (seconds: number): void => {
    const applied = Math.min(seconds, clock.remaining);
    clock.remaining -= applied;
    clock.used += applied;
  };

  spent(runForage(state, profile, budget.forage, rng));
  spent(runFarm(state, profile, persona, budget.farm, rng, strategy));
  spent(runFishing(state, budget.fish, rng));
  spent(runCooking(state, profile, budget.cook, rng));
  // Orders are fulfilled before the bin: they pay a premium, so the household
  // reserves stock for them and only dumps the leftovers.
  spent(fulfillOrders(state, profile));
  // Selling and shopping happen every session even when the budget is spent:
  // they are quick and blocking them would create artificial deadlocks.
  const sellSeconds = sellAll(state);
  const decorAvailable = decorSinks.filter((sink) =>
    isMilestoneAtOrBefore(sink.milestone, profile.milestone),
  );
  const decorSeconds = buyDecor(state, persona, decorAvailable, rng);
  clock.used += sellSeconds + decorSeconds;

  // Coins-per-minute is measured against the whole session: a player who fills
  // 6 minutes of a 20-minute session and idles still played 20 minutes.
  state.activeSeconds += sessionLength;
  state.actionLog.push(
    `d${state.day}:${persona.id}:${Math.round(clock.used)}s wallet=${state.coins}c`,
  );
  if (state.actionLog.length > 400) {
    state.actionLog.shift();
  }
  return clock.used;
}

/** Wipes wallet and inventory for the zero-wallet recovery probe. */
export function resetWorldForProbe(state: WorldState): void {
  if (state.coins > 0) {
    recordCoin(state, 'spend', state.coins, 'probe_reset');
  }
  state.inventory = {};
  state.plots = [];
}

export function advanceDay(state: WorldState, dayMs: number): void {
  state.day += 1;
  state.nowMs += dayMs;
  state.soldTodayByGroup = {};
}

export interface WorldInvariants {
  readonly ok: boolean;
  readonly issues: readonly { code: string; messageVi: string }[];
}

export function checkInvariants(state: WorldState): WorldInvariants {
  const issues: { code: string; messageVi: string }[] = [];
  // The starter wallet is itself a grant entry, so the replay starts from 0.
  const summary = replayLedger(0, state.ledger);
  if (summary.endingCoins !== state.coins) {
    issues.push({
      code: 'WALLET_MISMATCH',
      messageVi: `Ví ${state.coins} lệch sổ cái ${summary.endingCoins}`,
    });
  }
  for (const issue of summary.issues) {
    issues.push({ code: 'LEDGER_ISSUE', messageVi: issue });
  }
  if (state.coins < 0) {
    issues.push({ code: 'NEGATIVE_WALLET', messageVi: `Ví âm: ${state.coins}` });
  }
  for (const sku of Object.keys(state.inventory)) {
    const counts = state.inventory[sku];
    if (!counts) {
      continue;
    }
    for (const quality of ['normal', 'silver', 'gold'] as const) {
      if (!Number.isInteger(counts[quality]) || counts[quality] < 0) {
        issues.push({ code: 'NEGATIVE_INVENTORY', messageVi: `${sku}/${quality} âm` });
      }
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Fresh sub-stream for a session (weather, quality, breeding, ...). */
export function createSessionRng(seed: number, day: number, salt: string): RngStream {
  return createRng(deriveSeed(seed, day, salt));
}

