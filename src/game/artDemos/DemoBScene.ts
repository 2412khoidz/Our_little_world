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
  garden: { cx: 192, cy: 230, fitW: 260, fitH: 150, maxZoom: 3.5 },
};

export class DemoBScene extends Phaser.Scene {
  private motes: FloatingMote[] = [];
  private moteBounds = { x: 8, y: 120, w: 368, h: 205 };
  private initialPreset: CameraPreset = 'overview';

  constructor(initialPreset: CameraPreset = 'overview') {
    super({ key: 'DemoBScene' });
    this.initialPreset = initialPreset;
  }

  preload(): void {
    const basic = `${ASSET_CANDIDATES_BASE}/sprout-lands-basic`;
    const sorry = `${ASSET_CANDIDATES_BASE}/sprout-lands-sorry/Early Access`;

    this.load.image('b-grass', `${basic}/Tilesets/Grass.png`);
    this.load.image('b-soil', `${basic}/Tilesets/Tilled Dirt.png`);
    this.load.spritesheet('b-water', `${basic}/Tilesets/Water.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('b-house-tiles', `${basic}/Tilesets/Wooden House.png`);
    this.load.image('b-house-walls', `${basic}/Tilesets/Wooden_House_Walls_Tilset.png`);
    this.load.image('b-fences', `${basic}/Tilesets/Fences.png`);
    this.load.image('b-bridge', `${basic}/Objects/Wood Bridge.png`);
    this.load.image('b-furniture', `${basic}/Objects/Basic Furniture.png`);
    this.load.image('b-grass-things', `${basic}/Objects/Basic Grass Biom things 1.png`);
    this.load.image('b-plants', `${basic}/Objects/Basic Plants.png`);
    this.load.spritesheet('b-char', `${basic}/Characters/Basic Charakter Spritesheet.png`, {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('b-chicken', `${basic}/Characters/Free Chicken Sprites.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });

    // Sorry Pack (Cherry Blossom, Wooden Furniture, Lit Houses, Picnic, Beehive, Fire)
    this.load.image('b-cherry', `${sorry}/Plant update 2/Cherry Blossom Biom.png`);
    this.load.image('b-cherry-water', `${sorry}/Plant update 2/Cherry Blossom Biom water plants.png`);
    this.load.image('b-new-furn', `${sorry}/Plant update 2/Furniture/new Wooden Furniture.png`);
    this.load.image('b-new-items', `${sorry}/Plant update 2/Furniture/new Wooden Furniture items.png`);
    this.load.image('b-chest', `${sorry}/Plant update 2/Furniture/Cherry_Chest.png`);
    this.load.image(
      'b-small-house',
      `${sorry}/Village pack/houses/small house/small_House_light_with_door_grass.png`,
    );
    this.load.image('b-picnic-blanket', `${sorry}/Plant update 2/piknik/Piknik blanket.png`);
    this.load.image('b-picnic-basket', `${sorry}/Plant update 2/piknik/Piknik basket.png`);
    this.load.image('b-picnic-foods', `${sorry}/Plant update 2/piknik/piknik_foods.png`);
    this.load.image('b-beehive', `${sorry}/Plant update 2/Bee/beehive.png`);
    this.load.image('b-candles', `${sorry}/halloween/candels.png`);
    this.load.spritesheet('b-fire', `${sorry}/Sprout winter/fire animation.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('b-frog', `${sorry}/Plant update 2/frog/frog_spritesheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('b-fish', `${sorry}/Ocean Pack/Fish Sprites.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });

    preloadFrakassetsPet(this, 'b-shiba', 'puppy-shiba', 'outline');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(ART_DEMO_METADATA.B.backdropHex);
    ensureLightingTextures(this);
    this.registerFrames();
    this.registerAnims();
    createFrakassetsPetAnims(this, 'b-shiba');

    this.buildGardenExterior();
    this.buildCottageInterior();
    this.buildCharactersAndPets();

    this.motes = createAmbientMotes(this, this.moteBounds, 'petal', 26);
    applyDemoCameraPreset(this, LAYOUT, this.initialPreset);
    markArtDemoReadyWhenSettled(this, 'B', LAYOUT, this.initialPreset);
  }

  update(_time: number, delta: number): void {
    updateAmbientMotes(this.motes, this.moteBounds, delta / 1000, this.time.now / 1000, 'petal');
  }

  private registerFrames(): void {
    defineTileFrames(this, 'b-grass', [
      { name: 'grass_c', col: 1, row: 1 },
      { name: 'grass_flower_a', col: 0, row: 5 },
      { name: 'grass_flower_b', col: 1, row: 5 },
      { name: 'grass_tuft', col: 6, row: 5 },
      { name: 'grass_clover', col: 7, row: 5 },
    ]);

    defineTileFrames(this, 'b-soil', [{ name: 'soil_fill', col: 1, row: 1 }]);

    defineTileFrames(this, 'b-house-tiles', [
      { name: 'floor_cream', col: 1, row: 2 },
      { name: 'floor_left', col: 0, row: 2 },
      { name: 'floor_right', col: 2, row: 2 },
      { name: 'wall_wood_post', col: 0, row: 1 },
      { name: 'wall_window', col: 1, row: 1 },
    ]);

    defineTileFrames(this, 'b-house-walls', [
      { name: 'wall_cap', col: 3, row: 0 },
      { name: 'wall_plaster', col: 3, row: 1 },
      { name: 'wall_wainscot', col: 1, row: 2 },
    ]);

    defineTileFrames(this, 'b-furniture', [
      { name: 'paint_meadow', col: 0, row: 0 },
      { name: 'paint_night', col: 2, row: 0 },
      { name: 'plant_pot_a', col: 3, row: 0 },
      { name: 'plant_pot_b', col: 4, row: 0 },
      { name: 'lamp_green', col: 3, row: 1 },
      { name: 'lamp_blue', col: 4, row: 1 },
      { name: 'bed_basic_blue', col: 1, row: 1, wTiles: 1, hTiles: 2 },
      { name: 'bed_basic_pink', col: 2, row: 1, wTiles: 1, hTiles: 2 },
      { name: 'clock_round', col: 5, row: 3 },
      { name: 'clock_gold', col: 6, row: 3 },
      { name: 'rug_sage', col: 4, row: 5, wTiles: 2, hTiles: 1 },
      { name: 'rug_coral', col: 6, row: 5, wTiles: 2, hTiles: 1 },
    ]);

    defineTileFrames(this, 'b-new-furn', [
      { name: 'sofa_oak', col: 7, row: 5, wTiles: 2, hTiles: 1 },
      { name: 'armchair_r', col: 2, row: 5 },
      { name: 'armchair_l', col: 1, row: 5 },
      { name: 'table_oak', col: 5, row: 5 },
      { name: 'dresser_oak', col: 0, row: 5 },
    ]);
    definePixelFrames(this, 'b-new-furn', [
      { name: 'bed_pink', x: 11 * 16, y: 10, w: 16, h: 22 },
      { name: 'bed_blue', x: 10 * 16, y: 10, w: 16, h: 22 },
    ]);

    defineTileFrames(this, 'b-new-items', [
      { name: 'bookshelf_a', col: 5, row: 1 },
      { name: 'bookshelf_b', col: 6, row: 1 },
      { name: 'wardrobe', col: 4, row: 1 },
    ]);

    definePixelFrames(this, 'b-chest', [{ name: 'cherry_chest', x: 0, y: 0, w: 32, h: 32 }]);

    definePixelFrames(this, 'b-candles', [
      { name: 'candle_single', x: 0, y: 0, w: 16, h: 16 },
      { name: 'candles_duo', x: 32, y: 0, w: 16, h: 16 },
    ]);

    defineTileFrames(this, 'b-cherry', [
      { name: 'sakura_tree_lg', col: 7, row: 0, wTiles: 3, hTiles: 3 },
      { name: 'sakura_bush', col: 0, row: 4 },
      { name: 'sakura_flower_bush', col: 1, row: 4 },
      { name: 'sakura_petals', col: 1, row: 3 },
      { name: 'sakura_shroom', col: 1, row: 1 },
    ]);

    defineTileFrames(this, 'b-cherry-water', [
      { name: 'lily_pad', col: 0, row: 0 },
      { name: 'lotus_pink', col: 1, row: 0 },
    ]);

    defineTileFrames(this, 'b-grass-things', [
      { name: 'apple_tree', col: 3, row: 0, wTiles: 2, hTiles: 2 },
      { name: 'green_tree', col: 1, row: 0, wTiles: 2, hTiles: 2 },
      { name: 'sunflower', col: 8, row: 2, wTiles: 1, hTiles: 2 },
      { name: 'daisy_pot', col: 7, row: 2 },
      { name: 'yellow_flower', col: 6, row: 2 },
    ]);

    defineTileFrames(this, 'b-plants', [
      { name: 'crop_corn', col: 3, row: 0 },
      { name: 'crop_tomato', col: 4, row: 1 },
      { name: 'crop_beet', col: 5, row: 1 },
    ]);

    definePixelFrames(this, 'b-small-house', [
      { name: 'cottage_pink_lit', x: 0, y: 64, w: 64, h: 64 },
      { name: 'cottage_gold_lit', x: 0, y: 0, w: 64, h: 64 },
    ]);

    defineTileFrames(this, 'b-bridge', [{ name: 'bridge_h', col: 2, row: 1, wTiles: 3, hTiles: 2 }]);
    definePixelFrames(this, 'b-fences', [
      { name: 'fence_strip', x: 16, y: 48, w: 48, h: 16 },
    ]);
    defineTileFrames(this, 'b-picnic-foods', [
      { name: 'berry_tart', col: 3, row: 0 },
      { name: 'tea_cup', col: 1, row: 1 },
      { name: 'berries', col: 1, row: 0 },
    ]);
  }

  private registerAnims(): void {
    if (!this.anims.exists('b-water-flow')) {
      this.anims.create({
        key: 'b-water-flow',
        frames: this.anims.generateFrameNumbers('b-water', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!this.anims.exists('b-fire-dance')) {
      this.anims.create({
        key: 'b-fire-dance',
        frames: this.anims.generateFrameNumbers('b-fire', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!this.anims.exists('b-chicken-idle')) {
      this.anims.create({
        key: 'b-chicken-idle',
        frames: [
          { key: 'b-chicken', frame: 0 },
          { key: 'b-chicken', frame: 1 },
          { key: 'b-chicken', frame: 4 },
          { key: 'b-chicken', frame: 5 },
        ],
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!this.anims.exists('b-char-down')) {
      this.anims.create({
        key: 'b-char-down',
        frames: this.anims.generateFrameNumbers('b-char', { start: 0, end: 3 }),
        frameRate: 5,
        repeat: -1,
      });
    }
    if (!this.anims.exists('b-char-right')) {
      this.anims.create({
        key: 'b-char-right',
        frames: this.anims.generateFrameNumbers('b-char', { start: 12, end: 15 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!this.anims.exists('b-char-left')) {
      this.anims.create({
        key: 'b-char-left',
        frames: this.anims.generateFrameNumbers('b-char', { start: 8, end: 11 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!this.anims.exists('b-frog-idle')) {
      this.anims.create({
        key: 'b-frog-idle',
        frames: [
          { key: 'b-frog', frame: 0 },
          { key: 'b-frog', frame: 14 },
          { key: 'b-frog', frame: 15 },
        ],
        frameRate: 4,
        repeat: -1,
      });
    }
  }

  private buildGardenExterior(): void {
    // Lush Sprout Lands meadow filling panoramic width (0..384) and mobile height (16..328)
    for (let y = 16; y < 328; y += 16) {
      for (let x = 0; x < 384; x += 16) {
        this.add.image(x, y, 'b-grass', 'grass_c').setOrigin(0, 0).setDepth(1);
      }
    }

    // Grass flower/clover accents
    const grassAccents: [number, number, string][] = [
      [112, 180, 'grass_flower_a'],
      [128, 224, 'grass_clover'],
      [256, 176, 'grass_flower_b'],
      [272, 240, 'grass_tuft'],
      [32, 240, 'grass_flower_a'],
      [336, 208, 'grass_flower_b'],
      [144, 296, 'grass_flower_a'],
      [240, 296, 'grass_flower_b'],
    ];
    for (const [x, y, f] of grassAccents) {
      this.add.image(x, y, 'b-grass', f).setOrigin(0, 0).setDepth(2);
    }

    // Animated shimmering pond in the foreground garden (bottom-left of hero stage!)
    for (let py = 256; py <= 288; py += 16) {
      for (let px = 96; px <= 144; px += 16) {
        const w = this.add.sprite(px, py, 'b-water').setOrigin(0, 0).setDepth(3);
        w.play('b-water-flow');
      }
    }
    placeProp(this, 'b-cherry-water', 'lotus_pink', 112, 286, -240);
    placeProp(this, 'b-cherry-water', 'lily_pad', 148, 272, -240);

    // Wooden bridge crossing the top of the pond + frog friend!
    placeProp(this, 'b-bridge', 'bridge_h', 124, 272, -230);
    const frog = this.add.sprite(150, 266, 'b-frog', 0).setOrigin(0.5, 1).setDepth(268);
    frog.play('b-frog-idle');

    // Warm soil path & small crop bed (right foreground inside hero stage!)
    for (let sy = 240; sy <= 272; sy += 16) {
      for (let sx = 232; sx <= 264; sx += 16) {
        this.add.image(sx, sy, 'b-soil', 'soil_fill').setOrigin(0, 0).setDepth(4);
      }
    }
    placeProp(this, 'b-plants', 'crop_tomato', 240, 256);
    placeProp(this, 'b-plants', 'crop_corn', 256, 256);
    placeProp(this, 'b-plants', 'crop_beet', 272, 256);
    placeProp(this, 'b-plants', 'crop_tomato', 240, 272);
    placeProp(this, 'b-plants', 'crop_beet', 256, 272);
    placeProp(this, 'b-plants', 'crop_corn', 272, 272);

    // Connected fence above crop garden
    placeProp(this, 'b-fences', 'fence_strip', 256, 238);

    // Romantic Cherry Blossom Picnic area right outside cottage doorway!
    this.add.image(204, 208, 'b-picnic-blanket').setOrigin(0.5, 0.5).setDepth(20);
    placeProp(this, 'b-picnic-basket', undefined, 192, 202, 12);
    placeProp(this, 'b-picnic-foods', 'berry_tart', 208, 208, 12);
    placeProp(this, 'b-picnic-foods', 'tea_cup', 214, 214, 14);

    // Big Blooming Cherry Blossom Trees & Apple Tree framing Desktop Wings & Hero Borders
    const cherrySpots: [number, number][] = [
      [114, 204],
      [278, 214],
      [34, 152],
      [348, 160],
      [196, 314],
    ];
    for (const [cx, cy] of cherrySpots) {
      placeSoftShadow(this, cx, cy - 2, 40, 14, 10, 0.65);
      placeProp(this, 'b-cherry', 'sakura_tree_lg', cx, cy);
    }

    // Pink-roofed cottage & beehive in left & right Desktop panoramic wings!
    placeSoftShadow(this, 56, 236, 62, 16, 20, 0.72);
    placeProp(this, 'b-small-house', 'cottage_pink_lit', 56, 240);
    placeWarmLight(this, 56, 218, 28, 0xffd280, 0.35, 860);

    placeSoftShadow(this, 326, 236, 62, 16, 20, 0.72);
    placeProp(this, 'b-small-house', 'cottage_gold_lit', 326, 240);
    placeProp(this, 'b-beehive', undefined, 304, 268);

    // Sakura bushes, petals & sunflowers
    const bushes: [number, number, string, string][] = [
      [138, 186, 'b-cherry', 'sakura_flower_bush'],
      [252, 186, 'b-cherry', 'sakura_flower_bush'],
      [182, 244, 'b-cherry', 'sakura_petals'],
      [218, 250, 'b-cherry', 'sakura_petals'],
      [92, 224, 'b-grass-things', 'sunflower'],
      [286, 272, 'b-grass-things', 'sunflower'],
      [48, 284, 'b-grass-things', 'apple_tree'],
      [338, 288, 'b-grass-things', 'green_tree'],
    ];
    for (const [bx, by, tex, fr] of bushes) {
      placeProp(this, tex, fr, bx, by);
    }

    // Clucking pastel chicken by the pond
    const ch = this.add.sprite(168, 284, 'b-chicken', 0).setOrigin(0.5, 1).setDepth(284);
    placeSoftShadow(this, 168, 284, 11, 5, 270, 0.55);
    ch.play('b-chicken-idle');
  }

  private buildCottageInterior(): void {
    // Cozy warm cottage room (x: 96..288, y: 36..160 -> 12x7.75 tiles)
    const rx = 96;
    const ry = 36;
    const rw = 192;
    const rh = 124;

    const border = this.add.graphics().setDepth(4);
    border.fillStyle(0x281c22, 0.75);
    border.fillRoundedRect(rx - 4, ry - 4, rw + 8, rh + 10, 4);
    border.lineStyle(2, 0x734a39, 1);
    border.strokeRoundedRect(rx - 2, ry - 2, rw + 4, rh + 4, 3);

    // Clean honey-cream cottage floorboards (zero stripe artifact)
    for (let y = ry + 32; y < ry + rh; y += 16) {
      for (let x = rx; x < rx + rw; x += 16) {
        this.add.image(x, y, 'b-house-tiles', 'floor_cream').setOrigin(0, 0).setDepth(6);
      }
    }

    // Warm cottage back wall + windows (using smooth plaster base)
    for (let x = rx; x < rx + rw; x += 16) {
      const col = (x - rx) / 16;
      this.add.image(x, ry, 'b-house-walls', 'wall_wainscot').setOrigin(0, 0).setDepth(8);
      if (col === 2 || col === 9) {
        this.add.image(x, ry + 16, 'b-house-tiles', 'wall_window').setOrigin(0, 0).setDepth(8);
      } else {
        this.add.image(x, ry + 16, 'b-house-walls', 'wall_plaster').setOrigin(0, 0).setDepth(8);
      }
    }

    // Diagonal golden morning sunbeams from cottage windows!
    placeSunbeam(this, rx + 40, ry + 30, 14, 30, 62, 0.16, 15);
    placeSunbeam(this, rx + 152, ry + 30, 14, 30, 62, 0.16, 15);

    // Wall clock, paintings, bookshelves & dresser
    placeProp(this, 'b-furniture', 'clock_gold', rx + 96, ry + 26, 10);
    placeProp(this, 'b-furniture', 'paint_meadow', rx + 58, ry + 24, 10);
    placeProp(this, 'b-furniture', 'paint_night', rx + 134, ry + 24, 10);

    // Left Bedroom Corner: Twin crisp pastel beds + bedside lamp
    placeProp(this, 'b-furniture', 'bed_basic_blue', rx + 18, ry + 66);
    placeProp(this, 'b-furniture', 'bed_basic_pink', rx + 34, ry + 66);
    placeProp(this, 'b-furniture', 'lamp_blue', rx + 52, ry + 50);
    placeWarmLight(this, rx + 52, ry + 42, 34, 0xffd58f, 0.3, 860);

    // Center Bookshelves + Dancing Fire Candlelight Table
    placeProp(this, 'b-new-items', 'bookshelf_a', rx + 72, ry + 48);
    placeProp(this, 'b-new-items', 'bookshelf_b', rx + 88, ry + 48);
    placeProp(this, 'b-new-items', 'wardrobe', rx + 120, ry + 48);

    // Warm living-room rug + oak loveseat + tea table + dancing candle fire
    this.add.image(204, 118, 'b-furniture', 'rug_coral').setOrigin(0.5, 0.5).setScale(1.6, 1.5).setDepth(18);
    this.add.image(132, 124, 'b-furniture', 'rug_sage').setOrigin(0.5, 0.5).setScale(1.4, 1.4).setDepth(18);

    placeSoftShadow(this, 204, 112, 34, 10, 88);
    placeProp(this, 'b-new-furn', 'sofa_oak', 204, 110);
    placeProp(this, 'b-new-furn', 'table_oak', 204, 134);
    placeProp(this, 'b-candles', 'candles_duo', 204, 123, 128);
    const fire = this.add.sprite(204, 121, 'b-fire', 0).setOrigin(0.5, 1).setScale(0.6).setDepth(140);
    fire.play('b-fire-dance');
    placeWarmLight(this, 204, 112, 48, 0xffc872, 0.36, 880);

    // Potted indoor plants & right desk corner
    placeProp(this, 'b-furniture', 'plant_pot_a', rx + 178, ry + 54);
    placeProp(this, 'b-furniture', 'plant_pot_b', rx + 14, ry + 114);
    placeProp(this, 'b-new-furn', 'armchair_l', rx + 162, ry + 106);

    // Welcoming wooden threshold opening onto the cherry picnic garden
    const door = this.add.graphics().setDepth(16);
    door.fillStyle(0xe8c79e, 1);
    door.fillRect(178, ry + rh - 2, 28, 6);
    door.fillStyle(0xb5865a, 1);
    door.fillRect(180, ry + rh + 2, 24, 4);
  }

  private buildCharactersAndPets(): void {
    // IMPORTANT: Basic Charakter Spritesheet.png uses 48x48 cells whose character feet sit at y=32 (32/48 = 0.67).
    // Setting originY = 0.67 anchors feet accurately on shadows and keeps full sprites below name badges!
    const haAnh = this.add.sprite(168, 120, 'b-char', 0).setDepth(120);
    haAnh.setTint(0xffe0ec);
    placeSoftShadow(this, 168, 117, 12, 5, 110);
    const tagHa = createCozyNameTag(this, 168, 94, 'Nắng', '#eb9eb8');
    haAnh.play('b-char-down');
    haAnh.setOrigin(0.5, 0.67);

    // Mây welcoming cleanly beside the cherry blossom picnic blanket!
    const mayShadow = placeSoftShadow(this, 158, 213, 12, 5, 200);
    const may = this.add.sprite(158, 216, 'b-char', 12).setDepth(216);
    may.setTint(0xdcecff);
    const tagMay = createCozyNameTag(this, 158, 190, 'Mây', '#89c4eb');
    may.play('b-char-down');
    may.setOrigin(0.5, 0.67);

    this.tweens.add({
      targets: may,
      x: 168,
      delay: 1200,
      duration: 2400,
      yoyo: true,
      hold: 2000,
      repeatDelay: 1600,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        mayShadow.x = may.x;
        tagMay.x = may.x;
        may.setDepth(Math.round(may.y));
      },
      onYoyo: () => may.play('b-char-left', true),
      onRepeat: () => may.play('b-char-down', true),
    });

    // Cute Shiba Inu puppy (Frakassets CC BY 4.0) happily wagging beside the picnic!
    const petShadow = placeSoftShadow(this, 232, 216, 13, 5, 210, 0.55);
    const shiba = this.add.sprite(232, 216, 'b-shiba-sheet').setOrigin(0.5, 0.85).setDepth(216);
    shiba.play('b-shiba-Happy_South');

    this.tweens.add({
      targets: shiba,
      x: 244,
      duration: 2600,
      yoyo: true,
      hold: 1500,
      repeatDelay: 1800,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        petShadow.x = shiba.x;
        shiba.setDepth(Math.round(shiba.y));
      },
    });
    void tagHa;
  }
}
