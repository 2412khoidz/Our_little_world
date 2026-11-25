/** Wardrobe / unified atlas rows (idle / walk / sit) — gameplay 8-dir uses donor Puny sheets. */
export const AVATAR_ATLAS_ROW_IDLE = 0;
export const AVATAR_ATLAS_ROW_WALK = 1;
export const AVATAR_ATLAS_ROW_SIT = 2;
export const AVATAR_ATLAS_ROW_LIE = 2;
export const AVATAR_ATLAS_ROW_COUNT = 3;

export function avatarWalkAnimKey(textureKey: string, facing: string): string {
  return `${textureKey}:walk-${facing}`;
}