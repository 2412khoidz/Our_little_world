import type Phaser from 'phaser';
import {
  FARMING_LIVESTOCK_ATLAS_KEY,
  getLivestockAtlasSpec,
  livestockAnimKey,
} from '../../shared/art/farmingSpriteAtlas';
import { TILE_SIZE } from '../../shared/maps';
import type {
  ChickenActorState,
  DuckActorState,
  SheepActorState,
} from '../../shared/world/emergentWorldBehavior';
import { computeLivestockSpeciesDisplayScale } from './LivestockVisualController';

const LEGACY_WORLD_PROPS_KEY = 'world-props-atlas';

export type AmbientAnimalKind = 'chicken' | 'duck' | 'sheep';

export interface AmbientVisualMeta {
  usesDonorAtlas?: boolean;
  currentAnimKey?: string;
}

export interface SpawnAmbientDonorOptions {
  kind: AmbientAnimalKind;
  x: number;
  y: number;
  depth: number;
  facing?: 'left' | 'right';
  waterMode?: boolean;
  originY?: number;
  legacyTextureKey?: string;
  legacyFrame: string;
  legacyAnimKey: string;
}

export interface SpawnedAmbientAnimal {
  sprite: Phaser.GameObjects.Sprite;
  usesDonorAtlas: boolean;
  currentAnimKey: string;
}

let legacyAmbientFallbackWarned = false;

export function resetAmbientFallbackWarningForTest(): void {
  legacyAmbientFallbackWarned = false;
}

function setAmbientAtlasDataset(scene: Phaser.Scene, mode: string): void {
  const dataset = scene.game?.canvas?.dataset;
  if (dataset) {
    dataset.ambientAnimalAtlasMode = mode;
  }
}

export function resolveAmbientChickenAnimName(
  state: Pick<ChickenActorState, 'activity' | 'facing' | 'vx' | 'vy'>,
): string {
  const moving =
    Math.hypot(state.vx, state.vy) > 1.5 ||
    state.activity === 'wandering' ||
    state.activity === 'curious_seed' ||
    state.activity === 'startled_hop';
  if (moving) {
    if (Math.abs(state.vy) > Math.abs(state.vx) * 1.15) {
      return state.vy < 0 ? 'walk_up' : 'walk_down';
    }
    return state.facing === 'left' ? 'walk_left' : 'walk_right';
  }
  if (state.activity === 'pecking') {
    return state.facing === 'left' ? 'eat_left' : 'eat_right';
  }
  if (state.activity === 'roosting_sleep') {
    return state.facing === 'left' ? 'sleep_left' : 'sleep_right';
  }
  return state.facing === 'left' ? 'idle_left' : 'idle_right';
}

export function resolveAmbientDuckAnimName(
  state: Pick<DuckActorState, 'activity' | 'facing'>,
): string {
  if (state.activity === 'sleeping') {
    return state.facing === 'left' ? 'swim_sleep_left' : 'swim_sleep_right';
  }
  return state.facing === 'left' ? 'swim_left' : 'swim_right';
}

export function resolveAmbientSheepAnimName(
  state: Pick<SheepActorState, 'activity' | 'facing' | 'vx' | 'vy'>,
): string {
  const moving =
    Math.hypot(state.vx, state.vy) > 1.5 ||
    state.activity === 'wandering' ||
    state.activity === 'curious_player';
  if (moving) {
    if (Math.abs(state.vy) > Math.abs(state.vx) * 1.15) {
      return state.vy < 0 ? 'walk_up' : 'walk_down';
    }
    return state.facing === 'left' ? 'walk_left' : 'walk_right';
  }
  if (state.activity === 'grazing') {
    return state.facing === 'left' ? 'eat_left' : 'eat_right';
  }
  if (state.activity === 'sleeping' || state.activity === 'resting') {
    return state.facing === 'left' ? 'sleep_left' : 'sleep_right';
  }
  return state.facing === 'left' ? 'idle_left' : 'idle_right';
}

function playDonorAnimIfChanged(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  meta: AmbientVisualMeta,
  kind: AmbientAnimalKind,
  animName: string,
): void {
  const spec = getLivestockAtlasSpec(kind);
  const resolvedName =
    spec?.animations[animName]?.length
      ? animName
      : spec?.animations.idle_right?.length
        ? 'idle_right'
        : animName;
  const targetKey = livestockAnimKey(kind, resolvedName);
  sprite.setFlipX(false);
  if (meta.currentAnimKey !== targetKey && scene.anims.exists(targetKey)) {
    sprite.play(targetKey, true);
    meta.currentAnimKey = targetKey;
  }
}

export function spawnAmbientDonorAnimal(
  scene: Phaser.Scene,
  opts: SpawnAmbientDonorOptions,
): SpawnedAmbientAnimal | null {
  const facing = opts.facing ?? 'right';
  const spec = getLivestockAtlasSpec(opts.kind);
  const initialAct = opts.waterMode
    ? facing === 'left'
      ? 'swim_left'
      : 'swim_right'
    : facing === 'left'
      ? 'idle_left'
      : 'idle_right';

  if (scene.textures.exists(FARMING_LIVESTOCK_ATLAS_KEY) && spec) {
    const fallbackFrames =
      spec.animations[initialAct] ??
      spec.animations.idle_right ??
      Object.values(spec.animations).find((frames) => frames.length > 0) ??
      [];
    const initialFrame = fallbackFrames[0];
    if (initialFrame) {
      const originY = opts.waterMode ? 0.78 : (opts.originY ?? 0.88);
      const scale = computeLivestockSpeciesDisplayScale(opts.kind, TILE_SIZE);
      const animKey = livestockAnimKey(opts.kind, initialAct);
      const sprite = scene.add
        .sprite(opts.x, opts.y, FARMING_LIVESTOCK_ATLAS_KEY, initialFrame)
        .setOrigin(0.5, originY)
        .setScale(scale)
        .setFlipX(false)
        .setDepth(opts.depth);
      if (scene.anims.exists(animKey)) {
        sprite.play(animKey);
      }
      setAmbientAtlasDataset(scene, 'donor:FarmRanchLife');
      return {
        sprite,
        usesDonorAtlas: true,
        currentAnimKey: animKey,
      };
    }
  }

  const legacyTextureKey = opts.legacyTextureKey ?? LEGACY_WORLD_PROPS_KEY;
  if (scene.textures.exists(legacyTextureKey) && scene.anims.exists(opts.legacyAnimKey)) {
    if (import.meta.env.DEV && !legacyAmbientFallbackWarned) {
      legacyAmbientFallbackWarned = true;
      console.warn(
        `[ambientAnimalVisualAdapter] Donor atlas "${FARMING_LIVESTOCK_ATLAS_KEY}" missing for "${opts.kind}"; falling back to legacy "${opts.legacyAnimKey}".`,
      );
    }
    setAmbientAtlasDataset(scene, 'fallback:world-props');
    const sprite = scene.add
      .sprite(opts.x, opts.y, legacyTextureKey, opts.legacyFrame)
      .setOrigin(0.5, opts.waterMode ? 0.8 : (opts.originY ?? 0.85))
      .setDepth(opts.depth);
    sprite.play(opts.legacyAnimKey);
    return {
      sprite,
      usesDonorAtlas: false,
      currentAnimKey: opts.legacyAnimKey,
    };
  }

  return null;
}

export function syncAmbientChickenVisual(
  scene: Phaser.Scene,
  handle: {
    sprite: Phaser.GameObjects.Sprite;
    shadow: Phaser.GameObjects.Image;
    state: ChickenActorState;
    bubble?: Phaser.GameObjects.Text;
    usesDonorAtlas?: boolean;
    currentAnimKey?: string;
  },
): void {
  handle.sprite
    .setPosition(handle.state.x, handle.state.y + handle.state.hopOffsetY)
    .setAlpha(handle.state.activity === 'roosting_sleep' ? 0.8 : 1)
    .setDepth(Math.round(handle.state.y));
  if (handle.usesDonorAtlas) {
    playDonorAnimIfChanged(
      scene,
      handle.sprite,
      handle,
      'chicken',
      resolveAmbientChickenAnimName(handle.state),
    );
  } else {
    handle.sprite.setFlipX(handle.state.facing === 'left');
  }
  handle.sprite.anims.timeScale = handle.state.animRateScale;
  handle.shadow.setPosition(handle.state.x, handle.state.y - 1);
  if (handle.bubble) {
    if (handle.state.bubbleText) {
      handle.bubble
        .setText(handle.state.bubbleText)
        .setPosition(handle.state.x, handle.state.y + handle.state.hopOffsetY - 14)
        .setVisible(true);
    } else {
      handle.bubble.setVisible(false);
    }
  }
}

export function syncAmbientDuckVisual(
  scene: Phaser.Scene,
  handle: {
    sprite: Phaser.GameObjects.Sprite;
    state: DuckActorState;
    usesDonorAtlas?: boolean;
    currentAnimKey?: string;
  },
): void {
  handle.sprite
    .setPosition(handle.state.x, handle.state.y + handle.state.bobOffsetY)
    .setAlpha(handle.state.activity === 'sleeping' ? 0.82 : 1)
    .setDepth(Math.round(handle.state.y));
  if (handle.usesDonorAtlas) {
    playDonorAnimIfChanged(
      scene,
      handle.sprite,
      handle,
      'duck',
      resolveAmbientDuckAnimName(handle.state),
    );
  } else {
    handle.sprite.setFlipX(handle.state.facing === 'left');
  }
  handle.sprite.anims.timeScale = handle.state.animRateScale;
}

export function syncAmbientSheepVisual(
  scene: Phaser.Scene,
  handle: {
    sprite: Phaser.GameObjects.Sprite;
    shadow: Phaser.GameObjects.Image;
    state: SheepActorState;
    bubble?: Phaser.GameObjects.Text;
    usesDonorAtlas?: boolean;
    currentAnimKey?: string;
  },
): void {
  handle.sprite
    .setPosition(handle.state.x, handle.state.y + handle.state.grazeBobY)
    .setAlpha(handle.state.activity === 'sleeping' ? 0.82 : 1)
    .setDepth(Math.round(handle.state.y));
  if (handle.usesDonorAtlas) {
    playDonorAnimIfChanged(
      scene,
      handle.sprite,
      handle,
      'sheep',
      resolveAmbientSheepAnimName(handle.state),
    );
  } else {
    handle.sprite.setFlipX(handle.state.facing === 'left');
  }
  handle.sprite.anims.timeScale = handle.state.animRateScale;
  handle.shadow.setPosition(handle.state.x, handle.state.y - 1);
  if (handle.bubble) {
    if (handle.state.bubbleText) {
      handle.bubble
        .setText(handle.state.bubbleText)
        .setPosition(handle.state.x, handle.state.y - 18)
        .setVisible(true);
    } else {
      handle.bubble.setVisible(false);
    }
  }
}
