import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { V015_CATALOG } from './devLanV015Handlers.mjs';
import { getPhysicalCatalog, migratePhysicalInventory, physicalSlots, physicalStackKey } from '../src/shared/inventory/physicalInventory.ts';

function migrateSave(db) {
  const v015 = db.v015;
  if (!v015?.inventory || !db.worlds) throw new Error('Save Dev LAN thiếu dữ liệu gốc.');
  const inventory = { ...v015.inventory };
  const physicalInventory = { ...v015.physicalInventory };
  const catalog = getPhysicalCatalog(V015_CATALOG);
  for (const worldId of Object.keys(db.worlds)) {
    if (physicalInventory[worldId]) {
      if (inventory[worldId]?.length) throw new Error('Save chứa hai nguồn kho cùng lúc.');
      delete inventory[worldId];
      continue;
    }
    if (v015.petLiving?.[worldId]?.offers?.some((offer) => offer.inventoryReserved)) {
      throw new Error('Cần xử lý lời mời ăn của mèo còn giữ vật phẩm trước khi chuyển.');
    }
    physicalInventory[worldId] = migratePhysicalInventory(undefined, worldId, inventory[worldId] ?? [], catalog);
    delete inventory[worldId];
  }
  return { ...db, v015: { ...v015, inventory, physicalInventory } };
}

function totals(rows) {
  const result = new Map();
  for (const { itemSku, ownerScope, quality = 'normal', metadata, qty } of rows) {
    const key = ownerScope + ':' + physicalStackKey({ itemSku, quality, metadata });
    const previous = result.get(key);
    result.set(key, { itemSku, ownerScope, quality, metadata: metadata ?? {}, qty: (previous?.qty ?? 0) + qty });
  }
  return [...result.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
}

function readPhysicalRows(state) {
  return Object.entries(state.containers).flatMap(([containerId, container]) => {
    const ownerScope = containerId === 'home' ? 'shared' : 'user:' + containerId.slice(containerId.indexOf(':') + 1);
    return physicalSlots(container).map(({ stack }) => ({ ...stack, ownerScope, containerId }));
  });
}

function withoutInventory(db) {
  const { inventory: _legacy, physicalInventory: _physical, ...v015 } = db.v015;
  return { ...db, v015 };
}

const [input, output, report] = process.argv.slice(2).map((path) => resolve(path));
if (!input || !output || !report || new Set([input.toLowerCase(), output.toLowerCase(), report.toLowerCase()]).size !== 3
  || !/^\.dev-lan-state-inv2-[a-z0-9_-]+\.json$/i.test(basename(output))
  || !/^\.dev-lan-state-inv2-[a-z0-9_-]+\.json$/i.test(basename(report))) {
  throw new Error('Cần ba file khác nhau: save đầu vào, save INV.2 mới và báo cáo .dev-lan-state-inv2-*.json.');
}
const raw = readFileSync(input);
const initial = JSON.parse(raw.toString('utf8'));
const migrated = migrateSave(initial);
if (!isDeepStrictEqual(migrated, migrateSave(migrated)) || !isDeepStrictEqual(migrated, migrateSave(initial))) {
  throw new Error('Migration lặp lại cho kết quả khác.');
}
if (!isDeepStrictEqual(withoutInventory(initial), withoutInventory(migrated))) {
  throw new Error('Dữ liệu ngoài kho bị thay đổi.');
}

const worlds = Object.keys(initial.worlds).map((worldId, index) => {
  const before = initial.v015.inventory[worldId] ?? readPhysicalRows(initial.v015.physicalInventory[worldId]);
  const after = readPhysicalRows(migrated.v015.physicalInventory[worldId]);
  const explicitInstances = new Set(before.flatMap((row) => row.metadata?.instanceId ? [row.metadata.instanceId] : []));
  const normalized = after.map(({ metadata, ...row }) => {
    if (!metadata?.instanceId || explicitInstances.has(metadata.instanceId)) return { ...row, metadata };
    const { instanceId: _generated, ...retained } = metadata;
    return { ...row, metadata: retained };
  });
  if (!isDeepStrictEqual(totals(before), totals(normalized))) throw new Error('Số lượng, chủ sở hữu, phẩm cấp hoặc metadata sau chuyển đổi sai.');
  return {
    world: index + 1,
    members: initial.memberships[worldId]?.length ?? 0,
    coins: initial.v015.wallets[worldId]?.coins ?? null,
    itemUnits: before.reduce((sum, row) => sum + row.qty, 0),
    groups: totals(before).length,
    before: totals(before),
    after: totals(after),
    generatedEquipmentInstances: after.filter((row) => row.metadata?.instanceId && !explicitInstances.has(row.metadata.instanceId)).length,
    overflowUnits: after.filter((row) => row.containerId.startsWith('overflow:')).reduce((sum, row) => sum + row.qty, 0),
  };
});
const migratedJson = JSON.stringify(migrated);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const summary = { source: basename(input), save: basename(output), sourceSha256: digest(raw), migratedSha256: digest(migratedJson),
  outsideInventoryEqual: true, idempotent: true, worlds };
writeFileSync(report, JSON.stringify(summary, null, 2), { flag: 'wx' });
writeFileSync(output, migratedJson, { flag: 'wx' });
console.log(JSON.stringify(worlds.map(({ world, members, coins, itemUnits, groups, generatedEquipmentInstances, overflowUnits }) =>
  ({ world, members, coins, itemUnits, groups, generatedEquipmentInstances, overflowUnits }))));
