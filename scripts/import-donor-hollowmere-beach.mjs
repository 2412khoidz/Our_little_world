/**
 * Hollowmere Gull Bay → OLW beach.json (tileset-cozy / Demo E gids).
 * Upstream: robintrepte/hollowmere.tretu.de — gull_bay.json (MIT).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('public/maps/donor/hollowmere');
const OUT_MAPS = path.resolve('public/assets/maps');
const VILLAGE_JSON = path.join(OUT_MAPS, 'village.json');
const TW = 16;

const T = {
  g0: 17,
  g2: 19,
  pathA: 22,
  pathB: 23,
  woodPlank: 24,
  hedge: 28,
  flower: 28,
  roofL: 33,
  roofM: 34,
  roofR: 35,
  wallL: 36,
  wallR: 38,
  treeTL: 39,
  treeTR: 40,
  treeBL: 41,
  treeBR: 42,
  sandA: 49,
  sandB: 50,
  waterDeep: 51,
  shoreGrass: 52,
};

const DECO = new Set(['palm', 'tallgrass', 'rock', 'boulder', 'flowers', 'tree']);

const OLW_DONOR_SHA = 'HEAD';

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(OUT_MAPS, file), JSON.stringify(data, null, 2));
}

function empty(w, h) {
  return new Array(w * h).fill(0);
}

function idx(w, x, y) {
  return y * w + x;
}

function tileLayer(name, id, data, w, h) {
  return {
    id,
    name,
    type: 'tilelayer',
    visible: true,
    opacity: 1,
    x: 0,
    y: 0,
    width: w,
    height: h,
    data,
  };
}

function makeTiledMap(mapId, width, height, layers, objectLayers = [], extraProps = []) {
  return {
    compressionlevel: -1,
    height,
    width,
    infinite: false,
    layers: [...layers, ...objectLayers],
    nextlayerid: layers.length + objectLayers.length + 1,
    nextobjectid: 10,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tileheight: TW,
    tilewidth: TW,
    tilesets: [
      {
        columns: 16,
        firstgid: 1,
        image: '../starter/tileset-cozy.png',
        imageheight: 128,
        imagewidth: 256,
        margin: 0,
        name: 'tileset-cozy',
        spacing: 0,
        tilecount: 128,
        tileheight: TW,
        tilewidth: TW,
      },
    ],
    type: 'map',
    version: '1.10',
    properties: [
      { name: 'mapId', type: 'string', value: mapId },
      { name: 'olwDonor', type: 'string', value: 'hollowmere' },
      { name: 'olwDonorMap', type: 'string', value: 'gull_bay' },
      { name: 'olwDonorSha', type: 'string', value: OLW_DONOR_SHA },
      ...extraProps,
    ],
  };
}

function groundGidFor(tileName, x, y) {
  switch (tileName) {
    case 'sand':
      return (x + y) % 2 === 0 ? T.sandA : T.sandB;
    case 'path':
      return (x + y) % 2 === 0 ? T.pathA : T.pathB;
    case 'water':
      return T.shoreGrass;
    case 'deepwater':
      return T.waterDeep;
    case 'wood':
    case 'bridge':
      return T.woodPlank;
    default:
      return (x + y) % 3 === 0 ? T.sandB : T.sandA;
  }
}

function decorGidFor(tileName) {
  switch (tileName) {
    case 'palm':
    case 'tallgrass':
      return T.hedge;
    case 'flowers':
      return T.flower;
    case 'rock':
    case 'boulder':
      return T.treeBL;
    default:
      return T.hedge;
  }
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class BeachGrid {
  constructor(w, h, baseName) {
    this.w = w;
    this.h = h;
    this.baseName = baseName;
    this.ground = empty(w, h);
    this.paths = empty(w, h);
    this.water = empty(w, h);
    this.buildings = empty(w, h);
    this.vegetation = empty(w, h);
    this.collision = empty(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        this.ground[idx(w, x, y)] = groundGidFor(baseName, x, y);
      }
    }
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  put(x, y, name) {
    if (!this.inBounds(x, y)) return;
    const i = idx(this.w, x, y);
    if (DECO.has(name)) {
      this.vegetation[i] = decorGidFor(name);
      this.collision[i] = 1;
      return;
    }
    const gid = groundGidFor(name, x, y);
    this.ground[i] = gid;
    if (name === 'water' || name === 'deepwater') {
      this.water[i] = name === 'deepwater' ? T.waterDeep : T.shoreGrass;
      this.collision[i] = 1;
    } else if (name === 'path') {
      this.paths[i] = gid;
    } else if (name === 'wood' || name === 'bridge') {
      this.paths[i] = T.woodPlank;
      this.collision[i] = 0;
    }
    this.vegetation[i] = 0;
  }

  setBorder(borderName) {
    for (let x = 0; x < this.w; x += 1) {
      for (let y = 0; y < this.h; y += 1) {
        if (x !== 0 && y !== 0 && x !== this.w - 1 && y !== this.h - 1) continue;
        this.put(x, y, borderName);
      }
    }
  }

  pier(x0, y0, pw, ph) {
    for (let x = x0; x < x0 + pw; x += 1) {
      for (let y = y0; y < y0 + ph; y += 1) {
        if (!this.inBounds(x, y)) continue;
        const i = idx(this.w, x, y);
        this.ground[i] = T.woodPlank;
        this.paths[i] = T.woodPlank;
        this.water[i] = 0;
        this.vegetation[i] = 0;
        this.collision[i] = 0;
      }
    }
  }

  openSide(side, start, length, baseName) {
    for (let i = start; i < start + length; i += 1) {
      let x = 0;
      let y = 0;
      let ix = 0;
      let iy = 0;
      if (side === 'w') {
        x = 0;
        y = i;
        ix = 1;
        iy = i;
      } else if (side === 'e') {
        x = this.w - 1;
        y = i;
        ix = this.w - 2;
        iy = i;
      } else if (side === 'n') {
        x = i;
        y = 0;
        ix = i;
        iy = 1;
      } else if (side === 's') {
        x = i;
        y = this.h - 1;
        ix = i;
        iy = this.h - 2;
      }
      if (!this.inBounds(x, y)) continue;
      this.vegetation[idx(this.w, x, y)] = 0;
      this.collision[idx(this.w, x, y)] = 0;
      if (this.inBounds(ix, iy)) {
        this.ground[idx(this.w, x, y)] = this.ground[idx(this.w, ix, iy)];
      } else {
        this.ground[idx(this.w, x, y)] = groundGidFor(baseName, x, y);
      }
    }
  }

  clearPathInner() {
    const baseGid = groundGidFor(this.baseName, 0, 0);
    for (let y = 1; y < this.h - 1; y += 1) {
      for (let x = 1; x < this.w - 1; x += 1) {
        const i = idx(this.w, x, y);
        if (this.ground[i] !== baseGid && this.ground[i] !== T.flower) {
          this.vegetation[i] = 0;
        }
      }
    }
  }

  scatter(tileName, x0, y0, rw, rh, chance, seed) {
    const rand = mulberry32(seed);
    for (let x = x0; x < x0 + rw; x += 1) {
      for (let y = y0; y < y0 + rh; y += 1) {
        if (!this.inBounds(x, y) || x === 0 || y === 0 || x >= this.w - 1 || y >= this.h - 1) continue;
        const gi = idx(this.w, x, y);
        if (this.ground[gi] !== groundGidFor(this.baseName, x, y) || this.vegetation[gi] !== 0) continue;
        if (rand() >= chance) continue;
        if (tileName === 'palm' && this.inBounds(x + 1, y + 1)) {
          this.vegetation[gi] = T.treeTL;
          this.vegetation[idx(this.w, x + 1, y)] = T.treeTR;
          this.vegetation[idx(this.w, x, y + 1)] = T.treeBL;
          this.vegetation[idx(this.w, x + 1, y + 1)] = T.treeBR;
          this.collision[idx(this.w, x, y + 1)] = 1;
          this.collision[idx(this.w, x + 1, y + 1)] = 1;
        } else {
          this.put(x, y, tileName);
        }
      }
    }
  }

  paintBuilding(x, y, w, h) {
    for (let row = 0; row < h; row += 1) {
      for (let col = 0; col < w; col += 1) {
        const tx = x + col;
        const ty = y + row;
        if (!this.inBounds(tx, ty)) continue;
        const i = idx(this.w, tx, ty);
        if (row === 0) {
          this.buildings[i] = col === 0 ? T.roofL : col === w - 1 ? T.roofR : T.roofM;
        } else {
          this.buildings[i] = col === 0 || col === w - 1 ? T.wallL : T.wallR;
        }
        this.collision[i] = 1;
        this.vegetation[i] = 0;
      }
    }
  }

  clearWarpArea(x, y, w, h) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) {
        if (!this.inBounds(xx, yy)) continue;
        const i = idx(this.w, xx, yy);
        this.vegetation[i] = 0;
        this.collision[i] = 0;
      }
    }
  }
}

function buildFromHollowmere(mapData) {
  const w = mapData.w;
  const h = mapData.h;
  const grid = new BeachGrid(w, h, mapData.base ?? 'sand');
  grid.setBorder(mapData.border ?? 'palm');

  for (const op of mapData.ops ?? []) {
    const kind = op[0];
    if (kind === 'rect') {
      const tile = op[1];
      const x0 = op[2];
      const y0 = op[3];
      const rw = op[4];
      const rh = op[5];
      for (let x = x0; x < x0 + rw; x += 1) {
        for (let y = y0; y < y0 + rh; y += 1) {
          grid.put(x, y, tile);
        }
      }
    } else if (kind === 'pier') {
      grid.pier(op[1], op[2], op[3], op[4]);
    } else if (kind === 'open') {
      grid.openSide(op[1], op[2], op[3], mapData.base ?? 'sand');
    } else if (kind === 'scatter') {
      grid.scatter(op[1], op[2], op[3], op[4], op[5], op[6], op[7]);
    } else if (kind === 'clearpath') {
      grid.clearPathInner();
    }
  }

  for (const obj of mapData.objects ?? []) {
    const ow = obj.type === 'wayshrine' || obj.type === 'shrine' ? 2 : Number(obj.w ?? 1);
    const oh = obj.type === 'wayshrine' || obj.type === 'shrine' ? 2 : Number(obj.h ?? 1);
    if (obj.type === 'building') {
      grid.paintBuilding(Number(obj.x), Number(obj.y), ow, oh);
    } else if (obj.type === 'wayshrine') {
      for (let yy = 0; yy < 2; yy += 1) {
        for (let xx = 0; xx < 2; xx += 1) {
          const i = idx(w, Number(obj.x) + xx, Number(obj.y) + yy);
          grid.buildings[i] = T.wallL;
          grid.collision[i] = 1;
        }
      }
    }
    for (let xx = Number(obj.x) - 1; xx < Number(obj.x) + ow + 1; xx += 1) {
      for (let yy = Number(obj.y); yy < Number(obj.y) + oh; yy += 1) {
        if (xx > 0 && yy > 0 && xx < w - 1 && yy < h - 1) {
          grid.vegetation[idx(w, xx, yy)] = 0;
        }
      }
    }
  }

  for (const wp of mapData.warps ?? []) {
    grid.clearWarpArea(Number(wp.x), Number(wp.y), Number(wp.w ?? 1), Number(wp.h ?? 1));
  }

  const [spawnX, spawnY] = mapData.spawn ?? [1, 16];
  grid.collision[idx(w, spawnX, spawnY)] = 0;
  grid.vegetation[idx(w, spawnX, spawnY)] = 0;

  const portals = {
    id: 10,
    name: 'Portals',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 1,
        name: 'beach-to-village',
        type: 'portal',
        x: 0,
        y: 16 * TW,
        width: TW,
        height: TW * 2,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'village' },
          { name: 'spawnX', type: 'int', value: 84 },
          { name: 'spawnY', type: 'int', value: 27 },
          { name: 'labelVi', type: 'string', value: 'Về làng Cabacos' },
        ],
      },
    ],
  };

  return makeTiledMap(
    'beach',
    w,
    h,
    [
      tileLayer('Ground', 1, grid.ground, w, h),
      tileLayer('Paths', 2, grid.paths, w, h),
      tileLayer('Water', 3, grid.water, w, h),
      tileLayer('Buildings', 4, grid.buildings, w, h),
      tileLayer('Vegetation', 5, grid.vegetation, w, h),
      tileLayer('Collision', 6, grid.collision, w, h),
    ],
    [portals],
    [{ name: 'hollowmereMusic', type: 'string', value: mapData.music ?? 'beach' }],
  );
}

/** Add Cabacos ↔ Gull Bay edge portals when village is already donor-imported. */
function patchVillageBeachPortal() {
  if (!fs.existsSync(VILLAGE_JSON)) return;
  const village = JSON.parse(fs.readFileSync(VILLAGE_JSON, 'utf8'));
  const donor = village.properties?.find((p) => p.name === 'olwDonor')?.value;
  if (donor !== 'cabacos') return;

  const portalsLayer = village.layers.find((l) => l.name === 'Portals');
  if (!portalsLayer) return;
  portalsLayer.objects = portalsLayer.objects.filter((o) => o.name !== 'village-to-beach');
  portalsLayer.objects.push({
    id: 9105,
    name: 'village-to-beach',
    type: 'portal',
    x: 84 * TW,
    y: 26 * TW,
    width: TW * 2,
    height: TW * 2,
    properties: [
      { name: 'targetMapId', type: 'string', value: 'beach' },
      { name: 'labelVi', type: 'string', value: 'Ra Gull Bay' },
      { name: 'spawnX', type: 'int', value: 1 },
      { name: 'spawnY', type: 'int', value: 16 },
    ],
  });
  fs.writeFileSync(VILLAGE_JSON, JSON.stringify(village, null, 2));
  console.log('Patched village.json with village-to-beach portal');
}

function main() {
  const src = loadJson('gull_bay.json');
  const beach = buildFromHollowmere(src);
  writeJson('beach.json', beach);
  patchVillageBeachPortal();
  console.log(`Wrote beach.json ${src.w}×${src.h} from Hollowmere gull_bay`);
}

main();