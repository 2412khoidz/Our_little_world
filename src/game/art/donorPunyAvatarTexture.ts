import type Phaser from 'phaser';
import {
  DEFAULT_AVATAR_PARTNER_A,
  DEFAULT_AVATAR_PARTNER_B,
  avatarConfigsEqual,
} from '../../shared/avatar';
import type { AvatarConfig, Direction } from '../../shared/types';
import { DIAGONAL_FACINGS, type Facing8 } from '../../shared/movement/facing8';
import {
  PUNY_CARDINAL_DIR,
  PUNY_FACING8_ORDER,
  PUNY_SHEET,
  punyDirForFacing8,
  punyFrameIndex,
} from '../../shared/donor/punyCharacter8dSheet';
import { avatarWalkAnimKey } from './avatarAtlasLayout';
import { getIdleFrameIndex } from './avatarSpriteBuilder';

export const DONOR_PUNY_TEXTURE_IDS = {
  base: 'donor-puny-character-base',
  soldierBlue: 'donor-puny-soldier-blue',
  soldierRed: 'donor-puny-soldier-red',
} as const;

export type DonorPunyTextureId = (typeof DONOR_PUNY_TEXTURE_IDS)[keyof typeof DONOR_PUNY_TEXTURE_IDS];

const LEGACY_DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];

const registeredTextures = new Set<string>();

export function isDonorPunyAvatarTexture(textureKey: string): boolean {
  return (Object.values(DONOR_PUNY_TEXTURE_IDS) as string[]).includes(textureKey);
}

/** Mây (partner A) · Nắng (partner B) — stable Puny rig pairing for 2P recognition. */
export const MAY_GAMEPLAY_PUNY_TEXTURE = DONOR_PUNY_TEXTURE_IDS.soldierBlue;
export const NANG_GAMEPLAY_PUNY_TEXTURE = DONOR_PUNY_TEXTURE_IDS.soldierRed;

export function donorPunyTextureForConfig(config: AvatarConfig): DonorPunyTextureId {
  if (avatarConfigsEqual(config, DEFAULT_AVATAR_PARTNER_B)) {
    return NANG_GAMEPLAY_PUNY_TEXTURE;
  }
  if (avatarConfigsEqual(config, DEFAULT_AVATAR_PARTNER_A)) {
    return MAY_GAMEPLAY_PUNY_TEXTURE;
  }
  if (config.outfitColor === 'rose' || config.hairColor === 'sakura') {
    return DONOR_PUNY_TEXTURE_IDS.soldierRed;
  }
  if (config.outfitColor === 'sky' || config.outfitStyle === 'overall') {
    return DONOR_PUNY_TEXTURE_IDS.soldierBlue;
  }
  return DONOR_PUNY_TEXTURE_IDS.base;
}

function frameTriplet(textureKey: string, row: number, dir: number): Phaser.Types.Animations.AnimationFrame[] {
  return [0, 1, 2].map((frame) => ({
    key: textureKey,
    frame: punyFrameIndex(row, dir, frame),
  }));
}

export function registerDonorPunyAvatarAnims(scene: Phaser.Scene, textureKey: string): void {
  if (registeredTextures.has(textureKey)) return;
  if (!scene.textures.exists(textureKey)) return;
  registeredTextures.add(textureKey);

  const { rows } = PUNY_SHEET;

  for (const facing of PUNY_FACING8_ORDER) {
    const dir = punyDirForFacing8(facing);
    const walkKey = avatarWalkAnimKey(textureKey, facing);
    if (!scene.anims.exists(walkKey)) {
      scene.anims.create({
        key: walkKey,
        frames: frameTriplet(textureKey, rows.walk, dir),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  for (const direction of LEGACY_DIRECTIONS) {
    const dir = PUNY_CARDINAL_DIR[direction];
    const walkKey = `${textureKey}:walk-${direction}`;
    if (!scene.anims.exists(walkKey)) {
      scene.anims.create({
        key: walkKey,
        frames: frameTriplet(textureKey, rows.walk, dir),
        frameRate: 10,
        repeat: -1,
      });
    }

    const sitKey = `${textureKey}:sit-${direction}`;
    if (!scene.anims.exists(sitKey)) {
      scene.anims.create({
        key: sitKey,
        frames: frameTriplet(textureKey, rows.idle, dir),
        frameRate: 4,
        repeat: -1,
      });
    }

    const lieKey = `${textureKey}:lie-${direction}`;
    if (!scene.anims.exists(lieKey)) {
      scene.anims.create({
        key: lieKey,
        frames: frameTriplet(textureKey, rows.idle, dir),
        frameRate: 3,
        repeat: -1,
      });
    }

    const toolKey = `${textureKey}:tool-${direction}`;
    if (!scene.anims.exists(toolKey)) {
      scene.anims.create({
        key: toolKey,
        frames: frameTriplet(textureKey, rows.slash, dir),
        frameRate: 12,
        repeat: 0,
      });
    }

    const runKey = `${textureKey}:run-${direction}`;
    if (!scene.anims.exists(runKey)) {
      scene.anims.create({
        key: runKey,
        frames: frameTriplet(textureKey, rows.walk, dir),
        frameRate: 14,
        repeat: -1,
      });
    }

    const emoteKey = `${textureKey}:emote-${direction}`;
    if (!scene.anims.exists(emoteKey)) {
      scene.anims.create({
        key: emoteKey,
        frames: frameTriplet(textureKey, rows.bow, dir),
        frameRate: 8,
        repeat: 0,
      });
    }
  }

  for (const facing of PUNY_FACING8_ORDER) {
    const dir = punyDirForFacing8(facing);
    const runKey = avatarWalkAnimKey(textureKey, facing).replace(':walk-', ':run-');
    if (!scene.anims.exists(runKey)) {
      scene.anims.create({
        key: runKey,
        frames: frameTriplet(textureKey, rows.walk, dir),
        frameRate: 14,
        repeat: -1,
      });
    }
  }

  for (const diag of DIAGONAL_FACINGS) {
    if (scene.anims.exists(avatarWalkAnimKey(textureKey, diag))) continue;
    // already registered via PUNY_FACING8_ORDER
  }
}

export function avatarIdleFrame(textureKey: string, direction: Direction): number {
  if (!isDonorPunyAvatarTexture(textureKey)) return getIdleFrameIndex(direction);
  return punyFrameIndex(PUNY_SHEET.rows.idle, PUNY_CARDINAL_DIR[direction], 0);
}

export function avatarIdleFrameForFacing8(textureKey: string, facing: Facing8): number {
  if (!isDonorPunyAvatarTexture(textureKey)) {
    const cardinal = facing.includes('left')
      ? 'left'
      : facing.includes('right')
        ? 'right'
        : facing.includes('up')
          ? 'up'
          : 'down';
    return getIdleFrameIndex(cardinal as Direction);
  }
  return punyFrameIndex(PUNY_SHEET.rows.idle, punyDirForFacing8(facing), 0);
}

export function playDonorToolUseAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  textureKey: string,
  facing: Direction,
): void {
  const toolKey = `${textureKey}:tool-${facing}`;
  if (scene.anims.exists(toolKey)) sprite.play(toolKey, true);
}