import { HAIR_COLOR_OPTIONS, OUTFIT_COLOR_OPTIONS, SKIN_TONE_OPTIONS } from '../../shared/avatar';
import type { AvatarConfig, Direction } from '../../shared/types';
import { AVATAR_ATLAS_URL, USE_PRIVATE_ART } from './atlasProfile';
import { buildRampLookup, drawFrameAccessories, RIG_RAMPS, selectRigForHairStyle } from './avatarPalette';
import rig from './avatarRig.json';
import { AVATAR_ATLAS_ROW_COUNT, AVATAR_ATLAS_ROW_SIT } from './avatarAtlasLayout';
import { renderAvatarPreviewCanvas } from './avatarSpriteBuilder';

export const AVATAR_FRAME_WIDTH = rig.frameWidth;
export const AVATAR_FRAME_HEIGHT = rig.frameHeight;
export const AVATAR_FRAME_COUNT = rig.frameCount;
export const AVATAR_DIRECTIONS: readonly Direction[] = ['right', 'up', 'left', 'down'];
const stripWidth = AVATAR_FRAME_WIDTH * AVATAR_FRAME_COUNT * AVATAR_DIRECTIONS.length;
const rigHeight = AVATAR_FRAME_HEIGHT * AVATAR_ATLAS_ROW_COUNT;

export function buildWorldAvatarCanvas(
  source: CanvasImageSource,
  config: AvatarConfig,
  privateArt = USE_PRIVATE_ART,
): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = stripWidth;
  canvas.height = rigHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  const rigId = selectRigForHairStyle(config.hairStyle);
  const row = rig.hairStyles.indexOf(config.hairStyle);
  const ramps = privateArt ? RIG_RAMPS[rigId] : rig.ramps;
  const skin = SKIN_TONE_OPTIONS.find((option) => option.id === config.skinTone)!;
  const hair = HAIR_COLOR_OPTIONS.find((option) => option.id === config.hairColor)!;
  const outfit = OUTFIT_COLOR_OPTIONS.find((option) => option.id === config.outfitColor)!;
  const skinMap = buildRampLookup(ramps.skin, skin.baseHex, skin.shadeHex);
  const hairMap = buildRampLookup(ramps.hair, hair.baseHex, hair.shadeHex);
  const outfitMap = buildRampLookup(ramps.outfit, outfit.baseHex, outfit.shadeHex);
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, row * rigHeight, stripWidth, rigHeight, 0, 0, stripWidth, rigHeight);

  const image = context.getImageData(0, 0, stripWidth, rigHeight);
  const pixels = image.data;
  const packedColors = new Map<number, string>();
  for (const key of [...skinMap.keys(), ...hairMap.keys(), ...outfitMap.keys()]) {
    packedColors.set(Number.parseInt(key.slice(1), 16), key);
  }
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3]! < 128) continue;
    const rgb = (pixels[offset]! << 16) | (pixels[offset + 1]! << 8) | pixels[offset + 2]!;
    const hex = packedColors.get(rgb);
    if (!hex) continue;
    const sheetY = Math.floor(offset / (stripWidth * 4));
    const rowKind = Math.floor(sheetY / AVATAR_FRAME_HEIGHT);
    const y = sheetY % AVATAR_FRAME_HEIGHT;
    const headLimit = rowKind === AVATAR_ATLAS_ROW_SIT ? 21 : 19;
    const hairTipLimit = rowKind === AVATAR_ATLAS_ROW_SIT ? 26 : 25;
    const replacement = y <= headLimit
      ? hairMap.get(hex) ?? skinMap.get(hex) ?? outfitMap.get(hex)
      : outfitMap.get(hex) ?? skinMap.get(hex) ?? (y <= hairTipLimit ? hairMap.get(hex) : undefined);
    if (replacement) {
      pixels[offset] = replacement.r;
      pixels[offset + 1] = replacement.g;
      pixels[offset + 2] = replacement.b;
    }
  }
  context.putImageData(image, 0, 0);

  for (const [index, direction] of AVATAR_DIRECTIONS.entries()) {
    for (let animation = 0; animation < AVATAR_ATLAS_ROW_COUNT; animation += 1) {
      const yOffset = animation === AVATAR_ATLAS_ROW_SIT ? 1 : 0;
      for (let frame = 0; frame < AVATAR_FRAME_COUNT; frame += 1) {
        drawFrameAccessories(
          context,
          (index * AVATAR_FRAME_COUNT + frame) * AVATAR_FRAME_WIDTH,
          animation * AVATAR_FRAME_HEIGHT + yOffset,
          direction,
          rigId,
          config,
          animation,
        );
      }
    }
  }
  return canvas;
}

let avatarImage: Promise<HTMLImageElement | null> | undefined;

export function loadAvatarAtlas(): Promise<HTMLImageElement | null> {
  avatarImage ??= new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = AVATAR_ATLAS_URL;
  });
  return avatarImage;
}

export function drawWardrobePreview(
  target: HTMLCanvasElement,
  source: HTMLImageElement | null,
  config: AvatarConfig,
  scale: number,
  rowKind = 0,
  direction: Direction = 'down',
  frameIndex = 0,
): void {
  const sheet = source && buildWorldAvatarCanvas(source, config);
  if (!sheet) {
    renderAvatarPreviewCanvas(target, config, scale);
    return;
  }
  target.width = AVATAR_FRAME_WIDTH * scale;
  const previewHeight = 25;
  target.height = previewHeight * scale;
  const context = target.getContext('2d');
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, target.width, target.height);
  const dirOffset = AVATAR_DIRECTIONS.indexOf(direction) * AVATAR_FRAME_COUNT * AVATAR_FRAME_WIDTH;
  const safeFrame = Math.abs(frameIndex) % AVATAR_FRAME_COUNT;
  const sx = dirOffset + safeFrame * AVATAR_FRAME_WIDTH;
  const safeRow = Math.max(0, Math.min(AVATAR_ATLAS_ROW_COUNT - 1, rowKind));
  const sy = safeRow * AVATAR_FRAME_HEIGHT + (AVATAR_FRAME_HEIGHT - previewHeight);
  context.drawImage(sheet, sx, sy, AVATAR_FRAME_WIDTH, previewHeight, 0, 0, target.width, target.height);
  target.dataset.avatarRig = selectRigForHairStyle(config.hairStyle);
}
