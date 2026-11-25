import { describe, expect, it } from 'vitest';
import { parseDonorWorkshopFocus } from '../../src/shared/donor/donorWorkshopFocus';

describe('donorWorkshopFocus', () => {
  it('parses hollow section ids', () => {
    expect(parseDonorWorkshopFocus('bakery')).toBe('bakery');
    expect(parseDonorWorkshopFocus('coop')).toBe('coop');
    expect(parseDonorWorkshopFocus('mill')).toBe('mill');
    expect(parseDonorWorkshopFocus('invalid')).toBeUndefined();
  });
});