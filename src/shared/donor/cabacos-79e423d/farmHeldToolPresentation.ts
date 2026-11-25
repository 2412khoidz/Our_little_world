import { resolveFarmCropVisual } from '../farmCropVisualResolver';
import { cabacosCropVisual } from './cropVisualRegistry';
import { pydewCropFrameTextureKey, pydewCropVisual } from '../pydew-farming/pydewCropVisualRegistry';

/** Cabacos tool sprites shown on the avatar (not props-atlas icons). */
export const CABACOS_HELD_TOOL_TEXTURE: Readonly<Record<string, string>> = {
  tool_hoe: 'donor-cabacos-hoe',
  tool_watering_can: 'donor-cabacos-watering-can',
};

/** Hollowmere / catalog fishing rod — Cabacos donor tool art when held in world. */
export const CABACOS_HELD_ITEM_TEXTURE: Readonly<Record<string, string>> = {
  rod_basic: 'donor-cabacos-rod',
};

export function cabacosHeldToolTextureKey(sku: string): string | null {
  return CABACOS_HELD_TOOL_TEXTURE[sku] ?? CABACOS_HELD_ITEM_TEXTURE[sku] ?? null;
}

export type HeldSeedSprite =
  | { kind: 'spritesheet'; textureKey: string; frame: number }
  | { kind: 'image'; textureKey: string };

/** Seed bag on avatar — crop growth art frame 0, never UI icon tiles. */
export function heldSeedCropSprite(seedSku: string): HeldSeedSprite | null {
  if (!seedSku.startsWith('seed_')) return null;
  const cropSku = seedSku.slice('seed_'.length);
  const pydew = pydewCropVisual(cropSku);
  if (pydew) {
    return { kind: 'image', textureKey: pydewCropFrameTextureKey(pydew.baseKey, 0) };
  }
  const resolved = resolveFarmCropVisual(cropSku, 0, false);
  if (resolved?.mode === 'cabacos_spritesheet') {
    return { kind: 'spritesheet', textureKey: resolved.textureKey, frame: 0 };
  }
  const cab = cabacosCropVisual(cropSku);
  if (cab) return { kind: 'spritesheet', textureKey: cab.textureKey, frame: 0 };
  return null;
}