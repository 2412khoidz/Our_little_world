import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('extended world preview profile', () => {
  beforeEach(() => {
    const mockStorage: Storage & { store: Record<string, string> } = {
      store: {},
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
      get length() {
        return Object.keys(this.store).length;
      },
      key(index: number) {
        return Object.keys(this.store)[index] ?? null;
      },
    };
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_OLW_PRIVATE_ART', 'false');
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

  it('defaults extended world ON even when private preview flag is false', async () => {
    const mod = await import('../../src/shared/worldIntegration/extendedWorldDevFlag');
    const maps = await import('../../src/shared/maps');
    expect(mod.isExtendedWorldDevEnabled()).toBe(true);
    expect(maps.isOutdoorMapUnlocked()).toBe(true);
  });

  it('respects explicit DEV opt-out on preview lab via storage or ?extended-world=0', async () => {
    vi.stubEnv('VITE_OLW_EXTENDED_WORLD', 'true');
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

  it('ignores stale localStorage opt-out on preview gameplay (non-DEV)', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_OLW_EXTENDED_WORLD', 'true');
    vi.stubGlobal('window', {
      location: { search: '' },
      localStorage: localStorage as Storage,
    });
    const mod = await import('../../src/shared/worldIntegration/extendedWorldDevFlag');
    const maps = await import('../../src/shared/maps');
    mod.setExtendedWorldDevPersistent(false);
    expect(mod.isExtendedWorldDevEnabled()).toBe(true);
    expect(maps.isOutdoorMapUnlocked()).toBe(true);
  });
});