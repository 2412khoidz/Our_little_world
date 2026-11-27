import type { PetActionType } from '../../pet/petTypes';
import type { PetCareActionKind, PetCareExpression } from '../../petLiving/petCare/petCareTypes';
import type { PetShopCarePanelMode } from './petShopCareFace';

/** Map scene care beats → pet-shop care panel mode (presentation only). */
export function petCareActionKindToFlash(action: PetCareActionKind): PetActionType | 'play' | null {
  switch (action) {
    case 'stroke':
      return 'pet';
    case 'offer_food':
      return 'feed';
    case 'pour_water':
      return 'water';
    case 'toy_yarn':
    case 'toy_box':
    case 'brush':
      return 'play';
    case 'call':
    case 'observe':
      return 'pet';
    default:
      return null;
  }
}

export function petCareExpressionToFlash(expr: PetCareExpression): PetActionType | 'play' | null {
  if (expr.anim === 'eat' || expr.anim === 'sniff') return 'feed';
  if (expr.anim === 'play_pounce' || expr.anim === 'happy_hop' || expr.anim === 'box_peek') return 'play';
  if (expr.eyeMood === 'happy' && expr.tail === 'wag_fast') return 'pet';
  if (expr.refuse) return null;
  return 'pet';
}

export function toCarePanelMode(flash: PetActionType | 'play' | null, active: boolean): PetShopCarePanelMode {
  if (!active || !flash) return 'idle';
  if (flash === 'play') return 'play';
  return flash;
}