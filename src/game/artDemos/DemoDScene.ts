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
  interior: { cx: 192, cy: 102, fitW: 214, fitH: 124, maxZoom: 4 },
  garden: { cx: 192, cy: 232, fitW: 260, fitH: 150, maxZoom: 3.5 },
};

export class DemoDScene extends Phaser.Scene {
  private motes: FloatingMote[] = [];
  private moteBounds = { x: 8, y: 120, w: 368, h: 205 };
  private initialPreset: CameraPreset = 'overview';

  constructor(initialPreset: CameraPreset = 'overview') {
    super({ key: 'DemoDScene' });
    this.initialPreset = initialPreset;
  }

  preload(): void {
    const mi = `${ASSET_CANDIDATES_BASE}/modern-interiors-free`;
    const cl = `${ASSET_CANDIDATES_BASE}/cozy-lands-basic`;

    // Modern Interiors Free v2.2
    this.load.image('d-room', `${mi}/Interiors_free/16x16/Room_Builder_free_16x16.png`);
    this.load.image('d-interiors', `${mi}/Interiors_free/16x16/Interiors_free_16x16.png`);
    this.load.spritesheet('d-adam-idle', `${mi}/Characters_free/Adam_idle_anim_16x16.png`, {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet('d-adam-run', `${mi}/Characters_free/Adam_run_16x16.png`, {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet('d-amelia-idle', `${mi}/Characters_free/Amelia_idle_anim_16x16.png`, {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet('d-amelia-sit', `${mi}/Characters_free/Amelia_sit_16x16.png`, {
      frameWidth: 16,
      frameHeight: 32,
    });

    // Compatible Cozy Lands Basic Exterior
    this.load.image('d-grass', `${cl}/Terrain/Tilesets/Grass/grass01.png`);
    this.load.image('d-soil', `${cl}/Terrain/Tilesets/Soil/soil.png`);
    this.load.image('d-water', `${cl}/Terrain/Tilesets/Water/water.png`);
    this.load.image('d-house1', `${cl}/Buildings/house_01.png`);
    this.load.image('d-house2', `${cl}/Buildings/house_02.png`);
    this.load.image('d-tree', `${cl}/Objects/Nature/tree.png`);
    this.load.image('d-flowers', `${cl}/Objects/Nature/flower_b.png`);
    this.load.image('d-other', `${cl}/Objects/Object/other.png`);
    this.load.image('d-fence', `${cl}/Objects/Object/fence.png`);
    this.load.image('d-bridge', `${cl}/Objects/Object/bridge.png`);
    this.load.spritesheet('d-chicken', `${cl}/Animals/Chicken/chicken_idle01.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });

    preloadFrakassetsPet(this, 'd-cat', 'cat-orange', 'outline');
    preloadFrakassetsPet(this, 'd-shiba', 'puppy-shiba', 'outline');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(ART_DEMO_METADATA.D.backdropHex);
    ensureLightingTextures(this);
    this.registerFrames();
    this.registerAnims();
    createFrakassetsPetAnims(this, 'd-cat');
    createFrakassetsPetAnims(this, 'd-shiba');

    this.buildCozyLandsExterior();
    this.buildModernApartmentInterior();
    this.buildCharactersAndPets();

    this.motes = createAmbientMotes(this, this.moteBounds, 'firefly', 18);
    applyDemoCameraPreset(this, LAYOUT, this.initialPreset);
    markArtDemoReadyWhenSettled(this, 'D', LAYOUT, this.initialPreset);
  }

  update(_time: number, delta: number): void {
    updateAmbientMotes(this.motes, this.moteBounds, delta / 1000, this.time.now / 1000, 'firefly');
  }

  private registerFrames(): void {
    // Room_Builder_free_16x16.png (verified coordinates)
    defineTileFrames(this, 'd-room', [
      { name: 'wall_cream_top', col: 5, row: 7 },
      { name: 'wall_cream_base', col: 5, row: 8 },
      { name: 'floor_herringbone', col: 11, row: 13, wTiles: 2, hTiles: 2 },
      { name: 'floor_cream_tile', col: 11, row: 8, wTiles: 2, hTiles: 2 },
    ]);

    // Interiors_free_16x16.png (verified coordinates)
    definePixelFrames(this, 'd-interiors', [
      { name: 'bed_couple_plush', x: 7 * 16, y: 45 * 16 + 10, w: 48, h: 38 },
      { name: 'wardrobe_gold', x: 0, y: 45 * 16 + 10, w: 32, h: 38 },
    ]);
    defineTileFrames(this, 'd-interiors', [
      { name: 'fireplace_brick', col: 4, row: 68, wTiles: 3, hTiles: 3 },
      { name: 'sofa_plush', col: 1, row: 73, wTiles: 3, hTiles: 2 },
      { name: 'rug_crimson_lg', col: 6, row: 15, wTiles: 4, hTiles: 3 },
      { name: 'rug_tall_red', col: 13, row: 16, wTiles: 3, hTiles: 4 },
      { name: 'rug_gold_mat', col: 12, row: 20 },
      { name: 'table_oak_coffee', col: 7, row: 13, wTiles: 3, hTiles: 2 },
      { name: 'table_oak_dining', col: 0, row: 10, wTiles: 3, hTiles: 2 },
      { name: 'armchair_tan', col: 1, row: 21, wTiles: 1, hTiles: 2 },
      { name: 'curtain_window', col: 4, row: 24, wTiles: 3, hTiles: 2 },
      { name: 'wood_window', col: 7, row: 24, wTiles: 2, hTiles: 2 },
      { name: 'bookshelf_tall', col: 5, row: 14, wTiles: 2, hTiles: 3 },
      { name: 'bookshelf_wide', col: 10, row: 69, wTiles: 3, hTiles: 2 },
      { name: 'wardrobe_oak', col: 12, row: 49, wTiles: 2, hTiles: 2 },
      { name: 'desk_pc_setup', col: 11, row: 40, wTiles: 2, hTiles: 2 },
      { name: 'plant_monstera', col: 11, row: 46, wTiles: 1, hTiles: 2 },
      { name: 'plant_palm', col: 13, row: 46, wTiles: 1, hTiles: 2 },
      { name: 'fairy_lights', col: 10, row: 47, wTiles: 3, hTiles: 1 },
      { name: 'lamp_floor_cream', col: 11, row: 56, wTiles: 1, hTiles: 2 },
      { name: 'lamp_table_cream', col: 14, row: 54 },
      { name: 'cake_plate', col: 11, row: 14 },
      { name: 'berry_plate', col: 12, row: 14 },
    ]);

    // Cozy Lands Basic frames (row 4 cols 6..7 have pure lush green grass without bitmask dots!)
    defineTileFrames(this, 'd-grass', [
      { name: 'grass_fill', col: 6, row: 4 },
      { name: 'grass_sprig', col: 10, row: 2 },
      { name: 'grass_clover', col: 11, row: 2 },
      { name: 'grass_tiny_flower', col: 10, row: 4 },
    ]);
    defineTileFrames(this, 'd-soil', [
      { name: 'soil_fill', col: 5, row: 1 },
      { name: 'pebbles', col: 11, row: 1 },
    ]);
    defineTileFrames(this, 'd-water', [{ name: 'water_fill', col: 3, row: 2 }]);
    defineTileFrames(this, 'd-flowers', [
      { name: 'flower_blue', col: 0, row: 0 },
      { name: 'flower_red', col: 1, row: 0 },
      { name: 'flower_sky', col: 2, row: 0 },
    ]);
    defineTileFrames(this, 'd-other', [
      { name: 'planter_box', col: 0, row: 0, wTiles: 2, hTiles: 1 },
      { name: 'barrel', col: 2, row: 0 },
      { name: 'crate', col: 3, row: 1 },
      { name: 'mailbox_red', col: 4, row: 0, wTiles: 1, hTiles: 2 },
      { name: 'stepping_stones', col: 5, row: 0, wTiles: 1, hTiles: 2 },
    ]);
    defineTileFrames(this, 'd-fence', [
      { name: 'fence_h', col: 1, row: 3 },
      { name: 'fence_end', col: 0, row: 3 },
    ]);
    definePixelFrames(this, 'd-tree', [
      { name: 'tree_autumn', x: 48, y: 0, w: 32, h: 48 },
      { name: 'tree_green', x: 176, y: 0, w: 32, h: 48 },
    ]);
  }

  private registerAnims(): void {
    const mk = (key: string, sheet: string, start: number, end: number, rate: number) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(sheet, { start, end }),
        frameRate: rate,
        repeat: -1,
      });
    };

    mk('d-adam-idle-down', 'd-adam-idle', 18, 23, 7);
    mk('d-adam-run-right', 'd-adam-run', 0, 5, 10);
    mk('d-adam-run-left', 'd-adam-run', 12, 17, 10);
    mk('d-amelia-idle-down', 'd-amelia-idle', 18, 23, 7);
    mk('d-amelia-sit-right', 'd-amelia-sit', 0, 5, 5);
    mk('d-chicken-pecking', 'd-chicken', 0, 3, 5);
  }

  private buildCozyLandsExterior(): void {
    // Cozy Lands pastel meadow exact tile color (0x9ebd64) so grass/clover accents blend seamlessly
    const meadowBg = this.add.graphics().setDepth(0);
    meadowBg.fillStyle(0x9ebd64, 1);
    meadowBg.fillRect(0, 16, 384, 312);

    // Organic grass blades & micro clovers across meadow
    const meadowSpots: [number, number, string][] = [
      [112, 180, 'grass_sprig'],
      [160, 212, 'grass_clover'],
      [240, 180, 'grass_tiny_flower'],
      [272, 236, 'grass_sprig'],
      [40, 232, 'grass_clover'],
      [332, 224, 'grass_tiny_flower'],
      [130, 300, 'grass_clover'],
      [256, 300, 'grass_sprig'],
      [76, 140, 'grass_tiny_flower'],
      [308, 132, 'grass_clover'],
      [120, 260, 'grass_sprig'],
      [260, 286, 'grass_tiny_flower'],
    ];
    for (const [gx, gy, fr] of meadowSpots) {
      this.add.image(gx, gy, 'd-grass', fr).setOrigin(0, 0).setDepth(2);
    }

    // Calm cerulean pond & wooden bridge in foreground
    for (let py = 264; py <= 280; py += 16) {
      for (let px = 88; px <= 296; px += 16) {
        this.add.image(px, py, 'd-water', 'water_fill').setOrigin(0, 0).setDepth(3);
      }
    }
    this.add.image(192, 280, 'd-bridge').setOrigin(0.5, 0.5).setDepth(5);

    // Stepping stone & dirt garden path leading down from apartment balcony doors across bridge
    for (let py = 164; py <= 244; py += 16) {
      this.add.image(176, py, 'd-soil', 'soil_fill').setOrigin(0, 0).setDepth(4);
      this.add.image(192, py, 'd-soil', 'soil_fill').setOrigin(0, 0).setDepth(4);
    }
    placeProp(this, 'd-other', 'stepping_stones', 192, 214, -200);
    this.add.image(176, 296, 'd-soil', 'soil_fill').setOrigin(0, 0).setDepth(4);
    this.add.image(192, 296, 'd-soil', 'soil_fill').setOrigin(0, 0).setDepth(4);

    // Front patio fences, flower planters & cozy red mailbox!
    placeProp(this, 'd-other', 'planter_box', 152, 174);
    placeProp(this, 'd-other', 'planter_box', 232, 174);
    placeProp(this, 'd-other', 'mailbox_red', 216, 188);
    placeProp(this, 'd-fence', 'fence_h', 120, 206);
    placeProp(this, 'd-fence', 'fence_h', 136, 206);
    placeProp(this, 'd-fence', 'fence_h', 248, 206);
    placeProp(this, 'd-fence', 'fence_h', 264, 206);

    // Hero garden flowerbeds (left & right of stepping path)
    const flowerBeds: [number, number, string][] = [
      [124, 232, 'flower_blue'],
      [142, 232, 'flower_red'],
      [124, 248, 'flower_sky'],
      [244, 232, 'flower_red'],
      [262, 232, 'flower_blue'],
      [252, 248, 'flower_sky'],
      [148, 304, 'flower_blue'],
      [234, 304, 'flower_red'],
    ];
    for (const [fx, fy, fr] of flowerBeds) {
      placeProp(this, 'd-flowers', fr, fx, fy);
    }

    // Autumn peach & fresh green trees framing Desktop Wings & Hero Borders
    const trees: [number, number, string][] = [
      [104, 216, 'tree_autumn'],
      [282, 216, 'tree_green'],
      [32, 152, 'tree_green'],
      [350, 154, 'tree_autumn'],
      [108, 314, 'tree_autumn'],
      [276, 314, 'tree_green'],
    ];
    for (const [tx, ty, fr] of trees) {
      placeSoftShadow(this, tx, ty - 2, 28, 10, 10, 0.65);
      placeProp(this, 'd-tree', fr, tx, ty);
    }

    // Left & Right Desktop panoramic cottages tucked cleanly in outer wings
    placeSoftShadow(this, 42, 236, 86, 18, 20, 0.7);
    this.add.image(42, 240, 'd-house1').setOrigin(0.5, 1).setDepth(240);

    placeSoftShadow(this, 344, 236, 86, 18, 20, 0.7);
    this.add.image(344, 240, 'd-house2').setOrigin(0.5, 1).setDepth(240);

    // Friendly Cozy Lands chickens in foreground garden
    const ch = this.add.sprite(140, 256, 'd-chicken', 0).setOrigin(0.5, 1).setDepth(256);
    ch.play('d-chicken-pecking');
  }

  private buildModernApartmentInterior(): void {
    // Detailed Modern Couple Apartment (x: 96..288, y: 32..164 -> 12 x 8.25 tiles)
    const rx = 96;
    const ry = 32;
    const rw = 192;
    const rh = 132;

    const shell = this.add.graphics().setDepth(4);
    shell.fillStyle(0x1b1824, 0.85);
    shell.fillRoundedRect(rx - 4, ry - 4, rw + 8, rh + 10, 4);
    shell.lineStyle(2, 0x474159, 1);
    shell.strokeRoundedRect(rx - 2, ry - 2, rw + 4, rh + 4, 3);

    // Warm herringbone hardwood across main apartment floor (32x32 tiles)
    for (let y = ry + 32; y < ry + rh; y += 32) {
      for (let x = rx; x < rx + rw; x += 32) {
        const w = Math.min(32, rx + rw - x);
        const h = Math.min(32, ry + rh - y);
        const fl = this.add
          .image(x, y, 'd-room', 'floor_herringbone')
          .setOrigin(0, 0)
          .setDepth(6);
        if (w < 32 || h < 32) fl.setCrop(0, 0, w, h);
      }
    }

    // Soft cream tile floor under study/tea nook (top right inside apartment)
    for (let y = ry + 32; y < ry + 96; y += 32) {
      this.add.image(rx + 128, y, 'd-room', 'floor_cream_tile').setOrigin(0, 0).setDepth(7);
      this.add.image(rx + 160, y, 'd-room', 'floor_cream_tile').setOrigin(0, 0).setDepth(7);
    }

    // Warm cream apartment back walls (`r7..8` -> 32px tall)
    for (let x = rx; x < rx + rw; x += 16) {
      this.add.image(x, ry, 'd-room', 'wall_cream_top').setOrigin(0, 0).setDepth(8);
      this.add.image(x, ry + 16, 'd-room', 'wall_cream_base').setOrigin(0, 0).setDepth(8);
    }

    // Curtain window & fairy lights hung cleanly on cream walls
    placeProp(this, 'd-interiors', 'curtain_window', rx + 36, ry + 32, 10);
    placeSunbeam(this, rx + 36, ry + 32, 34, 48, 66, 0.14, 15);

    placeProp(this, 'd-interiors', 'fairy_lights', rx + 152, ry + 26, 14);
    placeSunbeam(this, rx + 144, ry + 32, 24, 38, 64, 0.12, 15);
    placeWarmLight(this, rx + 152, ry + 24, 34, 0xffe49e, 0.25, 860);

    // Left Dining & Reading Corner: Oak Dining Table + Cozy Armchairs + Tea/Cake + Table Lamp
    placeSoftShadow(this, rx + 36, ry + 72, 46, 12, 40);
    placeProp(this, 'd-interiors', 'table_oak_dining', rx + 36, ry + 72);
    placeProp(this, 'd-interiors', 'cake_plate', rx + 30, ry + 58, 120);
    placeProp(this, 'd-interiors', 'lamp_table_cream', rx + 48, ry + 54, 120);
    placeWarmLight(this, rx + 48, ry + 46, 28, 0xffd284, 0.34, 865);
    placeProp(this, 'd-interiors', 'armchair_tan', rx + 18, ry + 86);
    placeProp(this, 'd-interiors', 'armchair_tan', rx + 54, ry + 86);

    // Center Living & Brick Fireplace Lounge
    placeSoftShadow(this, rx + 96, ry + 54, 48, 12, 42);
    placeProp(this, 'd-interiors', 'fireplace_brick', rx + 96, ry + 54);
    placeWarmLight(this, rx + 96, ry + 48, 54, 0xffa852, 0.45, 885);

    // Crimson Persian Rug + Plush Grey-Blue Sofa + Coffee Table + Cake/Tea + Floor Lamp
    this.add.image(rx + 96, ry + 102, 'd-interiors', 'rug_crimson_lg').setOrigin(0.5, 0.5).setDepth(18);
    placeSoftShadow(this, rx + 96, ry + 84, 46, 10, 74);
    placeProp(this, 'd-interiors', 'sofa_plush', rx + 96, ry + 84);
    placeSoftShadow(this, rx + 96, ry + 112, 44, 10, 100);
    placeProp(this, 'd-interiors', 'table_oak_coffee', rx + 96, ry + 112);
    placeProp(this, 'd-interiors', 'cake_plate', rx + 88, ry + 100, 120);
    placeProp(this, 'd-interiors', 'berry_plate', rx + 104, ry + 100, 120);

    placeProp(this, 'd-interiors', 'lamp_floor_cream', rx + 132, ry + 78);
    placeWarmLight(this, rx + 132, ry + 62, 34, 0xffd584, 0.36, 875);

    // Right Study / Couple PC Corner + Monstera & Tall Bookshelf
    placeProp(this, 'd-interiors', 'bookshelf_wide', rx + 158, ry + 50);
    placeProp(this, 'd-interiors', 'plant_monstera', rx + 182, ry + 56);
    placeSoftShadow(this, rx + 166, ry + 92, 32, 10, 82);
    placeProp(this, 'd-interiors', 'desk_pc_setup', rx + 166, ry + 92);

    // Left Tall Bookshelf & Armchair beside cozy doorway
    placeProp(this, 'd-interiors', 'bookshelf_tall', rx + 18, ry + 116);
    placeProp(this, 'd-interiors', 'plant_palm', rx + 42, ry + 122);

    // Balcony / Front Apartment Doorway opening cleanly onto Cozy Lands patio
    const door = this.add.graphics().setDepth(16);
    door.fillStyle(0xe8c79e, 1);
    door.fillRect(178, ry + rh - 2, 28, 6);
  }

  private buildCharactersAndPets(): void {
    // Nắng (Amelia) standing cleanly between dining table and plush lounge
    placeSoftShadow(this, 152, 132, 12, 5, 126);
    const haAnh = this.add.sprite(152, 132, 'd-amelia-idle', 18).setOrigin(0.5, 1).setDepth(132);
    createCozyNameTag(this, 152, 102, 'Nắng', '#f2a2ba');
    haAnh.play('d-amelia-idle-down');

    // Mây (Adam) facing forward smiling on the garden path, then gently strolling
    const mayShadow = placeSoftShadow(this, 184, 214, 12, 5, 206);
    const may = this.add.sprite(184, 214, 'd-adam-idle', 18).setOrigin(0.5, 1).setDepth(214);
    const tagMay = createCozyNameTag(this, 184, 186, 'Mây', '#8bc4d9');
    may.play('d-adam-idle-down');

    this.tweens.add({
      targets: may,
      x: 202,
      delay: 1400,
      duration: 2400,
      yoyo: true,
      hold: 1800,
      repeatDelay: 1600,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (_t, _target, _k, cur, prev) => {
        mayShadow.x = may.x;
        tagMay.x = may.x;
        may.setDepth(Math.round(may.y));
        const dx = cur - prev;
        if (dx > 0.03) may.play('d-adam-run-right', true);
        else if (dx < -0.03) may.play('d-adam-run-left', true);
        else may.play('d-adam-idle-down', true);
      },
    });

    // Orange kitty sleeping cozily on the crimson living room rug
    placeSoftShadow(this, 214, 146, 13, 5, 140, 0.5);
    const cat = this.add.sprite(214, 146, 'd-cat-sheet').setOrigin(0.5, 0.85).setDepth(146);
    cat.play('d-cat-Sleep_South');

    // Shiba puppy playing happily out on the garden path!
    placeSoftShadow(this, 216, 228, 13, 5, 222, 0.55);
    const shiba = this.add.sprite(216, 228, 'd-shiba-sheet').setOrigin(0.5, 0.85).setDepth(228);
    shiba.play('d-shiba-Happy_South');
  }
}
