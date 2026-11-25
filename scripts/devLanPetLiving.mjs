/** Dev LAN parity for Mission 04B-2 pet living authority (transaction semantics mirror SQL). */

import crypto from 'node:crypto';

const TRAVEL_MS = { eat_bowl: 1400, drink_water: 1000 };
const PERFORM_MS = { eat_bowl: 2800, drink_water: 2200 };

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

export function buildLivingSnapshot(v015, worldId, { projectPet, projectPetCareBowl }) {
  const nowMs = Date.now();
  const pet = v015.pets[worldId] ?? null;
  const living = ensureLivingWorld(v015, worldId);
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
  } = ctx;

  const deps = { projectPet, projectPetCareBowl };
  const snap = (worldId) => buildLivingSnapshot(v015, worldId, deps);

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
    const nowMs = Date.now();
    const travel = TRAVEL_MS[actionId];
    const perform = PERFORM_MS[actionId];
    const instanceId = crypto.randomUUID();
    living.actions[instanceId] = {
      id: instanceId,
      worldId,
      petId,
      actionId,
      targetAffordanceId,
      status: 'moving',
      startedAtMs: nowMs,
      arriveAtMs: nowMs + travel,
      performUntilMs: nowMs + travel + perform,
      movementVerified: false,
      animationVerified: false,
      consumptionRecorded: false,
      completedAtMs: null,
    };
    pet.livingVersion += 1;
    const payload = { instanceId, snapshot: snap(worldId) };
    saveV015Idempotency(v015, worldId, userId, 'pet_living_begin_action', key, reqHash, payload);
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'pet' });
    sendJson(res, 200, { ok: true, data: payload });
    return true;
  }

  if (req.method === 'POST' && route === '/pet/living/submit-proposal') {
    const worldId = String(body.worldId ?? '').trim();
    const instanceId = String(body.instanceId ?? '').trim();
    const proposal = String(body.proposal ?? '').trim();
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
      if (nowMs < row.arriveAtMs) {
        sendJson(res, 409, { ok: false, code: 'MOVEMENT_NOT_READY', message: 'Chưa đủ thời gian di chuyển (máy chủ).' });
        return true;
      }
      row.movementVerified = true;
      row.status = 'performing';
    } else {
      if (!row.movementVerified || nowMs < row.performUntilMs) {
        sendJson(res, 403, { ok: false, code: 'CONSUMPTION_NOT_AUTHORIZED', message: 'Chưa đủ điều kiện tiêu thụ (máy chủ).' });
        return true;
      }
      if (row.consumptionRecorded) {
        sendJson(res, 409, { ok: false, code: 'ALREADY_CONSUMED', message: 'Phần ăn/uống này đã được ghi nhận.' });
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
    });
    const payload = { offerId, snapshot: snap(worldId) };
    saveV015Idempotency(v015, worldId, userId, 'pet_food_offer_create', key, reqHash, payload);
    saveDb();
    sendJson(res, 200, { ok: true, data: payload });
    return true;
  }

  if (req.method === 'POST' && route === '/pet/living/food-offer/respond') {
    const worldId = String(body.worldId ?? '').trim();
    const offerId = String(body.offerId ?? '').trim();
    const response = String(body.response ?? '').trim();
    const key = String(body.idempotencyKey ?? '').trim();
    if (!worldId || !offerId || !key || !['accept', 'refuse', 'defer', 'cancel'].includes(response)) {
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
    if (!['pending', 'deferred'].includes(offer.status)) {
      sendJson(res, 409, { ok: false, code: 'VALIDATION_ERROR', message: 'Lời mời không còn chờ phản hồi.' });
      return true;
    }
    if (nowMs > offer.expiresAtMs) {
      offer.status = 'expired';
      sendJson(res, 409, { ok: false, code: 'OFFER_EXPIRED', message: 'Lời mời đã hết hạn.' });
      return true;
    }
    if (response === 'cancel' && offer.caregiverId !== userId) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Chỉ người đưa lời mời mới hủy được.' });
      return true;
    }
    const statusMap = { accept: 'accepted', refuse: 'refused', defer: 'deferred', cancel: 'cancelled' };
    offer.status = statusMap[response];
    offer.respondedAtMs = nowMs;
    const payload = { snapshot: snap(worldId) };
    saveV015Idempotency(v015, worldId, userId, 'pet_food_offer_respond', key, reqHash, payload);
    saveDb();
    sendJson(res, 200, { ok: true, data: payload });
    return true;
  }

  return false;
}