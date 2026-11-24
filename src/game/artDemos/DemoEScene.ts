import Phaser from 'phaser';
import {
  DEFAULT_AVATAR_PARTNER_A,
  DEFAULT_AVATAR_PARTNER_B,
} from '../../shared/avatar';
import {
  ASSET_CANDIDATES_BASE,
  applyDemoCameraPreset,
  createAmbientMotes,
  createCompactNameTag,
  createFrakassetsPetAnims,
  definePixelFrames,
  defineTileFrames,
  enableDemoCameraPan,
  ensureLightingTextures,
  markArtDemoReadyWhenSettled,
  placeSoftShadow,
  placeSunbeam,
  placeWarmLight,
  preloadFrakassetsPet,
  updateAmbientMotes,
  type CameraTargetLayout,
  type FloatingMote,
} from './demoHelpers';
import { SEMANTIC_ASSETS } from './semanticAssetRegistry';
import { ART_DEMO_METADATA, type CameraPreset } from './types';
import { ensureUnifiedAvatarTexture } from './unifiedAvatarBuilder';

const WORLD_W = 896;
const WORLD_H = 720;

const LAYOUT: CameraTargetLayout = {
  desktopOverview: { cx: 320, cy: 244, fitW: 520, fitH: 362, maxZoom: 1.88 },
  mobileOverview: { cx: 320, cy: 262, fitW: 274, fitH: 430, maxZoom: 2 },
  mobileLandscapeOverview: { cx: 320, cy: 238, fitW: 560, fitH: 332, maxZoom: 1.05 },
  interior: { cx: 320, cy: 146, fitW: 270, fitH: 184, maxZoom: 4 },
  mobileInterior: { cx: 318, cy: 146, fitW: 204, fitH: 260, maxZoom: 2.15 },
  garden: { cx: 320, cy: 332, fitW: 280, fitH: 204, maxZoom: 3.5 },
  mobileGarden: { cx: 314, cy: 334, fitW: 224, fitH: 270, maxZoom: 1.95 },
};

/**
 * Demo E — Unified Cozy World:
 * Pastel cottagecore harmony centered on Sprout Lands, combined selectively with
 * Modern Interiors (multi-zone home + unified 4-dir customizable avatars), Cozy Lands,
 * Sunnyside World (crops, pet bowls, animals, windmill), and Free Pets (CC BY 4.0).
 */
export class DemoEScene extends Phaser.Scene {
  private motes: FloatingMote[] = [];
  private moteBounds = { x: 140, y: 215, w: 360, h: 245 };
  private initialPreset: CameraPreset = 'overview';

  constructor(initialPreset: CameraPreset = 'overview') {
    super({ key: 'DemoEScene' });
    this.initialPreset = initialPreset;
  }

  preload(): void {
    const basic = `${ASSET_CANDIDATES_BASE}/sprout-lands-basic`;
    const sorry = `${ASSET_CANDIDATES_BASE}/sprout-lands-sorry/Early Access`;
    const mi = `${ASSET_CANDIDATES_BASE}/modern-interiors-free`;
    const cl = `${ASSET_CANDIDATES_BASE}/cozy-lands-basic`;
    const sun = `${ASSET_CANDIDATES_BASE}/sunnyside-world`;

    // 1. Sprout Lands pastel terrain, shoreline autotiles, picnic, cherry trees & furniture accents
    this.load.image('e-grass', `${basic}/Tilesets/Grass.png`);
    this.load.image('e-dirt-wide', `${basic}/Tilesets/Tilled_Dirt_Wide_v2.png`);
    this.load.spritesheet('e-water', `${basic}/Tilesets/Water.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('e-bridge', `${basic}/Objects/Wood Bridge.png`);
    this.load.image('e-fences', `${basic}/Tilesets/Fences.png`);
    this.load.image('e-sprout-furn', `${basic}/Objects/Basic Furniture.png`);
    this.load.image('e-grass-things', `${basic}/Objects/Basic Grass Biom things 1.png`);
    this.load.image('e-plants', `${basic}/Objects/Basic Plants.png`);
    this.load.spritesheet('e-chicken', `${basic}/Characters/Free Chicken Sprites.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });

    this.load.image('e-cherry', `${sorry}/Plant update 2/Cherry Blossom Biom.png`);
    this.load.image('e-cherry-water', `${sorry}/Plant update 2/Cherry Blossom Biom water plants.png`);
    this.load.image('e-trees-v2', `${sorry}/Plant update 2/Trees, stumps and bushes v2.png`);
    this.load.image(
      'e-small-house',
      `${sorry}/Village pack/houses/small house/small_House_light_with_door_grass.png`,
    );
    this.load.image('e-picnic-blanket', `${sorry}/Plant update 2/piknik/Piknik blanket.png`);
    this.load.image('e-picnic-basket', `${sorry}/Plant update 2/piknik/Piknik basket.png`);
    this.load.image('e-picnic-foods', `${sorry}/Plant update 2/piknik/piknik_foods.png`);
    this.load.image('e-beehive', `${sorry}/Plant update 2/Bee/beehive.png`);
    this.load.spritesheet('e-fire', `${sorry}/Sprout winter/fire animation.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('e-frog', `${sorry}/Plant update 2/frog/frog_spritesheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });

    // 2. Modern Interiors architectural rooms, couple furniture & 4-dir base avatar rigs
    this.load.image('e-room', `${mi}/Interiors_free/16x16/Room_Builder_free_16x16.png`);
    this.load.image('e-interiors', `${mi}/Interiors_free/16x16/Interiors_free_16x16.png`);
    this.load.image('e-rig-adam-idle', `${mi}/Characters_free/Adam_idle_anim_16x16.png`);
    this.load.image('e-rig-adam-run', `${mi}/Characters_free/Adam_run_16x16.png`);
    this.load.image('e-rig-alex-idle', `${mi}/Characters_free/Alex_idle_anim_16x16.png`);
    this.load.image('e-rig-alex-run', `${mi}/Characters_free/Alex_run_16x16.png`);
    this.load.image('e-rig-amelia-idle', `${mi}/Characters_free/Amelia_idle_anim_16x16.png`);
    this.load.image('e-rig-amelia-run', `${mi}/Characters_free/Amelia_run_16x16.png`);

    // 3. Cozy Lands planter accents & mailbox
    this.load.image('e-cozy-other', `${cl}/Objects/Object/other.png`);

    // 4. Sunnyside crops, pet ceramic bowls, grazing sheep, paddling duck & windmill
    this.load.image('e-sun-tiles', `${sun}/Tileset/spr_tileset_sunnysideworld_16px.png`);
    this.load.image('e-sunflower', `${sun}/Elements/Crops/sunflower_05.png`);
    this.load.image('e-beetroot', `${sun}/Elements/Crops/beetroot_05.png`);
    this.load.image('e-cabbage', `${sun}/Elements/Crops/cabbage_03.png`);
    this.load.spritesheet('e-duck', `${sun}/Elements/Animals/spr_deco_duck_01_strip4.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('e-sheep', `${sun}/Elements/Animals/spr_deco_sheep_01_strip4.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('e-windmill', `${sun}/Elements/Other/spr_deco_windmill_withshadow_strip9.png`, {
      frameWidth: 112,
      frameHeight: 112,
    });

    // 5. Frakassets CC BY 4.0 animated pets
    preloadFrakassetsPet(this, 'e-cat', 'cat-orange', 'outline');
    preloadFrakassetsPet(this, 'e-shiba', 'puppy-shiba', 'outline');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(ART_DEMO_METADATA.E.backdropHex);
    ensureLightingTextures(this);
    this.registerFrames();
    this.registerAnims();
    createFrakassetsPetAnims(this, 'e-cat');
    createFrakassetsPetAnims(this, 'e-shiba');

    this.buildContinuousMeadow();
    this.buildCurvedPondAndPaths();
    this.buildGardenZones();
    this.buildMultiZoneHome();
    this.buildCharactersAndPets();

    this.motes = createAmbientMotes(this, this.moteBounds, 'petal', 14);
    enableDemoCameraPan(this, { x: 0, y: 0, w: WORLD_W, h: WORLD_H });
    applyDemoCameraPreset(this, LAYOUT, this.initialPreset);
    markArtDemoReadyWhenSettled(this, 'E', LAYOUT, this.initialPreset);
  }

  update(_time: number, delta: number): void {
    updateAmbientMotes(this.motes, this.moteBounds, delta / 1000, this.time.now / 1000, 'petal');
  }

  private registerFrames(): void {
    // Register every semantic asset's verified pixel source rectangle on its texture
    for (const spec of Object.values(SEMANTIC_ASSETS)) {
      const tex = this.textures.get(spec.textureKey);
      if (tex && !tex.has(spec.id)) {
        tex.add(spec.id, 0, spec.rect.x, spec.rect.y, spec.rect.w, spec.rect.h);
      }
    }

    // Sprout Grass meadow variations (rows 5..6) & curved pond shoreline mask tiles (cols 0..6, rows 0..2)
    defineTileFrames(this, 'e-grass', [
      { name: 'grass_v0', col: 0, row: 5 },
      { name: 'grass_v1', col: 1, row: 5 },
      { name: 'grass_v2', col: 2, row: 5 },
      { name: 'grass_v3', col: 3, row: 5 },
      { name: 'grass_v4', col: 4, row: 5 },
      { name: 'grass_v5', col: 5, row: 5 },
      { name: 'grass_v6', col: 0, row: 6 },
      { name: 'grass_v7', col: 1, row: 6 },
      { name: 'grass_v8', col: 2, row: 6 },
      { name: 'grass_v9', col: 3, row: 6 },
      { name: 'grass_v10', col: 4, row: 6 },
      { name: 'grass_v11', col: 5, row: 6 },
      { name: 'flora_clover', col: 6, row: 5 },
      { name: 'flora_daisy', col: 7, row: 5 },
      { name: 'flora_tuft', col: 6, row: 6 },
      { name: 'flora_petal', col: 7, row: 6 },
      // Shoreline edge & concave corner lips rendered over animated Water tiles
      { name: 'shore_n', col: 1, row: 2 },
      { name: 'shore_s', col: 1, row: 0 },
      { name: 'shore_w', col: 2, row: 1 },
      { name: 'shore_e', col: 0, row: 1 },
      { name: 'shore_nw', col: 5, row: 1 },
      { name: 'shore_ne', col: 6, row: 1 },
      { name: 'shore_sw', col: 5, row: 2 },
      { name: 'shore_se', col: 6, row: 2 },
    ]);

    // Sprout Tilled_Dirt_Wide_v2 9-slice rounded dirt path & soil bed tiles
    defineTileFrames(this, 'e-dirt-wide', [
      { name: 'dirt_tl', col: 0, row: 0 },
      { name: 'dirt_t', col: 1, row: 0 },
      { name: 'dirt_tr', col: 2, row: 0 },
      { name: 'dirt_l', col: 0, row: 1 },
      { name: 'dirt_c', col: 1, row: 1 },
      { name: 'dirt_r', col: 2, row: 1 },
      { name: 'dirt_bl', col: 0, row: 2 },
      { name: 'dirt_b', col: 1, row: 2 },
      { name: 'dirt_br', col: 2, row: 2 },
      { name: 'dirt_v_t', col: 3, row: 0 },
      { name: 'dirt_v_m', col: 3, row: 1 },
      { name: 'dirt_v_b', col: 3, row: 2 },
      { name: 'dirt_h_l', col: 0, row: 3 },
      { name: 'dirt_h_m', col: 1, row: 3 },
      { name: 'dirt_h_r', col: 2, row: 3 },
      { name: 'dirt_stone_a', col: 1, row: 5 },
      { name: 'dirt_stone_b', col: 2, row: 5 },
    ]);

    defineTileFrames(this, 'e-cherry-water', [
      { name: 'lily_pad', col: 0, row: 0 },
      { name: 'lotus_bloom', col: 3, row: 1 },
      { name: 'reed_a', col: 4, row: 0 },
      { name: 'reed_b', col: 5, row: 0 },
    ]);

    defineTileFrames(this, 'e-cherry', [
      { name: 'sakura_petals', col: 1, row: 3 },
      { name: 'sakura_shroom', col: 1, row: 1 },
      { name: 'sakura_bush_sm', col: 4, row: 4 },
    ]);

    definePixelFrames(this, 'e-trees-v2', [
      { name: 'peach_tree', x: 2 * 16, y: 5 * 16, w: 32, h: 32 },
      { name: 'stump_sm', x: 1 * 16, y: 7 * 16, w: 16, h: 16 },
    ]);

    definePixelFrames(this, 'e-fences', [
      { name: 'fence_3w', x: 16, y: 48, w: 48, h: 16 },
      { name: 'fence_1w', x: 16, y: 48, w: 16, h: 16 },
    ]);

    defineTileFrames(this, 'e-plants', [
      { name: 'corn', col: 3, row: 0 },
      { name: 'tomato', col: 4, row: 1 },
      { name: 'radish', col: 5, row: 1 },
    ]);

    defineTileFrames(this, 'e-picnic-foods', [
      { name: 'tart', col: 3, row: 0 },
      { name: 'teacup', col: 1, row: 1 },
      { name: 'berries', col: 1, row: 0 },
    ]);
  }

  private registerAnims(): void {
    const mk = (
      key: string,
      sheet: string,
      frames: number[] | { start: number; end: number },
      rate: number,
    ) => {
      if (this.anims.exists(key)) return;
      const frameList = Array.isArray(frames)
        ? frames.map((f) => ({ key: sheet, frame: f }))
        : this.anims.generateFrameNumbers(sheet, frames);
      this.anims.create({
        key,
        frames: frameList,
        frameRate: rate,
        repeat: -1,
      });
    };

    mk('e-water-anim', 'e-water', { start: 0, end: 3 }, 4);
    mk('e-fire-anim', 'e-fire', { start: 0, end: 7 }, 9);
    mk('e-chicken-anim', 'e-chicken', [0, 1, 4, 5], 4);
    mk('e-frog-anim', 'e-frog', [0, 14, 15], 3.5);
    mk('e-duck-anim', 'e-duck', { start: 0, end: 3 }, 4);
    mk('e-sheep-anim', 'e-sheep', { start: 0, end: 3 }, 4.5);
    mk('e-windmill-anim', 'e-windmill', { start: 0, end: 8 }, 7);
  }

  private placeSemantic(
    assetId: string,
    x: number,
    y: number,
    depthOffset = 0,
  ): Phaser.GameObjects.Image {
    const spec = SEMANTIC_ASSETS[assetId];
    if (!spec) {
      throw new Error(`Unknown semantic asset id: ${assetId}`);
    }
    if (spec.shadow) {
      placeSoftShadow(
        this,
        x,
        y + (spec.shadow.offsetY ?? -1),
        spec.shadow.w,
        spec.shadow.h,
        Math.round(y) - 10 + depthOffset,
        0.55,
      );
    }
    const img = this.add.image(Math.round(x), Math.round(y), spec.textureKey, spec.id);
    img.setOrigin(spec.anchor.ox, spec.anchor.oy);
    const baseDepth =
      spec.layer === 'floor'
        ? 12
        : spec.layer === 'wall'
          ? 24 + depthOffset
          : Math.round(y) + depthOffset;
    img.setDepth(baseDepth);
    return img;
  }

  private buildContinuousMeadow(): void {
    // Seeded non-uniform organic grass covering entire 640x520 world (zero checkerboard repeats!)
    for (let ty = 0; ty * 16 < WORLD_H; ty += 1) {
      for (let tx = 0; tx * 16 < WORLD_W; tx += 1) {
        const hash = Math.abs((tx * 73856093) ^ (ty * 19349663) ^ 4219);
        const variantIdx = hash % 20 < 13 ? hash % 6 : hash % 12;
        this.add
          .image(tx * 16, ty * 16, 'e-grass', `grass_v${variantIdx}`)
          .setOrigin(0, 0)
          .setDepth(1);

        // Sparse natural meadow micro-accents outside house footprint
        const inHouse = tx >= 12 && tx < 28 && ty >= 4 && ty < 14;
        if (!inHouse && hash % 29 === 0) {
          const flora =
            hash % 4 === 0
              ? 'flora_clover'
              : hash % 4 === 1
                ? 'flora_daisy'
                : hash % 4 === 2
                  ? 'flora_tuft'
                  : 'flora_petal';
          this.add.image(tx * 16, ty * 16, 'e-grass', flora).setOrigin(0, 0).setDepth(2);
        }
      }
    }

    // Panoramic background treeline framing extra mobile/desktop horizons without clipping hero core
    const horizonTrees: [string, number, number][] = [
      ['nature.oak_tree', 216, 48],
      ['nature.sakura_tree', 268, 56],
      ['nature.apple_tree', 332, 46],
      ['nature.sakura_tree', 392, 54],
      ['nature.oak_tree', 142, 62],
      ['nature.apple_tree', 494, 58],
      ['nature.sakura_tree', 648, 224],
      ['nature.oak_tree', 672, 340],
      ['nature.apple_tree', 216, 512],
      ['nature.sakura_tree', 416, 516],
    ];
    for (const [id, tx, ty] of horizonTrees) {
      this.placeSemantic(id, tx, ty);
    }
  }

  private buildCurvedPondAndPaths(): void {
    // 1. Curved Organic Pond (`tx = 14..21, ty = 22..25` -> `x: 224..352, y: 352..416`)
    const px0 = 14;
    const py0 = 22;
    const pw = 8;
    const ph = 4;

    for (let dy = 0; dy < ph; dy += 1) {
      for (let dx = 0; dx < pw; dx += 1) {
        const wx = (px0 + dx) * 16;
        const wy = (py0 + dy) * 16;
        const water = this.add.sprite(wx, wy, 'e-water').setOrigin(0, 0).setDepth(3);
        water.play('e-water-anim');

        // Overlay rounded Sprout Lands shoreline mask on outer rim + 4 concave inner corners
        let shore: string | null = null;
        if (dx === 0 && dy === 0) shore = 'shore_nw';
        else if (dx === pw - 1 && dy === 0) shore = 'shore_ne';
        else if (dx === 0 && dy === ph - 1) shore = 'shore_sw';
        else if (dx === pw - 1 && dy === ph - 1) shore = 'shore_se';
        else if (dy === 0) shore = 'shore_n';
        else if (dy === ph - 1) shore = 'shore_s';
        else if (dx === 0) shore = 'shore_w';
        else if (dx === pw - 1) shore = 'shore_e';

        if (shore) {
          this.add.image(wx, wy, 'e-grass', shore).setOrigin(0, 0).setDepth(4);
        }
      }
    }

    // Lily pads, lotus blooms, reeds & pond wildlife
    this.add.image(252, 384, 'e-cherry-water', 'lotus_bloom').setOrigin(0.5, 0.5).setDepth(5);
    this.add.image(268, 396, 'e-cherry-water', 'lily_pad').setOrigin(0.5, 0.5).setDepth(5);
    this.add.image(332, 386, 'e-cherry-water', 'lotus_bloom').setOrigin(0.5, 0.5).setDepth(5);
    this.add.image(242, 368, 'e-cherry-water', 'reed_a').setOrigin(0.5, 1).setDepth(368);
    this.add.image(336, 408, 'e-cherry-water', 'reed_b').setOrigin(0.5, 1).setDepth(408);

    const frog = this.add.sprite(268, 392, 'e-frog', 0).setOrigin(0.5, 0.8).setDepth(394);
    frog.play('e-frog-anim');

    const duck = this.add.sprite(332, 392, 'e-duck', 0).setOrigin(0.5, 0.8).setDepth(394);
    duck.play('e-duck-anim');

    // Dual-lane vertical wooden bridge connecting North & South paths right across the pond!
    this.placeSemantic('nature.bridge_wood', 296, 384);
    this.placeSemantic('nature.bridge_wood', 312, 384);

    // 2. Winding 9-slice Rounded Paths (`Tilled_Dirt_Wide_v2.png`) with organic grass corners
    const drawDirtBlock = (startTx: number, startTy: number, wTiles: number, hTiles: number) => {
      for (let dy = 0; dy < hTiles; dy += 1) {
        for (let dx = 0; dx < wTiles; dx += 1) {
          let frame: string;
          if (wTiles === 1 && hTiles >= 2) {
            frame = dy === 0 ? 'dirt_v_t' : dy === hTiles - 1 ? 'dirt_v_b' : 'dirt_v_m';
          } else if (hTiles === 1 && wTiles >= 2) {
            frame = dx === 0 ? 'dirt_h_l' : dx === wTiles - 1 ? 'dirt_h_r' : 'dirt_h_m';
          } else {
            const top = dy === 0;
            const bot = dy === hTiles - 1;
            const left = dx === 0;
            const right = dx === wTiles - 1;
            if (top && left) frame = 'dirt_tl';
            else if (top && right) frame = 'dirt_tr';
            else if (top) frame = 'dirt_t';
            else if (bot && left) frame = 'dirt_bl';
            else if (bot && right) frame = 'dirt_br';
            else if (bot) frame = 'dirt_b';
            else if (left) frame = 'dirt_l';
            else if (right) frame = 'dirt_r';
            else frame = (dx + dy) % 3 === 0 ? 'dirt_stone_a' : 'dirt_c';
          }
          this.add
            .image((startTx + dx) * 16, (startTy + dy) * 16, 'e-dirt-wide', frame)
            .setOrigin(0, 0)
            .setDepth(5);
        }
      }
    };

    // Main courtyard pad right outside front doorway (`tx: 19..21, ty: 14..15`)
    drawDirtBlock(19, 14, 3, 2);
    // Walkpath branching south toward bench & bridge (`tx: 18..19, ty: 16..21`)
    drawDirtBlock(18, 16, 2, 6);
    // South path continuing smoothly from bridge to lakeside bench (`tx: 18..19, ty: 26..27`)
    drawDirtBlock(18, 26, 2, 2);
    // Branch left toward cherry picnic glade (`tx: 15..17, ty: 17`)
    drawDirtBlock(15, 17, 3, 1);
    // Branch right toward flower & veggie garden (`tx: 21..22, ty: 16`)
    drawDirtBlock(21, 16, 2, 1);
    // Clean tilled soil plot for crops (`tx: 23..26, ty: 17..20`)
    drawDirtBlock(23, 17, 4, 4);
  }

  private buildGardenZones(): void {
    // Porch planters & Cozy Lands red mailbox flanking front door (`y = 224`)
    this.placeSemantic('nature.planter_box', 284, 232);
    this.placeSemantic('nature.planter_box', 356, 232);
    this.placeSemantic('nature.mailbox_red', 346, 240);

    // Asymmetric Romantic Cherry Blossom Glade & Picnic (`x: 204..274, y: 264..338`)
    this.placeSemantic('nature.sakura_tree', 214, 268);
    this.placeSemantic('nature.bench_garden', 274, 266);

    // Pink checkered picnic blanket + basket + strawberry tart + tea
    this.add.image(234, 314, 'e-picnic-blanket').setOrigin(0.5, 0.5).setDepth(8);
    this.add.image(222, 304, 'e-picnic-basket').setOrigin(0.5, 1).setDepth(306);
    this.add.image(236, 312, 'e-picnic-foods', 'tart').setOrigin(0.5, 1).setDepth(312);
    this.add.image(244, 318, 'e-picnic-foods', 'teacup').setOrigin(0.5, 1).setDepth(318);

    // Cherry blossoms, sakura mushrooms & fruit bushes around pond and picnic
    const gardenShrubs: [number, number, string, string][] = [
      [196, 304, 'e-cherry', 'sakura_bush_sm'],
      [204, 344, 'e-cherry', 'sakura_petals'],
      [284, 336, 'e-cherry', 'sakura_bush_sm'],
      [352, 340, 'e-cherry', 'sakura_petals'],
      [198, 412, 'e-trees-v2', 'peach_tree'],
      [388, 396, 'e-cherry', 'sakura_bush_sm'],
    ];
    for (const [sx, sy, tex, fr] of gardenShrubs) {
      this.add.image(sx, sy, tex, fr).setOrigin(0.5, 1).setDepth(sy);
    }

    // Fenced Garden Crop Bed + Beehive + Sunflowers & Veggies (`tx: 23..26, ty: 17..20`)
    this.add.image(394, 270, 'e-fences', 'fence_3w').setOrigin(0.5, 1).setDepth(270);
    this.add.image(424, 270, 'e-fences', 'fence_1w').setOrigin(0.5, 1).setDepth(270);

    // Row 1 inside crop bed (Sunflowers)
    for (const cx of [376, 392, 408, 424]) {
      this.add.image(cx, 286, 'e-sunflower').setOrigin(0.5, 1).setDepth(286);
    }
    // Row 2 inside crop bed (Sprout Corn & Tomatoes + Sunnyside Beetroots & Cabbages)
    this.add.image(376, 304, 'e-plants', 'tomato').setOrigin(0.5, 1).setDepth(304);
    this.add.image(392, 304, 'e-beetroot').setOrigin(0.5, 1).setDepth(304);
    this.add.image(408, 304, 'e-plants', 'corn').setOrigin(0.5, 1).setDepth(304);
    this.add.image(424, 304, 'e-cabbage').setOrigin(0.5, 1).setDepth(304);

    // Row 3 inside crop bed (Sprout Radishes + Sunnyside Cabbages)
    this.add.image(376, 322, 'e-cabbage').setOrigin(0.5, 1).setDepth(322);
    this.add.image(392, 322, 'e-plants', 'radish').setOrigin(0.5, 1).setDepth(322);
    this.add.image(408, 322, 'e-beetroot').setOrigin(0.5, 1).setDepth(322);
    this.add.image(424, 322, 'e-plants', 'tomato').setOrigin(0.5, 1).setDepth(322);

    this.add.image(442, 314, 'e-beehive').setOrigin(0.5, 1).setDepth(314);
    placeSoftShadow(this, 442, 313, 22, 7, 304, 0.5);

    // Sakura tree & Apple tree framing right border cleanly inside mobile & desktop
    this.placeSemantic('nature.apple_tree', 432, 260);
    this.placeSemantic('nature.sakura_tree', 420, 398);

    // Foreground meadow bench south of bridge + chicken friend
    this.placeSemantic('nature.bench_garden', 274, 438);
    const ch = this.add.sprite(366, 368, 'e-chicken', 0).setOrigin(0.5, 0.85).setDepth(368);
    placeSoftShadow(this, 366, 367, 11, 4, 360, 0.5);
    ch.play('e-chicken-anim');

    // === Scenic Desktop Outer Wings (kept safely outside x: 185..455 so Mobile 430x932 never crops roofs!) ===
    this.placeSemantic('nature.cottage_pastel', 112, 322);
    placeWarmLight(this, 112, 298, 30, 0xffd284, 0.28, 860);
    this.placeSemantic('nature.sakura_tree', 72, 240);
    this.placeSemantic('nature.apple_tree', 142, 398);

    const sheep = this.add.sprite(116, 376, 'e-sheep', 0).setOrigin(0.5, 0.84).setDepth(376);
    placeSoftShadow(this, 116, 375, 18, 6, 368, 0.5);
    sheep.play('e-sheep-anim');

    // Far Right Panoramic Wing: Sunnyside Windmill & Future Expansion Orchard (`x > 480`)
    const windmill = this.add.sprite(528, 336, 'e-windmill', 0).setOrigin(0.5, 0.85).setDepth(336);
    windmill.play('e-windmill-anim');
    this.placeSemantic('nature.oak_tree', 494, 240);
    this.placeSemantic('nature.sakura_tree', 556, 404);
    this.add.image(502, 390, 'e-trees-v2', 'stump_sm').setOrigin(0.5, 1).setDepth(390);
  }

  private buildMultiZoneHome(): void {
    // 16 x 10 tile spacious couple home centered at x: 192..448, y: 64..224
    const rx = 192;
    const ry = 64;
    const rw = 256;
    const rh = 160;

    // Warm dark outer wall enclosure & depth lip
    const shell = this.add.graphics().setDepth(4);
    shell.fillStyle(0x281e24, 0.86);
    shell.fillRoundedRect(rx - 4, ry - 4, rw + 8, rh + 10, 4);
    shell.lineStyle(2, 0x6b4b3e, 1);
    shell.strokeRoundedRect(rx - 2, ry - 2, rw + 4, rh + 4, 3);

    // Herringbone hardwood flooring across Living, Bedroom, Dining & Pet Corner
    for (let y = ry + 32; y < ry + rh; y += 32) {
      for (let x = rx; x < rx + rw; x += 32) {
        const spec = SEMANTIC_ASSETS['floor.herringbone_oak']!;
        this.add
          .image(x, y, spec.textureKey, spec.id)
          .setOrigin(0, 0)
          .setDepth(6);
      }
    }

    // Cream mosaic tile overlay distinguishing Shared Study Corner (Top-Right `x: 368..448, y: 96..176`)
    for (let y = ry + 32; y < ry + 112; y += 32) {
      for (let x = 368; x < 448; x += 32) {
        const w = Math.min(32, 448 - x);
        const h = Math.min(32, ry + 112 - y);
        const spec = SEMANTIC_ASSETS['floor.cream_mosaic']!;
        const tile = this.add
          .image(x, y, spec.textureKey, spec.id)
          .setOrigin(0, 0)
          .setDepth(7);
        if (w < 32 || h < 32) tile.setCrop(0, 0, w, h);
      }
    }

    // Back wall strips (32px tall)
    for (let x = rx; x < rx + rw; x += 16) {
      const topSpec = SEMANTIC_ASSETS['wall.cream_top']!;
      const baseSpec = SEMANTIC_ASSETS['wall.cream_base']!;
      this.add.image(x, ry, topSpec.textureKey, topSpec.id).setOrigin(0, 0).setDepth(8);
      this.add.image(x, ry + 16, baseSpec.textureKey, baseSpec.id).setOrigin(0, 0).setDepth(8);
    }

    // Subtle divider trim lines marking Bedroom/Study alcove transitions visually without blocking flow
    const zoneTrim = this.add.graphics().setDepth(9);
    zoneTrim.fillStyle(0x7d5846, 0.35);
    zoneTrim.fillRect(272, ry + 32, 2, 74);

    // === ZONE 1: Bedroom Nook (Top-Left `x: 192..272`) ===
    this.placeSemantic('furn.curtain_window', 226, ry + 32);
    placeSunbeam(this, 226, ry + 32, 30, 44, 54, 0.08, 15);
    this.placeSemantic('furn.painting_meadow', 260, ry + 26);

    this.placeSemantic('furn.rug_sage_braid', 228, 126);
    this.placeSemantic('furn.bed_pastel_blue', 216, 134);
    this.placeSemantic('furn.bed_pastel_pink', 232, 134);
    this.placeSemantic('furn.lamp_bedside', 252, 114);
    placeWarmLight(this, 252, 104, 28, 0xffd280, 0.24, 860);

    // === ZONE 2: Living Lounge & TV/Cinema Future Spot (Top-Center `x: 274..366`) ===
    this.placeSemantic('furn.clock_wall', 284, ry + 24);
    this.placeSemantic('furn.fireplace_brick', 320, 116);
    // Animated Sprout fire inside brick hearth!
    const hearthFire = this.add
      .sprite(320, 110, 'e-fire', 0)
      .setOrigin(0.5, 1)
      .setScale(0.75)
      .setDepth(118);
    hearthFire.play('e-fire-anim');
    placeWarmLight(this, 320, 108, 42, 0xffae52, 0.28, 865);

    this.placeSemantic('furn.plant_monstera', 354, 116);

    this.placeSemantic('furn.rug_crimson', 318, 150);
    this.placeSemantic('furn.sofa_plush', 318, 136);
    this.placeSemantic('furn.coffee_table', 318, 164);
    this.placeSemantic('furn.cake_plate', 310, 154, 15);
    this.placeSemantic('furn.berry_plate', 326, 154, 15);

    // Home Cinema / TV flatscreen wall console positioned cleanly in front of Living sofa
    this.placeSemantic('furn.tv_cinema_unit', 318, 192);

    // === ZONE 3: Shared 2-Seat Study Corner (Top-Right `x: 368..448`) ===
    this.placeSemantic('furn.wood_window', 384, ry + 32);
    placeSunbeam(this, 384, ry + 32, 22, 34, 52, 0.08, 15);
    this.placeSemantic('furn.bookshelf_wide', 422, 114);

    this.placeSemantic('furn.lamp_floor', 370, 128);
    placeWarmLight(this, 370, 112, 32, 0xffd584, 0.24, 860);
    this.placeSemantic('furn.desk_study_a', 392, 152);
    this.placeSemantic('furn.desk_study_b', 428, 150);
    this.placeSemantic('furn.study_chair', 428, 166);

    // === ZONE 4: Kitchen & Dining Nook (Bottom-Left `x: 192..276`) ===
    this.placeSemantic('furn.kitchen_fridge', 206, 174);
    this.placeSemantic('furn.kitchen_counter_fruit', 234, 172);
    this.placeSemantic('furn.bookshelf_tall', 284, 214);
    this.placeSemantic('furn.fairy_lights', 284, ry + 26);
    placeWarmLight(this, 284, ry + 26, 24, 0xffe49e, 0.16, 855);

    this.placeSemantic('furn.dining_table', 226, 208);
    this.placeSemantic('furn.chair_right', 198, 206);
    this.placeSemantic('furn.chair_left', 254, 206);
    this.placeSemantic('furn.cake_plate', 226, 197, 15);

    // === ZONE 5: Pet Corner (Bottom-Right `x: 368..448, y: 170..222`) ===
    this.placeSemantic('furn.rug_pastel_coral', 410, 204);
    this.placeSemantic('furn.pet_bowl_food', 382, 194);
    this.placeSemantic('furn.pet_bowl_water', 396, 194);
    this.placeSemantic('furn.plant_palm', 436, 212);

    // === ZONE 6: Central Entry Doorway (`x: 320, y: 224`) ===
    const door = this.add.graphics().setDepth(16);
    door.fillStyle(0xe8c79e, 1);
    door.fillRect(306, ry + rh - 2, 28, 6);
    door.fillStyle(0xb5865a, 1);
    door.fillRect(308, ry + rh + 2, 24, 3);
  }

  private buildCharactersAndPets(): void {
    // 1. Unified Avatar Textures generated dynamically from V0.1 AvatarConfig!
    const mayTex = ensureUnifiedAvatarTexture(this, DEFAULT_AVATAR_PARTNER_A);
    const haAnhTex = ensureUnifiedAvatarTexture(this, DEFAULT_AVATAR_PARTNER_B);

    // Nắng inside the Cozy Living & Pet Corridor (clean clear floor spot!)
    const haShadow = placeSoftShadow(this, 352, 186, 12, 5, 180, 0.55);
    const haAnh = this.add.sprite(352, 186, haAnhTex, 18).setOrigin(0.5, 1).setDepth(186);
    const haTag = createCompactNameTag(this, 352, 159, 'Nắng', '#f2a2ba');
    haAnh.play(`${haAnhTex}-idle-down`);

    this.tweens.add({
      targets: haAnh,
      x: 344,
      delay: 1400,
      duration: 2200,
      yoyo: true,
      hold: 2000,
      repeatDelay: 1800,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (_t, _target, _k, cur, prev) => {
        haShadow.x = haAnh.x;
        haTag.x = haAnh.x;
        haAnh.setDepth(Math.round(haAnh.y));
        const dx = cur - prev;
        if (dx > 0.03) haAnh.play(`${haAnhTex}-walk-right`, true);
        else if (dx < -0.03) haAnh.play(`${haAnhTex}-walk-left`, true);
        else haAnh.play(`${haAnhTex}-idle-down`, true);
      },
    });

    // Orange kitty lounging happily in its dedicated Pet Corner indoors!
    placeSoftShadow(this, 410, 206, 13, 5, 200, 0.5);
    const cat = this.add.sprite(410, 206, 'e-cat-sheet').setOrigin(0.5, 0.85).setDepth(206);
    cat.play('e-cat-Sleep_South');

    // Mây strolling along the Cherry Blossom Garden Path beside the picnic & bridge
    const mayShadow = placeSoftShadow(this, 296, 286, 12, 5, 280, 0.55);
    const may = this.add.sprite(296, 286, mayTex, 18).setOrigin(0.5, 1).setDepth(286);
    const mayTag = createCompactNameTag(this, 296, 259, 'Mây', '#8bc4d9');
    may.play(`${mayTex}-idle-down`);

    this.tweens.add({
      targets: may,
      x: 274,
      delay: 1600,
      duration: 2600,
      yoyo: true,
      hold: 2200,
      repeatDelay: 1800,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (_t, _target, _k, cur, prev) => {
        mayShadow.x = may.x;
        mayTag.x = may.x;
        may.setDepth(Math.round(may.y));
        const dx = cur - prev;
        if (dx > 0.03) may.play(`${mayTex}-walk-right`, true);
        else if (dx < -0.03) may.play(`${mayTex}-walk-left`, true);
        else may.play(`${mayTex}-idle-down`, true);
      },
    });

    // Playful Shiba Inu puppy wagging along the curved garden path
    const shibaShadow = placeSoftShadow(this, 318, 304, 13, 5, 298, 0.55);
    const shiba = this.add.sprite(318, 304, 'e-shiba-sheet').setOrigin(0.5, 0.85).setDepth(304);
    shiba.play('e-shiba-Happy_South');

    this.tweens.add({
      targets: shiba,
      x: 336,
      delay: 1000,
      duration: 2400,
      yoyo: true,
      hold: 1500,
      repeatDelay: 1600,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        shibaShadow.x = shiba.x;
        shiba.setDepth(Math.round(shiba.y));
      },
    });
  }
}
