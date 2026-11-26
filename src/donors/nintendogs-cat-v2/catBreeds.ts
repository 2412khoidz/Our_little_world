// Adapted from SawyerHood/nintendogs-threejs@43d231c:src/dog/breeds.ts
// Authentic domestic cat proportions & coat definitions mapped 1:1 to OLW CatCoatVariantId.
import type { CatCoatVariantId } from '../../shared/petLiving/petVisualTypes';
import type { V3 } from './sdf';

export type CatEarType = 'pointy' | 'rounded' | 'tufted';
export type CatTailType = 'curled' | 'plume' | 'bob';

export interface CatEarDef {
  type: CatEarType;
  L: number;
  W: number;
  T: number;
  pos: V3;
  splay: number;
  lean: number;
}

export interface CatTailDef {
  type: CatTailType;
  L: number;
  T: number;
  carry: number;
  curl: number;
  side: number;
}

export interface CatShapeDef {
  H: number;
  BL: number;
  CD: number;
  CW: number;
  HW: number;
  tuck: number;
  belly: number;
  legT: number;
  pawR: number;
  neckL: number;
  neckT: number;
  hs: number;
  skull: V3;
  muzzle: V3;
  muzzleDrop: number;
  stop: number;
  flews: number;
  nose: number;
  cheek: number;
  eyeR: number;
  eyeX: number;
  eyeY: number;
  eyeZ: number;
  eyeOut: number;
  eyeSink: number;
  ear: CatEarDef;
  tail: CatTailDef;
}

export interface CatFurDef {
  len: number;
  density: number;
  shells: number;
  comb: number;
  gravity: number;
  clump: number;
  regions: Partial<Record<string, number>>;
}

export interface CatCoatDef {
  id: CatCoatVariantId;
  name: string;
  pattern: 'tabby' | 'cream-point' | 'calico';
  colors: Record<string, string>;
  eye: string;
  nose: string;
  pad: string;
}

export interface CatBreed {
  id: CatCoatVariantId;
  name: string;
  shape: CatShapeDef;
  fur: CatFurDef;
  coat: CatCoatDef;
}

const FELINE_SHORTHAIR_SHAPE: CatShapeDef = {
  H: 0.255,
  BL: 0.34,
  CD: 0.128,
  CW: 0.122,
  HW: 0.126,
  tuck: 0.22,
  belly: 1.04,
  legT: 0.88,
  pawR: 0.022,
  neckL: 0.68,
  neckT: 0.84,
  hs: 1.05,
  // Round, wide feline skull with petite short muzzle and plump whisker pads
  skull: [0.098, 0.088, 0.084],
  muzzle: [0.032, 0.021, 0.017],
  muzzleDrop: 0.008,
  stop: 0.55,
  flews: 0.3,
  nose: 0.58,
  cheek: 1.12,
  // Large expressive almond-round cat eyes
  eyeR: 0.0155,
  eyeX: 0.023,
  eyeY: 0.024,
  eyeZ: 0.068,
  eyeOut: 0.16,
  eyeSink: 0.72,
  // High-set triangular cat ears
  ear: { type: 'pointy', L: 0.056, W: 0.044, T: 0.005, pos: [0.031, 0.055, 0.028], splay: 0.28, lean: 0.08 },
  // Long supple 5-bone cat tail held in a gentle curve
  tail: { type: 'curled', L: 0.24, T: 0.0155, carry: 0.42, curl: 0.65, side: 0.06 },
};

const FELINE_CHUBBY_SHAPE: CatShapeDef = {
  ...FELINE_SHORTHAIR_SHAPE,
  CW: 0.136,
  HW: 0.138,
  belly: 1.16,
  skull: [0.105, 0.092, 0.086],
  ear: { ...FELINE_SHORTHAIR_SHAPE.ear, type: 'rounded', L: 0.049, W: 0.044 },
  tail: { type: 'plume', L: 0.22, T: 0.019, carry: 0.35, curl: 0.55, side: 0.05 },
};

const FELINE_FUR_BASE: CatFurDef = {
  len: 0.0085,
  density: 920,
  shells: 8,
  comb: 0.65,
  gravity: 0.08,
  clump: 0.16,
  regions: {
    nose: 0,
    lip: 0.2,
    muzzle: 0.35,
    chin: 0.42,
    cheek: 0.88,
    ear: 0.4,
    neck: 0.95,
    chest: 1.05,
    back: 0.95,
    belly: 0.85,
    tail: 1.25,
    paw: 0.36,
  },
};

export const CAT_BREEDS: Record<CatCoatVariantId, CatBreed> = {
  'ginger-tabby': {
    id: 'ginger-tabby',
    name: 'Quýt (Mèo mướp cam)',
    shape: FELINE_SHORTHAIR_SHAPE,
    fur: FELINE_FUR_BASE,
    coat: {
      id: 'ginger-tabby',
      name: 'Mướp Cam Marmalade',
      pattern: 'tabby',
      colors: {
        base: '#e88b3d',
        light: '#f7c183',
        dark: '#b44d19',
        cream: '#fff2de',
        earInner: '#f4a8b3',
      },
      eye: '#e59a24',
      nose: '#f08b94',
      pad: '#f2a1aa',
    },
  },
  'cream-puff': {
    id: 'cream-puff',
    name: 'Mochi (Mèo trắng kem)',
    shape: FELINE_CHUBBY_SHAPE,
    fur: { ...FELINE_FUR_BASE, len: 0.0105, regions: { ...FELINE_FUR_BASE.regions, tail: 1.4, cheek: 0.96 } },
    coat: {
      id: 'cream-puff',
      name: 'Kem Mật Ong',
      pattern: 'cream-point',
      colors: {
        base: '#fcf4e8',
        light: '#ffffff',
        dark: '#dfbc94',
        cream: '#fffaf3',
        earInner: '#f5b2bc',
      },
      eye: '#72a8cf',
      nose: '#f29ea9',
      pad: '#f4adb6',
    },
  },
  'calico-patch': {
    id: 'calico-patch',
    name: 'Bông (Mèo tam thể)',
    shape: {
      ...FELINE_SHORTHAIR_SHAPE,
      ear: { ...FELINE_SHORTHAIR_SHAPE.ear, type: 'tufted' },
    },
    fur: FELINE_FUR_BASE,
    coat: {
      id: 'calico-patch',
      name: 'Tam Thể Ấm Áp',
      pattern: 'calico',
      colors: {
        base: '#fbf7f0',
        light: '#ffffff',
        dark: '#ded3c8',
        ginger: '#e9893d',
        cocoa: '#4c342b',
        earInner: '#f3a6b2',
      },
      eye: '#78aa4e',
      nose: '#f0919c',
      pad: '#f0a6af',
    },
  },
};

export function getCatBreed(variant: CatCoatVariantId): CatBreed {
  return CAT_BREEDS[variant] ?? CAT_BREEDS['ginger-tabby'];
}
