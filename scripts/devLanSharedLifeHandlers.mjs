// Dev LAN Shared Life Vertical Slices handler (Journal, Wishlist, Calendar, Album presets)
import crypto from 'node:crypto';

const DEFAULT_ALBUM_CARDS = [
  {
    id: 'sunset-porch',
    titleVi: 'Buổi chiều trước hiên nhà',
    captionVi: 'Ngày đầu tiên chuyển về căn nhà nhỏ ngập hoa anh đào.',
    skyHex: '#f6b39b',
    accentHex: '#ffd7b5',
    mimeType: 'preset',
    byteSize: 0,
  },
  {
    id: 'sakura-picnic',
    titleVi: 'Dã ngoại dưới tán anh đào',
    captionVi: 'Miếng bánh dâu và hai tách trà ấm giữa khu vườn yên bình.',
    skyHex: '#f3b7c8',
    accentHex: '#fff0e6',
    mimeType: 'preset',
    byteSize: 0,
  },
  {
    id: 'rainy-study',
    titleVi: 'Buổi tối học bài cùng nhau',
    captionVi: 'Không cần nói nhiều, chỉ cần biết người kia vẫn ở bàn bên cạnh.',
    skyHex: '#7d8db5',
    accentHex: '#ffe39c',
    mimeType: 'preset',
    byteSize: 0,
  },
];

export function ensureSharedLifeDb(v015) {
  v015.sharedLife ??= {};
}

function getWorldSharedLife(v015, worldId) {
  ensureSharedLifeDb(v015);
  if (!v015.sharedLife[worldId]) {
    const nowIso = new Date().toISOString();
    v015.sharedLife[worldId] = {
      journal: [],
      wishlist: [],
      calendar: [],
      album: DEFAULT_ALBUM_CARDS.map((p) => ({
        ...p,
        worldId,
        uploadedBy: 'system',
        createdAt: nowIso,
      })),
      activeWallPhotoId: 'sunset-porch',
    };
  }
  return v015.sharedLife[worldId];
}

export function buildSharedLifeSnapshot(v015, worldId, viewerId, nowMs = Date.now()) {
  const sl = getWorldSharedLife(v015, worldId);
  return {
    worldId,
    // Strictly hide partner's private journal entries server-side
    journal: sl.journal.filter((e) => e.visibility === 'shared' || e.authorId === viewerId),
    wishlist: sl.wishlist,
    calendar: sl.calendar,
    album: sl.album,
    activeWallPhotoId: sl.activeWallPhotoId,
    serverNowMs: nowMs,
  };
}

export async function handleSharedLifeRoute({
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
}) {
  if (req.method === 'GET' && route === '/shared-life') {
    const worldId = reqUrl.searchParams.get('worldId') ?? '';
    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    sendJson(res, 200, { ok: true, data: buildSharedLifeSnapshot(v015, worldId, userId) });
    return true;
  }

  if (req.method === 'POST' && route === '/shared-life/journal') {
    const worldId = String(body.worldId ?? '').trim();
    const title = String(body.title ?? '').trim().slice(0, 80);
    const entryBody = String(body.body ?? '').trim().slice(0, 1200);
    const visibility = body.visibility === 'private' ? 'private' : 'shared';
    if (!worldId || !entryBody) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Nội dung nhật ký không được để trống.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const sl = getWorldSharedLife(v015, worldId);
    const nowIso = new Date().toISOString();
    sl.journal.unshift({
      id: `jrn-${crypto.randomUUID()}`,
      worldId,
      authorId: userId,
      visibility,
      title: title || 'Ghi chú nhỏ',
      body: entryBody,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    saveDb();
    if (visibility === 'shared') broadcastEvent(worldId, 'world_mutated', { reason: 'journal' });
    sendJson(res, 200, { ok: true, data: buildSharedLifeSnapshot(v015, worldId, userId) });
    return true;
  }

  if (req.method === 'POST' && route === '/shared-life/wishlist/add') {
    const worldId = String(body.worldId ?? '').trim();
    const title = String(body.title ?? '').trim().slice(0, 100);
    const category = ['buy', 'visit', 'activity'].includes(body.category) ? body.category : 'activity';
    if (!worldId || !title) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Tên mong muốn chưa hợp lệ.' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const sl = getWorldSharedLife(v015, worldId);
    sl.wishlist.unshift({
      id: `wish-${crypto.randomUUID()}`,
      worldId,
      createdBy: userId,
      category,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    });
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'wishlist' });
    sendJson(res, 200, { ok: true, data: buildSharedLifeSnapshot(v015, worldId, userId) });
    return true;
  }

  if (req.method === 'POST' && route === '/shared-life/wishlist/toggle') {
    const worldId = String(body.worldId ?? '').trim();
    const itemId = String(body.itemId ?? '').trim();
    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const sl = getWorldSharedLife(v015, worldId);
    const row = sl.wishlist.find((w) => w.id === itemId);
    if (!row) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy mục wishlist.' });
      return true;
    }
    row.completed = !row.completed;
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'wishlist' });
    sendJson(res, 200, { ok: true, data: buildSharedLifeSnapshot(v015, worldId, userId) });
    return true;
  }

  if (req.method === 'POST' && route === '/shared-life/calendar/add') {
    const worldId = String(body.worldId ?? '').trim();
    const title = String(body.title ?? '').trim().slice(0, 80);
    const dateIso = String(body.dateIso ?? '').trim();
    const timeHhMm = String(body.timeHhMm ?? '20:00').trim();
    const note = String(body.note ?? '').trim().slice(0, 200);
    if (!worldId || !title || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Ngày hẹn không hợp lệ (YYYY-MM-DD).' });
      return true;
    }
    if (!isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const sl = getWorldSharedLife(v015, worldId);
    sl.calendar.push({
      id: `cal-${crypto.randomUUID()}`,
      worldId,
      createdBy: userId,
      title,
      dateIso,
      timeHhMm,
      note,
      isAnniversary: Boolean(body.isAnniversary),
    });
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'calendar' });
    sendJson(res, 200, { ok: true, data: buildSharedLifeSnapshot(v015, worldId, userId) });
    return true;
  }

  if (req.method === 'POST' && route === '/shared-life/album/select-frame') {
    const worldId = String(body.worldId ?? '').trim();
    const photoId = String(body.photoId ?? '').trim();
    if (!worldId || !isWorldMember(worldId, userId)) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    const sl = getWorldSharedLife(v015, worldId);
    if (!sl.album.some((p) => p.id === photoId)) {
      sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy ảnh kỷ niệm.' });
      return true;
    }
    sl.activeWallPhotoId = photoId;
    saveDb();
    broadcastEvent(worldId, 'world_mutated', { reason: 'album' });
    sendJson(res, 200, { ok: true, data: buildSharedLifeSnapshot(v015, worldId, userId) });
    return true;
  }

  return false;
}
