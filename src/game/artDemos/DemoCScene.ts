import Phaser from 'phaser';
import {
  ASSET_CANDIDATES_BASE,
  applyDemoCameraPreset,
  createAmbientMotes,
  createCozyNameTag,
  createFrakassetsPetAnims,
  definePixelFrames,
  defineTileFrames,
  ensureLightingTextures,
  markArtDemoReadyWhenSettled,
  placeProp,
  placeSoftShadow,
  placeSunbeam,
  placeWarmLight,
  preloadFrakassetsPet,
  updateAmbientMotes,
  type CameraTargetLayout,
  type FloatingMote,
} from './demoHelpers';
import { ART_DEMO_METADATA, type CameraPreset } from './types';

const LAYOUT: CameraTargetLayout = {
  desktopOverview: { cx: 192, cy: 172, fitW: 384, fitH: 238, maxZoom: 3 },
  mobileOverview: { cx: 192, cy: 174, fitW: 224, fitH: 308, maxZoom: 2 },
  interior: { cx: 192, cy: 106, fitW: 210, fitH: 122, maxZoom: 4 },
  garden: { cx: 192, cy: 232, fitW: 260, fitH: 150, maxZoom: 3.5 },
};

export class DemoCScene extends Phaser.Scene {
  private motes: FloatingMote[] = [];
  private moteBounds = { x: 8, y: 120, w: 368, h: 205 };
  private initialPreset: CameraPreset = 'overview';

  constructor(initialPreset: CameraPreset = 'overview') {
    super({ key: 'DemoCScene' });
    this.initialPreset = initialPreset;
  }

  preload(): void {
    const sun = `${ASSET_CANDIDATES_BASE}/sunnyside-world`;
    this.load.image('c-tiles', `${sun}/Tileset/spr_tileset_sunnysideworld_16px.png`);

    // Sunnyside modular Human IDLE & WALKING strips
    this.load.spritesheet('c-human-idle-base', `${sun}/Characters/Human/IDLE/base_idle_strip9.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet('c-human-idle-short', `${sun}/Characters/Human/IDLE/shorthair_idle_strip9.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet('c-human-idle-long', `${sun}/Characters/Human/IDLE/longhair_idle_strip9.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet('c-human-walk-base', `${sun}/Characters/Human/WALKING/base_walk_strip8.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet('c-human-walk-short', `${sun}/Characters/Human/WALKING/shorthair_walk_strip8.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet('c-human-walk-long', `${sun}/Characters/Human/WALKING/longhair_walk_strip8.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });

    // Animated Nature, Windmill, VFX, Animals, Crops
    this.load.spritesheet('c-tree-01', `${sun}/Elements/Plants/spr_deco_tree_01_strip4.png`, {
      frameWidth: 32,
      frameHeight: 34,
    });
    this.load.spritesheet('c-windmill', `${sun}/Elements/Other/spr_deco_windmill_withshadow_strip9.png`, {
      frameWidth: 112,
      frameHeight: 112,
    });
    this.load.spritesheet('c-smoke', `${sun}/Elements/VFX/Chimney Smoke/chimneysmoke_01_strip30.png`, {
      frameWidth: 15,
      frameHeight: 37,
    });
    this.load.spritesheet('c-fire', `${sun}/Elements/VFX/Fire/spr_deco_fire_02_strip4.png`, {
      frameWidth: 8,
      frameHeight: 12,
    });
    this.load.spritesheet('c-glint', `${sun}/Elements/VFX/Glint/spr_deco_glint_01_strip6.png`, {
      frameWidth: 7,
      frameHeight: 7,
    });
    this.load.spritesheet('c-sheep', `${sun}/Elements/Animals/spr_deco_sheep_01_strip4.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('c-chicken', `${sun}/Elements/Animals/spr_deco_chicken_01_strip4.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('c-duck', `${sun}/Elements/Animals/spr_deco_duck_01_strip4.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('c-crop-sun4', `${sun}/Elements/Crops/sunflower_04.png`);
    this.load.image('c-crop-sun5', `${sun}/Elements/Crops/sunflower_05.png`);
    this.load.image('c-crop-beet5', `${sun}/Elements/Crops/beetroot_05.png`);
    this.load.image('c-crop-cab3', `${sun}/Elements/Crops/cabbage_03.png`);
    this.load.image('c-shroom-red', `${sun}/Elements/Plants/spr_deco_mushroom_red_01_strip4.png`);

    preloadFrakassetsPet(this, 'c-bunny', 'bunny-white', 'outline');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(ART_DEMO_METADATA.C.backdropHex);
    ensureLightingTextures(this);
    this.registerFrames();
    this.registerAnims();
    createFrakassetsPetAnims(this, 'c-bunny');

    this.buildGardenExterior();
    this.buildRusticInterior();
    this.buildCharactersAndAnimals();

    this.motes = createAmbientMotes(this, this.moteBounds, 'firefly', 20);
    applyDemoCameraPreset(this, LAYOUT, this.initialPreset);
    markArtDemoReadyWhenSettled(this, 'C', LAYOUT, this.initialPreset);
  }

  update(_time: number, delta: number): void {
    updateAmbientMotes(this.motes, this.moteBounds, delta / 1000, this.time.now / 1000, 'firefly');
  }

  private registerFrames(): void {
    defineTileFrames(this, 'c-tiles', [
      // Grass & paths & water
      { name: 'grass_a', col: 1, row: 3 },
      { name: 'grass_b', col: 2, row: 3 },
      { name: 'grass_bright', col: 4, row: 3 },
      { name: 'grass_flower', col: 29, row: 0 },
      { name: 'grass_clover', col: 27, row: 0 },
      { name: 'dirt_path', col: 10, row: 7 },
      { name: 'dirt_soil', col: 11, row: 7 },
      { name: 'water_fill', col: 13, row: 20 },
      { name: 'plank_floor', col: 38, row: 12 },
      { name: 'bridge_v', col: 40, row: 5, wTiles: 2, hTiles: 2 },
      // Rustic interior props (verified rows 32..39, cols 38..56)
      { name: 'rug_royal', col: 40, row: 35, wTiles: 3, hTiles: 3 },
      { name: 'rug_round', col: 44, row: 35, wTiles: 2, hTiles: 2 },
      { name: 'rug_crimson', col: 48, row: 35, wTiles: 2, hTiles: 2 },
      { name: 'bench_h', col: 41, row: 38, wTiles: 2, hTiles: 1 },
      { name: 'sunflower_pot_a', col: 51, row: 32 },
      { name: 'sunflower_pot_b', col: 52, row: 32 },
      { name: 'daisy_pot_a', col: 53, row: 32 },
      { name: 'daisy_pot_b', col: 54, row: 32 },
      { name: 'frame_small', col: 53, row: 33 },
      { name: 'frame_gold', col: 54, row: 33 },
      { name: 'crate_stack', col: 39, row: 9, wTiles: 2, hTiles: 2 },
    ]);

    // Pixel-exact cutouts for orange cottage, oak table, fences, and beds
    definePixelFrames(this, 'c-tiles', [
      { name: 'house_orange', x: 32 * 16, y: 26 * 16 + 4, w: 48, h: 64 },
      { name: 'fence_strip', x: 39 * 16, y: 1 * 16, w: 48, h: 16 },
      { name: 'table_wood', x: 50 * 16, y: 36 * 16, w: 16, h: 20 },
      { name: 'bed_red_a', x: 39 * 16, y: 33 * 16 + 8, w: 16, h: 24 },
      { name: 'bed_red_b', x: 40 * 16, y: 33 * 16 + 8, w: 16, h: 24 },
      { name: 'shelf_a', x: 42 * 16, y: 33 * 16 + 8, w: 16, h: 24 },
      { name: 'shelf_b', x: 43 * 16, y: 33 * 16 + 8, w: 16, h: 24 },
      { name: 'bookshelf_colors', x: 45 * 16, y: 33 * 16 + 8, w: 16, h: 24 },
      { name: 'cabinet_wood', x: 47 * 16, y: 33 * 16 + 8, w: 16, h: 24 },
      { name: 'tea_plate', x: 48 * 16, y: 33 * 16 + 8, w: 16, h: 24 },
      { name: 'flower_bush', x: 49 * 16, y: 3 * 16, w: 32, h: 32 },
    ]);
  }

  private registerAnims(): void {
    const createStripAnim = (
      key: string,
      sheetKey: string,
      start: number,
      end: number,
      frameRate: number,
    ) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(sheetKey, { start, end }),
        frameRate,
        repeat: -1,
      });
    };

    createStripAnim('c-tree-sway', 'c-tree-01', 0, 3, 4);
    createStripAnim('c-windmill-spin', 'c-windmill', 0, 8, 8);
    createStripAnim('c-smoke-rise', 'c-smoke', 0, 29, 10);
    createStripAnim('c-fire-burn', 'c-fire', 0, 3, 8);
    createStripAnim('c-glint-twinkle', 'c-glint', 0, 5, 6);
    createStripAnim('c-sheep-idle', 'c-sheep', 0, 3, 5);
    createStripAnim('c-chicken-idle', 'c-chicken', 0, 3, 6);
    createStripAnim('c-duck-idle', 'c-duck', 0, 3, 5);

    createStripAnim('c-idle-base', 'c-human-idle-base', 0, 8, 8);
    createStripAnim('c-idle-short', 'c-human-idle-short', 0, 8, 8);
    createStripAnim('c-idle-long', 'c-human-idle-long', 0, 8, 8);
    createStripAnim('c-walk-base', 'c-human-walk-base', 0, 7, 10);
    createStripAnim('c-walk-short', 'c-human-walk-short', 0, 7, 10);
    createStripAnim('c-walk-long', 'c-human-walk-long', 0, 7, 10);
  }

  private buildGardenExterior(): void {
    // Rich pastoral meadow filling Desktop Panorama (0..384) & Mobile Band (16..328)
    for (let y = 16; y < 328; y += 16) {
      for (let x = 0; x < 384; x += 16) {
        const useAlt = ((x / 16 + y / 16) % 5) === 0;
        this.add
          .image(x, y, 'c-tiles', useAlt ? 'grass_b' : 'grass_a')
          .setOrigin(0, 0)
          .setDepth(1);
      }
    }

    // Scattered clovers & tiny daisies across grass
    const decals: [number, number][] = [
      [112, 180],
      [160, 210],
      [256, 176],
      [288, 256],
      [48, 224],
      [336, 208],
      [128, 296],
      [240, 296],
    ];
    for (const [dx, dy] of decals) {
      this.add.image(dx, dy, 'c-tiles', 'grass_flower').setOrigin(0, 0).setDepth(2);
    }

    // Sparkling creek running horizontally through bottom foreground (y: 256..288)
    for (let py = 256; py <= 272; py += 16) {
      for (let px = 48; px <= 336; px += 16) {
        this.add.image(px, py, 'c-tiles', 'water_fill').setOrigin(0, 0).setDepth(3);
      }
    }
    // Water glints & paddling yellow duck
    for (const gx of [120, 172, 232, 266]) {
      const gl = this.add.sprite(gx, 266, 'c-glint', 0).setDepth(4);
      gl.play('c-glint-twinkle');
    }
    const duck = this.add.sprite(242, 272, 'c-duck', 0).setOrigin(0.5, 1).setDepth(272);
    duck.play('c-duck-idle');

    // Warm dirt garden path leading down from doorway across bridge
    for (let y = 160; y <= 240; y += 16) {
      this.add.image(176, y, 'c-tiles', 'dirt_path').setOrigin(0, 0).setDepth(4);
      this.add.image(192, y, 'c-tiles', 'dirt_path').setOrigin(0, 0).setDepth(4);
    }
    placeProp(this, 'c-tiles', 'bridge_v', 192, 288, -260);
    this.add.image(176, 288, 'c-tiles', 'dirt_path').setOrigin(0, 0).setDepth(4);
    this.add.image(192, 288, 'c-tiles', 'dirt_path').setOrigin(0, 0).setDepth(4);

    // Sunflower & Vegetable crop plot inside hero stage (right of path!)
    for (let sx = 224; sx <= 272; sx += 16) {
      this.add.image(sx, 208, 'c-tiles', 'dirt_soil').setOrigin(0, 0).setDepth(4);
      this.add.image(sx, 224, 'c-tiles', 'dirt_soil').setOrigin(0, 0).setDepth(4);
    }
    placeProp(this, 'c-tiles', 'fence_strip', 248, 204);
    this.add.image(232, 220, 'c-crop-sun5').setOrigin(0.5, 1).setDepth(220);
    this.add.image(248, 220, 'c-crop-sun4').setOrigin(0.5, 1).setDepth(220);
    this.add.image(264, 220, 'c-crop-sun5').setOrigin(0.5, 1).setDepth(220);
    this.add.image(232, 236, 'c-crop-beet5').setOrigin(0.5, 1).setDepth(236);
    this.add.image(248, 236, 'c-crop-cab3').setOrigin(0.5, 1).setDepth(236);
    this.add.image(264, 236, 'c-crop-beet5').setOrigin(0.5, 1).setDepth(236);

    // Animated swaying oak trees around garden perimeter
    const treePos: [number, number][] = [
      [104, 204],
      [284, 204],
      [34, 152],
      [352, 166],
      [112, 308],
      [272, 308],
    ];
    for (const [tx, ty] of treePos) {
      placeSoftShadow(this, tx, ty - 2, 24, 9, 10, 0.65);
      const tr = this.add.sprite(tx, ty, 'c-tree-01', 0).setOrigin(0.5, 1).setDepth(ty);
      tr.play('c-tree-sway');
    }

    // Left Desktop Wing: Sunnyside Orange Cottage with rising Chimney Smoke!
    placeSoftShadow(this, 56, 238, 48, 14, 20, 0.72);
    placeProp(this, 'c-tiles', 'house_orange', 56, 240);
    const smoke = this.add.sprite(56, 178, 'c-smoke', 0).setOrigin(0.5, 1).setDepth(260);
    smoke.play('c-smoke-rise');

    // Right Desktop Wing: Spinning Sunnyside Windmill kept clean in right wing!
    const windTower = this.add.sprite(346, 238, 'c-windmill', 0).setOrigin(0.5, 1).setDepth(238);
    windTower.play('c-windmill-spin');

    // Sheep grazing left foreground (hero stage) + Hen strutting right of path
    const sheepShadow = placeSoftShadow(this, 134, 224, 18, 6, 210, 0.6);
    const sheep = this.add.sprite(134, 226, 'c-sheep', 0).setOrigin(0.5, 0.84).setDepth(226);
    sheep.play('c-sheep-idle');
    void sheepShadow;

    const chicken = this.add
      .sprite(148, 246, 'c-chicken', 0)
      .setOrigin(0.5, 0.82)
      .setDepth(246)
      .setFlipX(true);
    chicken.play('c-chicken-idle');
  }

  private buildRusticInterior(): void {
    // Warm timber cabin interior centered at x: 96..288, y: 36..160 (12x7.75 tiles)
    const rx = 96;
    const ry = 36;
    const rw = 192;
    const rh = 124;

    const frame = this.add.graphics().setDepth(4);
    frame.fillStyle(0x231a16, 0.75);
    frame.fillRoundedRect(rx - 4, ry - 4, rw + 8, rh + 10, 4);
    frame.lineStyle(2, 0x6e472d, 1);
    frame.strokeRoundedRect(rx - 2, ry - 2, rw + 4, rh + 4, 3);

    // Repeating honey plank floorboards
    for (let y = ry + 24; y < ry + rh; y += 16) {
      for (let x = rx; x < rx + rw; x += 16) {
        this.add.image(x, y, 'c-tiles', 'plank_floor').setOrigin(0, 0).setDepth(6);
      }
    }

    // Clean warm wooden & cream cabin interior wall
    const wallG = this.add.graphics().setDepth(8);
    wallG.fillStyle(0xd9ba8f, 1);
    wallG.fillRect(rx, ry, rw, 22);
    wallG.fillStyle(0x9b6b43, 1);
    wallG.fillRect(rx, ry, rw, 5);
    wallG.fillRect(rx, ry + 20, rw, 4);
    for (let px = rx + 24; px < rx + rw; px += 48) {
      wallG.fillStyle(0x875835, 1);
      wallG.fillRect(px, ry + 5, 3, 15);
    }

    // Diagonal golden morning light beams from sunlit wall frames (clipped cleanly above rug)
    placeSunbeam(this, rx + 52, ry + 24, 14, 24, 46, 0.13, 15);
    placeSunbeam(this, rx + 140, ry + 24, 14, 24, 46, 0.13, 15);

    // Wall frames
    placeProp(this, 'c-tiles', 'frame_small', rx + 52, ry + 20, 10);
    placeProp(this, 'c-tiles', 'frame_gold', rx + 140, ry + 20, 10);

    // Left bedroom alcove: Royal crimson rug + Side-by-side red beds + Colorful bookcase
    this.add.image(134, 114, 'c-tiles', 'rug_royal').setOrigin(0.5, 0.5).setDepth(18);
    placeProp(this, 'c-tiles', 'bed_red_a', rx + 18, ry + 56);
    placeProp(this, 'c-tiles', 'bed_red_b', rx + 34, ry + 56);
    placeProp(this, 'c-tiles', 'bookshelf_colors', rx + 62, ry + 52);
    placeProp(this, 'c-tiles', 'shelf_a', rx + 78, ry + 52);

    // Center glowing hearth / campfire corner with potted sunflowers
    placeProp(this, 'c-tiles', 'cabinet_wood', rx + 106, ry + 52);
    placeProp(this, 'c-tiles', 'sunflower_pot_a', rx + 124, ry + 54);
    placeProp(this, 'c-tiles', 'daisy_pot_b', rx + 178, ry + 54);

    // Animated warm hearth flame on stone pad
    const hearth = this.add.graphics().setDepth(19);
    hearth.fillStyle(0x4a4347, 1);
    hearth.fillRoundedRect(240, 62, 22, 16, 4);
    const fire = this.add.sprite(251, 74, 'c-fire', 0).setOrigin(0.5, 1).setScale(1.4).setDepth(78);
    fire.play('c-fire-burn');
    placeWarmLight(this, 251, 70, 52, 0xffb85c, 0.44, 880);

    // Right living nook: Round red rug + Wooden dining table & bench
    this.add.image(236, 122, 'c-tiles', 'rug_round').setOrigin(0.5, 0.5).setDepth(18);
    placeSoftShadow(this, 236, 122, 20, 8, 85);
    placeProp(this, 'c-tiles', 'table_wood', 236, 124);
    placeProp(this, 'c-tiles', 'bench_h', 236, 144);
    placeProp(this, 'c-tiles', 'sunflower_pot_b', rx + 16, ry + 114);

    // Welcoming threshold stepping out to path
    const door = this.add.graphics().setDepth(16);
    door.fillStyle(0xe5b985, 1);
    door.fillRect(178, ry + rh - 2, 28, 6);
  }

  private buildCharactersAndAnimals(): void {
    // Layered Modular Sunnyside Human: Nắng inside by the royal carpet & sunflowers
    const haAnh = this.createSunnysideHuman({
      x: 164,
      y: 120,
      hairAnimWalk: 'c-walk-long',
      hairAnimIdle: 'c-idle-long',
      hairSheetWalk: 'c-human-walk-long',
      hairSheetIdle: 'c-human-idle-long',
      hairTint: 0xffe3e3,
      bodyTint: 0xfff5ed,
      name: 'Nắng',
      accentHex: '#f0b86b',
    });

    this.tweens.add({
      targets: haAnh.container,
      x: 202,
      duration: 2600,
      yoyo: true,
      hold: 1500,
      repeatDelay: 1200,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onStart: () => haAnh.setWalking(true, false),
      onYoyo: () => haAnh.setWalking(false, false),
      onRepeat: () => haAnh.setWalking(true, true),
      onUpdate: (_tween, _target, _key, current, prev) => {
        haAnh.setFlipX(current < prev);
        haAnh.container.setDepth(Math.round(haAnh.container.y));
      },
    });

    // Layered Modular Sunnyside Human: Mây out in the sunlit garden by sunflowers & path
    const may = this.createSunnysideHuman({
      x: 188,
      y: 214,
      hairAnimWalk: 'c-walk-short',
      hairAnimIdle: 'c-idle-short',
      hairSheetWalk: 'c-human-walk-short',
      hairSheetIdle: 'c-human-idle-short',
      hairTint: 0xb0d8f0,
      bodyTint: 0xf0f6ff,
      name: 'Mây',
      accentHex: '#82d1a0',
    });

    this.tweens.add({
      targets: may.container,
      x: 218,
      duration: 2800,
      yoyo: true,
      hold: 1700,
      repeatDelay: 1400,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (_tween, _target, _key, current, prev) => {
        if (Math.abs(current - prev) > 0.01) {
          may.setWalking(true, current < prev);
        } else {
          may.setWalking(false, false);
        }
        may.container.setDepth(Math.round(may.container.y));
      },
    });

    // Snowy white bunny (Frakassets CC BY 4.0) hopping beside the garden path!
    placeSoftShadow(this, 166, 198, 12, 5, 190, 0.55);
    const bunny = this.add.sprite(166, 198, 'c-bunny-sheet').setOrigin(0.5, 0.85).setDepth(198);
    bunny.play('c-bunny-Idle_South');
  }

  private createSunnysideHuman(opts: {
    x: number;
    y: number;
    hairAnimIdle: string;
    hairAnimWalk: string;
    hairSheetIdle: string;
    hairSheetWalk: string;
    hairTint: number;
    bodyTint: number;
    name: string;
    accentHex: string;
  }): {
    container: Phaser.GameObjects.Container;
    setFlipX: (flip: boolean) => void;
    setWalking: (walk: boolean, flip: boolean) => void;
  } {
    // Feet sit at y=39 inside 96x64 Sunnyside frames -> originY = 39/64 ~= 0.61
    const shadow = this.add.image(0, -1, 'demo-soft-shadow').setDisplaySize(13, 5).setAlpha(0.7);
    const body = this.add
      .sprite(0, 0, 'c-human-idle-base', 0)
      .setOrigin(0.5, 0.61)
      .setTint(opts.bodyTint);
    const hair = this.add
      .sprite(0, 0, opts.hairSheetIdle, 0)
      .setOrigin(0.5, 0.61)
      .setTint(opts.hairTint);
    const tag = createCozyNameTag(this, 0, -23, opts.name, opts.accentHex);

    body.play('c-idle-base');
    hair.play(opts.hairAnimIdle);

    const container = this.add.container(opts.x, opts.y, [shadow, body, hair, tag]);
    container.setDepth(opts.y);

    let isWalking = false;

    return {
      container,
      setFlipX: (flip: boolean) => {
        body.setFlipX(flip);
        hair.setFlipX(flip);
      },
      setWalking: (walk: boolean, flip: boolean) => {
        body.setFlipX(flip);
        hair.setFlipX(flip);
        if (walk === isWalking) return;
        isWalking = walk;
        if (walk) {
          body.play('c-walk-base', true);
          hair.play(opts.hairAnimWalk, true);
        } else {
          body.play('c-idle-base', true);
          hair.play(opts.hairAnimIdle, true);
        }
      },
    };
  }
}
