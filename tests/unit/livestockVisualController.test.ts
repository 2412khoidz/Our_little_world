import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { LivestockVisualController } from '../../src/game/farming/LivestockVisualController';
import { FARMING_LIVESTOCK_ATLAS_KEY, livestockAnimKey } from '../../src/shared/art/farmingSpriteAtlas';
import { LIVESTOCK_SPECIES_LIST, type ProjectedLivestockAnimal } from '../../src/shared/farming/livestock';

type MockGameObj = {
  kind: string;
  x: number;
  y: number;
  originX?: number;
  originY?: number;
  depth?: number;
  scale?: number;
  textureKey?: string;
  frameName?: string | number;
  playedAnims: string[];
  destroyed: boolean;
  setOrigin: (ox: number, oy?: number) => MockGameObj;
  setDepth: (d: number) => MockGameObj;
  setScale: (s: number) => MockGameObj;
  setPosition: (x: number, y: number) => MockGameObj;
  setFrame: (f: string | number) => MockGameObj;
  setTexture: (k: string) => MockGameObj;
  play: (anim: string) => MockGameObj;
  destroy: () => void;
};

function makeObj(kind: string, x: number, y: number, extra: Partial<MockGameObj> = {}): MockGameObj {
  const obj: MockGameObj = {
    kind,
    x,
    y,
    playedAnims: [],
    destroyed: false,
    setOrigin(ox, oy = ox) {
      obj.originX = ox;
      obj.originY = oy;
      return obj;
    },
    setDepth(d) {
      obj.depth = d;
      return obj;
    },
    setScale(s) {
      obj.scale = s;
      return obj;
    },
    setPosition(nx, ny) {
      obj.x = nx;
      obj.y = ny;
      return obj;
    },
    setFrame(f) {
      obj.frameName = f;
      return obj;
    },
    setTexture(k) {
      obj.textureKey = k;
      return obj;
    },
    play(anim) {
      obj.playedAnims.push(anim);
      return obj;
    },
    destroy() {
      obj.destroyed = true;
    },
    ...extra,
  };
  return obj;
}

function createMockScene(options: { hasAtlas: boolean }) {
  const createdObjects: MockGameObj[] = [];
  const canvasTextures: string[] = [];
  const dataset: Record<string, string> = {};
  const existingKeys = new Set<string>(options.hasAtlas ? [FARMING_LIVESTOCK_ATLAS_KEY] : []);

  const scene = {
    game: {
      canvas: { dataset },
    },
    textures: {
      exists: vi.fn((key: string) => existingKeys.has(key)),
      createCanvas: vi.fn((key: string) => {
        existingKeys.add(key);
        canvasTextures.push(key);
        const ctx = {
          clearRect: vi.fn(),
          fillRect: vi.fn(),
          beginPath: vi.fn(),
          ellipse: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          stroke: vi.fn(),
          strokeRect: vi.fn(),
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
        };
        return { getContext: () => ctx, refresh: vi.fn() };
      }),
    },
    anims: {
      exists: vi.fn((key: string) => options.hasAtlas && key.startsWith('olw-livestock-')),
    },
    add: {
      sprite: vi.fn((x: number, y: number, key: string, frame: string | number) => {
        const obj = makeObj('sprite', x, y, { textureKey: key, frameName: frame });
        createdObjects.push(obj);
        return obj;
      }),
      image: vi.fn((x: number, y: number, key: string) => {
        const obj = makeObj('image', x, y, { textureKey: key });
        createdObjects.push(obj);
        return obj;
      }),
      ellipse: vi.fn((x: number, y: number) => {
        const obj = makeObj('ellipse', x, y);
        createdObjects.push(obj);
        return obj;
      }),
      text: vi.fn((x: number, y: number) => {
        const obj = makeObj('text', x, y);
        createdObjects.push(obj);
        return obj;
      }),
    },
  };

  return { scene: scene as unknown as Phaser.Scene, createdObjects, canvasTextures, dataset };
}

function makeProjectedAnimals(): ProjectedLivestockAnimal[] {
  return LIVESTOCK_SPECIES_LIST.map((def, idx) => ({
    animal: {
      animalId: `ls_${def.speciesId}_${idx + 1}`,
      speciesId: def.speciesId,
      nickname: `${def.nameVi} #${idx + 1}`,
      adoptedAtMs: 1_000,
      adoptedBy: 'user_a',
      happiness: 80,
      lastCareAtMs: 1_000,
      fedAtMs: 1_000,
      readyAtMs: idx % 2 === 0 ? 1_000 : 99_999,
      deluxeFed: false,
      petCalendarDay: 1,
      petByActors: ['user_a'],
      collectionsCount: 0,
    },
    def,
    happiness: 80,
    status: idx % 2 === 0 ? 'ready' : 'producing',
    progressPermille: idx % 2 === 0 ? 1000 : 500,
    pettedTodayByPair: false,
  }));
}

describe('LivestockVisualController (M3c Animated Donor Transplant)', () => {
  it('renders all 7 species using FarmRanchLife atlas sprites, feet origins, shadows, and bee swarm without procedural canvas', () => {
    const { scene, createdObjects, canvasTextures, dataset } = createMockScene({ hasAtlas: true });
    const pushed: unknown[] = [];
    const controller = new LivestockVisualController(scene, (obj) => pushed.push(obj));
    const projected = makeProjectedAnimals();

    controller.sync(projected);

    expect(dataset.livestockAtlasMode).toBe('donor:FarmRanchLife');
    expect(canvasTextures).toHaveLength(0);
    const sprites = createdObjects.filter((o) => o.kind === 'sprite');
    const shadows = createdObjects.filter((o) => o.kind === 'ellipse');
    // 7 main sprites (6 animals + 1 beehive) + 1 animated bee swarm sprite = 8 sprites
    expect(sprites).toHaveLength(8);
    expect(shadows).toHaveLength(7);

    const mainSprites = sprites.filter((s) => s.frameName !== 'bee_swarm_0');
    for (const sp of mainSprites) {
      expect(sp.textureKey).toBe(FARMING_LIVESTOCK_ATLAS_KEY);
      expect(sp.originX).toBe(0.5);
      expect(sp.originY).toBe(1.0);
    }

    const assertLiveTargets = () => {
      const targets = controller.interactionTargets();
      expect(targets).toHaveLength(projected.length);
      projected.forEach(({ animal, def }, index) => {
        expect(targets[index]).toMatchObject({
          id: `livestock:${animal.animalId}`,
          labelVi: `${def.nameVi} · ${animal.nickname}`,
          deepFarmTarget: { kind: 'animal', animalId: animal.animalId },
          x: mainSprites[index]!.x,
          y: mainSprites[index]!.y,
        });
      });
    };
    assertLiveTargets();

    const swarmSprite = sprites.find((s) => s.frameName === 'bee_swarm_0');
    expect(swarmSprite).toBeDefined();
    expect(swarmSprite!.playedAnims).toContain(livestockAnimKey('bee', 'swarm'));

    // Step simulation over several seconds; animals animate & stay bounded near their slot
    for (let i = 0; i < 60; i += 1) {
      controller.step(80);
    }
    expect(sprites.some((s) => s.playedAnims.length >= 2)).toBe(true);
    assertLiveTargets();

    // Updating status only updates badges without destroying existing sprites
    const updated = projected.map((p, idx) =>
      idx === 1 ? { ...p, status: 'hungry' as const } : p,
    );
    controller.sync(updated);
    expect(sprites.every((s) => !s.destroyed)).toBe(true);

    controller.destroy();
    expect(createdObjects.every((o) => o.destroyed)).toBe(true);
  });

  it('falls back to procedural Canvas textures with DEV warning and diagnostic marker when the donor atlas is missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { scene, createdObjects, canvasTextures, dataset } = createMockScene({ hasAtlas: false });
    const controller = new LivestockVisualController(scene, () => {});

    controller.sync(makeProjectedAnimals().slice(0, 2));

    expect(dataset.livestockAtlasMode).toBe('fallback:procedural');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(canvasTextures.length).toBeGreaterThan(0);
    expect(createdObjects.filter((o) => o.kind === 'image')).toHaveLength(2);
    controller.destroy();
    warnSpy.mockRestore();
  });
});
