/**
 * Build-time profile for owner private preview (Demo E atlas, extended donor world).
 * Values come from Vite `define` — not raw process.env at runtime.
 */

function envTruthy(raw: unknown): boolean {
  return raw === true || raw === '1' || raw === 'true';
}

export function isPrivatePreviewBuild(): boolean {
  return envTruthy(import.meta.env.VITE_OLW_PRIVATE_ART);
}

export function isExtendedWorldBuildDefault(): boolean {
  const raw = import.meta.env.VITE_OLW_EXTENDED_WORLD as unknown;
  if (raw === false || raw === '0' || raw === 'false') return false;
  return true;
}

export function isDonorEconomyBuildDefault(): boolean {
  if (envTruthy(import.meta.env.VITE_OLW_DONOR_ECONOMY)) return true;
  return isPrivatePreviewBuild();
}