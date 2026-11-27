import { randomUUID } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createDevLanHandler } from './devLanServerPlugin.mjs';

const root = path.resolve(import.meta.dirname, '..');
const name = process.argv[2] ?? '.dev-lan-state-m3-acceptance.json';
if (!/^\.dev-lan-state-m3-acceptance(?:-[a-z0-9-]+)?\.json$/i.test(name)) {
  throw new Error('Tên save phải có dạng .dev-lan-state-m3-acceptance[-tên].json.');
}
const filename = path.join(root, name);
const reserve = await open(filename, 'wx');
await reserve.close();
const realNow = Date.now;
const now = realNow();
let vite;
let server;
let handler;
let completed = false;

try {
  vite = await createViteServer({
    root, configFile: false, appType: 'custom',
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  const { tryHandleFarmDevLan } = await vite.ssrLoadModule('/src/server/devLanFarmRoute.ts');
  handler = createDevLanHandler({ stateFilePath: filename, getTryHandleFarmDevLan: () => tryHandleFarmDevLan });
  server = createHttpServer((req, res) => {
    void handler(req, res, () => { res.writeHead(404).end(); });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${server.address().port}/api/dev-lan`;
  const headers = { 'content-type': 'application/json', 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' };
  async function request(route, data) {
    const response = await fetch(base + route, data === undefined ? { headers } : {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    const body = await response.json();
    if (!response.ok || body.ok === false) {
      throw new Error(`${route} ${data?.kind ?? data?.itemSku ?? data?.action ?? ''} ${body.code ?? response.status} ${body.message ?? ''}`);
    }
    return body.data;
  }

  // Run the existing DEV HTTP handlers in this dedicated process. Advance its
  // clock only during fixture creation so orchard/crop maturation uses normal rules.
  Date.now = () => now - 3 * 60 * 60_000;
  await request('/seed-couple', {});
  const { world } = await request('/world/snapshot');
  const query = `?worldId=${world.id}`;
  const act = (route, body) => request(route + query, { worldId: world.id, idempotencyKey: randomUUID(), ...body });
  const spawn = (itemSku, qty) => act('/dev-console/spawn-item', { itemSku, qty, scope: 'shared' });
  const deep = (kind, body) => act('/farm/deep/apply', { kind, ...body });
  const farm = (plotIndex, action, body = {}) => act('/farm/apply', { plotIndex, action, ...body });

  await request('/farm' + query);
  for (let shipment = 0; shipment < 3; shipment += 1) {
    await spawn('pomegranate', 85);
    await act('/farm/ship', { lines: [{ sku: 'pomegranate', qty: 85 }] });
  }
  for (const [sku, qty] of Object.entries({
    seed_wheat: 15, seed_carrot: 15, seed_potato: 15, sapling_cherry: 2, sapling_plum: 1, sapling_cocoa: 1,
    wheat: 24, carrot: 24, wild_herb: 20, milk: 16, flour: 14, egg: 14, cabbage: 15, wool: 12,
    rose_pink: 12, sunflower: 8, ribbon: 8, bait_free_worm: 30,
    feed_chicken: 8, feed_livestock: 8, feed_rabbit: 8,
  })) {
    await spawn(sku, qty);
  }
  for (const speciesId of ['chicken', 'duck', 'cow', 'goat', 'sheep', 'rabbit', 'bee']) {
    await deep('adopt_livestock', { speciesId });
  }
  for (const [slotIndex, saplingSku] of ['sapling_cherry', 'sapling_cherry', 'sapling_plum', 'sapling_cocoa'].entries()) {
    await deep('plant_tree', { slotIndex, saplingSku });
  }
  await deep('queue_workshop', { workshopId: 'mill', recipeId: 'flour' });
  for (const [plotIndex, seedSku] of [[0, 'seed_wheat'], [1, 'seed_carrot'], [2, 'seed_potato'], [120, 'seed_wheat']]) {
    await farm(plotIndex, 'till');
    await farm(plotIndex, 'plant', { seedSku });
    await farm(plotIndex, 'water');
  }
  Date.now = realNow;
  await farm(4, 'till');
  await farm(5, 'till');
  await farm(5, 'plant', { seedSku: 'seed_wheat' });
  await deep('queue_workshop', { workshopId: 'kitchen', recipeId: 'carrot_soup' });
  await deep('queue_workshop', { workshopId: 'florist', recipeId: 'sakura_bouquet' });

  const state = await request('/farm/deep' + query);
  const surface = await request('/farm' + query);
  const maturePlots = surface.plots.filter((plot) => plot.ready).length;
  const fruitingTrees = state.orchardViews.filter((tree) => tree.ready).length;
  if (!maturePlots || !fruitingTrees || state.projectedLivestock.length !== 7 || state.walletCoins < 500) {
    throw new Error('Save thiếu luống chín, cây sẵn quả, thú nuôi hoặc xu.');
  }
  completed = true;
  console.log(`Save DEV: ${filename}`);
  console.log(`${state.walletCoins} xu, ${maturePlots} luống chín, ${fruitingTrees} cây có quả, 7 loài vật nuôi.`);
} finally {
  Date.now = realNow;
  handler?.closeAll();
  await new Promise((resolve) => server ? server.close(resolve) : resolve());
  await vite?.close();
  if (!completed) await unlink(filename);
}
