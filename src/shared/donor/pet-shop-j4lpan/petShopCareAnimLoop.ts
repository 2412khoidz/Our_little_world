/** Blink / idle timing adapted from pet-shop `main.js` (MIT) — pure for unit tests. */

export const PET_SHOP_BLINK_MS = 160;
export const PET_SHOP_BLINK_DOUBLE_GAP_MS = 270;
export const PET_SHOP_YAWN_MS = 700;
export const PET_SHOP_EAR_TWITCH_MS = 420;

export const PET_SHOP_BLINK_MIN_MS = 2_500;
export const PET_SHOP_BLINK_MAX_MS = 5_500;

export const PET_SHOP_IDLE_MICRO_MIN_MS = 8_000;
export const PET_SHOP_IDLE_MICRO_MAX_MS = 15_000;

export type PetShopIdleMicro = 'yawn' | 'ear_twitch';

export function nextBlinkDelayMs(randUnit: number): number {
  const span = PET_SHOP_BLINK_MAX_MS - PET_SHOP_BLINK_MIN_MS;
  return PET_SHOP_BLINK_MIN_MS + Math.floor(randUnit * span);
}

export function shouldDoubleBlink(randUnit: number): boolean {
  return randUnit < 0.25;
}

export function nextIdleMicroDelayMs(randUnit: number): number {
  const span = PET_SHOP_IDLE_MICRO_MAX_MS - PET_SHOP_IDLE_MICRO_MIN_MS;
  return PET_SHOP_IDLE_MICRO_MIN_MS + Math.floor(randUnit * span);
}

export function pickIdleMicroAction(randUnit: number): PetShopIdleMicro | null {
  if (randUnit < 0.15) return 'yawn';
  if (randUnit < 0.28) return 'ear_twitch';
  return null;
}

export function isBlinkActive(blinkUntilMs: number, nowMs: number): boolean {
  return nowMs < blinkUntilMs;
}

export function isYawnActive(yawnUntilMs: number, nowMs: number): boolean {
  return nowMs < yawnUntilMs;
}

export function isEarTwitchActive(earTwitchUntilMs: number, nowMs: number): boolean {
  return nowMs < earTwitchUntilMs;
}

/** First ~800ms of a feed flash uses the tongue mouth variant (eating beat). */
export function isFeedEatPhase(flashAtMs: number | null, nowMs: number): boolean {
  if (flashAtMs === null) return false;
  return nowMs - flashAtMs < 800;
}