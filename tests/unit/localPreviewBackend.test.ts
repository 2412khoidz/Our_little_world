import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalPreviewBackend } from '../../src/lib/backend/localPreviewBackend';
import { DEFAULT_AVATAR_PARTNER_A, DEFAULT_AVATAR_PARTNER_B } from '../../src/shared/avatar';

describe('LocalPreviewBackend (2-member cap, outsider rejection, atomic furniture, idempotency)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('pairs two members via one-time invite and strictly rejects a 3rd user', async () => {
    const clientA = createLocalPreviewBackend('sess-a');
    const clientB = createLocalPreviewBackend('sess-b');
    const clientC = createLocalPreviewBackend('sess-c');

    await clientA.signInLocalPreset!('partner-a');
    const created = await clientA.createWorld('Nhà Của An & Bình', 'An', DEFAULT_AVATAR_PARTNER_A);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const inviteRes = await clientA.createInvite(created.data.world.id);
    expect(inviteRes.ok).toBe(true);
    if (!inviteRes.ok) return;

    // Partner B redeems invite
    await clientB.signInLocalPreset!('partner-b');
    const joined = await clientB.redeemInvite(
      inviteRes.data.inviteCode,
      'Bình',
      DEFAULT_AVATAR_PARTNER_B,
    );
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(joined.data.members).toHaveLength(2);

    // Outsider trying same invite code is rejected
    await clientC.signInLocalPreset!('outsider');
    const intruder = await clientC.redeemInvite(
      inviteRes.data.inviteCode,
      'Khách lạ',
      DEFAULT_AVATAR_PARTNER_A,
    );
    expect(intruder.ok).toBe(false);
    if (!intruder.ok) {
      expect(['INVITE_USED', 'WORLD_FULL']).toContain(intruder.code);
    }

    // Outsider trying to request world snapshot gets null (no access to couple's world)
    const outsiderSnap = await clientC.getWorldSnapshot();
    expect(outsiderSnap).toEqual({ ok: true, data: null });

    // Owner trying to create another invite after world has 2 members gets WORLD_FULL
    const secondInvite = await clientA.createInvite(created.data.world.id);
    expect(secondInvite.ok).toBe(false);
    if (!secondInvite.ok) expect(secondInvite.code).toBe('WORLD_FULL');
  });

  it('enforces atomic occupancy, layoutVersion conflict, and idempotency on furniture edits', async () => {
    const clientA = createLocalPreviewBackend('sess-a');
    const clientB = createLocalPreviewBackend('sess-b');

    await clientA.signInLocalPreset!('partner-a');
    const worldRes = await clientA.createWorld('Nhà Nhỏ', 'An', DEFAULT_AVATAR_PARTNER_A);
    expect(worldRes.ok).toBe(true);
    if (!worldRes.ok) return;
    const worldId = worldRes.data.world.id;
    const inviteRes = await clientA.createInvite(worldId);
    expect(inviteRes.ok).toBe(true);
    if (!inviteRes.ok) return;

    await clientB.signInLocalPreset!('partner-b');
    await clientB.redeemInvite(inviteRes.data.inviteCode, 'Bình', DEFAULT_AVATAR_PARTNER_B);

    // Client A places spare floor lamp at (8, 5)
    const placeA = await clientA.placeFurniture({
      worldId,
      mapId: 'home',
      sku: 'lamp_floor',
      tileX: 8,
      tileY: 5,
      expectedLayoutVersion: 1,
      idempotencyKey: 'idem-place-1',
    });
    expect(placeA.ok).toBe(true);
    if (!placeA.ok) return;
    expect(placeA.data.layoutVersion).toBe(2);

    // Retrying with same idempotencyKey returns cached result cleanly
    const retryA = await clientA.placeFurniture({
      worldId,
      mapId: 'home',
      sku: 'lamp_floor',
      tileX: 8,
      tileY: 5,
      expectedLayoutVersion: 1,
      idempotencyKey: 'idem-place-1',
    });
    expect(retryA).toEqual(placeA);

    // Client B still has stale layoutVersion 1 and tries placing on (8, 5) -> VERSION_CONFLICT
    const staleB = await clientB.placeFurniture({
      worldId,
      mapId: 'home',
      sku: 'plant_monstera',
      tileX: 8,
      tileY: 5,
      expectedLayoutVersion: 1,
      idempotencyKey: 'idem-place-2',
    });
    expect(staleB.ok).toBe(false);
    if (!staleB.ok) expect(staleB.code).toBe('VERSION_CONFLICT');

    // Client B refetches snapshot (version 2) and still tries occupied tile (8, 5) -> TILE_OCCUPIED
    const occupiedB = await clientB.placeFurniture({
      worldId,
      mapId: 'home',
      sku: 'plant_monstera',
      tileX: 8,
      tileY: 5,
      expectedLayoutVersion: 2,
      idempotencyKey: 'idem-place-3',
    });
    expect(occupiedB.ok).toBe(false);
    if (!occupiedB.ok) expect(occupiedB.code).toBe('TILE_OCCUPIED');

    // Client B moves A's lamp to free tile (9, 5), then reloads snapshot
    const movedB = await clientB.moveFurniture({
      worldId,
      placementId: placeA.data.placement.id,
      tileX: 9,
      tileY: 5,
      expectedLayoutVersion: 2,
      idempotencyKey: 'idem-move-1',
    });
    expect(movedB.ok).toBe(true);
    if (!movedB.ok) return;
    expect(movedB.data.placement.tileX).toBe(9);

    const reloaded = await clientA.getWorldSnapshot();
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok || !reloaded.data) return;
    const found = reloaded.data.placements.find((p) => p.id === placeA.data.placement.id);
    expect(found?.tileX).toBe(9);
  });
});
