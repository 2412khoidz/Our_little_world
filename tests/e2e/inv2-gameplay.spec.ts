import { expect, test } from '@playwright/test';
import { emitVqgJump, enterExtendedWorldGame } from './helpers/extendedWorldVqg';
import { INITIAL_HOME_STORAGE_QUERY, type PhysicalInventoryView } from '../../src/shared/inventory/physicalInventoryApi';

const api = '/api/dev-lan';
const headers = { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' };

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('J tills, sows and starts fishing from the real equipped slots', async ({ page, request, baseURL }, info) => {
  test.skip(info.project.name !== 'chromium-desktop' || process.env.OLW_DEV_LAN_PHYSICAL_INVENTORY !== '1', 'INV.2 desktop gameplay');
  expect((await request.post(api + '/reset', { data: {} })).ok()).toBe(true);
  const seed = await request.post(api + '/seed-couple', { data: {} });
  const worldId = (await seed.json()).data.world.id as string;
  const readBag = async (storage = false) => {
    const response = await request.get(api + '/inventory/physical', { headers, params: storage ? { worldId, storage: 'home' } : { worldId } });
    expect(response.ok()).toBe(true);
    return (await response.json()).data as PhysicalInventoryView;
  };
  const readFarm = async () => {
    const response = await request.get(api + '/farm', { headers, params: { worldId } });
    expect(response.ok()).toBe(true);
    return (await response.json()).data;
  };

  const canvas = await enterExtendedWorldGame(page, baseURL!);
  await expect.poll(async () => {
    const current = await readBag();
    if (!current.canDrop) await page.keyboard.press('ArrowRight', { delay: 140 });
    return current.canDrop;
  }).toBe(true);
  await emitVqgJump(page, 'home', 1, 10);
  await expect.poll(async () => (await readBag(true)).storage?.kind).toBe('home');
  for (const [index, sku] of ['tool_hoe', 'seed_wheat', 'rod_basic', 'bait_free_worm'].entries()) {
    const current = await readBag(true);
    const source = current.storage!.slots.find(({ stack }) => stack?.itemSku === sku)!;
    const moved = await request.post(api + '/inventory/physical', {
      headers,
      data: {
        worldId, version: current.version, idempotencyKey: 'gear-' + index, query: INITIAL_HOME_STORAGE_QUERY,
        command: { kind: 'move', from: { container: 'home', index: source.index },
          to: { container: 'backpack', index }, qty: source.stack!.qty, stackId: source.stack!.id },
      },
    });
    expect(moved.ok(), await moved.text()).toBe(true);
  }
  const initial = await readBag();
  // The tile directly north of plot 0 in farmPlotContract.v1.json.
  await emitVqgJump(page, 'farm', 16, 9);
  await expect(canvas).toHaveAttribute('data-map-id', 'farm');
  const action = page.getByTestId('btn-context-primary');
  await expect(page.getByTestId('physical-hotbar-1')).toHaveAttribute('data-qty', '1');
  await page.keyboard.press('1');
  await expect(page.getByTestId('physical-hotbar-1')).toHaveAttribute('aria-pressed', 'true');
  await expect(action).toContainText('Cuốc');
  await page.keyboard.press('j');
  await expect.poll(async () => (await readFarm()).plots[0].soil).toBe('tilled');
  await page.keyboard.press('2');
  await expect(action).toContainText('Gieo');
  await page.keyboard.press('j');
  await expect.poll(async () => (await readFarm()).plots[0].soil).toBe('planted');
  const planted = await readBag();
  expect(planted.backpack[1]?.stack?.qty).toBe(initial.backpack[1]!.stack!.qty - 1);
  expect(planted.backpack[0]?.stack?.id).toBe(initial.backpack[0]?.stack?.id);
  expect(planted.backpack[2]?.stack?.id).toBe(initial.backpack[2]?.stack?.id);

  await emitVqgJump(page, 'farm', 51, 11);
  await page.keyboard.press('3');
  await expect(page.getByTestId('physical-hotbar-3')).toHaveAttribute('aria-pressed', 'true');
  await expect(action).toContainText(/câu/i);
  await expect(action).toBeEnabled();
  await page.keyboard.press('j');
  const fishing = page.getByTestId('donor-fishing-modal');
  await expect(fishing).toBeVisible();
  await fishing.getByRole('button', { name: 'Quăng cần' }).click();
  await expect.poll(async () => (await readBag()).backpack[3]?.stack?.qty).toBe(initial.backpack[3]!.stack!.qty - 1);
});
