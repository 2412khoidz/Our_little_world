import { expect, test } from '@playwright/test';
import { emitVqgJump, enterExtendedWorldGame } from './helpers/extendedWorldVqg';
import { INITIAL_HOME_STORAGE_QUERY } from '../../src/shared/inventory/physicalInventoryApi';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.skip(process.env.OLW_DEV_LAN_PHYSICAL_INVENTORY !== '1', 'INV.2 Dev LAN');

const api = '/api/dev-lan';
const may = '11111111-1111-4111-8111-111111111111';
const nang = '22222222-2222-4222-8222-222222222222';
const headers = (id: string) => ({ 'x-dev-user-id': id });

test('mobile trade and heart targets stay separate from door and cabinet buttons', async ({ page, request, baseURL, isMobile }) => {
  test.skip(!isMobile, 'Touch layout');
  await request.post(api + '/reset', { data: {} });
  await request.post(api + '/seed-couple', { data: {} });
  const canvas = await enterExtendedWorldGame(page, baseURL!);
  const context = page.getByTestId('btn-context-primary');
  const assertDisjoint = async () => {
    const action = await context.boundingBox();
    expect(action).not.toBeNull();
    for (const target of [page.getByTestId('couple-emote-fab'), page.getByRole('button', { name: 'Mời trao đổi' })]) {
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x + box!.width <= action!.x || action!.x + action!.width <= box!.x
        || box!.y + box!.height <= action!.y || action!.y + action!.height <= box!.y).toBe(true);
    }
  };
  for (const [width, height] of [[393, 873], [430, 932], [873, 393], [932, 430]]) {
    await page.setViewportSize({ width: width!, height: height! });
    for (const [x, label] of [[1, 'Kho nhà'], [8, 'Ra vườn']] as const) {
      await emitVqgJump(page, 'home', x, 10);
      await expect(canvas).toHaveAttribute('data-player-tile-x', String(x));
      await expect(context).toContainText(label === 'Kho nhà' ? label : 'Đi vào');
      await assertDisjoint();
    }
    const fullscreen = page.getByTestId('btn-global-fullscreen');
    await fullscreen.click();
    await expect(fullscreen).toHaveAttribute('aria-pressed', 'true');
    await assertDisjoint();
    await fullscreen.click();
  }
});

test('two Dev LAN players claim their own tools and settle a partial direct gift', async ({ page, request, browser, baseURL, isMobile }) => {

  await request.post(api + '/reset', { data: {} });
  const seed = await request.post(api + '/seed-couple', { data: {} });
  const worldId = (await seed.json()).data.world.id as string;
  const other = await browser.newContext({ baseURL });
  try {
    const receiver = await other.newPage();
    const canvas = await enterExtendedWorldGame(page, baseURL!);
    await receiver.goto('/?extended-world=1&vqg-capture=1');
    await receiver.getByTestId('preset-partner-b').click();
    await expect(receiver.getByTestId('physical-hotbar')).toBeVisible();
    const read = async (actor: string, storage = false) => (await (await request.get(api + '/inventory/physical', {
      headers: headers(actor), params: storage ? { worldId, storage: 'home' } : { worldId },
    })).json()).data;
    for (const [player, actor] of [[page, may], [receiver, nang]] as const) {
      await expect.poll(async () => {
        const view = await read(actor);
        if (!view.canDrop) await player.keyboard.press('ArrowRight', { delay: 140 });
        return view.canDrop;
      }).toBe(true);
      await emitVqgJump(player, 'home', 1, 10);
      await expect.poll(async () => (await read(actor, true)).storage?.kind).toBe('home');
      await player.getByRole('button', { name: 'Mở ba lô' }).click();
      await player.getByRole('button', { name: /Nhận dụng cụ cơ bản/ }).click();
      await expect.poll(async () => (await read(actor)).backpack.find(({ stack }: { stack?: { itemSku: string } }) =>
        stack?.itemSku === 'rod_basic')?.stack.metadata.starterOwner).toBe(actor);
      await player.keyboard.press('Escape');
    }
    await expect(canvas).toHaveAttribute('data-map-id', 'home');
    const initial = await read(may, true);
    const seedSlot = initial.storage.slots.find(({ stack }: { stack?: { itemSku: string } }) => stack?.itemSku === 'seed_wheat');
    expect(seedSlot).toBeTruthy();
    const moved = await request.post(api + '/inventory/physical', {
      headers: headers(may), data: { worldId, version: initial.version, idempotencyKey: 'rc31-gift-move',
        query: INITIAL_HOME_STORAGE_QUERY, command: { kind: 'transfer', from: { container: 'home', index: seedSlot.index },
          to: 'backpack', qty: 5, stackId: seedSlot.stack.id } },
    });
    expect(moved.ok(), await moved.text()).toBe(true);
    await page.getByRole('button', { name: 'Mời trao đổi' }).click();
    await receiver.getByRole('button', { name: 'Đồng ý' }).click();
    const trade = page.getByRole('dialog', { name: 'Trao đổi vật phẩm' });
    await page.setViewportSize(isMobile ? { width: 393, height: 700 } : { width: 1024, height: 460 });
    const slot = trade.getByRole('button', { name: /Hạt giống lúa mì ×5/ });
    const original = await slot.boundingBox();
    await slot.click();
    expect(await slot.boundingBox()).toEqual(original);
    await trade.getByRole('button', { name: '+1', exact: true }).click();
    await trade.getByRole('button', { name: 'Đưa vào' }).click();
    await expect(trade.getByRole('button', { name: /Hạt giống lúa mì ×2/ })).toBeVisible();
    const confirm = trade.getByRole('button', { name: 'Xác nhận đề nghị' });
    await expect(confirm).toBeInViewport();
    await expect(trade.getByRole('button', { name: 'Hủy' })).toBeInViewport();
    await trade.getByRole('button', { name: 'Xác nhận đề nghị' }).click();
    await receiver.getByRole('button', { name: 'Xác nhận đề nghị' }).click();
    await expect.poll(async () => (await read(nang)).backpack.find(({ stack }: { stack?: { itemSku: string } }) =>
      stack?.itemSku === 'seed_wheat')?.stack.qty).toBe(2);
    expect((await read(may)).backpack.find(({ stack }: { stack?: { itemSku: string } }) => stack?.itemSku === 'seed_wheat')?.stack.qty).toBe(3);
    await expect(trade).toBeHidden();
  } finally {
    await other.close();
  }
});

test('shop scrolls to the last purchase while the header stays reachable', async ({ page, request, baseURL, isMobile }) => {
  await request.post(api + '/reset', { data: {} });
  await request.post(api + '/seed-couple', { data: {} });
  await enterExtendedWorldGame(page, baseURL!);
  const shop = page.getByTestId('farm-economy-panel');
  await page.waitForFunction(() => typeof (window as unknown as { __OLW_VQG?: { openFarmMarket?: unknown } })
    .__OLW_VQG?.openFarmMarket === 'function');
  for (const [width, height] of isMobile ? [[393, 700], [430, 932], [873, 380], [932, 430]] : [[1280, 600]]) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.evaluate(() =>
      (window as unknown as { __OLW_VQG: { openFarmMarket: () => void } }).__OLW_VQG.openFarmMarket());
    await expect(shop).toBeVisible();
    await shop.getByRole('button', { name: '40+ Hạt & Hoa' }).click();
    const close = shop.getByRole('button', { name: 'Đóng' });
    const wallet = shop.getByTestId('farm-economy-wallet');
    const scroller = shop.getByTestId('farm-economy-products');
    expect(await scroller.evaluate((el) => el.scrollHeight > el.clientHeight && el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const last = scroller.getByRole('button', { name: 'Mua', exact: true }).last();
    await last.scrollIntoViewIfNeeded();
    await expect(close).toBeInViewport();
    await expect(wallet).toBeInViewport();
    const bounds = (await shop.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height! + 1);
    if (width === (isMobile ? 393 : 1280)) {
      const coins = Number(await shop.getByTestId('farm-wallet-coins').textContent());
      await last.click();
      await expect.poll(async () => Number(await shop.getByTestId('farm-wallet-coins').textContent())).toBeLessThan(coins);
    }
    await close.click();
    await expect(shop).toBeHidden();
  }
});
