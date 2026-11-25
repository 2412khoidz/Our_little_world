#!/usr/bin/env python3
"""Worker G — rig matrix + PyDew farmer acceptance GIFs (non-Puny winner)."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
STORE_MEDIA = Path("/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media")
PYDEW = REPO / "public/assets/donor/pydew-characters/farmer-nang-atlas.png"
PUNY = REPO / "public/assets/donor/cc0-puny-8d/character-base.png"
CABACOS = REPO / "public/assets/donor/cabacos-characters/base_walk_strip8.png"

FW, FH, COLS = 64, 64, 16
ROWS = {"walk": 1, "idle": 0, "hoe": 2, "water": 3, "harvest": 4, "sit": 0, "lie": 0, "hold": 0, "fish": 4, "affection": 3}
FONT = ImageFont.load_default()
BG = (24, 19, 23, 255)
LABEL = (255, 244, 230, 255)


def crop_frame(sheet: Image.Image, row: int, dir_idx: int, frame: int = 0) -> Image.Image:
    x = (dir_idx * 4 + frame) * FW
    y = row * FH
    return sheet.crop((x, y, x + FW, y + FH))


def scale(cell: Image.Image, s: int = 3) -> Image.Image:
    return cell.resize((FW * s, FH * s), Image.Resampling.NEAREST)


def gif_triplet(sheet: Image.Image, row: int, dir_idx: int, out: Path, frames: int = 4) -> None:
    imgs = [scale(crop_frame(sheet, row, dir_idx, f)) for f in range(min(frames, 4))]
    if len(imgs) == 1:
        imgs = imgs * 3
    imgs[0].save(out, save_all=True, append_images=imgs[1:], duration=130, loop=0, disposal=2)


def rig_matrix() -> Image.Image:
    panels = [
        ("WINNER — PyDew farmer CC0", PYDEW, "Gameplay + wardrobe"),
        ("Puny CC0 — REJECTED aesthetic", PUNY, "Reference only"),
        ("Cabacos/Sunnyside MIT", CABACOS, "Village ref · flipX 4-way"),
        ("Purple Cat 8-dir", None, "Paid itch.io — not redistributed in repo"),
    ]
    w, strip_h = 540, 90
    canvas = Image.new("RGBA", (w, strip_h * len(panels) + 40), BG)
    d = ImageDraw.Draw(canvas)
    d.text((8, 8), "Worker G rig matrix — unified gameplay: PyDew farmer", fill=LABEL, font=FONT)
    y = 34
    for title, path, note in panels:
        d.text((8, y + 4), title, fill=LABEL, font=FONT)
        d.text((8, y + 20), note, fill=(210, 200, 190, 255), font=FONT)
        if path and path.exists():
            thumb = Image.open(path).convert("RGBA")
            tw = min(240, thumb.width)
            th = max(1, int(thumb.height * (tw / thumb.width)))
            thumb = thumb.resize((tw, th), Image.Resampling.NEAREST)
            canvas.paste(thumb, (w - tw - 8, y), thumb)
        y += strip_h
    return canvas


def main() -> None:
    STORE_MEDIA.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(PYDEW).convert("RGBA")
    rig_matrix().save(STORE_MEDIA / "worker-g-cozy-rig-matrix.png")
    down = 0
    gif_triplet(sheet, ROWS["walk"], down, STORE_MEDIA / "worker-g-avatar-walk.gif")
    gif_triplet(sheet, ROWS["walk"], down, STORE_MEDIA / "worker-g-avatar-run.gif")
    gif_triplet(sheet, ROWS["sit"], down, STORE_MEDIA / "worker-g-avatar-sit.gif", frames=2)
    gif_triplet(sheet, ROWS["lie"], down, STORE_MEDIA / "worker-g-avatar-lie.gif", frames=1)
    gif_triplet(sheet, ROWS["hoe"], down, STORE_MEDIA / "worker-g-avatar-hoe.gif", frames=2)
    gif_triplet(sheet, ROWS["water"], down, STORE_MEDIA / "worker-g-avatar-water.gif", frames=2)
    gif_triplet(sheet, ROWS["harvest"], down, STORE_MEDIA / "worker-g-avatar-harvest.gif", frames=2)
    gif_triplet(sheet, ROWS["hold"], down, STORE_MEDIA / "worker-g-avatar-hold.gif", frames=1)
    gif_triplet(sheet, ROWS["fish"], down, STORE_MEDIA / "worker-g-avatar-fish.gif", frames=2)
    gif_triplet(sheet, ROWS["affection"], down, STORE_MEDIA / "worker-g-avatar-affection.gif", frames=2)
    print("Wrote PyDew evidence to", STORE_MEDIA)


if __name__ == "__main__":
    main()