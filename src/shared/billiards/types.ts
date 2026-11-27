import { z } from 'zod';

export type BilliardsRule = '8ball' | '9ball';
export type BilliardsEdition = '2d' | '3d';
export type BilliardsPlayMode = 'online' | 'local_pvp' | 'ai' | 'practice';
export type BotDifficulty = 'easy' | 'medium' | 'hard';
export type Billiards3DQuality = 'auto' | 'low' | 'medium' | 'high';
export type BilliardsOrientation = 'auto' | 'portrait' | 'landscape';
export type BallGroup = 'solid' | 'stripe' | null;
export type PlayerSlot = 0 | 1;
export type BilliardsMatchPhase = 'aim' | 'moving' | 'gameOver';
export type BilliardsConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline';

export const BilliardsEditionSchema = z.enum(['2d', '3d']);
export const BilliardsRuleSchema = z.enum(['8ball', '9ball']);

export interface Quat {
  w: number;
  x: number;
  y: number;
  z: number;
}

export const PlayerSlotSchema = z.union([z.literal(0), z.literal(1)]);

export const QuatSchema = z.object({
  w: z.number().finite(),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

export const BallStateSchema = z.object({
  id: z.number().int().min(0).max(15),
  x: z.number().finite(),
  y: z.number().finite(),
  vx: z.number().finite(),
  vy: z.number().finite(),
  rollVx: z.number().finite(),
  rollVy: z.number().finite(),
  spinZ: z.number().finite(),
  pocketed: z.boolean(),
  q: QuatSchema,
});
export type BallState = z.infer<typeof BallStateSchema>;

export const WinnerInfoSchema = z.object({
  slot: PlayerSlotSchema,
  reason: z.string().max(240),
});
export type WinnerInfo = z.infer<typeof WinnerInfoSchema>;

export const ScoresTupleSchema = z.tuple([
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
]);
export type ScoresTuple = z.infer<typeof ScoresTupleSchema>;

export const ShotParamsSchema = z.object({
  matchId: z.string().min(1).max(128),
  shotIndex: z.number().int().nonnegative(),
  baseStateVersion: z.number().int().nonnegative(),
  stateVersion: z.number().int().positive(),
  playerSlot: PlayerSlotSchema,
  angle: z.number().finite(),
  power: z.number().min(0.03).max(1),
  spinX: z.number().min(-0.85).max(0.85),
  spinY: z.number().min(-0.85).max(0.85),
  elevationDeg: z.number().min(0).max(45).default(0),
  cueX: z.number().finite(),
  cueY: z.number().finite(),
});
export type ShotParams = z.infer<typeof ShotParamsSchema>;

export const AimSyncSchema = z.object({
  matchId: z.string().min(1).max(128),
  stateVersion: z.number().int().nonnegative(),
  playerSlot: PlayerSlotSchema,
  angle: z.number().finite(),
  power: z.number().min(0).max(1),
  spinX: z.number().min(-0.85).max(0.85).optional(),
  spinY: z.number().min(-0.85).max(0.85).optional(),
  elevationDeg: z.number().min(0).max(45).optional(),
});
export type AimSyncPayload = z.infer<typeof AimSyncSchema>;

export const PlaceCueSchema = z.object({
  matchId: z.string().min(1).max(128),
  stateVersion: z.number().int().nonnegative(),
  playerSlot: PlayerSlotSchema,
  x: z.number().finite(),
  y: z.number().finite(),
});
export type PlaceCuePayload = z.infer<typeof PlaceCueSchema>;

export const MatchStartSchema = z.object({
  matchId: z.string().min(1).max(128),
  matchSeq: z.number().int().positive(),
  initiatorSlot: PlayerSlotSchema,
  createdAtMs: z.number().int().positive(),
  edition: BilliardsEditionSchema.optional(),
  rule: BilliardsRuleSchema,
  rackSeed: z.number().int(),
  startingPlayer: PlayerSlotSchema,
  startAtServerMs: z.number().int().positive().optional(),
  turnDeadlineMs: z.number().int().positive(),
  turnRemainingMs: z.number().int().nonnegative().max(120_000),
  scores: ScoresTupleSchema,
});
export type MatchStartPayload = z.infer<typeof MatchStartSchema>;

export const BallGroupSchema = z.union([z.literal('solid'), z.literal('stripe'), z.null()]);

export const SettledStateSchema = z.object({
  matchId: z.string().min(1).max(128),
  matchSeq: z.number().int().positive(),
  edition: BilliardsEditionSchema.optional(),
  kind: z.enum(['shot_settled', 'turn_timeout']),
  actorSlot: PlayerSlotSchema,
  shotIndex: z.number().int().nonnegative().nullable(),
  shot: ShotParamsSchema.nullable().optional(),
  stateVersion: z.number().int().positive(),
  nextShotSeq: z.number().int().nonnegative(),
  balls: z.array(BallStateSchema).min(10).max(16),
  groups: z.tuple([BallGroupSchema, BallGroupSchema]),
  nextPlayer: PlayerSlotSchema,
  ballInHand: z.boolean(),
  isBreakShot: z.boolean(),
  turnDeadlineMs: z.number().int().positive(),
  turnRemainingMs: z.number().int().nonnegative().max(120_000),
  returnedIds: z.array(z.number().int().min(1).max(15)),
  scores: ScoresTupleSchema,
  winner: WinnerInfoSchema.nullable(),
  foulMessage: z.string().max(240).optional(),
  bannerTitle: z.string().max(120).optional(),
  bannerSub: z.string().max(240).optional(),
});
export type SettledStatePayload = z.infer<typeof SettledStateSchema>;

export const InFlightShotStateSchema = z.object({
  shot: ShotParamsSchema,
  preShotBalls: z.array(BallStateSchema).min(10).max(16),
  shotFirstHit: z.number().int().min(1).max(15).nullable(),
  shotPocketed: z.array(z.number().int().min(1).max(15)),
  shotWasOnEight: z.boolean(),
  cueScratched: z.boolean(),
  ticksElapsed: z.number().int().nonnegative(),
});
export type InFlightShotState = z.infer<typeof InFlightShotStateSchema>;

export const MatchSnapshotSchema = z.object({
  matchId: z.string().min(1).max(128),
  matchSeq: z.number().int().positive(),
  initiatorSlot: PlayerSlotSchema,
  senderSlot: PlayerSlotSchema,
  createdAtMs: z.number().int().positive(),
  startedAtMs: z.number().int().positive(),
  startAtServerMs: z.number().int().positive().optional(),
  edition: BilliardsEditionSchema.optional(),
  rule: BilliardsRuleSchema,
  rackSeed: z.number().int(),
  phase: z.enum(['aim', 'moving', 'gameOver']),
  stateVersion: z.number().int().nonnegative(),
  nextShotSeq: z.number().int().nonnegative(),
  shotCount: z.number().int().nonnegative(),
  balls: z.array(BallStateSchema).min(10).max(16),
  groups: z.tuple([BallGroupSchema, BallGroupSchema]),
  currentPlayer: PlayerSlotSchema,
  ballInHand: z.boolean(),
  isBreakShot: z.boolean(),
  turnDeadlineMs: z.number().int().positive(),
  turnRemainingMs: z.number().int().nonnegative().max(120_000),
  shots: z.array(ShotParamsSchema).max(500),
  lastShotSnap: z
    .object({
      balls: z.array(BallStateSchema).min(10).max(16),
      shot: ShotParamsSchema,
    })
    .nullable(),
  inFlightShot: InFlightShotStateSchema.nullable(),
  returnedIds: z.array(z.number().int().min(1).max(15)),
  scores: ScoresTupleSchema,
  winner: WinnerInfoSchema.nullable(),
});
export type MatchSnapshot = z.infer<typeof MatchSnapshotSchema>;

export const StateRequestSchema = z.object({
  requesterSlot: PlayerSlotSchema,
  currentMatchId: z.string().min(1).max(128).nullable().optional(),
  currentMatchSeq: z.number().int().nonnegative().optional(),
  currentStateVersion: z.number().int().nonnegative().optional(),
});
export type StateRequestPayload = z.infer<typeof StateRequestSchema>;

export const LobbyPlayerStateSchema = z.object({
  joined: z.boolean(),
  connected: z.boolean(),
  ready: z.boolean(),
  assetsReady: z.boolean(),
  wantRematch: z.boolean(),
});
export type LobbyPlayerState = z.infer<typeof LobbyPlayerStateSchema>;

export const LobbyConfirmedConfigSchema = z.object({
  matchId: z.string().min(1).max(128),
  matchSeq: z.number().int().positive(),
  edition: BilliardsEditionSchema,
  rule: BilliardsRuleSchema,
  rackSeed: z.number().int(),
  startingPlayer: PlayerSlotSchema,
  startAtServerMs: z.number().int().positive(),
  countdownMs: z.number().int().positive().max(15_000),
  serverConfirmedAtMs: z.number().int().positive(),
  scores: ScoresTupleSchema,
});
export type LobbyConfirmedConfig = z.infer<typeof LobbyConfirmedConfigSchema>;

export const BilliardsLobbyStateSchema = z.object({
  lobbyId: z.string().min(1).max(128),
  configVersion: z.number().int().nonnegative(),
  status: z.enum(['idle', 'lobby', 'countdown', 'in_match']),
  edition: BilliardsEditionSchema,
  rule: BilliardsRuleSchema,
  startingPlayer: PlayerSlotSchema,
  players: z.tuple([LobbyPlayerStateSchema, LobbyPlayerStateSchema]),
  confirmedConfig: LobbyConfirmedConfigSchema.nullable(),
  activeMatchId: z.string().min(1).max(128).nullable(),
  serverNowMs: z.number().int().positive(),
});
export type BilliardsLobbyState = z.infer<typeof BilliardsLobbyStateSchema>;

export const LobbyJoinPayloadSchema = z.object({
  playerSlot: PlayerSlotSchema,
  edition: BilliardsEditionSchema.optional(),
  rule: BilliardsRuleSchema.optional(),
  startingPlayer: PlayerSlotSchema.optional(),
  assetsReady: z.boolean().optional(),
});
export type LobbyJoinPayload = z.infer<typeof LobbyJoinPayloadSchema>;

export const LobbyInvitePayloadSchema = z.object({
  inviterSlot: PlayerSlotSchema,
  inviterName: z.string().min(1).max(64),
  edition: BilliardsEditionSchema,
  rule: BilliardsRuleSchema,
  sentAtMs: z.number().int().positive(),
});
export type LobbyInvitePayload = z.infer<typeof LobbyInvitePayloadSchema>;

export const LobbyConfigPayloadSchema = z.object({
  actorSlot: PlayerSlotSchema,
  configVersion: z.number().int().nonnegative(),
  edition: BilliardsEditionSchema,
  rule: BilliardsRuleSchema,
  startingPlayer: PlayerSlotSchema,
});
export type LobbyConfigPayload = z.infer<typeof LobbyConfigPayloadSchema>;

export const LobbyReadyPayloadSchema = z.object({
  playerSlot: PlayerSlotSchema,
  configVersion: z.number().int().nonnegative(),
  ready: z.boolean(),
  assetsReady: z.boolean(),
});
export type LobbyReadyPayload = z.infer<typeof LobbyReadyPayloadSchema>;

export const LobbyLeavePayloadSchema = z.object({
  playerSlot: PlayerSlotSchema,
  reason: z.enum(['leave', 'cancel', 'new_lobby']),
});
export type LobbyLeavePayload = z.infer<typeof LobbyLeavePayloadSchema>;

export const LobbyRematchPayloadSchema = z.object({
  playerSlot: PlayerSlotSchema,
  matchId: z.string().min(1).max(128),
  wantRematch: z.boolean(),
});
export type LobbyRematchPayload = z.infer<typeof LobbyRematchPayloadSchema>;

export const LobbySyncRequestPayloadSchema = z.object({
  requesterSlot: PlayerSlotSchema,
});
export type LobbySyncRequestPayload = z.infer<typeof LobbySyncRequestPayloadSchema>;

export const BilliardsWireEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('billiards:start'), payload: MatchStartSchema }),
  z.object({ type: z.literal('billiards:aim'), payload: AimSyncSchema }),
  z.object({ type: z.literal('billiards:shot'), payload: ShotParamsSchema }),
  z.object({ type: z.literal('billiards:place_cue'), payload: PlaceCueSchema }),
  z.object({ type: z.literal('billiards:settled'), payload: SettledStateSchema }),
  z.object({ type: z.literal('billiards:state_request'), payload: StateRequestSchema }),
  z.object({ type: z.literal('billiards:state_snapshot'), payload: MatchSnapshotSchema }),
  z.object({ type: z.literal('billiards:lobby_join'), payload: LobbyJoinPayloadSchema }),
  z.object({ type: z.literal('billiards:lobby_invite'), payload: LobbyInvitePayloadSchema }),
  z.object({ type: z.literal('billiards:lobby_config'), payload: LobbyConfigPayloadSchema }),
  z.object({ type: z.literal('billiards:lobby_ready'), payload: LobbyReadyPayloadSchema }),
  z.object({ type: z.literal('billiards:lobby_leave'), payload: LobbyLeavePayloadSchema }),
  z.object({ type: z.literal('billiards:lobby_rematch'), payload: LobbyRematchPayloadSchema }),
  z.object({ type: z.literal('billiards:lobby_sync_request'), payload: LobbySyncRequestPayloadSchema }),
  z.object({ type: z.literal('billiards:lobby_state'), payload: BilliardsLobbyStateSchema }),
]);
export type BilliardsWireEvent = z.infer<typeof BilliardsWireEventSchema>;

export interface BilliardsWireEnvelope {
  worldId: string;
  senderUserId: string;
  senderSessionId: string;
  event: BilliardsWireEvent;
}

export interface BilliardsTransportMeta {
  verifiedSenderSlot?: PlayerSlot;
}

export interface BilliardsMatchResult {
  matchId: string;
  edition?: BilliardsEdition;
  mode?: BilliardsPlayMode;
  rule: BilliardsRule;
  winnerSlot: PlayerSlot;
  reason: string;
  rackSeed: number;
  shots: ShotParams[];
  durationSeconds: number;
}

export interface BilliardsTransport {
  send: (event: BilliardsWireEvent) => void;
  subscribe: (
    handler: (event: BilliardsWireEvent, meta?: BilliardsTransportMeta) => void,
  ) => () => void;
  subscribeConnection?: (handler: (status: BilliardsConnectionStatus) => void) => () => void;
  getConnectionStatus?: () => BilliardsConnectionStatus;
  getServerClockOffsetMs?: () => number;
  getRttMs?: () => number | null;
}

export interface BilliardsWinTally {
  userId: string;
  wins: number;
}

export interface BilliardsMatchRecordInput {
  worldId: string;
  matchId: string;
  rule: BilliardsRule;
  rackSeed: number;
  winnerUserId: string;
  loserUserId: string | null;
  reason: string;
  shots: ShotParams[];
  durationSeconds: number;
}
