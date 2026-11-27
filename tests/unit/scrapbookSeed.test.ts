import { describe, expect, it } from 'vitest';
import { STATIC_PHOTO_PRESETS } from '../../src/shared/couple/coupleTypes';
import { seedScrapbookPagesFromPresets } from '../../src/shared/couple/scrapbookTypes';
import { loadScrapbookAlbum } from '../../src/features/couple/scrapbookAlbumStorage';

describe('scrapbook album seed', () => {
  it('maps every static preset into flip pages (no carousel)', () => {
    const pages = seedScrapbookPagesFromPresets();
    expect(pages).toHaveLength(STATIC_PHOTO_PRESETS.length);
    expect(pages.map((p) => p.id)).toEqual(STATIC_PHOTO_PRESETS.map((p) => p.id));
    expect(pages.every((p) => p.kind === 'preset')).toBe(true);
  });

  it('loads default album without world id', () => {
    const state = loadScrapbookAlbum(null);
    expect(state.openPageIndex).toBe(0);
    expect(state.pages.length).toBeGreaterThan(0);
  });
});