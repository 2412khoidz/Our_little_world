/**
 * Foraging nodes — the free, no-capital coin path that stops a zero wallet from
 * becoming a deadlock (docs/economy/MARKET_AND_NPC.md §3, ECONOMY_DESIGN §3).
 *
 * V0.2.0 ships at least two wild-herb points near the gate. Each point has a
 * server-owned respawn clock and a daily cap; the client only names the node and
 * never receives coins directly.
 */

import { applyItemDelta } from './ledgerMath.ts';
import type { InventoryState } from './ledgerMath.ts';
import { vietnamDayIndex } from './shippingBin.ts';

export interface ForageNodeDefinition {
  readonly nodeId: string;
  readonly sku: string;
  /** Time until this node yields another unit. */
  readonly respawnMs: number;
  /** Maximum claims per local day (anti-AFK farming). */
  readonly dailyCap: number;
}

/** Two free herb points plus one branch pile near the gate. */
export const FORAGE_NODES: readonly ForageNodeDefinition[] = [
  { nodeId: 'gate_herb_a', sku: 'wild_herb', respawnMs: 180_000, dailyCap: 6 },
  { nodeId: 'gate_herb_b', sku: 'wild_herb', respawnMs: 180_000, dailyCap: 6 },
  { nodeId: 'gate_branch', sku: 'wood_branch', respawnMs: 300_000, dailyCap: 4 },
];

export const FORAGE_NODE_BY_ID: ReadonlyMap<string, ForageNodeDefinition> = new Map(
  FORAGE_NODES.map((node) => [node.nodeId, node]),
);

export interface ForageNodeState {
  readonly availableAtMs: number;
  readonly claimsToday: number;
}

export interface ForageState {
  readonly dayIndex: number;
  readonly nodes: Readonly<Record<string, ForageNodeState>>;
  readonly inventory: InventoryState;
}

export function createForageState(inventory: InventoryState, nowMs: number): ForageState {
  const nodes: Record<string, ForageNodeState> = {};
  for (const node of FORAGE_NODES) {
    nodes[node.nodeId] = { availableAtMs: nowMs, claimsToday: 0 };
  }
  return { dayIndex: vietnamDayIndex(nowMs), nodes, inventory };
}

export type ForageErrorCode = 'UNKNOWN_NODE' | 'NOT_READY' | 'DAILY_CAP' | 'INVALID_TIME';

export interface ForageFailure {
  readonly ok: false;
  readonly code: ForageErrorCode;
  readonly messageVi: string;
}

export interface ForageSuccess {
  readonly ok: true;
  readonly state: ForageState;
  readonly item: { readonly sku: string; readonly qty: number };
  readonly nextAvailableAtMs: number;
}

export type ForageResult = ForageSuccess | ForageFailure;

/**
 * Claims one unit from a node. Deterministic given `(state, nodeId, nowMs)`;
 * a retry inside the respawn window is rejected instead of double granting.
 */
export function claimForage(
  state: ForageState,
  input: { nodeId: string; nowMs: number },
): ForageResult {
  const definition = FORAGE_NODE_BY_ID.get(input.nodeId);
  if (!definition) {
    return { ok: false, code: 'UNKNOWN_NODE', messageVi: `Điểm hái không tồn tại: ${input.nodeId}` };
  }
  if (!Number.isFinite(input.nowMs)) {
    return { ok: false, code: 'INVALID_TIME', messageVi: 'Thời gian không hợp lệ' };
  }

  // New local day -> reset the per-node caps.
  const dayIndex = vietnamDayIndex(input.nowMs);
  const rolled: ForageState =
    dayIndex === state.dayIndex
      ? state
      : {
          ...state,
          dayIndex,
          nodes: Object.fromEntries(
            Object.entries(state.nodes).map(([nodeId, node]) => [
              nodeId,
              { availableAtMs: node.availableAtMs, claimsToday: 0 },
            ]),
          ),
        };

  const node = rolled.nodes[definition.nodeId] ?? {
    availableAtMs: input.nowMs,
    claimsToday: 0,
  };

  if (input.nowMs < node.availableAtMs) {
    return {
      ok: false,
      code: 'NOT_READY',
      messageVi: `Điểm hái chưa hồi: còn ${Math.ceil((node.availableAtMs - input.nowMs) / 1_000)} giây`,
    };
  }
  if (node.claimsToday >= definition.dailyCap) {
    return {
      ok: false,
      code: 'DAILY_CAP',
      messageVi: 'Điểm hái này đã đạt giới hạn trong ngày',
    };
  }

  const nextAvailableAtMs = input.nowMs + definition.respawnMs;
  return {
    ok: true,
    state: {
      ...rolled,
      inventory: applyItemDelta(rolled.inventory, { [definition.sku]: 1 }),
      nodes: {
        ...rolled.nodes,
        [definition.nodeId]: {
          availableAtMs: nextAvailableAtMs,
          claimsToday: node.claimsToday + 1,
        },
      },
    },
    item: { sku: definition.sku, qty: 1 },
    nextAvailableAtMs,
  };
}

/** Total free units still claimable today across all nodes (UI hint). */
export function remainingForageToday(state: ForageState): number {
  let remaining = 0;
  for (const definition of FORAGE_NODES) {
    const node = state.nodes[definition.nodeId];
    remaining += Math.max(0, definition.dailyCap - (node?.claimsToday ?? 0));
  }
  return remaining;
}
