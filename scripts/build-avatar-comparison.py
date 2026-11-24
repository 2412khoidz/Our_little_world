"""Generate side-by-side 4x nearest-neighbor visual comparison of all 4 avatar candidates.

Outputs:
- asset-candidates/contact-sheets/avatar-candidates-comparison.png
- Can also copy to the file set in OLW_ARTIFACT_COPY.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent
EXTRACTED = REPO_ROOT / "asset-candidates" / "extracted"
OUT_PATH = REPO_ROOT / "asset-candidates" / "contact-sheets" / "avatar-candidates-comparison.png"
FONT = ImageFont.load_default()


def crop_tight_or_fixed(im: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    return im.crop(box).convert("RGBA")


def main() -> None:
    scale = 4
    col_w = 272
    panel_h = 376
    gap = 12
    header_h = 46

    # Load spritesheets
    cp = Image.open(EXTRACTED / "cozy-people-free/char free/global.png").convert("RGBA")
    # Stack Cozy People layers properly: body r0 -> shoes r8 -> pants r6 -> shirt r4 -> hair r2
    def compose_cp(col: int, row_offset: int) -> Image.Image:
        base = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        for r in (0, 8, 6, 4, 2):
            layer = cp.crop((col * 32, (r + row_offset) * 32, (col + 1) * 32, (r + row_offset + 1) * 32))
            base.alpha_composite(layer)
        return base.crop((8, 10, 24, 32))  # 16x22 center

    mi_adam = Image.open(EXTRACTED / "modern-interiors-free/Characters_free/Adam_idle_anim_16x16.png").convert("RGBA")
    mi_alex = Image.open(EXTRACTED / "modern-interiors-free/Characters_free/Alex_idle_anim_16x16.png").convert("RGBA")
    mi_amelia = Image.open(EXTRACTED / "modern-interiors-free/Characters_free/Amelia_idle_anim_16x16.png").convert("RGBA")
    mi_sit = Image.open(EXTRACTED / "modern-interiors-free/Characters_free/Amelia_sit_16x16.png").convert("RGBA")
    mi_chair = Image.open(EXTRACTED / "modern-interiors-free/Interiors_free/16x16/Interiors_free_16x16.png").convert("RGBA").crop((16, 21 * 16, 32, 23 * 16))

    sl = Image.open(EXTRACTED / "sprout-lands-basic/Characters/Basic Charakter Spritesheet.png").convert("RGBA")
    sun_b = Image.open(EXTRACTED / "sunnyside-world/Characters/Human/IDLE/base_idle_strip9.png").convert("RGBA")
    sun_s = Image.open(EXTRACTED / "sunnyside-world/Characters/Human/IDLE/shorthair_idle_strip9.png").convert("RGBA")
    sun_l = Image.open(EXTRACTED / "sunnyside-world/Characters/Human/IDLE/longhair_idle_strip9.png").convert("RGBA")

    def compose_sun(hair_sheet: Image.Image) -> Image.Image:
        out = sun_b.crop((32, 16, 64, 48)).convert("RGBA")
        out.alpha_composite(hair_sheet.crop((32, 16, 64, 48)))
        return out.crop((8, 4, 24, 26))  # 16x22 centered

    candidates = [
        {
            "title": "1. Cozy People (Free)",
            "badge": "12x20px · Paper-doll L/R only (Free)",
            "accent": (230, 155, 120, 255),
            "frames": [
                ("Front", compose_cp(0, 0)),
                ("Walk R", compose_cp(6, 0)),
                ("Walk L", compose_cp(2, 1)),
                ("Back", compose_cp(4, 1)),
            ],
            "pros": [
                "+ Layered skin/hair/shirt/pants/shoes",
                "+ Soft pastel outlines",
                "- Free zip has ONLY L/R GIFs walk",
                "- Missing 4-dir up/down walk",
            ],
        },
        {
            "title": "2. Modern Interiors (Free)",
            "badge": "16x23px · TRUE 4-Dir + Sit + Phone",
            "accent": (139, 196, 217, 255),
            "frames": [
                ("Adam", mi_adam.crop((18 * 16, 4, 19 * 16, 32))),
                ("Alex", mi_alex.crop((18 * 16, 4, 19 * 16, 32))),
                ("Amelia", mi_amelia.crop((18 * 16, 4, 19 * 16, 32))),
                ("Back", mi_amelia.crop((6 * 16, 4, 7 * 16, 32))),
            ],
            "extras": [("Side + Sit", mi_sit.crop((0, 4, 16, 32))), ("Ref Chair", mi_chair)],
            "pros": [
                "+ Selected UNIFIED DEMO E RIG",
                "+ True 4-dir Idle (6f), Run (6f), Sit",
                "+ Disjoint ramps -> full V0.1 recolor",
                "+ Fits 16x16 & 16x32 furniture",
            ],
        },
        {
            "title": "3. Sprout Lands (Basic)",
            "badge": "14x16px · Animal-Ear Chibi 4-Dir",
            "accent": (235, 158, 184, 255),
            "frames": [
                ("Down", sl.crop((16, 12, 32, 34))),
                ("Up", sl.crop((16, 60, 32, 82))),
                ("Left", sl.crop((16, 108, 32, 130))),
                ("Right", sl.crop((16, 156, 32, 178))),
            ],
            "pros": [
                "+ Cute cozy chibi, 4-dir + farm/fish",
                "+ Matches Sprout garden natively",
                "- Too short next to LimeZu desks",
                "- Fixed outfit/hair (harder V0.1 cust)",
            ],
        },
        {
            "title": "4. Sunnyside World v2.1",
            "badge": "14x18px · Smooth 9f (2-Dir L/R)",
            "accent": (240, 184, 107, 255),
            "frames": [
                ("Short (R)", compose_sun(sun_s)),
                ("Long (R)", compose_sun(sun_l)),
                ("Short (L)", compose_sun(sun_s).transpose(Image.Transpose.FLIP_LEFT_RIGHT)),
                ("Long (L)", compose_sun(sun_l).transpose(Image.Transpose.FLIP_LEFT_RIGHT)),
            ],
            "pros": [
                "+ Silky 9-frame anims, 6 hair layers",
                "+ 20 actions (water/dig/cast/carry)",
                "+ Free commercial license",
                "- ONLY Left/Right flip (no Up/Down)",
            ],
        },
    ]

    total_w = len(candidates) * col_w + (len(candidates) + 1) * gap
    total_h = header_h + panel_h + gap
    canvas = Image.new("RGBA", (total_w, total_h), (26, 21, 25, 255))
    d = ImageDraw.Draw(canvas)
    d.text(
        (gap, 10),
        "Our Little World · Avatar Candidates Comparison (4x pixel-exact scale, aligned feet)",
        fill=(255, 245, 232, 255),
        font=FONT,
    )
    d.text(
        (gap, 26),
        "Verdict for Demo E: Modern Interiors rig (Adam/Alex/Amelia) + V0.1 Canvas Palette Remap preserves 100% customization & 4-dir scale harmony.",
        fill=(216, 198, 186, 255),
        font=FONT,
    )

    for idx, cand in enumerate(candidates):
        px = gap + idx * (col_w + gap)
        py = header_h
        card = Image.new("RGBA", (col_w, panel_h), (38, 30, 36, 255))
        cd = ImageDraw.Draw(card)
        cd.rectangle([0, 0, col_w - 1, panel_h - 1], outline=cand["accent"], width=2)
        cd.rectangle([0, 0, col_w - 1, 38], fill=(48, 38, 46, 255))
        cd.text((8, 6), cand["title"], fill=(255, 245, 232, 255), font=FONT)
        cd.text((8, 21), cand["badge"], fill=cand["accent"], font=FONT)

        # Checker floor stage
        stage_y = 48
        stage_h = 164
        for cy in range(stage_y, stage_y + stage_h, 16):
            for cx in range(8, col_w - 8, 16):
                c = (56, 46, 54, 255) if ((cx // 16 + cy // 16) % 2 == 0) else (66, 54, 63, 255)
                cd.rectangle([cx, cy, min(cx + 15, col_w - 9), min(cy + 15, stage_y + stage_h - 1)], fill=c)

        # Ground baseline inside stage
        baseline_y = stage_y + 136
        cd.line([(12, baseline_y), (col_w - 12, baseline_y)], fill=(255, 224, 180, 90), width=1)

        frames: list[tuple[str, Image.Image]] = cand["frames"]  # type: ignore[assignment]
        slot_w = (col_w - 16) // len(frames)
        for fi, (flabel, fimg) in enumerate(frames):
            up = fimg.resize((fimg.width * scale, fimg.height * scale), Image.Resampling.NEAREST)
            dx = 8 + fi * slot_w + (slot_w - up.width) // 2
            dy = baseline_y - up.height
            card.alpha_composite(up, (dx, dy))
            cd.text((8 + fi * slot_w + 4, baseline_y + 8), flabel[:10], fill=(225, 212, 204, 255), font=FONT)

        # Notes below stage
        ny = stage_y + stage_h + 12
        for line in cand["pros"]:
            color = (176, 228, 176, 255) if line.startswith("+") else (240, 172, 164, 255)
            cd.text((8, ny), line, fill=color, font=FONT)
            ny += 18

        canvas.alpha_composite(card, (px, py))

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT_PATH)
    artifact_copy = os.environ.get("OLW_ARTIFACT_COPY")
    if artifact_copy:
        artifact_path = Path(artifact_copy)
        artifact_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(OUT_PATH, artifact_path)
    print(f"Saved avatar comparison sheet: {OUT_PATH} ({canvas.size})")


if __name__ == "__main__":
    main()
