import type { Direction, MapId } from '../types';

export type CoupleEmoteId = 'heart' | 'wave' | 'sleepy' | 'cheer' | 'miss_you';
export type CouplePostureKind = 'none' | 'sit_study' | 'sit_sofa' | 'sit_bench' | 'lie_bed' | 'hug';

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
  kind: 'hug';
  worldId: string;
  fromUserId: string;
  fromSessionId: string;
  toUserId: string;
  mapId: MapId;
  anchorX: number;
  anchorY: number;
  createdAtMs: number;
  expiresAtMs: number;
}

export interface CoupleAcceptPayload {
  type: 'COUPLE_ACCEPT';
  inviteId: string;
  worldId: string;
  fromUserId: string;
  toUserId: string;
  mapId: MapId;
  anchorX: number;
  anchorY: number;
  acceptedAtMs: number;
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
}

export type CoupleEventPacket =
  | CoupleInvitePayload
  | CoupleAcceptPayload
  | CoupleDeclinePayload
  | CoupleEndPayload
  | CoupleEmotePayload
  | CouplePosturePayload;

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
