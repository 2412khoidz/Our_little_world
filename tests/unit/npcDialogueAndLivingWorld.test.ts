import { describe, expect, it } from 'vitest';
import {
  NPC_PROFILES,
  NPC_DIALOGUE_POOLS,
  type NpcDialogueContext,
  getNpcRelationship,
  recordNpcConversation,
  resolveNpcProfile,
  selectHadesDialogueLine,
  setNpcErrandStatus,
} from '../../src/shared/npc/npcDialogueRegistry';
import {
  createChickenActorState,
  createCrabActorState,
  createDuckActorState,
  createNpcRoutineState,
  createSheepActorState,
  createSnailActorState,
  isExemptFromCleanupTimeout,
  stepEmergentChicken,
  stepEmergentCrab,
  stepEmergentDuck,
  stepEmergentSheep,
  stepEmergentSnail,
  stepNpcRoutine,
} from '../../src/shared/world/emergentWorldBehavior';
import farmMapData from '../../src/assets/maps/farm.json';
import { farmPlotIndexForTile } from '../../src/shared/farming/farmPlotIndex';

describe('Checkpoint D1 & D2: ADV NPC dialogue & observable living animals/NPCs', () => {
  it('provides data-driven ADV profiles and branches for all 5 village/farm/beach NPCs and fallback IDs', () => {
    const baseCtx = {
      mapId: 'village' as const,
      isNight: false,
      weatherKind: 'sunny',
      walletCoins: 120,
      hasPet: true,
      petName: 'Quýt',
      playerNickname: 'Mây',
      affinity: 2,
      errandStatus: 'none' as const,
    };

    const ids = ['bac_hai', 'co_lan', 'chu_tu', 'be_na', 'ong_minh'] as const;
    for (const id of ids) {
      const prof = resolveNpcProfile(id);
      expect(prof.id).toBe(id);
      const entry = prof.nodes[prof.entryNodeId];
      expect(entry).toBeDefined();
      const text = entry!.textVi(baseCtx);
      expect(text.length).toBeGreaterThan(15);
      const choices = entry!.choices?.(baseCtx) ?? [];
      expect(choices.length).toBeGreaterThanOrEqual(3);
    }

    expect(NPC_PROFILES.bac_hai.nodes.root?.choices?.(baseCtx).some((c) => c.action === 'open_seed_shop')).toBe(true);
    expect(NPC_PROFILES.bac_hai.nodes.root?.choices?.(baseCtx).some((c) => c.action === 'open_shipping')).toBe(true);
    expect(NPC_PROFILES.co_lan.nodes.root?.choices?.(baseCtx).some((c) => c.action === 'open_workshop')).toBe(true);
    expect(NPC_PROFILES.chu_tu.nodes.root?.choices?.(baseCtx).some((c) => c.action === 'open_tool_shop')).toBe(true);
    expect(NPC_PROFILES.ong_minh.nodes.root?.choices?.(baseCtx).some((c) => c.action === 'open_fishing_sea')).toBe(true);

    const fallback = resolveNpcProfile('unknown_villager', {
      labelVi: 'Bà Năm',
      role: 'farmer',
      dialogueVi: 'Chào buổi sáng hai cháu!',
    });
    expect(fallback.nameVi).toBe('Bà Năm');
    expect(fallback.nodes[fallback.entryNodeId]?.textVi(baseCtx)).toContain('Chào buổi sáng');

    // Local affinity and errand transitions
    let rel = recordNpcConversation({}, 'bac_hai', 100_000);
    expect(getNpcRelationship(rel, 'bac_hai').affinity).toBe(2);
    rel = setNpcErrandStatus(rel, 'bac_hai', 'active', 0);
    expect(getNpcRelationship(rel, 'bac_hai').errandStatus).toBe('active');
    rel = setNpcErrandStatus(rel, 'bac_hai', 'done', 2);
    expect(getNpcRelationship(rel, 'bac_hai').errandStatus).toBe('done');
    expect(getNpcRelationship(rel, 'bac_hai').affinity).toBe(4);
  });

  it('drives living chickens with visible seed attraction, sprinting hop reaction, collision & night roost', () => {
    const ch = createChickenActorState('farm_ch', 160, 160, 0);
    const startX = ch.x;
    stepEmergentChicken(ch, {
      nowMs: 1000,
      dtSec: 0.1,
      tilePx: 16,
      playerX: 210,
      playerY: 160,
      playerRunning: false,
      toolSwinging: false,
      heldItemSku: 'seed_wheat',
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(ch.activity).toBe('curious_seed');
    expect(ch.x).toBeGreaterThan(startX);
    expect(ch.facing).toBe('right');
    expect(ch.bubbleText).toBe('♥');

    const beforeFleeX = ch.x;
    stepEmergentChicken(ch, {
      nowMs: 1200,
      dtSec: 0.1,
      tilePx: 16,
      playerX: ch.x + 15,
      playerY: ch.y,
      playerRunning: true,
      toolSwinging: false,
      heldItemSku: null,
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(ch.activity).toBe('startled_hop');
    expect(ch.x).toBeLessThan(beforeFleeX);
    expect(ch.hopOffsetY).toBeLessThan(0);
    expect(ch.animRateScale).toBeGreaterThan(1.5);

    stepEmergentChicken(ch, {
      nowMs: 5000,
      dtSec: 0.1,
      tilePx: 16,
      playerX: 300,
      playerY: 300,
      playerRunning: false,
      toolSwinging: false,
      heldItemSku: null,
      isNight: true,
      weatherKind: 'sunny',
    });
    expect(ch.activity).toBe('roosting_sleep');
    expect(ch.vx).toBe(0);
  });

  it('keeps pond ducks swimming inside water bounds, sheep grazing, and crabs scuttling on sand', () => {
    const bounds = { minX: 146, maxX: 174, minY: 154, maxY: 174 };
    const duck = createDuckActorState('pond_duck', 160, 164, bounds, 0.5);
    expect(isExemptFromCleanupTimeout('floating_rest')).toBe(true);
    for (let t = 1000; t <= 8000; t += 200) {
      stepEmergentDuck(duck, {
        nowMs: t,
        dtSec: 0.1,
        playerX: 50,
        playerY: 50,
        playerRunning: false,
        isNight: false,
      });
      expect(duck.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(duck.x).toBeLessThanOrEqual(bounds.maxX);
      expect(duck.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(duck.y).toBeLessThanOrEqual(bounds.maxY);
    }

    const sheep = createSheepActorState('sheep_0', 300, 300, 0);
    stepEmergentSheep(sheep, {
      nowMs: 1200,
      dtSec: 0.1,
      tilePx: 16,
      playerX: 332,
      playerY: 300,
      playerRunning: false,
      toolSwinging: false,
      heldItemSku: null,
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(sheep.activity).toBe('curious_player');
    expect(sheep.facing).toBe('right');
    expect(sheep.bubbleText).toBe('baa~');

    // Crab stays on sand tiles (x < 28*16 blocked water) and flees approaching player
    const isBlockedWater = (tx: number) => tx >= 27;
    const crab = createCrabActorState('crab_0', 26 * 16, 15 * 16, 'y', 24, 0);
    stepEmergentCrab(crab, {
      nowMs: 1400,
      dtSec: 0.1,
      tilePx: 16,
      playerX: 25 * 16,
      playerY: 15 * 16,
      playerRunning: false,
      toolSwinging: false,
      heldItemSku: null,
      isNight: false,
      weatherKind: 'sunny',
      isTileBlocked: isBlockedWater,
    });
    expect(crab.activity).toBe('fleeing_player');
    expect(Math.floor(crab.x / 16)).toBeLessThan(27);
  });

  it('moves NPC routines between walkable waypoints and stops facing approaching players', () => {
    const routine = createNpcRoutineState(160, 160, [
      { x: 160, y: 160 },
      { x: 192, y: 160 },
    ]);
    // Pause finishes at index 0 -> moves toward waypoint 1
    routine.waypointIndex = 1;
    stepNpcRoutine(routine, {
      nowMs: 4000,
      dtSec: 0.1,
      tilePx: 16,
      playerX: 500,
      playerY: 500,
      playerPosture: 'none',
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(routine.moving).toBe(true);
    expect(routine.x).toBeGreaterThan(160);
    expect(routine.facing).toBe('right');

    // Player walks close -> stops and faces player directly
    stepNpcRoutine(routine, {
      nowMs: 4200,
      dtSec: 0.1,
      tilePx: 16,
      playerX: routine.x,
      playerY: routine.y - 24,
      playerPosture: 'none',
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(routine.moving).toBe(false);
    expect(routine.activity).toBe('interacting');
    expect(routine.facing).toBe('up');
    expect(routine.bubbleText).toBe('👋');
  });

  it('ships >= 12 Hades lines for all 6 NPCs, couples/solo priority, and unseen-first non-repeating rotation', () => {
    const testCtx: NpcDialogueContext = {
      mapId: 'village',
      isNight: false,
      weatherKind: 'sunny',
      walletCoins: 50,
      hasPet: true,
      petName: 'Quýt',
      playerNickname: 'Mây',
      affinity: 1,
      errandStatus: 'none',
    };
    const expectedIds = ['bac_hai', 'co_lan', 'chu_tu', 'be_na', 'ong_minh', 'thi_truong'] as const;
    for (const id of expectedIds) {
      expect(NPC_PROFILES[id]).toBeTruthy();
      expect(NPC_DIALOGUE_POOLS[id].length).toBeGreaterThanOrEqual(12);

      const soloFirst = selectHadesDialogueLine(id, { ...testCtx, partnerInSameRoom: false, talkCount: 0 });
      const coupleFirst = selectHadesDialogueLine(id, { ...testCtx, partnerInSameRoom: true, talkCount: 0 });
      expect(soloFirst).not.toBeNull();
      expect(coupleFirst).not.toBeNull();
      expect(soloFirst?.category).toBe('solo');
      expect(coupleFirst?.category).toBe('couple');
      expect(coupleFirst?.textVi({ ...testCtx, partnerInSameRoom: true })).not.toBe(
        soloFirst?.textVi({ ...testCtx, partnerInSameRoom: false }),
      );
    }

    let relMap = {};
    const seenIds: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const rel = getNpcRelationship(relMap, 'thi_truong');
      const pick = selectHadesDialogueLine('thi_truong', {
        ...testCtx,
        mapId: 'shop_town_hall',
        partnerInSameRoom: i % 2 === 0,
        seenLineIds: rel.seenLineIds,
        talkCount: rel.talkCount,
      });
      expect(pick).not.toBeNull();
      expect(seenIds).not.toContain(pick!.id);
      seenIds.push(pick!.id);
      relMap = recordNpcConversation(relMap, 'thi_truong', 1_000_000 + i * 70_000, pick!.id);
    }
    expect(new Set(seenIds).size).toBe(6);
  });

  it('keeps farm pond ducks strictly over real water tiles, keeps sheep off tilled soil, and animates sheep/snails cleanly', () => {
    const layers = farmMapData.layers as { name: string; data?: number[] }[];
    const width = farmMapData.width;
    const waterData = layers.find((l) => l.name === 'water')?.data ?? [];
    const soilData = layers.find((l) => l.name === 'soil')?.data ?? [];

    const duckPondTiles: readonly [number, number][] = [
      [32, 6],
      [33, 6],
      [51, 9],
      [52, 9],
    ];
    for (const [tx, ty] of duckPondTiles) {
      expect(waterData[ty * width + tx]).toBeGreaterThan(0);
    }

    const sheepPastureTiles: readonly [number, number][] = [
      [37, 6],
      [42, 7],
      [46, 14],
      [55, 16],
    ];
    for (const [tx, ty] of sheepPastureTiles) {
      expect(farmPlotIndexForTile(tx, ty)).toBeNull();
      expect(soilData[ty * width + tx]).toBe(0);
    }

    const sheep = createSheepActorState('farm_sheep_test', 37 * 16, 6 * 16, 0);
    stepEmergentSheep(sheep, {
      nowMs: 2_000,
      dtSec: 0.016,
      tilePx: 16,
      playerX: 37 * 16 - 40,
      playerY: 6 * 16,
      playerRunning: false,
      toolSwinging: true,
      heldItemSku: 'item_hoe',
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(sheep.activity).toBe('fleeing_player');
    expect(sheep.bubbleText).toBe('baa!');

    const curiousSheep = createSheepActorState('farm_sheep_curious', 37 * 16, 6 * 16, 0);
    stepEmergentSheep(curiousSheep, {
      nowMs: 1_000,
      dtSec: 0.016,
      tilePx: 16,
      playerX: 37 * 16 - 32,
      playerY: 6 * 16,
      playerRunning: false,
      toolSwinging: false,
      heldItemSku: null,
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(curiousSheep.activity).toBe('curious_player');
    stepEmergentSheep(curiousSheep, {
      nowMs: 3_500,
      dtSec: 0.016,
      tilePx: 16,
      playerX: 37 * 16 - 32,
      playerY: 6 * 16,
      playerRunning: false,
      toolSwinging: false,
      heldItemSku: null,
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(curiousSheep.activity).not.toBe('curious_player');

    const snail = createSnailActorState('garden_snail_test', 92, 134, 'x', 16, 0.2);
    stepEmergentSnail(snail, {
      nowMs: 4_000,
      dtSec: 0.05,
      tilePx: 16,
      playerX: 300,
      playerY: 300,
      playerRunning: false,
      toolSwinging: false,
      heldItemSku: null,
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(snail.activity).toBe('crawling');
    stepEmergentSnail(snail, {
      nowMs: 4_200,
      dtSec: 0.016,
      tilePx: 16,
      playerX: 102,
      playerY: 134,
      playerRunning: true,
      toolSwinging: false,
      heldItemSku: null,
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(snail.activity).toBe('resting');
  });
});
