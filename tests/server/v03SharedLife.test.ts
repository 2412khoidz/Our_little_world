// @vitest-environment node
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';
import { daysUntilHcmDate, validateAlbumUploadMetadata } from '../../src/shared/sharedLife/sharedLifeTypes';

const MAY_ID = '11111111-1111-4111-8111-111111111111';
const NANG_ID = '22222222-2222-4222-8222-222222222222';
const OUTSIDER_ID = '33333333-3333-4333-8333-333333333333';

async function callApi(
  handler: ReturnType<typeof createDevLanHandler>,
  method: string,
  url: string,
  userId?: string,
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
  req.headers = userId ? { 'x-dev-user-id': userId } : {};

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

describe('Shared Life Dev LAN Vertical Slices (Journal, Wishlist, Calendar, Album)', () => {
  let stateFile: string;
  let handler: ReturnType<typeof createDevLanHandler>;
  let worldId: string;

  beforeEach(async () => {
    stateFile = path.join(os.tmpdir(), `olw-sharedlife-${Date.now()}-${Math.random()}.json`);
    handler = createDevLanHandler({ stateFilePath: stateFile });
    const seed = await callApi(handler, 'POST', '/seed-couple', MAY_ID, {});
    worldId = seed.json.data.world.id;
  });

  afterEach(() => {
    handler.closeAll();
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  });

  it('isolates private journal entries from partner, blocks outsiders, and persists wishlist/calendar/album', async () => {
    const outsiderRes = await callApi(handler, 'GET', `/shared-life?worldId=${worldId}`, OUTSIDER_ID);
    expect(outsiderRes.status).toBe(403);

    // Mây saves 1 private journal & 1 shared journal
    await callApi(handler, 'POST', '/shared-life/journal', MAY_ID, {
      worldId,
      title: 'Bí mật bất ngờ',
      body: 'Chuẩn bị quà sinh nhật cho Nắng',
      visibility: 'private',
    });
    await callApi(handler, 'POST', '/shared-life/journal', MAY_ID, {
      worldId,
      title: 'Tối thứ Bảy',
      body: 'Hai đứa cùng chăm mèo Quýt.',
      visibility: 'shared',
    });

    const nangRead = await callApi(handler, 'GET', `/shared-life?worldId=${worldId}`, NANG_ID);
    expect(nangRead.status).toBe(200);
    expect(nangRead.json.data.journal).toHaveLength(1);
    expect(nangRead.json.data.journal[0].title).toBe('Tối thứ Bảy');

    // Wishlist + Calendar + Album selection persist across reload
    const wishRes = await callApi(handler, 'POST', '/shared-life/wishlist/add', NANG_ID, {
      worldId,
      category: 'visit',
      title: 'Ngắm biển sáng sớm',
    });
    const wishId = wishRes.json.data.wishlist[0].id as string;
    await callApi(handler, 'POST', '/shared-life/wishlist/toggle', MAY_ID, {
      worldId,
      itemId: wishId,
    });
    await callApi(handler, 'POST', '/shared-life/calendar/add', MAY_ID, {
      worldId,
      title: 'Hẹn nấu lẩu tối',
      dateIso: '2026-12-01',
      timeHhMm: '19:30',
      note: 'Có nấm và thịt bò',
    });
    await callApi(handler, 'POST', '/shared-life/album/select-frame', NANG_ID, {
      worldId,
      photoId: 'sakura-picnic',
    });

    const h2 = createDevLanHandler({ stateFilePath: stateFile });
    try {
      const mayReloaded = await callApi(h2, 'GET', `/shared-life?worldId=${worldId}`, MAY_ID);
      expect(mayReloaded.json.data.journal).toHaveLength(2);
      expect(mayReloaded.json.data.wishlist[0].completed).toBe(true);
      expect(mayReloaded.json.data.calendar).toHaveLength(1);
      expect(mayReloaded.json.data.activeWallPhotoId).toBe('sakura-picnic');
    } finally {
      h2.closeAll();
    }
  });

  it('validates album image MIME/5MB limit and Asia/Ho_Chi_Minh date countdown math', () => {
    expect(validateAlbumUploadMetadata('image/png', 1024 * 500).ok).toBe(true);
    expect(validateAlbumUploadMetadata('image/gif', 1024).ok).toBe(false);
    expect(validateAlbumUploadMetadata('image/jpeg', 6 * 1024 * 1024).ok).toBe(false);

    // 2026-11-25 18:00 UTC is 2026-11-26 01:00 in Asia/Ho_Chi_Minh!
    const utcNowMs = Date.parse('2026-11-25T18:00:00Z');
    expect(daysUntilHcmDate('2026-11-26', utcNowMs)).toBe(0);
    expect(daysUntilHcmDate('2026-11-28', utcNowMs)).toBe(2);
  });
});
