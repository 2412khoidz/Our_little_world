import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { PhysicalInventoryRequest, PhysicalInventoryView } from '../../src/shared/inventory/physicalInventoryApi';
import { INITIAL_PHYSICAL_QUERY } from '../../src/shared/inventory/physicalInventoryApi';

const api = '/api/dev-lan';
const may = '11111111-1111-4111-8111-111111111111';
const nang = '22222222-2222-4222-8222-222222222222';
const headers = (id: string) => ({ 'x-dev-user-id': id });

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.skip(process.env.OLW_DEV_LAN_PHYSICAL_INVENTORY !== '1', 'Requires the isolated INV.2 save mode');

async function getInventory(request: APIRequestContext, worldId: string, actor: string) {
  const response = await request.get(`${api}/inventory/physical?worldId=${worldId}`, { headers: headers(actor) });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data as PhysicalInventoryView;
}

async function enter(page: Page, preset: 'partner-a' | 'partner-b') {
  await page.goto('/?extended-world=1');
  await page.getByTestId('preset-' + preset).click();
  await expect(page.getByTestId('physical-hotbar')).toBeVisible({ timeout: 20_000 });
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
    const getA = () => getInventory(request, worldId, may);
    const getB = () => getInventory(request, worldId, nang);
    await expect.poll(async () => (await getA()).atHome).toBe(true);
    await expect.poll(async () => (await getB()).atHome).toBe(true);
    await page.getByRole('button', { name: 'Ba lô', exact: true }).click();
    const modal = page.getByTestId('physical-inventory-modal');
    await expect(modal).toBeVisible();
    const initial = await getA();
    const seeds = initial.storage?.slots.find(({ stack }) => stack?.itemSku === 'seed_wheat');
    expect(seeds?.stack?.qty).toBe(5);
    const seedIndex = seeds!.index;
    await modal.getByTestId('physical-home-' + seedIndex).click();
    await modal.getByRole('button', { name: 'Chọn 1' }).click();
    await modal.getByTestId('physical-backpack-9').click();
    await expect(modal.getByTestId('physical-backpack-9')).toHaveAttribute('data-qty', '1');
    await expect(modal.getByTestId('physical-home-' + seedIndex)).toHaveAttribute('data-qty', '4');
    await modal.getByRole('button', { name: 'Đổi hàng' }).click();
    await expect(modal.getByText('Ba lô · Hàng đang dùng 2')).toBeVisible();
    await modal.getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByTestId('physical-hotbar').locator('[data-testid^="physical-hotbar-"]')).toHaveCount(9);
    await expect(page.getByTestId('physical-hotbar-1')).toHaveAttribute('data-qty', '1');
    if (info.project.name === 'chromium-desktop') {
      await page.locator('body').click({ position: { x: 20, y: 220 } });
      await page.keyboard.press('1');
      await expect(page.getByTestId('physical-hotbar-1')).toHaveAttribute('aria-pressed', 'true');
    }

    const latest = await getA();
    const requestBody: PhysicalInventoryRequest = {
      worldId, version: latest.version, idempotencyKey: 'last-seeds', query: INITIAL_PHYSICAL_QUERY,
      command: { kind: 'transfer', from: { container: 'home', index: seedIndex }, to: 'backpack', qty: 4, stackId: seeds!.stack!.id },
    };
    const withdraw = (client: Page, actor: string, key: string) => client.request.post(api + '/inventory/physical', {
      headers: headers(actor), data: { ...requestBody, idempotencyKey: key },
    });
    const [a, b] = await Promise.all([withdraw(page, may, 'last-a'), withdraw(other, nang, 'last-b')]);
    expect([a.status(), b.status()].sort()).toEqual([200, 409]);
    const winner = a.ok() ? [page, may, 'last-a'] as const : [other, nang, 'last-b'] as const;
    expect((await withdraw(...winner)).ok()).toBe(true);
    const aInventory = await getA();
    const bInventory = await getB();
    expect(aInventory.storage?.slots.find(({ index }) => index === seedIndex)?.stack).toBeNull();
    const total = [...aInventory.backpack, ...bInventory.backpack].reduce((sum, cell) => sum + (cell.stack?.qty ?? 0), 0);
    expect(total).toBe(5);

    await page.reload();
    await expect(page.getByTestId('physical-hotbar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hàng 2 ↻' })).toBeVisible();
  } finally {
    await secondContext.close();
  }
});
