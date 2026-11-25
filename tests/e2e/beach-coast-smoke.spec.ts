import { expect, test } from '@playwright/test';
import {
  enterExtendedWorldGame,
  expectCanvasMapId,
  seedDevCouple,
  vqgJumpMap,
} from './helpers/extendedWorldVqg';

const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || '4173'}`;

test.describe('Gull Bay coast smoke', () => {
  test('VQG beach pier + lifebuoy waypoint', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'coast smoke on desktop');
    test.setTimeout(60_000);

    await seedDevCouple(request, BASE);
    const canvas = await enterExtendedWorldGame(page, BASE);

    await vqgJumpMap(page, canvas, 'beach', 1, 16);
    await expectCanvasMapId(canvas, 'beach');
    await expect(page.getByTestId('nav-outdoor')).toBeVisible();
  });
});