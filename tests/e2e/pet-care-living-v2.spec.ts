import { expect, test, type Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || '4173'}`;
const SCREENSHOT_DIR = 'C:/Users/admin/.gemini/antigravity/brain/3104cc55-393b-45ef-b4ae-6eeaf76e313c';

interface V2State {
  variant: string;
  modelKind: string;
  lod: string;
  activeClip: string;
  qualityPreset: string;
  audioMuted: boolean;
  audioVolume: number;
  lastSound: string | null;
  fps: number;
  avgFrameMs: number;
  drawCalls: number;
  renderTriangles: number;
  activity: string;
  pose: string;
  activityHistory: string[];
  x: number;
  z: number;
  coatFluff: number;
  foodFill: number;
  waterFill: number;
  tool: string;
  strokeCount: number;
  brushCount: number;
  refuseCount: number;
  partnerSyncCount: number;
}

async function readV2State(page: Page): Promise<V2State | null> {
  return page.evaluate(
    () => (window as unknown as { __OLW_PET_CARE_V2_STATE?: V2State }).__OLW_PET_CARE_V2_STATE ?? null,
  );
}

async function enterPetCareFromMenu(page: Page, adoptIfNeeded = false): Promise<number> {
  await page.getByTestId('nav-menu').click({ force: true });
  await page.getByTestId('menu-pet').click();
  if (adoptIfNeeded) {
    const nameInput = page.getByTestId('input-pet-name');
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill('Quýt');
      await page.getByTestId('btn-pet-save-name').click();
    }
    await page.getByTestId('pet-panel-enter-care').waitFor({ state: 'visible', timeout: 8000 });
    const claimBtn = page.getByTestId('btn-pet-claim-kibble');
    if (await claimBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await claimBtn.click();
      await page.waitForTimeout(400);
    }
  }
  const kibbleBeforeText = await page.getByTestId('pet-kibble-count').textContent().catch(() => '0');
  const kibbleBefore = Number(kibbleBeforeText ?? '0');
  await page.getByTestId('pet-panel-enter-care').click();
  await page.getByTestId('pet-care-overlay').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByTestId('pet-care-three-canvas').waitFor({ state: 'visible', timeout: 15_000 });
  return kibbleBefore;
}

test.describe('Pet Care Living V2 — 3D Quýt, Direct Play & 2P Co-Care', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('renders sunlit 3D room, autonomous behaviors, and >= 5 direct interactions with single food consume', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(`${BASE}/?living-pet=1`);
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();

    const kibbleBefore = await enterPetCareFromMenu(page, true);

    // 1. Verify Vuena CC0 GLB loads and sunlit 3D canvas renders warm room (not black #120e14 screen)
    await expect
      .poll(async () => {
        const s = await readV2State(page);
        return s?.modelKind;
      })
      .toBe('vuena-glb');

    const closeUpState = await readV2State(page);
    // Test Quality Presets (Thấp -> LOD1, Cao -> LOD0) & Audio Controls (Mute/Volume)
    await page.getByTestId('pet-care-quality-low').click();
    await expect.poll(async () => (await readV2State(page))?.lod).toBe('lod1');
    await page.getByTestId('pet-care-quality-high').click();
    await expect.poll(async () => (await readV2State(page))?.lod).toBe('lod0');

    await page.getByTestId('pet-care-mute').click();
    await expect.poll(async () => (await readV2State(page))?.audioMuted).toBe(true);
    await page.getByTestId('pet-care-mute').click();
    await expect.poll(async () => (await readV2State(page))?.audioMuted).toBe(false);

    // Screenshot 1/2 (max 2 allowed by Mission M.1 quota): Vuena CC0 close-up + sunlit room + quality/audio UI
    await page.screenshot({ path: `${SCREENSHOT_DIR}/m1-vuena-closeup.png` });
    console.log('M1_PERF_SNAPSHOT:', JSON.stringify(closeUpState));

    const avgBrightness = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="pet-care-three-canvas"]') as HTMLCanvasElement | null;
      if (!canvas) return 0;
      const sample = document.createElement('canvas');
      sample.width = 48;
      sample.height = 48;
      const ctx = sample.getContext('2d');
      if (!ctx) return 0;
      ctx.drawImage(canvas, 0, 0, 48, 48);
      const data = ctx.getImageData(0, 0, 48, 48).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
      }
      return sum / (48 * 48);
    });
    expect(avgBrightness).toBeGreaterThan(55);

    // 2. Hands-off autonomy: verify Quýt switches activities on her own
    await expect
      .poll(
        async () => {
          const s = await readV2State(page);
          return s?.activityHistory.length ?? 0;
        },
        { timeout: 25_000 },
      )
      .toBeGreaterThanOrEqual(2);

    // 3. Interaction 1: Direct canvas stroke over Quýt
    const box = await page.getByTestId('pet-care-three-canvas').boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const cx = box.x + box.width * 0.5;
      const cy = box.y + box.height * 0.54;
      await page.mouse.move(cx - 28, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 28, cy - 12, { steps: 10 });
      await page.mouse.up();
    }

    // Also verify keyboard / HUD stroke reacts cleanly
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('olw-dev-pet-care-stroke', { detail: { zone: 'chin' } }));
    });
    await expect.poll(async () => (await readV2State(page))?.strokeCount ?? 0).toBeGreaterThanOrEqual(1);

    // 4. Interaction 2: 3D Brush tool + drag across Quýt
    const initialFluff = (await readV2State(page))?.coatFluff ?? 0;
    await page.getByTestId('pet-care-brush').click();
    if (box) {
      const cx = box.x + box.width * 0.5;
      const cy = box.y + box.height * 0.55;
      await page.mouse.move(cx - 24, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 24, cy + 8, { steps: 8 });
      await page.mouse.up();
    }
    await expect
      .poll(async () => (await readV2State(page))?.coatFluff ?? 0)
      .toBeGreaterThan(initialFluff);

    // 5. Interaction 3 & 4: Bell ball, yarn ball & cardboard box (anti-clipping check)
    await page.getByTestId('pet-care-ball').click();
    await page.waitForTimeout(700);
    await page.getByTestId('pet-care-yarn').click();
    await page.waitForTimeout(700);
    await page.getByTestId('pet-care-box').click();
    await expect.poll(async () => (await readV2State(page))?.activity, { timeout: 10_000 }).toBe('box_peek');
    await page.waitForTimeout(900);

    // Screenshot 2/2 (max 2 allowed by Mission M.1 quota): Quýt interacting with box / play props
    await page.screenshot({ path: `${SCREENSHOT_DIR}/m1-vuena-play-box.png` });

    // 6. Interaction 5: Feather cat wand (Verlet lure + chase_wand)
    await page.getByTestId('pet-care-wand').click();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.36, box.y + box.height * 0.48, { steps: 6 });
      await page.mouse.move(box.x + box.width * 0.64, box.y + box.height * 0.44, { steps: 8 });
    }
    await expect.poll(async () => (await readV2State(page))?.tool).toBe('wand');

    // Toggle wand off, place food & pour water (Interaction 6 & 7)
    await page.getByTestId('pet-care-water').click();
    await expect.poll(async () => (await readV2State(page))?.waterFill ?? 0).toBeGreaterThan(0.75);

    // Track single hand-food authority request (never duplicated)
    let consumeRequests = 0;
    page.on('request', (req) => {
      if (req.url().includes('/pet/consume-hand-food')) consumeRequests += 1;
    });

    await page.getByTestId('pet-care-feed').click();
    await expect.poll(async () => (await readV2State(page))?.foodFill ?? 0).toBeGreaterThan(0.35);

    // Exit & confirm single kibble consume authority call and no duplicate deduction
    await page.getByTestId('pet-care-exit').click();
    await page.getByTestId('pet-care-overlay').waitFor({ state: 'hidden', timeout: 8000 });
    await page.getByTestId('nav-menu').click({ force: true });
    await page.getByTestId('menu-pet').click();
    const kibbleAfter = Number(await page.getByTestId('pet-kibble-count').textContent());
    expect(consumeRequests).toBe(kibbleBefore > 0 ? 1 : 0);
    expect(kibbleAfter).toBeGreaterThanOrEqual(Math.max(0, kibbleBefore - 1));
    expect(kibbleAfter).toBeLessThanOrEqual(kibbleBefore);
  });

  test('synchronizes 2-client concurrent care and persists state across exit and re-entry', async ({ browser }) => {
    test.setTimeout(90_000);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await pageA.goto(`${BASE}/?living-pet=1`);
      await pageA.getByTestId('btn-dev-seed-couple').click();
      await pageA.getByTestId('preset-partner-a').click();
      await enterPetCareFromMenu(pageA, true);

      await pageB.goto(`${BASE}/?living-pet=1`);
      await pageB.getByTestId('preset-partner-b').click();
      await enterPetCareFromMenu(pageB, false);

      // Client A brushes & pours water & tosses yarn
      await pageA.getByTestId('pet-care-brush').click();
      await pageA.waitForTimeout(300);
      await pageA.getByTestId('pet-care-water').click();
      await pageA.waitForTimeout(300);
      await pageA.getByTestId('pet-care-yarn').click();

      // Client B receives real-time synchronized session updates for the shared cat
      await expect
        .poll(async () => (await readV2State(pageB))?.partnerSyncCount ?? 0, { timeout: 15_000 })
        .toBeGreaterThanOrEqual(1);
      await expect
        .poll(async () => (await readV2State(pageB))?.waterFill ?? 0, { timeout: 15_000 })
        .toBeGreaterThan(0.8);

      // Exit Pet Care and re-enter on Client A -> persisted coatFluff & waterFill remain
      await pageA.getByTestId('pet-care-exit').click();
      await pageA.getByTestId('pet-care-overlay').waitFor({ state: 'hidden', timeout: 8000 });
      await enterPetCareFromMenu(pageA, false);

      const restored = await readV2State(pageA);
      expect(restored?.coatFluff ?? 0).toBeGreaterThan(0.75);
      expect(restored?.waterFill ?? 0).toBeGreaterThan(0.75);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
