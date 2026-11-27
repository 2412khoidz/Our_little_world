import type { CatLodLevel } from './petCareActorTypes';

export type PetCareQualityPreset = 'low' | 'medium' | 'high';

export interface PetCareQualityConfig {
  preset: PetCareQualityPreset;
  labelVi: string;
  maxDpr: number;
  shadows: boolean;
  shadowMapSize: number;
  lod: CatLodLevel;
  dustMotes: number;
}

export const PET_CARE_QUALITY_CONFIG: Record<PetCareQualityPreset, PetCareQualityConfig> = {
  low: {
    preset: 'low',
    labelVi: 'Thấp',
    maxDpr: 1.0,
    shadows: false,
    shadowMapSize: 512,
    lod: 'lod1',
    dustMotes: 0,
  },
  medium: {
    preset: 'medium',
    labelVi: 'Vừa',
    maxDpr: 1.5,
    shadows: true,
    shadowMapSize: 512,
    lod: 'lod0',
    dustMotes: 14,
  },
  high: {
    preset: 'high',
    labelVi: 'Cao',
    maxDpr: 2.0,
    shadows: true,
    shadowMapSize: 1024,
    lod: 'lod0',
    dustMotes: 32,
  },
};

const QUALITY_STORAGE_KEY = 'olw:pet-care:quality-v1';

export function isValidQualityPreset(value: unknown): value is PetCareQualityPreset {
  return value === 'low' || value === 'medium' || value === 'high';
}

export function detectDefaultPetCareQuality(): PetCareQualityPreset {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(QUALITY_STORAGE_KEY) : null;
    if (isValidQualityPreset(saved)) return saved;
  } catch {
    // Ignore storage access restriction
  }
  if (typeof window !== 'undefined') {
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (coarse || window.innerWidth < 768) {
      return 'medium';
    }
  }
  return 'high';
}

export function savePetCareQuality(preset: PetCareQualityPreset): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUALITY_STORAGE_KEY, preset);
    }
  } catch {
    // Ignore storage write failure
  }
}
