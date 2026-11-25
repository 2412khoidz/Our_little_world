import { gameEventBus } from '../../../game/eventBus';
import { PET_KIBBLE_BASIC_SKU } from '../../inventory/inventoryRules';
import { isLivingPetLocalSimulationEnabled } from './petLivingDevFlag';

const FOOD_OFFER_EVENT = 'olw-dev-living-pet-food-offer';
const PET_CARE_ENTER_EVENT = 'olw-dev-enter-pet-care';

/** DEV-only hook for Playwright acceptance (no production). */
export function registerLivingPetDevAcceptanceHooks(): () => void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return () => {};
  if (!isLivingPetLocalSimulationEnabled()) return () => {};

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

  window.addEventListener(FOOD_OFFER_EVENT, onOffer);
  window.addEventListener(PET_CARE_ENTER_EVENT, onCareEnter);
  return () => {
    window.removeEventListener(FOOD_OFFER_EVENT, onOffer);
    window.removeEventListener(PET_CARE_ENTER_EVENT, onCareEnter);
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