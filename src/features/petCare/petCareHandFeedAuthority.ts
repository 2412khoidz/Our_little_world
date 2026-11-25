import { gameEventBus } from '../../game/eventBus';
import type { WorldBackend } from '../../lib/backend/types';
import type { PetSnapshot } from '../../shared/pet/petTypes';
import { isLivingPetLocalSimulationEnabled } from '../../shared/petLiving/mainGame/petLivingDevFlag';

export type HandFeedConsumeParams = {
  worldId: string;
  petId: string;
  expectedVersion: number;
  ownerScope: string;
  itemSku: string;
  quality: 'normal' | 'silver' | 'gold';
  idempotencyKey: string;
};

export type HandFeedConsumeOutcome =
  | { status: 'ok'; pet: PetSnapshot; sku: string; quality: string }
  | { status: 'dev_presentation' }
  | { status: 'error'; message: string; code?: string };

/**
 * Hand-feed in care scene — always tries `PetBackend.consumeHandFood` (#10 contract).
 * DEV `?living-pet=1` presentation fallback only when server returns SERVER_AUTHORITY_REQUIRED.
 */
export async function consumeHandFoodInCare(
  backend: WorldBackend,
  params: HandFeedConsumeParams,
): Promise<HandFeedConsumeOutcome> {
  if (!backend.pet?.consumeHandFood) {
    return {
      status: 'error',
      code: 'SERVER_AUTHORITY_REQUIRED',
      message: 'Chưa có máy chủ xác nhận choc ăn tay — cần tích hợp #10.',
    };
  }

  const res = await backend.pet.consumeHandFood(params);
  if (res.ok) {
    if (backend.petLiving?.getLivingSnapshot) {
      void backend.petLiving.getLivingSnapshot(params.worldId);
    }
    return {
      status: 'ok',
      pet: res.data.pet,
      sku: res.data.sku,
      quality: res.data.quality as 'normal' | 'silver' | 'gold',
    };
  }

  if (
    import.meta.env.DEV &&
    isLivingPetLocalSimulationEnabled() &&
    res.code === 'SERVER_AUTHORITY_REQUIRED'
  ) {
    gameEventBus.emit('cmd:pet-local-food-offer', {
      offerId: `care-fallback-${Date.now()}`,
      caregiverId: 'dev-care-fallback',
      sku: params.itemSku,
      quality: params.quality,
    });
    return { status: 'dev_presentation' };
  }

  return { status: 'error', message: res.message, code: res.code };
}