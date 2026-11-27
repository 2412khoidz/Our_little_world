import { TABLE_H, TABLE_W } from '../../../shared/billiards/physicsEngine';

export function isPortraitTableViewport(width: number, height: number): boolean {
  return width <= 720 && height > width * 1.1;
}

export function physicsToCanvasDims(portraitRotated: boolean): { width: number; height: number } {
  return portraitRotated
    ? { width: TABLE_H, height: TABLE_W }
    : { width: TABLE_W, height: TABLE_H };
}

/**
 * Converts a CSS-canvas point `(sx, sy)` inside the display canvas (landscape 1000x540 or
 * portrait-rotated 540x1000 via `-90deg` CCW transform) back into physics coordinates `(x, y)`
 * in `[0..1000] x [0..540]`.
 *
 * Forward portrait canvas transform:
 *   `ctx.translate(0, TABLE_W); ctx.rotate(-Math.PI / 2);`
 * maps physics `(x, y)` -> canvas `(px = y, py = TABLE_W - x)`.
 * Inverse maps canvas `(px, py)` -> physics `(x = TABLE_W - py, y = px)`.
 */
export function canvasDisplayToPhysics2D(
  px: number,
  py: number,
  zoomCurrent: number,
  camX: number,
  camY: number,
  portraitRotated: boolean,
): { x: number; y: number } {
  const unrot = portraitRotated ? { x: TABLE_W - py, y: px } : { x: px, y: py };
  if (zoomCurrent <= 1.001) return unrot;
  return {
    x: (unrot.x - TABLE_W / 2) / zoomCurrent + camX,
    y: (unrot.y - TABLE_H / 2) / zoomCurrent + camY,
  };
}

export function clientToPhysics2D(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  zoomCurrent: number,
  camX: number,
  camY: number,
  portraitRotated: boolean,
): { x: number; y: number } {
  const w = rect.width || (portraitRotated ? TABLE_H : TABLE_W);
  const h = rect.height || (portraitRotated ? TABLE_W : TABLE_H);
  const dims = physicsToCanvasDims(portraitRotated);
  const px = ((clientX - rect.left) / w) * dims.width;
  const py = ((clientY - rect.top) / h) * dims.height;
  return canvasDisplayToPhysics2D(px, py, zoomCurrent, camX, camY, portraitRotated);
}

/**
 * Converts a physics table point `(x, y)` to current CSS client offset `(clientX, clientY)`
 * inside `rect`, accounting for active zoom and portrait rotation.
 */
export function physicsToClient2D(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
  zoomCurrent: number,
  camX: number,
  camY: number,
  portraitRotated: boolean,
): { x: number; y: number } {
  const vx = zoomCurrent > 1.001 ? (x - camX) * zoomCurrent + TABLE_W / 2 : x;
  const vy = zoomCurrent > 1.001 ? (y - camY) * zoomCurrent + TABLE_H / 2 : y;
  const dims = physicsToCanvasDims(portraitRotated);
  const px = portraitRotated ? vy : vx;
  const py = portraitRotated ? TABLE_W - vx : vy;
  return {
    x: rect.left + (px / dims.width) * rect.width,
    y: rect.top + (py / dims.height) * rect.height,
  };
}
