import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import {
  resetAmbientFallbackWarningForTest,
  resolveAmbientChickenAnimName,
  resolveAmbientDuckAnimName,
  resolveAmbientSheepAnimName,
  spawnAmbientDonorAnimal,
  syncAmbientChickenVisual,
  syncAmbientDuckVisual,
  syncAmbientSheepVisual,
} from '../../src/game/farming/ambientAnimalVisualAdapter';
import { FARMING_LIVESTOCK_ATLAS_KEY, livestockAnimKey } from '../../src/shared/art/farmingSpriteAtlas';
import {
  createChickenActorState,
  createDuckActorState,
  createSheepActorState,
} from '../../src/shared/world/emergentWorldBehavior';

const LEGACY_WORLD_PROPS_KEY = 'world-props-atlas';

function makeMockScene(opts: { hasDonorAtlas: boolean; hasLegacyProps?: boolean }) {
  const dataset: Record<string, string> = {};
  const sprites: Array<Record<string, unknown>> = [];

  const scene = {
    game: { canvas: { dataset } },
    textures: {
      exists: vi.fn((key: string) => {
        if (key === FARMING_LIVESTOCK_ATLAS_KEY) return opts.hasDonorAtlas;
        if (key === LEGACY_WORLD_PROPS_KEY) return opts.hasLegacyProps ?? true;
        return false;
      }),
    },
    anims: {
      exists: vi.fn((key: string) => {
        if (key.startsWith('olw-livestock-')) return opts.hasDonorAtlas;
        if (key === 'olw-chicken' || key === 'olw-duck' || key === 'olw-sheep') {
          return opts.hasLegacyProps ?? true;
        }
        return false;
      }),
    },
    add: {
      sprite: vi.fn((x: number, y: number, textureKey: string, frame: string) => {
        const obj: Record<string, unknown> = {
          x,
          y,
          textureKey,
          frame,
          flipX: false,
          scale: 1,
          alpha: 1,
          depth: 0,
          played: [] as string[],
          anims: { timeScale: 1 },
          setOrigin: vi.fn(() => obj),
          setScale: vi.fn((s: number) => {
            obj.scale = s;
            return obj;
          }),
          setFlipX: vi.fn((v: boolean) => {
            obj.flipX = v;
            return obj;
          }),
          setDepth: vi.fn((d: number) => {
            obj.depth = d;
            return obj;
          }),
          setPosition: vi.fn((nx: number, ny: number) => {
            obj.x = nx;
            obj.y = ny;
            return obj;
          }),
          setAlpha: vi.fn((a: number) => {
            obj.alpha = a;
            return obj;
          }),
          play: vi.fn((animKey: string) => {
            (obj.played as string[]).push(animKey);
            return obj;
          }),
        };
        sprites.push(obj);
        return obj;
      }),
    },
  };

  return { scene: scene as unknown as Phaser.Scene, dataset, sprites };
}

function makeMockShadow() {
  const shadow = {
    x: 0,
    y: 0,
    setPosition: vi.fn((nx: number, ny: number) => {
      shadow.x = nx;
      shadow.y = ny;
      return shadow;
    }),
  };
  return shadow as unknown as Phaser.GameObjects.Image;
}

describe('ambientAnimalVisualAdapter (M3c.2 Ambient Animal Transplant)', () => {
  it('maps emergent chicken, duck, and sheep activities to directional FarmRanchLife animations', () => {
    expect(
      resolveAmbientChickenAnimName({ activity: 'wandering', facing: 'left', vx: -12, vy: 0 }),
    ).toBe('walk_left');
    expect(
      resolveAmbientChickenAnimName({ activity: 'wandering', facing: 'right', vx: 0, vy: -14 }),
    ).toBe('walk_up');
    expect(
      resolveAmbientChickenAnimName({ activity: 'pecking', facing: 'left', vx: 0, vy: 0 }),
    ).toBe('eat_left');
    expect(
      resolveAmbientChickenAnimName({ activity: 'roosting_sleep', facing: 'right', vx: 0, vy: 0 }),
    ).toBe('sleep_right');

    expect(resolveAmbientDuckAnimName({ activity: 'swimming', facing: 'left' })).toBe('swim_left');
    expect(resolveAmbientDuckAnimName({ activity: 'swimming', facing: 'right' })).toBe('swim_right');
    expect(resolveAmbientDuckAnimName({ activity: 'sleeping', facing: 'left' })).toBe('swim_sleep_left');

    expect(
      resolveAmbientSheepAnimName({ activity: 'grazing', facing: 'right', vx: 0, vy: 0 }),
    ).toBe('eat_right');
    expect(
      resolveAmbientSheepAnimName({ activity: 'resting', facing: 'left', vx: 0, vy: 0 }),
    ).toBe('sleep_left');
    expect(
      resolveAmbientSheepAnimName({ activity: 'curious_player', facing: 'right', vx: 0, vy: 12 }),
    ).toBe('walk_down');
  });

  it('spawns donor sprites with directional animations and no flipX double-mirroring', () => {
    const { scene, dataset } = makeMockScene({ hasDonorAtlas: true });

    const duckSpawn = spawnAmbientDonorAnimal(scene, {
      kind: 'duck',
      x: 120,
      y: 80,
      depth: 80,
      facing: 'left',
      waterMode: true,
      legacyFrame: 'duck:0',
      legacyAnimKey: 'olw-duck',
    });
    expect(duckSpawn).not.toBeNull();
    expect(duckSpawn!.usesDonorAtlas).toBe(true);
    expect(duckSpawn!.currentAnimKey).toBe(livestockAnimKey('duck', 'swim_left'));
    expect(dataset.ambientAnimalAtlasMode).toBe('donor:FarmRanchLife');

    const duckState = createDuckActorState('d1', 120, 80, { minX: 100, maxX: 150, minY: 70, maxY: 90 });
    duckState.facing = 'right';
    duckState.activity = 'sleeping';
    const duckHandle = {
      sprite: duckSpawn!.sprite,
      state: duckState,
      usesDonorAtlas: duckSpawn!.usesDonorAtlas,
      currentAnimKey: duckSpawn!.currentAnimKey,
    };
    syncAmbientDuckVisual(scene, duckHandle);
    expect(duckHandle.currentAnimKey).toBe(livestockAnimKey('duck', 'swim_sleep_right'));
    expect((duckSpawn!.sprite as unknown as { flipX: boolean }).flipX).toBe(false);

    const chSpawn = spawnAmbientDonorAnimal(scene, {
      kind: 'chicken',
      x: 160,
      y: 120,
      depth: 120,
      facing: 'right',
      legacyFrame: 'chicken:0',
      legacyAnimKey: 'olw-chicken',
    });
    const chState = createChickenActorState('c1', 160, 120);
    chState.facing = 'left';
    chState.activity = 'pecking';
    chState.vx = 0;
    chState.vy = 0;
    const chHandle = {
      sprite: chSpawn!.sprite,
      shadow: makeMockShadow(),
      state: chState,
      usesDonorAtlas: chSpawn!.usesDonorAtlas,
      currentAnimKey: chSpawn!.currentAnimKey,
    };
    syncAmbientChickenVisual(scene, chHandle);
    expect(chHandle.currentAnimKey).toBe(livestockAnimKey('chicken', 'eat_left'));
    expect((chSpawn!.sprite as unknown as { flipX: boolean }).flipX).toBe(false);

    const spSpawn = spawnAmbientDonorAnimal(scene, {
      kind: 'sheep',
      x: 200,
      y: 140,
      depth: 140,
      facing: 'left',
      legacyFrame: 'sheep:0',
      legacyAnimKey: 'olw-sheep',
    });
    const spState = createSheepActorState('s1', 200, 140);
    spState.facing = 'left';
    spState.activity = 'grazing';
    const spHandle = {
      sprite: spSpawn!.sprite,
      shadow: makeMockShadow(),
      state: spState,
      usesDonorAtlas: spSpawn!.usesDonorAtlas,
      currentAnimKey: spSpawn!.currentAnimKey,
    };
    syncAmbientSheepVisual(scene, spHandle);
    expect(spHandle.currentAnimKey).toBe(livestockAnimKey('sheep', 'eat_left'));
    expect((spSpawn!.sprite as unknown as { flipX: boolean }).flipX).toBe(false);
  });

  it('warns once in DEV and preserves legacy flipX if the donor atlas is missing', () => {
    resetAmbientFallbackWarningForTest();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { scene, dataset } = makeMockScene({ hasDonorAtlas: false, hasLegacyProps: true });

    const first = spawnAmbientDonorAnimal(scene, {
      kind: 'chicken',
      x: 40,
      y: 40,
      depth: 40,
      legacyFrame: 'chicken:0',
      legacyAnimKey: 'olw-chicken',
    });
    const second = spawnAmbientDonorAnimal(scene, {
      kind: 'sheep',
      x: 60,
      y: 60,
      depth: 60,
      legacyFrame: 'sheep:0',
      legacyAnimKey: 'olw-sheep',
    });

    expect(first?.usesDonorAtlas).toBe(false);
    expect(second?.usesDonorAtlas).toBe(false);
    expect(dataset.ambientAnimalAtlasMode).toBe('fallback:world-props');
    expect(warnSpy).toHaveBeenCalledTimes(1);

    const state = createChickenActorState('c_legacy', 40, 40);
    state.facing = 'left';
    syncAmbientChickenVisual(scene, {
      sprite: first!.sprite,
      shadow: makeMockShadow(),
      state,
      usesDonorAtlas: first!.usesDonorAtlas,
      currentAnimKey: first!.currentAnimKey,
    });
    expect((first!.sprite as unknown as { flipX: boolean }).flipX).toBe(true);
    warnSpy.mockRestore();
  });
});
