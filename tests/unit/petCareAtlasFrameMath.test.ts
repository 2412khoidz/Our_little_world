import { describe, expect, it } from 'vitest';
import {
  PET_CARE_CAT_SHEET_COLS,
  petCareCatFrameCrop,
  petCareCatSheetCols,
} from '../../src/shared/petLiving/petCare/petCareAtlasFrameMath';

describe('petCareAtlasFrameMath', () => {
  it('uses 12-column stride for Demo E cat-orange sheet (192×16)', () => {
    expect(petCareCatSheetCols(192, 16)).toBe(PET_CARE_CAT_SHEET_COLS);
  });

  it('places Idle_South frame 48 at origin row 4', () => {
    expect(petCareCatFrameCrop(48, 16, 16, 192)).toEqual({ x: 0, y: 64 });
  });

  it('wraps frame 49 to column 1 same row', () => {
    expect(petCareCatFrameCrop(49, 16, 16, 192)).toEqual({ x: 16, y: 64 });
  });
});