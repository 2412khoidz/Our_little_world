import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { V015_CATALOG, ensureV015Db, initializeDevLanWorldInventory, handleV015Route } from './devLanV015Handlers.mjs';
import { createSharedPetCareSession, mergeSharedPetCareSession } from './devLanPetCareSession.mjs';
import { handleBilliardsRoute } from './devLanBilliardsHandlers.mjs';
import { createDevLanWsHub } from './devLanWsHub.mjs';
import { getRemoteShareStatus, startRemoteShare, stopRemoteShare } from './olwRemoteShare.mjs';

const PARTNER_B_DEV_ID = '22222222-2222-4222-8222-222222222222';

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
  ['sakura_bush_decor', { nameVi: 'Bụi hoa anh đào', allowedMaps: ['garden'], layerSlot: 'object', w: 1, h: 1, stock: 10, devSandboxOnly: true }],
  ['sakura_petals_decor', { nameVi: 'Thảm cánh hoa đào', allowedMaps: ['garden'], layerSlot: 'floor', w: 1, h: 1, stock: 20, devSandboxOnly: true }],
  ['planter_box_decor', { nameVi: 'Bồn hoa gỗ vườn', allowedMaps: ['garden'], layerSlot: 'object', w: 1, h: 1, stock: 10, devSandboxOnly: true }],
  ['sunflower_cluster_decor', { nameVi: 'Khóm hoa hướng dương', allowedMaps: ['garden'], layerSlot: 'object', w: 1, h: 1, stock: 10, devSandboxOnly: true }],
  ['picnic_blanket_decor', { nameVi: 'Thảm dã ngoại caro', allowedMaps: ['garden'], layerSlot: 'floor', w: 2, h: 2, stock: 4, devSandboxOnly: true }],
  ['picnic_basket_decor', { nameVi: 'Giỏ dã ngoại mây', allowedMaps: ['garden'], layerSlot: 'object', w: 1, h: 1, stock: 4, devSandboxOnly: true }],
  ['beehive_garden', { nameVi: 'Tổ ong mật vườn', allowedMaps: ['garden'], layerSlot: 'object', w: 1, h: 1, stock: 4, devSandboxOnly: true }],
  ['fence_wood_post', { nameVi: 'Cọc rào gỗ vườn', allowedMaps: ['garden'], layerSlot: 'object', w: 1, h: 1, stock: 20, devSandboxOnly: true }],
  ['mailbox_garden', { nameVi: 'Hộp thư đỏ cổ điển', allowedMaps: ['garden'], layerSlot: 'object', w: 1, h: 1, stock: 2, devSandboxOnly: true }],
  ['wishing_well_garden', { nameVi: 'Giếng ước sân vườn', allowedMaps: ['garden'], layerSlot: 'object', w: 2, h: 2, stock: 2, devSandboxOnly: true }],
  ['hay_bale_decor', { nameVi: 'Cuộn rơm ấm áp', allowedMaps: ['garden'], layerSlot: 'object', w: 1, h: 1, stock: 6, devSandboxOnly: true }],
  ['rug_coral_decor', { nameVi: 'Thảm san hô dệt tay', allowedMaps: ['home'], layerSlot: 'floor', w: 2, h: 2, stock: 4, devSandboxOnly: true }],
  ['bookshelf_wide_decor', { nameVi: 'Tủ sách gỗ lớn', allowedMaps: ['home'], layerSlot: 'object', w: 2, h: 1, stock: 3, devSandboxOnly: true }],
  ['photo_frame_decor', { nameVi: 'Khung ảnh kỷ niệm', allowedMaps: ['home'], layerSlot: 'object', w: 1, h: 1, stock: 4, devSandboxOnly: true }],
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

function validatePlacementOnServer({
  mapId,
  sku,
  tileX,
  tileY,
  placements,
  ignorePlacementId,
  footprintW,
  footprintH,
  devSandbox = false,
}) {
  if (!Number.isInteger(tileX) || !Number.isInteger(tileY)) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Vị trí đặt đồ chưa hợp lệ.' };
  }
  const item = FURNITURE_CATALOG.get(sku);
  if (!item) {
    return { ok: false, code: 'NOT_FOUND', message: 'Món nội thất không có trong danh sách.' };
  }
  if (item.devSandboxOnly && !devSandbox) {
    return { ok: false, code: 'FORBIDDEN', message: `${item.nameVi} hiện chỉ mở ở chế độ thử nghiệm.` };
  }
  if (!item.allowedMaps.includes(mapId)) {
    return { ok: false, code: 'WRONG_MAP', message: `${item.nameVi} không đặt được ở khu vực này.` };
  }

  if (!devSandbox) {
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

  const w = footprintW ?? item.w;
  const h = footprintH ?? item.h;

  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
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

  return { ok: true, item, w, h };
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
    petCareSessions: {},
    billiardsMatches: {},
    worldStateVersions: {},
    domainVersions: {},
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
  getTryHandleFarmDevLan = () => null,
  getTryHandleDonorDevLan = () => null,
  getTryHandlePhysicalInventory = () => null,
  getServerPort = () => 5173,
  wsOptions = {},
} = {}) {
  let db = createInitialDb();
  try {
    if (fs.existsSync(stateFilePath)) {
      db = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    }
  } catch {
    db = createInitialDb();
  }
  db.petCareSessions ??= {};
  db.billiardsMatches ??= {};
  db.worldStateVersions ??= {};
  db.domainVersions ??= {};

  function ensurePetCareSession(worldId) {
    const petId = db.v015?.pets?.[worldId]?.id ?? `pet-${worldId}`;
    const existing = db.petCareSessions[worldId];
    if (existing) return existing;
    const session = createSharedPetCareSession(worldId, petId);
    db.petCareSessions[worldId] = session;
    return session;
  }

  function saveDb() {
    const pendingPath = `${stateFilePath}.tmp`;
    fs.writeFileSync(pendingPath, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(pendingPath, stateFilePath);
  }

  const loadedV015 = ensureV015Db(db);
  const startupTime = new Date().toISOString();
  let migratedInventory = false;
  for (const worldId of Object.keys(db.worlds)) {
    if (initializeDevLanWorldInventory(loadedV015, worldId, startupTime)) migratedInventory = true;
  }
  if (migratedInventory) saveDb();

  function getWorldForUser(userId) {
    for (const [worldId, members] of Object.entries(db.memberships)) {
      if (members.some((m) => m.userId === userId)) return worldId;
    }
    return null;
  }

  function isWorldMember(worldId, userId) {
    return (db.memberships[worldId] ?? []).some((m) => m.userId === userId);
  }

  function getMemberRole(worldId, userId) {
    const member = (db.memberships[worldId] ?? []).find((m) => m.userId === userId);
    return member ? member.role : null;
  }

  function getProfile(userId) {
    const profile = db.profiles[userId];
    const fallbackId = DEV_IDENTITIES.find((d) => d.userId === userId);
    return {
      nickname: profile?.nickname ?? fallbackId?.defaultNickname ?? 'Thành viên',
      avatarConfig: profile?.avatarConfig ?? fallbackId?.defaultAvatar ?? DEV_IDENTITIES[0].defaultAvatar,
    };
  }

  function ensureWorldVersionState(worldId, db = liveDb()) {
    db.worldStateVersions ??= {};
    db.domainVersions ??= {};
    if (typeof db.worldStateVersions[worldId] !== 'number') {
      db.worldStateVersions[worldId] = 1;
    }
    if (!db.domainVersions[worldId]) {
      const world = db.worlds[worldId];
      const v015 = db.v015 ?? {};
      db.domainVersions[worldId] = {
        layoutVersion: world?.layoutVersion ?? 1,
        farmVersion: v015.farms?.[worldId]?.version ?? 1,
        petVersion: v015.pets?.[worldId]?.version ?? 1,
        bowlVersion: v015.petBowls?.[worldId]?.version ?? 1,
        inventoryVersion: 1,
        studyVersion: 1,
        mailboxVersion: 1,
        petCareRevision: db.petCareSessions?.[worldId]?.revision ?? 0,
      };
    }
    return {
      stateVersion: db.worldStateVersions[worldId],
      domainVersions: { ...db.domainVersions[worldId] },
    };
  }

  function bumpWorldStateVersion(worldId, domain, db = liveDb()) {
    const cur = ensureWorldVersionState(worldId, db);
    db.worldStateVersions[worldId] = cur.stateVersion + 1;
    const dv = db.domainVersions[worldId];
    if (domain === 'furniture') dv.layoutVersion = db.worlds[worldId]?.layoutVersion ?? dv.layoutVersion + 1;
    else if (domain === 'farm') dv.farmVersion = db.v015?.farms?.[worldId]?.version ?? dv.farmVersion + 1;
    else if (domain === 'pet') dv.petVersion = db.v015?.pets?.[worldId]?.version ?? dv.petVersion + 1;
    else if (domain === 'bowl') dv.bowlVersion = db.v015?.petBowls?.[worldId]?.version ?? dv.bowlVersion + 1;
    else if (domain === 'inventory') dv.inventoryVersion += 1;
    else if (domain === 'study') dv.studyVersion += 1;
    else if (domain === 'mailbox') dv.mailboxVersion += 1;
    else if (domain === 'pet_care') dv.petCareRevision = db.petCareSessions?.[worldId]?.revision ?? dv.petCareRevision + 1;
    return {
      stateVersion: db.worldStateVersions[worldId],
      domainVersions: { ...dv },
    };
  }

  const liveDb = () => db;

  const wsHub = createDevLanWsHub({
    isWorldMember,
    getMemberRole,
    getProfile,
    getWorldStateMeta: ensureWorldVersionState,
    ...wsOptions,
  });

  function buildSnapshot(worldId) {
    const world = db.worlds[worldId];
    const rawMembers = db.memberships[worldId];
    if (!world || !rawMembers) return null;
    const meta = ensureWorldVersionState(worldId);
    const members = rawMembers.map((m) => {
      const profile = getProfile(m.userId);
      return {
        userId: m.userId,
        role: m.role,
        nickname: profile.nickname,
        avatarConfig: profile.avatarConfig,
        joinedAt: m.joinedAt,
      };
    });
    return {
      world: {
        ...world,
        stateVersion: meta.stateVersion,
      },
      members,
      placements: [...(db.placements[worldId] ?? [])],
    };
  }

  function broadcastEvent(worldId, event, data, excludeSessionId = null) {
    wsHub.broadcastEvent(worldId, event, data, excludeSessionId);
  }

  function broadcastWorldMutated(worldId, reason, domain = reason) {
    const meta = bumpWorldStateVersion(worldId, domain);
    wsHub.broadcastEvent(worldId, 'world_mutated', {
      reason,
      stateVersion: meta.stateVersion,
      domainVersions: meta.domainVersions,
    });
    return meta;
  }

  function closeAll() {
    wsHub.closeAll();
    void stopRemoteShare();
  }

  function seedCoupleWorldIfNeeded() {
    const existingId = Object.keys(db.worlds)[0];
    if (existingId) return existingId;
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
    const v015 = ensureV015Db(db);
    initializeDevLanWorldInventory(v015, worldId, nowIso, true);
    ensurePetCareSession(worldId);
    saveDb();
    return worldId;
  }

  /**
   * Ensures the remote partner (Nắng / partner-b) can immediately enter an existing 1/2 world
   * when opening a remote-share link, without overwriting any existing host world or data.
   */
  function ensureRemotePartnerInPrimaryWorld() {
    const existingId = Object.keys(db.worlds)[0];
    if (!existingId) {
      return seedCoupleWorldIfNeeded();
    }
    const members = db.memberships[existingId] ?? [];
    if (members.some((m) => m.userId === PARTNER_B_DEV_ID)) {
      return existingId;
    }
    if (members.length >= 2) {
      return existingId;
    }
    const existingPartnerWorld = getWorldForUser(PARTNER_B_DEV_ID);
    if (existingPartnerWorld) {
      return existingPartnerWorld;
    }

    const nowIso = new Date().toISOString();
    const partnerB = DEV_IDENTITIES[1];
    if (!db.profiles[PARTNER_B_DEV_ID]) {
      db.profiles[PARTNER_B_DEV_ID] = {
        userId: PARTNER_B_DEV_ID,
        nickname: partnerB.defaultNickname,
        avatarConfig: partnerB.defaultAvatar,
        updatedAt: nowIso,
      };
    }
    members.push({ userId: PARTNER_B_DEV_ID, role: 'partner', joinedAt: nowIso });
    db.memberships[existingId] = members;
    for (const inv of db.invites) {
      if (inv.worldId === existingId && inv.redeemedAt === null) {
        inv.redeemedBy = PARTNER_B_DEV_ID;
        inv.redeemedAt = nowIso;
      }
    }
    ensurePetCareSession(existingId);
    saveDb();
    broadcastWorldMutated(existingId, 'member', 'member');
    return existingId;
  }

  let physicalQueue = Promise.resolve();
  const tradeSessions = new Map();
  const tradeInvites = new Map();
  const tradeConnections = new Map();

  function runPhysicalRequest(module, context, worldId) {
    const queued = physicalQueue.then(async () => {
      const { req, res, reqUrl, route, userId, body } = context;
      const physicalContext = {
        ...context, db, worldId, catalog: V015_CATALOG,
        broadcastInventory: (id) => broadcastWorldMutated(id, 'inventory'),
        position: wsHub.getActivePlayerPosition(worldId, userId),
        placements: db.placements[worldId] ?? [],
        orchard: db.v015.deepFarms?.[worldId]?.orchard,
      };
      if (route === '/inventory/physical-trade') {
        const partnerId = db.memberships[worldId]?.find((entry) => entry.userId !== userId)?.userId;
        return module.handlePhysicalTrade({ ...physicalContext, partnerId, tradeSessions, tradeInvites, tradeConnections,
          partnerPosition: partnerId ? wsHub.getActivePlayerPosition(worldId, partnerId) : null });
      }
      if (!module.isPhysicalGameplayRoute(route, req.method)) {
        return module.handleDevLanPhysicalInventory(physicalContext);
      }
      if (!worldId || !isWorldMember(worldId, userId)
        || (reqUrl.searchParams.has('worldId') && reqUrl.searchParams.get('worldId') !== worldId)) {
        sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
        return true;
      }

      try {
        const state = module.loadPhysicalGameplayState(db, worldId, V015_CATALOG);
        const transaction = module.preparePhysicalGameplay({
          worldId, route, body, userId, state, catalog: V015_CATALOG,
          receiverIsMember: (actor) => isWorldMember(worldId, actor),
        });
        // This route publishes the current animation state. It has no save or inventory effects.
        if (route === '/donor/fishing/sync') return handleV015Route({ ...context, db, physicalGameplay: transaction });
        const sourceDb = db;
        const committed = sourceDb.v015;
        // Copy mutable rows for this world. The existing idempotency responses are immutable.
        const draft = Object.fromEntries(Object.entries(committed).map(([key, bucket]) => {
          if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return [key, bucket];
          if (!(worldId in bucket)) return [key, { ...bucket }];
          const row = bucket[worldId];
          const value = key === 'idem' ? { ...row }
            : key === 'physicalInventory' || key === 'physicalReceipts' ? row : structuredClone(row);
          return [key, { ...bucket, [worldId]: value }];
        }));
        draft.inventory[worldId] = transaction.rows.map((row) => ({ ...row }));
        const baseline = ensureWorldVersionState(worldId);
        const stage = {
          ...sourceDb, v015: draft, worldStateVersions: { ...sourceDb.worldStateVersions },
          domainVersions: { ...sourceDb.domainVersions, [worldId]: baseline.domainVersions },
        };
        const previousInventoryVersion = baseline.domainVersions.inventoryVersion;
        const events = [];
        let saved = false;
        let reply;
        const handled = await handleV015Route({
          ...context, db: stage, physicalGameplay: transaction,
          sendJson: (_res, status, payload) => { reply = { status, payload }; },
          saveDb: () => { saved = true; },
          broadcastEvent: (...args) => events.push(args),
          bumpWorldStateVersion: (id, domain) => bumpWorldStateVersion(id, domain, stage),
        });
        if (!handled || !reply) return handled;
        if (reply.status < 300) {
          const originalLetters = committed.letters?.[worldId] ?? [];
          const letters = draft.letters?.[worldId] ?? [];
          const originalOffers = committed.petLiving?.[worldId]?.offers ?? [];
          const offers = draft.petLiving?.[worldId]?.offers ?? [];
          if (saved) {
            const openedGift = route === '/mailbox/open' && letters.find((letter) =>
              letter.id === body.letterId && letter.openedAt && !originalLetters.find((row) => row.id === letter.id)?.openedAt);
            const received = openedGift?.physicalGift?.map((stack) => ({ stack, actor: userId })) ?? [];
            for (const offer of originalOffers) {
              if (!offer.inventoryReserved || !offer.physicalStack) continue;
              const updated = offers.find(({ id }) => id === offer.id);
              if (updated && !updated.inventoryReserved && ['expired', 'refused', 'cancelled'].includes(updated.status)) {
                received.push({ stack: offer.physicalStack, actor: offer.caregiverId });
                delete updated.physicalStack;
              }
            }
            const workshopKind = route === '/farm/deep/apply' ? body.kind : null;
            const originalJobs = committed.deepFarms?.[worldId]?.workshops?.stations?.[body.workshopId]?.queue ?? [];
            const jobs = draft.deepFarms?.[worldId]?.workshops?.stations?.[body.workshopId]?.queue ?? [];
            const reservedJob = workshopKind === 'cancel_workshop' && originalJobs.find((job) => job.jobId === body.jobId);
            const payer = reservedJob?.physicalInputs?.actor;
            if (payer) received.push(...reservedJob.physicalInputs.stacks.map((stack) => ({ stack, actor: payer })));
            transaction.apply(draft.inventory[worldId], {
              received, sharedRecipient: payer, consumedBait: route === '/donor/fishing/start',
            });
            if (transaction.overflowUnits && reply.payload?.data && typeof reply.payload.data === 'object') {
              const data = reply.payload.data;
              data.overflowUnits = transaction.overflowUnits;
            }
            if (workshopKind === 'queue_workshop' && transaction.consumed.length) {
              const queuedJob = jobs.find((job) => !originalJobs.some(({ jobId }) => jobId === job.jobId));
              if (!queuedJob) throw new Error('Không tìm thấy mẻ vừa giữ nguyên liệu.');
              queuedJob.physicalInputs = { actor: userId, stacks: transaction.consumed };
            }
            if (openedGift) delete openedGift.physicalGift;
            if (route === '/mailbox/send' && transaction.consumed.length) letters.at(-1).physicalGift = transaction.consumed;
            if (route.startsWith('/pet/living') && transaction.consumed.length) {
              const newOffer = offers.find((offer) => !originalOffers.some(({ id }) => id === offer.id));
              if (!newOffer || transaction.consumed.length !== 1) throw new Error('Không xác định được phần thức ăn giữ cho mèo.');
              newOffer.physicalStack = transaction.consumed[0];
            }
          }
          const migrated = !committed.physicalInventory?.[worldId];
          const changed = transaction.state !== state;
          if (saved || migrated || route === '/farm/deep') {
            delete draft.inventory[worldId];
            (draft.physicalInventory ??= {})[worldId] = transaction.state;
            if (changed && stage.domainVersions[worldId].inventoryVersion === previousInventoryVersion) {
              bumpWorldStateVersion(worldId, 'inventory', stage);
            }
            if (db !== sourceDb || db.v015 !== committed) {
              sendJson(res, 409, { ok: false, code: 'VERSION_CONFLICT', message: 'Ngôi nhà vừa đổi. Hãy thử lại.' });
              return true;
            }
            const previousVersions = db.worldStateVersions;
            const previousDomainVersions = db.domainVersions;
            db.v015 = stage.v015;
            db.worldStateVersions = stage.worldStateVersions;
            db.domainVersions = stage.domainVersions;
            try {
              if (saved || migrated) saveDb();
            } catch (error) {
              db.v015 = committed;
              db.worldStateVersions = previousVersions;
              db.domainVersions = previousDomainVersions;
              throw error;
            }
            for (const args of events) broadcastEvent(...args);
            if (changed) {
              const meta = ensureWorldVersionState(worldId);
              broadcastEvent(worldId, 'world_mutated', { reason: 'inventory', ...meta });
            }
          }
        }
        sendJson(res, reply.status, reply.payload);
        return true;
      } catch (error) {
        if (!(error instanceof module.PhysicalInventoryError)) throw error;
        sendJson(res, error.code === 'FORBIDDEN' ? 403 : 409, { ok: false, code: error.code, message: error.message });
        return true;
      }
    });
    physicalQueue = queued.then(() => {}, () => {});
    return queued;
  }

  async function middleware(req, res, next) {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    if (!reqUrl.pathname.startsWith('/api/dev-lan')) {
      next?.();
      return;
    }

    const route = reqUrl.pathname.slice('/api/dev-lan'.length);
    const userId = String(req.headers['x-dev-user-id'] ?? '').trim();
    const isRemoteClient = req.headers['x-olw-remote-share'] === '1';

    if (isRemoteClient) {
      if (userId && userId !== PARTNER_B_DEV_ID) {
        sendJson(res, 403, {
          ok: false,
          code: 'FORBIDDEN',
          message: 'Phiên chia sẻ từ xa chỉ cấp quyền cho người thương (Nắng).',
        });
        return;
      }
      const blockedRemoteRoute =
        route === '/reset' ||
        route === '/seed-couple' ||
        route.startsWith('/dev-console') ||
        route === '/world/create' ||
        route === '/world/invite';
      if (blockedRemoteRoute) {
        sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Thao tác quản trị này chỉ mở trên máy chủ Host.' });
        return;
      }
    }

    try {
      if (req.method === 'GET' && route === '/client-context') {
        if (isRemoteClient) {
          ensureRemotePartnerInPrimaryWorld();
        }
        sendJson(res, 200, {
          ok: true,
          data: {
            isRemoteClient,
            autoPartnerPreset: isRemoteClient ? 'partner-b' : null,
          },
        });
        return;
      }

      if (route === '/remote-share') {
        if (req.method === 'GET') {
          sendJson(res, 200, {
            ok: true,
            data: { ...getRemoteShareStatus(), isRemoteClient },
          });
          return;
        }
        if (isRemoteClient) {
          sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            message: 'Chỉ máy chủ (Host) mới điều khiển chia sẻ liên mạng.',
          });
          return;
        }
        if (req.method === 'POST') {
          ensureRemotePartnerInPrimaryWorld();
          const shareBody = await readJsonBody(req);
          const targetPort = getServerPort() || req.socket?.localPort || 5173;
          const info = await startRemoteShare({
            targetPort,
            refresh: Boolean(shareBody?.refresh),
          });
          sendJson(res, 200, { ok: true, data: { ...info, isRemoteClient: false } });
          return;
        }
        if (req.method === 'DELETE') {
          await stopRemoteShare();
          sendJson(res, 200, { ok: true, data: { ...getRemoteShareStatus(), isRemoteClient: false } });
          return;
        }
      }
      // GET /identities — live dev roster & world status (remote clients only see partner-b)
      if (req.method === 'GET' && route === '/identities') {
        const worlds = Object.values(db.worlds);
        const primaryWorld = worlds[0] ?? null;
        const members = primaryWorld ? (db.memberships[primaryWorld.id] ?? []) : [];

        const visibleIdentities = isRemoteClient
          ? DEV_IDENTITIES.filter((d) => d.userId === PARTNER_B_DEV_ID)
          : DEV_IDENTITIES;

        const identities = visibleIdentities.map((d) => {
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
        wsHub.resetAllRooms(affectedWorlds);
        sendJson(res, 200, { ok: true, data: { reset: true } });
        return;
      }

      // POST /seed-couple — dev-only quick-start 2/2 house (Mây + Nắng)
      if (req.method === 'POST' && route === '/seed-couple') {
        const worldId = seedCoupleWorldIfNeeded();
        sendJson(res, 200, { ok: true, data: buildSnapshot(worldId) });
        return;
      }

      if (req.method === 'GET' && route === '/pet-care/session') {
        const worldId = reqUrl.searchParams.get('worldId') ?? '';
        if (!worldId || !isWorldMember(worldId, userId)) {
          sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn chưa là thành viên của ngôi nhà này.' });
          return;
        }
        const session = ensurePetCareSession(worldId);
        sendJson(res, 200, { ok: true, data: session });
        return;
      }

      if (req.method === 'POST' && route === '/pet-care/session/patch') {
        const patchBody = await readJsonBody(req);
        const { worldId, patch, idempotencyKey } = patchBody;
        if (!worldId || !patch || !isWorldMember(worldId, userId)) {
          sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Không thể cập nhật phiên chăm mèo.' });
          return;
        }
        if (patch.actorUserId !== userId) {
          sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Không khớp người chơi.' });
          return;
        }
        const idemKey = idempotencyKey ? `${worldId}:petcare:${String(idempotencyKey)}` : '';
        if (idemKey && db.idempotency[idemKey]) {
          sendJson(res, 200, { ok: true, data: db.idempotency[idemKey] });
          return;
        }
        const prev = ensurePetCareSession(worldId);
        const next = mergeSharedPetCareSession(prev, { ...patch, atMs: patch.atMs ?? Date.now() });
        db.petCareSessions[worldId] = next;
        bumpWorldStateVersion(worldId, 'pet_care');
        if (idemKey) db.idempotency[idemKey] = next;
        saveDb();
        const payload = { type: 'PET_CARE_SESSION', worldId, session: next };
        broadcastEvent(worldId, 'pet_care_session', payload, null);
        sendJson(res, 200, { ok: true, data: next });
        return;
      }

      // GET /events — Server-Sent Events realtime fallback stream
      if (req.method === 'GET' && route === '/events') {
        const qWorldId = reqUrl.searchParams.get('worldId') ?? '';
        const qUserId = reqUrl.searchParams.get('userId') ?? '';
        const qSessionId = reqUrl.searchParams.get('sessionId') ?? '';
        if (
          !qWorldId ||
          !qUserId ||
          !qSessionId ||
          (isRemoteClient && qUserId !== PARTNER_B_DEV_ID) ||
          !isWorldMember(qWorldId, qUserId)
        ) {
          sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            message: 'Bạn chưa là thành viên của ngôi nhà này.',
          });
          return;
        }
        wsHub.handleSseStream(req, res, {
          worldId: qWorldId,
          userId: qUserId,
          sessionId: qSessionId,
          reqUrl,
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
        initializeDevLanWorldInventory(ensureV015Db(db), worldId, nowIso, true);
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
        bumpWorldStateVersion(invite.worldId, 'member');
        saveDb();
        broadcastWorldMutated(invite.worldId, 'member', 'member');
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
        const worldId = getWorldForUser(userId);
        if (worldId) {
          wsHub.refreshUserProfile(worldId, userId);
          broadcastWorldMutated(worldId, 'profile', 'profile');
        }
        saveDb();
        sendJson(res, 200, { ok: true, data: profile });
        return;
      }

      if (req.method === 'POST' && route === '/furniture/place') {
        const { worldId, mapId, sku, tileX, tileY, rotated, devSandbox, expectedLayoutVersion, idempotencyKey } = body;
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
        const item = FURNITURE_CATALOG.get(sku);
        const footprintW = rotated && item ? item.h : undefined;
        const footprintH = rotated && item ? item.w : undefined;
        const check = validatePlacementOnServer({
          mapId,
          sku,
          tileX,
          tileY,
          placements,
          footprintW,
          footprintH,
          devSandbox: devSandbox === true,
        });
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
          widthTiles: check.w,
          heightTiles: check.h,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        };
        db.placements[worldId] = [...placements, newPlacement];
        world.layoutVersion += 1;
        const result = { layoutVersion: world.layoutVersion, placement: newPlacement };
        db.idempotency[idemKey] = result;
        broadcastWorldMutated(worldId, 'furniture', 'furniture');
        saveDb();
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
          footprintW: target.widthTiles,
          footprintH: target.heightTiles,
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
        broadcastWorldMutated(worldId, 'furniture', 'furniture');
        saveDb();
        sendJson(res, 200, { ok: true, data: result });
        return;
      }

      if (req.method === 'POST' && route === '/furniture/rotate') {
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
        const target = placements.find((p) => p.id === placementId);
        if (!target) {
          sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Món đồ này không còn ở trên sàn.' });
          return;
        }
        if (target.widthTiles === target.heightTiles) {
          sendJson(res, 400, {
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Món vuông này không cần xoay.',
          });
          return;
        }
        const check = validatePlacementOnServer({
          mapId: target.mapId,
          sku: target.sku,
          tileX: target.tileX,
          tileY: target.tileY,
          placements,
          ignorePlacementId: target.id,
          footprintW: target.heightTiles,
          footprintH: target.widthTiles,
        });
        if (!check.ok) {
          sendJson(res, 400, { ok: false, code: check.code, message: check.message });
          return;
        }
        const updated = {
          ...target,
          widthTiles: target.heightTiles,
          heightTiles: target.widthTiles,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        };
        db.placements[worldId] = placements.map((p) => (p.id === target.id ? updated : p));
        world.layoutVersion += 1;
        const result = { layoutVersion: world.layoutVersion, placement: updated };
        db.idempotency[idemKey] = result;
        broadcastWorldMutated(worldId, 'furniture', 'furniture');
        saveDb();
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
        broadcastWorldMutated(worldId, 'furniture', 'furniture');
        saveDb();
        sendJson(res, 200, { ok: true, data: result });
        return;
      }

      if (req.method === 'POST' && route === '/realtime') {
        const { worldId, kind, sessionId, payload } = body;
        if (!isWorldMember(worldId, userId)) {
          sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
          return;
        }
        wsHub.handleHttpRealtime(worldId, userId, sessionId, kind, payload);
        sendJson(res, 200, { ok: true });
        return;
      }

      const handledBilliards = handleBilliardsRoute({
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
      });
      if (handledBilliards) return;

      const physicalWorldId = String(body.worldId ?? reqUrl.searchParams.get('worldId') ?? '').trim();
      const physicalRequest = /^\/(inventory|farm|donor|pet|mailbox|dev-console)(\/|$)/.test(route);
      const physicalModule = physicalRequest ? await getTryHandlePhysicalInventory() : null;
      if (physicalRequest && db.v015?.physicalInventory?.[physicalWorldId] && !physicalModule) {
        sendJson(res, 409, { ok: false, code: 'VALIDATION_ERROR', message: 'Hãy mở save này bằng chế độ túi đồ INV.2.' });
        return;
      }
      const resolvedFarmDevLan =
        route.startsWith('/farm') ? await Promise.resolve(getTryHandleFarmDevLan()) : getTryHandleFarmDevLan();
      const resolvedDonorDevLan =
        route.startsWith('/donor/') ? await Promise.resolve(getTryHandleDonorDevLan()) : getTryHandleDonorDevLan();

      const context = {
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
        bumpWorldStateVersion,
        tryHandleFarmDevLan: typeof resolvedFarmDevLan === 'function' ? resolvedFarmDevLan : null,
        tryHandleDonorDevLan: typeof resolvedDonorDevLan === 'function' ? resolvedDonorDevLan : null,
      };
      const handledV015 = physicalModule
        ? await runPhysicalRequest(physicalModule, context, physicalWorldId)
        : await handleV015Route(context);
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

  middleware.handleUpgrade = wsHub.handleUpgrade;
  middleware.getWorldStateMeta = ensureWorldVersionState;
  middleware.getRoomDebugStats = wsHub.getRoomDebugStats;
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
      let tryHandleFarmDevLan = null;
      let tryHandleDonorDevLan = null;
      const farmRoutePromise = server
        .ssrLoadModule('/src/server/devLanFarmRoute.ts')
        .then((mod) => {
          tryHandleFarmDevLan = mod.tryHandleFarmDevLan;
          return mod.tryHandleFarmDevLan;
        })
        .catch((err) => {
          console.warn('[dev-lan] farm routes unavailable:', err?.message ?? err);
          return null;
        });
      const donorRoutePromise = server
        .ssrLoadModule('/src/server/devLanDonorRoute.ts')
        .then((mod) => {
          tryHandleDonorDevLan = mod.tryHandleDonorDevLan;
          return mod.tryHandleDonorDevLan;
        })
        .catch((err) => {
          console.warn('[dev-lan] donor routes unavailable:', err?.message ?? err);
          return null;
        });
      const stateFilePath = options.stateFilePath || process.env.OLW_DEV_LAN_STATE_FILE || undefined;
      const physicalEnabled = process.env.OLW_DEV_LAN_PHYSICAL_INVENTORY === '1';
      if (physicalEnabled && !/^\.dev-lan-state-inv2-[a-z0-9_-]+\.json$/i.test(path.basename(stateFilePath ?? ''))) {
        throw new Error('INV.2 cần save riêng .dev-lan-state-inv2-*.json.');
      }
      const physicalRoute = physicalEnabled
        ? server.ssrLoadModule('/src/server/devLanPhysicalInventoryRoute.ts')
        : null;
      const handler = createDevLanHandler({
        stateFilePath,
        getTryHandlePhysicalInventory: () => physicalRoute,
        getTryHandleFarmDevLan: () => tryHandleFarmDevLan ?? farmRoutePromise,
        getTryHandleDonorDevLan: () => tryHandleDonorDevLan ?? donorRoutePromise,
        getServerPort: () => {
          const addr = server.httpServer?.address?.();
          return (addr && typeof addr === 'object' ? addr.port : 0) || server.config.server.port || 5173;
        },
      });
      const assetCandidates = createAssetCandidatesMiddleware();
      server.middlewares.use(assetCandidates);
      server.middlewares.use(handler);
      server.httpServer?.on('upgrade', (req, socket, head) => {
        handler.handleUpgrade(req, socket, head);
      });
      server.httpServer?.once('close', () => {
        handler.closeAll();
      });
    },
  };
}
