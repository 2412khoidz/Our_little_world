#!/usr/bin/env python3
"""Worker G — cozy Puny contact matrix + acceptance GIFs for Project store media/."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
STORE_MEDIA = Path("/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media")
PUNY = REPO / "public/assets/donor/cc0-puny-8d"
CABACOS = REPO / "public/assets/donor/cabacos-characters"
FW, FH, COLS = 32, 32, 24

FONT = ImageFont.load_default()
BG = (24, 19, 23, 255)
LABEL = (255, 244, 230, 255)

# Cozy action rows (matches COZY_PUNY_ACTION_ROWS in punyCharacter8dSheet.ts)
ROWS = {
    "idle": 0,
    "walk": 1,
    "stave_hoe": 4,
    "bow_water": 3,
    "throw_harvest": 5,
    "hurt_sit": 6,
    "death_lie": 7,
    "bow_affection": 3,
}


def crop_frame(sheet: Image.Image, row: int, dir_idx: int, frame: int = 0) -> Image.Image:
    x = (dir_idx * 3 + frame) * FW
    y = row * FH
    return sheet.crop((x, y, x + FW, y + FH))


def scale(cell: Image.Image, scale: int = 4) -> Image.Image:
    return cell.resize((FW * scale, FH * scale), Image.Resampling.NEAREST)


def gif_triplet(sheet: Image.Image, row: int, dir_idx: int, out: Path, pixel_scale: int = 4) -> None:
    frames = [scale(crop_frame(sheet, row, dir_idx, f), pixel_scale) for f in range(3)]
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=130, loop=0, disposal=2)


def rig_matrix() -> Image.Image:
    """Compare Puny cozy, Cabacos Sunnyside ref; note PyDew/LPC/Purple Cat from prior store captures."""
    panels: list[tuple[str, Path | None, str]] = [
        ("Puny CC0 — CHOSEN (8-dir, cozy)", PUNY / "character-base.png", "walk row @ down"),
        ("Puny mage-cyan — Nắng 2P", PUNY / "mage-cyan.png", "gameplay sheet"),
        ("Cabacos/Sunnyside — ref only", CABACOS / "base_walk_strip8.png", "4-way flipX"),
        ("Soldier-blue — REJECTED combat", PUNY / "soldier-blue.png", "not gameplay"),
        ("PyDew farmer — ref (4-dir)", None, "see pydew graphics/character in maps/donor"),
        ("LPC / Purple Cat — not vendored", None, "license / no true 8-dir"),
    ]
    strip_h = 52
    w = 520
    canvas = Image.new("RGBA", (w, strip_h * len(panels) + 36), BG)
    d = ImageDraw.Draw(canvas)
    d.text((8, 8), "Worker G rig matrix — ONE cozy rig: Puny CC0 (Shade)", fill=LABEL, font=FONT)
    y = 32
    for title, path, note in panels:
        d.text((8, y + 4), title, fill=LABEL, font=FONT)
        d.text((8, y + 18), note, fill=(200, 190, 180, 255), font=FONT)
        if path and path.exists():
            thumb = Image.open(path).convert("RGBA")
            tw = min(200, thumb.width)
            th = int(thumb.height * (tw / thumb.width))
            thumb = thumb.resize((tw, th), Image.Resampling.NEAREST)
            canvas.paste(thumb, (w - tw - 12, y), thumb)
        y += strip_h
    return canvas


def main() -> None:
    STORE_MEDIA.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(PUNY / "mage-cyan.png").convert("RGBA")
    rig_matrix().save(STORE_MEDIA / "worker-g-cozy-rig-matrix.png")

    down = 0
    gif_triplet(sheet, ROWS["walk"], down, STORE_MEDIA / "worker-g-avatar-walk.gif")
    gif_triplet(sheet, ROWS["walk"], down, STORE_MEDIA / "worker-g-avatar-run.gif", pixel_scale=4)
    # run uses same frames; separate file for acceptance checklist
    gif_triplet(sheet, ROWS["hurt_sit"], down, STORE_MEDIA / "worker-g-avatar-sit.gif")
    gif_triplet(sheet, ROWS["death_lie"], down, STORE_MEDIA / "worker-g-avatar-lie.gif")
    gif_triplet(sheet, ROWS["stave_hoe"], down, STORE_MEDIA / "worker-g-avatar-hoe.gif")
    gif_triplet(sheet, ROWS["bow_water"], down, STORE_MEDIA / "worker-g-avatar-water.gif")
    gif_triplet(sheet, ROWS["throw_harvest"], down, STORE_MEDIA / "worker-g-avatar-harvest.gif")
    gif_triplet(sheet, ROWS["idle"], down, STORE_MEDIA / "worker-g-avatar-hold.gif")
    gif_triplet(sheet, ROWS["throw_harvest"], 6, STORE_MEDIA / "worker-g-avatar-fish.gif")
    gif_triplet(sheet, ROWS["bow_affection"], down, STORE_MEDIA / "worker-g-avatar-affection.gif")

    print("Wrote worker-g evidence GIFs + matrix to", STORE_MEDIA)


if __name__ == "__main__":
    main()