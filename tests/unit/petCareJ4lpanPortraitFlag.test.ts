import { describe, expect, it, vi, afterEach } from 'vitest';

describe('petCareJ4lpanPortraitFlag', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults off — living Frakassets body is default close-up', async () => {
    vi.resetModules();
    const { petCareJ4lpanPortraitEnabled } = await import(
      '../../src/shared/petLiving/petCare/petCareJ4lpanPortraitFlag'
    );
    expect(petCareJ4lpanPortraitEnabled()).toBe(false);
  });
});