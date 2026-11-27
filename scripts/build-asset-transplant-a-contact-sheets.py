#!/usr/bin/env python3
"""OLW Worker A — donor + imported avatar contact sheets for Project store media/."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
STORE_MEDIA = Path("/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media")
OUT_REPO = REPO / "public/assets/donor/cabacos-characters"

FONT = ImageFont.load_default()
BG = (24, 19, 23, 255)
LABEL = (255, 244, 230, 255)


def sheet_panel(paths: list[tuple[Path, str]], title: str, frame_w: int, frame_h: int, scale: int = 2) -> Image.Image:
    panels: list[Image.Image] = []
    max_w = 0
    total_h = 36
    for p, label in paths:
        if not p.exists():
            raise FileNotFoundError(p)
        src = Image.open(p).convert("RGBA")
        frames = src.width // frame_w
        crop_h = min(frame_h, src.height)
        strip = Image.new("RGBA", (src.width * scale, crop_h * scale), (0, 0, 0, 0))
        for i in range(frames):
            cell = src.crop((i * frame_w, 0, (i + 1) * frame_w, crop_h))
            strip.paste(cell.resize((frame_w * scale, crop_h * scale), Image.Resampling.NEAREST), (i * frame_w * scale, 0))
        w, h = strip.size
        max_w = max(max_w, w)
        panel = Image.new("RGBA", (w + 16, h + 22), BG)
        d = ImageDraw.Draw(panel)
        d.text((8, 4), label, fill=LABEL, font=FONT)
        panel.paste(strip, (8, 18), strip)
        panels.append(panel)
        total_h += panel.size[1] + 8
    canvas = Image.new("RGBA", (max_w + 32, total_h), BG)
    d = ImageDraw.Draw(canvas)
    d.text((8, 6), title, fill=LABEL, font=FONT)
    y = 28
    for panel in panels:
        canvas.paste(panel, (8, y), panel)
        y += panel.size[1] + 8
    return canvas


def puny_contact() -> Image.Image:
    root = REPO / "public/assets/donor/cc0-puny-8d"
    paths = [
        (root / "character-base.png", "Puny base (CC0 gameplay)"),
        (root / "mage-cyan.png", "Nắng rig — mage-cyan"),
        (root / "mage-red.png", "Alt rig — mage-red"),
    ]
    return sheet_panel(paths, "OLW imported — Puny 8-dir gameplay (32×32)", 32, 32, scale=3)


def cabacos_contact() -> Image.Image:
    paths = [
        (OUT_REPO / "base_waiting_strip9.png", "Cabacos idle strip9"),
        (OUT_REPO / "base_walk_strip8.png", "Cabacos walk strip8"),
    ]
    return sheet_panel(paths, "Donor — Cabacos / Sunnyside player (96×64, flipX)", 96, 64, scale=1)


def walk_gif() -> Path:
    puny = Image.open(REPO / "public/assets/donor/cc0-puny-8d/mage-cyan.png").convert("RGBA")
    fw, fh = 32, 32
    # walk row = 1, down-right dir index 7 in puny layout, 3 frames
    row = 1
    dir_idx = 7
    frames = []
    for f in range(3):
        x = (dir_idx * 3 + f) * fw
        y = row * fh
        frames.append(puny.crop((x, y, x + fw, y + fh)).resize((96, 96), Image.Resampling.NEAREST))
    out = STORE_MEDIA / "asset-transplant-a-diagonal-walk.gif"
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=120, loop=0, disposal=2)
    return out


def main() -> None:
    STORE_MEDIA.mkdir(parents=True, exist_ok=True)
    cabacos_contact().save(STORE_MEDIA / "asset-transplant-a-donor-cabacos-characters.png")
    puny_contact().save(STORE_MEDIA / "asset-transplant-a-olw-puny-8dir.png")
    gif = walk_gif()
    print("Wrote", STORE_MEDIA / "asset-transplant-a-donor-cabacos-characters.png")
    print("Wrote", STORE_MEDIA / "asset-transplant-a-olw-puny-8dir.png")
    print("Wrote", gif)


if __name__ == "__main__":
    main()