import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const QA_DIR = process.env.OLW_LIVING_HOME_OUTPUT_DIR || path.join(process.cwd(), 'test-results', 'v015-living-home');

function ensureQaDir() {
  fs.mkdirSync(QA_DIR, { recursive: true });
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('V0.1.5 Living Home — Multi-Device E2E & Visual QA', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
    ensureQaDir();
  });

  test('runs complete Living Home loop across Mây & Nắng without console errors and captures screenshots', async ({
    browser,
  }, testInfo) => {
    const { viewport, hasTouch, isMobile } = testInfo.project.use;
    const isMobileProj = Boolean(isMobile);
    const options = { viewport, hasTouch, isMobile };

    const ctxMay = await browser.newContext(options);
    const ctxNang = await browser.newContext(options);
    const pageA = await ctxMay.newPage();
    const pageB = await ctxNang.newPage();

    const errors: string[] = [];
    pageA.on('pageerror', (e) => errors.push(`Mây pageerror: ${e.message}`));
    pageB.on('pageerror', (e) => errors.push(`Nắng pageerror: ${e.message}`));

    // 1. Seed paired 2/2 home then sign in Mây & Nắng in isolated browser contexts
    await pageA.goto('/');
    await pageA.getByTestId('btn-dev-seed-couple').click();
    await pageA.getByTestId('preset-partner-a').click();
    await expect(pageA.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();

    await pageB.goto('/');
    await pageB.getByTestId('preset-partner-b').click();
    await expect(pageB.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();

    await expect(pageA.getByTestId('partner-presence-pill')).toContainText('Nắng đang ở Trong nhà');
    await expect(pageB.getByTestId('partner-presence-pill')).toContainText('Mây đang ở Trong nhà');
    await assertNoHorizontalOverflow(pageA);
    await assertNoHorizontalOverflow(pageB);

    // 2. Claim daily free kibble (OLW-015-01)
    await pageA.getByTestId('nav-menu').click();
    await pageA.getByTestId('menu-inventory').click();
    await expect(pageA.getByTestId('inventory-modal')).toBeVisible();
    await pageA.getByTestId('btn-claim-free-kibble').click();
    await expect(pageA.getByTestId('tab-inventory-shared')).toContainText('(3)');
    await pageA.getByRole('button', { name: 'Đóng' }).first().click();

    // 3. Adopt cat 'Quýt' & feed kibble (OLW-015-03/04)
    await pageA.getByTestId('nav-menu').click();
    await pageA.getByTestId('menu-pet').click();
    await expect(pageA.getByTestId('pet-panel')).toBeVisible();
    await pageA.getByTestId('input-pet-name').fill('Quýt');
    await pageA.getByTestId('btn-pet-save-name').click();
    await expect(pageA.getByTestId('pet-name-heading')).toHaveText('Quýt');
    await pageA.getByTestId('btn-pet-feed').click();
    await expect(pageA.getByTestId('pet-kibble-count')).toHaveText('2');
    if (isMobileProj) {
      await assertNoHorizontalOverflow(pageA);
      await pageA.screenshot({ path: path.join(QA_DIR, 'mobile-pet-panel.png') });
    }
    await pageA.getByRole('button', { name: 'Đóng' }).first().click();

    // Capture main Home + Pet + Couple Action Bar shot
    await pageA.waitForTimeout(350);
    await pageA.screenshot({
      path: path.join(
        QA_DIR,
        isMobileProj ? 'mobile-home-actionbar.png' : 'desktop-home-pet-couple.png',
      ),
    });

    // 4. Shared Pomodoro Co-Presence (OLW-015-05/06)
    await pageA.getByTestId('nav-menu').click();
    await pageA.getByTestId('menu-study').click();
    await expect(pageA.getByTestId('study-panel')).toBeVisible();
    await pageA.getByTestId('btn-study-start').click();
    await expect(pageA.getByTestId('study-countdown')).toBeVisible();
    if (isMobileProj) {
      await assertNoHorizontalOverflow(pageA);
      await pageA.screenshot({ path: path.join(QA_DIR, 'mobile-pomodoro-panel.png') });
    }
    await pageA.getByRole('button', { name: 'Đóng' }).first().click();
    await expect(pageA.getByTestId('study-floating-pill')).toBeVisible();
    await expect(pageB.getByTestId('study-floating-pill')).toBeVisible();

    // 5. Couple interactions: Emote + Hug invite/accept across live sessions (OLW-015-07)
    await pageA.getByTestId('couple-emote-heart').click();
    await pageA.getByTestId('couple-hug-btn').click();
    await expect(pageB.getByTestId('couple-hug-invite-toast')).toBeVisible();
    await pageB.getByTestId('couple-hug-accept').click();
    await expect(pageB.getByTestId('couple-hug-invite-toast')).toHaveCount(0);

    // 6. Mailbox surprise gift + XSS plain-text check (OLW-015-02)
    const secretPayload = '<img src=x onerror=alert(1)> Yêu Nắng';
    await pageA.getByTestId('nav-menu').click();
    await pageA.getByTestId('menu-mailbox').click();
    await expect(pageA.getByTestId('mailbox-modal')).toBeVisible();
    await pageA.getByTestId('mailbox-tab-compose').click();
    await pageA.getByTestId('mailbox-input-subject').fill('Quà bất ngờ');
    await pageA.getByTestId('mailbox-input-body').fill(secretPayload);
    await pageA.getByTestId('mailbox-select-gift').selectOption('shared:pet_kibble_basic');
    await pageA.getByTestId('mailbox-input-qty').fill('1');
    await expect(pageA.getByTestId('mailbox-checkbox-surprise')).toBeChecked();
    await pageA.getByTestId('mailbox-submit-send').click();
    await expect(pageA.getByTestId('mailbox-tab-sent')).toContainText('(1)');
    await pageA.getByRole('button', { name: 'Đóng' }).first().click();

    await pageB.getByTestId('nav-menu').click();
    await expect(pageB.getByTestId('menu-mailbox')).toContainText('(1 mới)');
    await pageB.getByTestId('menu-mailbox').click();
    await expect(pageB.getByTestId('mailbox-modal')).toBeVisible();
    await expect(pageB.getByTestId('mailbox-modal')).not.toContainText('Yêu Nắng');
    if (isMobileProj) {
      await assertNoHorizontalOverflow(pageB);
      await pageB.screenshot({ path: path.join(QA_DIR, 'mobile-mailbox-modal.png') });
    }
    await pageB.locator('[data-testid^="mailbox-open-"]').first().click();
    await expect(pageB.locator('[data-testid^="mailbox-body-"]').first()).toHaveText(secretPayload);
    await pageB.getByRole('button', { name: 'Đóng' }).first().click();

    // 7. Garden map & unread mailbox check visually
    if (isMobileProj) {
      await pageA.getByTestId('nav-garden').click();
      await expect(pageA.getByTestId('game-canvas-host').locator('canvas')).toHaveAttribute(
        'data-map-id',
        'garden',
      );
      await pageA.waitForTimeout(400);
      await pageA.screenshot({ path: path.join(QA_DIR, 'mobile-garden-mailbox.png') });
      await pageA.getByTestId('nav-home').click();
      await expect(pageA.getByTestId('game-canvas-host').locator('canvas')).toHaveAttribute(
        'data-map-id',
        'home',
      );
    }

    // 8. Dev Console K6 sanitized snapshot export verification (OLW-015-08)
    await pageA.getByTestId('nav-menu').click();
    await pageA.getByTestId('menu-dev-console').click();
    await expect(pageA.getByTestId('dev-console-drawer')).toBeVisible();
    await pageA.getByTestId('dev-snapshot-export').click();
    await expect(pageA.getByTestId('dev-snapshot-textarea')).toHaveValue(/"schemaVersion":\s*1/);
    const rawSnapshot = await pageA.getByTestId('dev-snapshot-textarea').inputValue();
    expect(rawSnapshot).not.toContain('Yêu Nắng');
    expect(rawSnapshot).not.toContain('@ourlittleworld.test');
    await pageA.getByRole('button', { name: 'Đóng' }).first().click();

    // 9. Mobile landscape layout & visual capture check (844x390)
    if (isMobileProj) {
      await pageA.setViewportSize({ width: 844, height: 390 });
      await pageA.waitForTimeout(350);
      await assertNoHorizontalOverflow(pageA);
      await pageA.screenshot({ path: path.join(QA_DIR, 'mobile-landscape-home.png') });
    }

    expect(errors).toEqual([]);
    await ctxMay.close();
    await ctxNang.close();
  });
});
