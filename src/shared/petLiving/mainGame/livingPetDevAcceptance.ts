import { gameEventBus } from '../../../game/eventBus';
import { PET_KIBBLE_BASIC_SKU } from '../../inventory/inventoryRules';
import { isLivingPetLocalSimulationEnabled } from './petLivingDevFlag';

const FOOD_OFFER_EVENT = 'olw-dev-living-pet-food-offer';
const PET_CARE_ENTER_EVENT = 'olw-dev-enter-pet-care';
const PET_CARE_FAST_EVENT = 'olw-dev-pet-care-fast-autonomy';
const PET_CARE_STROKE_EVENT = 'olw-dev-pet-care-stroke';

export interface PetCareSoakSnapshot {
  autonomyActions: string[];
  squeaks: string[];
  strokeZones: string[];
  bubblesVi: string[];
}

declare global {
  interface Window {
    __OLW_PET_CARE_FAST?: boolean;
    __OLW_PET_CARE_SOAK?: PetCareSoakSnapshot;
  }
}

/** DEV-only hook for Playwright acceptance (no production). */
export function registerLivingPetDevAcceptanceHooks(): () => void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return () => {};
  if (!isLivingPetLocalSimulationEnabled()) return () => {};

  window.__OLW_PET_CARE_SOAK = {
    autonomyActions: [],
    squeaks: [],
    strokeZones: [],
    bubblesVi: [],
  };
  const soak = window.__OLW_PET_CARE_SOAK;
  const unsubs = [
    gameEventBus.on('evt:pet-care-autonomy-cue', ({ action, bubbleVi }) => {
      soak.autonomyActions.push(action);
      soak.bubblesVi.push(bubbleVi);
    }),
    gameEventBus.on('evt:pet-care-refuse', ({ squeak }) => soak.squeaks.push(squeak)),
    gameEventBus.on('evt:pet-care-stroke-done', ({ zone }) => soak.strokeZones.push(zone)),
  ];

  const onOffer = () => {
    gameEventBus.emit('cmd:pet-local-food-offer', {
      offerId: `dev-acceptance-${Date.now()}`,
      caregiverId: 'dev-acceptance',
      sku: PET_KIBBLE_BASIC_SKU,
      quality: 'normal',
    });
  };

  const onCareEnter = () => {
    gameEventBus.emit('cmd:pet-care-mode', { active: true });
  };
  const onCareFast = () => {
    (window as unknown as { __OLW_PET_CARE_FAST?: boolean }).__OLW_PET_CARE_FAST = true;
  };
  const onCareStroke = (ev: Event) => {
    const zone = (ev as CustomEvent<{ zone?: 'head' | 'chin' | 'back' }>).detail?.zone ?? 'head';
    gameEventBus.emit('cmd:pet-care-stroke', { zone, strokeIndex: Date.now() % 20 });
  };

  window.addEventListener(FOOD_OFFER_EVENT, onOffer);
  window.addEventListener(PET_CARE_ENTER_EVENT, onCareEnter);
  window.addEventListener(PET_CARE_FAST_EVENT, onCareFast);
  window.addEventListener(PET_CARE_STROKE_EVENT, onCareStroke);
  return () => {
    for (const u of unsubs) u();
    delete window.__OLW_PET_CARE_SOAK;
    window.removeEventListener(FOOD_OFFER_EVENT, onOffer);
    window.removeEventListener(PET_CARE_ENTER_EVENT, onCareEnter);
    window.removeEventListener(PET_CARE_FAST_EVENT, onCareFast);
    window.removeEventListener(PET_CARE_STROKE_EVENT, onCareStroke);
  };
}

export function dispatchLivingPetDevFoodOfferEvent(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(FOOD_OFFER_EVENT));
}

export function dispatchLivingPetDevPetCareEnterEvent(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PET_CARE_ENTER_EVENT));
}