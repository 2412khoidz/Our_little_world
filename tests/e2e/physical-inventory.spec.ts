import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { PhysicalInventoryRequest, PhysicalInventoryView } from '../../src/shared/inventory/physicalInventoryApi';
import { INITIAL_HOME_STORAGE_QUERY, INITIAL_PHYSICAL_QUERY } from '../../src/shared/inventory/physicalInventoryApi';
import { emitVqgJump } from './helpers/extendedWorldVqg';

const api = '/api/dev-lan';
const may = '11111111-1111-4111-8111-111111111111';
const nang = '22222222-2222-4222-8222-222222222222';
const headers = (id: string) => ({ 'x-dev-user-id': id });

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.skip(process.env.OLW_DEV_LAN_PHYSICAL_INVENTORY !== '1', 'Requires the isolated INV.2 save mode');

async function getInventory(request: APIRequestContext, worldId: string, actor: string, storage = false) {
  const response = await request.get(api + '/inventory/physical', {
    headers: headers(actor), params: storage ? { worldId, storage: 'home' } : { worldId },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data as PhysicalInventoryView;
}

async function enter(page: Page, preset: 'partner-a' | 'partner-b') {
  await page.goto('/?extended-world=1&vqg-capture=1');
  await page.getByTestId('preset-' + preset).click();
  await expect(page.getByTestId('physical-hotbar')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('game-canvas-host').locator('canvas')).toHaveAttribute('data-map-id', 'home');
}

async function stepToCabinet(page: Page, request: APIRequestContext, worldId: string, actor: string) {
  await expect.poll(async () => {
    const inventory = await getInventory(request, worldId, actor);
    if (!inventory.canDrop) await page.keyboard.press('ArrowRight', { delay: 150 });
    return inventory.canDrop;
  }).toBe(true);
  await emitVqgJump(page, 'home', 1, 10);
  await expect.poll(async () => (await getInventory(request, worldId, actor, true)).storage?.kind).toBe('home');
}

async function openCabinet(page: Page, touch: boolean) {
  const controls = touch ? page.getByTestId('main-game-touch-actions') : page.getByTestId('main-game-interaction-hud');
  const prompt = controls.getByTestId('btn-context-primary');
  await expect(prompt).toContainText(touch ? 'Kho nhà' : 'Mở kho nhà');
  if (touch) await prompt.tap();
  else await page.keyboard.press('j');
  const modal = page.getByTestId('physical-home-storage-modal');
  await expect(modal).toBeVisible();
  return modal;
}

test('real slots persist across row rotation and only one client withdraws the last shared stack', async ({ page, request, browser, baseURL }, info) => {
  test.setTimeout(60_000);
  const reset = await request.post(api + '/reset', { data: {} });
  expect(reset.ok()).toBe(true);
  const world = await request.post(api + '/seed-couple', { data: {} });
  const worldId = (await world.json()).data.world.id as string;
  await enter(page, 'partner-a');
  const secondContext = await browser.newContext({ baseURL });
  try {
    const other = await secondContext.newPage();
    await enter(other, 'partner-b');
    await stepToCabinet(page, request, worldId, may);
    await stepToCabinet(other, request, worldId, nang);
    const getA = () => getInventory(request, worldId, may, true);
    const getB = () => getInventory(request, worldId, nang, true);
    const modal = await openCabinet(page, info.project.name !== 'chromium-desktop');
    const initial = await getA();
    const seeds = initial.storage?.slots.find(({ stack }) => stack?.itemSku === 'seed_wheat');
    expect(seeds?.stack?.qty).toBe(5);
    const seedIndex = seeds!.index;
    await modal.getByTestId('physical-home-' + seedIndex).click();
    await modal.getByRole('button', { name: 'Chọn 1' }).click();
    await modal.getByTestId('physical-backpack-9').click();
    await expect(modal.getByTestId('physical-backpack-9')).toHaveAttribute('data-qty', '1');
    await expect(modal.getByTestId('physical-home-' + seedIndex)).toHaveAttribute('data-qty', '4');
    if (info.project.name === 'chromium-desktop') {
      const rowStart = modal.getByTestId('physical-backpack-9');
      const adjacent = modal.getByTestId('physical-backpack-10');
      await rowStart.dragTo(adjacent);
      await expect(rowStart).toHaveAttribute('data-qty', '0');
      await expect(adjacent).toHaveAttribute('data-qty', '1');
      await adjacent.dragTo(rowStart);
      await expect(rowStart).toHaveAttribute('data-qty', '1');
    }
    await modal.getByRole('button', { name: 'Đóng' }).click();
    const bar = page.getByTestId('physical-hotbar');
    await expect(bar).toHaveAttribute('data-active-row', '1');
    if (info.project.name === 'chromium-desktop') {
      await page.keyboard.press('Shift+Tab');
      await expect(bar).toHaveAttribute('data-active-row', '1');
      await page.keyboard.press('Shift');
    } else {
      await bar.getByRole('button', { name: /Đổi hàng vật phẩm/ }).tap();
    }
    await expect(bar).toHaveAttribute('data-active-row', '2');
    await expect(bar.locator('[data-testid^="physical-hotbar-"]')).toHaveCount(9);
    await expect(page.getByTestId('physical-hotbar-1')).toHaveAttribute('data-qty', '1');
    if (info.project.name === 'chromium-desktop') {
      await page.locator('body').click({ position: { x: 20, y: 220 } });
      await page.keyboard.press('1');
      await expect(page.getByTestId('physical-hotbar-1')).toHaveAttribute('aria-pressed', 'true');
    }

    const latest = await getA();
    const requestBody: PhysicalInventoryRequest = {
      worldId, version: latest.version, idempotencyKey: 'last-seeds', query: INITIAL_HOME_STORAGE_QUERY,
      command: { kind: 'transfer', from: { container: 'home', index: seedIndex }, to: 'backpack', qty: 4, stackId: seeds!.stack!.id },
    };
    const withdraw = (client: Page, actor: string, key: string) => client.request.post(api + '/inventory/physical', {
      headers: headers(actor), data: { ...requestBody, idempotencyKey: key },
    });
    const [a, b] = await Promise.all([withdraw(page, may, 'last-a'), withdraw(other, nang, 'last-b')]);
    expect([a.status(), b.status()].sort()).toEqual([200, 409]);
    const winner = a.ok() ? [page, may, 'last-a'] as const : [other, nang, 'last-b'] as const;
    expect((await withdraw(winner[0], winner[1], winner[2])).ok()).toBe(true);
    const aInventory = await getA();
    const bInventory = await getB();
    expect(aInventory.storage?.slots.find(({ index }) => index === seedIndex)?.stack).toBeNull();
    const total = [...aInventory.backpack, ...bInventory.backpack].reduce((sum, cell) => sum + (cell.stack?.qty ?? 0), 0);
    expect(total).toBe(5);

    await page.reload();
    await expect(page.getByTestId('physical-hotbar')).toBeVisible();
    await expect(page.getByTestId('physical-hotbar')).toHaveAttribute('data-active-row', '2');
  } finally {
    await secondContext.close();
  }
});

test('dropping and concurrent pickup move the same unique stack once', async ({ page, request, browser, baseURL }) => {
  test.setTimeout(60_000);
  expect((await request.post(api + '/reset', { data: {} })).ok()).toBe(true);
  const seed = await request.post(api + '/seed-couple', { data: {} });
  const worldId = (await seed.json()).data.world.id as string;
  const ctx = await browser.newContext({ baseURL });
  try {
    const other = await ctx.newPage();
    await enter(page, 'partner-a');
    await enter(other, 'partner-b');
    await stepToCabinet(page, request, worldId, may);
    await stepToCabinet(other, request, worldId, nang);
    const getA = () => getInventory(request, worldId, may, true);
    const getB = () => getInventory(request, worldId, nang, true);
    await expect.poll(async () => (await getA()).canDrop).toBe(true);
    await expect.poll(async () => (await getB()).canDrop).toBe(true);
    const send = (client: Page, actor: string, version: number, key: string, command: PhysicalInventoryRequest['command']) =>
      client.request.post(api + '/inventory/physical', {
        headers: headers(actor), data: { worldId, version, idempotencyKey: key, command, query: INITIAL_PHYSICAL_QUERY },
      });
    const initial = await getA();
    const seedStack = initial.storage?.slots.find(({ stack }) => stack?.itemSku === 'seed_wheat');
    if (!seedStack?.stack) throw new Error('Missing starter wheat in home storage');
    const took = await send(page, may, initial.version, 'withdraw', {
      kind: 'transfer', from: { container: 'home', index: seedStack.index },
      to: 'backpack', qty: 5, stackId: seedStack.stack.id,
    });
    expect(took.ok()).toBe(true);
    const afterWithdraw = await getA();
    const stack = afterWithdraw.backpack.find((cell) => cell.stack?.itemSku === 'seed_wheat')!;
    const dropped = await send(page, may, afterWithdraw.version, 'drop', {
      kind: 'drop', from: { container: 'backpack', index: stack.index }, qty: 5, stackId: stack.stack!.id,
    });
    expect(dropped.ok(), await dropped.text()).toBeTruthy();
    const afterDrop = await getA();
    const observed = await getB();
    expect(afterDrop.nearbyDrops).toHaveLength(1);
    const dropId = afterDrop.nearbyDrops[0]!.id;
    expect(observed.nearbyDrops.some((drop) => drop.id === dropId)).toBe(true);
    const [a, b] = await Promise.all([
      send(page, may, afterDrop.version, 'pickup-a', { kind: 'pickup', dropId }),
      send(other, nang, observed.version, 'pickup-b', { kind: 'pickup', dropId }),
    ]);
    expect([a.status(), b.status()].sort()).toEqual([200, 409]);
    const totals = [...(await getA()).backpack, ...(await getB()).backpack];
    expect(totals.filter(({ stack }) => stack?.itemSku === 'seed_wheat').map(({ stack }) => stack?.qty)).toEqual([5]);
    expect((await getA()).nearbyDrops).toHaveLength(0);
  } finally {
    await ctx.close();
  }
});

test('keeps browser shortcuts available until the player requests a real import', async ({ page, request }, info) => {
  expect((await request.post(api + '/reset', { data: {} })).ok()).toBe(true);
  const seed = await request.post(api + '/seed-couple', { data: {} });
  const worldId = (await seed.json()).data.world.id as string;
  await page.addInitScript(({ key }) => {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, JSON.stringify({
      sharedCells: [], personalCells: [], hotbarCustomized: true,
      hotbarBindings: [null, { itemSku: 'seed_wheat', quality: 'normal', ownerScope: 'shared' }],
    }));
  }, { key: `olw_inv_layout_v2:${worldId}:${may}` });
  await enter(page, 'partner-a');
  await stepToCabinet(page, request, worldId, may);
  const modal = await openCabinet(page, info.project.name !== 'chromium-desktop');
  await modal.getByRole('button', { name: 'Lấy món từ ô nhanh cũ' }).click();
  await expect(modal.getByTestId('physical-backpack-1')).toHaveAttribute('data-qty', '1');
  await expect(modal.getByRole('button', { name: 'Lấy món từ ô nhanh cũ' })).toHaveCount(0);
  const view = await getInventory(request, worldId, may, true);
  expect(view.storage?.slots.find(({ stack }) => stack?.itemSku === 'seed_wheat')?.stack?.qty).toBe(4);
});


test('backpack stays personal, the cabinet owns shared storage and selection keeps the grid stable', async ({ page, request }, info) => {
  expect((await request.post(api + '/reset', { data: {} })).ok()).toBe(true);
  const seed = await request.post(api + '/seed-couple', { data: {} });
  const worldId = (await seed.json()).data.world.id as string;
  const touch = info.project.name !== 'chromium-desktop';
  await enter(page, 'partner-a');

  const openBackpack = page.getByRole('button', { name: 'Mở ba lô' });
  const bag = page.getByTestId('physical-inventory-modal');
  const shelf = page.getByTestId('physical-home-storage-modal');
  await expect.poll(async () => (await getInventory(request, worldId, may)).atHome).toBe(true);
  expect((await getInventory(request, worldId, may, true)).storage).toBeNull();
  if (touch) await openBackpack.tap();
  else await page.keyboard.press('i');
  await expect(bag).toBeVisible();
  await expect(bag.getByRole('region', { name: 'Kho chung' })).toHaveCount(0);
  await expect(bag.getByRole('textbox', { name: 'Tên vật phẩm' })).toHaveCount(0);

  await bag.getByRole('button', { name: 'Đóng' }).click();

  await stepToCabinet(page, request, worldId, may);
  expect((await getInventory(request, worldId, may)).storage).toBeNull();
  if (!touch) {
    await page.keyboard.press('i');
    await expect(bag).toBeVisible();
    await expect(shelf).toBeHidden();
    await bag.getByRole('button', { name: 'Đóng' }).click();
  }
  await openCabinet(page, touch);
  const stock = (await getInventory(request, worldId, may, true)).storage!.slots;
  const seedSlot = stock.find(({ stack }) => stack?.itemSku === 'seed_wheat')!;
  const first = shelf.getByTestId('physical-home-' + seedSlot.index);
  const neighbor = shelf.getByTestId('physical-home-' + (seedSlot.index + 1));
  await expect(first).toHaveAttribute('data-qty', '5');
  const original = { first: await first.boundingBox(), neighbor: await neighbor.boundingBox() };
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  expect(await first.boundingBox()).toEqual(original.first);
  expect(await neighbor.boundingBox()).toEqual(original.neighbor);
  await shelf.getByRole('button', { name: 'Thao tác khác' }).click();
  expect(await first.boundingBox()).toEqual(original.first);
  expect(await neighbor.boundingBox()).toEqual(original.neighbor);
  await shelf.getByRole('button', { name: 'Bỏ chọn' }).click();
  const search = shelf.getByRole('textbox', { name: 'Tên vật phẩm' });
  if (!touch) {
    await search.focus();
    await page.keyboard.press('j');
    await expect(search).toHaveValue('j');
    await expect(shelf).toBeVisible();
  }
  await search.fill('khong-co-mat-hang-nay');
  await search.press('Enter');
  await expect(shelf.getByText('Không có món phù hợp.')).toBeVisible();
  await search.fill('');
  await search.press('Enter');
  await shelf.getByRole('combobox', { name: 'Loại vật phẩm' }).selectOption('seed');
  await expect(shelf.getByRole('button', { name: /Kho nhà ô.* ×5/ })).toBeVisible();
  await shelf.getByRole('button', { name: 'Đóng' }).click();

  if (!touch) {
    // Put real stacks across the entire row so all nine bindings must equip a concrete slot.
    for (const [index, cell] of stock.filter(({ stack }) => stack).slice(0, 9).entries()) {
      const stack = cell.stack!;
      const view = await getInventory(request, worldId, may);
      const reply = await request.post(api + '/inventory/physical', {
        headers: headers(may),
        data: { worldId, version: view.version, idempotencyKey: 'digit-' + index, query: INITIAL_PHYSICAL_QUERY,
          command: { kind: 'move', from: { container: 'home', index: cell.index },
            to: { container: 'backpack', index }, qty: 1, stackId: stack.id } },
      });
      expect(reply.ok(), await reply.text()).toBeTruthy();
    }
    for (let digit = 1; digit <= 9; digit++) {
      const slot = page.getByTestId('physical-hotbar-' + digit);
      await expect(slot).toHaveAttribute('data-qty', '1');
      await page.keyboard.press(String(digit));
      await expect(slot).toHaveAttribute('aria-pressed', 'true');
    }
    await expect(page.getByTestId('btn-context-secondary')).toContainText('Cất vật phẩm');
    await page.keyboard.press('k');
    await expect(page.getByTestId('physical-hotbar-9')).toHaveAttribute('aria-pressed', 'false');
  }

  await emitVqgJump(page, 'garden', 8, 4);
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await expect(canvas).toHaveAttribute('data-map-id', 'garden');
  await expect.poll(async () => (await getInventory(request, worldId, may, true)).storage).toBeNull();
  if (touch) await openBackpack.tap();
  else await page.keyboard.press('i');
  await expect(bag).toBeVisible();
  await expect(shelf).toBeHidden();
});
