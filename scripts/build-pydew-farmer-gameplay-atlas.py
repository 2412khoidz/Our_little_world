#!/usr/bin/env python3
"""Pack vendored PyDew farmer PNGs into OLW Phaser spritesheets (64×64 cells)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "public/assets/donor/pydew-characters/source"
OUT = REPO / "public/assets/donor/pydew-characters"

FRAME = 64
COLS = 16  # 4 dirs × 4 frame slots
DIRS = ("down", "left", "right", "up")
DIR_INDEX = {"down": 0, "left": 1, "right": 2, "up": 3}

ROWS = {
    "idle": 0,
    "walk": 1,
    "hoe": 2,
    "water": 3,
    "harvest": 4,  # axe
}


def load_frames(folder: str) -> list[Image.Image]:
    p = SRC / folder
    if not p.is_dir():
        return []
    frames: list[Image.Image] = []
    for f in sorted(p.glob("*.png")):
        im = Image.open(f).convert("RGBA")
        bbox = im.getbbox()
        if not bbox:
            continue
        crop = im.crop(bbox)
        # letterbox into FRAME×FRAME
        cell = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        rw, rh = crop.size
        scale = min(FRAME / rw, FRAME / rh, 1.0)
        nw, nh = max(1, int(rw * scale)), max(1, int(rh * scale))
        resized = crop.resize((nw, nh), Image.Resampling.NEAREST)
        ox = (FRAME - nw) // 2
        oy = FRAME - nh  # feet on baseline
        cell.paste(resized, (ox, oy), resized)
        frames.append(cell)
    return frames


def blit_row(sheet: Image.Image, row: int, dir_name: str, frames: list[Image.Image], max_slots: int = 4) -> None:
    d = DIR_INDEX[dir_name]
    for i, fr in enumerate(frames[:max_slots]):
        sheet.paste(fr, ((d * max_slots + i) * FRAME, row * FRAME), fr)


def build_sheet(partner_tint: float | None) -> Image.Image:
    height = len(ROWS) * FRAME
    sheet = Image.new("RGBA", (COLS * FRAME, height), (0, 0, 0, 0))

    for direction in DIRS:
        idle = load_frames(f"{direction}_idle") or load_frames(direction)[:1]
        walk = load_frames(direction)
        hoe = load_frames(f"{direction}_hoe")
        water = load_frames(f"{direction}_water")
        harvest = load_frames(f"{direction}_axe")

        if not idle and walk:
            idle = [walk[0]]
        if not idle:
            continue

        blit_row(sheet, ROWS["idle"], direction, idle, 4)
        blit_row(sheet, ROWS["walk"], direction, walk, 4)
        blit_row(sheet, ROWS["hoe"], direction, hoe or idle, 4)
        blit_row(sheet, ROWS["water"], direction, water or idle, 4)
        blit_row(sheet, ROWS["harvest"], direction, harvest or hoe or idle, 4)

    if partner_tint is not None:
        px = sheet.load()
        w, h = sheet.size
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < 8:
                    continue
                # light rose shift for partner B distinction
                r = min(255, int(r * (1.0 + partner_tint * 0.08) + partner_tint * 12))
                g = min(255, int(g * (1.0 - partner_tint * 0.04)))
                b = min(255, int(b * (1.0 + partner_tint * 0.06)))
                px[x, y] = (r, g, b, a)

    return sheet


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    build_sheet(None).save(OUT / "farmer-may-atlas.png")
    build_sheet(1.0).save(OUT / "farmer-nang-atlas.png")
    build_sheet(0.55).save(OUT / "farmer-rose-atlas.png")
    print("Wrote", OUT / "farmer-may-atlas.png", OUT / "farmer-nang-atlas.png", OUT / "farmer-rose-atlas.png")


if __name__ == "__main__":
    if not SRC.is_dir():
        raise SystemExit("Run node scripts/vendor-donor-pydew-characters.mjs first")
    main()