import { CABACOS_PLAYER_SPRITE } from '../donor/cabacos-79e423d/cabacosPlayerSprite';
import { PUNY_DONOR_GAMEPLAY_MANIFEST } from '../donor/punyCharacter8dSheet';
import {
  AVATAR_DIAGONAL_ALPHA_COMPOSITE_BANNED,
  AVATAR_GAMEPLAY_DONOR_ID,
  AVATAR_REFERENCE_DONOR_CABACOS_ID,
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
    id: 'avatar.walk.8dir',
    upstream: AVATAR_GAMEPLAY_DONOR_ID,
    sha: 'cc0-opengameart-puny-characters',
    paths: [
      '/assets/donor/cc0-puny-8d/character-base.png',
      '/assets/donor/cc0-puny-8d/soldier-blue.png',
      '/assets/donor/cc0-puny-8d/soldier-red.png',
    ],
    frames: {
      width: PUNY_DONOR_GAMEPLAY_MANIFEST.frameWidth,
      height: PUNY_DONOR_GAMEPLAY_MANIFEST.frameHeight,
      notes: '8-dir walk native; sit/lie = idle row; tool = slash row',
    },
    pivot: { x: 0.5, y: 0.88 },
    scale: 1,
    consumers: ['BootScene', 'ensurePhaserAvatarTexture', 'avatarPostureVisual'],
    license: 'CC0 1.0',
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
      notes: '4-way + flipX; not gameplay 8-dir',
    },
    pivot: { x: 0.5, y: 1 },
    scale: 1.5,
    consumers: ['vendor-donor-cabacos-characters', 'docs/UPSTREAM_REUSE.md'],
    license: 'MIT',
    role: 'reference',
  },
] as const;

export function olwAssetRegistryPolicy() {
  return { diagonalAlphaCompositeBanned: AVATAR_DIAGONAL_ALPHA_COMPOSITE_BANNED };
}