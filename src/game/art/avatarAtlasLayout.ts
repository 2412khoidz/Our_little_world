/** Unified 4-row cozy human avatar atlas layout (idle / walk / sit / phone). */
export const AVATAR_ATLAS_ROW_IDLE = 0;
export const AVATAR_ATLAS_ROW_WALK = 1;
export const AVATAR_ATLAS_ROW_SIT = 2;
export const AVATAR_ATLAS_ROW_PHONE = 3;
export const AVATAR_ATLAS_ROW_LIE = 0;
export const AVATAR_ATLAS_ROW_COUNT = 4;

export function avatarWalkAnimKey(textureKey: string, facing: string): string {
  return `${textureKey}:walk-${facing}`;
}
