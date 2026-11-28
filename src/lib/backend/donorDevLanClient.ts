import type { HeldItemState } from '../../shared/interaction/interactionTypes';
import type { DonorFishSessionView } from '../../shared/donor/donorFishSessionTypes';
import type { DonorFishingSpotId } from '../../shared/donor/donorFishingSpots';
import type { TidefallFishingPhase } from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';
import type { TidefallFishRarity } from '../../shared/donor/tidefall-phaser/tidefallFishCatalog';
import { devLanRequestHeaders } from './devLanSessionHeaders';

export type { DonorFishingSpotId };

async function donorDevLanJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!import.meta.env.DEV) {
    throw new Error('DEV only');
  }
  const res = await fetch(`/api/dev-lan${path}`, {
    ...init,
    headers: devLanRequestHeaders(init?.headers),
  });
  let json: { ok: boolean; data?: T; message?: string };
  try {
    json = (await res.json()) as { ok: boolean; data?: T; message?: string };
  } catch {
    throw new Error('Máy chủ câu cá không phản hồi — thử lại sau.');
  }
  if (!json.ok) throw new Error(json.message ?? 'Không thực hiện được thao tác câu cá.');
  return json.data as T;
}

export function fetchDonorWorkshop(worldId: string) {
  return donorDevLanJson<{
    mill: { queue: { recipeId: string; endMs: number }[]; recipes: string[] };
    bakery: { queue: { recipeId: string; endMs: number }[]; recipes: string[] };
    coop: { fedAtMs: number | null; readyAtMs: number | null };
    nowMs: number;
  }>(`/donor/workshop?worldId=${encodeURIComponent(worldId)}`);
}

export function postDonorBakeryQueue(worldId: string, recipeId: string) {
  return donorDevLanJson(`/donor/bakery/queue?worldId=${encodeURIComponent(worldId)}`, {
    method: 'POST',
    body: JSON.stringify({ worldId, recipeId }),
  });
}

export function postDonorBakeryCollect(worldId: string) {
  return donorDevLanJson(`/donor/bakery/collect?worldId=${encodeURIComponent(worldId)}`, {
    method: 'POST',
    body: JSON.stringify({ worldId }),
  });
}

export function postDonorCoopFeed(worldId: string) {
  return donorDevLanJson(`/donor/coop/feed?worldId=${encodeURIComponent(worldId)}`, {
    method: 'POST',
    body: JSON.stringify({ worldId }),
  });
}

export function postDonorCoopCollect(worldId: string) {
  return donorDevLanJson(`/donor/coop/collect?worldId=${encodeURIComponent(worldId)}`, {
    method: 'POST',
    body: JSON.stringify({ worldId }),
  });
}

export function postDonorWorkshopQueue(worldId: string, recipeId: string) {
  return donorDevLanJson(`/donor/workshop/queue?worldId=${encodeURIComponent(worldId)}`, {
    method: 'POST',
    body: JSON.stringify({ worldId, recipeId }),
  });
}

export function postDonorWorkshopCollect(worldId: string) {
  return donorDevLanJson(`/donor/workshop/collect?worldId=${encodeURIComponent(worldId)}`, {
    method: 'POST',
    body: JSON.stringify({ worldId }),
  });
}

export function postDonorFishingStart(worldId: string, spotId: DonorFishingSpotId,
  physicalSource?: HeldItemState['physicalSource'], castId?: string) {
  return donorDevLanJson<{
    seed: number;
    castId?: string;
    spotId: DonorFishingSpotId;
    preview: {
      name: string;
      critterId?: string;
      itemSku?: string;
      labelVi?: string;
      rarity?: TidefallFishRarity;
      spriteUrl?: string;
    };
  }>(
    `/donor/fishing/start?worldId=${encodeURIComponent(worldId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ worldId, spotId, physicalSource, castId }),
    },
  );
}

export function fetchDonorFishingSession(worldId: string) {
  return donorDevLanJson<DonorFishSessionView | null>(`/donor/fishing/session?worldId=${encodeURIComponent(worldId)}`);
}

export function postDonorFishingSync(
  worldId: string,
  patch: {
    spotId: DonorFishingSpotId;
    castId?: string;
    phase: TidefallFishingPhase;
    progressPermille: number;
    pointerNorm: number;
    roundSeed?: number;
    targetCenter?: number;
    targetWidth?: number;
    pointerDir?: number;
    pointerSpeed?: number;
  },
) {
  return donorDevLanJson<DonorFishSessionView>(`/donor/fishing/sync?worldId=${encodeURIComponent(worldId)}`, {
    method: 'POST',
    body: JSON.stringify({ worldId, ...patch }),
  });
}

export function postDonorFishingResolve(worldId: string, reelProgressPermille: number, roundSeed?: number, castId?: string) {
  return donorDevLanJson<{
    escaped: boolean;
    itemSku: string | null;
    critterId?: string;
    labelVi: string;
    rarity?: TidefallFishRarity;
    spriteUrl?: string;
    qtyGranted?: number;
    overflowUnits?: number;
    spotId?: DonorFishingSpotId;
    alreadyResolved?: boolean;
  }>(
    `/donor/fishing/resolve?worldId=${encodeURIComponent(worldId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ worldId, reelProgressPermille, roundSeed, castId }),
    },
  );
}