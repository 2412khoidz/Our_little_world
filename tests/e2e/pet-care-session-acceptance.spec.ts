import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const longRun = process.env.OLW_ACCEPTANCE_LONG === '1';
const soakMinutes = Number(process.env.OLW_SOAK_MINUTES ?? (longRun ? 7 : 1));
test.use({ trace: longRun ? 'on' : 'on' });

/**
 * Owner checklist — 60s CI default · 7m when OLW_ACCEPTANCE_LONG=1 (trace + summary artifact).
 */
test.describe('Pet care — owner session', () => {
  test.describe.configure({ retries: longRun ? 0 : 1 });
  const sessionMs = longRun ? soakMinutes * 60_000 : 60_000;

  test.beforeEach(async ({ request }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
    const res = await request.post(`${base}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('varied care interactions over multi-minute session', async ({ page }) => {
    test.setTimeout(sessionMs + 60_000);

    await page.goto('/?living-pet=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('nav-menu').click({ force: true });
    await page.getByTestId('menu-pet').click();
    await page.getByTestId('input-pet-name').fill('Quýt');
    await page.getByTestId('btn-pet-save-name').click();
    await page.getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('living-pet-telemetry').waitFor({ timeout: 30_000 });

    await page.evaluate(() => {
      window.dispatchEvent(new Event('olw-dev-pet-care-fast-autonomy'));
      window.dispatchEvent(new Event('olw-dev-enter-pet-care'));
    });
    await expect
      .poll(
        async () => {
          const overlay = await page.getByTestId('pet-care-overlay').isVisible().catch(() => false);
          if (!overlay) return false;
          const canvas = page.getByTestId('game-canvas-host').locator('canvas');
          return canvas.evaluate((c) => c.dataset.petCareRig === 'portrait');
        },
        { timeout: 25_000 },
      )
      .toBe(true);

    const reactions = new Set<string>();
    let autonomyQuiet = 0;
    const started = Date.now();

    while (Date.now() - started < sessionMs) {
      await page.getByTestId('pet-care-call').click();
      reactions.add('call');
      await page.waitForTimeout(1200);
      await page.getByTestId('pet-care-brush').click();
      reactions.add('brush');
      await page.waitForTimeout(1800);
      await page.getByTestId('pet-care-water').click();
      reactions.add('water');
      await page.waitForTimeout(2200);

      await page.keyboard.press('3');
      await page.keyboard.press('KeyJ');
      reactions.add('toy');
      await page.waitForTimeout(2800);

      for (const zone of ['chin', 'head', 'back'] as const) {
        await page.evaluate((z) => {
          window.dispatchEvent(new CustomEvent('olw-dev-pet-care-stroke', { detail: { zone: z } }));
        }, zone);
        await page.waitForTimeout(400);
      }
      reactions.add('stroke');
      await page.waitForTimeout(2000);

      await page.keyboard.press('1');
      await page.keyboard.press('KeyJ');
      reactions.add('food');
      await page.waitForTimeout(3500);

      await page.getByTestId('pet-care-observe').click();
      reactions.add('observe');
      await page.waitForTimeout(4000);

      await page.getByTestId('pet-care-stroke-hint').waitFor({ state: 'visible' });

      if (longRun) {
        await page.waitForTimeout(3500);
        const title = await page.locator('.pet-care-overlay__title').innerText();
        if (title.includes('Phiên:')) autonomyQuiet += 1;
      }
    }

    const soakStats = await page.evaluate(() => {
      const s = (window as unknown as {
        __OLW_PET_CARE_SOAK?: {
          autonomyActions: string[];
          squeaks: string[];
          strokeZones: string[];
          bubblesVi: string[];
        };
      }).__OLW_PET_CARE_SOAK;
      if (!s) return null;
      return {
        autonomyActions: [...s.autonomyActions],
        squeaks: [...s.squeaks],
        strokeZones: [...s.strokeZones],
        bubblesVi: [...s.bubblesVi],
      };
    });

    const elapsedMs = Date.now() - started;
    expect(reactions.size).toBeGreaterThanOrEqual(5);
    if (longRun) {
      expect(elapsedMs).toBeGreaterThanOrEqual(Math.min(sessionMs, 300_000));
      expect(autonomyQuiet).toBeGreaterThanOrEqual(2);
      const autonomyUnique = new Set(soakStats?.autonomyActions ?? []);
      expect(autonomyUnique.size).toBeGreaterThanOrEqual(2);
    }
    mkdirSync('/opt/cursor/artifacts', { recursive: true });
    const storeMedia =
      process.env.OLW_PROJECT_STORE_MEDIA ||
      '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media';
    try {
      mkdirSync(storeMedia, { recursive: true });
    } catch {
      // optional project-store write when path not mounted
    }
    const summary = {
      elapsedMs,
      soakMinutes,
      reactions: [...reactions],
      longRun,
      autonomyGoalTicks: autonomyQuiet,
      soakStats,
      autonomyActionKinds: [...new Set((soakStats?.autonomyActions ?? []) as string[])],
      head: process.env.GITHUB_SHA ?? 'local',
    };
    writeFileSync('/opt/cursor/artifacts/pet-care-session-summary.json', JSON.stringify(summary, null, 2));
    try {
      writeFileSync(`${storeMedia}/pet-care-soak-summary.json`, JSON.stringify(summary, null, 2));
    } catch {
      // ignore
    }
    await page.screenshot({ path: '/opt/cursor/artifacts/pet-care-session-final.png' });
    await test.info().attach('pet-care-session-summary', {
      body: JSON.stringify(summary),
      contentType: 'application/json',
    });
  });
});