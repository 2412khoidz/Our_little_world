import { describe, expect, it } from 'vitest';
import {
  DECORATE_MAP_IDS,
  defaultDecorateMapId,
  isDecorateMapId,
} from '../../src/shared/decorate/decorateInteriorPolicy';

describe('decorateInteriorPolicy', () => {
  it('limits decorate to home and garden', () => {
    expect(DECORATE_MAP_IDS).toEqual(['home', 'garden']);
    expect(isDecorateMapId('home')).toBe(true);
    expect(isDecorateMapId('village')).toBe(false);
    expect(isDecorateMapId('beach')).toBe(false);
  });

  it('defaults overworld maps to home for decorate entry', () => {
    expect(defaultDecorateMapId('beach')).toBe('home');
    expect(defaultDecorateMapId('garden')).toBe('garden');
  });
});