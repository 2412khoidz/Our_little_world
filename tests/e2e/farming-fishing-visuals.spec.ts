import { expect, test } from '@playwright/test';

test('both fishing modes restore shared focus and keep controls reachable on rotation', async ({ page, request, isMobile }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? '4173'}`;
  await request.post(`${base}/api/dev-lan/reset`, { data: {} });
  await request.post(`${base}/api/dev-lan/seed-couple`, { data: {} });
  await page.goto('/?vqg-capture=1');
  await page.getByTestId('preset-partner-a').click();
  await expect(page.getByTestId('game-canvas-host').locator('canvas')).toBeVisible({ timeout: 45_000 });

  const openFishing = async (spot: 'meadow_pond' | 'east_stream') => {
    await page.waitForFunction(() => Boolean((window as CaptureWindow).__OLW_VQG?.openFishing));
    await page.evaluate((id) => (window as CaptureWindow).__OLW_VQG?.openFishing(id), spot);
  };
  const close = (testId: string) => page.getByTestId(testId).getByRole('button', { name: 'Đóng', exact: true }).first().click();
  await openFishing('meadow_pond');
  const chill = page.getByTestId('donor-fishing-modal');
  await expect(chill.getByTestId('tidefall-cast-btn')).toBeVisible();
  if (isMobile) await page.setViewportSize({ width: 932, height: 430 });
  await chill.getByTestId('fishing-fullscreen-btn').click();
  await expect(chill).toHaveAttribute('data-focus-expanded', '1');
  await expect(chill.getByTestId('tidefall-cast-btn')).toBeInViewport();
  await close('donor-fishing-modal');
  await expect(chill).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);

  await openFishing('east_stream');
  await chill.getByRole('button', { name: 'Kéo dây giữ lực' }).click();
  const tension = page.getByTestId('donor-stream-fishing-modal');
  await expect(tension.getByRole('button', { name: 'Quăng cần' })).toBeInViewport();
  if (isMobile) await page.setViewportSize({ width: 430, height: 932 });
  await tension.getByTestId('fishing-fullscreen-btn').click();
  await expect(tension).toHaveAttribute('data-focus-expanded', '1');
  await expect(tension.getByRole('button', { name: 'Quăng cần' })).toBeInViewport();
  await close('donor-stream-fishing-modal');
  await expect(tension).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);

  const appFullscreen = page.getByTestId('btn-global-fullscreen');
  if (isMobile) {
    await expect(appFullscreen).toBeVisible();
    await appFullscreen.click();
    await expect(appFullscreen).toHaveAttribute('aria-pressed', 'true');
    await openFishing('meadow_pond');
    await expect(chill.getByTestId('fishing-fullscreen-btn')).toHaveCount(0);
    await close('donor-fishing-modal');
    await expect(appFullscreen).toHaveAttribute('aria-pressed', 'true');
    await appFullscreen.click();
  }
});

interface CaptureWindow extends Window {
  __OLW_VQG?: { openFishing: (id: 'meadow_pond' | 'east_stream') => void };
}
