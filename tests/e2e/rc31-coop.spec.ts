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
  test.skip(isMobile, 'Two coordinated browser contexts');
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
    const quantity = trade.getByRole('spinbutton');
    await expect(quantity).toHaveCount(1);
    await quantity.fill('2');
    await trade.getByRole('button', { name: 'Đưa vào' }).click();
    await expect(trade.getByText(/×2 · Thường/)).toBeVisible();
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
