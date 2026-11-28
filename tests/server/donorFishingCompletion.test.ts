import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';
import { tryHandleDonorDevLan } from '../../src/server/devLanDonorRoute';

const may = '11111111-1111-4111-8111-111111111111';
const nang = '22222222-2222-4222-8222-222222222222';

it('grants the locked catch exactly once and ignores late round updates', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-fishing-finish-'));
  const handler = createDevLanHandler({
    stateFilePath: path.join(folder, 'test.json'),
    getTryHandleDonorDevLan: () => tryHandleDonorDevLan,
  });
  const server = http.createServer((req, res) => {
    void handler(req, res, () => { res.writeHead(404).end(); });
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/dev-lan`;
    async function api(route: string, data?: unknown, userId = may) {
      const response = await fetch(base + route, {
        headers: { 'Content-Type': 'application/json', 'x-dev-user-id': userId },
        method: data === undefined ? 'GET' : 'POST',
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      return { status: response.status, body: await response.json() };
    }
    await api('/seed-couple', {});
    const { body: world } = await api('/world/snapshot');
    const worldId = world.data.world.id;
    const session = (route: string, data?: object, userId = may) =>
      api(`/donor/fishing/${route}?worldId=${worldId}`, data === undefined ? undefined : { worldId, ...data }, userId);
    const stock = async (sku: string) => {
      const { body } = await api(`/inventory?worldId=${worldId}`);
      return (body.data.items as { ownerScope: string; itemSku: string; qty: number }[])
        .filter((row) => row.ownerScope === 'shared' && row.itemSku === sku).reduce((sum, row) => sum + row.qty, 0);
    };

    for (const spotId of ['meadow_pond', 'east_stream']) {
      const started = await session('start', { spotId });
      expect(started.status).toBe(200);
      const { seed: roundSeed, preview } = started.body.data;
      const before = await stock(preview.itemSku);
      const request = { roundSeed, reelProgressPermille: 1000 };
      expect((await session('resolve', request, nang)).status).toBe(409);
      expect((await session('resolve', { ...request, roundSeed: roundSeed + 1 })).status).toBe(409);
      const resolved = await session('resolve', request);
      expect(resolved.body.data).toMatchObject({
        itemSku: preview.itemSku, spriteUrl: preview.spriteUrl, escaped: false, qtyGranted: 1,
      });
      expect(await stock(preview.itemSku)).toBe(before + 1);
      expect((await session('resolve', request)).body.data.alreadyResolved).toBe(true);
      expect(await stock(preview.itemSku)).toBe(before + 1);
      await session('sync', { roundSeed, phase: 'idle', progressPermille: 0 });
      expect((await session('session')).body.data.phase).toBe('landed');
    }
  } finally {
    handler.closeAll();
    await new Promise<void>((done) => server.close(() => done()));
    fs.unlinkSync(path.join(folder, 'test.json'));
    fs.rmdirSync(folder);
  }
});
