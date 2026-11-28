import { expect, test, type Locator, type Page } from '@playwright/test';
import { enterExtendedWorldGame, seedDevCouple } from './helpers/extendedWorldVqg';

const physicalInventory = process.env.OLW_DEV_LAN_PHYSICAL_INVENTORY === '1';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

async function jump(page: Page, canvas: Locator, map: string, x: number, y: number) {
  await page.evaluate(([mapId, tileX, tileY]) => {
    const dev = window as unknown as { __OLW_VQG: { jump: (map: string, x: number, y: number) => void } };
    dev.__OLW_VQG.jump(mapId, tileX, tileY);
  }, [map, x, y] as const);
  await expect(canvas).toHaveAttribute('data-map-id', map);
  await expect(canvas).toHaveAttribute('data-player-tile-x', String(x));
  await expect(canvas).toHaveAttribute('data-player-tile-y', String(y));
}

test.beforeEach(async ({ request, baseURL }) => {
  await seedDevCouple(request, baseURL!);
});

test('J dispatches doors, furniture, world objects and NPC dialogue before and after the backpack', async ({ page, baseURL }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Desktop keyboard');
  const canvas = await enterExtendedWorldGame(page, baseURL!);
  const context = page.getByTestId('btn-context-primary');
  const bag = page.getByTestId(physicalInventory ? 'physical-inventory-modal' : 'inventory-modal');

  await jump(page, canvas, 'home', 8, 13);
  await expect(context).toContainText('Ra khu vườn');
  await page.keyboard.press('j');
  await expect(canvas).toHaveAttribute('data-map-id', 'garden');

  await jump(page, canvas, 'home', 8, 13);
  await page.keyboard.press('i');
  await expect(bag).toBeVisible();
  await page.keyboard.press('j');
  await expect(canvas).toHaveAttribute('data-map-id', 'home');
  await page.keyboard.press('Escape');
  await expect(bag).toBeHidden();
  await expect(context).toContainText('Ra khu vườn');
  await page.keyboard.press('j');
  await expect(canvas).toHaveAttribute('data-map-id', 'garden');

  await jump(page, canvas, 'home', 3, 4);
  await expect(context).toContainText('Thay trang phục');
  await page.keyboard.press('j');
  await expect(page.getByTestId('input-avatar-nickname')).toBeVisible();
  await page.getByRole('dialog', { name: 'Tùy chỉnh ngoại hình' }).getByRole('button', { name: 'Đóng' }).click();

  await jump(page, canvas, 'home', 9, 2);
  await expect(context).toContainText('khung ảnh');
  await page.keyboard.press('j');
  await expect(page.getByTestId('photo-frame-modal')).toBeVisible();
  await page.getByTestId('photo-frame-modal').getByRole('button', { name: 'Đóng' }).click();

  await jump(page, canvas, 'village', 43, 31);
  await expect(context).toContainText('Trò chuyện');
  await page.keyboard.press('j');
  await expect(page.getByTestId('npc-dialogue-overlay')).toBeVisible();
});

test('WASD resumes after backpack and digit shortcuts address the active hotbar', async ({ page, baseURL }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Desktop keyboard');
  const canvas = await enterExtendedWorldGame(page, baseURL!);
  const hotbar = page.getByTestId(physicalInventory ? 'physical-hotbar' : 'game-hotbar');
  await expect(hotbar).toBeVisible();
  const id = physicalInventory ? 'physical-hotbar-' : 'hotbar-slot-';
  const count = physicalInventory ? 9 : 8;

  for (let key = 1; key <= count; key++) {
    const slot = page.getByTestId(id + key);
    const occupied = physicalInventory
      ? Number(await slot.getAttribute('data-qty')) > 0
      : !(await slot.getAttribute('aria-label'))?.startsWith('Ô trống');
    await page.keyboard.press(String(key));
    if (occupied) await expect(slot).toHaveAttribute('aria-pressed', 'true');
    else await expect(slot).toHaveAttribute('aria-pressed', 'false');
  }
  if (!physicalInventory) {
    await page.keyboard.press('1');
    await page.keyboard.press('9');
    await expect(page.getByTestId('hotbar-slot-1')).toHaveAttribute('aria-pressed', 'true');
  }

  for (const [key, axis, sign] of [['w', 'y', -1], ['s', 'y', 1], ['a', 'x', -1], ['d', 'x', 1]] as const) {
    await jump(page, canvas, 'home', 8, 9);
    await page.keyboard.press('i');
    const bag = page.getByTestId(physicalInventory ? 'physical-inventory-modal' : 'inventory-modal');
    await expect(bag).toBeVisible();
    await page.keyboard.down(key);
    await page.waitForTimeout(240);
    await page.keyboard.up(key);
    await expect(canvas).toHaveAttribute('data-player-tile-' + axis, axis === 'x' ? '8' : '9');
    await page.keyboard.press('Escape');
    await expect(bag).toBeHidden();
    await page.keyboard.down(key);
    try {
      await expect.poll(async () => {
        const current = Number(await canvas.getAttribute('data-player-tile-' + axis));
        return (current - (axis === 'x' ? 8 : 9)) * sign;
      }).toBeGreaterThan(0);
    } finally {
      await page.keyboard.up(key);
    }
  }
});

test('touch interaction button dispatches the nearby world action', async ({ page, baseURL }, info) => {
  test.skip(info.project.name === 'chromium-desktop', 'Touch viewport');
  const canvas = await enterExtendedWorldGame(page, baseURL!);
  await jump(page, canvas, 'home', 8, 13);
  const button = page.getByTestId('main-game-touch-actions').getByTestId('btn-context-primary');
  await expect(button).toHaveAccessibleName('Ra khu vườn');
  await button.tap();
  await expect(canvas).toHaveAttribute('data-map-id', 'garden');
});

test('standard gamepad opens and closes the backpack, then dispatches the door once', async ({ page, baseURL }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Gamepad API');
  await page.addInitScript(() => {
    const held = new Set<number>();
    const pad = { mapping: 'standard', buttons: Array.from({ length: 16 }, (_, index) => ({
      get pressed() { return held.has(index); },
    })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
    Object.assign(window, { pressWorldTestButton: (index: number, pressed: boolean) => {
      if (pressed) held.add(index);
      else held.delete(index);
    } });
  });
  const setButton = (index: number, pressed: boolean) => page.evaluate(([idx, isPressed]) => {
    const dev = window as unknown as { pressWorldTestButton: (index: number, pressed: boolean) => void };
    dev.pressWorldTestButton(idx, isPressed);
  }, [index, pressed] as const);
  const canvas = await enterExtendedWorldGame(page, baseURL!);
  await jump(page, canvas, 'home', 8, 13);
  const bag = page.getByTestId(physicalInventory ? 'physical-inventory-modal' : 'inventory-modal');
  await setButton(3, true);
  await expect(bag).toBeVisible();
  await setButton(3, false);
  await setButton(0, true);
  await page.waitForTimeout(160);
  await expect(canvas).toHaveAttribute('data-map-id', 'home');
  await setButton(0, false);
  await setButton(1, true);
  await expect(bag).toBeHidden();
  await setButton(1, false);
  await expect(page.getByTestId('btn-context-primary')).toContainText('Ra khu vườn');
  await setButton(0, true);
  await expect(canvas).toHaveAttribute('data-map-id', 'garden');
  await page.waitForTimeout(220);
  await expect(canvas).toHaveAttribute('data-map-id', 'garden');
});
