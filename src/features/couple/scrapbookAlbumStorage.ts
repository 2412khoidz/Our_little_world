import type { CoupleScrapbookPayload } from '../../shared/couple/coupleTypes';
import type { ScrapbookAlbumState, ScrapbookPage } from '../../shared/couple/scrapbookTypes';
import { seedScrapbookPagesFromPresets } from '../../shared/couple/scrapbookTypes';

const STORAGE_PREFIX = 'olw_scrapbook_v1';

function storageKey(worldId: string): string {
  return `${STORAGE_PREFIX}:${worldId}`;
}

export function loadScrapbookAlbum(worldId: string | null): ScrapbookAlbumState {
  const pages = seedScrapbookPagesFromPresets();
  if (!worldId) {
    return { pages, openPageIndex: 0 };
  }
  try {
    const raw = localStorage.getItem(storageKey(worldId));
    if (!raw) return { pages, openPageIndex: 0 };
    const parsed = JSON.parse(raw) as { pages?: ScrapbookPage[]; openPageIndex?: number };
    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      return { pages, openPageIndex: 0 };
    }
    const merged = mergePresetPages(pages, parsed.pages);
    return {
      pages: merged,
      openPageIndex: Math.min(Math.max(0, parsed.openPageIndex ?? 0), merged.length - 1),
    };
  } catch {
    return { pages, openPageIndex: 0 };
  }
}

function mergePresetPages(seed: ScrapbookPage[], saved: ScrapbookPage[]): ScrapbookPage[] {
  const uploads = saved.filter((p) => p.kind === 'upload');
  const stickerById = new Map(saved.map((p) => [p.id, p.stickers] as const));
  const seeded = seed.map((p) => ({
    ...p,
    stickers: stickerById.get(p.id) ?? p.stickers,
  }));
  return [...seeded, ...uploads];
}

export function saveScrapbookAlbum(worldId: string | null, state: ScrapbookAlbumState): void {
  if (!worldId) return;
  try {
    localStorage.setItem(
      storageKey(worldId),
      JSON.stringify({ pages: state.pages, openPageIndex: state.openPageIndex }),
    );
  } catch {
    /* quota — caller may toast */
  }
}

export function applyRemoteStickerToStoredAlbum(
  worldId: string,
  packet: CoupleScrapbookPayload,
): ScrapbookAlbumState {
  if (packet.action !== 'sticker' || !packet.pageId || !packet.stickerEmoji) {
    return loadScrapbookAlbum(worldId);
  }
  const base = loadScrapbookAlbum(worldId);
  const next: ScrapbookAlbumState = {
    ...base,
    pages: base.pages.map((p) => {
      if (p.id !== packet.pageId) return p;
      const sticker = {
        id: `stk-remote-${packet.userId}-${packet.atMs}`,
        emoji: packet.stickerEmoji ?? '❤️',
        xPct: packet.xPct ?? 50,
        yPct: packet.yPct ?? 50,
        placedByUserId: packet.userId,
        placedAtMs: packet.atMs,
      };
      if (p.stickers.some((s) => s.id === sticker.id)) return p;
      return { ...p, stickers: [...p.stickers, sticker] };
    }),
  };
  saveScrapbookAlbum(worldId, next);
  return next;
}