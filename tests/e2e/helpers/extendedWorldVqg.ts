import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

type OlwVqgGlobal = {
  __OLW_VQG?: { jump: (mapId: string, tileX: number, tileY: number) => void };
};

export async function seedDevCouple(request: APIRequestContext, base: string): Promise<void> {
  const reset = await request.post(`${base}/api/dev-lan/reset`, { data: {} });
  expect(reset.ok()).toBe(true);
  const seed = await request.post(`${base}/api/dev-lan/seed-couple`, { data: {} });
  expect(seed.ok()).toBe(true);
}

export async function waitForVqgJump(page: Page, timeoutMs = 20_000): Promise<void> {
  await page.waitForFunction(
    () => typeof (globalThis as unknown as OlwVqgGlobal).__OLW_VQG?.jump === 'function',
    undefined,
    { timeout: timeoutMs },
  );
}

export async function waitForGameCanvasReady(canvas: Locator, timeoutMs = 20_000): Promise<void> {
  await expect
    .poll(async () => canvas.getAttribute('data-map-id'), { timeout: timeoutMs })
    .not.toBeNull();
}

export async function enterExtendedWorldGame(page: Page, base: string): Promise<Locator> {
  await page.goto(`${base}/?extended-world=1&vqg-capture=1`);
  await page.getByTestId('preset-partner-a').click();
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await waitForVqgJump(page);
  await waitForGameCanvasReady(canvas);
  return canvas;
}

export async function expectCanvasMapId(canvas: Locator, mapId: string, timeoutMs = 30_000): Promise<void> {
  await expect.poll(async () => canvas.getAttribute('data-map-id'), { timeout: timeoutMs }).toBe(mapId);
}

export async function emitVqgJump(page: Page, mapId: string, tileX: number, tileY: number): Promise<void> {
  await waitForVqgJump(page);
  await page.evaluate(
    ({ mapId: mid, tileX: tx, tileY: ty }) => {
      const w = globalThis as unknown as OlwVqgGlobal;
      if (!w.__OLW_VQG?.jump) throw new Error('__OLW_VQG.jump missing');
      w.__OLW_VQG.jump(mid, tx, ty);
    },
    { mapId, tileX, tileY },
  );
}

/** Retries VQG jump until Phaser reflects the map (avoids racing scene init). */
export async function vqgJumpMap(
  page: Page,
  canvas: Locator,
  mapId: string,
  tileX: number,
  tileY: number,
  timeoutMs = 35_000,
): Promise<void> {
  await waitForGameCanvasReady(canvas);
  await expect
    .poll(
      async () => {
        const current = await canvas.getAttribute('data-map-id');
        if (current === mapId) return mapId;
        await emitVqgJump(page, mapId, tileX, tileY);
        return canvas.getAttribute('data-map-id');
      },
      { timeout: timeoutMs, intervals: [0, 100, 250, 500] },
    )
    .toBe(mapId);
}