import { describe, expect, it } from 'vitest';
import { createEmptyDeepFarmState, projectDeepFarmSnapshot } from '../../src/shared/farming/deepFarmState';
import { adoptLivestock } from '../../src/shared/farming/livestock';
import { plantOrchardSapling } from '../../src/shared/farming/orchard';
import { queueWorkshopJob } from '../../src/shared/farming/workshops';
import { resolveDeepFarmActions } from '../../src/shared/interaction/deepFarmContextActions';
import { EMPTY_HELD_ITEM, resolveContextualActions } from '../../src/shared/interaction/interactionResolver';
import type { InteractableTarget } from '../../src/shared/interaction/interactionTypes';
import { itemUsageDetails } from '../../src/shared/inventory/itemUsageDetails';
import { fishingReelMotion } from '../../src/shared/art/fishingReelMotion';

const world = 'world';
const actor = 'may';
const time = 25_000_000;

describe('Owner acceptance context and item names', () => {
  it('shows fruit only when harvestable, even outside the bonus season', () => {
    const basic = createEmptyDeepFarmState(42, time);
    const planted = plantOrchardSapling(basic.orchard, 0, 'sapling_apple', time - 10_000_000, actor);
    if (!planted.ok) throw new Error(planted.messageVi);
    const state = { ...basic, orchard: planted.orchard };
    const snapshot = projectDeepFarmSnapshot(world, state, 200, time);
    const tree: InteractableTarget = {
      id: 'orchard:0', kind: 'deep_farm', labelVi: 'Cây táo', x: 150, y: 110, maxRadiusPx: 25,
      deepFarmTarget: { kind: 'tree', slotIndex: 0 },
    };
    expect(snapshot.calendar.season).toBe('spring');
    const deepFarmActions = (anchor: InteractableTarget, now: number) => resolveDeepFarmActions(anchor, snapshot, new Set(), actor, now);
    const input = { facing: 'up' as const, heldItem: EMPTY_HELD_ITEM, interactables: [tree], deepFarmActions };
    expect(resolveContextualActions({ ...input, serverNowMs: time, playerX: 150, playerY: 125 }).primary)
      .toMatchObject({ labelVi: 'Hái quả', deepFarmIntent: { kind: 'harvest_tree', slotIndex: 0 } });
    expect(resolveContextualActions({ ...input, serverNowMs: time - 9_000_000, playerX: 150, playerY: 125 }).primary).toBeNull();
    expect(resolveContextualActions({ ...input, serverNowMs: time, playerX: 150, playerY: 145 }).primary).toBeNull();
  });

  it('gates feeding, repeat petting, product collection, and station actions by current state', () => {
    const basic = createEmptyDeepFarmState(42, time);
    const adopted = adoptLivestock(basic.livestock, 'chicken', null, time, actor);
    if (!adopted.ok) throw new Error(adopted.messageVi);
    const animal = adopted.state.animals[0]!;
    const queued = queueWorkshopJob(basic.workshops, 'mill', 'flour', time, actor);
    if (!queued.ok) throw new Error(queued.messageVi);
    const state = { ...basic, livestock: adopted.state, workshops: queued.state };
    const target: InteractableTarget = {
      id: 'animal', kind: 'deep_farm', labelVi: 'Gà', x: 0, y: 0, maxRadiusPx: 20,
      deepFarmTarget: { kind: 'animal', animalId: animal.animalId },
    };
    const station: InteractableTarget = {
      ...target, id: 'mill', deepFarmTarget: { kind: 'workshop', workshopId: 'mill' },
    };
    const snapshot = projectDeepFarmSnapshot(world, state, 200, time);
    const hungry = resolveDeepFarmActions(target, snapshot, new Set(), actor, time);
    expect(hungry.filter((action) => action.available).map((action) => action.labelVi)).toEqual(['Vuốt ve']);
    expect(hungry[1]).toMatchObject({ available: false, reasonVi: expect.stringContaining('Túi chung') });
    expect(resolveDeepFarmActions(target, snapshot, new Set(['feed_chicken', 'feed_deluxe']), actor, time)[1])
      .toMatchObject({ labelVi: 'Cho ăn', deepFarmIntent: { feedSku: 'feed_chicken' } });
    const fed = {
      ...state, livestock: { ...state.livestock, animals: [{
        ...animal, petCalendarDay: snapshot.calendar.totalDay, petByActors: [actor], fedAtMs: time, readyAtMs: time + 10,
      }] },
    };
    const later = projectDeepFarmSnapshot(world, fed, 200, time + 15);
    const producing = resolveDeepFarmActions(target, later, new Set(['feed_chicken']), actor, time + 5);
    expect(producing.every((action) => !action.available && action.reasonVi)).toBe(true);
    expect(resolveDeepFarmActions(target, later, new Set(['feed_chicken']), actor, time + 15)
      .filter((action) => action.available).map((action) => action.labelVi)).toEqual(['Thu hoạch']);
    const resolved = resolveContextualActions({
      facing: 'up', heldItem: EMPTY_HELD_ITEM, interactables: [target], playerX: 0, playerY: 10,
      serverNowMs: time + 5,
      deepFarmActions: (anchor, now) => resolveDeepFarmActions(anchor, later, new Set(['feed_chicken']), actor, now),
    });
    expect(resolved.primary).toBeNull();
    expect(resolved.livestock).toEqual({ labelVi: 'Gà', detailsVi: [
      'Vuốt ve · Bạn đã vuốt ve hôm nay.', 'Cho ăn · Đã cho ăn, đang tạo sản phẩm.',
      'Thu hoạch · Sản phẩm chưa sẵn sàng.',
    ] });
    expect(resolveDeepFarmActions(station, snapshot, new Set(), actor, time).map((a) => a.code)).toEqual(['open_donor_workshop']);
    expect(resolveDeepFarmActions(station, snapshot, new Set(), actor, queued.job.endMs)[0])
      .toMatchObject({ labelVi: 'Nhận thành phẩm', deepFarmIntent: { kind: 'collect_workshop', workshopId: 'mill' } });
  });

  it('uses the visible animal nearest the player and keeps field petting local', () => {
    const ambient: InteractableTarget = {
      id: 'field-livestock:farm_sheep_0', kind: 'ambient_livestock', labelVi: 'Cừu',
      x: 130, y: 100, maxRadiusPx: 24,
    };
    const owned: InteractableTarget = {
      id: 'livestock:ls_sheep_5', kind: 'deep_farm', labelVi: 'Cừu · Mây Bông',
      x: 145, y: 100, maxRadiusPx: 24, deepFarmTarget: { kind: 'animal', animalId: 'ls_sheep_5' },
    };
    const input = { facing: 'right' as const, heldItem: EMPTY_HELD_ITEM, interactables: [owned, ambient], playerY: 105 };
    const field = resolveContextualActions({ ...input, playerX: 130 });
    expect(field.primary).toEqual({
      code: 'pet_ambient_livestock', targetId: ambient.id, labelVi: 'Vuốt ve', keyHint: 'J', available: true,
    });
    expect(field.secondary).toBeNull();
    expect(resolveContextualActions({ ...input, playerX: 145 }).livestock?.labelVi).toBe(owned.labelVi);
    expect(resolveContextualActions({ ...input, playerX: 185 }).targetId).toBeNull();
  });

  it('showcases known item use and distinguishes the pulling phase without changing progression', () => {
    expect(itemUsageDetails('feed_chicken')).toMatchObject({ usageVi: expect.stringContaining('Cho vật nuôi') });
    expect(itemUsageDetails('tool_hoe')).toMatchObject({ usageVi: expect.stringContaining('Cuốc') });
    expect(itemUsageDetails('sakura_bouquet')).toMatchObject({ nameVi: expect.stringContaining('hoa') });
    expect(fishingReelMotion(0.9, 900).lineShorten).toBeGreaterThan(fishingReelMotion(0.2, 900).lineShorten);
    expect(fishingReelMotion(0.5, 900, true).bend).toBeGreaterThan(fishingReelMotion(0.5, 900, false).bend);
  });
});
