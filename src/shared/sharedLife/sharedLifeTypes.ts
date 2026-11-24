export type SharedLifeVisibility = 'shared' | 'private';

export interface JournalEntryRecord {
  id: string;
  worldId: string;
  authorId: string;
  visibility: SharedLifeVisibility;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItemRecord {
  id: string;
  worldId: string;
  createdBy: string;
  category: 'buy' | 'visit' | 'activity';
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface CalendarDateRecord {
  id: string;
  worldId: string;
  createdBy: string;
  title: string;
  dateIso: string; // YYYY-MM-DD in Asia/Ho_Chi_Minh context
  timeHhMm: string;
  note: string;
  isAnniversary: boolean;
}

export interface AlbumPhotoRecord {
  id: string;
  worldId: string;
  uploadedBy: string;
  titleVi: string;
  captionVi: string;
  skyHex: string;
  accentHex: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'preset';
  byteSize: number;
  createdAt: string;
}

export interface SharedLifeSnapshot {
  worldId: string;
  journal: JournalEntryRecord[];
  wishlist: WishlistItemRecord[];
  calendar: CalendarDateRecord[];
  album: AlbumPhotoRecord[];
  activeWallPhotoId: string;
  serverNowMs: number;
}

export const ALBUM_MAX_BYTES = 5 * 1024 * 1024;
export const ALBUM_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function validateAlbumUploadMetadata(mimeType: string, byteSize: number): { ok: true } | { ok: false; messageVi: string } {
  if (!ALBUM_ALLOWED_MIME.includes(mimeType as (typeof ALBUM_ALLOWED_MIME)[number])) {
    return { ok: false, messageVi: 'Chỉ hỗ trợ ảnh PNG, JPG hoặc WebP.' };
  }
  if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > ALBUM_MAX_BYTES) {
    return { ok: false, messageVi: 'Dung lượng ảnh tối đa là 5 MB.' };
  }
  return { ok: true };
}

export function daysUntilHcmDate(dateIso: string, nowMs: number): number {
  const targetMs = Date.parse(`${dateIso}T00:00:00+07:00`);
  if (!Number.isFinite(targetMs)) return 0;
  // Format today's date in Asia/Ho_Chi_Minh (+07:00) cleanly
  const hcmNowMs = nowMs + 7 * 3600 * 1000;
  const hcmTodayStr = new Date(hcmNowMs).toISOString().slice(0, 10);
  const todayMs = Date.parse(`${hcmTodayStr}T00:00:00+07:00`);
  return Math.round((targetMs - todayMs) / (24 * 3600 * 1000));
}
