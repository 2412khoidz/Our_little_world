import type {
  AimSyncPayload,
  Billiards3DQuality,
  BilliardsLobbyState,
  BilliardsMatchResult,
  BilliardsPlayMode,
  BilliardsRule,
  BotDifficulty,
  LobbyConfirmedConfig,
  MatchSnapshot,
  MatchStartPayload,
  PlaceCuePayload,
  PlayerSlot,
  SettledStatePayload,
  ShotParams,
  StateRequestPayload,
} from '../../../shared/billiards/types';
import type { useBilliardsSync } from './useBilliardsSync';

export interface BilliardsMatchSyncHandlers {
  onRemoteStart: (payload: MatchStartPayload, verifiedSenderSlot?: PlayerSlot) => void;
  onRemoteAim: (payload: AimSyncPayload, verifiedSenderSlot?: PlayerSlot) => void;
  onRemoteShot: (payload: ShotParams, verifiedSenderSlot?: PlayerSlot) => void;
  onRemotePlaceCue: (payload: PlaceCuePayload, verifiedSenderSlot?: PlayerSlot) => void;
  onRemoteSettled: (payload: SettledStatePayload, verifiedSenderSlot?: PlayerSlot) => void;
  onStateRequested: (payload: StateRequestPayload, verifiedSenderSlot?: PlayerSlot) => void;
  onRemoteSnapshot: (snapshot: MatchSnapshot, verifiedSenderSlot?: PlayerSlot) => void;
}

export interface BilliardsGameProps {
  mode: BilliardsPlayMode;
  initialRule: BilliardsRule;
  botDifficulty: BotDifficulty;
  quality3d?: Billiards3DQuality;
  playerNames: [string, string];
  localPlayerSlot: PlayerSlot;
  initialScores: [number, number];
  confirmedOnlineConfig?: LobbyConfirmedConfig | null;
  recoveredSnapshot?: MatchSnapshot | null;
  lobbyState?: BilliardsLobbyState | null;
  sync: ReturnType<typeof useBilliardsSync> | null;
  bindSyncHandlers: (handlers: BilliardsMatchSyncHandlers | null) => void;
  onExitToMenu: () => void;
  onClose: () => void;
  onMatchComplete: (result: BilliardsMatchResult) => void;
}
