/**
 * Stabilization primitives for the Pet AI (V0.2.3 preparation).
 *
 * Anti-jitter building blocks from docs/pet/PET_AI_ARCHITECTURE.md §2:
 * - per-action cooldown,
 * - minimum action duration + commitment window,
 * - hysteresis + switch budget (anti-oscillation),
 * - anti-repeat selection log (anti-spam).
 *
 * All state is plain JSON (never `Map`, `Set`, `Date` or class instances) and
 * every function is pure: it returns a new state and never mutates its input.
 * Invalid timestamps fail open (a broken clock must not freeze the pet) while
 * genuine cooldowns stay conservative.
 */

import { clamp01, safeNumber } from './utilityMath';

/** Plain-JSON cooldown marker for one action. `null` means "never used". */
export interface CooldownTracker {
  readonly lastUsedAtMs: number | null;
}

/** Creates a cooldown value; invalid timestamps become "never used". */
export function createCooldownTracker(lastUsedAtMs: number | null = null): CooldownTracker {
  return {
    lastUsedAtMs:
      typeof lastUsedAtMs === 'number' && Number.isFinite(lastUsedAtMs) ? lastUsedAtMs : null,
  };
}

/**
 * True while the action is still cooling down.
 * A broken (`NaN`/`Infinity`) `nowMs` fails open (returns false) so the pet can
 * recover; a clock that jumps backwards keeps the cooldown at its full length.
 */
export function isOnCooldown(state: CooldownTracker, nowMs: number, cooldownMs: number): boolean {
  if (state.lastUsedAtMs === null) return false;
  if (!Number.isFinite(nowMs)) return false;
  const duration = Math.max(0, safeNumber(cooldownMs, 0));
  if (duration <= 0) return false;
  const elapsed = nowMs - state.lastUsedAtMs;
  return elapsed < duration;
}

/**
 * Marks the action as used. Monotonic: a backwards timestamp never shortens an
 * existing cooldown. Invalid timestamps leave the state untouched.
 */
export function markUsed(state: CooldownTracker, nowMs: number): CooldownTracker {
  if (!Number.isFinite(nowMs)) return state;
  if (state.lastUsedAtMs !== null && state.lastUsedAtMs > nowMs) return state;
  return { lastUsedAtMs: nowMs };
}

/**
 * Milliseconds left on the cooldown, clamped to `[0, cooldownMs]`.
 * Returns 0 when ready, when never used, or when the config is invalid.
 */
export function remainingMs(state: CooldownTracker, nowMs: number, cooldownMs: number): number {
  if (state.lastUsedAtMs === null) return 0;
  if (!Number.isFinite(nowMs)) return 0;
  const duration = Math.max(0, safeNumber(cooldownMs, 0));
  if (duration <= 0) return 0;
  const elapsed = nowMs - state.lastUsedAtMs;
  return clamp01(1 - elapsed / duration) * duration;
}

/** An action currently being executed (or about to be). */
export interface ActiveAction {
  readonly actionId: string;
  readonly targetId: string | null;
  readonly startedAtMs: number;
  readonly durationMs: number;
  /** Last score used to pick this action; compared by `shouldInterrupt`. */
  readonly score01?: number;
  /** Player interactions can still interrupt a non-interruptible action. */
  readonly interruptible?: boolean;
}

/** Minimum duration + commitment window configuration. */
export interface CommitmentConfig {
  readonly minActionMs: number;
  readonly commitmentMs: number;
  readonly interruptGraceMs: number;
}

function nonNegative(value: unknown, fallback: number): number {
  const safe = safeNumber(typeof value === 'number' ? value : fallback, fallback);
  return Math.max(0, safe);
}

/**
 * Sanitizes a (possibly partial) commitment config. Missing/negative/NaN
 * entries become 0, which fails open (no artificial lock).
 */
export function sanitizeCommitmentConfig(
  config: Partial<CommitmentConfig> = {},
): CommitmentConfig {
  return {
    minActionMs: nonNegative(config.minActionMs, 0),
    commitmentMs: nonNegative(config.commitmentMs, 0),
    interruptGraceMs: nonNegative(config.interruptGraceMs, 0),
  };
}

/** Timestamp at which the commitment lock ends (before interrupt grace). */
export function commitmentEndsAtMs(
  current: ActiveAction,
  config: Partial<CommitmentConfig> = {},
): number {
  const sanitized = sanitizeCommitmentConfig(config);
  const startedAt = Number.isFinite(current.startedAtMs) ? current.startedAtMs : 0;
  return startedAt + Math.max(sanitized.minActionMs, sanitized.commitmentMs);
}

/**
 * True when the action's planned duration has elapsed. Invalid timestamps fail
 * open (true) so a corrupt snapshot cannot freeze the brain.
 */
export function isActionFinished(current: ActiveAction, nowMs: number): boolean {
  if (!Number.isFinite(nowMs) || !Number.isFinite(current.startedAtMs)) return true;
  const duration = Number.isFinite(current.durationMs) ? Math.max(0, current.durationMs) : 0;
  return nowMs >= current.startedAtMs + duration;
}

/**
 * May the pet leave the current action? `interruptGraceMs` lets a switch land
 * slightly before the commitment ends (one tick early) without breaking it.
 */
export function canSwitch(
  current: ActiveAction | null,
  nowMs: number,
  config: Partial<CommitmentConfig> = {},
): boolean {
  if (current === null) return true;
  if (!Number.isFinite(nowMs) || !Number.isFinite(current.startedAtMs)) return true;
  const sanitized = sanitizeCommitmentConfig(config);
  const lockMs = Math.max(sanitized.minActionMs, sanitized.commitmentMs);
  const graceMs = Math.min(sanitized.interruptGraceMs, lockMs);
  return nowMs >= current.startedAtMs + lockMs - graceMs;
}

/** One recorded switch, used by the switch-budget window. */
export interface SwitchHistoryEntry {
  readonly actionId: string;
  readonly targetId: string | null;
  readonly atMs: number;
}

/** Plain-JSON switch history. */
export interface SwitchHistoryState {
  readonly entries: readonly SwitchHistoryEntry[];
}

/** Default cap for the switch history (only swappable-window entries matter). */
export const DEFAULT_SWITCH_HISTORY_CAPACITY = 64;

function compareSwitchEntries(a: SwitchHistoryEntry, b: SwitchHistoryEntry): number {
  if (a.atMs !== b.atMs) return a.atMs - b.atMs;
  if (a.actionId !== b.actionId) return a.actionId < b.actionId ? -1 : 1;
  if (a.targetId === b.targetId) return 0;
  if (a.targetId === null) return -1;
  if (b.targetId === null) return 1;
  return a.targetId < b.targetId ? -1 : 1;
}

/** Creates an empty switch history. */
export function createSwitchHistory(
  entries: readonly SwitchHistoryEntry[] = [],
): SwitchHistoryState {
  return { entries: [...entries] };
}

/**
 * Drops entries older than `windowMs` and returns a canonical (sorted) state.
 * A non-finite `nowMs` or `windowMs` leaves the state untouched.
 */
export function pruneSwitchHistory(
  state: SwitchHistoryState,
  nowMs: number,
  windowMs: number,
): SwitchHistoryState {
  if (!Number.isFinite(nowMs) || !Number.isFinite(windowMs)) return state;
  const window = Math.max(0, windowMs);
  const entries = state.entries
    .filter((entry) => Number.isFinite(entry.atMs) && nowMs - entry.atMs <= window)
    .sort(compareSwitchEntries);
  return { entries };
}

/** Switch-budget configuration: at most `maxSwitches` per sliding window. */
export interface SwitchBudgetConfig {
  readonly maxSwitches: number;
  readonly switchWindowMs: number;
}

function sanitizeMaxSwitches(value: number): number {
  if (Number.isNaN(value)) return Number.POSITIVE_INFINITY;
  if (!Number.isFinite(value)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor(value));
}

/**
 * True when another switch fits in the budget. A non-finite `maxSwitches`
 * means "no budget"; `0` refuses every switch. Invalid time fails open.
 */
export function canSwitchWithinBudget(
  state: SwitchHistoryState,
  nowMs: number,
  config: SwitchBudgetConfig,
): boolean {
  if (!Number.isFinite(nowMs)) return true;
  const maxSwitches = sanitizeMaxSwitches(config.maxSwitches);
  if (maxSwitches === Number.POSITIVE_INFINITY) return true;
  const recent = pruneSwitchHistory(state, nowMs, config.switchWindowMs);
  return recent.entries.length < maxSwitches;
}

/** Appends one switch, pruning the window and trimming to `capacity`. */
export function noteSwitch(
  state: SwitchHistoryState,
  record: { readonly actionId: string; readonly targetId?: string | null; readonly atMs: number },
  options: { readonly switchWindowMs?: number; readonly capacity?: number } = {},
): SwitchHistoryState {
  if (!Number.isFinite(record.atMs)) return state;
  const actionId = typeof record.actionId === 'string' ? record.actionId.trim() : '';
  if (actionId.length === 0) return state;

  const windowMs = options.switchWindowMs;
  const base =
    typeof windowMs === 'number' ? pruneSwitchHistory(state, record.atMs, windowMs) : state;
  const capacity = sanitizeHistoryCapacity(options.capacity, DEFAULT_SWITCH_HISTORY_CAPACITY);
  if (capacity === 0) return { entries: [] };

  const entry: SwitchHistoryEntry = {
    actionId,
    targetId: typeof record.targetId === 'string' ? record.targetId : null,
    atMs: record.atMs,
  };
  const entries = [...base.entries, entry].sort(compareSwitchEntries);
  return { entries: entries.slice(Math.max(0, entries.length - capacity)) };
}

/** One recorded selection, used by the anti-repeat guard. */
export interface SelectionRecord {
  readonly actionId: string;
  readonly atMs: number;
}

/** Plain-JSON selection log. */
export interface SelectionLogState {
  readonly entries: readonly SelectionRecord[];
}

/** Default cap for the selection log. */
export const DEFAULT_SELECTION_LOG_CAPACITY = 32;

/** Creates an empty selection log. */
export function createSelectionLog(
  entries: readonly SelectionRecord[] = [],
): SelectionLogState {
  return { entries: [...entries] };
}

function sanitizeHistoryCapacity(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function compareSelectionEntries(a: SelectionRecord, b: SelectionRecord): number {
  if (a.atMs !== b.atMs) return a.atMs - b.atMs;
  if (a.actionId === b.actionId) return 0;
  return a.actionId < b.actionId ? -1 : 1;
}

/**
 * Records a new selection. Old entries are trimmed first (oldest by timestamp,
 * then action id) so the log stays bounded and deterministic.
 */
export function noteSelection(
  state: SelectionLogState,
  actionId: string,
  nowMs: number,
  options: { readonly capacity?: number } = {},
): SelectionLogState {
  if (!Number.isFinite(nowMs)) return state;
  const normalizedId = typeof actionId === 'string' ? actionId.trim() : '';
  if (normalizedId.length === 0) return state;

  const capacity = sanitizeHistoryCapacity(options.capacity, DEFAULT_SELECTION_LOG_CAPACITY);
  if (capacity === 0) return { entries: [] };

  const entries = [...state.entries, { actionId: normalizedId, atMs: nowMs }].sort(
    compareSelectionEntries,
  );
  return { entries: entries.slice(Math.max(0, entries.length - capacity)) };
}

/** Latest selection timestamp for an action, or `null` when never selected. */
export function getLastSelectedAtMs(state: SelectionLogState, actionId: string): number | null {
  let latest: number | null = null;
  for (const entry of state.entries) {
    if (entry.actionId !== actionId) continue;
    if (!Number.isFinite(entry.atMs)) continue;
    if (latest === null || entry.atMs > latest) latest = entry.atMs;
  }
  return latest;
}

/**
 * True when re-selecting `actionId` now would violate `minRepeatCooldownMs`.
 * A non-positive/invalid cooldown or invalid clock fails open (false).
 */
export function isRepeatSuppressed(
  state: SelectionLogState,
  actionId: string,
  nowMs: number,
  minRepeatCooldownMs: number,
): boolean {
  if (!Number.isFinite(nowMs)) return false;
  const cooldown = Math.max(0, safeNumber(minRepeatCooldownMs, 0));
  if (cooldown <= 0) return false;
  const lastSelectedAt = getLastSelectedAtMs(state, actionId);
  if (lastSelectedAt === null) return false;
  const elapsed = nowMs - lastSelectedAt;
  return elapsed >= 0 && elapsed < cooldown;
}

/** Interrupt configuration = commitment + hysteresis + anti-oscillation budget. */
export interface StabilizationConfig extends CommitmentConfig {
  /** Extra score a candidate needs over the current action to take over. */
  readonly hysteresisMargin01: number;
  /** Max switches inside `switchWindowMs`; non-finite = unlimited. */
  readonly maxSwitches: number;
  /** Sliding window for `maxSwitches`. */
  readonly switchWindowMs: number;
  /** Window for the separate anti-repeat guard. */
  readonly minRepeatCooldownMs: number;
}

/** Sanitizes a (possibly partial) stabilization config. */
export function sanitizeStabilizationConfig(
  config: Partial<StabilizationConfig> = {},
): StabilizationConfig {
  const commitment = sanitizeCommitmentConfig(config);
  return {
    ...commitment,
    hysteresisMargin01: clamp01(safeNumber(config.hysteresisMargin01 ?? 0, 0)),
    maxSwitches: sanitizeMaxSwitches(
      typeof config.maxSwitches === 'number' ? config.maxSwitches : Number.POSITIVE_INFINITY,
    ),
    switchWindowMs: nonNegative(config.switchWindowMs, 0),
    minRepeatCooldownMs: nonNegative(config.minRepeatCooldownMs, 0),
  };
}

/** Candidate that wants to replace the current action. */
export interface InterruptCandidate {
  readonly actionId: string;
  readonly targetId?: string | null;
  readonly score01: number;
}

/** Input for `shouldInterrupt`. */
export interface InterruptContext {
  readonly current: ActiveAction | null;
  readonly candidate: InterruptCandidate;
  readonly nowMs: number;
  readonly config: Partial<StabilizationConfig>;
  /** Affordance gone / target removed / validator rejected the action. */
  readonly currentInvalid?: boolean;
  /** Optional switch history for the anti-oscillation budget. */
  readonly history?: SwitchHistoryState;
}

/**
 * Decides whether a new candidate may replace the current action.
 *
 * Rules (all must hold):
 * 1. the candidate beats the current score by `hysteresisMargin01`
 *    (strictly greater when the margin is 0, so equal scores never flip);
 * 2. the current action is invalid/finished, or its commitment window elapsed;
 * 3. a non-interruptible current action is only replaced when finished/invalid;
 * 4. the switch budget still has room (when a history is supplied).
 */
export function shouldInterrupt(context: InterruptContext): boolean {
  const { current, candidate, nowMs } = context;
  if (current === null) return true;

  const currentTarget = current.targetId;
  const candidateTarget = candidate.targetId ?? currentTarget;
  if (current.actionId === candidate.actionId && currentTarget === candidateTarget) {
    return false;
  }

  const config = sanitizeStabilizationConfig(context.config);
  const currentScore = safeNumber(current.score01 ?? 0, 0);
  const candidateScore = safeNumber(candidate.score01, 0);
  const margin = clamp01(config.hysteresisMargin01);
  const difference = candidateScore - currentScore;
  const beatsCurrent = margin > 0 ? difference >= margin : difference > 0;
  if (!beatsCurrent) return false;

  const invalid = context.currentInvalid === true;
  const finished = isActionFinished(current, nowMs);
  if (!invalid && current.interruptible === false && !finished) return false;
  if (!invalid && !finished && !canSwitch(current, nowMs, config)) return false;

  if (context.history !== undefined) {
    const budget: SwitchBudgetConfig = {
      maxSwitches: config.maxSwitches,
      switchWindowMs: config.switchWindowMs,
    };
    if (!canSwitchWithinBudget(context.history, nowMs, budget)) return false;
  }

  return true;
}
