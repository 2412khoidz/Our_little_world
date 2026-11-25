// Server-side Dev LAN parity handlers for V0.1.5 Living Home (OLW-015-01..08)
import crypto from 'node:crypto';
import { handleSharedLifeRoute } from './devLanSharedLifeHandlers.mjs';

export const V015_CATALOG = [
  {
    sku: 'pet_kibble_basic',
    nameVi: 'Hạt mèo cơ bản',
    descriptionVi: 'Phần hạt ấm bụng miễn phí hằng ngày cho bé mèo cam.',
    purpose: 'pet_food',
    stackLimit: 10,
    tradeable: false,
  },
  {
    sku: 'gift_flower_bouquet',
    nameVi: 'Bó hoa nhỏ dịu dàng',
    descriptionVi: 'Món quà nhỏ giữ trong ngăn riêng để tạo bất ngờ cho người thương.',
    purpose: 'gift',
    stackLimit: 5,
    tradeable: false,
  },
  {
    sku: 'gift_strawberry_cake',
    nameVi: 'Bánh dâu ngọt ngào',
    descriptionVi: 'Miếng bánh dâu xinh xắn có thể gửi kèm thư tay.',
    purpose: 'gift',
    stackLimit: 5,
    tradeable: false,
  },
  {
    sku: 'gift_plush_cat',
    nameVi: 'Thú bông mèo cam nhỏ',
    descriptionVi: 'Gối ôm nho nhỏ mang hơi ấm căn nhà chung.',
    purpose: 'gift',
    stackLimit: 3,
    tradeable: false,
  },
  {
    sku: 'gift_star_jar',
    nameVi: 'Hũ sao giấy kỷ niệm',
    descriptionVi: 'Những ngôi sao giấy gấp tay lưu giữ lời chúc.',
    purpose: 'keepsake',
    stackLimit: 5,
    tradeable: false,
  },
  {
    sku: 'letter_stationery_pink',
    nameVi: 'Giấy viết thư hoa anh đào',
    descriptionVi: 'Bộ giấy thư màu phấn hồng cho những lời nhắn ấm áp.',
    purpose: 'stationery',
    stackLimit: 10,
    tradeable: false,
  },
  {
    sku: 'fish_salmon_bite',
    nameVi: 'Cá hồi mềm',
    descriptionVi: 'Miếng cá mềm cho bé thử — coi là đồ ưa thích.',
    purpose: 'pet_food',
    stackLimit: 5,
    tradeable: false,
  },
  {
    sku: 'toy_yarn',
    nameVi: 'Cuộn len',
    descriptionVi: 'Đồ chơi cuốn để rủ bé chạy nhảy trong nhà.',
    purpose: 'pet_toy',
    stackLimit: 3,
    tradeable: false,
  },
  {
    sku: 'toy_cardboard_box',
    nameVi: 'Hộp giấy',
    descriptionVi: 'Hộp nhỏ để bé chui vào chơi.',
    purpose: 'pet_toy',
    stackLimit: 2,
    tradeable: false,
  },
  {
    sku: 'water_pitcher',
    nameVi: 'Bình nước',
    descriptionVi: 'Bình đựng nước cho bát uống.',
    purpose: 'tool',
    stackLimit: 1,
    tradeable: false,
  },
];

/** Dev LAN starter rows — real inventory, không UI giả. */
export function grantPetCareStarterPack(v015, worldId, nowIso) {
  adjustInventoryItem(v015, worldId, 'shared', 'fish_salmon_bite', 2, nowIso, 'silver');
  adjustInventoryItem(v015, worldId, 'shared', 'toy_yarn', 1, nowIso);
  adjustInventoryItem(v015, worldId, 'shared', 'toy_cardboard_box', 1, nowIso);
  adjustInventoryItem(v015, worldId, 'shared', 'water_pitcher', 1, nowIso);
}

/** Idempotent — nhà đã có mèo nhưng thiếu đồ chơi/đồ ăn (world cũ trước 04C). */
export function ensurePetCareStarterPackIfMissing(v015, worldId, nowIso) {
  const pet = v015.pets[worldId];
  if (!pet) return false;
  const list = getWorldInventoryList(v015, worldId);
  const qty = (sku) => list.find((i) => i.ownerScope === 'shared' && i.itemSku === sku)?.qty ?? 0;
  let changed = false;
  if (qty('fish_salmon_bite') < 1) {
    adjustInventoryItem(v015, worldId, 'shared', 'fish_salmon_bite', 2, nowIso, 'silver');
    changed = true;
  }
  if (qty('toy_yarn') < 1) {
    adjustInventoryItem(v015, worldId, 'shared', 'toy_yarn', 1, nowIso);
    changed = true;
  }
  if (qty('toy_cardboard_box') < 1) {
    adjustInventoryItem(v015, worldId, 'shared', 'toy_cardboard_box', 1, nowIso);
    changed = true;
  }
  if (qty('water_pitcher') < 1) {
    adjustInventoryItem(v015, worldId, 'shared', 'water_pitcher', 1, nowIso);
    changed = true;
  }
  return changed;
}

const CATALOG_BY_SKU = new Map(V015_CATALOG.map((c) => [c.sku, c]));

export function ensureV015Db(db) {
  if (!db.v015) {
    db.v015 = {
      inventory: {},
      kibbleClaims: {},
      pets: {},
      petEvents: {},
      studySessions: {},
      letters: {},
      idem: {},
      petBowls: {},
    };
  }
  db.v015.inventory ??= {};
  db.v015.kibbleClaims ??= {};
  db.v015.pets ??= {};
  db.v015.petEvents ??= {};
  db.v015.studySessions ??= {};
  db.v015.letters ??= {};
  db.v015.idem ??= {};
  db.v015.petBowls ??= {};
  return db.v015;
}

function ensurePetBowl(v015, worldId, petId) {
  const existing = v015.petBowls[worldId];
  if (existing) return existing;
  const bowl = {
    worldId,
    petId,
    version: 1,
    foodPortions: 0,
    waterVolume: 60,
    foodSku: null,
    foodQuality: null,
  };
  v015.petBowls[worldId] = bowl;
  return bowl;
}

function projectPetCareBowl(v015, worldId) {
  const pet = v015.pets[worldId] ?? null;
  const bowl = v015.petBowls[worldId];
  if (!bowl) {
    return {
      worldId,
      petId: pet?.id ?? null,
      version: 1,
      foodPortions: 0,
      waterVolume: 60,
      foodSku: null,
      foodQuality: null,
    };
  }
  return {
    worldId,
    petId: bowl.petId,
    version: bowl.version,
    foodPortions: bowl.foodPortions,
    waterVolume: bowl.waterVolume,
    foodSku: bowl.foodSku,
    foodQuality: bowl.foodQuality,
  };
}

export function getWorldInventoryList(v015, worldId) {
  v015.inventory[worldId] ??= [];
  return v015.inventory[worldId];
}

export function adjustInventoryItem(v015, worldId, ownerScope, itemSku, delta, nowIso, quality = 'normal') {
  if (ownerScope !== 'shared' && !/^user:[0-9a-f-]+$/i.test(ownerScope)) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Phạm vi kho đồ không hợp lệ.' };
  }
  if (!['normal', 'silver', 'gold'].includes(quality)) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Cấp chất lượng không hợp lệ.' };
  }
  const cat = CATALOG_BY_SKU.get(itemSku);
  if (!cat) {
    return { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy vật phẩm.' };
  }
  const list = getWorldInventoryList(v015, worldId);
  const idx = list.findIndex(
    (i) => i.ownerScope === ownerScope && i.itemSku === itemSku && (i.quality ?? 'normal') === quality,
  );
  const cur = idx >= 0 ? list[idx].qty : 0;
  const next = cur + delta;
  const totalSameSku = list
    .filter((i) => i.ownerScope === ownerScope && i.itemSku === itemSku)
    .reduce((sum, row) => sum + row.qty, 0);
  if (next < 0) {
    return { ok: false, code: 'INSUFFICIENT_ITEMS', message: 'Không đủ vật phẩm trong túi.' };
  }
  if (totalSameSku + delta > cat.stackLimit) {
    return { ok: false, code: 'STACK_FULL', message: `Ngăn chứa ${cat.nameVi} đã đầy (${cat.stackLimit}).` };
  }
  if (next === 0) {
    if (idx >= 0) list.splice(idx, 1);
  } else {
    const entry = { worldId, ownerScope, itemSku, quality, qty: next, updatedAt: nowIso };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
  }
  return { ok: true, qty: next };
}

export function buildInventorySnapshot(v015, worldId, userId, nowMs = Date.now()) {
  ensurePetCareStarterPackIfMissing(v015, worldId, new Date(nowMs).toISOString());
  const list = getWorldInventoryList(v015, worldId);
  const utcDate = new Date(nowMs).toISOString().slice(0, 10);
  const kibbleRow = list.find((i) => i.ownerScope === 'shared' && i.itemSku === 'pet_kibble_basic');
  const kibbleQty = kibbleRow ? kibbleRow.qty : 0;
  const lastClaim = v015.kibbleClaims[worldId]?.date ?? null;
  const visibleItems = list
    .filter((i) => i.ownerScope === 'shared' || i.ownerScope === `user:${userId}`)
    .sort((a, b) => (a.ownerScope + a.itemSku).localeCompare(b.ownerScope + b.itemSku));

  return {
    worldId,
    serverNowMs: nowMs,
    serverDateUtc: utcDate,
    canClaimFreeKibble: kibbleQty === 0 && lastClaim !== utcDate,
    catalog: V015_CATALOG,
    items: visibleItems,
  };
}

function checkV015Idempotency(v015, worldId, userId, action, key, reqHash) {
  const map = (v015.idem[worldId] ??= {});
  const rec = map[key];
  if (!rec) return null;
  if (rec.actorId !== userId || rec.action !== action || rec.reqHash !== reqHash) {
    return { conflict: true };
  }
  return { conflict: false, response: rec.response };
}

function saveV015Idempotency(v015, worldId, userId, action, key, reqHash, response) {
  const map = (v015.idem[worldId] ??= {});
  map[key] = { actorId: userId, action, reqHash, response };
}

function catchupPetVitals(vitals, simStateAtMs, nowMs) {
  const elapsedMs = Math.min(48 * 3600 * 1000, Math.max(0, nowMs - simStateAtMs));
  const clamp = (v) => Math.max(30, Math.min(100, Math.round(v)));
  const hunger = clamp(vitals.hunger - Math.floor((elapsedMs * 2) / 3600000));
  let energy = clamp(vitals.energy - Math.floor(elapsedMs / 3600000));
  if (elapsedMs >= 8 * 3600 * 1000) energy = Math.max(energy, 50);
  const fun = clamp(vitals.fun - Math.floor(elapsedMs / 3600000));
  return { hunger, energy, fun };
}

function derivePetMood(vitals) {
  if (vitals.hunger <= 42) return 'hungry';
  if (vitals.energy <= 45) return 'sleepy';
  if (vitals.fun >= 78 && vitals.hunger >= 65) return 'happy';
  return 'cozy';
}

function projectPet(pet, nowMs = Date.now()) {
  if (!pet) return null;
  const vitals = catchupPetVitals(pet.vitals, pet.simStateAtMs, nowMs);
  return {
    ...pet,
    vitals,
    emotion: derivePetMood(vitals),
    serverNowMs: nowMs,
  };
}

function projectStudySession(row, nowMs = Date.now()) {
  let phase = row.phase;
  let status = row.status;
  let startedAtMs = row.startedAtMs;
  let endsAtMs = row.endsAtMs;
  let remainingMs = row.remainingMs;
  const breakMs = row.breakMinutes * 60000;

  if (status === 'running') {
    if (phase === 'focus') {
      if (nowMs < endsAtMs) {
        remainingMs = endsAtMs - nowMs;
      } else if (breakMs > 0 && nowMs < endsAtMs + breakMs) {
        phase = 'break';
        startedAtMs = endsAtMs;
        endsAtMs += breakMs;
        remainingMs = endsAtMs - nowMs;
      } else {
        phase = 'completed';
        status = 'completed';
        remainingMs = 0;
      }
    } else if (phase === 'break') {
      if (nowMs < endsAtMs) {
        remainingMs = endsAtMs - nowMs;
      } else {
        phase = 'completed';
        status = 'completed';
        remainingMs = 0;
      }
    }
  }
  return { ...row, phase, status, startedAtMs, endsAtMs, remainingMs: Math.max(0, remainingMs) };
}

function buildStudySnapshot(v015, worldId, userId, nowMs = Date.now()) {
  const list = (v015.studySessions[worldId] ??= []);
  const activeShared = [...list]
    .reverse()
    .find((s) => s.mode === 'shared' && (s.status === 'running' || s.status === 'paused'));
  const activeSolo = [...list]
    .reverse()
    .find((s) => s.mode === 'solo' && s.ownerId === userId && (s.status === 'running' || s.status === 'paused'));

  let sharedProj = activeShared ? projectStudySession(activeShared, nowMs) : null;
  if (sharedProj && sharedProj.status === 'completed') sharedProj = null;

  let soloProj = activeSolo ? projectStudySession(activeSolo, nowMs) : null;
  if (soloProj && soloProj.status === 'completed') soloProj = null;

  return {
    worldId,
    serverNowMs: nowMs,
    sharedSession: sharedProj,
    soloSession: soloProj,
  };
}

export async function handleV015Route({
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
}) {
  const v015 = ensureV015Db(db);

  if (
    await handleSharedLifeRoute({
      req,
      res,
      route,
      reqUrl,
      body,
      userId,
      v015,
      isWorldMember,
      sendJson,
      saveDb,
      broadcastEvent,
    })
  ) {
    return true;
  }

  if (req.method === 'GET' && route === '/inventory') {
    const worldId = String(reqUrl.searchParams.get('worldId') ?? '').trim();
    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    sendJson(res, 200, { ok: true, data: buildInventorySnapshot(v015, worldId, userId) });
    return true;
  }

  if (req.method === 'POST' && route === '/inventory/claim-free-kibble') {
    const worldId = String(body.worldId ?? '').trim();
    const key = String(body.idempotencyKey ?? '').trim();
    if (!worldId || !key) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Thiếu thông tin nhận hạt mèo.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = `claim_free_kibble:${worldId}`;
    const prior = checkV015Idempotency(v015, worldId, userId, 'claim_free_kibble', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác thao tác.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const utcDate = nowIso.slice(0, 10);
    const list = getWorldInventoryList(v015, worldId);
    const kibbleQty = list.find((i) => i.ownerScope === 'shared' && i.itemSku === 'pet_kibble_basic')?.qty ?? 0;
    const lastClaim = v015.kibbleClaims[worldId]?.date ?? null;
    if (kibbleQty > 0 || lastClaim === utcDate) {
      sendJson(res, 409, {
        ok: false,
        code: 'COOLDOWN_ACTIVE',
        message: 'Hôm nay nhà mình đã nhận hạt mèo miễn phí rồi hoặc bát hạt vẫn còn nhé.',
      });
      return true;
    }

    const adj = adjustInventoryItem(v015, worldId, 'shared', 'pet_kibble_basic', 3, nowIso);
    if (!adj.ok) {
      sendJson(res, 400, { ok: false, code: adj.code, message: adj.message });
      return true;
    }
    v015.kibbleClaims[worldId] = { date: utcDate, userId, updatedAt: nowIso };
    const snap = buildInventorySnapshot(v015, worldId, userId, nowMs);
    saveV015Idempotency(v015, worldId, userId, 'claim_free_kibble', key, reqHash, snap);
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'inventory' });
    sendJson(res, 200, { ok: true, data: snap });
    return true;
  }

  if (req.method === 'POST' && route === '/inventory/transfer-quality') {
    const worldId = String(body.worldId ?? '').trim();
    const key = String(body.idempotencyKey ?? '').trim();
    const fromUi = String(body.fromScope ?? 'shared').trim();
    const toUi = String(body.toScope ?? 'personal').trim();
    const itemSku = String(body.itemSku ?? '').trim();
    const quality = String(body.quality ?? 'normal').trim();
    const qty = Number(body.qty);
    if (!worldId || !key || !itemSku || !Number.isFinite(qty) || qty < 1) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Thiếu thông tin chuyển vật phẩm.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const fromScope = fromUi === 'personal' ? `user:${userId}` : 'shared';
    const toScope = toUi === 'personal' ? `user:${userId}` : 'shared';
    if (fromScope === toScope) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Không thể chuyển trong cùng một ngăn.' });
      return true;
    }
    const reqHash = JSON.stringify([fromScope, toScope, itemSku, quality, qty]);
    const prior = checkV015Idempotency(v015, worldId, userId, 'inventory_transfer', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác thao tác.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }
    const nowIso = new Date().toISOString();
    const out = adjustInventoryItem(v015, worldId, fromScope, itemSku, -qty, nowIso, quality);
    if (!out.ok) {
      sendJson(res, 400, { ok: false, code: out.code, message: out.message });
      return true;
    }
    const inn = adjustInventoryItem(v015, worldId, toScope, itemSku, qty, nowIso, quality);
    if (!inn.ok) {
      adjustInventoryItem(v015, worldId, fromScope, itemSku, qty, nowIso, quality);
      sendJson(res, 400, { ok: false, code: inn.code, message: inn.message });
      return true;
    }
    const snap = buildInventorySnapshot(v015, worldId, userId);
    saveV015Idempotency(v015, worldId, userId, 'inventory_transfer', key, reqHash, snap);
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'inventory' });
    sendJson(res, 200, { ok: true, data: snap });
    return true;
  }

  // === OLW-015-03: Living Pet MVP (cat-orange) ===
  if (req.method === 'GET' && route === '/pet') {
    const worldId = String(reqUrl.searchParams.get('worldId') ?? '').trim();
    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const pet = v015.pets[worldId] ?? null;
    sendJson(res, 200, { ok: true, data: projectPet(pet, Date.now()) });
    return true;
  }

  if (req.method === 'POST' && route === '/pet/adopt-or-rename') {
    const worldId = String(body.worldId ?? '').trim();
    const cleanName = String(body.name ?? '').trim();
    const expectedVersion = body.expectedVersion ?? null;
    const key = String(body.idempotencyKey ?? '').trim();
    if (!worldId || !key || cleanName.length < 1 || cleanName.length > 24) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Tên bé mèo cần từ 1 đến 24 ký tự.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = `pet_adopt_or_rename:${cleanName}:${expectedVersion ?? 'none'}`;
    const prior = checkV015Idempotency(v015, worldId, userId, 'pet_adopt_or_rename', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    let pet = v015.pets[worldId] ?? null;
    if (!pet) {
      pet = {
        id: `pet-${crypto.randomUUID()}`,
        worldId,
        species: 'cat-orange',
        name: cleanName,
        vitals: { hunger: 100, energy: 100, fun: 100 },
        emotion: 'happy',
        mapId: 'home',
        anchorTileX: 13,
        anchorTileY: 9,
        lastFedAtMs: null,
        lastWateredAtMs: null,
        lastPettedAtMs: null,
        simStateAtMs: nowMs,
        version: 1,
        updatedAt: nowIso,
      };
      v015.pets[worldId] = pet;
    } else {
      if (expectedVersion === null || pet.version !== expectedVersion) {
        sendJson(res, 409, { ok: false, code: 'VERSION_CONFLICT', message: 'Thông tin bé mèo vừa thay đổi. Đang đồng bộ lại...' });
        return true;
      }
      pet = { ...pet, name: cleanName, version: pet.version + 1, updatedAt: nowIso };
      v015.pets[worldId] = pet;
    }
    const events = (v015.petEvents[worldId] ??= []);
    events.push({ id: `pevt-${crypto.randomUUID()}`, petId: pet.id, actorId: userId, type: 'adopt_or_rename', name: cleanName, key, at: nowIso });
    const proj = projectPet(pet, nowMs);
    saveV015Idempotency(v015, worldId, userId, 'pet_adopt_or_rename', key, reqHash, proj);
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'pet' });
    sendJson(res, 200, { ok: true, data: proj });
    return true;
  }

  if (req.method === 'POST' && route === '/pet/interact') {
    const worldId = String(body.worldId ?? '').trim();
    const petId = String(body.petId ?? '').trim();
    const action = String(body.action ?? '').trim();
    const expectedVersion = Number(body.expectedVersion);
    const key = String(body.idempotencyKey ?? '').trim();
    if (!worldId || !petId || !key || !['pet', 'feed', 'water'].includes(action) || !Number.isInteger(expectedVersion)) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Thao tác với bé mèo chưa hợp lệ.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = `pet_interact:${petId}:${action}:${expectedVersion}`;
    const prior = checkV015Idempotency(v015, worldId, userId, 'pet_interact', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }

    const existing = v015.pets[worldId] ?? null;
    if (!existing || existing.id !== petId) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Chưa có bé mèo nào trong nhà.' });
      return true;
    }
    if (existing.version !== expectedVersion) {
      sendJson(res, 409, { ok: false, code: 'VERSION_CONFLICT', message: 'Bé mèo vừa được người kia chăm rồi nhé!' });
      return true;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    if (action === 'feed' || action === 'water') {
      sendJson(res, 403, { ok: false, code: 'SERVER_AUTHORITY_REQUIRED', message: 'Thao tác này cần máy chủ xác nhận — hãy cho vào bát qua luồng chăm sóc mới.' });
      return true;
    }

    if (action === 'pet' && existing.lastPettedAtMs !== null && nowMs < existing.lastPettedAtMs + 15000) {
      sendJson(res, 409, { ok: false, code: 'COOLDOWN_ACTIVE', message: 'Bé mèo đang lim dim hưởng thụ, đợi chút nữa nhé.' });
      return true;
    }

    const vitals = catchupPetVitals(existing.vitals, existing.simStateAtMs, nowMs);
    const nextVitals = {
      hunger: vitals.hunger,
      energy: Math.min(100, vitals.energy + 2),
      fun: Math.min(100, vitals.fun + 12),
    };

    const updated = {
      ...existing,
      vitals: nextVitals,
      emotion: derivePetMood(nextVitals),
      lastPettedAtMs: nowMs,
      simStateAtMs: nowMs,
      version: existing.version + 1,
      updatedAt: nowIso,
    };
    v015.pets[worldId] = updated;
    const events = (v015.petEvents[worldId] ??= []);
    events.push({ id: `pevt-${crypto.randomUUID()}`, petId: updated.id, actorId: userId, type: action, vitals, key, at: nowIso });

    const kibbleRemaining = getWorldInventoryList(v015, worldId).find((i) => i.ownerScope === 'shared' && i.itemSku === 'pet_kibble_basic')?.qty ?? 0;
    const resPayload = { pet: projectPet(updated, nowMs), action, kibbleRemaining };
    saveV015Idempotency(v015, worldId, userId, 'pet_interact', key, reqHash, resPayload);
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: action === 'feed' ? 'inventory' : 'pet' });
    sendJson(res, 200, { ok: true, data: resPayload });
    return true;
  }

  if (req.method === 'GET' && route === '/pet/care') {
    const worldId = String(reqUrl.searchParams.get('worldId') ?? '').trim();
    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    sendJson(res, 200, { ok: true, data: projectPetCareBowl(v015, worldId) });
    return true;
  }

  if (req.method === 'POST' && route === '/pet/care/apply') {
    const worldId = String(body.worldId ?? '').trim();
    const petId = String(body.petId ?? '').trim();
    const action = String(body.action ?? '').trim();
    const expectedVersion = Number(body.expectedBowlVersion);
    const scope = String(body.ownerScope ?? 'shared').trim();
    const sku = String(body.itemSku ?? '').trim();
    const quality = String(body.quality ?? 'normal').trim();
    const key = String(body.idempotencyKey ?? '').trim();
    if (
      !worldId ||
      !petId ||
      !key ||
      !['fill_food', 'fill_water'].includes(action) ||
      !Number.isInteger(expectedVersion)
    ) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Thao tác chăm sóc chưa hợp lệ.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = JSON.stringify([petId, action, expectedVersion, scope, sku, quality]);
    const prior = checkV015Idempotency(v015, worldId, userId, 'pet_care_apply', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }
    const existing = v015.pets[worldId] ?? null;
    if (!existing || existing.id !== petId) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Chưa có bé mèo nào trong nhà.' });
      return true;
    }
    const bowl = ensurePetBowl(v015, worldId, petId);
    if (bowl.version !== expectedVersion) {
      sendJson(res, 409, { ok: false, code: 'VERSION_CONFLICT', message: 'Bát vừa được người kia cập nhật.' });
      return true;
    }
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    if (action === 'fill_food') {
      if (scope !== 'shared' && scope !== `user:${userId}`) {
        sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Phạm vi kho không hợp lệ.' });
        return true;
      }
      if (sku !== 'pet_kibble_basic' || quality !== 'normal') {
        sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Thức ăn chưa được hỗ trợ.' });
        return true;
      }
      if (bowl.foodPortions >= 2) {
        sendJson(res, 409, { ok: false, code: 'BOWL_FULL', message: 'Bát thức ăn đã đầy.' });
        return true;
      }
      const adj = adjustInventoryItem(v015, worldId, scope, 'pet_kibble_basic', -1, nowIso);
      if (!adj.ok) {
        sendJson(res, 400, { ok: false, code: adj.code, message: 'Hết hạt mèo rồi — hãy nhận thêm hạt 0₫ trong túi đồ nhé!' });
        return true;
      }
      bowl.foodPortions += 1;
      bowl.foodSku = 'pet_kibble_basic';
      bowl.foodQuality = 'normal';
      bowl.version += 1;
    } else {
      if (bowl.waterVolume >= 100) {
        sendJson(res, 409, { ok: false, code: 'BOWL_FULL', message: 'Bát nước đã đầy.' });
        return true;
      }
      bowl.waterVolume = 100;
      bowl.version += 1;
    }
    const resPayload = {
      bowl: {
        version: bowl.version,
        food_portions: bowl.foodPortions,
        water_volume: bowl.waterVolume,
        food_sku: bowl.foodSku,
        food_quality: bowl.foodQuality,
      },
      pet: projectPet(existing, nowMs),
    };
    saveV015Idempotency(v015, worldId, userId, 'pet_care_apply', key, reqHash, resPayload);
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: action === 'fill_food' ? 'inventory' : 'pet' });
    sendJson(res, 200, { ok: true, data: resPayload });
    return true;
  }

  // === OLW-015-05: Silent Study Room & Pomodoro Co-presence ===
  if (req.method === 'GET' && route === '/study') {
    const worldId = String(reqUrl.searchParams.get('worldId') ?? '').trim();
    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    sendJson(res, 200, { ok: true, data: buildStudySnapshot(v015, worldId, userId, Date.now()) });
    return true;
  }

  if (req.method === 'POST' && route === '/study/start') {
    const worldId = String(body.worldId ?? '').trim();
    const mode = String(body.mode ?? '').trim();
    const focusMinutes = Number(body.focusMinutes);
    const breakMinutes = Number(body.breakMinutes);
    const key = String(body.idempotencyKey ?? '').trim();
    if (
      !worldId || !key || !['solo', 'shared'].includes(mode) ||
      !Number.isInteger(focusMinutes) || focusMinutes < 1 || focusMinutes > 180 ||
      !Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 60
    ) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Cấu hình phiên học chưa hợp lệ.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = `study_start:${mode}:${focusMinutes}:${breakMinutes}`;
    const prior = checkV015Idempotency(v015, worldId, userId, 'study_start_session', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const list = (v015.studySessions[worldId] ??= []);

    for (const s of list) {
      const sameLane = mode === 'shared' ? s.mode === 'shared' : s.mode === 'solo' && s.ownerId === userId;
      if (sameLane && (s.status === 'running' || s.status === 'paused')) {
        const proj = projectStudySession(s, nowMs);
        if (proj.status === 'completed') {
          s.status = 'completed';
          s.phase = 'completed';
          s.remainingMs = 0;
          s.updatedAt = nowIso;
        } else {
          sendJson(res, 409, { ok: false, code: 'VERSION_CONFLICT', message: 'Đang có phiên học hoạt động ở chế độ này rồi.' });
          return true;
        }
      }
    }

    const session = {
      id: `study-${crypto.randomUUID()}`,
      worldId,
      ownerId: userId,
      mode,
      phase: 'focus',
      status: 'running',
      focusMinutes,
      breakMinutes,
      startedAtMs: nowMs,
      endsAtMs: nowMs + focusMinutes * 60000,
      remainingMs: focusMinutes * 60000,
      version: 1,
      updatedAt: nowIso,
    };
    list.push(session);

    const snap = buildStudySnapshot(v015, worldId, userId, nowMs);
    saveV015Idempotency(v015, worldId, userId, 'study_start_session', key, reqHash, snap);
    saveDb();
    if (mode === 'shared') broadcastEvent(worldId, 'world_mutated', { reason: 'study' });
    sendJson(res, 200, { ok: true, data: snap });
    return true;
  }

  if (req.method === 'POST' && route === '/study/control') {
    const worldId = String(body.worldId ?? '').trim();
    const sessionId = String(body.sessionId ?? '').trim();
    const action = String(body.action ?? '').trim();
    const expectedVersion = Number(body.expectedVersion);
    const key = String(body.idempotencyKey ?? '').trim();
    if (!worldId || !sessionId || !key || !['pause', 'resume', 'finish'].includes(action) || !Number.isInteger(expectedVersion)) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Lệnh điều khiển phiên học chưa hợp lệ.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = `study_control:${sessionId}:${action}:${expectedVersion}`;
    const prior = checkV015Idempotency(v015, worldId, userId, 'study_control_session', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }

    const list = (v015.studySessions[worldId] ??= []);
    const row = list.find((s) => s.id === sessionId);
    if (!row) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy phiên học.' });
      return true;
    }
    if (row.ownerId !== userId) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Chỉ người mở phiên học mới điều khiển được đồng hồ nhé.' });
      return true;
    }
    if (row.version !== expectedVersion) {
      sendJson(res, 409, { ok: false, code: 'VERSION_CONFLICT', message: 'Phiên học vừa được cập nhật.' });
      return true;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const proj = projectStudySession(row, nowMs);
    if (action === 'finish' || proj.status === 'completed') {
      row.phase = 'completed';
      row.status = 'completed';
      row.remainingMs = 0;
      row.version += 1;
      row.updatedAt = nowIso;
    } else if (action === 'pause' && proj.status === 'running') {
      row.phase = proj.phase;
      row.startedAtMs = proj.startedAtMs;
      row.endsAtMs = proj.endsAtMs;
      row.status = 'paused';
      row.remainingMs = proj.remainingMs;
      row.version += 1;
      row.updatedAt = nowIso;
    } else if (action === 'resume' && row.status === 'paused') {
      row.status = 'running';
      row.startedAtMs = nowMs;
      row.endsAtMs = nowMs + row.remainingMs;
      row.version += 1;
      row.updatedAt = nowIso;
    }

    const snap = buildStudySnapshot(v015, worldId, userId, nowMs);
    saveV015Idempotency(v015, worldId, userId, 'study_control_session', key, reqHash, snap);
    saveDb();
    if (row.mode === 'shared') broadcastEvent(worldId, 'world_mutated', { reason: 'study' });
    sendJson(res, 200, { ok: true, data: snap });
    return true;
  }

  // ---- OLW-015-02 Mailbox & Surprise Gifts ----
  function buildMailboxSnapshot(targetWorldId, viewerId, nowMs = Date.now()) {
    const rawList = (v015.letters[targetWorldId] ??= []);
    const visible = rawList
      .filter((item) => item.senderId === viewerId || item.recipientId === viewerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => {
        const redacted = item.recipientId === viewerId && item.openedAt === null && item.isSurprise;
        return {
          ...item,
          body: redacted ? null : item.body,
          giftItemSku: redacted ? null : item.giftItemSku,
          giftQty: redacted ? 0 : item.giftQty,
          giftQuality: redacted ? 'normal' : (item.giftQuality ?? 'normal'),
          bodyRedacted: redacted,
          giftRedacted: redacted && item.kind === 'gift',
        };
      });
    const unreadCount = rawList.filter(
      (item) => item.recipientId === viewerId && item.openedAt === null,
    ).length;
    return {
      worldId: targetWorldId,
      items: visible,
      unreadCount,
      serverNowMs: nowMs,
    };
  }

  if (req.method === 'GET' && route === '/mailbox') {
    const worldId = reqUrl.searchParams.get('worldId') ?? '';
    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    sendJson(res, 200, { ok: true, data: buildMailboxSnapshot(worldId, userId) });
    return true;
  }

  if (req.method === 'POST' && route === '/mailbox/send') {
    const worldId = String(body.worldId ?? '').trim();
    const recipientId = String(body.recipientId ?? '').trim();
    const subject = String(body.subject ?? '').replace(/\u0000/g, '').trim().slice(0, 60);
    const letterBody = String(body.body ?? '').replace(/\u0000/g, '').trim();
    const giftItemSku = body.giftItemSku ? String(body.giftItemSku).trim() : null;
    const giftQty = giftItemSku ? Number(body.giftQty) : 0;
    const giftQuality = String(body.giftQuality ?? 'normal').trim();
    const sourceScope = String(body.sourceScope ?? 'shared').trim();
    const isSurprise = Boolean(body.isSurprise);
    const key = String(body.idempotencyKey ?? '').trim();

    if (!worldId || !recipientId || !letterBody || letterBody.length > 500 || !key) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Nội dung thư chưa hợp lệ (1–500 ký tự).' });
      return true;
    }
    if (!isWorldMember(worldId, userId) || !isWorldMember(worldId, recipientId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Chỉ gửi thư/quà giữa hai thành viên trong ngôi nhà.' });
      return true;
    }
    if (recipientId === userId) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Không thể tự gửi thư cho chính mình.' });
      return true;
    }
    if (giftItemSku) {
      if (!Number.isInteger(giftQty) || giftQty < 1 || giftQty > 10 || !['shared', 'personal'].includes(sourceScope)) {
        sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Quà đính kèm hoặc số lượng chưa hợp lệ.' });
        return true;
      }
    }

    const reqHash = `mailbox_send:${recipientId}:${subject}:${letterBody}:${giftItemSku ?? ''}:${giftQty}:${sourceScope}:${isSurprise}:${giftQuality}`;
    const prior = checkV015Idempotency(v015, worldId, userId, 'mailbox_send', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    if (giftItemSku) {
      const ownerScope = sourceScope === 'shared' ? 'shared' : `user:${userId}`;
      const adj = adjustInventoryItem(v015, worldId, ownerScope, giftItemSku, -giftQty, nowIso, giftQuality);
      if (!adj.ok) {
        const status = adj.code === 'NOT_FOUND' ? 404 : 409;
        sendJson(res, status, adj);
        return true;
      }
    }

    const list = (v015.letters[worldId] ??= []);
    list.push({
      id: `mail-${crypto.randomUUID()}`,
      worldId,
      senderId: userId,
      recipientId,
      kind: giftItemSku ? 'gift' : 'letter',
      subject: subject || 'Thư nhỏ gửi bạn',
      body: letterBody,
      giftItemSku: giftItemSku ?? null,
      giftQty: giftItemSku ? giftQty : 0,
      giftQuality: giftItemSku ? giftQuality : 'normal',
      isSurprise,
      openedAt: null,
      createdAt: nowIso,
    });

    const data = {
      mailbox: buildMailboxSnapshot(worldId, userId, nowMs),
      inventory: buildInventorySnapshot(v015, worldId, userId, nowMs),
    };
    saveV015Idempotency(v015, worldId, userId, 'mailbox_send', key, reqHash, data);
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'mailbox' });
    if (giftItemSku) broadcastEvent(worldId, 'world_mutated', { reason: 'inventory' });
    sendJson(res, 200, { ok: true, data });
    return true;
  }

  if (req.method === 'POST' && route === '/mailbox/open') {
    const worldId = String(body.worldId ?? '').trim();
    const letterId = String(body.letterId ?? '').trim();
    const key = String(body.idempotencyKey ?? '').trim();
    if (!worldId || !letterId || !key) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Thiếu thông tin mở thư.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }

    const reqHash = `mailbox_open:${letterId}`;
    const prior = checkV015Idempotency(v015, worldId, userId, 'mailbox_open', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }

    const list = (v015.letters[worldId] ??= []);
    const row = list.find((item) => item.id === letterId);
    if (!row) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy lá thư hoặc món quà này.' });
      return true;
    }
    if (row.recipientId !== userId) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Chỉ người nhận mới mở được thư/quà này.' });
      return true;
    }
    if (row.openedAt !== null) {
      sendJson(res, 409, { ok: false, code: 'ALREADY_OPENED', message: 'Thư hoặc món quà này đã được mở rồi.' });
      return true;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    if (row.kind === 'gift' && row.giftItemSku && row.giftQty > 0) {
      // Credit to recipient personal compartment BEFORE setting openedAt so stack-full aborts cleanly
      const adj = adjustInventoryItem(
        v015,
        worldId,
        `user:${userId}`,
        row.giftItemSku,
        row.giftQty,
        nowIso,
        row.giftQuality ?? 'normal',
      );
      if (!adj.ok) {
        sendJson(res, 409, adj);
        return true;
      }
    }

    row.openedAt = nowIso;
    const data = {
      openedId: row.id,
      mailbox: buildMailboxSnapshot(worldId, userId, nowMs),
      inventory: buildInventorySnapshot(v015, worldId, userId, nowMs),
    };
    saveV015Idempotency(v015, worldId, userId, 'mailbox_open', key, reqHash, data);
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'mailbox' });
    if (row.kind === 'gift') broadcastEvent(worldId, 'world_mutated', { reason: 'inventory' });
    sendJson(res, 200, { ok: true, data });
    return true;
  }

  // ---- OLW-015-08 Dev Console K6 (Dev LAN only; production has no /dev-console routes) ----
  const OUTSIDER_DEV_ID = '33333333-3333-4333-8333-333333333333';
  function assertDevAdminWorld(targetWorldId) {
    if (!targetWorldId || userId === OUTSIDER_DEV_ID || !isWorldMember(targetWorldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Dev Console chỉ dành cho thành viên test trong môi trường Dev.' });
      return false;
    }
    return true;
  }

  if (req.method === 'POST' && route === '/dev-console/spawn-item') {
    const worldId = String(body.worldId ?? '').trim();
    const scope = String(body.scope ?? 'personal').trim();
    const itemSku = String(body.itemSku ?? '').trim();
    const qty = Number(body.qty);
    if (!assertDevAdminWorld(worldId)) return true;
    if (!['shared', 'personal'].includes(scope) || !Number.isInteger(qty) || qty === 0 || qty < -100 || qty > 100) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Tham số spawn vật phẩm không hợp lệ.' });
      return true;
    }
    const nowMs = Date.now();
    const ownerScope = scope === 'shared' ? 'shared' : `user:${userId}`;
    const adj = adjustInventoryItem(v015, worldId, ownerScope, itemSku, qty, new Date(nowMs).toISOString());
    if (!adj.ok) {
      sendJson(res, adj.code === 'NOT_FOUND' ? 404 : 409, adj);
      return true;
    }
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'inventory' });
    sendJson(res, 200, { ok: true, data: buildInventorySnapshot(v015, worldId, userId, nowMs) });
    return true;
  }

  if (req.method === 'POST' && route === '/dev-console/set-pet') {
    const worldId = String(body.worldId ?? '').trim();
    if (!assertDevAdminWorld(worldId)) return true;
    const pet = v015.pets[worldId];
    if (!pet) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Chưa nhận nuôi bé mèo cam.' });
      return true;
    }
    const clamp = (v) => Math.max(0, Math.min(100, Math.round(Number(v))));
    const nowMs = Date.now();
    pet.vitals = {
      hunger: clamp(body.hunger ?? pet.vitals.hunger),
      energy: clamp(body.energy ?? pet.vitals.energy),
      fun: clamp(body.fun ?? pet.vitals.fun),
    };
    pet.emotion = derivePetMood(pet.vitals);
    pet.simStateAtMs = nowMs;
    pet.version += 1;
    pet.updatedAt = new Date(nowMs).toISOString();
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'pet' });
    sendJson(res, 200, { ok: true, data: projectPet(pet, nowMs) });
    return true;
  }

  if (req.method === 'POST' && route === '/dev-console/advance-study') {
    const worldId = String(body.worldId ?? '').trim();
    const sessionId = String(body.sessionId ?? '').trim();
    const deltaSeconds = Number(body.deltaSeconds);
    if (!assertDevAdminWorld(worldId)) return true;
    if (!sessionId || !Number.isFinite(deltaSeconds)) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Tham số tua Pomodoro chưa hợp lệ.' });
      return true;
    }
    const row = (v015.studySessions[worldId] ?? []).find((s) => s.id === sessionId);
    if (!row) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy phiên học.' });
      return true;
    }
    const deltaMs = Math.round(deltaSeconds * 1000);
    const nowMs = Date.now();
    row.startedAtMs -= deltaMs;
    row.endsAtMs -= deltaMs;
    row.remainingMs = Math.max(0, row.remainingMs - deltaMs);
    row.version += 1;
    row.updatedAt = new Date(nowMs).toISOString();
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'study' });
    sendJson(res, 200, { ok: true, data: buildStudySnapshot(v015, worldId, userId, nowMs) });
    return true;
  }

  if (req.method === 'GET' && route === '/dev-console/snapshot-export') {
    const worldId = reqUrl.searchParams.get('worldId') ?? '';
    if (!assertDevAdminWorld(worldId)) return true;
    const nowMs = Date.now();
    // Sanitized export intentionally strips auth tokens, user emails, private letters, and idempotency logs
    const sanitized = {
      schemaVersion: 1,
      worldId,
      exportedAt: new Date(nowMs).toISOString(),
      placements: structuredClone(db.placements?.[worldId] ?? []),
      inventory: structuredClone(getWorldInventoryList(v015, worldId)),
      pet: v015.pets[worldId] ? structuredClone(v015.pets[worldId]) : null,
      studySessions: structuredClone(v015.studySessions[worldId] ?? []),
    };
    sendJson(res, 200, { ok: true, data: sanitized });
    return true;
  }

  if (req.method === 'POST' && route === '/dev-console/snapshot-restore') {
    const worldId = String(body.worldId ?? '').trim();
    const snap = body.snapshot;
    if (!assertDevAdminWorld(worldId)) return true;
    if (
      !snap ||
      typeof snap !== 'object' ||
      snap.schemaVersion !== 1 ||
      snap.worldId !== worldId ||
      !Array.isArray(snap.placements) ||
      !Array.isArray(snap.inventory) ||
      !Array.isArray(snap.studySessions)
    ) {
      sendJson(res, 400, {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Snapshot không hợp lệ hoặc không khớp worldId / schemaVersion.',
      });
      return true;
    }

    db.placements[worldId] = structuredClone(snap.placements);
    if (db.worlds?.[worldId]) {
      db.worlds[worldId].layoutVersion = (db.worlds[worldId].layoutVersion ?? 1) + 1;
    }
    v015.inventory[worldId] = structuredClone(snap.inventory);
    if (snap.pet && typeof snap.pet === 'object' && snap.pet.worldId === worldId) {
      v015.pets[worldId] = structuredClone(snap.pet);
    } else if (snap.pet === null) {
      delete v015.pets[worldId];
    }
    v015.studySessions[worldId] = structuredClone(snap.studySessions);

    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'furniture' });
    broadcastEvent(worldId, 'world_mutated', { reason: 'inventory' });
    broadcastEvent(worldId, 'world_mutated', { reason: 'pet' });
    broadcastEvent(worldId, 'world_mutated', { reason: 'study' });
    sendJson(res, 200, { ok: true, data: { restored: true } });
    return true;
  }

  return false;
}
