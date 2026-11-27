import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import type { InventorySnapshot } from '../../src/shared/inventory/inventoryTypes';
import { vqgJumpMap } from './helpers/extendedWorldVqg';

const api = '/api/dev-lan';
const owner = '11111111-1111-4111-8111-111111111111';
const partner = '22222222-2222-4222-8222-222222222222';
const headers = (userId = owner) => ({ 'x-dev-user-id': userId });

async function get<T>(request: APIRequestContext, route: string, userId = owner): Promise<T> {
  const response = await request.get(api + route, { headers: headers(userId) });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data as T;
}

async function post<T>(request: APIRequestContext, route: string, data: object, userId = owner): Promise<T> {
  const response = await request.post(api + route, { headers: headers(userId), data });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data as T;
}

async function spawn(request: APIRequestContext, worldId: string, itemSku: string, qty: number, scope = 'shared') {
  await post(request, '/dev-console/spawn-item', { worldId, itemSku, qty, scope });
}

function inventory(request: APIRequestContext, worldId: string, userId = owner) {
  return get<InventorySnapshot>(request, '/inventory?worldId=' + worldId, userId);
}

function qty(snapshot: InventorySnapshot, sku: string) {
  return snapshot.items.filter((row) => row.itemSku === sku).reduce((total, row) => total + row.qty, 0);
}

async function openInventory(page: Page) {
  await page.getByTestId('nav-menu').click();
  await page.getByTestId('menu-inventory').click();
  await expect(page.getByTestId('inventory-modal')).toBeVisible();
}

async function enter(page: Page, identity = 'partner-a') {
  await page.goto('/?extended-world=1&vqg-capture=1');
  await page.getByTestId('preset-' + identity).click();
  await expect(page.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();
  await openInventory(page);
}

function slot(page: Page, index: number, kind = 'bag') {
  return page.getByTestId('nuvora-inventory-grid').locator(`[data-slot-kind="${kind}"][data-slot-index="${index}"]`);
}

async function center(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('Inventory slot is offscreen');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function startDrag(page: Page, from: Locator, to: Locator) {
  const a = await center(from);
  const b = await center(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
}

test.describe('Inventory authority', () => {
  test.describe.configure({ timeout: 60_000 });
  let worldId: string;
  test.beforeEach(async ({ request }) => {
    await post(request, '/reset', {});
    const data = await post<{ world: { id: string } }>(request, '/seed-couple', {});
    worldId = data.world.id;
  });

  test('wheat stays spent with an adopted cat, survives reopen, and free kibble stays daily', async ({ page, request, isMobile }) => {
    await post(request, '/pet/adopt-or-rename', { worldId, name: 'Quýt', idempotencyKey: 'adopt' });
    await enter(page);
    const wheat = page.getByTestId('nuvora-cell-seed_wheat');
    await expect(wheat).toHaveAttribute('data-item-qty', '5');
    let { version } = await get<{ version: number; walletCoins: number }>(request, '/farm?worldId=' + worldId);
    for (let plotIndex = 0; plotIndex < 5; plotIndex += 1) {
      for (const action of ['till', 'plant'] as const) {
        if (!isMobile && plotIndex === 4 && action === 'plant') {
          await page.getByRole('button', { name: 'Đóng' }).click();
          const canvas = page.getByTestId('game-canvas-host').locator('canvas');
          // Stand just north of farm_main_4. The game still resolves and sends the planting action.
          await vqgJumpMap(page, canvas, 'farm', 20, 9);
          await page.getByTestId('game-hotbar').getByRole('button', { name: /hạt giống lúa mì/i }).click();
          const plant = page.getByRole('button', { name: /Gieo Hạt giống lúa mì/i });
          await expect(plant).toBeVisible();
          await expect(async () => {
            if (qty(await inventory(request, worldId), 'seed_wheat') > 0) await plant.click({ timeout: 1500 });
            expect(qty(await inventory(request, worldId), 'seed_wheat')).toBe(0);
          }).toPass({ timeout: 12_000 });
          await openInventory(page);
          continue;
        }
        const result = await post<{ snapshot: { version: number } }>(request, '/farm/apply', {
          worldId, plotIndex, action, seedSku: action === 'plant' ? 'seed_wheat' : undefined,
          farmVersion: version, idempotencyKey: action + plotIndex,
        });
        version = result.snapshot.version;
      }
      expect(qty(await inventory(request, worldId), 'seed_wheat')).toBe(4 - plotIndex);
    }
    await page.getByRole('button', { name: 'Làm mới túi đồ' }).click();
    await expect(wheat).toHaveCount(0);
    await page.reload();
    await openInventory(page);
    await expect(wheat).toHaveCount(0);
    await page.getByTestId('btn-claim-free-kibble').click();
    await expect(page.getByTestId('nuvora-cell-pet_kibble_basic')).toHaveAttribute('data-item-qty', '3');
    expect(qty(await inventory(request, worldId), 'seed_wheat')).toBe(0);
    expect((await inventory(request, worldId)).canClaimFreeKibble).toBe(false);
  });

  test('desktop click, drag, swap, split, cancel, quick slot and reload conserve four apples', async ({ page, request, isMobile }, info) => {
    test.skip(isMobile, 'Uses desktop mouse and keyboard semantics');
    await spawn(request, worldId, 'apple', 4);
    await enter(page);
    const apple = page.getByTestId('nuvora-cell-apple');
    const cursor = page.getByTestId('nuvora-inventory-cursor');
    const source = Number(await apple.getAttribute('data-slot-index'));
    const dest = slot(page, 15);
    await apple.click();
    await expect(slot(page, source)).toHaveAttribute('data-item-qty', '0');
    await expect(cursor).toHaveAttribute('data-item-qty', '4');
    await page.screenshot({ path: info.outputPath('apples-held.png') });
    await dest.click();
    await expect(dest).toHaveAttribute('data-item-qty', '4');
    await expect(slot(page, source)).toHaveAttribute('data-item-qty', '0');
    await page.screenshot({ path: info.outputPath('apples-placed.png') });
    await startDrag(page, dest, slot(page, source));
    await page.mouse.up();
    await expect(slot(page, source)).toHaveAttribute('data-item-qty', '4');
    await apple.click({ button: 'right' });
    await expect(apple).toHaveAttribute('data-item-qty', '2');
    await expect(cursor).toHaveAttribute('data-item-qty', '2');
    await dest.click({ button: 'right' });
    await expect(dest).toHaveAttribute('data-item-qty', '1');
    await expect(cursor).toHaveAttribute('data-item-qty', '1');
    await page.keyboard.press('Escape');
    await expect(cursor).toHaveCount(0);
    await expect(slot(page, source)).toHaveAttribute('data-item-qty', '3');
    await startDrag(page, dest, slot(page, source));
    await page.mouse.up();
    await expect(apple).toHaveAttribute('data-item-qty', '4');
    const wheat = page.getByTestId('nuvora-cell-seed_wheat');
    const wheatIndex = Number(await wheat.getAttribute('data-slot-index'));
    await startDrag(page, apple, wheat);
    await page.mouse.up();
    await expect(slot(page, wheatIndex)).toHaveAttribute('data-testid', 'nuvora-cell-apple');
    await expect(slot(page, source)).toHaveAttribute('data-testid', 'nuvora-cell-seed_wheat');

    await startDrag(page, apple, slot(page, 7, 'hotbar'));
    await page.mouse.up();
    await expect(slot(page, 7, 'hotbar')).toHaveAttribute('data-item-qty', '4');
    await startDrag(page, slot(page, 7, 'hotbar'), slot(page, 6, 'hotbar'));
    await page.mouse.up();
    await expect(slot(page, 6, 'hotbar')).toHaveAttribute('data-item-qty', '4');
    await startDrag(page, slot(page, 6, 'hotbar'), apple);
    await page.mouse.up();
    await expect(page.getByTestId('nuvora-hb-apple')).toHaveCount(0);
    await expect(apple).toHaveAttribute('data-item-qty', '4');

    await apple.click();
    await page.getByTestId('tab-inventory-personal').click();
    await expect(cursor).toHaveCount(0);
    await page.getByTestId('tab-inventory-shared').click();
    await expect(apple).toHaveAttribute('data-item-qty', '4');
    await startDrag(page, apple, dest);
    await page.mouse.move(1, 1);
    await page.mouse.up();
    await expect(apple).toHaveAttribute('data-slot-index', String(wheatIndex));
    await startDrag(page, apple, dest);
    await spawn(request, worldId, 'apple', -1);
    await expect(apple).toHaveAttribute('data-item-qty', '3');
    await page.mouse.up();
    await expect(dest).toHaveAttribute('data-item-qty', '0');
    await expect(apple).toHaveAttribute('data-slot-index', String(wheatIndex));
    await spawn(request, worldId, 'apple', 1);
    await expect(apple).toHaveAttribute('data-item-qty', '4');
    await apple.dblclick();
    await expect(cursor).toHaveCount(0);
    await expect(apple).toHaveAttribute('data-item-qty', '4');
    await apple.click();
    await page.getByRole('button', { name: 'Đóng' }).click();
    await page.reload();
    await openInventory(page);
    await expect(apple).toHaveAttribute('data-slot-index', String(wheatIndex));
    expect(qty(await inventory(request, worldId), 'apple')).toBe(4);
  });

  test('touch tap-to-move, split and cancel in portrait and landscape', async ({ page, request, isMobile }, info) => {
    test.skip(!isMobile, 'Exercises Chromium touch emulation');
    await spawn(request, worldId, 'apple', 5);
    await enter(page);
    const apple = page.getByTestId('nuvora-cell-apple');
    await apple.tap();
    await page.getByTestId('btn-touch-move-slot').tap();
    await slot(page, 15).tap();
    await expect(slot(page, 15)).toHaveAttribute('data-item-qty', '5');
    await slot(page, 15).tap();
    await page.getByTestId('btn-split-stack').tap();
    await expect(apple).toHaveCount(2);
    await expect(slot(page, 15)).toHaveAttribute('data-item-qty', '2');
    await page.setViewportSize({ width: 932, height: 430 });
    const modal = page.getByTestId('inventory-modal');
    await modal.evaluate((element) => { element.scrollTop = 0; });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 327 }] });
    for (const y of [308, 289, 270, 251, 232, 213]) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300, y }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    await expect.poll(() => modal.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(apple).toHaveCount(2);

    const split = slot(page, 15);
    await split.dispatchEvent('pointerdown', { pointerId: 7, isPrimary: true, pointerType: 'touch', button: 0 });
    await split.dispatchEvent('pointercancel', { pointerId: 7, isPrimary: true, pointerType: 'touch' });
    await expect(page.getByTestId('nuvora-inventory-cursor')).toHaveCount(0);
    await expect(split).toHaveAttribute('data-item-qty', '2');
    await modal.evaluate(async (element) => {
      let last = element.scrollTop;
      let stableFrames = 0;
      while (stableFrames < 8) {
        await new Promise(requestAnimationFrame);
        const next = element.scrollTop;
        stableFrames = next === last ? stableFrames + 1 : 0;
        last = next;
      }
    });
    const close = page.getByRole('button', { name: 'Đóng' });
    await close.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('touch-landscape.png') });
    await expect(async () => {
      if (await close.isVisible()) await close.tap({ timeout: 1500 });
      expect(await modal.count()).toBe(0);
    }).toPass({ timeout: 6000 });
  });

  test('overflow pages show all tiers and receive purchases, harvests and gifts', async ({ page, request }, info) => {
    const first = await inventory(request, worldId);
    const fixtures = first.catalog.filter((item) => !first.items.some((row) => row.itemSku === item.sku))
      .filter((item) => !['seed_cabbage', 'apple', 'wheat'].includes(item.sku)).slice(0, 46);
    expect(fixtures).toHaveLength(46);
    const items = [
      ...first.items,
      ...fixtures.map((item) => ({ worldId, itemSku: item.sku, qty: 1, ownerScope: 'shared', updatedAt: '' })),
      ...fixtures.slice(0, 20).map((item) => ({ worldId, itemSku: item.sku, qty: 1, ownerScope: 'user:' + owner, updatedAt: '' })),
      ...(['normal', 'silver', 'gold'] as const).map((quality) => ({
        worldId, itemSku: 'apple', qty: 4, quality, ownerScope: 'shared', updatedAt: '',
      })),
    ];
    const backup = await get<object>(request, '/dev-console/snapshot-export?worldId=' + worldId);
    await post(request, '/dev-console/snapshot-restore', { worldId, snapshot: { ...backup, inventory: items } });
    await enter(page);
    const modal = page.getByTestId('inventory-modal');
    const next = modal.getByRole('button', { name: 'Trang sau' });
    const pageTotals = async (pages: number) => {
      const found: { id: string | null; quality: string | null; qty: number }[] = [];
      for (let index = 0; index < pages; index += 1) {
        for (const row of await modal.locator('[data-slot-kind="bag"]:not([data-item-qty="0"])').all()) {
          found.push({
            id: await row.getAttribute('data-testid'),
            quality: await row.getAttribute('data-item-quality'),
            qty: Number(await row.getAttribute('data-item-qty')),
          });
        }
        if (index + 1 < pages) await next.click();
      }
      return found;
    };
    await expect(modal.getByText('Trang 1 / 2')).toBeVisible();
    const shared = await pageTotals(2);
    expect(shared).toHaveLength(first.items.length + fixtures.length + 3);
    expect(shared.filter((row) => row.id === 'nuvora-cell-apple').map((row) => row.quality).sort()).toEqual(['gold', 'normal', 'silver']);

    const newItem = first.catalog.find((item) => item.sku === 'seed_cabbage')!;
    await post(request, '/farm/buy-seed', { worldId, seedSku: newItem.sku, qty: 1, idempotencyKey: 'overflow-buy' });
    await expect(modal.getByTestId('nuvora-cell-' + newItem.sku)).toHaveAttribute('data-item-qty', '1');
    const farm = () => get<{ version: number; plots: { ready: boolean }[] }>(request, '/farm?worldId=' + worldId);
    for (const action of ['till', 'plant'] as const) {
      await post(request, '/farm/apply', {
        worldId, action, farmVersion: (await farm()).version, plotIndex: 0,
        ...(action === 'plant' ? { seedSku: 'seed_wheat' } : {}), idempotencyKey: 'overflow-' + action,
      });
    }
    await expect.poll(async () => (await farm()).plots[0]?.ready, { timeout: 12_000 }).toBe(true);
    await post(request, '/farm/apply', {
      worldId, action: 'harvest', farmVersion: (await farm()).version, plotIndex: 0, idempotencyKey: 'overflow-harvest',
    });
    await expect(modal.getByTestId('nuvora-cell-wheat').first()).toBeVisible();
    await page.screenshot({ path: info.outputPath('inventory-overflow.png') });

    await modal.getByTestId('tab-inventory-personal').click();
    await expect(modal.getByText('Trang 1 / 2')).toBeVisible();
    expect(await pageTotals(2)).toHaveLength(20);
    const sent = await post<{ mailbox: { items: { id: string }[] } }>(request, '/mailbox/send', {
      worldId, recipientId: owner, subject: 'Táo đỏ', body: 'Một quả táo vàng cho Mây!',
      giftItemSku: 'apple', giftQty: 1, giftQuality: 'gold', sourceScope: 'shared', idempotencyKey: 'overflow-gift',
    }, partner);
    await post(request, '/mailbox/open', { worldId, letterId: sent.mailbox.items[0]?.id, idempotencyKey: 'open-overflow-gift' });
    await expect(modal.getByTestId('nuvora-cell-apple')).toHaveAttribute('data-item-quality', 'gold');
    await expect(modal.getByTestId('nuvora-cell-apple')).toHaveAttribute('data-item-qty', '1');
    expect((await inventory(request, worldId, partner)).items.some((row) => row.ownerScope === 'user:' + owner)).toBe(false);
  });

  test('two browser clients serialize purchases, harvest, and craft reservations', async ({ page, browser, request, baseURL, isMobile }) => {
    test.skip(isMobile, 'Two desktop clients exercise the same shared economy');
    const ctx = await browser.newContext({ baseURL });
    try {
      const other = await ctx.newPage();
      await enter(page);
      await enter(other, 'partner-b');
      const mutate = (client: Page, userId: string, path: string, body: object) =>
        client.request.post(api + path, { headers: headers(userId), data: { ...body, worldId } });
      const farm = () => get<{ version: number; walletCoins: number; plots: { ready: boolean }[] }>(request, '/farm?worldId=' + worldId);
      const before = await farm();
      const buy = (client: Page, userId: string) => mutate(client, userId, '/farm/buy-seed', {
        seedSku: 'seed_wheat', qty: 1, idempotencyKey: 'buy-' + userId,
      });
      for (const response of await Promise.all([buy(page, owner), buy(other, partner)])) expect(response.ok()).toBe(true);
      expect(qty(await inventory(request, worldId), 'seed_wheat')).toBe(7);
      const balance = (await farm()).walletCoins;
      expect(balance).toBe(before.walletCoins - 8);
      expect((await buy(page, owner)).ok()).toBe(true);
      expect((await farm()).walletCoins).toBe(balance);

      const apply = (client: Page, userId: string, action: string, farmVersion: number) =>
        mutate(client, userId, '/farm/apply', { action, plotIndex: 0, farmVersion,
          ...(action === 'plant' ? { seedSku: 'seed_wheat' } : {}), idempotencyKey: action + userId });
      expect((await apply(page, owner, 'till', (await farm()).version)).ok()).toBe(true);
      expect((await apply(page, owner, 'plant', (await farm()).version)).ok()).toBe(true);
      await expect.poll(async () => (await farm()).plots[0]?.ready, { timeout: 12_000 }).toBe(true);
      const ready = await farm();
      const harvested = await Promise.all([apply(page, owner, 'harvest', ready.version), apply(other, partner, 'harvest', ready.version)]);
      expect(harvested.map((response) => response.status()).sort()).toEqual([200, 409]);
      const harvestedQty = qty(await inventory(request, worldId), 'wheat');
      expect(harvestedQty).toBeGreaterThanOrEqual(1);

      const backup = await get<object>(request, '/dev-console/snapshot-export?worldId=' + worldId);
      const current = await inventory(request, worldId);
      await post(request, '/dev-console/snapshot-restore', { worldId, snapshot: { ...backup, inventory: [
        ...current.items.filter((row) => row.itemSku !== 'wheat'),
        { worldId, ownerScope: 'shared', itemSku: 'wheat', qty: 1, quality: 'silver', updatedAt: '' },
        { worldId, ownerScope: 'shared', itemSku: 'wheat', qty: 1, quality: 'gold', updatedAt: '' },
      ] } });
      const deep = await get<{ version: number }>(request, '/farm/deep?worldId=' + worldId);
      const craft = (client: Page, userId: string, key: string) => mutate(client, userId, '/farm/deep/apply', {
        kind: 'queue_workshop', workshopId: 'mill', recipeId: 'flour', expectedVersion: deep.version, idempotencyKey: key,
      });
      const [a, b] = await Promise.all([craft(page, owner, 'queue-a'), craft(other, partner, 'queue-b')]);
      expect([a.status(), b.status()].sort()).toEqual([200, 409]);
      expect(qty(await inventory(request, worldId), 'wheat')).toBe(0);
      const [won, actor, key, lost, otherActor, response] = a.ok()
        ? [page, owner, 'queue-a', other, partner, a] as const
        : [other, partner, 'queue-b', page, owner, b] as const;
      const { data: { snapshot } } = await response.json();
      expect((await craft(lost, otherActor, key)).status()).toBe(409);
      expect((await (await craft(won, actor, key)).json()).data.idempotentReplay).toBe(true);
      const jobId = snapshot.workshops.stations.mill.queue[0].jobId as string;
      expect((await mutate(won, actor, '/farm/deep/apply', {
        kind: 'cancel_workshop', workshopId: 'mill', jobId, expectedVersion: snapshot.version, idempotencyKey: 'cancel',
      })).ok()).toBe(true);
      const restored = (await inventory(request, worldId)).items.filter((row) => row.itemSku === 'wheat');
      expect(restored.map(({ quality, qty }) => [quality, qty]).sort()).toEqual([['gold', 1], ['silver', 1]]);

      const pet = await post<{ id: string }>(request, '/pet/adopt-or-rename', { worldId, name: 'Quýt', idempotencyKey: 'race-cat' });
      await spawn(request, worldId, 'pet_kibble_basic', 1);
      const fill = (client: Page, userId: string) => mutate(client, userId, '/pet/care/apply', {
        petId: pet.id, action: 'fill_food', expectedBowlVersion: 1, ownerScope: 'shared',
        itemSku: 'pet_kibble_basic', quality: 'normal', idempotencyKey: 'fill-' + userId,
      });
      const feed = await Promise.all([fill(page, owner), fill(other, partner)]);
      expect(feed.map((response) => response.status()).sort()).toEqual([200, 409]);
      expect(qty(await inventory(request, worldId), 'pet_kibble_basic')).toBe(0);
    } finally {
      await ctx.close();
    }
  });

  test('two connected browsers discard stale cursor and stale refresh after last-item transfer', async ({ page, browser, request, baseURL, isMobile }) => {
    test.skip(isMobile, 'Uses a desktop cursor while the other browser mutates inventory');
    await spawn(request, worldId, 'apple', 1);
    const second = await browser.newContext({ baseURL });
    try {
      const other = await second.newPage();
      await enter(page);
      await enter(other, 'partner-b');
      const apple = page.getByTestId('nuvora-cell-apple');
      const cursor = page.getByTestId('nuvora-inventory-cursor');
      await apple.click({ modifiers: ['Shift'] });
      await expect(page.getByTestId('nuvora-hb-apple')).toHaveAttribute('data-item-qty', '1');
      await apple.click();
      await expect(cursor).toHaveAttribute('data-item-qty', '1');

      let release!: () => void;
      const wait = new Promise<void>((resolve) => { release = resolve; });
      let delivered!: () => void;
      const oldIsDelivered = new Promise<void>((resolve) => { delivered = resolve; });
      let fetched!: () => void;
      const oldIsReady = new Promise<void>((resolve) => { fetched = resolve; });
      await page.route('**/api/dev-lan/inventory?**', async (route) => {
        const old = await route.fetch();
        fetched();
        await wait;
        await route.fulfill({ response: old });
        delivered();
      }, { times: 1 });
      await page.getByRole('button', { name: 'Làm mới túi đồ' }).click();
      await oldIsReady;

      const transfer = (client: Page, id: string) => client.request.post(api + '/inventory/transfer-quality', {
        headers: headers(id), data: {
          worldId, fromScope: 'shared', toScope: 'personal', itemSku: 'apple', qty: 1, quality: 'normal',
          idempotencyKey: 'last-apple-' + id,
        },
      });
      const [a, b] = await Promise.all([transfer(page, owner), transfer(other, partner)]);
      expect([a.ok(), b.ok()].filter(Boolean)).toHaveLength(1);
      await expect(cursor).toHaveCount(0);
      release();
      await oldIsDelivered;
      await expect(page.getByTestId('nuvora-hb-apple')).toHaveCount(0);
      await expect(apple).toHaveCount(0);
      await expect(other.getByTestId('nuvora-cell-apple')).toHaveCount(0);
      const winner = a.ok() ? page : other;
      const loser = a.ok() ? other : page;
      await winner.getByTestId('tab-inventory-personal').click();
      await loser.getByTestId('tab-inventory-personal').click();
      await expect(winner.getByTestId('nuvora-cell-apple')).toHaveAttribute('data-item-qty', '1');
      await expect(loser.getByTestId('nuvora-cell-apple')).toHaveCount(0);
      expect((await transfer(winner, a.ok() ? owner : partner)).ok()).toBe(true);
      expect(qty(await inventory(request, worldId, a.ok() ? owner : partner), 'apple')).toBe(1);
      expect(qty(await inventory(request, worldId, a.ok() ? partner : owner), 'apple')).toBe(0);
    } finally {
      await second.close();
    }
  });
});
