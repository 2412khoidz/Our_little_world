/**
 * Gameplay action contracts (P3 from the GPT review).
 *
 * Purpose: give the future server a single place to express what makes a
 * gameplay action unique and trustworthy. These are CONTRACTS, not transactions:
 * a pure reducer call is never proof that a reward was granted exactly once.
 *
 * Rules encoded here:
 * - Every action has a business-level key (crop cycle, breeding attempt, fishing
 *   cast, cooking session, order completion) that is independent from the HTTP
 *   retry idempotency key.
 * - The server owns time and RNG. Payloads carrying client seeds/timestamps or
 *   client-reported rewards are rejected.
 * - State transitions use compare-and-swap on `expectedStateVersion`.
 */

export type ActionKind =
  | 'crop_cycle'
  | 'breeding_attempt'
  | 'fishing_cast'
  | 'cooking_session'
  | 'order_completion';

export interface ActionContext {
  /** Business-level unique key, scoped to world + entity. */
  readonly actionKey: string;
  readonly kind: ActionKind;
  readonly actorId: string;
  /** Compare-and-swap guard: must equal the server's current version. */
  readonly expectedStateVersion: number;
  /** Server clock only. */
  readonly serverNowMs: number;
  /** Server-side RNG seed for this action (never client supplied). */
  readonly serverSeed: number;
}

export type ActionFailureCode =
  | 'INVALID_ACTION_KEY'
  | 'INVALID_KIND'
  | 'MISSING_ACTOR'
  | 'STALE_VERSION'
  | 'VERSION_MISMATCH'
  | 'NON_MONOTONIC_TIME'
  | 'DUPLICATE_ACTION'
  | 'CLIENT_AUTHORITY'
  | 'INVALID_SEED';

export interface ActionFailure {
  readonly ok: false;
  readonly code: ActionFailureCode;
  readonly messageVi: string;
}

export interface ActionSuccess {
  readonly ok: true;
  readonly nextVersion: number;
}

export type ActionResult = ActionSuccess | ActionFailure;

function fail(code: ActionFailureCode, messageVi: string): ActionFailure {
  return { ok: false, code, messageVi };
}

/** Deterministic, namespaced business key. */
export function businessKey(kind: ActionKind, ...parts: readonly (string | number)[]): string {
  if (parts.length === 0) {
    throw new RangeError('businessKey requires at least one identifier part');
  }
  const normalized = parts.map((part) => String(part).trim().replace(/[:|]+/g, '_'));
  return `${kind}:${normalized.join(':')}`;
}

export function isActionKey(value: string): boolean {
  return /^[a-z_]+:[^\s]+$/.test(value) && value.length <= 200;
}

export interface CreateActionInput {
  readonly kind: ActionKind;
  readonly parts: readonly (string | number)[];
  readonly actorId: string;
  readonly expectedStateVersion: number;
  readonly serverNowMs: number;
  readonly serverSeed: number;
}

/** Server-side factory. Callers must never expose this to the client. */
export function createActionContext(input: CreateActionInput): ActionContext {
  if (!Number.isSafeInteger(input.serverSeed)) {
    throw new RangeError('serverSeed must be a safe integer produced by the server');
  }
  return {
    actionKey: businessKey(input.kind, ...input.parts),
    kind: input.kind,
    actorId: input.actorId,
    expectedStateVersion: input.expectedStateVersion,
    serverNowMs: input.serverNowMs,
    serverSeed: input.serverSeed >>> 0,
  };
}

export interface ActionStateRef {
  readonly stateVersion: number;
  readonly lastActionAtMs: number;
}

/**
 * Validates an action context against the server's current state. Pure and
 * deterministic; the caller must still run it inside the database transaction.
 */
export function validateActionContext(
  context: ActionContext,
  state: ActionStateRef | null,
  seenActionKeys: readonly string[] = [],
): ActionResult {
  if (!isActionKey(context.actionKey)) {
    return fail('INVALID_ACTION_KEY', 'Khóa nghiệp vụ không hợp lệ');
  }
  if (!context.actorId) {
    return fail('MISSING_ACTOR', 'Thiếu danh tính người thực hiện');
  }
  if (!Number.isSafeInteger(context.serverSeed) || context.serverSeed < 0) {
    return fail('INVALID_SEED', 'Seed phải do server sinh và là số nguyên không âm');
  }
  if (!Number.isFinite(context.serverNowMs) || context.serverNowMs <= 0) {
    return fail('NON_MONOTONIC_TIME', 'Mốc thời gian server không hợp lệ');
  }
  if (seenActionKeys.includes(context.actionKey)) {
    return fail('DUPLICATE_ACTION', 'Hành động này đã được xử lý');
  }
  if (state) {
    if (context.expectedStateVersion !== state.stateVersion) {
      return fail(
        'VERSION_MISMATCH',
        `Phiên bản trạng thái lệch: yêu cầu ${context.expectedStateVersion}, hiện tại ${state.stateVersion}`,
      );
    }
    if (context.serverNowMs < state.lastActionAtMs) {
      return fail('NON_MONOTONIC_TIME', 'Đồng hồ server đi lùi so với hành động trước');
    }
  }
  return {
    ok: true,
    nextVersion: (state?.stateVersion ?? context.expectedStateVersion) + 1,
  };
}

/** Fields a client must never be allowed to author. */
export const CLIENT_AUTHORITY_FIELDS = [
  'seed',
  'rngSeed',
  'nowMs',
  'serverNowMs',
  'reward',
  'rewardCoins',
  'coins',
  'items',
  'quality',
  'harvestResult',
] as const;

export type ClientAuthorityField = (typeof CLIENT_AUTHORITY_FIELDS)[number];

/**
 * Rejects a request payload that tries to author server-owned fields. This is a
 * contract check for the adapter layer; it does not replace server validation.
 */
export function assertNoClientAuthority(
  payload: Readonly<Record<string, unknown>>,
): ActionResult {
  for (const field of CLIENT_AUTHORITY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      return fail('CLIENT_AUTHORITY', `Client không được gửi trường do server quản lý: ${field}`);
    }
  }
  return { ok: true, nextVersion: 0 };
}

/**
 * Reward safety checklist for the future RPC. Every item reward must be tied to
 * one consumed business action and one consumed source (harvest/catch/dish/order).
 */
export interface RewardIntent {
  readonly actionKey: string;
  readonly sku: string;
  readonly qty: number;
  readonly reason: string;
}

export function validateRewardIntent(intent: RewardIntent): ActionResult {
  if (!isActionKey(intent.actionKey)) {
    return fail('INVALID_ACTION_KEY', 'Phần thưởng phải gắn với khóa nghiệp vụ hợp lệ');
  }
  if (!Number.isInteger(intent.qty) || intent.qty <= 0) {
    return fail('INVALID_ACTION_KEY', 'Số lượng phần thưởng phải là số nguyên dương');
  }
  if (!intent.sku) {
    return fail('INVALID_ACTION_KEY', 'Phần thưởng thiếu SKU');
  }
  return { ok: true, nextVersion: 0 };
}
