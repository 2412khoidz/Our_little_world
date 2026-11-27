import type { CoupleAnimationPhase } from './coupleStateMachine';
import type { Direction, MapId } from '../types';
import type { EnvInteractionHookKind } from '../world/envInteractionHooks';

export type CoupleEmoteId = 'heart' | 'wave' | 'sleepy' | 'cheer' | 'miss_you';
export type CoupleInteractionKind =
  | 'hold_hands'
  | 'hug'
  | 'kiss'
  | 'lean_shoulder'
  | 'dance'
  | 'give_flower';
export type CouplePostureKind =
  | 'none'
  | 'sit_study'
  | 'sit_sofa'
  | 'sit_bench'
  | 'lie_bed'
  | CoupleInteractionKind;

export type CoupleP0InteractionKind = 'hold_hands' | 'hug';
export const COUPLE_P1_ENABLED = false;

export interface CoupleInteractionOption {
  id: CoupleInteractionKind;
  tier: 'p0' | 'p1';
  symbol: string;
  labelVi: string;
  shortExitVi: string;
  invitePromptVi: string;
  acceptBtnVi: string;
  activeStatusVi: string;
  acceptedToastVi: string;
  spacingPx: number;
  facePartner: boolean;
  emoteSymbol: CoupleEmoteId | 'hug_hearts';
}

export const COUPLE_INTERACTION_OPTIONS: readonly CoupleInteractionOption[] = [
  {
    id: 'hold_hands',
    tier: 'p0',
    symbol: '🤝',
    labelVi: 'Nắm tay',
    shortExitVi: 'Buông tay',
    invitePromptVi: 'mời nắm tay cùng đi',
    acceptBtnVi: 'Nắm tay nhé',
    activeStatusVi: 'Đang nắm tay',
    acceptedToastVi: 'Hai bạn đang nắm tay nhau đi dạo 💛',
    spacingPx: 12,
    facePartner: false,
    emoteSymbol: 'heart',
  },
  {
    id: 'hug',
    tier: 'p0',
    symbol: '🫂',
    labelVi: 'Ôm nhau',
    shortExitVi: 'Buông ôm',
    invitePromptVi: 'mời ôm nhau',
    acceptBtnVi: 'Ôm lại ngay',
    activeStatusVi: 'Đang ôm nhau',
    acceptedToastVi: 'Hai bạn đang ôm nhau thật ấm áp ❤️',
    spacingPx: 9,
    facePartner: true,
    emoteSymbol: 'hug_hearts',
  },
  {
    id: 'kiss',
    tier: 'p1',
    symbol: '💋',
    labelVi: 'Hôn',
    shortExitVi: 'Tách ra',
    invitePromptVi: 'gửi một cái hôn nhẹ',
    acceptBtnVi: 'Hôn lại nè',
    activeStatusVi: 'Đang trao nụ hôn',
    acceptedToastVi: 'Một nụ hôn thật dịu dàng 💕',
    spacingPx: 8,
    facePartner: true,
    emoteSymbol: 'hug_hearts',
  },
  {
    id: 'lean_shoulder',
    tier: 'p1',
    symbol: '💞',
    labelVi: 'Tựa vai',
    shortExitVi: 'Đứng dậy',
    invitePromptVi: 'mời tựa vào vai nhau',
    acceptBtnVi: 'Tựa vai nhé',
    activeStatusVi: 'Đang tựa vai nhau',
    acceptedToastVi: 'Cùng tựa vai bình yên bên nhau ✨',
    spacingPx: 9,
    facePartner: false,
    emoteSymbol: 'heart',
  },
  {
    id: 'dance',
    tier: 'p1',
    symbol: '💃',
    labelVi: 'Khiêu vũ',
    shortExitVi: 'Dừng nhảy',
    invitePromptVi: 'mời khiêu vũ cùng nhau',
    acceptBtnVi: 'Cùng nhảy nhé',
    activeStatusVi: 'Đang khiêu vũ',
    acceptedToastVi: 'Hai bạn đang khiêu vũ thật nhịp nhàng 🎶',
    spacingPx: 11,
    facePartner: true,
    emoteSymbol: 'cheer',
  },
  {
    id: 'give_flower',
    tier: 'p1',
    symbol: '🌸',
    labelVi: 'Tặng hoa',
    shortExitVi: 'Cất hoa',
    invitePromptVi: 'muốn tặng một bông hoa',
    acceptBtnVi: 'Nhận hoa nhé',
    activeStatusVi: 'Đang tặng hoa',
    acceptedToastVi: 'Gửi tặng một đóa hoa tươi 🌸',
    spacingPx: 12,
    facePartner: true,
    emoteSymbol: 'heart',
  },
] as const;

export const COUPLE_ACTIVE_INTERACTION_OPTIONS = COUPLE_INTERACTION_OPTIONS.filter(
  (opt) => opt.tier === 'p0' || COUPLE_P1_ENABLED,
);

export function isPairedCouplePosture(posture: CouplePostureKind): posture is CoupleInteractionKind {
  return (
    posture === 'hold_hands' ||
    posture === 'hug' ||
    posture === 'kiss' ||
    posture === 'lean_shoulder' ||
    posture === 'dance' ||
    posture === 'give_flower'
  );
}

export interface CoupleEmoteOption {
  id: CoupleEmoteId;
  symbol: string;
  labelVi: string;
}

export const COUPLE_EMOTES: readonly CoupleEmoteOption[] = [
  { id: 'heart', symbol: '❤️', labelVi: 'Thả tim' },
  { id: 'wave', symbol: '👋', labelVi: 'Vẫy tay' },
  { id: 'sleepy', symbol: '😴', labelVi: 'Buồn ngủ' },
  { id: 'cheer', symbol: '✨', labelVi: 'Cổ vũ' },
  { id: 'miss_you', symbol: '💭', labelVi: 'Nhớ bạn' },
] as const;

export interface CoupleInvitePayload {
  type: 'COUPLE_INVITE';
  inviteId: string;
  kind: CoupleInteractionKind;
  worldId: string;
  fromUserId: string;
  fromSessionId: string;
  toUserId: string;
  mapId: MapId;
  anchorX: number;
  anchorY: number;
  createdAtMs: number;
  expiresAtMs: number;
  ttlMs?: number;
}

export interface CoupleAcceptPayload {
  type: 'COUPLE_ACCEPT';
  inviteId: string;
  kind?: CoupleInteractionKind;
  worldId: string;
  fromUserId: string;
  toUserId: string;
  mapId: MapId;
  anchorX: number;
  anchorY: number;
  acceptedAtMs: number;
  phaseStartedAtMs?: number;
}

export interface CoupleDeclinePayload {
  type: 'COUPLE_DECLINE';
  inviteId: string;
  worldId: string;
  fromUserId: string;
  toUserId: string;
}

export interface CoupleEndPayload {
  type: 'COUPLE_END';
  worldId: string;
  userId: string;
  reason: 'moved' | 'changed_map' | 'cancelled';
}

export interface CoupleEmotePayload {
  type: 'COUPLE_EMOTE';
  worldId: string;
  userId: string;
  mapId: MapId;
  emote: CoupleEmoteId;
  sentAtMs: number;
}

export interface CouplePosturePayload {
  type: 'COUPLE_POSTURE';
  worldId: string;
  userId: string;
  mapId: MapId;
  posture: CouplePostureKind;
  slotIndex: number;
  x: number;
  y: number;
  facing: Direction;
  phase?: CoupleAnimationPhase;
  phaseStartedAtMs?: number;
  partnerUserId?: string;
  anchorX?: number;
  anchorY?: number;
}

export interface CoupleHomeBowlPayload {
  type: 'COUPLE_HOME_BOWL';
  worldId: string;
  userId: string;
  foodEmpty: boolean;
  foodFull: boolean;
  waterEmpty: boolean;
  waterFull: boolean;
  atMs: number;
}

export interface CoupleEnvTransitionPayload {
  type: 'COUPLE_ENV_TRANSITION';
  worldId: string;
  userId: string;
  mapId: MapId;
  kind: EnvInteractionHookKind;
  hookId: string;
  toMapId: MapId;
  atMs: number;
}

export interface CoupleScrapbookPayload {
  type: 'COUPLE_SCRAPBOOK';
  worldId: string;
  userId: string;
  atMs: number;
  action: 'flip' | 'sticker';
  pageIndex?: number;
  pageId?: string;
  stickerEmoji?: string;
  xPct?: number;
  yPct?: number;
}

export type CoupleEventPacket =
  | CoupleInvitePayload
  | CoupleAcceptPayload
  | CoupleDeclinePayload
  | CoupleEndPayload
  | CoupleEmotePayload
  | CouplePosturePayload
  | CoupleEnvTransitionPayload
  | CoupleHomeBowlPayload
  | CoupleScrapbookPayload;

export interface PhotoFramePreset {
  id: string;
  titleVi: string;
  captionVi: string;
  skyHex: string;
  accentHex: string;
  dateLabel: string;
}

export const STATIC_PHOTO_PRESETS: readonly PhotoFramePreset[] = [
  {
    id: 'sunset-porch',
    titleVi: 'Buổi chiều trước hiên nhà',
    captionVi: 'Ngày đầu tiên chuyển về căn nhà nhỏ ngập hoa anh đào.',
    skyHex: '#f6b39b',
    accentHex: '#ffd7b5',
    dateLabel: 'Kỷ niệm #1',
  },
  {
    id: 'sakura-picnic',
    titleVi: 'Dã ngoại dưới tán anh đào',
    captionVi: 'Miếng bánh dâu và hai tách trà ấm giữa khu vườn yên bình.',
    skyHex: '#f3b7c8',
    accentHex: '#fff0e6',
    dateLabel: 'Kỷ niệm #2',
  },
  {
    id: 'rainy-study',
    titleVi: 'Buổi tối học bài cùng nhau',
    captionVi: 'Không cần nói nhiều, chỉ cần biết người kia vẫn ở bàn bên cạnh.',
    skyHex: '#7d8db5',
    accentHex: '#ffe39c',
    dateLabel: 'Kỷ niệm #3',
  },
  {
    id: 'cat-nap',
    titleVi: 'Giấc ngủ trưa cùng bé Quýt',
    captionVi: 'Cả nhà đều bình yên bên ánh lửa ấm.',
    skyHex: '#d99679',
    accentHex: '#ffd8a8',
    dateLabel: 'Kỷ niệm #4',
  },
] as const;
