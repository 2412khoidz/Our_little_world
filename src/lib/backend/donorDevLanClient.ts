async function donorDevLanJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/dev-lan${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = (await res.json()) as { ok: boolean; data?: T; message?: string };
  if (!json.ok) throw new Error(json.message ?? 'Donor API lỗi');
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

export type DonorFishingSpotId = 'meadow_pond' | 'east_stream';

export function postDonorFishingStart(worldId: string, spotId: DonorFishingSpotId) {
  return donorDevLanJson<{ preview: { name: string }; spotId: DonorFishingSpotId }>(
    `/donor/fishing/start?worldId=${encodeURIComponent(worldId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ worldId, spotId }),
    },
  );
}

export function postDonorFishingResolve(worldId: string, reelProgressPermille: number) {
  return donorDevLanJson<{ escaped: boolean; itemSku: string | null; labelVi: string }>(
    `/donor/fishing/resolve?worldId=${encodeURIComponent(worldId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ worldId, reelProgressPermille }),
    },
  );
}