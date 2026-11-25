import { gameEventBus } from '../../../game/eventBus';
import { PET_KIBBLE_BASIC_SKU } from '../../inventory/inventoryRules';
import { isLivingPetLocalSimulationEnabled } from './petLivingDevFlag';

const FOOD_OFFER_EVENT = 'olw-dev-living-pet-food-offer';

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

  window.addEventListener(FOOD_OFFER_EVENT, onOffer);
  return () => window.removeEventListener(FOOD_OFFER_EVENT, onOffer);
}

export function dispatchLivingPetDevFoodOfferEvent(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(FOOD_OFFER_EVENT));
}