/**
 * Bounded typed memory primitives for the Pet AI (V0.2.3 preparation).
 *
 * Design notes:
 * - Events are a fixed, extensible set of kinds. Built-ins are the six kinds
 *   used by the design docs; `createMemoryKindRegistry` lets a caller add more
 *   without changing this module.
 * - The buffer is bounded and deterministic: events are kept sorted by
 *   `(atMs, id)` and the oldest entries are evicted first, so the same events
 *   produce the same state regardless of insertion order.
 * - Capacity: `PET_AI_ARCHITECTURE.md` does not specify a number, so the
 *   default is 64. For Supabase persistence the Pet MVP should pass
 *   `capacity: 24` because `PET_SIMULATION_SPEC.md` / `PET_DESIGN.md` cap
 *   `memory_jsonb` at 24 events.
 * - All public state is plain JSON (no Map/Set/Date/class instances) and
 *   serialize/deserialize round-trips exactly.
 *
 * PER-CAREGIVER MEMORY: `scorePreferenceByCaregiver` exists for familiarity and
 * attachment only. It deliberately performs NO ranking, comparison, sorting or
 * leaderboard output between the two owners (docs/pet/PET_DESIGN.md §3 forbids
 * any "cat loves whom more" table). The returned map follows the caller's
 * `caregiverIds` order and must not be used to compare owners.
 */

import { clamp01, safeNumber } from './utilityMath';

/** Kinds shipped by the design docs. */
export const BUILT_IN_MEMORY_EVENT_KINDS = [
  'fed',
  'played',
  'petted',
  'ignored',
  'slept',
  'explored',
] as const;

/** Union of the built-in kinds. */
export type BuiltInMemoryEventKind = (typeof BUILT_IN_MEMORY_EVENT_KINDS)[number];

/**
 * Event kind. `string & Record<never, never>` keeps editor autocomplete for the
 * built-in kinds while accepting custom kinds registered by the caller.
 */
export type MemoryEventKind = BuiltInMemoryEventKind | (string & Record<never, never>);

/** Plain-JSON registry of accepted kinds (extensible, deterministic order). */
export interface MemoryKindRegistry {
  readonly kinds: readonly string[];
}

/** Builds a kind registry from the built-ins plus optional custom kinds. */
export function createMemoryKindRegistry(
  extraKinds: readonly string[] = [],
): MemoryKindRegistry {
  const seen = new Set<string>();
  const kinds: string[] = [];
  for (const kind of [...BUILT_IN_MEMORY_EVENT_KINDS, ...extraKinds]) {
    if (typeof kind !== 'string') continue;
    const normalized = kind.trim();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    kinds.push(normalized);
  }
  return { kinds };
}

/** Default registry containing only the built-in kinds. */
export const DEFAULT_MEMORY_KIND_REGISTRY: MemoryKindRegistry = createMemoryKindRegistry();

/** True when `kind` is present in the supplied registry. */
export function isKnownMemoryKind(registry: MemoryKindRegistry, kind: string): boolean {
  return registry.kinds.includes(kind);
}

/** One remembered event. `caregiverId` is `null` for ownerless/system events. */
export interface MemoryEvent {
  readonly id: string;
  readonly kind: MemoryEventKind;
  readonly atMs: number;
  readonly caregiverId: string | null;
  /** Importance multiplier in `[0, 1]`; omitted means the default of 1. */
  readonly weight?: number;
  /** Free-form sorted tags (for example `feed:breakfast`). */
  readonly tags?: readonly string[];
}

/** Default importance for an event without an explicit weight. */
export const DEFAULT_MEMORY_EVENT_WEIGHT = 1;

/** Default buffer capacity (see the module note about the 24-event DB cap). */
export const DEFAULT_MEMORY_CAPACITY = 64;

/** Hard upper bound for a caller-supplied capacity (guards memory). */
export const MAX_MEMORY_CAPACITY = 4096;

/** Plain-JSON memory buffer state. */
export interface MemoryState {
  readonly capacity: number;
  readonly events: readonly MemoryEvent[];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Clamps a capacity to `[0, MAX_MEMORY_CAPACITY]`; invalid values use 64. */
export function sanitizeMemoryCapacity(capacity: number): number {
  if (!Number.isFinite(capacity)) return DEFAULT_MEMORY_CAPACITY;
  return Math.min(MAX_MEMORY_CAPACITY, Math.max(0, Math.floor(capacity)));
}

function coerceTags(tags: unknown): readonly string[] | undefined {
  if (!Array.isArray(tags)) return undefined;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const normalized = tag.trim();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  result.sort();
  return result;
}

/**
 * Normalizes an untrusted event into the public shape. Returns `null` when the
 * event cannot be used (missing kind or non-finite timestamp). `id` may be
 * empty here; `appendMemoryEvent` generates a deterministic fallback id.
 */
function coerceMemoryEvent(raw: unknown): MemoryEvent | null {
  if (!isPlainRecord(raw)) return null;
  const kind = typeof raw.kind === 'string' && raw.kind.trim().length > 0 ? raw.kind.trim() : null;
  const atMs = typeof raw.atMs === 'number' && Number.isFinite(raw.atMs) ? raw.atMs : null;
  if (kind === null || atMs === null) return null;

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const caregiverId =
    typeof raw.caregiverId === 'string' && raw.caregiverId.trim().length > 0
      ? raw.caregiverId.trim()
      : null;

  let weight: number | undefined;
  if (typeof raw.weight === 'number' && Number.isFinite(raw.weight)) {
    weight = clamp01(raw.weight);
  }
  const tags = coerceTags(raw.tags);

  return {
    id,
    kind,
    atMs,
    caregiverId,
    ...(weight !== undefined ? { weight } : {}),
    ...(tags !== undefined ? { tags } : {}),
  };
}

function compareMemoryEvents(a: MemoryEvent, b: MemoryEvent): number {
  if (a.atMs !== b.atMs) return a.atMs - b.atMs;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/**
 * Sorts, de-duplicates (first occurrence in canonical order wins) and trims to
 * the newest `capacity` events.
 */
function normalizeMemoryEvents(
  events: readonly MemoryEvent[],
  capacity: number,
): MemoryEvent[] {
  if (capacity === 0) return [];
  const sorted = [...events].sort(compareMemoryEvents);
  const seen = new Set<string>();
  const unique: MemoryEvent[] = [];
  for (const event of sorted) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    unique.push(event);
  }
  return unique.slice(Math.max(0, unique.length - capacity));
}

/** Creates an empty bounded buffer. */
export function createMemoryState(capacity: number = DEFAULT_MEMORY_CAPACITY): MemoryState {
  return { capacity: sanitizeMemoryCapacity(capacity), events: [] };
}

function generateEventId(kind: string, atMs: number): string {
  // Stable and state-independent: repeating the same id-less event is treated
  // as the same event (idempotent), never as a new duplicate.
  return `${kind}@${String(atMs)}`;
}

/**
 * Adds an event, enforcing capacity, canonical ordering and id idempotency
 * (an existing id is never replaced). Returns a new state; the input is not
 * mutated. Invalid events leave the state (normalized) unchanged.
 */
export function appendMemoryEvent(state: MemoryState, event: MemoryEvent): MemoryState {
  const capacity = sanitizeMemoryCapacity(state.capacity);
  if (capacity === 0) return { capacity, events: [] };

  const coerced = coerceMemoryEvent(event);
  if (coerced === null) {
    return { capacity, events: normalizeMemoryEvents(state.events, capacity) };
  }

  const id =
    coerced.id.length > 0
      ? coerced.id
      : generateEventId(coerced.kind, coerced.atMs);
  if (state.events.some((existing) => existing.id === id)) {
    return { capacity, events: normalizeMemoryEvents(state.events, capacity) };
  }

  const events = normalizeMemoryEvents([...state.events, { ...coerced, id }], capacity);
  return { capacity, events };
}

/**
 * Keeps events with `nowMs - atMs <= ttlMs` (future events are kept).
 * A non-finite TTL means "no expiry"; a negative TTL behaves like 0.
 */
export function expireEvents(
  events: readonly MemoryEvent[],
  nowMs: number,
  ttlMs: number,
): MemoryEvent[] {
  if (!Number.isFinite(nowMs) || !Number.isFinite(ttlMs)) return [...events];
  const ttl = Math.max(0, ttlMs);
  return events.filter((event) => {
    if (!Number.isFinite(event.atMs)) return false;
    return nowMs - event.atMs <= ttl;
  });
}

/**
 * Exponential recency weight: 1 at `atMs >= nowMs`, 0.5 after one half-life,
 * approaching 0 for very old events. Always finite and `[0, 1]`.
 */
export function recencyWeight(atMs: number, nowMs: number, halfLifeMs: number): number {
  if (!Number.isFinite(atMs) || !Number.isFinite(nowMs)) return 0;
  const age = nowMs - atMs;
  if (age <= 0) return 1;
  if (!Number.isFinite(halfLifeMs) || halfLifeMs <= 0) return 0;
  return clamp01(Math.exp((-Math.LN2 * age) / halfLifeMs));
}

/**
 * Number of events of `kind` inside an optional sliding window. Future events
 * count as inside the window. A non-finite `windowMs` means "no window".
 */
export function frequencyCount(
  events: readonly MemoryEvent[],
  kind: string,
  nowMs: number,
  windowMs?: number,
): number {
  if (!Number.isFinite(nowMs)) return 0;
  let count = 0;
  for (const event of events) {
    if (event.kind !== kind) continue;
    if (!Number.isFinite(event.atMs)) continue;
    if (typeof windowMs === 'number' && Number.isFinite(windowMs)) {
      if (nowMs - event.atMs > Math.max(0, windowMs)) continue;
    }
    count += 1;
  }
  return count;
}

/** Config for `preferenceScore`. */
export interface PreferenceConfig {
  readonly nowMs: number;
  readonly halfLifeMs: number;
  /** Per-kind multipliers; missing kinds default to 1, non-positive to 0. */
  readonly kindWeights?: Readonly<Record<string, number>>;
}

function readKindWeight(
  kindWeights: Readonly<Record<string, number>> | undefined,
  kind: string,
): number {
  if (kindWeights === undefined || !Object.prototype.hasOwnProperty.call(kindWeights, kind)) {
    return 1;
  }
  const value = kindWeights[kind];
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 1;
}

/**
 * Recency-weighted mean of event importance for one set of events, in `[0, 1]`.
 * It is a *relative* strength of evidence, not a ranking between events or
 * caregivers. Returns 0 for an empty list or all-zero weights.
 */
export function preferenceScore(
  events: readonly MemoryEvent[],
  config: PreferenceConfig,
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const event of events) {
    const recency = recencyWeight(event.atMs, config.nowMs, config.halfLifeMs);
    const eventWeight = clamp01(
      safeNumber(event.weight ?? DEFAULT_MEMORY_EVENT_WEIGHT, DEFAULT_MEMORY_EVENT_WEIGHT),
    );
    const baseWeight = eventWeight * readKindWeight(config.kindWeights, event.kind);
    if (baseWeight <= 0) continue;
    weightedSum += recency * baseWeight;
    totalWeight += baseWeight;
  }
  if (totalWeight <= 0) return 0;
  return clamp01(weightedSum / totalWeight);
}

/**
 * Per-caregiver familiarity score map (kind/recency weighted, `[0, 1]`).
 *
 * IMPORTANT: this is for attachment/familiarity only. It intentionally offers
 * no ranking, comparator or leaderboard helper, and the two owners' scores are
 * never compared. Output order follows `caregiverIds` so callers cannot read a
 * ranking into it.
 */
export type CaregiverPreferenceMap = Readonly<Record<string, number>>;

/** Scores each caregiver independently; no cross-caregiver comparison. */
export function scorePreferenceByCaregiver(
  events: readonly MemoryEvent[],
  caregiverIds: readonly string[],
  config: PreferenceConfig,
): CaregiverPreferenceMap {
  const entries: Array<[string, number]> = [];
  for (const caregiverId of caregiverIds) {
    if (typeof caregiverId !== 'string') continue;
    const normalized = caregiverId.trim();
    if (normalized.length === 0) continue;
    const scoped = events.filter((event) => event.caregiverId === normalized);
    entries.push([normalized, preferenceScore(scoped, config)]);
  }
  // `Object.fromEntries` uses data properties, so even "__proto__" stays safe.
  return Object.fromEntries(entries);
}

/** Serializes memory state to canonical plain JSON. */
export function serializeMemory(state: MemoryState): string {
  const capacity = sanitizeMemoryCapacity(state.capacity);
  const events = normalizeMemoryEvents(state.events, capacity);
  return JSON.stringify({ capacity, events });
}

/**
 * Restores memory state from JSON (string or already-parsed value).
 * Never throws: invalid JSON or malformed events fall back to an empty buffer
 * with the default capacity. Valid states round-trip exactly.
 */
export function deserializeMemory(json: unknown): MemoryState {
  let parsed: unknown = json;
  if (typeof json === 'string') {
    try {
      parsed = JSON.parse(json) as unknown;
    } catch {
      return createMemoryState();
    }
  }
  if (!isPlainRecord(parsed)) return createMemoryState();

  const capacity = sanitizeMemoryCapacity(
    typeof parsed.capacity === 'number' ? parsed.capacity : DEFAULT_MEMORY_CAPACITY,
  );
  const rawEvents = Array.isArray(parsed.events) ? parsed.events : [];
  let state = createMemoryState(capacity);
  for (const raw of rawEvents) {
    const event = coerceMemoryEvent(raw);
    if (event === null || event.id.length === 0) continue;
    state = appendMemoryEvent(state, event);
  }
  return state;
}
