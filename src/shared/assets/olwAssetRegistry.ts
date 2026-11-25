import { CABACOS_PLAYER_SPRITE } from '../donor/cabacos-79e423d/cabacosPlayerSprite';
import { PYDEW_FARMER_GAMEPLAY_MANIFEST } from '../donor/pydewFarmerCharacterSheet';
import {
  AVATAR_DIAGONAL_ALPHA_COMPOSITE_BANNED,
  AVATAR_GAMEPLAY_DONOR_ID,
  AVATAR_REFERENCE_DONOR_CABACOS_ID,
  AVATAR_REFERENCE_DONOR_PUNY_ID,
} from './avatarGameplayPolicy';

export type OlwAssetRegistryRow = {
  id: string;
  upstream: string;
  sha: string;
  paths: string[];
  frames?: { width: number; height: number; notes?: string };
  pivot: { x: number; y: number };
  scale: number;
  consumers: string[];
  license: string;
  role: 'gameplay' | 'reference' | 'wardrobe';
};

export const OLW_ASSET_REGISTRY: readonly OlwAssetRegistryRow[] = [
  {
    id: 'avatar.walk.pydew-farmer',
    upstream: AVATAR_GAMEPLAY_DONOR_ID,
    sha: PYDEW_FARMER_GAMEPLAY_MANIFEST.upstreamSha,
    paths: [
      '/assets/donor/pydew-characters/farmer-may-atlas.png',
      '/assets/donor/pydew-characters/farmer-nang-atlas.png',
      '/assets/donor/pydew-characters/farmer-rose-atlas.png',
    ],
    frames: {
      width: PYDEW_FARMER_GAMEPLAY_MANIFEST.frameWidth,
      height: PYDEW_FARMER_GAMEPLAY_MANIFEST.frameHeight,
      notes: '4-way donor walk/idle/hoe/water; Facing8 → cardinal',
    },
    pivot: { x: 0.5, y: 0.88 },
    scale: 1,
    consumers: ['BootScene', 'ensurePhaserAvatarTexture', 'avatarPostureVisual'],
    license: 'CC0',
    role: 'gameplay',
  },
  {
    id: 'avatar.reference.cabacos-sunnyside',
    upstream: AVATAR_REFERENCE_DONOR_CABACOS_ID,
    sha: CABACOS_PLAYER_SPRITE.upstreamSha,
    paths: [
      `${CABACOS_PLAYER_SPRITE.assetBase}/base_waiting_strip9.png`,
      `${CABACOS_PLAYER_SPRITE.assetBase}/base_walk_strip8.png`,
    ],
    frames: {
      width: CABACOS_PLAYER_SPRITE.frameWidth,
      height: CABACOS_PLAYER_SPRITE.frameHeight,
      notes: '4-way + flipX; not gameplay',
    },
    pivot: { x: 0.5, y: 1 },
    scale: 1.5,
    consumers: ['vendor-donor-cabacos-characters', 'docs/UPSTREAM_REUSE.md'],
    license: 'MIT',
    role: 'reference',
  },
  {
    id: 'avatar.reference.puny-cc0',
    upstream: AVATAR_REFERENCE_DONOR_PUNY_ID,
    sha: 'opengameart-puny-characters',
    paths: ['/assets/donor/cc0-puny-8d/character-base.png'],
    frames: { width: 32, height: 32, notes: 'Rejected for cozy aesthetic — reference only' },
    pivot: { x: 0.5, y: 0.88 },
    scale: 1,
    consumers: ['docs/UPSTREAM_REUSE.md'],
    license: 'CC0',
    role: 'reference',
  },
] as const;

export function olwAssetRegistryPolicy() {
  return { diagonalAlphaCompositeBanned: AVATAR_DIAGONAL_ALPHA_COMPOSITE_BANNED };
}