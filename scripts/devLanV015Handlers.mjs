// Server-side Dev LAN parity handlers for V0.1.5 Living Home (OLW-015-01..08)

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
];

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
    };
  }
  db.v015.inventory ??= {};
  db.v015.kibbleClaims ??= {};
  db.v015.pets ??= {};
  db.v015.petEvents ??= {};
  db.v015.studySessions ??= {};
  db.v015.letters ??= {};
  db.v015.idem ??= {};
  return db.v015;
}

export function getWorldInventoryList(v015, worldId) {
  v015.inventory[worldId] ??= [];
  return v015.inventory[worldId];
}

export function adjustInventoryItem(v015, worldId, ownerScope, itemSku, delta, nowIso) {
  if (ownerScope !== 'shared' && !/^user:[0-9a-f-]+$/i.test(ownerScope)) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Phạm vi kho đồ không hợp lệ.' };
  }
  const cat = CATALOG_BY_SKU.get(itemSku);
  if (!cat) {
    return { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy vật phẩm.' };
  }
  const list = getWorldInventoryList(v015, worldId);
  const idx = list.findIndex((i) => i.ownerScope === ownerScope && i.itemSku === itemSku);
  const cur = idx >= 0 ? list[idx].qty : 0;
  const next = cur + delta;
  if (next < 0) {
    return { ok: false, code: 'INSUFFICIENT_ITEMS', message: 'Không đủ vật phẩm trong túi.' };
  }
  if (next > cat.stackLimit) {
    return { ok: false, code: 'STACK_FULL', message: `Ngăn chứa ${cat.nameVi} đã đầy (${cat.stackLimit}).` };
  }
  if (next === 0) {
    if (idx >= 0) list.splice(idx, 1);
  } else {
    const entry = { worldId, ownerScope, itemSku, qty: next, updatedAt: nowIso };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
  }
  return { ok: true, qty: next };
}

export function buildInventorySnapshot(v015, worldId, userId, nowMs = Date.now()) {
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

  return false;
}
