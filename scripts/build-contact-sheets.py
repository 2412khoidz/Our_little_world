"""Generate sprite analysis metadata and numbered-grid contact sheets using Pillow.

Outputs:
- asset-candidates/ANALYSIS.json (dimensions, top non-transparent palette swatches)
- asset-candidates/contact-sheets/01-cozy-shubibubi.png
- asset-candidates/contact-sheets/02-sprout-lands-core.png
- asset-candidates/contact-sheets/02b-sprout-lands-sorry.png
- asset-candidates/contact-sheets/03-cozy-lands-basic.png
- asset-candidates/contact-sheets/04-sunnyside-tileset-grid.png
- asset-candidates/contact-sheets/04b-sunnyside-entities.png
- asset-candidates/contact-sheets/05-modern-interiors-grid.png
- asset-candidates/contact-sheets/05b-modern-chars.png
- asset-candidates/contact-sheets/06-exterior-candidates-and-pets.png
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent
EXTRACTED = REPO_ROOT / "asset-candidates" / "extracted"
SHEETS_DIR = REPO_ROOT / "asset-candidates" / "contact-sheets"
ANALYSIS_PATH = REPO_ROOT / "asset-candidates" / "ANALYSIS.json"

BG_CHECK_A = (40, 32, 38, 255)
BG_CHECK_B = (52, 42, 50, 255)
CANVAS_BG = (24, 19, 23, 255)
TEXT_COLOR = (255, 244, 230, 255)
MUTED_TEXT = (196, 178, 166, 255)
GRID_COLOR = (255, 210, 140, 110)
FONT = ImageFont.load_default()


def top_palette_hex(img: Image.Image, n: int = 10) -> list[str]:
    rgba = img.convert("RGBA")
    counts: Counter[tuple[int, int, int]] = Counter()
    for r, g, b, a in rgba.get_flattened_data():
        if a >= 128:
            counts[(r, g, b)] += 1
    return [f"#{r:02x}{g:02x}{b:02x}" for (r, g, b), _ in counts.most_common(n)]


def make_checker(w: int, h: int, cell: int = 8) -> Image.Image:
    im = Image.new("RGBA", (w, h), BG_CHECK_A)
    draw = ImageDraw.Draw(im)
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            if ((x // cell) + (y // cell)) % 2 == 1:
                draw.rectangle([x, y, x + cell - 1, y + cell - 1], fill=BG_CHECK_B)
    return im


def draw_panel(
    img_path: Path,
    title: str,
    scale: int = 2,
    tile_size: int | None = 16,
    show_grid_numbers: bool = True,
    max_crop_box: tuple[int, int, int, int] | None = None,
) -> tuple[Image.Image, dict[str, object]]:
    src = Image.open(img_path).convert("RGBA")
    orig_w, orig_h = src.size
    palette = top_palette_hex(src, 10)

    if max_crop_box is not None:
        src = src.crop(max_crop_box)

    w, h = src.size
    up_w, up_h = w * scale, h * scale
    scaled = src.resize((up_w, up_h), Image.Resampling.NEAREST)

    ruler_left = 28 if (tile_size and show_grid_numbers) else 4
    ruler_top = 18 if (tile_size and show_grid_numbers) else 4
    header_h = 26
    pad = 8

    panel_w = max(up_w + ruler_left + pad, 240)
    panel_h = header_h + ruler_top + up_h + 18 + pad
    panel = Image.new("RGBA", (panel_w, panel_h), (34, 27, 32, 255))
    d = ImageDraw.Draw(panel)

    # Header text + dims
    d.text((6, 5), f"{title} ({orig_w}x{orig_h}, {scale}x)", fill=TEXT_COLOR, font=FONT)

    # Palette strip on bottom
    sw_y = header_h + ruler_top + up_h + 4
    for idx, hex_col in enumerate(palette[:10]):
        col = tuple(int(hex_col[i : i + 2], 16) for i in (1, 3, 5)) + (255,)
        sx = ruler_left + idx * 14
        d.rectangle([sx, sw_y, sx + 12, sw_y + 10], fill=col, outline=(255, 255, 255, 60))

    # Checkerboard & sprite
    gx0 = ruler_left
    gy0 = header_h + ruler_top
    checker = make_checker(up_w, up_h, cell=max(4, (tile_size or 16) * scale // 2))
    panel.alpha_composite(checker, (gx0, gy0))
    panel.alpha_composite(scaled, (gx0, gy0))

    # Optional 16px numbered grid
    if tile_size:
        step = tile_size * scale
        cols = w // tile_size
        rows = h // tile_size
        base_col = (max_crop_box[0] // tile_size) if max_crop_box else 0
        base_row = (max_crop_box[1] // tile_size) if max_crop_box else 0
        overlay = Image.new("RGBA", panel.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        for c in range(cols + 1):
            x = gx0 + c * step
            od.line([(x, gy0), (x, gy0 + up_h)], fill=GRID_COLOR, width=1)
            if show_grid_numbers and c < cols and (step >= 24 or c % 2 == 0):
                d.text((x + 2, header_h + 3), str(base_col + c), fill=MUTED_TEXT, font=FONT)
        for r in range(rows + 1):
            y = gy0 + r * step
            od.line([(gx0, y), (gx0 + up_w, y)], fill=GRID_COLOR, width=1)
            if show_grid_numbers and r < rows and (step >= 20 or r % 2 == 0):
                d.text((4, y + 2), str(base_row + r), fill=MUTED_TEXT, font=FONT)
        panel = Image.alpha_composite(panel, overlay)

    meta = {
        "file": str(img_path.relative_to(EXTRACTED)),
        "width": orig_w,
        "height": orig_h,
        "palette": palette,
    }
    return panel, meta


def compose_grid(panels: list[Image.Image], max_cols: int = 2, gap: int = 12, title: str = "") -> Image.Image:
    rows: list[list[Image.Image]] = [
        panels[i : i + max_cols] for i in range(0, len(panels), max_cols)
    ]
    row_widths = [sum(p.width for p in row) + gap * (len(row) - 1) for row in rows]
    row_heights = [max(p.height for p in row) for row in rows]
    top_title_h = 28 if title else 0
    total_w = max(row_widths) + gap * 2
    total_h = top_title_h + sum(row_heights) + gap * (len(rows) + 1)

    canvas = Image.new("RGBA", (total_w, total_h), CANVAS_BG)
    d = ImageDraw.Draw(canvas)
    if title:
        d.text((gap, 8), title, fill=TEXT_COLOR, font=FONT)

    cy = top_title_h + gap
    for row, rh in zip(rows, row_heights):
        cx = gap
        for p in row:
            canvas.alpha_composite(p, (cx, cy))
            cx += p.width + gap
        cy += rh + gap
    return canvas


def main() -> None:
    SHEETS_DIR.mkdir(parents=True, exist_ok=True)
    analysis: dict[str, dict[str, object]] = {}

    def add_panels(pack_key: str, specs: list[tuple[Path, str, int, int | None, bool, tuple[int, int, int, int] | None]]) -> list[Image.Image]:
        out = []
        pack_list = analysis.setdefault(pack_key, {}).setdefault("sprites", [])
        assert isinstance(pack_list, list)
        seen_files = {item["file"] for item in pack_list}
        for path, label, sc, ts, nums, crop in specs:
            panel, meta = draw_panel(path, label, sc, ts, nums, crop)
            out.append(panel)
            if meta["file"] not in seen_files:
                pack_list.append(meta)
                seen_files.add(meta["file"])
        return out

    # 1. Cozy Series (shubibubi)
    p01 = add_panels(
        "cozy-shubibubi",
        [
            (EXTRACTED / "cozy-farm-free/free version/free.png", "Cozy Farm free.png", 3, 16, True, None),
            (EXTRACTED / "cozy-interior-free/interior free/interior free.png", "Cozy Interior interior free.png", 3, 16, True, None),
            (EXTRACTED / "cozy-people-free/char free/global.png", "Cozy People global.png (32x32 grid)", 2, 32, True, None),
        ],
    )
    compose_grid(p01, max_cols=2, title="01 · Cozy Series Free (shubibubi)").save(SHEETS_DIR / "01-cozy-shubibubi.png")

    # 2a. Sprout Lands Basic + UI
    p02 = add_panels(
        "sprout-lands",
        [
            (EXTRACTED / "sprout-lands-basic/Tilesets/Grass.png", "Grass.png", 2, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Tilesets/Hills.png", "Hills.png", 2, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Tilesets/Wooden House.png", "Wooden House.png", 2, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Tilesets/Tilled Dirt.png", "Tilled Dirt.png", 2, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Objects/Basic Furniture.png", "Basic Furniture.png", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Objects/Basic Grass Biom things 1.png", "Grass Biom Things", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Objects/Wood Bridge.png", "Wood Bridge.png", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Objects/Basic Plants.png", "Basic Plants.png", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Tilesets/Fences.png", "Fences.png", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Tilesets/Doors.png", "Doors.png", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Tilesets/Water.png", "Water.png", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Objects/Paths.png", "Paths.png", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-basic/Characters/Basic Charakter Spritesheet.png", "Basic Charakter (48x48 cells)", 2, 48, True, None),
            (EXTRACTED / "sprout-lands-basic/Characters/Free Chicken Sprites.png", "Chicken Sprites", 3, 16, True, None),
        ],
    )
    compose_grid(p02, max_cols=3, title="02 · Sprout Lands Basic Pack (Cup Nooble)").save(SHEETS_DIR / "02-sprout-lands-core.png")

    # 2b. Sprout Lands Sorry Pack
    p02b = add_panels(
        "sprout-lands-sorry",
        [
            (EXTRACTED / "sprout-lands-sorry/Early Access/Plant update 2/Cherry Blossom Biom.png", "Cherry Blossom Biom", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-sorry/Early Access/Plant update 2/tree animaions/Cherry tree animations.png", "Cherry tree animations (48px?)", 2, 16, True, None),
            (EXTRACTED / "sprout-lands-sorry/Early Access/Plant update 2/Furniture/new Wooden Furniture items.png", "new Wooden Furniture items", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-sorry/Early Access/Plant update 2/Furniture/Cherry_Chest.png", "Cherry_Chest.png", 2, 16, False, None),
            (EXTRACTED / "sprout-lands-sorry/Early Access/Village pack/houses/small house/small_House_light_with_door_grass.png", "small_House_light_with_door_grass", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-sorry/Early Access/Plant update 2/piknik/Piknik blanket.png", "Piknik blanket", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-sorry/Early Access/Plant update 2/piknik/piknik_foods.png", "piknik_foods", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-sorry/Early Access/Plant update 2/piknik/Piknik basket.png", "Piknik basket", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-sorry/Early Access/Plant update 2/Farming Plants items v2.png", "Farming Plants items v2", 2, 16, True, None),
            (EXTRACTED / "sprout-lands-sorry/Early Access/Plant update 2/Bee/beehive.png", "beehive.png", 3, 16, True, None),
            (EXTRACTED / "sprout-lands-sorry/Early Access/Plant update 2/frog/frog_spritesheet.png", "frog_spritesheet", 2, 16, True, None),
            (EXTRACTED / "sprout-lands-sorry/Tests/free_character_spritesheet_by-cupnooble.png", "free_character_spritesheet (48x48)", 1, 48, True, (0, 0, 192, 192)),
        ],
    )
    compose_grid(p02b, max_cols=3, title="02b · Sprout Sorry Pack Highlights (Cherry, House, Furniture, Picnic)").save(SHEETS_DIR / "02b-sprout-lands-sorry.png")

    # 3. Cozy Lands Basic
    p03 = add_panels(
        "cozy-lands-basic",
        [
            (EXTRACTED / "cozy-lands-basic/Buildings/house_01.png", "house_01.png", 2, 16, True, None),
            (EXTRACTED / "cozy-lands-basic/Buildings/house_02.png", "house_02.png", 2, 16, True, None),
            (EXTRACTED / "cozy-lands-basic/Terrain/Tilesets/Grass/grass01.png", "grass01.png", 2, 16, True, None),
            (EXTRACTED / "cozy-lands-basic/Terrain/Tilesets/Water/water.png", "water.png", 2, 16, True, None),
            (EXTRACTED / "cozy-lands-basic/Terrain/Tilesets/Soil/soil.png", "soil.png", 2, 16, True, None),
            (EXTRACTED / "cozy-lands-basic/Objects/Object/bridge.png", "bridge.png", 2, 16, True, None),
            (EXTRACTED / "cozy-lands-basic/Objects/Object/fence.png", "fence.png", 2, 16, True, None),
            (EXTRACTED / "cozy-lands-basic/Objects/Nature/tree.png", "tree.png", 2, 16, True, None),
            (EXTRACTED / "cozy-lands-basic/Objects/Nature/flower_b.png", "flower_b.png", 3, 16, True, None),
            (EXTRACTED / "cozy-lands-basic/Objects/Object/other.png", "other.png", 3, 16, True, None),
            (EXTRACTED / "cozy-lands-basic/Characters/boy/boy_idle.png", "boy_idle.png (48x48?)", 2, 48, True, (0, 0, 192, 192)),
            (EXTRACTED / "cozy-lands-basic/Characters/girl/girl_idle.png", "girl_idle.png", 2, 48, True, (0, 0, 192, 192)),
            (EXTRACTED / "cozy-lands-basic/Animals/Chicken/chicken_idle01.png", "chicken_idle01.png", 2, 32, True, None),
        ],
    )
    compose_grid(p03, max_cols=3, title="03 · Cozy Lands Basic v1.25 (Amo-QAQ)").save(SHEETS_DIR / "03-cozy-lands-basic.png")

    # 4a. Sunnyside 16px Tileset (1024x1024 -> 4 quadrants of 512x512 at 2x scale!)
    sun_ts = EXTRACTED / "sunnyside-world/Tileset/spr_tileset_sunnysideworld_16px.png"
    p04 = add_panels(
        "sunnyside-world",
        [
            (sun_ts, "Sunnyside Tileset TL (cols 0..31, rows 0..31)", 2, 16, True, (0, 0, 512, 512)),
            (sun_ts, "Sunnyside Tileset TR (cols 32..63, rows 0..31)", 2, 16, True, (512, 0, 1024, 512)),
            (sun_ts, "Sunnyside Tileset BL (cols 0..31, rows 32..63)", 2, 16, True, (0, 512, 512, 1024)),
            (sun_ts, "Sunnyside Tileset BR (cols 32..63, rows 32..63)", 2, 16, True, (512, 512, 1024, 1024)),
        ],
    )
    compose_grid(p04, max_cols=2, title="04 · Sunnyside World Tileset 16px Grid (1024x1024 -> 64x64 tiles)").save(SHEETS_DIR / "04-sunnyside-tileset-grid.png")

    # 4b. Sunnyside Entities
    p04b = add_panels(
        "sunnyside-world",
        [
            (EXTRACTED / "sunnyside-world/Characters/Human/IDLE/base_idle_strip9.png", "Human base_idle_strip9 (96x64/frame)", 2, 96, True, None),
            (EXTRACTED / "sunnyside-world/Characters/Human/IDLE/shorthair_idle_strip9.png", "Human shorthair_idle_strip9", 2, 96, True, None),
            (EXTRACTED / "sunnyside-world/Characters/Human/IDLE/longhair_idle_strip9.png", "Human longhair_idle_strip9", 2, 96, True, None),
            (EXTRACTED / "sunnyside-world/Characters/Human/WALKING/base_walk_strip8.png", "Human base_walk_strip8", 2, 96, True, None),
            (EXTRACTED / "sunnyside-world/Elements/Animals/spr_deco_sheep_01_strip4.png", "Sheep strip4 (32px)", 3, 32, True, None),
            (EXTRACTED / "sunnyside-world/Elements/Animals/spr_deco_chicken_01_strip4.png", "Chicken strip4 (32px)", 3, 32, True, None),
            (EXTRACTED / "sunnyside-world/Elements/Animals/spr_deco_duck_01_strip4.png", "Duck strip4 (16px)", 3, 16, True, None),
            (EXTRACTED / "sunnyside-world/Elements/Plants/spr_deco_tree_01_strip4.png", "Tree 01 strip4", 2, 32, True, None),
            (EXTRACTED / "sunnyside-world/Elements/Plants/spr_deco_tree_02_strip4.png", "Tree 02 strip4", 2, None, False, None),
            (EXTRACTED / "sunnyside-world/Elements/Other/spr_deco_windmill_withshadow_strip9.png", "Windmill strip9 (first 3 frames)", 2, 112, True, (0, 0, 336, 112)),
            (EXTRACTED / "sunnyside-world/Elements/VFX/Chimney Smoke/chimneysmoke_01_strip30.png", "Chimney smoke (first 6)", 3, 15, True, (0, 0, 90, 37)),
            (EXTRACTED / "sunnyside-world/Elements/Crops/sunflower_05.png", "Sunflower 05", 4, None, False, None),
        ],
    )
    compose_grid(p04b, max_cols=2, title="04b · Sunnyside World Entities (Human Layers, Animals, Trees, Windmill)").save(SHEETS_DIR / "04b-sunnyside-entities.png")

    # 5a. Modern Interiors Free Grid
    mi_room = EXTRACTED / "modern-interiors-free/Interiors_free/16x16/Room_Builder_free_16x16.png"
    mi_int = EXTRACTED / "modern-interiors-free/Interiors_free/16x16/Interiors_free_16x16.png"
    p05 = add_panels(
        "modern-interiors-free",
        [
            (mi_room, "Room_Builder_free_16x16 (cols 0..16, rows 0..22)", 2, 16, True, None),
            (mi_int, "Interiors_free TOP (rows 0..44)", 2, 16, True, (0, 0, 256, 720)),
            (mi_int, "Interiors_free BOT (rows 45..88)", 2, 16, True, (0, 720, 256, 1424)),
        ],
    )
    compose_grid(p05, max_cols=3, title="05 · Modern Interiors Free v2.2 (LimeZu 16x16 Grid)").save(SHEETS_DIR / "05-modern-interiors-grid.png")

    # 5b. Modern Interiors Characters
    p05b = add_panels(
        "modern-interiors-free",
        [
            (EXTRACTED / "modern-interiors-free/Characters_free/Adam_idle_anim_16x16.png", "Adam_idle_anim_16x16 (16x32 cells)", 3, 16, True, None),
            (EXTRACTED / "modern-interiors-free/Characters_free/Adam_run_16x16.png", "Adam_run_16x16", 3, 16, True, None),
            (EXTRACTED / "modern-interiors-free/Characters_free/Amelia_idle_anim_16x16.png", "Amelia_idle_anim_16x16", 3, 16, True, None),
            (EXTRACTED / "modern-interiors-free/Characters_free/Amelia_run_16x16.png", "Amelia_run_16x16", 3, 16, True, None),
            (EXTRACTED / "modern-interiors-free/Characters_free/Amelia_sit_16x16.png", "Amelia_sit_16x16", 3, 16, True, None),
            (EXTRACTED / "modern-interiors-free/Characters_free/Adam_phone_16x16.png", "Adam_phone_16x16", 3, 16, True, None),
        ],
    )
    compose_grid(p05b, max_cols=2, title="05b · Modern Interiors Characters (Adam & Amelia 16x32)").save(SHEETS_DIR / "05b-modern-chars.png")

    # 6. Exterior Candidates (Cute Fantasy + Ninja Adventure) & Free Pets Pack
    p06 = add_panels(
        "exterior-and-pets",
        [
            (EXTRACTED / "cute-fantasy-free/Outdoor decoration/House_1_Wood_Base_Blue.png", "CuteFantasy House_1", 2, 16, True, None),
            (EXTRACTED / "cute-fantasy-free/Outdoor decoration/Outdoor_Decor_Free.png", "CuteFantasy Outdoor_Decor_Free", 2, 16, True, None),
            (EXTRACTED / "cute-fantasy-free/Outdoor decoration/Oak_Tree.png", "CuteFantasy Oak_Tree", 2, 16, True, None),
            (EXTRACTED / "cute-fantasy-free/Player/Player.png", "CuteFantasy Player (32x32?)", 2, 32, True, (0, 0, 192, 192)),
            (EXTRACTED / "ninja-adventure/Backgrounds/Tilesets/TilesetHouse.png", "NinjaAdv TilesetHouse (top half)", 2, 16, True, (0, 0, 272, 208)),
            (EXTRACTED / "ninja-adventure/Backgrounds/Tilesets/TilesetNature.png", "NinjaAdv TilesetNature (left)", 2, 16, True, (0, 0, 256, 208)),
            (EXTRACTED / "ninja-adventure/Backgrounds/Tilesets/TilesetFloor.png", "NinjaAdv TilesetFloor (top)", 2, 16, True, (0, 0, 256, 208)),
            (EXTRACTED / "ninja-adventure/Actor/Character/Boy/SpriteSheet.png", "NinjaAdv Boy SpriteSheet", 3, 16, True, None),
            (EXTRACTED / "free-pets-pack/cat-orange/cat-orange_16px_top-down_outline_lit.png", "FreePets cat-orange (16px outline)", 2, 16, True, None),
            (EXTRACTED / "free-pets-pack/puppy-shiba/puppy-shiba_16px_top-down_outline_lit.png", "FreePets puppy-shiba (16px outline)", 2, 16, True, None),
            (EXTRACTED / "free-pets-pack/bunny-white/bunny-white_16px_top-down_outline_lit.png", "FreePets bunny-white (16px outline)", 2, 16, True, None),
            (EXTRACTED / "free-pets-pack/duckling-yellow/duckling-yellow_16px_top-down_outline_lit.png", "FreePets duckling-yellow (16px outline)", 2, 16, True, None),
        ],
    )
    compose_grid(p06, max_cols=3, title="06 · Cute Fantasy Free, Ninja Adventure & Frakassets Free Pets").save(SHEETS_DIR / "06-exterior-candidates-and-pets.png")

    ANALYSIS_PATH.write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")
    print("Generated all contact sheets in:", SHEETS_DIR)
    for f in sorted(SHEETS_DIR.glob("*.png")):
        with Image.open(f) as im:
            print(f"  {f.name:40s} {im.size[0]}x{im.size[1]} ({f.stat().st_size:,} B)")


if __name__ == "__main__":
    main()
