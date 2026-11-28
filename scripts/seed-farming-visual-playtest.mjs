import assert from 'node:assert/strict';
import { open, readFile, unlink } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createDevLanHandler } from './devLanServerPlugin.mjs';

const root = path.resolve(import.meta.dirname, '..');
const name = process.argv[2] ?? '.dev-lan-state-m3-acceptance-owner-qa-ready.json';
if (!/^\.dev-lan-state-m3-acceptance(?:-[a-z0-9-]+)?\.json$/i.test(name)) {
  throw new Error('Tên save phải có dạng .dev-lan-state-m3-acceptance[-tên].json.');
}
const filename = path.join(root, name);
try {
  await (await open(filename, 'wx')).close();
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  throw new Error(`Save đã tồn tại: ${filename}. Hãy chọn tên mới.`, { cause: error });
}

const realNow = Date.now;
const realRandom = Math.random;
const originalFastGrow = process.env.OLW_FARM_DEV_FAST_GROW;
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
  const { mulberry32 } = await vite.ssrLoadModule('/src/shared/rng.ts');
  const { tryHandleFarmDevLan } = await vite.ssrLoadModule('/src/server/devLanFarmRoute.ts');
  const { LIVESTOCK_SPECIES_LIST } = await vite.ssrLoadModule('/src/shared/farming/livestock.ts');
  const { WORKSHOP_DEFS, ALL_WORKSHOP_RECIPES } = await vite.ssrLoadModule('/src/shared/farming/workshops.ts');
  const { farmPlotTileForIndex, isFarmPlotIndexOnContractSoil } = await vite.ssrLoadModule('/src/shared/farming/farmPlotIndex.ts');
  const { DEFAULT_LIVESTOCK_TILES, DEFAULT_ORCHARD_SLOT_TILES } = await vite.ssrLoadModule('/src/shared/farming/farmEntityTiles.ts');
  const { getMapDefinition } = await vite.ssrLoadModule('/src/shared/maps.ts');
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

  // The fixed time offsets only affect this seeding process. The preview
  // subsequently loads ordinary DEV records and uses its regular clock.
  const now = realNow();
  Date.now = () => now - 3 * 60 * 60_000;
  Math.random = mulberry32(20261128);
  process.env.OLW_FARM_DEV_FAST_GROW = '0';
  await request('/seed-couple', {});
  const { world } = await request('/world/snapshot');
  const query = `?worldId=${world.id}`;
  let sequence = 0;
  const act = (route, body) => request(route + query, { worldId: world.id, idempotencyKey: `owner-qa-${++sequence}`, ...body });
  const spawn = (itemSku, qty) => act('/dev-console/spawn-item', { itemSku, qty, scope: 'shared' });
  const deep = (kind, body) => act('/farm/deep/apply', { kind, ...body });
  const farm = (plotIndex, action, body = {}) => act('/farm/apply', { plotIndex, action, ...body });
  const plant = async (plotIndex, seedSku, water) => {
    assert(isFarmPlotIndexOnContractSoil(plotIndex), `Ô trồng không có trên bản đồ: ${plotIndex}`);
    await farm(plotIndex, 'till');
    await farm(plotIndex, 'plant', { seedSku });
    if (water) await farm(plotIndex, 'water');
  };
  const queue = (workshopId, recipeId) => deep('queue_workshop', { workshopId, recipeId });

  await request('/farm' + query);
  for (let shipment = 0; shipment < 6; shipment += 1) {
    await spawn('pomegranate', 85);
    await act('/farm/ship', { lines: [{ sku: 'pomegranate', qty: 85 }] });
  }

  const requiredStock = new Map(Object.entries({
    tool_hoe: 1, tool_watering_can: 1, water_pitcher: 1, tool_hoe_copper: 1, tool_can_copper: 1,
    rod_basic: 1, bait_free_worm: 48, bait_shrimp: 24, fish_minnow: 8,
    seed_wheat: 24, seed_carrot: 24, seed_potato: 24, seed_tomato: 24, seed_cabbage: 16,
    seed_rose_pink: 12, sapling_cherry: 4, sapling_plum: 3, sapling_cocoa: 2,
    fert_compost: 20, fert_speed: 12, fert_quality: 12, sprinkler_basic: 3,
    feed_deluxe: 16, wild_clover: 20,
    gift_star_jar: 2, letter_stationery_pink: 4, fish_salmon_bite: 3, toy_yarn: 1,
    wood_chair: 2, sakura_bouquet: 3, carrot_soup: 4, honey: 12, pomegranate: 12,
  }));
  for (const { feedSku } of LIVESTOCK_SPECIES_LIST) {
    if (feedSku) requiredStock.set(feedSku, 24);
  }
  // Stock at least three batches of each registered recipe, plus enough
  // headroom for recipes that share ingredients or for the prepared jobs.
  for (const { inputs } of ALL_WORKSHOP_RECIPES) {
    for (const { sku, qty } of inputs) {
      requiredStock.set(sku, Math.max(requiredStock.get(sku) ?? 0, qty * 8));
    }
  }
  const pantry = await request('/inventory' + query);
  const registered = new Map(pantry.catalog.map((item) => [item.sku, item]));
  const sharedQty = (items, sku) => items.reduce((qty, row) =>
    qty + (row.ownerScope === 'shared' && row.itemSku === sku ? row.qty : 0), 0);
  for (const [sku, qty] of requiredStock) {
    const entry = registered.get(sku);
    assert(entry, `SKU không đăng ký: ${sku}`);
    const current = sharedQty(pantry.items, sku);
    const missing = Math.min(qty, entry.stackLimit) - current;
    // The pet and farm starter packs can both grant basic tools.
    if (missing > 0 || current > entry.stackLimit) await spawn(sku, missing);
  }

  // First row(s): products ready. Further along: one unfed animal per
  // feedable species, so either type of interaction is testable immediately.
  const readyNames = { chicken: 'Bông', duck: 'Bèo', cow: 'Sữa', goat: 'Mơ', sheep: 'Mây Bông', rabbit: 'Bắp', bee: 'Mật' };
  const hungryNames = { chicken: 'Tấm', duck: 'Sen', cow: 'Kem', goat: 'Mận', sheep: 'Len', rabbit: 'Cốm' };
  for (const { speciesId, feedSku } of LIVESTOCK_SPECIES_LIST) {
    await deep('adopt_livestock', { speciesId, nickname: readyNames[speciesId] });
    if (feedSku) {
      const { projectedLivestock } = await request('/farm/deep' + query);
      const adopted = projectedLivestock.at(-1);
      assert.equal(adopted?.animal.speciesId, speciesId);
      await deep('feed_livestock', { animalId: adopted.animal.animalId, feedSku });
    }
  }
  for (const { speciesId, feedSku } of LIVESTOCK_SPECIES_LIST) {
    if (feedSku) await deep('adopt_livestock', { speciesId, nickname: hungryNames[speciesId] });
  }

  for (const [slotIndex, saplingSku] of ['sapling_cherry', 'sapling_plum', 'sapling_cherry', 'sapling_cocoa'].entries()) {
    await deep('plant_tree', { slotIndex, saplingSku });
  }
  const maturePlots = [[0, 'seed_wheat'], [1, 'seed_carrot'], [2, 'seed_potato'], [3, 'seed_tomato'], [120, 'seed_wheat']];
  for (const [plotIndex, seedSku] of maturePlots) await plant(plotIndex, seedSku, true);
  await queue('mill', 'flour');
  await queue('dairy', 'butter');
  await queue('preserves', 'strawberry_jam');

  Date.now = () => now - 12 * 60_000;
  await plant(7, 'seed_tomato', true);
  Date.now = () => now - 4 * 60_000;
  await plant(6, 'seed_carrot', true);
  Date.now = realNow;
  await farm(4, 'till');
  await plant(5, 'seed_cabbage', false);
  await queue('bakery', 'chocolate_cake');
  await queue('loom', 'wool_blanket');

  const state = await request('/farm/deep' + query);
  const surface = await request('/farm' + query);
  const inventory = await request('/inventory' + query);
  const saved = JSON.parse(await readFile(filename, 'utf8'));
  const candidates = state.projectedLivestock;
  const readyAnimals = candidates.filter(({ status }) => status === 'ready');
  const hungryAnimals = candidates.filter(({ status }) => status === 'hungry');
  const fruitingTrees = state.orchardViews.filter((tree) => tree.ready);
  const readyPlots = maturePlots.map(([index]) => surface.plots.find((plot) => plot.plotId === index));
  const trialPlots = [4, 5, 6, 7].map((index) => surface.plots.find(({ plotId }) => plotId === index));
  assert(state.walletCoins >= 5_000, 'Save thiếu xu thử mua hàng.');
  assert.equal(readyAnimals.length, LIVESTOCK_SPECIES_LIST.length);
  assert.equal(hungryAnimals.length, LIVESTOCK_SPECIES_LIST.filter(({ feedSku }) => feedSku).length);
  assert(readyPlots.every((plot) => plot?.ready), 'Save thiếu luống đã chín.');
  assert.equal(trialPlots[0]?.soil, 'tilled');
  assert.equal(trialPlots[1]?.waterCount, 0);
  assert(trialPlots.slice(1).every((plot) => plot?.soil === 'planted' && !plot.ready));
  assert(new Set(trialPlots.slice(1).map((plot) => plot.growthStage)).size >= 2, 'Save thiếu các giai đoạn sinh trưởng khác nhau.');
  assert(fruitingTrees.length >= 3, 'Save thiếu cây có quả.');
  assert.equal(Object.keys(saved.worlds).length, 1);
  assert.deepEqual(saved.v015.deepFarms[world.id].livestock, state.livestock);
  const inventoryKey = ({ ownerScope, itemSku, quality }) => [ownerScope, itemSku, quality ?? 'normal'].join('|');
  const sorted = (items) => items.toSorted((a, b) => inventoryKey(a).localeCompare(inventoryKey(b)));
  assert.deepEqual(sorted(saved.v015.inventory[world.id]), sorted(inventory.items));

  const map = getMapDefinition('farm');
  function hasApproach([x, y]) {
    return [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => !map.isStaticBlocked(x + dx, y + dy));
  }
  for (const tree of fruitingTrees) assert(hasApproach(DEFAULT_ORCHARD_SLOT_TILES[tree.slotIndex]), 'Không có lối tới cây.');
  for (const [index, { animal }] of candidates.entries()) {
    assert(hasApproach(DEFAULT_LIVESTOCK_TILES[index]), `Không có lối tới ${animal.animalId}.`);
    assert.equal(state.livestock.animals[index].animalId, animal.animalId);
    assert.equal(animal.petByActors.length, 0);
  }
  for (const item of inventory.items) {
    assert(registered.has(item.itemSku) && item.worldId === world.id && item.qty > 0 && Number.isInteger(item.qty));
    assert(item.qty <= registered.get(item.itemSku).stackLimit);
    assert(Number.isFinite(Date.parse(item.updatedAt)));
  }
  for (const { recipeId, inputs } of ALL_WORKSHOP_RECIPES) {
    assert(inputs.every(({ sku, qty }) => sharedQty(inventory.items, sku) >= qty * 3), `Thiếu nguyên liệu cho ${recipeId}.`);
  }
  const phases = WORKSHOP_DEFS.map(({ id }) => {
    const jobs = state.workshops.stations[id].queue;
    const phase = jobs.some(({ endMs }) => endMs <= state.serverNowMs) ? 'ready' : jobs.length ? 'working' : 'idle';
    return [id, phase];
  });
  assert.deepEqual(phases.filter(([, phase]) => phase === 'ready').map(([id]) => id), ['mill', 'dairy', 'preserves']);
  assert.deepEqual(phases.filter(([, phase]) => phase === 'working').map(([id]) => id), ['bakery', 'loom']);
  assert.equal(phases.filter(([, phase]) => phase === 'idle').length, 3);

  completed = true;
  console.log(`Save DEV: ${filename}`);
  console.log(`${state.walletCoins} xu | ${inventory.items.length} ngăn đồ | ${readyPlots.length} luống chín | ${fruitingTrees.length} cây có quả | ${readyAnimals.length} con có sản phẩm và ${hungryAnimals.length} con cần ăn.`);
  console.log('Luống chín:', readyPlots.map(({ plotId }) => farmPlotTileForIndex(plotId)));
  console.log('Luống thử:', trialPlots.map(({ plotId, growthStage }) => [farmPlotTileForIndex(plotId), growthStage]));
  console.log('Xưởng:', Object.fromEntries(phases));
} finally {
  Date.now = realNow;
  Math.random = realRandom;
  if (originalFastGrow === undefined) delete process.env.OLW_FARM_DEV_FAST_GROW;
  else process.env.OLW_FARM_DEV_FAST_GROW = originalFastGrow;
  handler?.closeAll();
  await new Promise((resolve) => server ? server.close(resolve) : resolve());
  await vite?.close();
  if (!completed) await unlink(filename);
}
