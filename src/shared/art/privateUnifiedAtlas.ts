/** Six runtime files under `public/assets/private-unified/` (gitignored; owner handoff). */
export const PRIVATE_UNIFIED_ATLAS_FILES = [
  'public/assets/private-unified/world.png',
  'public/assets/private-unified/world-props.png',
  'public/assets/private-unified/avatars.png',
  'public/assets/private-unified/manifest.json',
  'public/assets/private-unified/props-manifest.json',
  'public/assets/private-unified/CREDITS.md',
] as const;

export function privateArtEnvEnabled(): boolean {
  return import.meta.env.VITE_OLW_PRIVATE_ART === true;
}