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
  desktopOverview: { cx: 192, cy: 170, fitW: 384, fitH: 236, maxZoom: 3 },
  mobileOverview: { cx: 192, cy: 172, fitW: 224, fitH: 304, maxZoom: 2 },
  interior: { cx: 192, cy: 108, fitW: 200, fitH: 120, maxZoom: 4 },
  garden: { cx: 192, cy: 220, fitW: 240, fitH: 140, maxZoom: 3.5 },
};

export class DemoAScene extends Phaser.Scene {
  private motes: FloatingMote[] = [];
  private moteBounds = { x: 24, y: 120, w: 336, h: 190 };
  private initialPreset: CameraPreset = 'overview';

  constructor(initialPreset: CameraPreset = 'overview') {
    super({ key: 'DemoAScene' });
    this.initialPreset = initialPreset;
  }

  preload(): void {
    this.load.image(
      'a-farm',
      `${ASSET_CANDIDATES_BASE}/cozy-farm-free/free version/free.png`,
    );
    this.load.image(
      'a-interior',
      `${ASSET_CANDIDATES_BASE}/cozy-interior-free/interior free/interior free.png`,
    );
    this.load.spritesheet(
      'a-char',
      `${ASSET_CANDIDATES_BASE}/cozy-people-free/char free/global.png`,
      { frameWidth: 32, frameHeight: 32 },
    );
    preloadFrakassetsPet(this, 'a-cat', 'cat-orange', 'outline');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(ART_DEMO_METADATA.A.backdropHex);
    ensureLightingTextures(this);
    this.registerFrames();
    createFrakassetsPetAnims(this, 'a-cat');

    this.buildGardenExterior();
    this.buildCozyInteriorRoom();
    this.buildCharactersAndPets();

    this.motes = createAmbientMotes(this, this.moteBounds, 'petal', 18);
    applyDemoCameraPreset(this, LAYOUT, this.initialPreset);
    markArtDemoReadyWhenSettled(this, 'A', LAYOUT, this.initialPreset);
  }

  update(_time: number, delta: number): void {
    updateAmbientMotes(this.motes, this.moteBounds, delta / 1000, this.time.now / 1000, 'petal');
  }

  private registerFrames(): void {
    defineTileFrames(this, 'a-farm', [
      { name: 'grass_c', col: 1, row: 1 },
      { name: 'grass_edge_t', col: 1, row: 0 },
      { name: 'grass_edge_l', col: 0, row: 1 },
      { name: 'grass_edge_r', col: 2, row: 1 },
      { name: 'grass_edge_b', col: 1, row: 2 },
      { name: 'grass_patch', col: 3, row: 0 },
      { name: 'dirt_l', col: 5, row: 0 },
      { name: 'dirt_c', col: 6, row: 0 },
      { name: 'dirt_r', col: 7, row: 0 },
      { name: 'pebble', col: 8, row: 0 },
      { name: 'flower_sprout', col: 9, row: 0 },
      { name: 'rock', col: 10, row: 0 },
      { name: 'flowers_blue', col: 11, row: 0 },
      { name: 'bag_potato', col: 4, row: 8 },
      { name: 'bag_tomato', col: 4, row: 9 },
      { name: 'soil_dot', col: 5, row: 8 },
      { name: 'crop_pot_1', col: 7, row: 8 },
      { name: 'crop_pot_2', col: 9, row: 8 },
      { name: 'crop_pot_3', col: 10, row: 8 },
      { name: 'crop_tom_1', col: 7, row: 9 },
      { name: 'crop_tom_2', col: 9, row: 9 },
      { name: 'crop_tom_3', col: 10, row: 9 },
      { name: 'basket_tom', col: 11, row: 9 },
    ]);

    definePixelFrames(this, 'a-farm', [
      { name: 'house_warm', x: 0, y: 48, w: 66, h: 80 },
      { name: 'tree', x: 160, y: 48, w: 48, h: 36 },
      { name: 'chicken_0', x: 0, y: 128, w: 16, h: 16 },
      { name: 'chicken_1', x: 16, y: 128, w: 16, h: 16 },
      { name: 'chicken_2', x: 32, y: 128, w: 16, h: 16 },
      { name: 'chicken_3', x: 48, y: 128, w: 16, h: 16 },
    ]);

    defineTileFrames(this, 'a-interior', [
      { name: 'table_wide', col: 0, row: 0, wTiles: 2, hTiles: 2 },
      { name: 'nightstand', col: 2, row: 0, wTiles: 1, hTiles: 2 },
      { name: 'chair_front', col: 3, row: 0, wTiles: 1, hTiles: 2 },
      { name: 'chair_right', col: 4, row: 0, wTiles: 1, hTiles: 2 },
      { name: 'chair_left', col: 5, row: 0, wTiles: 1, hTiles: 2 },
      { name: 'chair_back', col: 6, row: 0, wTiles: 1, hTiles: 2 },
      { name: 'wall_cream', col: 7, row: 0, wTiles: 1, hTiles: 2 },
      { name: 'wall_curtain', col: 8, row: 0, wTiles: 1, hTiles: 2 },
      { name: 'wall_wood', col: 9, row: 1, wTiles: 1, hTiles: 1 },
      { name: 'counter_stove', col: 0, row: 2 },
      { name: 'painting_meadow_a', col: 1, row: 2 },
      { name: 'painting_meadow_b', col: 2, row: 2 },
      { name: 'candles', col: 5, row: 2 },
      { name: 'potted_plant', col: 6, row: 2 },
      { name: 'rug_rose', col: 0, row: 3 },
      { name: 'frame_sky', col: 1, row: 3 },
      { name: 'frame_sunset', col: 2, row: 3 },
      { name: 'wood_bench', col: 5, row: 3, wTiles: 2, hTiles: 1 },
      { name: 'floor_block', col: 7, row: 2, wTiles: 3, hTiles: 2 },
    ]);
  }

  private buildGardenExterior(): void {
    // Rich continuous pastel meadow filling Desktop wings (0..384) and Mobile band (16..328)
    for (let y = 16; y < 328; y += 16) {
      for (let x = 0; x < 384; x += 16) {
        this.add.image(x, y, 'a-farm', 'grass_c').setOrigin(0, 0).setDepth(1);
      }
    }

    // Subtle flower & rock meadow accents (clean tiles only)
    const tuftSpots: [number, number, string][] = [
      [40, 166, 'flower_sprout'],
      [64, 212, 'flowers_blue'],
      [120, 276, 'flower_sprout'],
      [148, 240, 'flowers_blue'],
      [256, 206, 'flowers_blue'],
      [288, 256, 'flower_sprout'],
      [320, 178, 'flowers_blue'],
      [48, 256, 'flowers_blue'],
      [336, 240, 'rock'],
      [128, 304, 'flowers_blue'],
      [240, 304, 'flower_sprout'],
    ];
    for (const [gx, gy, fr] of tuftSpots) {
      this.add.image(gx, gy, 'a-farm', fr).setOrigin(0, 0).setDepth(2);
    }

    // Dirt walkway leading from cottage doorway out to the garden plot & mobile front meadow
    for (let y = 160; y <= 304; y += 16) {
      this.add.image(176, y, 'a-farm', 'dirt_c').setOrigin(0, 0).setDepth(3);
      this.add.image(192, y, 'a-farm', 'dirt_c').setOrigin(0, 0).setDepth(3);
    }
    // Horizontal cross-path to crop garden & side meadow
    for (let x = 88; x <= 272; x += 16) {
      this.add.image(x, 208, 'a-farm', 'dirt_c').setOrigin(0, 0).setDepth(3);
    }

    // Scenic Cozy Farm house tucked cleanly on the left panoramic wing
    placeSoftShadow(this, 44, 218, 62, 16, 40, 0.72);
    placeProp(this, 'a-farm', 'house_warm', 44, 222);

    // Lush trees framing the garden perimeter with snug trunk shadows
    const treeCoords: [number, number][] = [
      [32, 134],
      [340, 194],
      [348, 266],
      [108, 302],
      [278, 302],
      [30, 278],
    ];
    for (const [tx, ty] of treeCoords) {
      placeSoftShadow(this, tx, ty - 2, 24, 8, 10, 0.65);
      placeProp(this, 'a-farm', 'tree', tx, ty);
    }

    // Flower beds & rocks bordering paths
    const flowers: [number, number, string][] = [
      [148, 174, 'flowers_blue'],
      [236, 174, 'flowers_blue'],
      [130, 192, 'flower_sprout'],
      [252, 192, 'flowers_blue'],
      [152, 286, 'flowers_blue'],
      [230, 286, 'flowers_blue'],
      [112, 240, 'rock'],
      [264, 238, 'pebble'],
      [208, 294, 'flowers_blue'],
      [164, 294, 'flower_sprout'],
    ];
    for (const [fx, fy, fr] of flowers) {
      placeProp(this, 'a-farm', fr, fx, fy);
    }

    // Tilled mini kitchen garden plot (right foreground, visible on both Desktop & Mobile!)
    const cropRows: [number, number, string][] = [
      [216, 246, 'soil_dot'],
      [232, 246, 'soil_dot'],
      [248, 246, 'soil_dot'],
      [216, 244, 'crop_tom_2'],
      [232, 244, 'crop_tom_3'],
      [248, 244, 'crop_tom_1'],
      [216, 266, 'soil_dot'],
      [232, 266, 'soil_dot'],
      [248, 266, 'soil_dot'],
      [216, 264, 'crop_pot_2'],
      [232, 264, 'crop_pot_3'],
      [248, 264, 'basket_tom'],
      [264, 256, 'bag_tomato'],
    ];
    for (const [cx, cy, fr] of cropRows) {
      placeProp(this, 'a-farm', fr, cx, cy, fr === 'soil_dot' ? -50 : 0);
    }

    // Left foreground flower & chicken nook (visible on both Desktop & Mobile!)
    if (!this.anims.exists('a-chicken-pecking')) {
      this.anims.create({
        key: 'a-chicken-pecking',
        frames: [
          { key: 'a-farm', frame: 'chicken_0' },
          { key: 'a-farm', frame: 'chicken_1' },
          { key: 'a-farm', frame: 'chicken_2' },
          { key: 'a-farm', frame: 'chicken_3' },
        ],
        frameRate: 5,
        repeat: -1,
      });
    }
    const ch1 = this.add.sprite(132, 262, 'a-farm', 'chicken_0').setOrigin(0.5, 1).setDepth(262);
    placeSoftShadow(this, 132, 262, 12, 5, 250, 0.55);
    ch1.play('a-chicken-pecking');

    const ch2 = this.add
      .sprite(152, 272, 'a-farm', 'chicken_1')
      .setOrigin(0.5, 1)
      .setDepth(272)
      .setFlipX(true);
    placeSoftShadow(this, 152, 272, 12, 5, 260, 0.55);
    ch2.play('a-chicken-pecking');
  }

  private buildCozyInteriorRoom(): void {
    // Intimate couple cottage interior centered cleanly at x: 112..272, y: 40..158 (10 x 7.5 tiles)
    const rx = 112;
    const ry = 40;
    const rw = 160;
    const rh = 116;

    // Warm outer shadow frame
    const frame = this.add.graphics().setDepth(4);
    frame.fillStyle(0x2a1d22, 0.72);
    frame.fillRoundedRect(rx - 4, ry - 4, rw + 8, rh + 10, 4);
    frame.lineStyle(2, 0x5c3e36, 1);
    frame.strokeRoundedRect(rx - 2, ry - 2, rw + 4, rh + 4, 3);

    // Repeating cozy woven tatami/wood floor blocks (48x32) inside room bounds
    for (let y = ry + 32; y < ry + rh; y += 32) {
      for (let x = rx; x < rx + rw; x += 48) {
        const w = Math.min(48, rx + rw - x);
        const h = Math.min(32, ry + rh - y);
        const tile = this.add.image(x, y, 'a-interior', 'floor_block').setOrigin(0, 0).setDepth(6);
        if (w < 48 || h < 32) {
          tile.setCrop(0, 0, w, h);
        }
      }
    }

    // Top back wall (32px tall) mixing cream plaster + soft curtain panels
    for (let x = rx; x < rx + rw; x += 16) {
      const colIdx = (x - rx) / 16;
      const frameName = colIdx === 2 || colIdx === 7 ? 'wall_curtain' : 'wall_cream';
      this.add.image(x, ry, 'a-interior', frameName).setOrigin(0, 0).setDepth(8);
    }

    // Soft window sunbeams pouring down onto floor from curtain windows
    placeSunbeam(this, rx + 40, ry + 26, 14, 28, 54, 0.14, 15);
    placeSunbeam(this, rx + 120, ry + 26, 14, 28, 54, 0.14, 15);

    // Framed wall paintings
    placeProp(this, 'a-interior', 'frame_sky', rx + 64, ry + 24, 10);
    placeProp(this, 'a-interior', 'frame_sunset', rx + 96, ry + 24, 10);

    // Front kitchen/tea stove corner (top left of room)
    placeSoftShadow(this, rx + 20, ry + 48, 18, 6, 42);
    placeProp(this, 'a-interior', 'counter_stove', rx + 20, ry + 48);

    // Central tea table + candles + 2 chairs for couple date
    placeSoftShadow(this, 192, 114, 36, 12, 95);
    placeProp(this, 'a-interior', 'table_wide', 192, 112);
    placeProp(this, 'a-interior', 'candles', 192, 96, 115);
    placeWarmLight(this, 192, 86, 46, 0xffcc77, 0.38, 880);

    placeProp(this, 'a-interior', 'chair_right', 168, 110, 2);
    placeProp(this, 'a-interior', 'chair_left', 216, 110, 2);

    // Cozy nightstand tucked neatly against right wall away from cat rug
    placeSoftShadow(this, rx + 144, ry + 48, 16, 6, 42);
    placeProp(this, 'a-interior', 'potted_plant', rx + 144, ry + 48);
    placeProp(this, 'a-interior', 'nightstand', rx + 124, ry + 78);
    placeProp(this, 'a-interior', 'wood_bench', 142, 134);

    // Warm rose rug by entryway where the orange cat naps
    this.add.image(236, 134, 'a-interior', 'rug_rose').setOrigin(0.5, 0.5).setDepth(22).setScale(1.5, 1.3);
    placeWarmLight(this, 236, 134, 34, 0xffe0a8, 0.22, 870);

    // Welcoming doorway cutout at bottom center connecting room to garden path
    const doorG = this.add.graphics().setDepth(16);
    doorG.fillStyle(0xd9b896, 1);
    doorG.fillRect(178, ry + rh - 2, 28, 6);
    doorG.fillStyle(0xb58665, 1);
    doorG.fillRect(180, ry + rh + 2, 24, 3);
  }

  private buildCharactersAndPets(): void {
    // Build Nắng indoors beside tea table (Cozy People paper-doll layered sprite)
    const haAnh = this.createCozyPerson({
      x: 228,
      y: 112,
      hairTint: 0x9c5a46,
      shirtTint: 0xf4a8be,
      pantsTint: 0x6c859e,
      name: 'Nắng',
      accentHex: '#f5a3b8',
    });
    this.tweens.add({
      targets: haAnh.container,
      x: 204,
      duration: 2800,
      yoyo: true,
      hold: 1600,
      repeatDelay: 1200,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        haAnh.container.setDepth(Math.round(haAnh.container.y));
      },
    });

    // Build Mây in the sunny front garden tending crops
    const may = this.createCozyPerson({
      x: 184,
      y: 238,
      hairTint: 0x45302c,
      shirtTint: 0x7cb0c9,
      pantsTint: 0x526478,
      name: 'Mây',
      accentHex: '#82bdd6',
    });
    this.tweens.add({
      targets: may.container,
      x: 196,
      y: 218,
      duration: 3000,
      yoyo: true,
      hold: 1800,
      repeatDelay: 1400,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        may.container.setDepth(Math.round(may.container.y));
      },
    });

    // Orange cat (Frakassets CC BY 4.0) lounging on the rose rug inside!
    placeSoftShadow(this, 236, 136, 14, 6, 128, 0.55);
    const cat = this.add.sprite(236, 136, 'a-cat-sheet').setOrigin(0.5, 0.85).setDepth(136);
    cat.play('a-cat-Sleep_South');

    // Ambient warm golden fireflies gently above the garden flowers
    placeWarmLight(this, 188, 224, 52, 0xffe69c, 0.16, 860);
  }

  private createCozyPerson(opts: {
    x: number;
    y: number;
    hairTint: number;
    shirtTint: number;
    pantsTint: number;
    name: string;
    accentHex: string;
  }): { container: Phaser.GameObjects.Container } {
    // Rows in Cozy People global.png (8 cols/row): r0=body, r2=hair, r4=shirt, r6=pants, r8=shoes
    const shadow = this.add.image(0, -1, 'demo-soft-shadow').setDisplaySize(14, 6).setAlpha(0.7);
    const body = this.add.sprite(0, 0, 'a-char', 0).setOrigin(0.5, 1);
    const shoes = this.add.sprite(0, 0, 'a-char', 64).setOrigin(0.5, 1);
    const pants = this.add.sprite(0, 0, 'a-char', 48).setOrigin(0.5, 1).setTint(opts.pantsTint);
    const shirt = this.add.sprite(0, 0, 'a-char', 32).setOrigin(0.5, 1).setTint(opts.shirtTint);
    const hair = this.add.sprite(0, 0, 'a-char', 16).setOrigin(0.5, 1).setTint(opts.hairTint);
    const badge = createCozyNameTag(this, 0, -25, opts.name, opts.accentHex);

    const container = this.add.container(opts.x, opts.y, [
      shadow,
      body,
      shoes,
      pants,
      shirt,
      hair,
      badge,
    ]);
    container.setDepth(opts.y);

    // Subtle idle breathing bounce
    this.tweens.add({
      targets: [body, shoes, pants, shirt, hair],
      y: -1,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return { container };
  }
}
