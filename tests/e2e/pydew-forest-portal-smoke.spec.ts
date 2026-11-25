import { expect, test } from '@playwright/test';
import {
  enterExtendedWorldGame,
  expectCanvasMapId,
  seedDevCouple,
  vqgJumpMap,
} from './helpers/extendedWorldVqg';

const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || '4173'}`;

test.describe('PyDew forest portal smoke', () => {
  test('VQG jump forest and return via village nav', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'portal smoke on desktop');
    test.setTimeout(60_000);

    await seedDevCouple(request, BASE);
    const canvas = await enterExtendedWorldGame(page, BASE);

    await vqgJumpMap(page, canvas, 'forest', 8, 26);

    await page.getByTestId('nav-outdoor').click({ force: true });
    await expectCanvasMapId(canvas, 'village');
    await expect(page.getByTestId('nav-outdoor')).toBeVisible();
  });
});