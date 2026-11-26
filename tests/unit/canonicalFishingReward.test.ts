// @vitest-environment node
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';
import { tryHandleDonorDevLan } from '../../src/server/devLanDonorRoute';
import {
  CANONICAL_FISH_CATALOG,
  fishSpriteUrlForSku,
  isCanonicalFishSku,
  resolveCanonicalFishByCritterId,
  resolveCanonicalFishBySku,
} from '../../src/shared/donor/fishing/canonicalFishRegistry';
import {
  donorFishingPreview,
  donorFishingResolve,
} from '../../src/shared/donor/adapter/olwDonorAuthority';
import { kilnItemIconUrlForSku } from '../../src/shared/art/kilnItemIcons';
import { FARM_SELLABLE_FISH_SKUS } from '../../src/shared/farming/farmShipping';
import { createShippingBinState, sellToShippingBin } from '../../src/shared/economy/shippingBin';
import { sellCropLine } from '../../src/shared/farming/serverApply';

const MAY_ID = '11111111-1111-4111-8111-111111111111';

async function callApi(
  handler: ReturnType<typeof createDevLanHandler>,
  method: string,
  url: string,
  userId: string,
  body?: unknown,
) {
  const payload = body !== undefined ? JSON.stringify(body) : '';
  const req = Readable.from(payload ? [Buffer.from(payload, 'utf8')] : []) as unknown as Readable & {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  req.method = method;
  req.url = `/api/dev-lan${url}`;
  req.headers = { 'x-dev-user-id': userId };

  let statusCode = 200;
  let rawBody = '';
  const res = new EventEmitter() as EventEmitter & {
    statusCode: number;
    setHeader: () => void;
    end: (chunk?: string) => void;
  };
  Object.defineProperty(res, 'statusCode', {
    get: () => statusCode,
    set: (v: number) => {
      statusCode = v;
    },
  });
  res.setHeader = () => {};
  res.end = (chunk = '') => {
    rawBody += chunk;
  };

  await handler(req as never, res as never);
  return { status: statusCode, json: rawBody ? JSON.parse(rawBody) : null };
}

describe('Canonical Fish Identity & Authoritative Reward Pipeline (A2)', () => {
  let stateFile: string;
  let handler: ReturnType<typeof createDevLanHandler>;
  let worldId: string;

  beforeEach(async () => {
    stateFile = path.join(os.tmpdir(), `olw-fish-a2-${Date.now()}-${Math.random()}.json`);
    handler = createDevLanHandler({
      stateFilePath: stateFile,
      getTryHandleDonorDevLan: () => tryHandleDonorDevLan,
    } as unknown as Parameters<typeof createDevLanHandler>[0]);
    const seed = await callApi(handler, 'POST', '/seed-couple', MAY_ID, {});
    worldId = seed.json.data.world.id;
  });

  afterEach(() => {
    handler.closeAll();
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  });

  it('maps every canonical fish SKU to real Fishing Frenzy sprite URL and shipping-bin sellable metadata', () => {
    for (const spec of CANONICAL_FISH_CATALOG) {
      expect(isCanonicalFishSku(spec.sku)).toBe(true);
      expect(fishSpriteUrlForSku(spec.sku)).toBe(`/assets/donor/fishing-frenzy/sprites/${spec.spriteFile}`);
      expect(kilnItemIconUrlForSku(spec.sku)).toBe(`/assets/donor/fishing-frenzy/sprites/${spec.spriteFile}`);
      expect(FARM_SELLABLE_FISH_SKUS).toContain(spec.sku);
      expect(resolveCanonicalFishByCritterId(spec.critterIds[0]!).sku).toBe(spec.sku);
    }
    expect(resolveCanonicalFishByCritterId('minnow').sku).toBe('fish_minnow');
    expect(resolveCanonicalFishBySku('fish_golden_koi')?.labelVi).toBe('Cá koi hoàng kim');
  });

  it('keeps preview and resolve critterId/SKU/sprite 1:1 identical regardless of client progress/score', () => {
    const nowMs = Date.UTC(2026, 0, 2, 8, 0, 0);
    const preview = donorFishingPreview(987654, nowMs, 10, 'gull_bay');
    expect(preview.critterId.length).toBeGreaterThan(0);
    expect(isCanonicalFishSku(preview.itemSku)).toBe(true);
    expect(preview.spriteUrl).toContain('/assets/donor/fishing-frenzy/sprites/');

    const resolvedCatch = donorFishingResolve(987654, nowMs, 10, 1000, 'gull_bay', {
      critterId: preview.critterId,
      name: preview.name,
      itemSku: preview.itemSku,
      labelVi: preview.labelVi,
      rarity: preview.rarity,
      spriteUrl: preview.spriteUrl,
    });
    expect(resolvedCatch.escaped).toBe(false);
    expect(resolvedCatch.critterId).toBe(preview.critterId);
    expect(resolvedCatch.itemSku).toBe(preview.itemSku);
    expect(resolvedCatch.qtyGranted).toBe(1);

    const resolvedEscape = donorFishingResolve(987654, nowMs, 10, 150, 'gull_bay', {
      critterId: preview.critterId,
      name: preview.name,
      itemSku: preview.itemSku,
      labelVi: preview.labelVi,
      rarity: preview.rarity,
      spriteUrl: preview.spriteUrl,
    });
    expect(resolvedEscape.escaped).toBe(true);
    expect(resolvedEscape.itemSku).toBeNull();
    expect(resolvedEscape.qtyGranted).toBe(0);
  });

  it('grants 0 on escape, strictly 1 identical fish on catch + replay, and sells through shipping bin & direct sell', async () => {
    // 1. Escape attempt -> 0 fish granted
    const pEsc = await callApi(handler, 'POST', '/donor/fishing/start', MAY_ID, {
      worldId,
      spotId: 'farm_pond',
    });
    expect(pEsc.status).toBe(200);
    const escPreviewSku = pEsc.json.data.preview.itemSku as string;
    const rEsc = await callApi(handler, 'POST', '/donor/fishing/resolve', MAY_ID, {
      worldId,
      spotId: 'farm_pond',
      reelProgressPermille: 120,
    });
    expect(rEsc.status).toBe(200);
    expect(rEsc.json.data.escaped).toBe(true);
    expect(rEsc.json.data.qtyGranted).toBe(0);

    const invAfterEsc = await callApi(handler, 'GET', `/inventory?worldId=${worldId}`, MAY_ID);
    const escRow = invAfterEsc.json.data.items.find(
      (row: { itemSku: string }) => row.itemSku === escPreviewSku,
    );
    expect(escRow?.qty ?? 0).toBe(0);

    // 2. Successful catch + replay idempotency
    const pCatch = await callApi(handler, 'POST', '/donor/fishing/start', MAY_ID, {
      worldId,
      spotId: 'gull_bay',
    });
    expect(pCatch.status).toBe(200);
    const previewSku = pCatch.json.data.preview.itemSku as string;

    const r1 = await callApi(handler, 'POST', '/donor/fishing/resolve', MAY_ID, {
      worldId,
      spotId: 'gull_bay',
      reelProgressPermille: 1000,
    });
    expect(r1.status).toBe(200);
    expect(r1.json.data.escaped).toBe(false);
    expect(r1.json.data.itemSku).toBe(previewSku);
    expect(r1.json.data.qtyGranted).toBe(1);

    // Replay resolve without starting a new session must NOT grant a second fish
    const r2 = await callApi(handler, 'POST', '/donor/fishing/resolve', MAY_ID, {
      worldId,
      spotId: 'gull_bay',
      reelProgressPermille: 1000,
    });
    expect(r2.status).toBe(200);
    expect(r2.json.data.itemSku).toBe(previewSku);
    expect(r2.json.data.alreadyResolved).toBe(true);

    const invRes = await callApi(handler, 'GET', `/inventory?worldId=${worldId}`, MAY_ID);
    const caughtQty = invRes.json.data.items
      .filter((row: { itemSku: string }) => row.itemSku === previewSku)
      .reduce((acc: number, row: { qty: number }) => acc + row.qty, 0);
    expect(caughtQty).toBe(1);

    // Every canonical fish can be sold cleanly through shippingBin and sellCropLine
    const binState = createShippingBinState({ coins: 0 }, { [previewSku]: 1 }, Date.UTC(2026, 0, 2));
    const binSold = sellToShippingBin(binState, {
      lines: [{ sku: previewSku, qty: 1, quality: 'normal' }],
      nowMs: Date.UTC(2026, 0, 2),
      idempotencyKey: 'fish-ship-1',
      actorId: MAY_ID,
    });
    expect(binSold.ok).toBe(true);

    const directSold = sellCropLine(
      0,
      [{ worldId, itemSku: previewSku, qty: 1, ownerScope: 'shared', quality: 'silver', updatedAt: '' }],
      previewSku,
      1,
      'silver',
    );
    expect(directSold.ok).toBe(true);
  });
});
