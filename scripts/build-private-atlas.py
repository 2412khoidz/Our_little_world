"""Crop the approved Demo E selections for local, non-commercial use."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

from PIL import Image


def main() -> None:
    config = json.load(sys.stdin)
    output = Path(config["output"])
    sources = Path(config["sources"])
    public = Path(config["fallback"])
    registry = config["registry"]
    ids = config["ids"]
    manifest = json.loads((public / "manifest.json").read_text(encoding="utf-8"))
    sheets = {
        name: Image.open(public / texture["file"]).convert("RGBA")
        for name, texture in manifest["textures"].items()
    }
    entries = {entry["id"]: entry for entry in manifest["entries"]}
    textures = config["paths"]
    loaded: dict[str, tuple[Image.Image, str]] = {}
    used: dict[str, dict[str, str]] = {}
    pack_data = {
        "sprout-lands-basic": ("Cup Nooble", "Sprout Lands Basic", "https://cupnooble.itch.io/sprout-lands-asset-pack"),
        "sprout-lands-sorry": ("Cup Nooble", "Sprout Sorry Pack, Early Access", "https://cupnooble.itch.io/sprout-lands-asset-pack"),
        "modern-interiors-free": ("LimeZu", "Modern Interiors Free 16x16", "https://limezu.itch.io/moderninteriors"),
        "cozy-lands-basic": ("Amo-QAQ", "Cozy Lands Basic", "https://amo-qaq.itch.io/cozy-lands"),
        "sunnyside-world": ("Daniel Diggle", "Sunnyside World 2.1", "https://danieldiggle.itch.io/sunnyside"),
    }

    def load(relative: str) -> Image.Image:
        if relative not in loaded:
            file = sources / relative
            if not file.is_file():
                raise FileNotFoundError(f"Thiếu nguồn Demo E local: {relative}")
            with Image.open(file) as image:
                decoded = image.convert("RGBA")
            sha = hashlib.sha256(file.read_bytes()).hexdigest()
            loaded[relative] = decoded, sha
        image, sha = loaded[relative]
        pack = relative.split("/")[0]
        author, version, url = pack_data[pack]
        used[relative] = {"file": relative, "sha256": sha, "pack": pack,
                          "credit": author, "version": version, "sourceUrl": url,
                          "license": "Private non-commercial use",
                          "deployment": "Pending Deployment License Verification"}
        return image

    def cut(relative: str, x: int, y: int, w: int, h: int) -> Image.Image:
        image = load(relative)
        if not (0 <= x < x + w <= image.width and 0 <= y < y + h <= image.height):
            raise ValueError(f"Khung ngoài nguồn Demo E: {relative} {(x, y, w, h)}")
        return image.crop((x, y, x + w, y + h))

    def semantic(id: str) -> tuple[Image.Image, str]:
        spec = registry[id]
        relative = textures[spec["textureKey"]]
        rect = spec["rect"]
        return cut(relative, rect["x"], rect["y"], rect["w"], rect["h"]), relative

    def set_frame(id: str, image: Image.Image, evidence: list[str], center: bool = False) -> None:
        entry = entries[id]
        x, y, w, h = (entry["rect"][key] for key in ("x", "y", "w", "h"))
        if center:
            bbox = image.getbbox()
            if not bbox:
                raise ValueError(f"Khung Demo E rỗng: {id}")
            image = image.crop(bbox)
            image.thumbnail((w, h), Image.Resampling.NEAREST)
            region = Image.new("RGBA", (w, h))
            region.paste(image, ((w - image.width) // 2, h - image.height))
            image = region
        if image.size != (w, h):
            raise ValueError(f"Sai kích thước patch cho {id}: {image.size}")
        sheets[entry["texture"]].paste(image, (x, y))
        entry["source"] = {**used[evidence[0]], "inputs": evidence}
        entry["source"]["composed"] = len(evidence) > 1

    floor, floor_file = semantic("floor.herringbone_oak")
    # Preserve the source herringbone motif, reducing contrast without resampling pixels.
    for y in range(floor.height):
        for x in range(floor.width):
            r, g, b, a = floor.getpixel((x, y))
            floor.putpixel((x, y), (
                (r * 18 + 215 * 82) // 100,
                (g * 18 + 171 * 82) // 100,
                (b * 18 + 132 * 82) // 100, a,
            ))
    mosaic = cut(floor_file, 11 * 16, 7 * 16, 32, 32)
    wall_top = cut(floor_file, 16, 7 * 16, 16, 16)
    wall_base = cut(floor_file, 16, 8 * 16, 16, 16)
    wall_panel = Image.new("RGBA", (16, 16), wall_top.getpixel((8, 12)))
    # Keep the mosaic panel uninterrupted by mixed blue tiles.
    home = Image.new("RGBA", (256, 192), (214, 173, 130, 255))
    for ty in range(12):
        for tx in range(16):
            wall = ty <= 2 or tx in (0, 15) or ty == 11 and tx not in (7, 8)
            if wall:
                tile = wall_top if ty == 0 else wall_panel if ty == 1 else wall_base
                if tx in (0, 15) and ty > 2:
                    tile = wall_base.transpose(Image.Transpose.ROTATE_90 if tx == 0 else Image.Transpose.ROTATE_270)
            else:
                material = mosaic if 10 <= tx <= 14 and 3 <= ty <= 5 else floor
                ox = 16 * ((tx + (ty // 2)) % 2)
                oy = 16 * (ty % 2)
                tile = material.crop((ox, oy, ox + 16, oy + 16))
            home.alpha_composite(tile, (tx * 16, ty * 16))
    window, window_file = semantic("furn.wood_window")
    for x in (25, 112, 201):
        home.alpha_composite(window, (x, 8))
    set_frame(ids["background"]["home"], home, [floor_file, window_file])
    entries[ids["background"]["home"]]["source"]["changes"] = "Ground composition, contrast-softened herringbone"

    grass_file = textures["e-grass"]
    dirt_file = textures["e-dirt-wide"]
    garden = Image.new("RGBA", (288, 224), (188, 204, 130, 255))

    def path_cell(x: int, y: int) -> bool:
        return ((7 <= x <= 9 and 2 <= y <= 5) or (4 <= x <= 13 and 5 <= y <= 6)
                or (8 <= x <= 9 and 6 <= y <= 11) or (8 <= x <= 12 and 10 <= y <= 11))

    for ty in range(14):
        for tx in range(18):
            key = ((tx * 73856093) ^ (ty * 19349663) ^ 4219)
            variant = key % 12 if key % 5 < 2 else (0, 1, 2, 6)[key % 4]
            grass = cut(grass_file, variant % 6 * 16, (5 + variant // 6) * 16, 16, 16)
            garden.alpha_composite(grass, (tx * 16, ty * 16))
            if not path_cell(tx, ty):
                if key % 17 == 0:
                    flora = cut(grass_file, (6 + key % 2) * 16, (5 + key % 2) * 16, 16, 16)
                    garden.alpha_composite(flora, (tx * 16, ty * 16))
                continue
            left, right = path_cell(tx - 1, ty), path_cell(tx + 1, ty)
            up, down = path_cell(tx, ty - 1), path_cell(tx, ty + 1)
            col = 0 if not left else 2 if not right else 1
            row = 0 if not up else 2 if not down else 1
            # Handle the one-tile cross sections with the matching channel of the source sheet.
            if not left and not right:
                col = 3
            elif not up and not down:
                row = 3
            dirt = cut(dirt_file, col * 16, row * 16, 16, 16)
            garden.alpha_composite(dirt, (tx * 16, ty * 16))
    set_frame(ids["background"]["garden"], garden, [grass_file, dirt_file])

    compatible_frames = {
        "lantern_garden": "furn.lamp_bedside",
        "flowerpot_sakura": "nature.planter_box",
    }
    for sku, id in ids["furniture"].items():
        selection = compatible_frames.get(sku, id)
        if sku in ("wardrobe_oak", "sofa_cream", "plant_monstera"):
            relative = textures["e-interiors"]
            bounds = {
                "wardrobe_oak": (7 * 16, 48 * 16, 32, 48),
                "sofa_cream": (4 * 16, 72 * 16, 48, 32),
                "plant_monstera": (12 * 16, 45 * 16, 16, 32),
            }[sku]
            image = cut(relative, *bounds)
            selection = "Modern Interiors " + str(bounds)
        else:
            image, relative = semantic(selection)
        set_frame(id, image, [relative], center=True)
        entries[id]["source"]["selection"] = selection

    for id in ids["scenery"].values():
        image, relative = semantic(id)
        set_frame(id, image, [relative], center=True)

    for style, rig in zip(config["rigStyles"], ("Adam", "Alex", "Amelia")):
        files = [f"modern-interiors-free/Characters_free/{rig}_{action}_16x16.png"
                 for action in ("idle_anim", "run")]
        frames = Image.new("RGBA", (384, 64))
        for row, relative in enumerate(files):
            frames.paste(cut(relative, 0, 0, 384, 32), (0, row * 32))
        set_frame(ids["rigs"][style], frames, files)

    manifest["profile"] = "private"
    manifest["upstream"] = list(used.values())
    output.mkdir(parents=True, exist_ok=True)
    for name, image in sheets.items():
        image.save(output / manifest["textures"][name]["file"], optimize=True)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    credits = [
        "# Credits — Demo E, bản phát triển riêng", "",
        "Asset gốc được dùng trong dự án cá nhân, phi thương mại. Quyền phục vụ qua Internet cần xác minh trước deploy.",
        "Đã cắt khung, đóng atlas, ghép ground và resize nearest-neighbor ở một số vật thể để vừa footprint V0.1.", "",
    ]
    for author, version, url in pack_data.values():
        credits.append(f"- **{author}** — [{version}]({url}). Pending Deployment License Verification.")
    credits.append("- **Frakassets** — [Free Pets Pack](https://frakassets.itch.io/free-pets-pack), "
                   "[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Cắt frame 16×16 có ghi nguồn trong manifest.")
    (output / "CREDITS.md").write_text("\n".join(credits) + "\n", encoding="utf-8")
    print(f"Atlas Demo E riêng: {len(entries)} semantic ID từ {len(used)} tệp nguồn.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError) as error:
        sys.exit(str(error))
