import { z } from 'zod';
import type { AvatarConfig } from './types';

export const avatarConfigSchema = z.object({
  skinTone: z.enum(['fair', 'warm', 'tan']),
  hairStyle: z.enum(['short', 'bob', 'long']),
  hairColor: z.enum(['espresso', 'chestnut', 'honey', 'sakura']),
  outfitStyle: z.enum(['sweater', 'overall', 'cardigan']),
  outfitColor: z.enum(['rose', 'sage', 'cream', 'sky']),
  accessory: z.enum(['none', 'glasses', 'ribbon']),
});

export const DEFAULT_AVATAR_PARTNER_A: AvatarConfig = {
  skinTone: 'warm',
  hairStyle: 'short',
  hairColor: 'espresso',
  outfitStyle: 'sweater',
  outfitColor: 'sage',
  accessory: 'glasses',
};

export const DEFAULT_AVATAR_PARTNER_B: AvatarConfig = {
  skinTone: 'fair',
  hairStyle: 'long',
  hairColor: 'chestnut',
  outfitStyle: 'cardigan',
  outfitColor: 'rose',
  accessory: 'ribbon',
};

export const SKIN_TONE_OPTIONS: Array<{
  id: AvatarConfig['skinTone'];
  label: string;
  baseHex: string;
  shadeHex: string;
}> = [
  { id: 'fair', label: 'Sáng dịu', baseHex: '#ffe3d0', shadeHex: '#eec2a8' },
  { id: 'warm', label: 'Ấm tự nhiên', baseHex: '#f5caa8', shadeHex: '#db9f79' },
  { id: 'tan', label: 'Nắng mật ong', baseHex: '#ddaa80', shadeHex: '#ba8058' },
];

export const HAIR_STYLE_OPTIONS: Array<{
  id: AvatarConfig['hairStyle'];
  label: string;
}> = [
  { id: 'short', label: 'Tóc ngắn gọn' },
  { id: 'bob', label: 'Tóc bob' },
  { id: 'long', label: 'Tóc dài dịu dàng' },
];

export const HAIR_COLOR_OPTIONS: Array<{
  id: AvatarConfig['hairColor'];
  label: string;
  baseHex: string;
  shadeHex: string;
}> = [
  { id: 'espresso', label: 'Nâu đen', baseHex: '#43302b', shadeHex: '#2b1d19' },
  { id: 'chestnut', label: 'Nâu hạt dẻ', baseHex: '#7d4d3a', shadeHex: '#593224' },
  { id: 'honey', label: 'Vàng mật ong', baseHex: '#d7a257', shadeHex: '#a87433' },
  { id: 'sakura', label: 'Hồng anh đào', baseHex: '#ec9ab2', shadeHex: '#c66d88' },
];

export const OUTFIT_STYLE_OPTIONS: Array<{
  id: AvatarConfig['outfitStyle'];
  label: string;
}> = [
  { id: 'sweater', label: 'Áo len ấm' },
  { id: 'overall', label: 'Yếm làm vườn' },
  { id: 'cardigan', label: 'Áo khoác nhẹ' },
];

export const OUTFIT_COLOR_OPTIONS: Array<{
  id: AvatarConfig['outfitColor'];
  label: string;
  baseHex: string;
  shadeHex: string;
}> = [
  { id: 'rose', label: 'Hồng đất', baseHex: '#d97762', shadeHex: '#b05645' },
  { id: 'sage', label: 'Xanh lá xô thơm', baseHex: '#78aa79', shadeHex: '#538155' },
  { id: 'cream', label: 'Kem sữa', baseHex: '#f3e5cf', shadeHex: '#d4be9f' },
  { id: 'sky', label: 'Xanh mây nhạt', baseHex: '#7daecc', shadeHex: '#5584a3' },
];

export const ACCESSORY_OPTIONS: Array<{
  id: AvatarConfig['accessory'];
  label: string;
}> = [
  { id: 'none', label: 'Không có' },
  { id: 'glasses', label: 'Kính tròn' },
  { id: 'ribbon', label: 'Nơ nhỏ' },
];

export function parseAvatarConfig(input: unknown, fallback: AvatarConfig = DEFAULT_AVATAR_PARTNER_A): AvatarConfig {
  const parsed = avatarConfigSchema.safeParse(input);
  return parsed.success ? parsed.data : fallback;
}
