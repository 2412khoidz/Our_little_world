import { PixelCanvas } from './pixel-canvas.mjs';

const TILE = 16;

function noise(x, y) {
  let n = Math.imul(x ^ 137, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

export function makeHome(width, height) {
  const c = new PixelCanvas(width, height);
  const floor = ['#d7a17d', '#dba581', '#d9a37e', '#d5a07c'];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const row = Math.floor(y / 8);
      const seam = (x + (row % 2) * 22) % 44;
      const patch = Math.floor((x + (row % 2) * 22) / 44);
      let color = floor[noise(patch, row) % floor.length];
      if (y % 8 === 7 || seam === 0) color = '#c99271';
      else if (y % 8 === 0) color = '#e0ac87';
      else if (y % 8 === 4 && noise(Math.floor(x / 11), row) % 7 === 0) color = '#d39c78';
      c.px(x, y, color);
    }
  }
  // The study alcove is visual only. Its floor meets the surrounding boards on a clean trim.
  c.rect(159, 47, width - 174, 36, '#b98567');
  c.rect(160, 47, width - 176, 34, '#ead3b1');
  for (let y = 48; y < 81; y += 1) {
    for (let x = 160; x < width - 16; x += 1) {
      const tx = (x - 160) % 8;
      const ty = y % 8;
      if (tx === 7 || ty === 7) c.px(x, y, '#e2c6a3');
      if ((tx === 3 || tx === 4) && (ty === 3 || ty === 4)) c.px(x, y, '#e0be9e');
    }
  }
  c.rect(0, 0, width, 9, '#754d50');
  c.rect(0, 1, width, 3, '#9c6664');
  c.rect(0, 9, width, 29, '#f1ddbe');
  c.rect(0, 9, width, 2, '#ebca9f');
  c.rect(0, 33, width, 6, '#e6be94');
  c.rect(0, 38, width, 5, '#aa735d');
  c.rect(0, 38, width, 1, '#c99071');
  c.rect(0, 43, width, 4, '#a87260', 95);
  for (const x of [24, 111, 200]) {
    c.rect(x, 12, 25, 21, '#a0705d');
    c.rect(x + 2, 13, 21, 16, '#a6c7b1');
    c.rect(x + 2, 13, 21, 6, '#c7ded1');
    c.rect(x + 4, 21, 17, 8, '#93b58e');
    c.rect(x + 12, 13, 1, 17, '#fee8cc');
    c.rect(x + 2, 20, 21, 1, '#fee8cc');
    c.rect(x - 2, 30, 29, 3, '#ba8566');
    c.rect(x, 12, 2, 7, '#e4a89d');
    c.rect(x + 23, 12, 2, 7, '#e4a89d');
  }
  for (const x of [64, 151]) {
    c.rect(x, 16, 16, 12, '#a4715e');
    c.rect(x + 1, 17, 14, 10, '#fff0d7');
    c.rect(x + 4, 23, 8, 2, '#96ad78');
    c.rect(x + 6, 21, 4, 2, '#d7928a');
  }
  c.rect(0, 8, 15, height - 8, '#a26b58');
  c.rect(width - 15, 8, 15, height - 8, '#a26b58');
  c.rect(2, 8, 9, height - 8, '#cd9b78');
  c.rect(width - 11, 8, 9, height - 8, '#cd9b78');
  c.rect(11, 9, 3, height - 9, '#b88167');
  c.rect(width - 14, 9, 3, height - 9, '#b88167');
  for (const [x, w] of [[0, 112], [144, width - 144]]) {
    c.rect(x, height - 12, w, 12, '#a16d58');
    c.rect(x, height - 12, w, 3, '#ce9c7a');
    c.rect(x, height - 4, w, 2, '#875846');
  }
  c.rect(112, height - 7, 32, 7, '#ad7962');
  c.rect(116, height - 7, 24, 4, '#efc6a0');
  c.rect(119, height - 6, 18, 2, '#e0a786');
  return c;
}

function pathAt(tileX, tileY) {
  return (tileX >= 7 && tileX <= 9 && tileY >= 2 && tileY <= 5) ||
    (tileX >= 4 && tileX <= 13 && tileY >= 5 && tileY <= 6) ||
    (tileX >= 8 && tileX <= 9 && tileY >= 6 && tileY <= 11) ||
    (tileX >= 8 && tileX <= 12 && tileY >= 10 && tileY <= 11);
}

// The center and eight neighboring regions share a mask at tile boundaries.
export function gardenPathPixel(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (!pathAt(tx, ty)) return false;
  const lx = x - tx * TILE;
  const ly = y - ty * TILE;
  const offsetX = lx < 3 ? -1 : lx >= 13 ? 1 : 0;
  const offsetY = ly < 3 ? -1 : ly >= 13 ? 1 : 0;
  const openX = offsetX !== 0 && !pathAt(tx + offsetX, ty);
  const openY = offsetY !== 0 && !pathAt(tx, ty + offsetY);
  const edgeX = Math.min(lx, 15 - lx);
  const edgeY = Math.min(ly, 15 - ly);
  if ((openX && edgeX === 0) || (openY && edgeY === 0)) return false;
  return !(openX && openY && edgeX + edgeY < 4);
}

export function makeGarden(width, height) {
  const c = new PixelCanvas(width, height);
  const greens = ['#bccd83', '#c3d38a', '#b6ca7e', '#bfd18a'];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // A continuous color field with sparse detail, independent of the 16 px grid.
      const h = noise(x, y);
      const cx = Math.floor((x + 7 * Math.sin(y / 22)) / 37);
      const cy = Math.floor((y + 6 * Math.sin(x / 24)) / 29);
      let color = greens[noise(cx, cy) % greens.length];
      if (h % 79 === 0) color = '#aabd73';
      if (h % 103 === 0) color = '#d3de9c';
      if (gardenPathPixel(x, y)) {
        const edge = !gardenPathPixel(x + 1, y) || !gardenPathPixel(x - 1, y) ||
          !gardenPathPixel(x, y + 1) || !gardenPathPixel(x, y - 1);
        color = edge ? '#bd996b' : h % 63 === 0 ? '#c3a175' : h % 39 === 0 ? '#ebcfa1' : '#dfba8a';
      }
      c.px(x, y, color);
    }
  }
  for (const [x, y, color] of [[24, 82, '#f3dca0'], [55, 158, '#f5d7cb'], [67, 187, '#fff0cc'],
    [246, 84, '#f1c8bd'], [244, 147, '#fff0cc'], [23, 177, '#f4d8bc'], [218, 188, '#f3dca0'],
    [73, 69, '#f4dbbb'], [258, 185, '#f4d8bc'], [173, 153, '#fff0cc'], [97, 137, '#f4d8bc']]) {
    c.rect(x, y + 2, 1, 3, '#829d5c');
    c.rect(x - 1, y + 2, 3, 1, '#96ac69');
    c.rect(x - 1, y, 3, 1, color);
    c.rect(x, y - 1, 1, 3, color);
    c.px(x, y, '#e1ab73');
  }
  // Edge hedge belongs to the existing blocked border. Walkable ground stays visibly walkable.
  for (let x = 3; x < width - 2; x += 6) {
    c.circle(x, 5 + noise(x, 0) % 3, 5, '#a0b874');
    c.circle(x + 1, 4, 3, '#b0c47d');
    c.circle(x, height - 5, 4, '#a9bf77');
  }
  for (let y = 14; y < height - 10; y += 8) {
    c.circle(3, y, 4, '#a9bf77');
    c.circle(width - 4, y + 2, 4, '#a9bf77');
  }
  return c;
}

export function makeBlossom() {
  const c = new PixelCanvas(44, 48);
  c.rect(18, 26, 8, 21, '#885956');
  c.rect(20, 29, 4, 18, '#b17c65');
  c.rect(13, 26, 7, 3, '#885956');
  for (const [x, y, r] of [[13,22,10],[29,19,13],[21,13,12],[10,15,8],[31,26,9],[18,25,10],[35,18,7]]) {
    c.circle(x, y, r, '#986866');
    c.circle(x, y - 1, r - 1, '#da9696');
    c.circle(x - 1, y - 3, r - 3, '#ecc0ae');
    c.circle(x - 2, y - 4, Math.max(1, r - 6), '#f8d4bd');
  }
  for (const [x, y] of [[7,15],[21,8],[31,15],[14,23],[29,27],[35,21],[24,17],[10,30]]) {
    c.rect(x, y, 3, 1, '#ffe2cc');
    c.px(x + 1, y + 1, '#f9d0bb');
  }
  return c;
}

export function makeCottage() {
  const c = new PixelCanvas(60, 44);
  c.rect(8, 18, 44, 25, '#8c6056');
  c.rect(10, 19, 40, 22, '#f2d9b2');
  c.rect(10, 37, 40, 4, '#c8926e');
  for (let y = 0; y < 22; y += 1) {
    const inset = Math.max(1, 23 - y);
    c.rect(inset, y, 60 - 2 * inset, 1, y > 19 ? '#aa6d66' : y % 5 === 0 ? '#ce8982' : '#e3a19a');
  }
  c.rect(8, 20, 44, 2, '#925e5c');
  c.rect(23, 24, 14, 18, '#9c6a51');
  c.rect(25, 26, 10, 15, '#ba8b67');
  c.rect(28, 28, 5, 5, '#b3d0bd');
  c.px(33, 36, '#ffe2a6');
  for (const x of [12, 41]) {
    c.rect(x, 25, 7, 8, '#ac7961');
    c.rect(x + 1, 26, 5, 6, '#b1cdbc');
    c.rect(x - 1, 33, 9, 2, '#b67961');
  }
  c.rect(20, 42, 20, 2, '#d2a57b');
  return c;
}

const avatarColors = {
  outline: '#3a3a50', edge: '#46465e',
  hair: '#68755d', hairShadow: '#52614e', hairLight: '#889473',
  skin: '#efa586', skinShadow: '#c37569', skinLight: '#ffd2a5',
  shirt: '#75678f', shirtShadow: '#575071', shirtLight: '#a698b7',
};

export const rigLayout = { frameWidth: 16, frameHeight: 32, frameCount: 6, directions: ['right', 'up', 'left', 'down'] };
export const AVATAR_ATLAS_ROW_COUNT = 4;
export { avatarColors };

const DIAGONAL_PRIMARY = {
  'down-right': 'down',
  'down-left': 'down',
  'up-right': 'up',
  'up-left': 'up',
};
const DIAGONAL_ORDER = ['down-right', 'down-left', 'up-right', 'up-left'];
const DIAGONAL_SECONDARY = {
  'down-right': 'right',
  'down-left': 'left',
  'up-right': 'right',
  'up-left': 'left',
};

function paintAvatarFrame(c, ox, oy, hairStyle, direction, rowKind, frame, legBias = 0) {
  const p = avatarColors;
  const isSit = rowKind === 2;
  const isWalk = rowKind === 1;
  const isPhone = rowKind === 3;
  const step = isWalk ? [0, 1, 1, 0, -1, -1][frame] + legBias : legBias;
  const bob = (isWalk && frame % 3 !== 0 ? -1 : 0) + (isSit ? 3 : 0) + (rowKind === 0 && frame >= 3 ? 1 : 0);
  const r = (dx, dy, w, h, color) => c.rect(ox + dx, oy + dy, w, h, color);
  const side = direction === 'left' || direction === 'right';
  const right = direction === 'right';
  const back = direction === 'up';
  if (isSit) {
    // Cozy seated legs tucked forward/down
    r(4, 27, 4, 4, p.outline);
    r(8, 27, 4, 4, p.outline);
    r(5, 28, 2, 2, '#786679');
    r(9, 28, 2, 2, '#6b596a');
  } else if (side) {
    r(5 + step, 26, 3, 5, '#6b596a');
    r(8 - step, 26, 3, 6, p.outline);
  } else {
    r(5, 26, 3, 6 - Math.max(step, 0), p.outline);
    r(9, 26, 3, 6 + Math.min(step, 0), p.outline);
    r(6, 28, 2, 2, '#786679');
    r(9, 28, 2, 2, '#6b596a');
  }
  r(4, 20 + bob, 8, 8, p.outline);
  r(5, 21 + bob, 6, 6, p.shirt);
  r(5, 25 + bob, 6, 2, p.shirtShadow);
  r(6, 21 + bob, 4, 1, p.shirtLight);
  if (!side) {
    if (isPhone && !back) {
      r(3, 21 + bob, 2, 4, p.shirtShadow);
      r(11, 21 + bob, 2, 4, p.shirtShadow);
      r(6, 22 + bob, 4, 3, '#cbe7f5');
      r(7, 23 + bob, 2, 2, '#8bc4d9');
    } else {
      r(3, 21 + bob + Math.max(step, 0), 2, 4, p.shirtShadow);
      r(11, 21 + bob + Math.max(-step, 0), 2, 4, p.shirtShadow);
      r(3, 24 + bob + Math.max(step, 0), 2, 2, p.skin);
      r(11, 24 + bob + Math.max(-step, 0), 2, 2, p.skinShadow);
    }
  } else {
    r(7 + step, 22 + bob, 2, 4, p.shirtShadow);
    r(7 + step, 25 + bob, 2, 1, p.skin);
  }
  r(5, 9 + bob, 6, 1, p.edge);
  r(3, 11 + bob, 10, 8, p.outline);
  r(4, 10 + bob, 8, 10, p.hair);
  r(5, 10 + bob, 5, 1, p.hairLight);
  const faceX = side ? (right ? 8 : 4) : 4;
  if (!back) {
    r(faceX, 14 + bob, side ? 4 : 8, 5, p.skin);
    r(faceX, 18 + bob, side ? 4 : 8, 1, p.skinShadow);
    r(faceX + 1, 15 + bob, side ? 2 : 6, 1, p.skinLight);
    r(side ? (right ? 10 : 5) : 5, 16 + bob, 1, 1, p.outline);
    if (!side) r(10, 16 + bob, 1, 1, p.outline);
    r(6, 19 + bob, 4, 1, p.skinShadow);
  } else {
    r(5, 13 + bob, 6, 7, p.hairShadow);
    r(6, 13 + bob, 2, 4, p.hair);
  }
  r(4, 12 + bob, 8, hairStyle === 'short' ? 2 : 3, p.hair);
  if (hairStyle !== 'short') {
    const h = hairStyle === 'long' ? 10 : 6;
    if (!side || right) r(3, 14 + bob, 2, h, p.hairShadow);
    if (!side || !right) r(11, 14 + bob, 2, h, p.hairShadow);
  }
}

function paintLieFrame(c, ox, oy, hairStyle, direction, frame) {
  const p = avatarColors;
  const breathe = frame % 3 === 1 ? 1 : 0;
  const r = (dx, dy, w, h, color) => c.rect(ox + dx, oy + dy, w, h, color);
  r(1, 27 + breathe, 14, 3, p.outline);
  r(2, 28 + breathe, 12, 1, '#786679');
  if (direction === 'down' || direction === 'up') {
    r(3, 22 + breathe, 10, 6, p.shirt);
    r(3, 26 + breathe, 10, 2, p.shirtShadow);
    r(5, 20 + breathe, 6, 4, p.skin);
    r(4, 19 + breathe, 8, 8, p.hair);
    r(6, 22 + breathe, 4, 1, p.outline);
    r(5, 23 + breathe, 2, 1, p.skinLight);
    r(9, 23 + breathe, 2, 1, p.skinLight);
  } else {
    const flip = direction === 'right';
    const hx = flip ? 9 : 2;
    r(hx, 22 + breathe, 5, 5, p.skin);
    r(hx - 1, 21 + breathe, 7, 6, p.hair);
    r(4, 24 + breathe, 8, 4, p.shirt);
    r(2, 25 + breathe, 12, 3, p.shirtShadow);
    r(flip ? 2 : 10, 24 + breathe, 2, 2, p.skin);
  }
  if (hairStyle !== 'short') {
    r(4, 18 + breathe, 8, hairStyle === 'long' ? 3 : 2, p.hairShadow);
  }
}

export function makeRig(hairStyle) {
  const c = new PixelCanvas(384, rigLayout.frameHeight * AVATAR_ATLAS_ROW_COUNT);
  for (let row = 0; row < AVATAR_ATLAS_ROW_COUNT; row += 1) {
    for (const [index, direction] of rigLayout.directions.entries()) {
      for (let frame = 0; frame < rigLayout.frameCount; frame += 1) {
        paintAvatarFrame(
          c,
          (index * rigLayout.frameCount + frame) * rigLayout.frameWidth,
          row * rigLayout.frameHeight,
          hairStyle,
          direction,
          row,
          frame,
        );
      }
    }
  }
  return c;
}
