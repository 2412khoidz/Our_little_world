import type Phaser from 'phaser';
import {
  DEFAULT_AVATAR_PARTNER_A,
  DEFAULT_AVATAR_PARTNER_B,
  avatarConfigsEqual,
} from '../../shared/avatar';
import type { AvatarConfig, Direction } from '../../shared/types';
import { DIAGONAL_FACINGS, type Facing8 } from '../../shared/movement/facing8';
import {
  COZY_PUNY_ACTION_ROWS,
  type CozyPunyDonorAction,
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
  mageCyan: 'donor-cozy-puny-mage-cyan',
  mageRed: 'donor-cozy-puny-mage-red',
} as const;

export type DonorPunyTextureId = (typeof DONOR_PUNY_TEXTURE_IDS)[keyof typeof DONOR_PUNY_TEXTURE_IDS];

const LEGACY_DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];

const registeredTextures = new Set<string>();

const CARDINAL_ACTIONS: readonly {
  suffix: string;
  action: CozyPunyDonorAction;
  frameRate: number;
  repeat: number;
}[] = [
  { suffix: 'sit', action: 'sit', frameRate: 4, repeat: -1 },
  { suffix: 'lie', action: 'lie', frameRate: 3, repeat: -1 },
  { suffix: 'hoe', action: 'hoe', frameRate: 12, repeat: 0 },
  { suffix: 'water', action: 'water', frameRate: 12, repeat: 0 },
  { suffix: 'harvest', action: 'harvest', frameRate: 10, repeat: 0 },
  { suffix: 'fish', action: 'fish', frameRate: 10, repeat: 0 },
  { suffix: 'hold', action: 'hold', frameRate: 4, repeat: -1 },
  { suffix: 'affection', action: 'affection', frameRate: 8, repeat: 0 },
  /** Legacy alias for held-item sync — maps to stave (hoe), not combat slash. */
  { suffix: 'tool', action: 'hoe', frameRate: 12, repeat: 0 },
];

export function isDonorPunyAvatarTexture(textureKey: string): boolean {
  return (Object.values(DONOR_PUNY_TEXTURE_IDS) as string[]).includes(textureKey);
}

/** Mây (partner A) · Nắng (partner B) — cozy CC0 Puny rigs (no soldier combat walk). */
export const MAY_GAMEPLAY_PUNY_TEXTURE = DONOR_PUNY_TEXTURE_IDS.base;
export const NANG_GAMEPLAY_PUNY_TEXTURE = DONOR_PUNY_TEXTURE_IDS.mageCyan;

export function donorPunyTextureForConfig(config: AvatarConfig): DonorPunyTextureId {
  if (avatarConfigsEqual(config, DEFAULT_AVATAR_PARTNER_B)) {
    return NANG_GAMEPLAY_PUNY_TEXTURE;
  }
  if (avatarConfigsEqual(config, DEFAULT_AVATAR_PARTNER_A)) {
    return MAY_GAMEPLAY_PUNY_TEXTURE;
  }
  if (config.outfitColor === 'rose' || config.hairColor === 'sakura') {
    return DONOR_PUNY_TEXTURE_IDS.mageRed;
  }
  if (config.outfitColor === 'sky' || config.outfitStyle === 'overall') {
    return DONOR_PUNY_TEXTURE_IDS.mageCyan;
  }
  return DONOR_PUNY_TEXTURE_IDS.base;
}

function actionRow(action: CozyPunyDonorAction): number {
  return COZY_PUNY_ACTION_ROWS[action];
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

    for (const clip of CARDINAL_ACTIONS) {
      const animKey = `${textureKey}:${clip.suffix}-${direction}`;
      if (scene.anims.exists(animKey)) continue;
      const row = actionRow(clip.action);
      const frames =
        clip.action === 'hold'
          ? [{ key: textureKey, frame: punyFrameIndex(row, dir, 0) }]
          : frameTriplet(textureKey, row, dir);
      scene.anims.create({
        key: animKey,
        frames,
        frameRate: clip.frameRate,
        repeat: clip.repeat,
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
        frames: frameTriplet(textureKey, actionRow('affection'), dir),
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
    // registered via PUNY_FACING8_ORDER
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

export function cozyPunyAnimKey(
  textureKey: string,
  action: CozyPunyDonorAction | 'tool',
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
  action: CozyPunyDonorAction | 'tool' = 'hoe',
): void {
  const directKey = cozyPunyAnimKey(textureKey, action, facing);
  if (scene.anims.exists(directKey)) {
    sprite.play(directKey, true);
    return;
  }
  const toolKey = `${textureKey}:tool-${facing}`;
  if (scene.anims.exists(toolKey)) sprite.play(toolKey, true);
}