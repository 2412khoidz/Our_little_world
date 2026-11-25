import type Phaser from 'phaser';
import {
  DEFAULT_AVATAR_PARTNER_A,
  DEFAULT_AVATAR_PARTNER_B,
  avatarConfigsEqual,
} from '../../shared/avatar';
import type { AvatarConfig, Direction } from '../../shared/types';
import { cardinalFromFacing8, FACING8_VALUES, type Facing8 } from '../../shared/movement/facing8';
import {
  PYDEW_CARDINAL_DIR,
  PYDEW_FARMER_ACTION_ROWS,
  PYDEW_FARMER_SHEET,
  type PydewFarmerAction,
  pydewDirForFacing8,
  pydewFrameIndex,
} from '../../shared/donor/pydewFarmerCharacterSheet';
import { avatarWalkAnimKey } from './avatarAtlasLayout';
import { getIdleFrameIndex } from './avatarSpriteBuilder';

export const DONOR_PYDEW_TEXTURE_IDS = {
  may: 'donor-pydew-farmer-may',
  nang: 'donor-pydew-farmer-nang',
  rose: 'donor-pydew-farmer-rose',
} as const;

export type DonorPydewTextureId = (typeof DONOR_PYDEW_TEXTURE_IDS)[keyof typeof DONOR_PYDEW_TEXTURE_IDS];

const LEGACY_DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];
const registeredTextures = new Set<string>();

const ACTION_CLIPS: readonly {
  suffix: string;
  action: PydewFarmerAction;
  frameRate: number;
  repeat: number;
  maxFrames?: number;
}[] = [
  { suffix: 'sit', action: 'sit', frameRate: 4, repeat: -1, maxFrames: 2 },
  { suffix: 'lie', action: 'lie', frameRate: 3, repeat: -1, maxFrames: 1 },
  { suffix: 'hoe', action: 'hoe', frameRate: 10, repeat: 0, maxFrames: 2 },
  { suffix: 'water', action: 'water', frameRate: 10, repeat: 0, maxFrames: 2 },
  { suffix: 'harvest', action: 'harvest', frameRate: 10, repeat: 0, maxFrames: 2 },
  { suffix: 'fish', action: 'fish', frameRate: 10, repeat: 0, maxFrames: 2 },
  { suffix: 'hold', action: 'hold', frameRate: 4, repeat: -1, maxFrames: 1 },
  { suffix: 'affection', action: 'affection', frameRate: 8, repeat: 0, maxFrames: 2 },
  { suffix: 'tool', action: 'hoe', frameRate: 10, repeat: 0, maxFrames: 2 },
];

export const MAY_GAMEPLAY_PYDEW_TEXTURE = DONOR_PYDEW_TEXTURE_IDS.may;
export const NANG_GAMEPLAY_PYDEW_TEXTURE = DONOR_PYDEW_TEXTURE_IDS.nang;

export function isDonorGameplayAvatarTexture(textureKey: string): boolean {
  return (Object.values(DONOR_PYDEW_TEXTURE_IDS) as string[]).includes(textureKey);
}

/** @deprecated use isDonorGameplayAvatarTexture */
export const isDonorPunyAvatarTexture = isDonorGameplayAvatarTexture;

export function donorGameplayTextureForConfig(config: AvatarConfig): DonorPydewTextureId {
  if (avatarConfigsEqual(config, DEFAULT_AVATAR_PARTNER_B)) {
    return NANG_GAMEPLAY_PYDEW_TEXTURE;
  }
  if (avatarConfigsEqual(config, DEFAULT_AVATAR_PARTNER_A)) {
    return MAY_GAMEPLAY_PYDEW_TEXTURE;
  }
  if (config.outfitColor === 'rose' || config.hairColor === 'sakura') {
    return DONOR_PYDEW_TEXTURE_IDS.rose;
  }
  if (config.outfitColor === 'sky' || config.outfitStyle === 'overall') {
    return NANG_GAMEPLAY_PYDEW_TEXTURE;
  }
  return DONOR_PYDEW_TEXTURE_IDS.may;
}

function actionRow(action: PydewFarmerAction): number {
  return PYDEW_FARMER_ACTION_ROWS[action];
}

function frameSequence(
  textureKey: string,
  row: number,
  dir: number,
  count: number,
): Phaser.Types.Animations.AnimationFrame[] {
  const frames: Phaser.Types.Animations.AnimationFrame[] = [];
  for (let i = 0; i < count; i += 1) {
    frames.push({ key: textureKey, frame: pydewFrameIndex(row, dir, i) });
  }
  return frames;
}

export function registerDonorPydewFarmerAnims(scene: Phaser.Scene, textureKey: string): void {
  if (registeredTextures.has(textureKey)) return;
  if (!scene.textures.exists(textureKey)) return;
  registeredTextures.add(textureKey);

  const { rows } = PYDEW_FARMER_SHEET;

  for (const direction of LEGACY_DIRECTIONS) {
    const dir = PYDEW_CARDINAL_DIR[direction];
    const walkKey = `${textureKey}:walk-${direction}`;
    if (!scene.anims.exists(walkKey)) {
      scene.anims.create({
        key: walkKey,
        frames: frameSequence(textureKey, rows.walk, dir, 4),
        frameRate: 9,
        repeat: -1,
      });
    }

    for (const clip of ACTION_CLIPS) {
      const animKey = `${textureKey}:${clip.suffix}-${direction}`;
      if (scene.anims.exists(animKey)) continue;
      const row = actionRow(clip.action);
      const maxF = clip.maxFrames ?? 4;
      scene.anims.create({
        key: animKey,
        frames: frameSequence(textureKey, row, dir, maxF),
        frameRate: clip.frameRate,
        repeat: clip.repeat,
      });
    }

    const runKey = `${textureKey}:run-${direction}`;
    if (!scene.anims.exists(runKey)) {
      scene.anims.create({
        key: runKey,
        frames: frameSequence(textureKey, rows.walk, dir, 4),
        frameRate: 14,
        repeat: -1,
      });
    }

    const emoteKey = `${textureKey}:emote-${direction}`;
    if (!scene.anims.exists(emoteKey)) {
      scene.anims.create({
        key: emoteKey,
        frames: frameSequence(textureKey, actionRow('affection'), dir, 2),
        frameRate: 8,
        repeat: 0,
      });
    }
  }

  for (const facing of FACING8_VALUES) {
    const walkKey = avatarWalkAnimKey(textureKey, facing);
    if (scene.anims.exists(walkKey)) continue;
    const cardinal = cardinalFromFacing8(facing);
    const dir = PYDEW_CARDINAL_DIR[cardinal];
    scene.anims.create({
      key: walkKey,
      frames: frameSequence(textureKey, rows.walk, dir, 4),
      frameRate: 9,
      repeat: -1,
    });
  }
}

export function avatarIdleFrame(textureKey: string, direction: Direction): number {
  if (!isDonorGameplayAvatarTexture(textureKey)) return getIdleFrameIndex(direction);
  return pydewFrameIndex(PYDEW_FARMER_SHEET.rows.idle, PYDEW_CARDINAL_DIR[direction], 0);
}

export function avatarIdleFrameForFacing8(textureKey: string, facing: Facing8): number {
  if (!isDonorGameplayAvatarTexture(textureKey)) {
    const cardinal = facing.includes('left')
      ? 'left'
      : facing.includes('right')
        ? 'right'
        : facing.includes('up')
          ? 'up'
          : 'down';
    return getIdleFrameIndex(cardinal as Direction);
  }
  return pydewFrameIndex(PYDEW_FARMER_SHEET.rows.idle, pydewDirForFacing8(facing), 0);
}

export function cozyGameplayAnimKey(
  textureKey: string,
  action: PydewFarmerAction | 'tool',
  direction: Direction,
): string {
  const suffix = action === 'tool' || action === 'hoe' ? 'tool' : action;
  return `${textureKey}:${suffix}-${direction}`;
}

export function playDonorToolUseAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  textureKey: string,
  facing: Direction,
  action: PydewFarmerAction | 'tool' = 'hoe',
): void {
  const key = cozyGameplayAnimKey(textureKey, action, facing);
  if (scene.anims.exists(key)) {
    sprite.play(key, true);
  }
}