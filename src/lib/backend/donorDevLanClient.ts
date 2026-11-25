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
  return donorDevLanJson<{ queue: { recipeId: string; endMs: number }[]; recipes: string[]; nowMs: number }>(
    `/donor/workshop?worldId=${encodeURIComponent(worldId)}`,
  );
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

export function postDonorFishingStart(worldId: string) {
  return donorDevLanJson<{ preview: { name: string } }>(`/donor/fishing/start?worldId=${encodeURIComponent(worldId)}`, {
    method: 'POST',
    body: JSON.stringify({ worldId }),
  });
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