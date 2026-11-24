import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureV015Db, handleV015Route } from './devLanV015Handlers.mjs';

const DEV_IDENTITIES = [
  {
    presetId: 'partner-a',
    userId: '11111111-1111-4111-8111-111111111111',
    email: 'partner-a.dev@ourlittleworld.test',
    defaultNickname: 'Mây',
    roleLabel: 'Chủ nhà',
    defaultAvatar: {
      skinTone: 'warm',
      hairStyle: 'short',
      hairColor: 'espresso',
      outfitStyle: 'sweater',
      outfitColor: 'sage',
      accessory: 'glasses',
    },
  },
  {
    presetId: 'partner-b',
    userId: '22222222-2222-4222-8222-222222222222',
    email: 'partner-b.dev@ourlittleworld.test',
    defaultNickname: 'Nắng',
    roleLabel: 'Người thương',
    defaultAvatar: {
      skinTone: 'fair',
      hairStyle: 'long',
      hairColor: 'chestnut',
      outfitStyle: 'cardigan',
      outfitColor: 'rose',
      accessory: 'ribbon',
    },
  },
  {
    presetId: 'outsider',
    userId: '33333333-3333-4333-8333-333333333333',
    email: 'khachla.dev@ourlittleworld.test',
    defaultNickname: 'Khách lạ',
    roleLabel: 'Test từ chối người thứ 3',
    defaultAvatar: {
      skinTone: 'tan',
      hairStyle: 'bob',
      hairColor: 'honey',
      outfitStyle: 'overall',
      outfitColor: 'sky',
      accessory: 'none',
    },
  },
];

const FURNITURE_CATALOG = new Map([
  ['bed_cozy', { nameVi: 'Giường đôi ấm áp', allowedMaps: ['home'], layerSlot: 'object', w: 2, h: 2, stock: 1 }],
  ['wardrobe_oak', { nameVi: 'Tủ đồ gỗ sồi', allowedMaps: ['home'], layerSlot: 'object', w: 1, h: 1, stock: 1 }],
  ['bookshelf_warm', { nameVi: 'Kệ sách nhỏ', allowedMaps: ['home'], layerSlot: 'object', w: 1, h: 1, stock: 1 }],
  ['lamp_floor', { nameVi: 'Đèn đứng ánh vàng', allowedMaps: ['home'], layerSlot: 'object', w: 1, h: 1, stock: 2 }],
  ['sofa_cream', { nameVi: 'Ghế sofa kem', allowedMaps: ['home'], layerSlot: 'object', w: 2, h: 1, stock: 1 }],
  ['table_wood', { nameVi: 'Bàn gỗ uống trà', allowedMaps: ['home'], layerSlot: 'object', w: 2, h: 1, stock: 1 }],
  ['desk_study', { nameVi: 'Bàn học yên tĩnh', allowedMaps: ['home'], layerSlot: 'object', w: 2, h: 1, stock: 1 }],
  ['plant_monstera', { nameVi: 'Chậu cây xanh', allowedMaps: ['home'], layerSlot: 'object', w: 1, h: 1, stock: 3 }],
  ['rug_peach', { nameVi: 'Thảm đào dệt tay', allowedMaps: ['home'], layerSlot: 'floor', w: 2, h: 2, stock: 2 }],
  ['bench_garden', { nameVi: 'Ghế gỗ sân vườn', allowedMaps: ['garden'], layerSlot: 'object', w: 2, h: 1, stock: 2 }],
  ['lantern_garden', { nameVi: 'Đèn lồng đá vườn', allowedMaps: ['garden'], layerSlot: 'object', w: 1, h: 1, stock: 3 }],
  ['flowerpot_sakura', { nameVi: 'Chậu hoa anh đào', allowedMaps: ['garden'], layerSlot: 'object', w: 1, h: 1, stock: 3 }],
]);

const DEFAULT_STARTER_SPECS = [
  { mapId: 'home', sku: 'bed_cozy', tileX: 1, tileY: 3 },
  { mapId: 'home', sku: 'wardrobe_oak', tileX: 3, tileY: 3 },
  { mapId: 'home', sku: 'lamp_floor', tileX: 4, tileY: 3 },
  { mapId: 'home', sku: 'bookshelf_warm', tileX: 10, tileY: 3 },
  { mapId: 'home', sku: 'desk_study', tileX: 12, tileY: 3 },
  { mapId: 'home', sku: 'plant_monstera', tileX: 14, tileY: 3 },
  { mapId: 'home', sku: 'rug_peach', tileX: 5, tileY: 6 },
  { mapId: 'home', sku: 'sofa_cream', tileX: 5, tileY: 5 },
  { mapId: 'home', sku: 'table_wood', tileX: 10, tileY: 6 },
  { mapId: 'garden', sku: 'bench_garden', tileX: 4, tileY: 6 },
  { mapId: 'garden', sku: 'lantern_garden', tileX: 7, tileY: 5 },
  { mapId: 'garden', sku: 'flowerpot_sakura', tileX: 11, tileY: 4 },
];

function isMapOutOfBounds(mapId, x, y) {
  if (mapId === 'home') return x < 0 || y < 0 || x >= 16 || y >= 12;
  if (mapId === 'garden') return x < 0 || y < 0 || x >= 18 || y >= 14;
  return true;
}

function isMapStaticBlocked(mapId, x, y) {
  if (isMapOutOfBounds(mapId, x, y)) return true;
  if (mapId === 'home') {
    if (y <= 2 || x === 0 || x === 15) return true;
    if (y === 11 && x !== 7 && x !== 8) return true;
    return false;
  }
  if (x === 0 || x === 17 || y === 0 || y === 13) return true;
  if (y === 1 && x >= 7 && x <= 9) return true;
  if (y === 2 && (x === 7 || x === 9)) return true;
  if (y === 3 && (x === 2 || x === 3 || x === 14 || x === 15)) return true;
  return false;
}

function isMapNoPlaceZone(mapId, x, y) {
  if (mapId === 'home') {
    if (y >= 10 && (x === 7 || x === 8)) return true;
    if (y === 9 && (x === 7 || x === 8)) return true;
    return false;
  }
  if (y === 2 && x === 8) return true;
  if (y === 3 && x >= 7 && x <= 9) return true;
  if (y === 4 && x === 8) return true;
  return false;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'OLW-';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return out;
}

function buildStarterPlacements(worldId, ownerId, nowIso) {
  return DEFAULT_STARTER_SPECS.map((spec, index) => {
    const item = FURNITURE_CATALOG.get(spec.sku);
    return {
      id: `starter-${index + 1}-${spec.sku}`,
      worldId,
      mapId: spec.mapId,
      sku: spec.sku,
      layerSlot: item.layerSlot,
      tileX: spec.tileX,
      tileY: spec.tileY,
      widthTiles: item.w,
      heightTiles: item.h,
      updatedBy: ownerId,
      updatedAt: nowIso,
    };
  });
}

function validatePlacementOnServer({ mapId, sku, tileX, tileY, placements, ignorePlacementId }) {
  if (!Number.isInteger(tileX) || !Number.isInteger(tileY)) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Vị trí đặt đồ chưa hợp lệ.' };
  }
  const item = FURNITURE_CATALOG.get(sku);
  if (!item) {
    return { ok: false, code: 'NOT_FOUND', message: 'Món nội thất không có trong danh sách.' };
  }
  if (!item.allowedMaps.includes(mapId)) {
    return { ok: false, code: 'WRONG_MAP', message: `${item.nameVi} không đặt được ở khu vực này.` };
  }

  let count = 0;
  for (const p of placements) {
    if (p.sku === sku && p.id !== ignorePlacementId) count += 1;
  }
  if (count >= item.stock) {
    return {
      ok: false,
      code: 'STOCK_EXCEEDED',
      message: `Bạn đã dùng hết ${item.stock} món ${item.nameVi}.`,
    };
  }

  const occupied = new Set();
  for (const p of placements) {
    if (p.id === ignorePlacementId || p.mapId !== mapId || p.layerSlot !== item.layerSlot) continue;
    for (let dy = 0; dy < p.heightTiles; dy += 1) {
      for (let dx = 0; dx < p.widthTiles; dx += 1) {
        occupied.add(`${p.tileX + dx},${p.tileY + dy}`);
      }
    }
  }

  for (let dy = 0; dy < item.h; dy += 1) {
    for (let dx = 0; dx < item.w; dx += 1) {
      const tx = tileX + dx;
      const ty = tileY + dy;
      if (isMapOutOfBounds(mapId, tx, ty)) {
        return { ok: false, code: 'OUT_OF_BOUNDS', message: 'Vị trí đặt vượt ra ngoài khu vực.' };
      }
      if (isMapStaticBlocked(mapId, tx, ty)) {
        return { ok: false, code: 'BLOCKED_TILE', message: 'Không thể đặt lên tường, hàng rào hoặc gốc cây.' };
      }
      if (isMapNoPlaceZone(mapId, tx, ty)) {
        return { ok: false, code: 'NO_PLACE_ZONE', message: 'Hãy chừa lối đi trước cửa ra vào nhé.' };
      }
      if (occupied.has(`${tx},${ty}`)) {
        return { ok: false, code: 'TILE_OCCUPIED', message: 'Ô này đã có món đồ khác chiếm chỗ.' };
      }
    }
  }

  return { ok: true, item };
}

function createInitialDb() {
  const profiles = {};
  const nowIso = new Date().toISOString();
  for (const id of DEV_IDENTITIES) {
    profiles[id.userId] = {
      userId: id.userId,
      nickname: id.defaultNickname,
      avatarConfig: id.defaultAvatar,
      updatedAt: nowIso,
    };
  }
  const dbObj = {
    profiles,
    worlds: {},
    memberships: {},
    invites: [],
    placements: {},
    idempotency: {},
  };
  ensureV015Db(dbObj);
  return dbObj;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  return JSON.parse(text);
}

export function createDevLanHandler({
  stateFilePath = path.join(process.cwd(), '.dev-lan-state.json'),
} = {}) {
  let db = createInitialDb();
  try {
    if (fs.existsSync(stateFilePath)) {
      db = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    }
  } catch {
    db = createInitialDb();
  }

  function saveDb() {
    fs.writeFileSync(stateFilePath, JSON.stringify(db, null, 2), 'utf8');
  }

  // Active SSE sessions keyed by sessionId -> { worldId, userId, sessionId, res, presence }
  const sseClients = new Map();

  function getWorldForUser(userId) {
    for (const [worldId, members] of Object.entries(db.memberships)) {
      if (members.some((m) => m.userId === userId)) return worldId;
    }
    return null;
  }

  function isWorldMember(worldId, userId) {
    return (db.memberships[worldId] ?? []).some((m) => m.userId === userId);
  }

  function buildSnapshot(worldId) {
    const world = db.worlds[worldId];
    const rawMembers = db.memberships[worldId];
    if (!world || !rawMembers) return null;
    const members = rawMembers.map((m) => {
      const profile = db.profiles[m.userId];
      const fallbackId = DEV_IDENTITIES.find((d) => d.userId === m.userId);
      return {
        userId: m.userId,
        role: m.role,
        nickname: profile?.nickname ?? fallbackId?.defaultNickname ?? 'Thành viên',
        avatarConfig: profile?.avatarConfig ?? fallbackId?.defaultAvatar ?? DEV_IDENTITIES[0].defaultAvatar,
        joinedAt: m.joinedAt,
      };
    });
    return {
      world,
      members,
      placements: [...(db.placements[worldId] ?? [])],
    };
  }

  function sendSse(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  function broadcastPresenceSync(worldId) {
    const list = [];
    for (const client of sseClients.values()) {
      if (client.worldId === worldId && client.presence) {
        list.push(client.presence);
      }
    }
    for (const client of sseClients.values()) {
      if (client.worldId === worldId) {
        sendSse(client.res, 'presence_sync', list);
      }
    }
  }

  function broadcastEvent(worldId, event, data, excludeSessionId = null) {
    for (const client of sseClients.values()) {
      if (client.worldId === worldId && client.sessionId !== excludeSessionId) {
        sendSse(client.res, event, data);
      }
    }
  }

  const keepaliveTimer = setInterval(() => {
    for (const client of sseClients.values()) {
      client.res.write(': keepalive\n\n');
    }
  }, 15000);
  keepaliveTimer.unref?.();

  function closeAll() {
    clearInterval(keepaliveTimer);
    for (const client of sseClients.values()) {
      client.res.end();
    }
    sseClients.clear();
  }

  async function middleware(req, res, next) {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    if (!reqUrl.pathname.startsWith('/api/dev-lan')) {
      next?.();
      return;
    }

    const route = reqUrl.pathname.slice('/api/dev-lan'.length);
    const userId = String(req.headers['x-dev-user-id'] ?? '').trim();

    try {
      // GET /identities — live dev roster & world status
      if (req.method === 'GET' && route === '/identities') {
        const worlds = Object.values(db.worlds);
        const primaryWorld = worlds[0] ?? null;
        const members = primaryWorld ? (db.memberships[primaryWorld.id] ?? []) : [];

        const identities = DEV_IDENTITIES.map((d) => {
          const userWorldId = getWorldForUser(d.userId);
          const membership = userWorldId
            ? (db.memberships[userWorldId] ?? []).find((m) => m.userId === d.userId)
            : null;
          const profile = db.profiles[d.userId];
          return {
            presetId: d.presetId,
            userId: d.userId,
            email: d.email,
            nickname: profile?.nickname ?? d.defaultNickname,
            roleLabel: d.roleLabel,
            inWorld: Boolean(userWorldId),
            worldRole: membership?.role ?? null,
          };
        });

        sendJson(res, 200, {
          ok: true,
          data: {
            identities,
            worldExists: Boolean(primaryWorld),
            worldName: primaryWorld?.name ?? null,
            memberCount: members.length,
          },
        });
        return;
      }

      // POST /reset — dev-only reset
      if (req.method === 'POST' && route === '/reset') {
        const affectedWorlds = Object.keys(db.worlds);
        db = createInitialDb();
        saveDb();
        for (const wid of affectedWorlds) {
          broadcastEvent(wid, 'world_reset', { reset: true });
        }
        sendJson(res, 200, { ok: true, data: { reset: true } });
        return;
      }

      // POST /seed-couple — dev-only quick-start 2/2 house (Mây + Nắng)
      if (req.method === 'POST' && route === '/seed-couple') {
        const existingId = Object.keys(db.worlds)[0];
        if (existingId) {
          sendJson(res, 200, { ok: true, data: buildSnapshot(existingId) });
          return;
        }
        const nowIso = new Date().toISOString();
        const worldId = `world-${crypto.randomUUID()}`;
        const may = DEV_IDENTITIES[0];
        const haAnh = DEV_IDENTITIES[1];
        db.worlds[worldId] = {
          id: worldId,
          name: 'Nhà của Mây & Nắng',
          layoutVersion: 1,
          createdAt: nowIso,
        };
        db.memberships[worldId] = [
          { userId: may.userId, role: 'owner', joinedAt: nowIso },
          { userId: haAnh.userId, role: 'partner', joinedAt: nowIso },
        ];
        db.placements[worldId] = buildStarterPlacements(worldId, may.userId, nowIso);
        saveDb();
        sendJson(res, 200, { ok: true, data: buildSnapshot(worldId) });
        return;
      }

      // GET /events — Server-Sent Events realtime stream
      if (req.method === 'GET' && route === '/events') {
        const qWorldId = reqUrl.searchParams.get('worldId') ?? '';
        const qUserId = reqUrl.searchParams.get('userId') ?? '';
        const qSessionId = reqUrl.searchParams.get('sessionId') ?? '';
        if (!qWorldId || !qUserId || !qSessionId || !isWorldMember(qWorldId, qUserId)) {
          sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            message: 'Bạn chưa là thành viên của ngôi nhà này.',
          });
          return;
        }

        const profile = db.profiles[qUserId];
        const fallbackId = DEV_IDENTITIES.find((d) => d.userId === qUserId);
        const initialPresence = {
          userId: qUserId,
          sessionId: qSessionId,
          mapId: reqUrl.searchParams.get('mapId') === 'garden' ? 'garden' : 'home',
          nickname: profile?.nickname ?? fallbackId?.defaultNickname ?? 'Bạn',
          avatarConfig: profile?.avatarConfig ?? fallbackId?.defaultAvatar ?? DEV_IDENTITIES[0].defaultAvatar,
          tileX: Number(reqUrl.searchParams.get('tileX') ?? 8) || 8,
          tileY: Number(reqUrl.searchParams.get('tileY') ?? 9) || 9,
          facing: ['up', 'down', 'left', 'right'].includes(reqUrl.searchParams.get('facing') || '')
            ? reqUrl.searchParams.get('facing')
            : 'down',
          updatedAtMs: Date.now(),
        };

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        sseClients.set(qSessionId, {
          worldId: qWorldId,
          userId: qUserId,
          sessionId: qSessionId,
          res,
          presence: initialPresence,
        });

        broadcastPresenceSync(qWorldId);

        req.on('close', () => {
          const existing = sseClients.get(qSessionId);
          if (existing) {
            sseClients.delete(qSessionId);
            broadcastPresenceSync(qWorldId);
          }
        });
        return;
      }

      // All endpoints below require x-dev-user-id
      if (!userId) {
        sendJson(res, 401, {
          ok: false,
          code: 'UNAUTHENTICATED',
          message: 'Vui lòng chọn tài khoản trước khi vào nhà.',
        });
        return;
      }

      if (req.method === 'GET' && route === '/world/snapshot') {
        const wid = getWorldForUser(userId);
        sendJson(res, 200, { ok: true, data: wid ? buildSnapshot(wid) : null });
        return;
      }

      if (req.method === 'GET' && route === '/world/invite-status') {
        const worldId = reqUrl.searchParams.get('worldId') ?? '';
        if (!isWorldMember(worldId, userId)) {
          sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
          return;
        }
        const now = Date.now();
        const active = db.invites.find(
          (i) => i.worldId === worldId && i.redeemedAt === null && Date.parse(i.expiresAt) > now,
        );
        sendJson(res, 200, {
          ok: true,
          data: { hasActiveInvite: Boolean(active), expiresAt: active?.expiresAt ?? null },
        });
        return;
      }

      const body = await readJsonBody(req);

      if (req.method === 'POST' && route === '/world/create') {
        const worldName = String(body.worldName ?? '').trim();
        const nickname = String(body.nickname ?? '').trim();
        if (!worldName || worldName.length > 48 || !nickname || nickname.length > 32) {
          sendJson(res, 400, {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Tên nhà hoặc biệt danh chưa hợp lệ.',
          });
          return;
        }
        if (getWorldForUser(userId)) {
          sendJson(res, 409, {
            ok: false,
            code: 'ALREADY_IN_WORLD',
            message: 'Tài khoản này đã thuộc về một ngôi nhà rồi.',
          });
          return;
        }

        const nowIso = new Date().toISOString();
        const worldId = `world-${crypto.randomUUID()}`;
        const fallbackAvatar =
          DEV_IDENTITIES.find((d) => d.userId === userId)?.defaultAvatar ?? DEV_IDENTITIES[0].defaultAvatar;
        db.profiles[userId] = {
          userId,
          nickname,
          avatarConfig: body.avatarConfig ?? fallbackAvatar,
          updatedAt: nowIso,
        };
        db.worlds[worldId] = { id: worldId, name: worldName, layoutVersion: 1, createdAt: nowIso };
        db.memberships[worldId] = [{ userId, role: 'owner', joinedAt: nowIso }];
        db.placements[worldId] = buildStarterPlacements(worldId, userId, nowIso);
        saveDb();
        sendJson(res, 200, { ok: true, data: buildSnapshot(worldId) });
        return;
      }

      if (req.method === 'POST' && route === '/world/invite') {
        const worldId = String(body.worldId ?? '');
        if (!isWorldMember(worldId, userId)) {
          sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
          return;
        }
        const members = db.memberships[worldId] ?? [];
        if (members.length >= 2) {
          sendJson(res, 409, {
            ok: false,
            code: 'WORLD_FULL',
            message: 'Ngôi nhà đã đủ 2 thành viên.',
          });
          return;
        }
        db.invites = db.invites.filter((i) => !(i.worldId === worldId && i.redeemedAt === null));
        const inviteCode = generateInviteCode();
        const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
        db.invites.push({
          id: `inv-${crypto.randomUUID()}`,
          worldId,
          tokenHash: sha256Hex(inviteCode),
          expiresAt,
          redeemedBy: null,
          redeemedAt: null,
        });
        saveDb();
        sendJson(res, 200, { ok: true, data: { inviteCode, expiresAt } });
        return;
      }

      if (req.method === 'POST' && route === '/world/redeem') {
        const inviteCode = String(body.inviteCode ?? '').trim().toUpperCase();
        const nickname = String(body.nickname ?? '').trim();
        if (!inviteCode || inviteCode.length < 6 || !nickname || nickname.length > 32) {
          sendJson(res, 400, {
            ok: false,
            code: 'INVITE_INVALID',
            message: 'Mã mời hoặc biệt danh chưa hợp lệ.',
          });
          return;
        }
        if (getWorldForUser(userId)) {
          sendJson(res, 409, {
            ok: false,
            code: 'ALREADY_IN_WORLD',
            message: 'Tài khoản này đã ở trong một ngôi nhà rồi.',
          });
          return;
        }
        const hash = sha256Hex(inviteCode);
        const invite = db.invites.find((i) => i.tokenHash === hash);
        if (!invite) {
          sendJson(res, 404, {
            ok: false,
            code: 'INVITE_INVALID',
            message: 'Mã mời không đúng hoặc không tồn tại.',
          });
          return;
        }
        if (invite.redeemedAt !== null) {
          sendJson(res, 409, {
            ok: false,
            code: 'INVITE_USED',
            message: 'Mã mời này đã có người sử dụng rồi.',
          });
          return;
        }
        if (Date.parse(invite.expiresAt) <= Date.now()) {
          sendJson(res, 410, {
            ok: false,
            code: 'INVITE_EXPIRED',
            message: 'Mã mời đã hết hạn. Hãy nhờ người kia tạo mã mới nhé.',
          });
          return;
        }
        const members = db.memberships[invite.worldId] ?? [];
        if (members.length >= 2) {
          sendJson(res, 403, {
            ok: false,
            code: 'WORLD_FULL',
            message: 'Ngôi nhà này đã đủ 2 người — tài khoản thứ ba không thể tham gia.',
          });
          return;
        }

        const nowIso = new Date().toISOString();
        const fallbackAvatar =
          DEV_IDENTITIES.find((d) => d.userId === userId)?.defaultAvatar ?? DEV_IDENTITIES[1].defaultAvatar;
        db.profiles[userId] = {
          userId,
          nickname,
          avatarConfig: body.avatarConfig ?? fallbackAvatar,
          updatedAt: nowIso,
        };
        members.push({ userId, role: 'partner', joinedAt: nowIso });
        db.memberships[invite.worldId] = members;
        invite.redeemedBy = userId;
        invite.redeemedAt = nowIso;
        saveDb();
        broadcastEvent(invite.worldId, 'world_mutated', { reason: 'member' });
        sendJson(res, 200, { ok: true, data: buildSnapshot(invite.worldId) });
        return;
      }

      if (req.method === 'POST' && route === '/profile') {
        const nickname = String(body.nickname ?? '').trim();
        if (!nickname || nickname.length > 32) {
          sendJson(res, 400, {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Biệt danh cần từ 1 đến 32 ký tự.',
          });
          return;
        }
        const fallbackAvatar =
          DEV_IDENTITIES.find((d) => d.userId === userId)?.defaultAvatar ?? DEV_IDENTITIES[0].defaultAvatar;
        const profile = {
          userId,
          nickname,
          avatarConfig: body.avatarConfig ?? fallbackAvatar,
          updatedAt: new Date().toISOString(),
        };
        db.profiles[userId] = profile;
        saveDb();
        const worldId = getWorldForUser(userId);
        if (worldId) {
          for (const client of sseClients.values()) {
            if (client.worldId === worldId && client.userId === userId && client.presence) {
              client.presence = {
                ...client.presence,
                nickname: profile.nickname,
                avatarConfig: profile.avatarConfig,
                updatedAtMs: Date.now(),
              };
            }
          }
          broadcastPresenceSync(worldId);
          broadcastEvent(worldId, 'world_mutated', { reason: 'profile' });
        }
        sendJson(res, 200, { ok: true, data: profile });
        return;
      }

      if (req.method === 'POST' && route === '/furniture/place') {
        const { worldId, mapId, sku, tileX, tileY, expectedLayoutVersion, idempotencyKey } = body;
        if (!isWorldMember(worldId, userId)) {
          sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
          return;
        }
        const world = db.worlds[worldId];
        if (!world) {
          sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy ngôi nhà.' });
          return;
        }
        const idemKey = `${worldId}:${idempotencyKey}`;
        if (db.idempotency[idemKey]) {
          sendJson(res, 200, { ok: true, data: db.idempotency[idemKey] });
          return;
        }
        if (world.layoutVersion !== expectedLayoutVersion) {
          sendJson(res, 409, {
            ok: false,
            code: 'VERSION_CONFLICT',
            message: 'Người kia vừa sắp xếp lại đồ đạc, nhà đã được cập nhật mới nhất.',
          });
          return;
        }
        const placements = db.placements[worldId] ?? [];
        const check = validatePlacementOnServer({ mapId, sku, tileX, tileY, placements });
        if (!check.ok) {
          sendJson(res, 400, { ok: false, code: check.code, message: check.message });
          return;
        }
        const newPlacement = {
          id: `furn-${crypto.randomUUID()}`,
          worldId,
          mapId,
          sku,
          layerSlot: check.item.layerSlot,
          tileX,
          tileY,
          widthTiles: check.item.w,
          heightTiles: check.item.h,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        };
        db.placements[worldId] = [...placements, newPlacement];
        world.layoutVersion += 1;
        const result = { layoutVersion: world.layoutVersion, placement: newPlacement };
        db.idempotency[idemKey] = result;
        saveDb();
        broadcastEvent(worldId, 'world_mutated', { reason: 'furniture' });
        sendJson(res, 200, { ok: true, data: result });
        return;
      }

      if (req.method === 'POST' && route === '/furniture/move') {
        const { worldId, placementId, tileX, tileY, expectedLayoutVersion, idempotencyKey } = body;
        if (!isWorldMember(worldId, userId)) {
          sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
          return;
        }
        const world = db.worlds[worldId];
        if (!world) {
          sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy ngôi nhà.' });
          return;
        }
        const idemKey = `${worldId}:${idempotencyKey}`;
        if (db.idempotency[idemKey]) {
          sendJson(res, 200, { ok: true, data: db.idempotency[idemKey] });
          return;
        }
        if (world.layoutVersion !== expectedLayoutVersion) {
          sendJson(res, 409, {
            ok: false,
            code: 'VERSION_CONFLICT',
            message: 'Người kia vừa sắp xếp lại đồ đạc, nhà đã được cập nhật mới nhất.',
          });
          return;
        }
        const placements = db.placements[worldId] ?? [];
        const target = placements.find((p) => p.id === placementId);
        if (!target) {
          sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Món đồ này không còn ở trên sàn.' });
          return;
        }
        const check = validatePlacementOnServer({
          mapId: target.mapId,
          sku: target.sku,
          tileX,
          tileY,
          placements,
          ignorePlacementId: target.id,
        });
        if (!check.ok) {
          sendJson(res, 400, { ok: false, code: check.code, message: check.message });
          return;
        }
        const updated = {
          ...target,
          tileX,
          tileY,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        };
        db.placements[worldId] = placements.map((p) => (p.id === target.id ? updated : p));
        world.layoutVersion += 1;
        const result = { layoutVersion: world.layoutVersion, placement: updated };
        db.idempotency[idemKey] = result;
        saveDb();
        broadcastEvent(worldId, 'world_mutated', { reason: 'furniture' });
        sendJson(res, 200, { ok: true, data: result });
        return;
      }

      if (req.method === 'POST' && route === '/furniture/remove') {
        const { worldId, placementId, expectedLayoutVersion, idempotencyKey } = body;
        if (!isWorldMember(worldId, userId)) {
          sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
          return;
        }
        const world = db.worlds[worldId];
        if (!world) {
          sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy ngôi nhà.' });
          return;
        }
        const idemKey = `${worldId}:${idempotencyKey}`;
        if (db.idempotency[idemKey]) {
          sendJson(res, 200, { ok: true, data: db.idempotency[idemKey] });
          return;
        }
        if (world.layoutVersion !== expectedLayoutVersion) {
          sendJson(res, 409, {
            ok: false,
            code: 'VERSION_CONFLICT',
            message: 'Người kia vừa sắp xếp lại đồ đạc, nhà đã được cập nhật mới nhất.',
          });
          return;
        }
        const placements = db.placements[worldId] ?? [];
        if (!placements.some((p) => p.id === placementId)) {
          sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Món đồ không còn tồn tại.' });
          return;
        }
        db.placements[worldId] = placements.filter((p) => p.id !== placementId);
        world.layoutVersion += 1;
        const result = { layoutVersion: world.layoutVersion, removedId: placementId };
        db.idempotency[idemKey] = result;
        saveDb();
        broadcastEvent(worldId, 'world_mutated', { reason: 'furniture' });
        sendJson(res, 200, { ok: true, data: result });
        return;
      }

      if (req.method === 'POST' && route === '/realtime') {
        const { worldId, kind, sessionId, payload } = body;
        if (!isWorldMember(worldId, userId)) {
          sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
          return;
        }
        if (kind === 'presence' && sessionId && payload) {
          const client = sseClients.get(sessionId);
          if (client && client.userId === userId) {
            client.presence = { ...payload, userId, sessionId, updatedAtMs: Date.now() };
            broadcastPresenceSync(worldId);
          }
        } else if (kind === 'movement' && payload) {
          broadcastEvent(worldId, 'movement', payload, sessionId || null);
        } else if (kind === 'world_mutated') {
          broadcastEvent(worldId, 'world_mutated', payload ?? { reason: 'furniture' }, sessionId || null);
        } else if (kind === 'spike_cinema' && payload) {
          broadcastEvent(worldId, 'spike_cinema', payload, sessionId || null);
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      const handledV015 = await handleV015Route({
        req,
        res,
        route,
        reqUrl,
        body,
        userId,
        db,
        isWorldMember,
        sendJson,
        saveDb,
        broadcastEvent,
      });
      if (handledV015) return;

      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn dev.' });
    } catch (err) {
      sendJson(res, 500, {
        ok: false,
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Lỗi máy chủ nội bộ.',
      });
    }
  }

  middleware.closeAll = closeAll;
  return middleware;
}

function createAssetCandidatesMiddleware() {
  const candidatesRoot = path.resolve(process.cwd(), 'asset-candidates');
  const MIME_TYPES = {
    '.png': 'image/png',
    '.json': 'application/json; charset=utf-8',
  };

  return function assetCandidatesMiddleware(req, res, next) {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    if (req.method !== 'GET' || !reqUrl.pathname.startsWith('/asset-candidates/')) {
      next?.();
      return;
    }

    let relPath;
    try {
      relPath = decodeURIComponent(reqUrl.pathname.slice('/asset-candidates/'.length));
    } catch {
      res.statusCode = 400;
      res.end('Bad asset path');
      return;
    }

    const resolved = path.resolve(candidatesRoot, relPath);
    if (!resolved.startsWith(candidatesRoot + path.sep)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME_TYPES[ext];
    if (!mime || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      res.statusCode = 404;
      res.end('Asset not found');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(resolved).pipe(res);
  };
}

export function devLanServerPlugin(options = {}) {
  return {
    name: 'olw-dev-lan-server',
    apply: 'serve',
    configureServer(server) {
      const handler = createDevLanHandler({
        stateFilePath: options.stateFilePath || process.env.OLW_DEV_LAN_STATE_FILE || undefined,
      });
      const assetCandidates = createAssetCandidatesMiddleware();
      server.middlewares.use(assetCandidates);
      server.middlewares.use(handler);
      server.httpServer?.once('close', () => {
        handler.closeAll();
      });
    },
  };
}
