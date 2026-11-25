import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('extended world preview profile', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_OLW_PRIVATE_ART', false);
    vi.stubEnv('VITE_OLW_EXTENDED_WORLD', false);
    vi.stubGlobal('window', {
      location: { search: '' },
      localStorage: localStorage as Storage,
    });
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('enables village nav after reload when URL param persisted once', async () => {
    vi.stubGlobal('window', {
      location: { search: '?extended-world=1' },
      localStorage: localStorage as Storage,
    });
    const mod = await import('../../src/shared/worldIntegration/extendedWorldDevFlag');
    expect(mod.isExtendedWorldDevEnabled()).toBe(true);

    vi.stubGlobal('window', {
      location: { search: '' },
      localStorage: localStorage as Storage,
    });
    const maps = await import('../../src/shared/maps');
    expect(maps.isOutdoorMapUnlocked()).toBe(true);
  });

  it('defaults extended world on for private preview build flag', async () => {
    vi.stubEnv('VITE_OLW_PRIVATE_ART', true);
    vi.stubEnv('VITE_OLW_EXTENDED_WORLD', true);
    vi.stubGlobal('window', {
      location: { search: '' },
      localStorage: localStorage as Storage,
    });
    const maps = await import('../../src/shared/maps');
    expect(maps.isOutdoorMapUnlocked()).toBe(true);
  });

  it('respects explicit opt-out on private preview', async () => {
    vi.stubEnv('VITE_OLW_EXTENDED_WORLD', true);
    vi.stubGlobal('window', {
      location: { search: '' },
      localStorage: localStorage as Storage,
    });
    const mod = await import('../../src/shared/worldIntegration/extendedWorldDevFlag');
    const maps = await import('../../src/shared/maps');
    mod.setExtendedWorldDevPersistent(false);
    expect(mod.isExtendedWorldDevEnabled()).toBe(false);
    expect(maps.isOutdoorMapUnlocked()).toBe(false);
  });
});