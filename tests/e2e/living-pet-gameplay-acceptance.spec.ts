import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const ARTIFACT_DIR = process.env.OLW_LIVING_PET_ARTIFACT_DIR || '/opt/cursor/artifacts';

test.describe('Living pet — 3 min gameplay acceptance trace', () => {
  test.beforeEach(async ({ request }) => {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  async function seedPetHome(page: Page) {
    await page.goto('/?living-pet=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await expect(page.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();
    await page.getByTestId('nav-menu').click({ force: true });
    await page.getByTestId('menu-pet').click();
    await page.getByTestId('input-pet-name').fill('Quýt');
    await page.getByTestId('btn-pet-save-name').click();
    await page.getByRole('button', { name: 'Đóng' }).first().click();
    await expect(page.getByTestId('living-pet-telemetry')).toHaveAttribute('data-visible', '1', {
      timeout: 20_000,
    });
  }

  test('records ~3 min session with periodic screenshots', async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    await seedPetHome(page);

    const tel = page.getByTestId('living-pet-telemetry');
  const traceLog: string[] = [];

    for (let minute = 0; minute < 3; minute += 1) {
      for (let sec = 0; sec < 60; sec += 15) {
        await page.waitForTimeout(15_000);
        const x = await tel.getAttribute('data-x');
        const y = await tel.getAttribute('data-y');
        const anim = await tel.getAttribute('data-anim');
        const loco = await tel.getAttribute('data-loco');
        const phase = await tel.getAttribute('data-brain-phase');
        traceLog.push(
          `t=${minute}:${String(sec).padStart(2, '0')} x=${x} y=${y} anim=${anim} loco=${loco} phase=${phase}`,
        );
        if (sec === 0) {
          await page.screenshot({
            path: path.join(ARTIFACT_DIR, `living-pet-acceptance-min${minute}.png`),
          });
        }
      }
      if (minute === 1) {
        await page.evaluate(() => window.dispatchEvent(new Event('olw-dev-living-pet-food-offer')));
      }
    }

    fs.writeFileSync(path.join(ARTIFACT_DIR, 'living-pet-acceptance-trace.txt'), traceLog.join('\n') + '\n');

    const dist = traceLog
      .map((line) => {
        const m = line.match(/x=([\d.]+) y=([\d.]+)/);
        return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
      })
      .filter(Boolean) as Array<{ x: number; y: number }>;
    const origin = dist[0]!;
    const maxDist = Math.max(...dist.map((p) => Math.hypot(p.x - origin.x, p.y - origin.y)));
    expect(maxDist).toBeGreaterThan(15);

    await testInfo.attach('living-pet-acceptance-trace.txt', {
      path: path.join(ARTIFACT_DIR, 'living-pet-acceptance-trace.txt'),
      contentType: 'text/plain',
    });
  });
});