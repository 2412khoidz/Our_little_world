/** Dev LAN parity for Mission 04B-2 pet living authority (transaction semantics mirror SQL). */

import crypto from 'node:crypto';
import { STALE_ACTION_MS, buildDevLanMovementPlan } from './devLanPetLivingPlan.mjs';

export function ensurePetLivingDb(v015) {
  v015.petLiving ??= {};
  return v015.petLiving;
}

function ensureLivingWorld(v015, worldId) {
  const root = ensurePetLivingDb(v015);
  if (!root[worldId]) {
    root[worldId] = { actions: {}, offers: [], memory: [] };
  }
  return root[worldId];
}

function ensurePetLivingVersion(pet) {
  if (pet.livingVersion == null) pet.livingVersion = 1;
  if (!pet.personality) pet.personality = { profileId: 'mischievous_quyt' };
}

function appendMemory(living, row) {
  living.memory.push(row);
  if (living.memory.length > 64) {
    living.memory.splice(0, living.memory.length - 64);
  }
}

function findActiveAction(living) {
  return (
    Object.values(living.actions).find((a) => a.status === 'moving' || a.status === 'performing') ?? null
  );
}

function recoverStaleActions(living, nowMs) {
  for (const action of Object.values(living.actions)) {
    if (
      (action.status === 'moving' || action.status === 'performing') &&
      nowMs > action.performUntilMs + STALE_ACTION_MS
    ) {
      action.status = 'cancelled';
      action.completedAtMs = nowMs;
    }
  }
}

function refundReservedOffer(v015, worldId, offer, nowMs, adjustInventoryItem) {
  if (!offer.inventoryReserved) return { ok: true };
  const result = adjustInventoryItem(
    v015, worldId, offer.reservedOwnerScope, offer.itemSku, 1, new Date(nowMs).toISOString(), offer.quality,
  );
  if (result.ok) offer.inventoryReserved = false;
  return result;
}

function expireDueOffers({ v015, worldId, nowMs, adjustInventoryItem }) {
  const living = ensureLivingWorld(v015, worldId);
  let changed = false;
  for (const offer of living.offers) {
    if (!['pending', 'accepted', 'deferred'].includes(offer.status) || nowMs <= offer.expiresAtMs) continue;
    if (!refundReservedOffer(v015, worldId, offer, nowMs, adjustInventoryItem).ok) continue;
    offer.status = 'expired';
    offer.respondedAtMs = nowMs;
    changed = true;
  }
  return changed;
}

export function finalizeAcceptedOfferForFill(v015, worldId, userId, scope, sku, quality, nowMs = Date.now()) {
  const living = ensureLivingWorld(v015, worldId);
  const offer = living.offers.find(
    (o) =>
      o.worldId === worldId &&
      o.status === 'accepted' &&
      o.inventoryReserved &&
      o.caregiverId === userId &&
      o.reservedOwnerScope === scope &&
      o.itemSku === sku &&
      (o.quality ?? 'normal') === quality,
  );
  if (!offer) return null;
  offer.status = 'consumed';
  offer.inventoryReserved = false;
  offer.respondedAtMs = nowMs;
  return offer.id;
}

function authorityConsumeFood({ v015, worldId, petId, caregiverId, ensurePetBowl, catchupPetVitals, derivePetMood }) {
  const nowMs = Date.now();
  const pet = v015.pets[worldId];
  if (!pet || pet.id !== petId) {
    return { ok: false, code: 'NOT_FOUND', message: 'Chưa có bé mèo.' };
  }
  const bowl = ensurePetBowl(v015, worldId, petId);
  if (!bowl.foodPortions) {
    return { ok: false, code: 'BOWL_EMPTY', message: 'Bát đang trống.' };
  }
  if (pet.lastFedAtMs != null && nowMs < pet.lastFedAtMs + 60000) {
    return { ok: false, code: 'COOLDOWN_ACTIVE', message: 'Bé mèo vừa ăn, đợi chút nữa nhé.' };
  }
  const vitals = catchupPetVitals(pet.vitals, pet.simStateAtMs, nowMs);
  if (vitals.hunger >= 90) {
    return { ok: false, code: 'PET_FULL', message: 'Bé mèo no rồi!' };
  }
  const sku = bowl.foodSku;
  const quality = bowl.foodQuality;
  const nextVitals = { ...vitals, hunger: Math.min(100, vitals.hunger + 28) };
  const nextPortions = bowl.foodPortions - 1;
  v015.pets[worldId] = {
    ...pet,
    vitals: nextVitals,
    emotion: derivePetMood(nextVitals),
    lastFedAtMs: nowMs,
    simStateAtMs: nowMs,
    version: pet.version + 1,
    livingVersion: (pet.livingVersion ?? 1) + 1,
    updatedAt: new Date(nowMs).toISOString(),
  };
  bowl.foodPortions = nextPortions;
  bowl.version += 1;
  if (nextPortions === 0) {
    bowl.foodSku = null;
    bowl.foodQuality = null;
  }
  const living = ensureLivingWorld(v015, worldId);
  appendMemory(living, {
    id: crypto.randomUUID(),
    worldId,
    petId,
    kind: 'ate_bowl',
    caregiverId,
    atMs: nowMs,
    payload: { sku, quality },
  });
  return { ok: true };
}

function authorityConsumeWater({ v015, worldId, petId, caregiverId, ensurePetBowl }) {
  const nowMs = Date.now();
  const pet = v015.pets[worldId];
  if (!pet || pet.id !== petId) {
    return { ok: false, code: 'NOT_FOUND', message: 'Chưa có bé mèo.' };
  }
  const bowl = ensurePetBowl(v015, worldId, petId);
  if (bowl.waterVolume < 10) {
    return { ok: false, code: 'BOWL_EMPTY', message: 'Bát nước đang trống.' };
  }
  if (pet.lastWateredAtMs != null && nowMs < pet.lastWateredAtMs + 20000) {
    return { ok: false, code: 'COOLDOWN_ACTIVE', message: 'Bé mèo vừa uống, đợi chút nữa nhé.' };
  }
  bowl.waterVolume -= 10;
  bowl.version += 1;
  v015.pets[worldId] = {
    ...pet,
    lastWateredAtMs: nowMs,
    version: pet.version + 1,
    livingVersion: (pet.livingVersion ?? 1) + 1,
    updatedAt: new Date(nowMs).toISOString(),
  };
  const living = ensureLivingWorld(v015, worldId);
  appendMemory(living, {
    id: crypto.randomUUID(),
    worldId,
    petId,
    kind: 'drank_water',
    caregiverId,
    atMs: nowMs,
    payload: {},
  });
  return { ok: true };
}

function buildLivingSnapshot(v015, worldId, { projectPet, projectPetCareBowl }) {
  const nowMs = Date.now();
  const pet = v015.pets[worldId] ?? null;
  const living = ensureLivingWorld(v015, worldId);
  recoverStaleActions(living, nowMs);
  if (pet) ensurePetLivingVersion(pet);
  const bowl = projectPetCareBowl(v015, worldId);
  const active = findActiveAction(living);
  const pendingOffers = living.offers
    .filter((o) => ['pending', 'accepted', 'deferred'].includes(o.status))
    .map((o) => ({
      id: o.id,
      worldId: o.worldId,
      petId: o.petId,
      caregiverId: o.caregiverId,
      itemSku: o.itemSku,
      quality: o.quality,
      status: o.status,
      expiresAtMs: o.expiresAtMs,
      createdAtMs: o.createdAtMs,
    }));
  const recentMemory = [...living.memory]
    .sort((a, b) => b.atMs - a.atMs)
    .slice(0, 16)
    .map((m) => ({
      id: m.id,
      worldId: m.worldId,
      petId: m.petId,
      kind: m.kind,
      caregiverId: m.caregiverId,
      atMs: m.atMs,
      payload: m.payload,
    }));

  if (!pet) {
    return { worldId, petId: null, serverNowMs: nowMs };
  }

  return {
    worldId,
    petId: pet.id,
    livingVersion: pet.livingVersion ?? 1,
    serverNowMs: nowMs,
    personalityJson: pet.personality ?? { profileId: 'mischievous_quyt' },
    brainStateJson: pet.brainState ?? null,
    activeAction: active
      ? {
          id: active.id,
          worldId: active.worldId,
          petId: active.petId,
          actionId: active.actionId,
          targetAffordanceId: active.targetAffordanceId,
          status: active.status,
          startedAtMs: active.startedAtMs,
          arriveAtMs: active.arriveAtMs,
          performUntilMs: active.performUntilMs,
          movementVerified: active.movementVerified,
          animationVerified: active.animationVerified,
          completedAtMs: active.completedAtMs ?? null,
        }
      : null,
    pendingOffers,
    recentMemory,
    bowl: {
      version: bowl.version,
      foodPortions: bowl.foodPortions,
      waterVolume: bowl.waterVolume,
      foodSku: bowl.foodSku,
      foodQuality: bowl.foodQuality,
    },
    pet: projectPet(pet, nowMs),
  };
}

export function tryHandlePetLivingRoute(ctx) {
  const {
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
    checkV015Idempotency,
    saveV015Idempotency,
    ensurePetBowl,
    projectPet,
    projectPetCareBowl,
    catchupPetVitals,
    derivePetMood,
    adjustInventoryItem,
    getWorldInventoryList,
  } = ctx;

  const deps = { projectPet, projectPetCareBowl };
  function inventoryChanged(worldId) {
    broadcastEvent(worldId, 'world_mutated', { reason: 'inventory' });
    saveDb();
  }
  const snap = (worldId) => {
    if (expireDueOffers({ v015, worldId, nowMs: Date.now(), adjustInventoryItem })) inventoryChanged(worldId);
    return buildLivingSnapshot(v015, worldId, deps);
  };

  if (req.method === 'GET' && route === '/pet/living') {
    const worldId = String(reqUrl.searchParams.get('worldId') ?? '').trim();
    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    sendJson(res, 200, { ok: true, data: snap(worldId) });
    return true;
  }

  if (req.method === 'POST' && route === '/pet/living/begin-action') {
    const worldId = String(body.worldId ?? '').trim();
    const petId = String(body.petId ?? '').trim();
    const actionId = String(body.actionId ?? '').trim();
    const targetAffordanceId = String(body.targetAffordanceId ?? '').trim();
    const expectedLivingVersion = Number(body.expectedLivingVersion);
    const key = String(body.idempotencyKey ?? '').trim();
    if (
      !worldId ||
      !petId ||
      !key ||
      !['eat_bowl', 'drink_water'].includes(actionId) ||
      !targetAffordanceId ||
      !Number.isInteger(expectedLivingVersion)
    ) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Hành động sống chưa hợp lệ.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = JSON.stringify([petId, actionId, targetAffordanceId, expectedLivingVersion]);
    const prior = checkV015Idempotency(v015, worldId, userId, 'pet_living_begin_action', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }
    const pet = v015.pets[worldId];
    if (!pet || pet.id !== petId) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Chưa có bé mèo.' });
      return true;
    }
    ensurePetLivingVersion(pet);
    if (pet.livingVersion !== expectedLivingVersion) {
      sendJson(res, 409, { ok: false, code: 'VERSION_CONFLICT', message: 'Trạng thái mèo vừa đổi, thử lại nhé.' });
      return true;
    }
    const living = ensureLivingWorld(v015, worldId);
    if (findActiveAction(living)) {
      sendJson(res, 409, { ok: false, code: 'ACTION_IN_PROGRESS', message: 'Bé mèo đang bận một việc khác.' });
      return true;
    }
    const bowl = ensurePetBowl(v015, worldId, petId);
    if (actionId === 'eat_bowl' && !bowl.foodPortions) {
      sendJson(res, 409, { ok: false, code: 'BOWL_EMPTY', message: 'Bát đang trống.' });
      return true;
    }
    if (actionId === 'drink_water' && bowl.waterVolume < 10) {
      sendJson(res, 409, { ok: false, code: 'BOWL_EMPTY', message: 'Bát nước đang trống.' });
      return true;
    }
    recoverStaleActions(living, Date.now());
    const planRes = buildDevLanMovementPlan(pet, actionId, targetAffordanceId);
    if (!planRes.ok) {
      sendJson(res, 409, { ok: false, code: planRes.code, message: 'Không thể lập kế hoạch di chuyển máy chủ.' });
      return true;
    }
    const plan = planRes.plan;
    const nowMs = Date.now();
    const instanceId = crypto.randomUUID();
    living.actions[instanceId] = {
      id: instanceId,
      worldId,
      petId,
      actionId,
      targetAffordanceId,
      status: 'moving',
      startedAtMs: nowMs,
      arriveAtMs: nowMs + plan.travelMs,
      performUntilMs: nowMs + plan.travelMs + plan.performMs,
      destTileX: plan.destTileX,
      destTileY: plan.destTileY,
      originTileX: plan.originTileX,
      originTileY: plan.originTileY,
      authoritativeTileX: plan.originTileX,
      authoritativeTileY: plan.originTileY,
      pathSteps: plan.pathSteps,
      movementPlanHash: plan.planHash,
      movementVerified: false,
      animationVerified: false,
      consumptionRecorded: false,
      completedAtMs: null,
    };
    pet.livingVersion += 1;
    const payload = { instanceId, movementPlan: plan, snapshot: snap(worldId) };
    saveV015Idempotency(v015, worldId, userId, 'pet_living_begin_action', key, reqHash, payload);
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'pet' });
    sendJson(res, 200, { ok: true, data: payload });
    return true;
  }

  if (req.method === 'POST' && route === '/pet/living/submit-proposal') {
    const worldId = String(body.worldId ?? '').trim();
    const instanceId = String(body.instanceId ?? '').trim();
    const proposal = body.proposal == null ? '' : String(body.proposal).trim();
    const proof = body.proof ?? null;
    const key = String(body.idempotencyKey ?? '').trim();
    if (!worldId || !instanceId || !key || !['movement_ready', 'animation_finished'].includes(proposal)) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Đề xuất chưa hợp lệ.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = JSON.stringify([instanceId, proposal]);
    const prior = checkV015Idempotency(v015, worldId, userId, 'pet_living_submit_proposal', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }
    const living = ensureLivingWorld(v015, worldId);
    const row = living.actions[instanceId];
    if (!row || row.worldId !== worldId) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy hành động.' });
      return true;
    }
    const nowMs = Date.now();
    if (row.status === 'cancelled') {
      sendJson(res, 409, { ok: false, code: 'ACTION_STALE', message: 'Hành động đã quá hạn.' });
      return true;
    }
    if (row.status === 'completed' && row.consumptionRecorded) {
      const payload = { snapshot: snap(worldId) };
      saveV015Idempotency(v015, worldId, userId, 'pet_living_submit_proposal', key, reqHash, payload);
      sendJson(res, 200, { ok: true, data: payload });
      return true;
    }
    if (!['moving', 'performing'].includes(row.status)) {
      sendJson(res, 409, { ok: false, code: 'VALIDATION_ERROR', message: 'Hành động không còn hợp lệ.' });
      return true;
    }
    if (proposal === 'movement_ready') {
      if (row.destTileX == null || row.destTileY == null) {
        sendJson(res, 403, { ok: false, code: 'CONSUMPTION_NOT_AUTHORIZED', message: 'Thiếu kế hoạch di chuyển máy chủ.' });
        return true;
      }
      if (nowMs < row.arriveAtMs) {
        sendJson(res, 409, { ok: false, code: 'MOVEMENT_NOT_READY', message: 'Chưa đủ thời gian di chuyển (máy chủ).' });
        return true;
      }
      row.movementVerified = true;
      row.status = 'performing';
      row.authoritativeTileX = row.destTileX;
      row.authoritativeTileY = row.destTileY;
    } else {
      if (!row.movementVerified || nowMs < row.performUntilMs) {
        sendJson(res, 403, { ok: false, code: 'CONSUMPTION_NOT_AUTHORIZED', message: 'Chưa đủ điều kiện tiêu thụ (máy chủ).' });
        return true;
      }
      if (row.consumptionRecorded) {
        sendJson(res, 409, { ok: false, code: 'ALREADY_CONSUMED', message: 'Phần ăn/uống này đã được ghi nhận.' });
        return true;
      }
      if (row.authoritativeTileX !== row.destTileX || row.authoritativeTileY !== row.destTileY) {
        sendJson(res, 403, { ok: false, code: 'CONSUMPTION_NOT_AUTHORIZED', message: 'Máy chủ chưa xác nhận vị trí.' });
        return true;
      }
      const consume =
        row.actionId === 'eat_bowl'
          ? authorityConsumeFood({
              v015,
              worldId,
              petId: row.petId,
              caregiverId: userId,
              ensurePetBowl,
              catchupPetVitals,
              derivePetMood,
            })
          : authorityConsumeWater({ v015, worldId, petId: row.petId, caregiverId: userId, ensurePetBowl });
      if (!consume.ok) {
        sendJson(res, 409, consume);
        return true;
      }
      row.animationVerified = true;
      row.status = 'completed';
      row.consumptionRecorded = true;
      row.completedAtMs = nowMs;
    }
    const payload = { snapshot: snap(worldId) };
    saveV015Idempotency(v015, worldId, userId, 'pet_living_submit_proposal', key, reqHash, payload);
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'pet' });
    sendJson(res, 200, { ok: true, data: payload });
    return true;
  }

  if (req.method === 'POST' && route === '/pet/living/food-offer') {
    const worldId = String(body.worldId ?? '').trim();
    const petId = String(body.petId ?? '').trim();
    const itemSku = String(body.itemSku ?? '').trim();
    const quality = String(body.quality ?? 'normal').trim();
    const ttlSeconds = Number(body.ttlSeconds);
    const key = String(body.idempotencyKey ?? '').trim();
    if (
      !worldId ||
      !petId ||
      !itemSku ||
      !key ||
      !['normal', 'silver', 'gold'].includes(quality) ||
      !Number.isFinite(ttlSeconds) ||
      ttlSeconds < 30 ||
      ttlSeconds > 86400
    ) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Lời mời thức ăn chưa hợp lệ.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = JSON.stringify([petId, itemSku, quality, ttlSeconds]);
    const prior = checkV015Idempotency(v015, worldId, userId, 'pet_food_offer_create', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }
    const pet = v015.pets[worldId];
    if (!pet || pet.id !== petId) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Chưa có bé mèo.' });
      return true;
    }
    const nowIso = new Date().toISOString();
    const list = getWorldInventoryList(v015, worldId);
    let reservedScope = 'shared';
  const sharedQty =
      list.find((i) => i.ownerScope === 'shared' && i.itemSku === itemSku && (i.quality ?? 'normal') === quality)?.qty ?? 0;
    if (sharedQty <= 0) {
      const personalScope = `user:${userId}`;
      const personalQty =
        list.find((i) => i.ownerScope === personalScope && i.itemSku === itemSku && (i.quality ?? 'normal') === quality)
          ?.qty ?? 0;
      if (personalQty <= 0) {
        sendJson(res, 409, { ok: false, code: 'INSUFFICIENT_ITEMS', message: 'Không đủ vật phẩm để đưa lời mời.' });
        return true;
      }
      reservedScope = personalScope;
    }
    const debit = adjustInventoryItem(v015, worldId, reservedScope, itemSku, -1, nowIso, quality);
    if (!debit.ok) {
      sendJson(res, 409, { ok: false, code: debit.code, message: debit.message });
      return true;
    }
    const nowMs = Date.now();
    const living = ensureLivingWorld(v015, worldId);
    const offerId = crypto.randomUUID();
    living.offers.push({
      id: offerId,
      worldId,
      petId,
      caregiverId: userId,
      itemSku,
      quality,
      status: 'pending',
      expiresAtMs: nowMs + ttlSeconds * 1000,
      createdAtMs: nowMs,
      reservedOwnerScope: reservedScope,
      inventoryReserved: true,
    });
    const payload = { offerId, snapshot: snap(worldId) };
    saveV015Idempotency(v015, worldId, userId, 'pet_food_offer_create', key, reqHash, payload);
    inventoryChanged(worldId);
    sendJson(res, 200, { ok: true, data: payload });
    return true;
  }

  if (req.method === 'POST' && route === '/pet/living/food-offer/respond') {
    const worldId = String(body.worldId ?? '').trim();
    const offerId = String(body.offerId ?? '').trim();
    const response = String(body.response ?? '').trim();
    const key = String(body.idempotencyKey ?? '').trim();
    if (!worldId || !offerId || !key || response !== 'cancel') {
      if (response !== 'cancel') {
        sendJson(res, 403, { ok: false, code: 'BRAIN_AUTHORITY_REQUIRED', message: 'Chỉ máy chủ quyết định phản hồi mèo.' });
        return true;
      }
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Phản hồi lời mời chưa hợp lệ.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = JSON.stringify([offerId, response]);
    const prior = checkV015Idempotency(v015, worldId, userId, 'pet_food_offer_respond', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }
    const living = ensureLivingWorld(v015, worldId);
    const offer = living.offers.find((o) => o.id === offerId && o.worldId === worldId);
    if (!offer) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy lời mời.' });
      return true;
    }
    const nowMs = Date.now();
    if (!['pending', 'deferred', 'accepted'].includes(offer.status)) {
      sendJson(res, 409, { ok: false, code: 'VALIDATION_ERROR', message: 'Lời mời không còn chờ phản hồi.' });
      return true;
    }
    if (offer.caregiverId !== userId) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Chỉ người đưa lời mời mới hủy được.' });
      return true;
    }
    const refund = refundReservedOffer(v015, worldId, offer, nowMs, adjustInventoryItem);
    if (!refund.ok) {
      sendJson(res, 409, refund);
      return true;
    }
    if (nowMs > offer.expiresAtMs) {
      offer.status = 'expired';
      offer.respondedAtMs = nowMs;
      inventoryChanged(worldId);
      sendJson(res, 409, { ok: false, code: 'OFFER_EXPIRED', message: 'Lời mời đã hết hạn.' });
      return true;
    }
    offer.status = 'cancelled';
    offer.respondedAtMs = nowMs;
    const payload = { snapshot: snap(worldId) };
    saveV015Idempotency(v015, worldId, userId, 'pet_food_offer_respond', key, reqHash, payload);
    inventoryChanged(worldId);
    sendJson(res, 200, { ok: true, data: payload });
    return true;
  }

  if (req.method === 'POST' && route === '/pet/living/food-offer/evaluate') {
    const worldId = String(body.worldId ?? '').trim();
    const petId = String(body.petId ?? '').trim();
    const key = String(body.idempotencyKey ?? '').trim();
    if (!worldId || !petId || !key) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Yêu cầu đánh giá chưa hợp lệ.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const reqHash = JSON.stringify([petId]);
    const prior = checkV015Idempotency(v015, worldId, userId, 'pet_food_offer_evaluate', key, reqHash);
    if (prior) {
      if (prior.conflict) {
        sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác nội dung.' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: prior.response });
      return true;
    }
    const pet = v015.pets[worldId];
    if (!pet || pet.id !== petId) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Chưa có bé mèo.' });
      return true;
    }
    const living = ensureLivingWorld(v015, worldId);
    const offer = [...living.offers]
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .find((o) => o.worldId === worldId && o.petId === petId && o.status === 'pending');
    const nowMs = Date.now();
    if (!offer) {
      const payload = { snapshot: snap(worldId) };
      saveV015Idempotency(v015, worldId, userId, 'pet_food_offer_evaluate', key, reqHash, payload);
      sendJson(res, 200, { ok: true, data: payload });
      return true;
    }
    const vitals = catchupPetVitals(pet.vitals, pet.simStateAtMs, nowMs);
    let outcome;
    if (vitals.hunger >= 88) outcome = 'refused';
    else if (vitals.hunger <= 55 && offer.itemSku === 'pet_kibble_basic') outcome = 'accepted';
    else outcome = 'deferred';
    if (outcome === 'refused') {
      const refund = refundReservedOffer(v015, worldId, offer, nowMs, adjustInventoryItem);
      if (!refund.ok) {
        sendJson(res, 409, refund);
        return true;
      }
    }
    offer.status = outcome;
    offer.respondedAtMs = nowMs;
    appendMemory(living, {
      id: crypto.randomUUID(),
      worldId,
      petId,
      kind: `food_offer_${outcome}`,
      caregiverId: offer.caregiverId,
      atMs: nowMs,
      payload: { offerId: offer.id, sku: offer.itemSku, quality: offer.quality },
    });
    const payload = { outcome, offerId: offer.id, snapshot: snap(worldId) };
    saveV015Idempotency(v015, worldId, userId, 'pet_food_offer_evaluate', key, reqHash, payload);
    if (outcome === 'refused') inventoryChanged(worldId);
    else saveDb();
    sendJson(res, 200, { ok: true, data: payload });
    return true;
  }

  return false;
}