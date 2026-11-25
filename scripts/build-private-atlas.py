"""Crop the approved Demo E selections at 1:1 native pixel fidelity for local non-commercial use."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
import sys

from PIL import Image, ImageDraw


def main() -> None:
    config = json.load(sys.stdin)
    output = Path(config["output"])
    sources = Path(config["sources"])
    public = Path(config["fallback"])
    registry = config["registry"]
    ids = config["ids"]
    ext_ids = config["extIds"]
    textures = config["paths"]

    public_manifest = json.loads((public / "manifest.json").read_text(encoding="utf-8"))
    loaded: dict[str, tuple[Image.Image, str]] = {}
    used: dict[str, dict[str, str]] = {}
    pack_data = {
        "sprout-lands-basic": ("Cup Nooble", "Sprout Lands Basic", "https://cupnooble.itch.io/sprout-lands-asset-pack"),
        "sprout-lands-sorry": ("Cup Nooble", "Sprout Sorry Pack, Early Access", "https://cupnooble.itch.io/sprout-lands-asset-pack"),
        "modern-interiors-free": ("LimeZu", "Modern Interiors Free 16x16", "https://limezu.itch.io/moderninteriors"),
        "cozy-lands-basic": ("Amo-QAQ", "Cozy Lands Basic", "https://amo-qaq.itch.io/cozy-lands"),
        "sunnyside-world": ("Daniel Diggle", "Sunnyside World 2.1", "https://danieldiggle.itch.io/sunnyside"),
        "free-pets-pack": ("Frakassets", "Free Pets Pack", "https://frakassets.itch.io/free-pets-pack"),
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
        used[relative] = {
            "file": relative, "sha256": sha, "pack": pack,
            "credit": author, "version": version, "sourceUrl": url,
            "license": "CC-BY-4.0" if pack == "free-pets-pack" else "Private non-commercial use",
            "deployment": "CC-BY-4.0 with attribution" if pack == "free-pets-pack" else "Pending Deployment License Verification",
        }
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

    def pack_sprites(items: list[dict], sheet_w: int) -> tuple[Image.Image, list[dict]]:
        # Sort tallest first or shelf-pack cleanly at 1:1 with 2px gutter
        x = 0
        y = 0
        row_h = 0
        placements: list[tuple[dict, int, int]] = []
        for item in items:
            im: Image.Image = item["image"]
            w, h = im.size
            if x + w > sheet_w:
                x = 0
                y += row_h + 2
                row_h = 0
            placements.append((item, x, y))
            x += w + 2
            row_h = max(row_h, h)
        sheet_h = y + row_h + 2
        sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
        out_entries: list[dict] = []
        for item, px, py in placements:
            im = item["image"]
            w, h = im.size
            sheet.paste(im, (px, py))
            entry = {
                "id": item["id"],
                "texture": item.get("texture", "world"),
                "rect": {"x": px, "y": py, "w": w, "h": h},
                "anchor": item["anchor"],
                "source": {
                    **used[item["evidence"][0]],
                    "inputs": item["evidence"],
                    "composed": len(item["evidence"]) > 1,
                },
            }
            for extra_key in ("frameWidth", "frameHeight", "frameCount"):
                if extra_key in item:
                    entry[extra_key] = item[extra_key]
            out_entries.append(entry)
        return sheet, out_entries

    # === 1. Build rich 256x192 Home map background ===
    floor, floor_file = semantic("floor.herringbone_oak")
    for y in range(floor.height):
        for x in range(floor.width):
            r, g, b, a = floor.getpixel((x, y))
            floor.putpixel((x, y), (
                (r * 22 + 214 * 78) // 100,
                (g * 22 + 168 * 78) // 100,
                (b * 22 + 128 * 78) // 100, a,
            ))
    mosaic = cut(floor_file, 11 * 16, 7 * 16, 32, 32)
    wall_top = cut(floor_file, 5 * 16, 7 * 16, 16, 16)
    wall_base = cut(floor_file, 5 * 16, 8 * 16, 16, 16)
    wall_panel = Image.new("RGBA", (16, 16), wall_top.getpixel((8, 12)))

    home = Image.new("RGBA", (256, 192), (214, 173, 130, 255))
    for ty in range(12):
        for tx in range(16):
            if ty <= 2:
                tile = wall_top if ty == 0 else wall_panel if ty == 1 else wall_base
                home.alpha_composite(tile, (tx * 16, ty * 16))
            else:
                material = mosaic if (10 <= tx <= 14 and 3 <= ty <= 5) else floor
                ox = 16 * ((tx + (ty // 2)) % 2) if material is floor else 16 * (tx % 2)
                oy = 16 * (ty % 2)
                tile = material.crop((ox, oy, ox + 16, oy + 16))
                home.alpha_composite(tile, (tx * 16, ty * 16))

    # Subtle wood study divider trim & warm walnut perimeter molding (clean, zero rotated texture!)
    draw_home = ImageDraw.Draw(home)
    draw_home.rectangle([160, 48, 161, 95], fill=(125, 88, 70, 95))
    # Left & right warm wood trim walls
    draw_home.rectangle([0, 0, 15, 191], fill=(107, 75, 62, 255))
    draw_home.rectangle([2, 0, 13, 191], fill=(166, 116, 92, 255))
    draw_home.rectangle([240, 0, 255, 191], fill=(107, 75, 62, 255))
    draw_home.rectangle([242, 0, 253, 191], fill=(166, 116, 92, 255))
    # Bottom wooden wall framing entrance doorway at tx 7..8
    draw_home.rectangle([0, 176, 111, 191], fill=(107, 75, 62, 255))
    draw_home.rectangle([0, 178, 111, 189], fill=(166, 116, 92, 255))
    draw_home.rectangle([144, 176, 255, 191], fill=(107, 75, 62, 255))
    draw_home.rectangle([144, 178, 255, 189], fill=(166, 116, 92, 255))
    # Sunny welcome mat & threshold inside doorway
    draw_home.rectangle([112, 182, 143, 191], fill=(181, 134, 90, 255))
    draw_home.rectangle([115, 183, 140, 188], fill=(232, 199, 158, 255))

    # Bake static wall & bedroom rug Demo E touches onto home background cleanly (inside inner walls x 16..239)
    sage_rug, sage_file = semantic("furn.rug_sage_braid")
    home.alpha_composite(sage_rug, (16, 52))
    curtain_win, mi_file = semantic("furn.curtain_window")
    wood_win, _ = semantic("furn.wood_window")
    painting, _ = semantic("furn.painting_meadow")
    clock_wall, _ = semantic("furn.clock_wall")
    fairy_lights, _ = semantic("furn.fairy_lights")
    bookshelf_wide, _ = semantic("furn.bookshelf_wide")
    home.alpha_composite(curtain_win, (22, 12))
    home.alpha_composite(painting, (76, 22))
    home.alpha_composite(clock_wall, (96, 18))
    home.alpha_composite(fairy_lights, (62, 10))
    home.alpha_composite(wood_win, (162, 12))
    home.alpha_composite(bookshelf_wide.crop((0, 0, 40, 32)), (198, 16))

    # === 2. Build rich 288x224 Garden map background ===
    grass_file = textures["e-grass"]
    dirt_file = textures["e-dirt-wide"]
    garden = Image.new("RGBA", (288, 224), (188, 204, 130, 255))

    def path_cell(x: int, y: int) -> bool:
        return (
            (7 <= x <= 9 and 2 <= y <= 4)
            or (4 <= x <= 13 and 5 <= y <= 6)
            or (7 <= x <= 8 and 6 <= y <= 12)
            or (2 <= x <= 5 and y == 7)
            or (12 <= x <= 15 and 6 <= y <= 9)
        )

    def crop_soil_cell(x: int, y: int) -> bool:
        return 12 <= x <= 15 and 6 <= y <= 9

    for ty in range(14):
        for tx in range(18):
            key = (tx * 73856093) ^ (ty * 19349663) ^ 4219
            variant = key % 12 if key % 5 < 2 else (0, 1, 2, 6)[key % 4]
            grass = cut(grass_file, (variant % 6) * 16, (5 + variant // 6) * 16, 16, 16)
            garden.alpha_composite(grass, (tx * 16, ty * 16))
            if not path_cell(tx, ty):
                if key % 13 == 0 and ty >= 2 and tx not in (0, 17):
                    flora = cut(grass_file, (6 + key % 2) * 16, (5 + (key // 3) % 2) * 16, 16, 16)
                    garden.alpha_composite(flora, (tx * 16, ty * 16))
                continue
            if crop_soil_cell(tx, ty):
                lx = 0 if tx == 12 else 2 if tx == 15 else 1
                ly = 0 if ty == 6 else 2 if ty == 9 else 1
                soil = cut(dirt_file, lx * 16, ly * 16, 16, 16)
                garden.alpha_composite(soil, (tx * 16, ty * 16))
                continue
            left, right = path_cell(tx - 1, ty) and not crop_soil_cell(tx - 1, ty), path_cell(tx + 1, ty) and not crop_soil_cell(tx + 1, ty)
            up, down = path_cell(tx, ty - 1) and not crop_soil_cell(tx, ty - 1), path_cell(tx, ty + 1) and not crop_soil_cell(tx, ty + 1)
            col = 0 if not left else 2 if not right else 1
            row = 0 if not up else 2 if not down else 1
            if not left and not right:
                col = 3
            elif not up and not down:
                row = 3
            dirt = cut(dirt_file, col * 16, row * 16, 16, 16)
            garden.alpha_composite(dirt, (tx * 16, ty * 16))

    # === 3. Build 1:1 native Demo E Furniture & V0.1 World Atlas ===
    mi_file = textures["e-interiors"]
    sprout_furn_file = textures["e-sprout-furn"]
    sun_file = textures["e-sun-tiles"]
    cozy_file = textures["e-cozy-other"]

    # Composite true 1:1 couple double bed (blue + pink side-by-side)
    bed_blue, bed_file = semantic("furn.bed_pastel_blue")
    bed_pink, _ = semantic("furn.bed_pastel_pink")
    bed_double = Image.new("RGBA", (32, 32))
    bed_double.alpha_composite(bed_blue, (0, 0))
    bed_double.alpha_composite(bed_pink, (16, 0))

    # Wardrobe oak (clean 28x43 bbox centered into 28x44)
    wardrobe_img = cut(mi_file, 7 * 16 + 2, 48 * 16 + 4, 28, 43)

    # Bookshelf warm (clean 16x32 1x1-tile warm wood bookcase from Sunnyside)
    bookshelf_img = cut(sun_file, 45 * 16, 33 * 16, 16, 32)

    # Standing floor lamp (clean 16x32 col 12 rows 56..58 without touching top/sides)
    lamp_crop = cut(mi_file, 12 * 16, 56 * 16 + 6, 16, 28)
    lamp_img = Image.new("RGBA", (16, 32))
    lamp_img.alpha_composite(lamp_crop, (0, 4))

    # Cream plush sofa (seamless 2-seat 36x27 stitched cleanly from Modern Interiors cols 4..6 row 72..73)
    sofa_left = cut(mi_file, 4 * 16, 72 * 16 + 5, 18, 27)
    sofa_right = cut(mi_file, 6 * 16 - 2, 72 * 16 + 5, 18, 27)
    sofa_img = Image.new("RGBA", (36, 27))
    sofa_img.alpha_composite(sofa_left, (0, 0))
    sofa_img.alpha_composite(sofa_right, (18, 0))

    # Warm tea table + cake & berry plates
    table_base = cut(mi_file, 7 * 16 + 5, 13 * 16 + 8, 38, 22)
    cake_plate, _ = semantic("furn.cake_plate")
    berry_plate, _ = semantic("furn.berry_plate")
    table_img = Image.new("RGBA", (38, 24))
    table_img.alpha_composite(table_base, (0, 2))
    table_img.alpha_composite(cake_plate.crop((0, 1, 16, 16)), (4, 0))
    table_img.alpha_composite(berry_plate, (19, 0))

    # Study desk A (open book + pen holder)
    desk_img = cut(mi_file, 5 * 16, 36 * 16 + 4, 32, 28)

    # Monstera plant (14x24 clean bbox inside 16x24)
    plant_img = cut(mi_file, 12 * 16, 45 * 16 + 2, 16, 24)

    # Woven crimson-gold living rug (32x32 1:1 4-quadrant splice from Modern Interiors 60x40 rug)
    rug_full = cut(mi_file, 7 * 16 + 2, 15 * 16 + 4, 60, 40)
    rug_img = Image.new("RGBA", (32, 32))
    rug_img.alpha_composite(rug_full.crop((0, 0, 16, 16)), (0, 0))
    rug_img.alpha_composite(rug_full.crop((44, 0, 60, 16)), (16, 0))
    rug_img.alpha_composite(rug_full.crop((0, 24, 16, 40)), (0, 16))
    rug_img.alpha_composite(rug_full.crop((44, 24, 60, 40)), (16, 16))

    # Garden bench (Sunnyside 32x16)
    bench_img, bench_file = semantic("nature.bench_garden")

    # Garden lantern (connected wooden post + warm glowing pastel lantern shade, 16x24)
    lantern_img = Image.new("RGBA", (16, 24))
    lantern_draw = ImageDraw.Draw(lantern_img)
    lantern_draw.rectangle([5, 20, 10, 23], fill=(92, 62, 54, 255))
    lantern_draw.rectangle([6, 11, 9, 22], fill=(140, 96, 74, 255))
    lantern_draw.rectangle([7, 11, 8, 21], fill=(176, 126, 94, 255))
    glow_top = cut(sprout_furn_file, 4 * 16, 1 * 16, 16, 16)
    lantern_img.alpha_composite(glow_top, (0, 2))

    # Sakura potted flower (Sprout pastel blossom in warm pot, 16x16)
    flowerpot_img = cut(sprout_furn_file, 5 * 16, 0, 16, 16)

    sakura_tree_img, sakura_file = semantic("nature.sakura_tree")
    cottage_img, cottage_file = semantic("nature.cottage_pastel")
    cat_preview_img = cut(textures["e-cat"], 0, 64, 16, 16)
    shiba_preview_img = Image.open(public / "world.png").convert("RGBA").crop((120, 240, 136, 256))

    world_items = [
        {"id": ids["background"]["home"], "image": home, "anchor": {"ox": 0, "oy": 0}, "evidence": [floor_file, mi_file, bed_file]},
        {"id": ids["background"]["garden"], "image": garden, "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file, dirt_file]},
        {"id": ids["furniture"]["bed_cozy"], "image": bed_double, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [bed_file]},
        {"id": ids["furniture"]["wardrobe_oak"], "image": wardrobe_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": ids["furniture"]["bookshelf_warm"], "image": bookshelf_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": ids["furniture"]["lamp_floor"], "image": lamp_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": ids["furniture"]["sofa_cream"], "image": sofa_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": ids["furniture"]["table_wood"], "image": table_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": ids["furniture"]["desk_study"], "image": desk_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": ids["furniture"]["plant_monstera"], "image": plant_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": ids["furniture"]["rug_peach"], "image": rug_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": ids["furniture"]["bench_garden"], "image": bench_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [bench_file]},
        {"id": ids["furniture"]["lantern_garden"], "image": lantern_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [sun_file, sprout_furn_file]},
        {"id": ids["furniture"]["flowerpot_sakura"], "image": flowerpot_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [sprout_furn_file]},
        {"id": ids["scenery"]["blossom"], "image": sakura_tree_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [sakura_file]},
        {"id": ids["scenery"]["cottage"], "image": cottage_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [cottage_file]},
        {"id": ids["pets"]["cat"], "image": cat_preview_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [textures["e-cat"]]},
    ]
    world_sheet, world_entries = pack_sprites(world_items, 640)

    # Append shiba preview entry explicitly using public CC-BY-4.0 fallback pixels
    sx = 0
    sy = world_sheet.height
    expanded = Image.new("RGBA", (world_sheet.width, sy + 18))
    expanded.paste(world_sheet, (0, 0))
    expanded.paste(shiba_preview_img, (sx, sy))
    world_sheet = expanded
    world_entries.append({
        "id": ids["pets"]["shiba"],
        "texture": "world",
        "rect": {"x": sx, "y": sy, "w": 16, "h": 16},
        "anchor": {"ox": 0.5, "oy": 1},
        "source": public_manifest["entries"][-1]["source"],
    })

    # === 4. Build Avatars Sheet (384 x 288: idle_anim + run + sit for Adam, Alex, Amelia) ===
    avatars_sheet = Image.new("RGBA", (384, 288))
    avatar_entries = []
    for index, (style, rig) in enumerate(zip(config["rigStyles"], ("Adam", "Alex", "Amelia"))):
        files = [f"modern-interiors-free/Characters_free/{rig}_{action}_16x16.png" for action in ("idle_anim", "run", "sit")]
        frames = Image.new("RGBA", (384, 96))
        for row, relative in enumerate(files):
            frames.paste(cut(relative, 0, 0, 384, 32), (0, row * 32))
        avatars_sheet.paste(frames, (0, index * 96))
        avatar_entries.append({
            "id": ids["rigs"][style],
            "texture": "avatars",
            "rect": {"x": 0, "y": index * 96, "w": 384, "h": 96},
            "anchor": {"ox": 0.5, "oy": 1},
            "source": {**used[files[0]], "inputs": files, "composed": True},
        })

    # === 5. Build Extended Demo E Props & Animated Spritesheets (world-props.png) ===
    cherry_file = textures["e-cherry"]
    cherry_water_file = textures["e-cherry-water"]
    trees_v2_file = textures["e-trees-v2"]
    plants_file = textures["e-plants"]
    fences_file = textures["e-fences"]
    foods_file = textures["e-picnic-foods"]
    oak_tree, oak_file = semantic("nature.oak_tree")
    apple_tree, _ = semantic("nature.apple_tree")
    # Clean fireplace crop without adjacent right-side window artifact (cols 4..5 + chimney)
    fireplace_brick = cut(mi_file, 4 * 16, 68 * 16, 34, 48)
    # Cozy TV console: wood credenza (cols 3..4, row 55..56) with sleek TV display composited above
    tv_unit = Image.new("RGBA", (32, 30))
    credenza = cut(mi_file, 3 * 16, 55 * 16 + 4, 32, 20)
    tv_unit.alpha_composite(credenza, (0, 10))
    tv_draw = ImageDraw.Draw(tv_unit)
    tv_draw.rectangle([13, 14, 18, 17], fill=(58, 44, 52, 255))
    tv_draw.rectangle([4, 1, 27, 15], fill=(42, 34, 46, 255))
    tv_draw.rectangle([5, 2, 26, 13], fill=(92, 128, 156, 255))
    tv_draw.rectangle([7, 3, 14, 7], fill=(138, 178, 204, 255))
    kitchen_fridge, _ = semantic("furn.kitchen_fridge")
    # Complete grounded kitchen fruit counter (wood cabinet + fruit baskets)
    kitchen_counter = Image.new("RGBA", (32, 30))
    kitchen_counter.alpha_composite(credenza, (0, 10))
    kitchen_counter.alpha_composite(cut(mi_file, 0, 53 * 16 + 6, 32, 18), (0, 0))
    # 64x64 seamless randomized grass patch to avoid 16px stripe artifacts in meadow surround
    meadow_patch = Image.new("RGBA", (64, 64))
    for my in range(4):
        for mx in range(4):
            mk = (mx * 73856093) ^ (my * 19349663) ^ 9173
            mv = mk % 12 if mk % 5 < 2 else (0, 1, 2, 6)[mk % 4]
            meadow_patch.alpha_composite(cut(grass_file, (mv % 6) * 16, (5 + mv // 6) * 16, 16, 16), (mx * 16, my * 16))
    chair_r, _ = semantic("furn.chair_right")
    chair_l, _ = semantic("furn.chair_left")
    study_chair, _ = semantic("furn.study_chair")
    rug_coral, _ = semantic("furn.rug_pastel_coral")
    bowl_food, _ = semantic("furn.pet_bowl_food")
    bowl_water, _ = semantic("furn.pet_bowl_water")
    planter_box, _ = semantic("nature.planter_box")
    mailbox_red, _ = semantic("nature.mailbox_red")
    bridge_wood, _ = semantic("nature.bridge_wood")

    photo_frame_img = Image.new("RGBA", (16, 16))
    pf_draw = ImageDraw.Draw(photo_frame_img)
    pf_draw.rectangle([2, 2, 13, 13], fill=(128, 84, 62, 255))
    pf_draw.rectangle([3, 3, 12, 12], fill=(255, 240, 224, 255))
    pf_draw.rectangle([4, 5, 7, 10], fill=(139, 196, 217, 255))
    pf_draw.rectangle([8, 5, 11, 10], fill=(242, 162, 186, 255))
    pf_draw.point((7, 4), fill=(235, 92, 120, 255))
    pf_draw.point((8, 4), fill=(235, 92, 120, 255))

    p = ext_ids["props"]
    s = ext_ids["sheets"]
    props_items = [
        {"id": p["meadow_tile"], "image": meadow_patch, "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file]},
        {"id": p["meadow_flora"], "image": cut(grass_file, 7 * 16, 5 * 16, 16, 16), "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file]},
        {"id": p["fireplace_brick"], "image": fireplace_brick, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": p["tv_cinema_unit"], "image": tv_unit, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": p["kitchen_fridge"], "image": kitchen_fridge, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": p["kitchen_counter_fruit"], "image": kitchen_counter, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": p["dining_chair_right"], "image": chair_r, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": p["dining_chair_left"], "image": chair_l, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": p["bookshelf_wide"], "image": bookshelf_wide, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": p["study_chair"], "image": study_chair, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": p["rug_coral"], "image": rug_coral, "anchor": {"ox": 0.5, "oy": 0.5}, "evidence": [sprout_furn_file]},
        {"id": p["pet_bowl_food"], "image": bowl_food, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [sun_file]},
        {"id": p["pet_bowl_water"], "image": bowl_water, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [sun_file]},
        {"id": p["photo_frame"], "image": photo_frame_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [mi_file]},
        {"id": p["oak_tree"], "image": oak_tree, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [oak_file]},
        {"id": p["apple_tree"], "image": apple_tree, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [oak_file]},
        {"id": p["peach_tree"], "image": cut(trees_v2_file, 2 * 16, 5 * 16, 32, 32), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [trees_v2_file]},
        {"id": p["sakura_bush"], "image": cut(cherry_file, 4 * 16, 4 * 16, 16, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [cherry_file]},
        {"id": p["sakura_petals"], "image": cut(cherry_file, 1 * 16, 3 * 16, 16, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [cherry_file]},
        {"id": p["planter_box"], "image": planter_box, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [cozy_file]},
        {"id": p["mailbox_red"], "image": mailbox_red, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [cozy_file]},
        {"id": p["picnic_blanket"], "image": load(textures["e-picnic-blanket"]), "anchor": {"ox": 0.5, "oy": 0.5}, "evidence": [textures["e-picnic-blanket"]]},
        {"id": p["picnic_basket"], "image": load(textures["e-picnic-basket"]), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [textures["e-picnic-basket"]]},
        {"id": p["picnic_tart"], "image": cut(foods_file, 3 * 16, 0, 16, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [foods_file]},
        {"id": p["picnic_teacup"], "image": cut(foods_file, 1 * 16, 16, 16, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [foods_file]},
        {"id": p["bridge_wood"], "image": bridge_wood, "anchor": {"ox": 0.5, "oy": 0.5}, "evidence": [textures["e-bridge"]]},
        {"id": p["water_lotus"], "image": cut(cherry_water_file, 3 * 16, 1 * 16, 16, 16), "anchor": {"ox": 0.5, "oy": 0.5}, "evidence": [cherry_water_file]},
        {"id": p["water_lily"], "image": cut(cherry_water_file, 0, 0, 16, 16), "anchor": {"ox": 0.5, "oy": 0.5}, "evidence": [cherry_water_file]},
        {"id": p["water_reed_a"], "image": cut(cherry_water_file, 4 * 16, 0, 16, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [cherry_water_file]},
        {"id": p["water_reed_b"], "image": cut(cherry_water_file, 5 * 16, 0, 16, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [cherry_water_file]},
        {"id": p["fence_3w"], "image": cut(fences_file, 16, 48, 48, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [fences_file]},
        {"id": p["fence_1w"], "image": cut(fences_file, 16, 48, 16, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [fences_file]},
        {"id": p["beehive"], "image": load(textures["e-beehive"]), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [textures["e-beehive"]]},
        {"id": p["sunflower"], "image": load(textures["e-sunflower"]), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [textures["e-sunflower"]]},
        {"id": p["tomato"], "image": cut(plants_file, 4 * 16, 1 * 16, 16, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [plants_file]},
        {"id": p["corn"], "image": cut(plants_file, 3 * 16, 0, 16, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [plants_file]},
        {"id": p["radish"], "image": cut(plants_file, 5 * 16, 1 * 16, 16, 16), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [plants_file]},
        {"id": p["beetroot"], "image": load(textures["e-beetroot"]), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [textures["e-beetroot"]]},
        {"id": p["cabbage"], "image": load(textures["e-cabbage"]), "anchor": {"ox": 0.5, "oy": 1}, "evidence": [textures["e-cabbage"]]},
        {"id": p["side_cottage"], "image": cottage_img, "anchor": {"ox": 0.5, "oy": 1}, "evidence": [cottage_file]},
        {"id": p["shore_n"], "image": cut(grass_file, 1 * 16, 2 * 16, 16, 16), "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file]},
        {"id": p["shore_s"], "image": cut(grass_file, 1 * 16, 0 * 16, 16, 16), "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file]},
        {"id": p["shore_w"], "image": cut(grass_file, 2 * 16, 1 * 16, 16, 16), "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file]},
        {"id": p["shore_e"], "image": cut(grass_file, 0 * 16, 1 * 16, 16, 16), "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file]},
        {"id": p["shore_nw"], "image": cut(grass_file, 5 * 16, 1 * 16, 16, 16), "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file]},
        {"id": p["shore_ne"], "image": cut(grass_file, 6 * 16, 1 * 16, 16, 16), "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file]},
        {"id": p["shore_sw"], "image": cut(grass_file, 5 * 16, 2 * 16, 16, 16), "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file]},
        {"id": p["shore_se"], "image": cut(grass_file, 6 * 16, 2 * 16, 16, 16), "anchor": {"ox": 0, "oy": 0}, "evidence": [grass_file]},
        # Animated sprite strips
        {"id": s["fire"], "image": cut(textures["e-fire"], 0, 0, 128, 16), "anchor": {"ox": 0.5, "oy": 1}, "frameWidth": 16, "frameHeight": 16, "frameCount": 8, "evidence": [textures["e-fire"]]},
        {"id": s["water"], "image": load(textures["e-water"]), "anchor": {"ox": 0, "oy": 0}, "frameWidth": 16, "frameHeight": 16, "frameCount": 4, "evidence": [textures["e-water"]]},
        {"id": s["duck"], "image": load(textures["e-duck"]), "anchor": {"ox": 0.5, "oy": 0.8}, "frameWidth": 16, "frameHeight": 16, "frameCount": 4, "evidence": [textures["e-duck"]]},
        {"id": s["frog"], "image": Image.new("RGBA", (48, 16)), "anchor": {"ox": 0.5, "oy": 0.8}, "frameWidth": 16, "frameHeight": 16, "frameCount": 3, "evidence": [textures["e-frog"]]},
        {"id": s["chicken"], "image": Image.new("RGBA", (64, 16)), "anchor": {"ox": 0.5, "oy": 0.85}, "frameWidth": 16, "frameHeight": 16, "frameCount": 4, "evidence": [textures["e-chicken"]]},
        {"id": s["sheep"], "image": load(textures["e-sheep"]), "anchor": {"ox": 0.5, "oy": 0.84}, "frameWidth": 32, "frameHeight": 32, "frameCount": 4, "evidence": [textures["e-sheep"]]},
        {"id": s["windmill"], "image": load(textures["e-windmill"]), "anchor": {"ox": 0.5, "oy": 0.85}, "frameWidth": 112, "frameHeight": 112, "frameCount": 9, "evidence": [textures["e-windmill"]]},
        {"id": s["cat_orange"], "image": load(textures["e-cat"]), "anchor": {"ox": 0.5, "oy": 0.85}, "frameWidth": 16, "frameHeight": 16, "frameCount": 128, "evidence": [textures["e-cat"]]},
        {"id": s["cat_orange_shadow"], "image": load(textures["e-cat-shadow"]), "anchor": {"ox": 0.5, "oy": 0.85}, "frameWidth": 16, "frameHeight": 16, "frameCount": 128, "evidence": [textures["e-cat-shadow"]]},
    ]
    # Compose frog 3-frame horizontal strip and chicken 4-frame horizontal strip
    frog_strip = next(it for it in props_items if it["id"] == s["frog"])["image"]
    for idx, (fx, fy) in enumerate([(0, 0), (0, 16), (16, 16)]):
        frog_strip.paste(cut(textures["e-frog"], fx, fy, 16, 16), (idx * 16, 0))
    ch_strip = next(it for it in props_items if it["id"] == s["chicken"])["image"]
    for idx, (cx_, cy_) in enumerate([(0, 0), (16, 0), (0, 16), (16, 16)]):
        ch_strip.paste(cut(textures["e-chicken"], cx_, cy_, 16, 16), (idx * 16, 0))

    props_sheet, props_entries = pack_sprites(props_items, 1024)

    # === 6. Save all outputs cleanly ===
    manifest = {
        "version": 1,
        "tilePx": 16,
        "profile": "private",
        "textures": {
            "world": {"file": "world.png", "width": world_sheet.width, "height": world_sheet.height},
            "avatars": {"file": "avatars.png", "width": avatars_sheet.width, "height": avatars_sheet.height},
        },
        "entries": world_entries + avatar_entries,
        "upstream": list(used.values()),
        "avatarGameplay": {
            "provider": "shade-puny-characters-cc0",
            "sourceUrl": "https://opengameart.org/content/puny-characters",
            "frameWidth": 32,
            "frameHeight": 32,
            "colsPerRow": 24,
            "framesPerDirection": 3,
            "rowIndex": {
                "idle": 0,
                "walk": 1,
                "slash": 2,
                "bow": 3,
                "stave": 4,
                "throw": 5,
                "hurt": 6,
                "death": 7,
            },
            "facing8Order": [
                "down",
                "down-left",
                "left",
                "up-left",
                "up",
                "up-right",
                "right",
                "down-right",
            ],
            "posturePolicy": {"sit": "idle-row", "lie": "idle-row", "tool": "slash-row"},
            "wardrobeAvatarsPx": {"width": avatars_sheet.width, "height": avatars_sheet.height},
            "files": gameplay_files,
        },
    }
    props_manifest = {
        "version": 1,
        "profile": "private",
        "texture": {"file": "world-props.png", "width": props_sheet.width, "height": props_sheet.height},
        "entries": props_entries,
    }
    repo_root = output.parent.parent.parent
    puny_src = repo_root / "public/assets/donor/cc0-puny-8d"
    puny_dst = output / "donor-cc0-puny-8d"
    puny_dst.mkdir(parents=True, exist_ok=True)
    gameplay_files: dict[str, str] = {}
    for name in ("character-base.png", "soldier-blue.png", "soldier-red.png", "CREDITS.md"):
        src = puny_src / name
        if not src.is_file():
            raise FileNotFoundError(f"Thiếu donor gameplay avatar (Puny CC0): {src}")
        shutil.copy2(src, puny_dst / name)
        gameplay_files[name] = f"donor-cc0-puny-8d/{name}"

    output.mkdir(parents=True, exist_ok=True)
    world_sheet.save(output / "world.png", optimize=True)
    avatars_sheet.save(output / "avatars.png", optimize=True)
    props_sheet.save(output / "world-props.png", optimize=True)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (output / "props-manifest.json").write_text(json.dumps(props_manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    credits = [
        "# Credits — Demo E, bản phát triển riêng", "",
        "Asset gốc được dùng trong dự án cá nhân, phi thương mại. Quyền phục vụ qua Internet cần xác minh trước deploy.",
        "Đã cắt khung 1:1 native pixel, đóng atlas và ghép ground/props từ bộ Demo E.", "",
    ]
    for author, version, url in pack_data.values():
        note = "CC BY 4.0" if author == "Frakassets" else "Pending Deployment License Verification"
        credits.append(f"- **{author}** — [{version}]({url}). {note}.")
    (output / "CREDITS.md").write_text("\n".join(credits) + "\n", encoding="utf-8")
    print(
        f"Atlas Demo E riêng: {len(manifest['entries'])} world/avatar ID + "
        f"{len(props_entries)} props/anim ID từ {len(used)} tệp nguồn."
    )


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError) as error:
        sys.exit(str(error))
