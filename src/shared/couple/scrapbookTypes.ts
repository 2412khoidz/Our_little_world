import { STATIC_PHOTO_PRESETS } from './coupleTypes';

export const SCRAPBOOK_STICKERS = ['❤️', '🌸', '🐱', '✨', '📎', '🦋', '☕', '🌙'] as const;
export type ScrapbookStickerEmoji = (typeof SCRAPBOOK_STICKERS)[number];

export const SCRAPBOOK_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export interface ScrapbookSticker {
  readonly id: string;
  readonly emoji: ScrapbookStickerEmoji | string;
  readonly xPct: number;
  readonly yPct: number;
  readonly placedByUserId: string;
  readonly placedAtMs: number;
}

export interface ScrapbookPage {
  readonly id: string;
  readonly kind: 'preset' | 'upload';
  readonly titleVi: string;
  readonly captionVi: string;
  readonly skyHex?: string;
  readonly accentHex?: string;
  readonly dateLabel?: string;
  readonly imageDataUrl?: string;
  readonly stickers: readonly ScrapbookSticker[];
}

export interface ScrapbookAlbumState {
  readonly pages: readonly ScrapbookPage[];
  readonly openPageIndex: number;
}

export function seedScrapbookPagesFromPresets(): ScrapbookPage[] {
  return STATIC_PHOTO_PRESETS.map((p) => ({
    id: p.id,
    kind: 'preset' as const,
    titleVi: p.titleVi,
    captionVi: p.captionVi,
    skyHex: p.skyHex,
    accentHex: p.accentHex,
    dateLabel: p.dateLabel,
    stickers: [],
  }));
}