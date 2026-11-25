import type { PetCareJ4lpanFlash } from '../../../shared/petLiving/petCare/petCareJ4lpanPortraitBus';
import {
  petCareActionKindToFlash,
  petCareExpressionToFlash,
} from '../../../shared/donor/pet-shop-j4lpan/petCareJ4lpanBridge';
import type { PetCareActionKind, PetCareExpression } from '../../../shared/petLiving/petCare/petCareTypes';
import type { PetSnapshot } from '../../../shared/pet/petTypes';
import { PET_SHOP_CARE_FLASH_MS } from '../../../shared/donor/pet-shop-j4lpan/petShopCareFace';
import { gameEventBus } from '../../eventBus';

export type J4lpanFlashState = { kind: PetCareJ4lpanFlash; atMs: number } | null;

export function startJ4lpanFlash(kind: PetCareJ4lpanFlash, nowMs: number): J4lpanFlashState {
  return { kind, atMs: nowMs };
}

export function j4lpanFlashFromExpression(expr: PetCareExpression, nowMs: number): J4lpanFlashState {
  const mapped = petCareExpressionToFlash(expr);
  if (!mapped) return null;
  return { kind: mapped, atMs: nowMs };
}

export function j4lpanFlashFromAction(action: PetCareActionKind, nowMs: number): J4lpanFlashState {
  const mapped = petCareActionKindToFlash(action);
  if (!mapped) return null;
  return { kind: mapped, atMs: nowMs };
}

export function activeJ4lpanFlash(state: J4lpanFlashState, nowMs: number): J4lpanFlashState {
  if (!state) return null;
  if (nowMs - state.atMs > PET_SHOP_CARE_FLASH_MS) return null;
  return state;
}

export function publishJ4lpanPortrait(params: {
  snapshot: PetSnapshot | null;
  bubbleVi: string;
  flash: J4lpanFlashState;
  nowMs: number;
}): void {
  const active = activeJ4lpanFlash(params.flash, params.nowMs);
  gameEventBus.emit('evt:pet-care-j4lpan-portrait', {
    snapshot: params.snapshot,
    bubbleVi: params.bubbleVi,
    careFlash: active?.kind ?? null,
    careFlashAtMs: active?.atMs ?? 0,
    serverNowMs: params.snapshot?.serverNowMs ?? params.nowMs,
  });
}