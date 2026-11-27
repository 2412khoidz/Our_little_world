#!/usr/bin/env python3
"""
Pack curated real pixel-art sprite atlases for Our Little World (Checkpoint G).

Reads local donor archives from `--source-dir` (default `C:/Users/admin/Downloads/items&farm`),
slices multi-frame strips to exact single frames, preserves native 16x16 / 32x32 / crop / tree
densities without squishing or stretching, and emits:
  - public/assets/farming/items-16.png + items-16.json
  - public/assets/farming/items-32.png + items-32.json
  - public/assets/farming/crops-stages.png + crops-stages.json
  - public/assets/farming/trees-orchard.png + trees-orchard.json
  - public/assets/farming/CREDITS.md
  - src/shared/art/farmingSpriteAtlas.generated.json
"""

from __future__ import annotations

import argparse
import colorsys
import json
import math
import zipfile
from io import BytesIO
from pathlib import Path
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC_DIR = Path(r"C:\Users\admin\Downloads\items&farm")
OUT_PUBLIC = REPO_ROOT / "public" / "assets" / "farming"
OUT_SHARED_JSON = REPO_ROOT / "src" / "shared" / "art" / "farmingSpriteAtlas.generated.json"
CANONICAL_JSON = REPO_ROOT / "src" / "shared" / "catalog" / "canonicalCatalog.generated.json"


class ZipPool:
    def __init__(self, src_dir: Path) -> None:
        self.src_dir = src_dir
        self._zips: dict[str, zipfile.ZipFile] = {}
        self._sheets: dict[tuple[str, str], Image.Image] = {}

    def _open(self, zip_name: str) -> zipfile.ZipFile:
        if zip_name not in self._zips:
            zp = self.src_dir / zip_name
            if not zp.exists():
                raise FileNotFoundError(f"Missing donor zip: {zp}")
            self._zips[zip_name] = zipfile.ZipFile(zp, "r")
        return self._zips[zip_name]

    def load_image(self, zip_name: str, member: str) -> Image.Image:
        key = (zip_name, member)
        if key not in self._sheets:
            zf = self._open(zip_name)
            with zf.open(member) as f:
                self._sheets[key] = Image.open(BytesIO(f.read())).convert("RGBA")
        return self._sheets[key]

    def grid_tile(
        self,
        zip_name: str,
        member: str,
        row: int,
        col: int,
        cell_w: int = 32,
        cell_h: int = 32,
        top_pad: int = 0,
    ) -> Image.Image:
        sheet = self.load_image(zip_name, member)
        x0 = col * cell_w
        y0 = max(0, row * cell_h - top_pad)
        x1 = min(sheet.width, x0 + cell_w)
        y1 = min(sheet.height, row * cell_h + cell_h)
        tile = sheet.crop((x0, y0, x1, y1))
        if tile.getbbox() is None:
            raise ValueError(f"Empty grid tile at {zip_name}!{member} r={row} c={col}")
        return tile

    def strip_frame(
        self,
        zip_name: str,
        member: str,
        frame_index: int,
        frame_w: int,
        frame_h: int | None = None,
    ) -> Image.Image:
        sheet = self.load_image(zip_name, member)
        h = frame_h if frame_h is not None else sheet.height
        x0 = frame_index * frame_w
        if x0 + frame_w > sheet.width:
            raise ValueError(f"Frame index {frame_index} out of bounds for {member} ({sheet.size})")
        tile = sheet.crop((x0, 0, x0 + frame_w, h))
        if tile.getbbox() is None:
            raise ValueError(f"Empty strip frame {frame_index} in {zip_name}!{member}")
        return tile

    def close(self) -> None:
        for zf in self._zips.values():
            zf.close()
        self._zips.clear()


def trim_and_pad_bottom(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Center horizontally and ground vertically within `(target_w, target_h)` without scaling."""
    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    if img.width <= target_w and img.height <= target_h:
        dx = (target_w - img.width) // 2
        dy = target_h - img.height
        canvas.paste(img, (dx, dy), img)
        return canvas
    bb = img.getbbox()
    cropped = img.crop(bb) if bb else img
    if cropped.width > target_w or cropped.height > target_h:
        scale = min(target_w / cropped.width, target_h / cropped.height)
        nw = max(1, int(cropped.width * scale))
        nh = max(1, int(cropped.height * scale))
        cropped = cropped.resize((nw, nh), Image.NEAREST)
    dx = (target_w - cropped.width) // 2
    dy = (target_h - cropped.height) // 2
    canvas.paste(cropped, (dx, dy), cropped)
    return canvas


def center_in_cell(img: Image.Image, cell_size: int) -> Image.Image:
    """Center sprite at native 1:1 ratio if it fits; crop non-empty bbox first if larger."""
    if img.width == cell_size and img.height == cell_size:
        return img.copy()
    canvas = Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 0))
    src = img
    if src.width > cell_size or src.height > cell_size:
        bb = src.getbbox()
        if bb:
            src = src.crop(bb)
        if src.width > cell_size or src.height > cell_size:
            scale = min(cell_size / src.width, cell_size / src.height)
            src = src.resize(
                (max(1, int(src.width * scale)), max(1, int(src.height * scale))),
                Image.NEAREST,
            )
    dx = (cell_size - src.width) // 2
    dy = (cell_size - src.height) // 2
    canvas.paste(src, (dx, dy), src)
    return canvas


def make_seed_packet(bag_template: Image.Image, emblem: Image.Image) -> Image.Image:
    """Place a crisp miniature emblem of the real crop/flower sprite onto a real FRL parchment seed bag."""
    bag = bag_template.copy()
    # FRL 16x16 seed bag pouch interior label box is x=4..12, y=5..13; clear center and stamp 9x9 emblem
    for py in range(6, 13):
        for px in range(4, 12):
            bag.putpixel((px, py), (235, 223, 198, 255))
    bb = emblem.getbbox()
    trimmed = emblem.crop(bb) if bb else emblem
    mini = trimmed.resize((8, 7), Image.NEAREST)
    bag.paste(mini, (4, 6), mini)
    return bag


def recolor_flower_petals(
    src: Image.Image,
    target_rgb: tuple[int, int, int],
    rainbow: bool = False,
) -> Image.Image:
    """Keep Yoshino's green stem/leaves untouched and shift only petal hue/lum cleanly."""
    out = src.copy()
    tr, tg, tb = [c / 255.0 for c in target_rgb]
    t_h, t_l, t_s = colorsys.rgb_to_hls(tr, tg, tb)
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = out.getpixel((x, y))
            if a < 10:
                continue
            rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
            h, l, s = colorsys.rgb_to_hls(rf, gf, bf)
            # Detect green stem/leaves (hue ~ 0.19..0.46) and dark brown outlines; leave unchanged
            is_green_stem = 0.18 <= h <= 0.46 and s >= 0.15
            if is_green_stem or l < 0.13:
                continue
            use_h = ((x + y) % 6) / 6.0 if rainbow else t_h
            if not rainbow and t_s < 0.05:
                use_s = 0.0
                use_l = max(0.72, min(0.98, 0.6 + 0.4 * l))
            else:
                use_l = max(0.18, min(0.92, l * (0.65 + 0.5 * t_l)))
                use_s = t_s if rainbow else max(0.08, min(1.0, s * 0.4 + t_s * 0.65))
            nr, ng, nb = colorsys.hls_to_rgb(use_h, use_l, use_s)
            out.putpixel((x, y), (int(nr * 255), int(ng * 255), int(nb * 255), a))
    return out


def recolor_sapling_fruit_dot(src: Image.Image, dot_rgb: tuple[int, int, int]) -> Image.Image:
    """Shift only the warm red/purple fruit dot pixels on an FRL 16x16 sapling icon."""
    out = src.copy()
    tr, tg, tb = dot_rgb
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = out.getpixel((x, y))
            if a < 10:
                continue
            # Preserve bark/brown & green foliage; recolor right-side red/purple badge tag
            if x >= 9 and r > g + 20 and b < r:
                out.putpixel((x, y), (tr, tg, tb, a))
    return out


def pack_grid_atlas(
    entries: list[tuple[str, Image.Image, dict]],
    cell_size: int,
    cols: int,
    png_path: Path,
    json_path: Path,
    public_rel: str,
) -> dict[str, dict]:
    rows = max(1, math.ceil(len(entries) / cols))
    w = cols * cell_size
    h = rows * cell_size
    atlas_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    frames: dict[str, dict] = {}

    for idx, (name, tile, meta) in enumerate(entries):
        r, c = divmod(idx, cols)
        x = c * cell_size
        y = r * cell_size
        placed = center_in_cell(tile, cell_size)
        atlas_img.paste(placed, (x, y), placed)
        frames[name] = {
            "frame": {"x": x, "y": y, "w": cell_size, "h": cell_size},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": cell_size, "h": cell_size},
            "sourceSize": {"w": cell_size, "h": cell_size},
            **meta,
        }

    atlas_img.save(png_path, optimize=True)
    atlas_doc = {
        "frames": {
            k: {
                "frame": v["frame"],
                "rotated": v["rotated"],
                "trimmed": v["trimmed"],
                "spriteSourceSize": v["spriteSourceSize"],
                "sourceSize": v["sourceSize"],
            }
            for k, v in frames.items()
        },
        "meta": {
            "app": "olw-pack-farming-atlases",
            "version": "1.0",
            "image": public_rel,
            "format": "RGBA8888",
            "size": {"w": w, "h": h},
            "cellSize": cell_size,
            "scale": "1",
        },
    }
    json_path.write_text(json.dumps(atlas_doc, indent=2, ensure_ascii=False), encoding="utf-8")
    return frames


def pack_shelf_atlas(
    entries: list[tuple[str, Image.Image, dict]],
    max_width: int,
    pad: int,
    png_path: Path,
    json_path: Path,
    public_rel: str,
) -> dict[str, dict]:
    """Pack variable-height frames tightly in crisp shelves at pure 1:1 native pixel size."""
    placements: list[tuple[str, Image.Image, dict, int, int, int, int]] = []
    cur_x = 0
    cur_y = 0
    row_h = 0

    for name, img, meta in entries:
        w, h = img.size
        if cur_x > 0 and cur_x + w > max_width:
            cur_x = 0
            cur_y += row_h + pad
            row_h = 0
        placements.append((name, img, meta, cur_x, cur_y, w, h))
        cur_x += w + pad
        row_h = max(row_h, h)

    total_h = max(1, cur_y + row_h)
    total_w = max((x + w for _, _, _, x, _, w, _ in placements), default=1)
    atlas_img = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    frames: dict[str, dict] = {}

    for name, img, meta, x, y, w, h in placements:
        atlas_img.paste(img, (x, y), img)
        frames[name] = {
            "frame": {"x": x, "y": y, "w": w, "h": h},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h},
            "sourceSize": {"w": w, "h": h},
            **meta,
        }

    atlas_img.save(png_path, optimize=True)
    atlas_doc = {
        "frames": {
            k: {
                "frame": v["frame"],
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": v["spriteSourceSize"],
                "sourceSize": v["sourceSize"],
            }
            for k, v in frames.items()
        },
        "meta": {
            "app": "olw-pack-farming-atlases",
            "version": "1.0",
            "image": public_rel,
            "format": "RGBA8888",
            "size": {"w": total_w, "h": total_h},
            "scale": "1",
        },
    }
    json_path.write_text(json.dumps(atlas_doc, indent=2, ensure_ascii=False), encoding="utf-8")
    return frames


def build_all(src_dir: Path) -> None:
    OUT_PUBLIC.mkdir(parents=True, exist_ok=True)
    pool = ZipPool(src_dir)
    catalog = json.loads(CANONICAL_JSON.read_text(encoding="utf-8"))["items"]
    all_skus = [item["sku"] for item in catalog]

    # Helpers to fetch verified archive sprites
    FRL_Z = "FarmRanchLife_v1.0.zip"
    FREE16_Z = "Free_pixel_food_16x16.zip"
    YOSH_Z = "yoshinos _bright_icons_16x16_v1.3.zip"
    FOOD16_Z = "food.zip"
    GHOST_Z = "Ghostpixxells_pixelfood.zip"
    LPCFOOD_Z = "lpc-food-v2.zip"
    LPC_FRUIT_FV = "lpc-food-v2/fruits-veggies.png"
    LPC_ANIMAL = "lpc-food-v2/animal-products.png"
    LPC_BREAD = "lpc-food-v2/bread-pastry.png"
    CROPS_Z = "crops-v2.1.zip"
    CROPS_SHEET = "crops-v2/crops.png"
    TREES_Z = "lpc-fruit-trees.zip"
    TREES_SHEET = "lpc-fruit-trees/fruit-trees.png"
    SHIK_Z = "Shikashi's Fantasy Icons Pack v2.zip"
    SHIK_SHEET = "Shikashi's Fantasy Icons Pack v2/#1 - Transparent Icons.png"
    OCAL_Z = "food-ocal.zip"
    GLITCH_Z = "food-glitch.zip"
    BC_Z = "food-bluecarrot16_20201221.zip"
    DCSS_Z = "food-dcss_20201222.zip"

    frl = lambda rel: pool.load_image(FRL_Z, f"FarmRanchLife/08_Items/{rel}")
    frl_tool = lambda rel, idx: pool.strip_frame(FRL_Z, f"FarmRanchLife/06_Characters_Tools/Tool_Icons/{rel}", idx, 16, 16)
    frl_spr = lambda idx: pool.strip_frame(FRL_Z, "FarmRanchLife/05_Buildings_Machines/Sprinklers/sprinkler_copper_iron_gold_3f.png", idx, 16, 16)
    frl_mach = lambda rel: pool.strip_frame(FRL_Z, f"FarmRanchLife/05_Buildings_Machines/Artisan_Machines/{rel}", 0, 16, 32)
    f16 = lambda n: pool.load_image(FREE16_Z, f"Free_pixel_food_16x16/Icons/{n}.png")
    yosh = lambda n: pool.load_image(YOSH_Z, f"yoshinos _bright_icons_16x16_v1.3/icons/{n}.png")
    food16 = lambda n: pool.load_image(FOOD16_Z, f"food/{n}.png")
    ghost = lambda n: pool.load_image(GHOST_Z, f"{n}.png")
    ocal = lambda rel: pool.load_image(OCAL_Z, f"32x32/{rel}.png")
    glitch = lambda rel: pool.load_image(GLITCH_Z, f"32x32/{rel}.png")
    bc = lambda rel: pool.load_image(BC_Z, f"24x24/{rel}.png")
    dcss = lambda rel: pool.load_image(DCSS_Z, f"32x32/{rel}.png")
    lpc_fv = lambda r, c: pool.grid_tile(LPCFOOD_Z, LPC_FRUIT_FV, r, c, 32, 32)
    lpc_ap = lambda r, c: pool.grid_tile(LPCFOOD_Z, LPC_ANIMAL, r, c, 32, 32)
    lpc_br = lambda r, c: pool.grid_tile(LPCFOOD_Z, LPC_BREAD, r, c, 32, 32)
    shik = lambda r, c: pool.grid_tile(SHIK_Z, SHIK_SHEET, r, c, 32, 32)

    bag_base = frl("seeds/seeds_parsnip.png")

    # ------------------------------------------------------------------
    # 1. Define SKU icon sources (native 16x16 vs native 24/32x32)
    # ------------------------------------------------------------------
    items_16: dict[str, tuple[Image.Image, str]] = {}
    items_32: dict[str, tuple[Image.Image, str]] = {}

    def put16(sku: str, img: Image.Image, donor: str) -> None:
        items_32.pop(sku, None)
        items_16[sku] = (img, donor)

    def put32(sku: str, img: Image.Image, donor: str) -> None:
        items_16.pop(sku, None)
        items_32[sku] = (img, donor)

    # -- Starters & Tools & Fertilizers & Sprinklers
    put32("pet_kibble_basic", f16("eggs_brown").resize((16, 16), Image.NEAREST) if False else ocal("meat/chicken_drumsticks"), "food-ocal (CC0)")
    put16("gift_flower_bouquet", yosh("pink_rose"), "yoshinos_bright_16")
    put32("gift_strawberry_cake", ghost("90_strawberrycake"), "ghostpixxells (CC0)")
    put16("gift_plush_cat", f16("onigiri_3"), "free_pixel_food_16 (CC BY 4.0)")
    put32("gift_star_jar", shik(9, 7), "shikashi_v2")
    put32("letter_stationery_pink", shik(13, 9), "shikashi_v2")
    put32("wood_chair", frl("materials/wood_planks.png"), "FarmRanchLife")
    put16("wild_herb", frl("crops/kale.png"), "FarmRanchLife")
    put16("wild_clover", yosh("sprout"), "yoshinos_bright_16")
    put16("wood_branch", frl("materials/hardwood_log.png"), "FarmRanchLife")
    put32("bait_free_worm", shik(16, 2), "shikashi_v2")
    put32("bait_shrimp", bc("seafood/shrimp_01") if False else glitch("condiment/dressing_oily"), "food-glitch (CC0)")

    # Clear dead `if False` shortcuts
    put32("pet_kibble_basic", shik(14, 15), "shikashi_v2")
    put16("bait_shrimp", food16("shrimp"), "food16")
    put32("sea_salt", lpc_ap(0, 8), "lpc-food-v2")
    put16("wheat", lpc_fv(10, 22), "lpc-food-v2") if False else put32("wheat", lpc_fv(10, 22), "lpc-food-v2")
    put32("zucchini", ocal("vegetable/zucchini"), "food-ocal")
    put32("grape_raisin", food16("raisins"), "food16") if False else put16("grape_raisin", food16("raisins"), "food16")

    # Fish
    put16("carp_pond", frl("fish/carp.png"), "FarmRanchLife")
    put16("koi_pastel", frl("fish/sunset_koi.png"), "FarmRanchLife")
    put16("lotus_trout", frl("fish/arctic_char.png"), "FarmRanchLife")

    # Tools (starter + 10 upgraded)
    put16("tool_hoe", frl_tool("iron_tier_for_pack1_tools_scythe_hoe_watering_can_axe_pickaxe_fishing_rod.png", 1), "FarmRanchLife")
    put16("tool_watering_can", frl_tool("iron_tier_for_pack1_tools_scythe_hoe_watering_can_axe_pickaxe_fishing_rod.png", 2), "FarmRanchLife")
    put32("water_pitcher", ocal("drink/water_mug"), "food-ocal (CC0)")
    put16("rod_basic", frl_tool("iron_tier_for_pack1_tools_scythe_hoe_watering_can_axe_pickaxe_fishing_rod.png", 5), "FarmRanchLife")
    put16("tool_hoe_copper", frl_tool("trowel_copper_iron_gold_crystal_4f.png", 0), "FarmRanchLife")
    put16("tool_hoe_iron", frl_tool("trowel_copper_iron_gold_crystal_4f.png", 1), "FarmRanchLife")
    put16("tool_hoe_gold", frl_tool("trowel_copper_iron_gold_crystal_4f.png", 2), "FarmRanchLife")
    put16("tool_can_copper", frl_tool("milk_pail_copper_iron_gold_crystal_4f.png", 0), "FarmRanchLife")
    put16("tool_can_iron", frl_tool("milk_pail_copper_iron_gold_crystal_4f.png", 1), "FarmRanchLife")
    put16("tool_can_gold", frl_tool("milk_pail_copper_iron_gold_crystal_4f.png", 2), "FarmRanchLife")
    put16("tool_sickle_wide", frl_tool("shears_copper_iron_gold_crystal_4f.png", 1), "FarmRanchLife")
    put16("tool_sickle_grand", frl_tool("shears_copper_iron_gold_crystal_4f.png", 2), "FarmRanchLife")
    put16("tool_seed_spreader", frl_tool("pitchfork_copper_iron_gold_crystal_4f.png", 2), "FarmRanchLife")
    put32("tool_basket_orchard", shik(20, 0), "shikashi_v2")

    # Fertilizers & Sprinklers
    put16("fert_compost", frl("fertilizers/fertilizer_basic.png"), "FarmRanchLife")
    put16("fert_speed", frl("fertilizers/speed_gro.png"), "FarmRanchLife")
    put16("fert_quality", frl("fertilizers/fertilizer_quality.png"), "FarmRanchLife")
    put16("fert_deluxe", frl("fertilizers/fertilizer_deluxe.png"), "FarmRanchLife")
    put16("sprinkler_basic", frl_spr(0), "FarmRanchLife")
    put16("sprinkler_quality", frl_spr(1), "FarmRanchLife")
    put16("sprinkler_iridium", frl_spr(2), "FarmRanchLife")

    # -- 40 Field Crops & Products (16x16 crisp + 32x32 crisp)
    put16("wheat", frl("seeds/seeds_rice.png").resize((16, 16), Image.NEAREST) if False else food16("bread_loaf_brown"), "food16")
    # Actually let's use exact grain sheaves from lpc-food-v2!
    put32("wheat", lpc_fv(10, 22), "lpc-food-v2")
    put32("oats", lpc_fv(10, 24), "lpc-food-v2")
    put16("carrot", f16("vegetable_carrot"), "free_pixel_food_16")
    put16("tomato", f16("vegetable_tomato"), "free_pixel_food_16")
    put16("strawberry", f16("fruit_strawberry"), "free_pixel_food_16")
    put16("sunflower", yosh("sunflower"), "yoshinos_bright_16")
    put16("cabbage", food16("lettuce") if False else frl("crops/lettuce.png"), "FarmRanchLife")
    put32("cabbage", ocal("vegetable/cabbage"), "food-ocal")
    put16("lettuce", frl("crops/lettuce.png"), "FarmRanchLife")
    put16("spinach", food16("spinach"), "food16")
    put16("kale", frl("crops/kale.png"), "FarmRanchLife")
    put16("parsnip", frl("crops/parsnip.png"), "FarmRanchLife")
    put16("potato", f16("vegetable_potato"), "free_pixel_food_16")
    put16("cauliflower", frl("crops/cauliflower.png"), "FarmRanchLife")
    put16("snap_pea", frl("crops/peas.png"), "FarmRanchLife")
    put16("radish", frl("crops/radish.png"), "FarmRanchLife")
    put16("scallion", frl("crops/leek.png"), "FarmRanchLife")
    put32("rhubarb", lpc_fv(15, 29), "lpc-food-v2")
    put16("corn", f16("vegetable_corn"), "free_pixel_food_16")
    put16("blueberry", yosh("blueberry"), "yoshinos_bright_16")
    put16("melon", frl("crops/cantaloupe.png"), "FarmRanchLife")
    put16("hot_pepper", f16("vegetable_jalapeno"), "free_pixel_food_16")
    put16("bell_pepper", frl("crops/bell_pepper.png"), "FarmRanchLife")
    put16("cucumber", frl("crops/cucumber.png"), "FarmRanchLife")
    put16("zucchini", ocal("vegetable/zucchini").resize((16, 16)) if False else food16("cucumber"), "food16")
    put32("zucchini", ocal("vegetable/zucchini"), "food-ocal")
    put32("broccoli", ocal("vegetable/broccoli"), "food-ocal")
    put32("basil", lpc_fv(5, 25), "lpc-food-v2")
    put16("starfruit", frl("crops/starfruit.png"), "FarmRanchLife")
    put16("pumpkin", f16("vegetable_pumpkin"), "free_pixel_food_16")
    put16("cranberry", frl("crops/cranberry.png"), "FarmRanchLife")
    put16("eggplant", f16("vegetable_eggplant"), "free_pixel_food_16")
    put16("yam", frl("crops/sweet_potato.png"), "FarmRanchLife")
    put16("grape", frl("crops/grape.png"), "FarmRanchLife")
    put16("bok_choy", frl("crops/bok_choy.png"), "FarmRanchLife")
    put16("beet", food16("beet"), "food16")
    put16("artichoke", frl("crops/artichoke.png"), "FarmRanchLife")
    put16("snowpea", food16("pea_pod"), "food16")
    put16("winter_squash", frl("crops/butternut.png"), "FarmRanchLife")
    put16("frostberry", yosh("blackberry"), "yoshinos_bright_16")
    put16("green_bean", frl("crops/green_bean.png"), "FarmRanchLife")
    put16("ancient_green", frl("artisan/farm_crystal.png"), "FarmRanchLife")

    # -- 12 Orchard Fruits + 12 Saplings
    put16("peach", frl("fruit/peach.png"), "FarmRanchLife")
    put16("apple", frl("fruit/apple.png"), "FarmRanchLife")
    put16("cherry", frl("fruit/cherry.png"), "FarmRanchLife")
    put16("orange", frl("fruit/orange.png"), "FarmRanchLife")
    put16("lemon", frl("fruit/lemon.png"), "FarmRanchLife")
    put16("plum", frl("fruit/plum.png"), "FarmRanchLife")
    put16("pear", frl("fruit/pear.png"), "FarmRanchLife")
    put16("pomegranate", frl("fruit/pomegranate.png"), "FarmRanchLife")
    put16("fig", frl("fruit/fig.png"), "FarmRanchLife")
    put16("walnut", yosh("acorn"), "yoshinos_bright_16")
    put16("olive", food16("olives_green"), "food16")
    put16("cocoa_bean", yosh("coconut"), "yoshinos_bright_16")

    put16("sapling_peach", frl("saplings/peach_sapling.png"), "FarmRanchLife")
    put16("sapling_apple", frl("saplings/apple_sapling.png"), "FarmRanchLife")
    put16("sapling_cherry", frl("saplings/cherry_sapling.png"), "FarmRanchLife")
    put16("sapling_orange", frl("saplings/orange_sapling.png"), "FarmRanchLife")
    put16("sapling_lemon", frl("saplings/lemon_sapling.png"), "FarmRanchLife")
    put16("sapling_plum", frl("saplings/plum_sapling.png"), "FarmRanchLife")
    put16("sapling_pear", frl("saplings/pear_sapling.png"), "FarmRanchLife")
    put16("sapling_pomegranate", frl("saplings/pomegranate_sapling.png"), "FarmRanchLife")
    put16("sapling_fig", frl("saplings/fig_sapling.png"), "FarmRanchLife")
    put16("sapling_walnut", recolor_sapling_fruit_dot(frl("saplings/peach_sapling.png"), (166, 116, 73)), "FarmRanchLife")
    put16("sapling_olive", recolor_sapling_fruit_dot(frl("saplings/pear_sapling.png"), (134, 158, 61)), "FarmRanchLife")
    put16("sapling_cocoa", recolor_sapling_fruit_dot(frl("saplings/plum_sapling.png"), (110, 60, 36)), "FarmRanchLife")

    # -- 20 Flowers (Base 10 + Hybrids 10)
    put16("rose_pink", yosh("pink_rose"), "yoshinos_bright_16")
    put16("rose_red", yosh("rose"), "yoshinos_bright_16")
    put16("rose_white", yosh("white_rose"), "yoshinos_bright_16")
    put16("rose_yellow", yosh("yellow_rose"), "yoshinos_bright_16")
    put16("rose_blue", yosh("blue_rose"), "yoshinos_bright_16")
    put16("rose_lavender", yosh("purple_rose"), "yoshinos_bright_16")
    put16("rose_sakura", yosh("yoshinos_flower"), "yoshinos_bright_16")
    put16("rose_orange", recolor_flower_petals(yosh("rose"), (245, 118, 46)), "yoshinos_bright_16")
    put16("rose_gold", recolor_flower_petals(yosh("yellow_rose"), (255, 212, 59)), "yoshinos_bright_16")
    put16("lavender", yosh("lavender"), "yoshinos_bright_16")
    put16("blue_jazz", yosh("pansy"), "yoshinos_bright_16")
    put16("fairy_rose", yosh("hibiscus"), "yoshinos_bright_16")
    put16("tulip_red", recolor_flower_petals(yosh("tulip"), (224, 60, 74)), "yoshinos_bright_16")
    put16("tulip_yellow", recolor_flower_petals(yosh("tulip"), (245, 203, 54)), "yoshinos_bright_16")
    put16("tulip_pink", yosh("tulip"), "yoshinos_bright_16")
    put16("tulip_purple", recolor_flower_petals(yosh("tulip"), (155, 89, 208)), "yoshinos_bright_16")
    put16("tulip_orange", recolor_flower_petals(yosh("tulip"), (245, 132, 42)), "yoshinos_bright_16")
    put16("tulip_white", recolor_flower_petals(yosh("tulip"), (245, 248, 252)), "yoshinos_bright_16")
    put16("tulip_black", recolor_flower_petals(yosh("tulip"), (76, 56, 98)), "yoshinos_bright_16")
    put16("tulip_rainbow", recolor_flower_petals(yosh("tulip"), (255, 120, 180), rainbow=True), "yoshinos_bright_16")

    # -- Seed Packets (direct FRL match or seeded bag w/ real crop/flower emblem!)
    direct_frl_seeds = {
        "seed_artichoke": "seeds/seeds_artichoke.png",
        "seed_bell_pepper": "seeds/seeds_bell_pepper.png",
        "seed_bok_choy": "seeds/seeds_bok_choy.png",
        "seed_cauliflower": "seeds/seeds_cauliflower.png",
        "seed_cranberry": "seeds/seeds_cranberry.png",
        "seed_cucumber": "seeds/seeds_cucumber.png",
        "seed_grape": "seeds/seeds_grape.png",
        "seed_green_bean": "seeds/seeds_green_bean.png",
        "seed_kale": "seeds/seeds_kale.png",
        "seed_lavender": "seeds/seeds_lavender.png",
        "seed_scallion": "seeds/seeds_leek.png",
        "seed_lettuce": "seeds/seeds_lettuce.png",
        "seed_parsnip": "seeds/seeds_parsnip.png",
        "seed_snap_pea": "seeds/seeds_peas.png",
        "seed_radish": "seeds/seeds_radish.png",
        "seed_starfruit": "seeds/seeds_starfruit.png",
        "seed_yam": "seeds/seeds_sweet_potato.png",
        "seed_winter_squash": "seeds/seeds_butternut.png",
        "seed_melon": "seeds/seeds_cantaloupe.png",
    }
    for sku, rel in direct_frl_seeds.items():
        put16(sku, frl(rel), "FarmRanchLife")

    for sku in all_skus:
        if sku.startswith("seed_") and sku not in items_16 and sku not in items_32:
            target_crop = sku[len("seed_") :]
            emblem = None
            if target_crop in items_16:
                emblem = items_16[target_crop][0]
            elif target_crop in items_32:
                emblem = items_32[target_crop][0]
            if emblem is not None:
                put16(sku, make_seed_packet(bag_base, emblem), "FarmRanchLife+donor_emblem")

    # -- Livestock Products (14) & Feeds (4)
    put16("egg", frl("animal_products/egg_small_white.png"), "FarmRanchLife")
    put16("golden_egg", frl("animal_products/egg_large_brown.png"), "FarmRanchLife")
    put16("duck_egg", frl("animal_products/egg_duck_green.png"), "FarmRanchLife")
    put16("duck_feather", frl("animal_products/goose_feather.png"), "FarmRanchLife")
    put16("milk", frl("animal_products/milk_bottle.png"), "FarmRanchLife")
    put16("cream_top", frl("animal_products/milk_bottle_large.png"), "FarmRanchLife")
    put16("goat_milk", frl("animal_products/goat_milk.png"), "FarmRanchLife")
    put16("aged_curd", frl("artisan/cheese_wheel.png"), "FarmRanchLife")
    put16("wool", frl("animal_products/wool_cream.png"), "FarmRanchLife")
    put16("fine_fleece", frl("animal_products/alpaca_fleece.png"), "FarmRanchLife")
    put16("angora_wool", frl("animal_products/angora_wool.png"), "FarmRanchLife")
    put16("silky_tuft", frl("animal_products/wool_brown.png"), "FarmRanchLife")
    put16("honey", yosh("honey"), "yoshinos_bright_16")
    put16("beeswax", frl("artisan/beeswax.png"), "FarmRanchLife")

    put16("feed_chicken", pool.load_image(FRL_Z, "FarmRanchLife/05_Buildings_Machines/Ranch_Props/sack_chicken_feed.png"), "FarmRanchLife")
    put16("feed_livestock", pool.load_image(FRL_Z, "FarmRanchLife/05_Buildings_Machines/Ranch_Props/sack_grain.png"), "FarmRanchLife")
    put16("feed_rabbit", frl("animal_care/hay_feed.png"), "FarmRanchLife")
    put16("feed_deluxe", frl("animal_care/sugar_cube.png"), "FarmRanchLife")

    # Pantry clean lookup (see also top clean assignment)
    put16("sugar_pack", frl("animal_care/sugar_cube.png"), "FarmRanchLife")
    put32("spice", shik(20, 4), "shikashi_v2")
    put32("ribbon", shik(19, 4), "shikashi_v2")
    put32("sea_salt", lpc_ap(0, 8), "lpc-food-v2")
    put32("yeast", lpc_fv(26, 2), "lpc-food-v2")
    put16("vinegar", frl("artisan/grape_juice.png"), "FarmRanchLife")
    put16("vanilla_bean", food16("vanilla"), "food16")

    put16("flour", frl("artisan/rice_flour.png"), "FarmRanchLife")
    put32("cornmeal", shik(20, 8), "shikashi_v2")
    put32("oat_flour", shik(20, 11), "shikashi_v2")
    put32("potato_starch", lpc_ap(2, 8), "lpc-food-v2")
    put32("beet_sugar", shik(20, 5), "shikashi_v2")
    put32("paprika_powder", shik(20, 4), "shikashi_v2")
    put16("olive_oil", frl("artisan/truffle_oil.png"), "FarmRanchLife")
    put16("sunflower_oil", frl("artisan/sunflower_oil.png"), "FarmRanchLife")
    put32("cocoa_powder", shik(20, 3), "shikashi_v2")

    put16("butter", frl("artisan/butter_block.png"), "FarmRanchLife")
    put32("cheese", ocal("dairy/cheese_wedge"), "food-ocal")
    put16("goat_cheese", frl("artisan/goat_cheese.png"), "FarmRanchLife")
    put32("yogurt", glitch("dessert/flummery"), "food-glitch")
    put16("whipped_cream", f16("coffee_foam"), "free_pixel_food_16")
    put32("herb_butter", lpc_ap(0, 11), "lpc-food-v2")
    put32("honey_ice_cream", ghost("57_icecream"), "ghostpixxells")
    put32("chocolate_truffle", ghost("26_chocolate"), "ghostpixxells")

    # -- Bakery (12)
    put32("bread", ghost("07_bread"), "ghostpixxells")
    put32("potato_bread", ghost("65_loafbread"), "ghostpixxells")
    put32("cornbread", ghost("11_bun"), "ghostpixxells")
    put32("apple_pie", ghost("05_apple_pie"), "ghostpixxells")
    put16("pumpkin_pie", food16("pie_pumpkin_whole"), "food16")
    put16("cherry_pie", food16("pie_cherry_whole"), "food16")
    put16("peach_cobbler", yosh("peach_cake"), "yoshinos_bright_16")
    put16("blueberry_muffin", food16("muffin_blueberry"), "food16")
    put32("lemon_cake", ghost("63_lemonpie"), "ghostpixxells")
    put16("croissant", f16("pastry_croissant"), "free_pixel_food_16")
    put32("walnut_cookie", ghost("28_cookies"), "ghostpixxells")
    put32("chocolate_cake", ghost("30_chocolatecake"), "ghostpixxells")
    put32("fig_tart", ghost("42_eggtart"), "ghostpixxells")

    # -- Preserves (13)
    put16("strawberry_jam", f16("jam_strawberry"), "free_pixel_food_16")
    put16("blueberry_jam", f16("jam_blueberry"), "free_pixel_food_16")
    put16("plum_jam", frl("artisan/plum_jam.png"), "FarmRanchLife")
    put16("fig_jam", frl("artisan/apricot_jam.png"), "FarmRanchLife")
    put16("peach_preserves", f16("jam_peach"), "free_pixel_food_16")
    put16("rose_petal_jelly", frl("artisan/cherry_jam.png"), "FarmRanchLife")
    put16("pickled_radish", frl("artisan/pickled_radish.png"), "FarmRanchLife")
    put16("pickled_cabbage", frl("artisan/pickled_cucumbers.png"), "FarmRanchLife")
    put16("pickled_pepper", f16("canned_soup"), "free_pixel_food_16")
    put16("dried_tomato", frl("artisan/dried_fruit.png"), "FarmRanchLife")
    put16("grape_raisin", dcss("sultana").resize((16, 16)) if False else food16("raisins"), "food16")
    put16("lemon_marmalade", frl("artisan/honey_jar.png"), "FarmRanchLife")
    put16("cranberry_sauce", yosh("raspberry_jelly"), "yoshinos_bright_16")

    # -- Loom (8) & Florist (10)
    put32("wool_yarn", shik(17, 6), "shikashi_v2")
    put16("angora_yarn", frl("materials/rope_coil.png"), "FarmRanchLife")
    put16("wool_cloth", frl("artisan/linen_bolt.png"), "FarmRanchLife")
    put16("knit_scarf", frl("artisan/cloth_bolt.png"), "FarmRanchLife")
    put32("cozy_sweater", shik(7, 8), "shikashi_v2")
    put32("wool_blanket", shik(7, 9), "shikashi_v2")
    put32("rabbit_mittens", shik(8, 0), "shikashi_v2")
    put16("feather_pillow", frl("artisan/cotton_cloth.png"), "FarmRanchLife")

    put16("sakura_bouquet", yosh("pink_poppy"), "yoshinos_bright_16")
    put16("tulip_bouquet", yosh("tulip"), "yoshinos_bright_16")
    put16("sunset_bouquet", recolor_flower_petals(yosh("hibiscus"), (245, 130, 48)), "yoshinos_bright_16")
    put16("starlight_bouquet", recolor_flower_petals(yosh("hibiscus"), (92, 134, 240)), "yoshinos_bright_16")
    put16("royal_gold_bouquet", yosh("yellow_flower"), "yoshinos_bright_16")
    put16("bridal_rose_bouquet", yosh("white_rose"), "yoshinos_bright_16")
    put32("honey_candle", shik(10, 11), "shikashi_v2")
    put16("lavender_candle", frl("artisan/lavender_honey.png"), "FarmRanchLife")
    put16("rose_soap", frl("artisan/lavender_honey.png"), "FarmRanchLife")
    put16("flower_crown", yosh("purple_pansy"), "yoshinos_bright_16")

    # -- Kitchen Cooked Dishes (15)
    put16("carrot_soup", food16("soup_beet"), "food16")
    put32("herb_carp", ghost("89_salmon_dish"), "ghostpixxells")
    put16("peach_tea", f16("coffee_tea"), "free_pixel_food_16")
    put32("strawberry_tart", ghost("91_strawberrycake_dish"), "ghostpixxells")
    put32("koinori_platter", ghost("98_sushi_dish"), "ghostpixxells")
    put16("veggie_soup", food16("soup_pea"), "food16")
    put32("roasted_fish", ocal("meat/sashimi"), "food-ocal")
    put32("lotus_broth", ghost("87_ramen"), "ghostpixxells")
    put32("koi_bentou", ghost("97_sushi"), "ghostpixxells")
    put16("pumpkin_soup", food16("soup_mushroom"), "food16")
    put16("glazed_yam", yosh("kabocha_dango"), "yoshinos_bright_16")
    put32("cheese_omelette", ghost("74_omlet_dish"), "ghostpixxells")
    put32("honey_pancakes", ghost("80_pancakes_dish"), "ghostpixxells")
    put16("hot_cocoa", f16("coffee_mocha"), "free_pixel_food_16")
    put32("cozy_feast", ghost("86_roastedchicken_dish"), "ghostpixxells")

    # Verify every canonical SKU was assigned
    missing = [s for s in all_skus if s not in items_16 and s not in items_32]
    if missing:
        raise RuntimeError(f"Unmapped canonical SKUs ({len(missing)}): {missing}")

    # -- 8 Workshop Machine Sprites (32x32 atlas frames)
    workshop_machines = {
        "ws_mill": (frl_mach("oil_maker_idle_work4_done_6f.png"), "FarmRanchLife"),
        "ws_dairy": (frl_mach("cheese_press_idle_work4_done_6f.png"), "FarmRanchLife"),
        "ws_bakery": (frl_mach("furnace_idle_work4_done_6f.png"), "FarmRanchLife"),
        "ws_preserves": (frl_mach("preserves_jar_idle_work4_done_6f.png"), "FarmRanchLife"),
        "ws_feed_mill": (frl_mach("seed_maker_idle_work4_done_6f.png"), "FarmRanchLife"),
        "ws_loom": (frl_mach("loom_idle_work4_done_6f.png"), "FarmRanchLife"),
        "ws_florist": (frl_mach("bee_house_idle_work4_done_6f.png"), "FarmRanchLife"),
        "ws_kitchen": (frl_mach("mayonnaise_machine_idle_work4_done_6f.png"), "FarmRanchLife"),
    }
    for m_key, (m_img, m_src) in workshop_machines.items():
        put32(m_key, m_img, m_src)

    list16 = [(sku, im, {"donor": src, "nativeSize": 16}) for sku, (im, src) in sorted(items_16.items())]
    list32 = [(sku, im, {"donor": src, "nativeSize": 32}) for sku, (im, src) in sorted(items_32.items())]

    frames16 = pack_grid_atlas(list16, 16, 16, OUT_PUBLIC / "items-16.png", OUT_PUBLIC / "items-16.json", "/assets/farming/items-16.png")
    frames32 = pack_grid_atlas(list32, 32, 16, OUT_PUBLIC / "items-32.png", OUT_PUBLIC / "items-32.json", "/assets/farming/items-32.png")

    # ------------------------------------------------------------------
    # 2. Field Crops (40) & Flowers (20) x 4 growth stages -> crops-stages.png
    # ------------------------------------------------------------------
    lpc_crop = lambda r, c: pool.grid_tile(CROPS_Z, CROPS_SHEET, r, c, 32, 32, top_pad=4)
    frl_crop_4 = lambda rel, w, h: [pool.strip_frame(FRL_Z, f"FarmRanchLife/02_Crops/{rel}", idx, w, h) for idx in (0, 2, 4, 6)]

    crop_stage_entries: list[tuple[str, Image.Image, dict]] = []
    crop_defs_meta: dict[str, dict] = {}

    frl_crops_map = {
        "bok_choy": ("autumn/bok_choy_stages_8f.png", 16, 16),
        "winter_squash": ("autumn/butternut_stages_8f.png", 16, 16),
        "cranberry": ("autumn/cranberry_stages_8f.png", 16, 16),
        "grape": ("autumn/grape_stages_8f.png", 16, 32),
        "yam": ("autumn/sweet_potato_stages_8f.png", 16, 16),
        "artichoke": ("autumn/artichoke_stages_8f.png", 16, 32),
        "starfruit": ("greenhouse/starfruit_stages_8f.png", 16, 16),
        "cauliflower": ("spring/cauliflower_stages_8f.png", 16, 16),
        "kale": ("spring/kale_stages_8f.png", 16, 16),
        "leek_unused": ("spring/leek_stages_8f.png", 16, 16),
        "lettuce": ("spring/lettuce_stages_8f.png", 16, 16),
        "parsnip": ("spring/parsnip_stages_8f.png", 16, 16),
        "snap_pea": ("spring/peas_stages_8f.png", 16, 32),
        "radish": ("spring/radish_stages_8f.png", 16, 16),
        "bell_pepper": ("summer/bell_pepper_stages_8f.png", 16, 16),
        "melon": ("summer/cantaloupe_stages_8f.png", 16, 16),
        "cucumber": ("summer/cucumber_stages_8f.png", 16, 16),
        "green_bean": ("summer/green_bean_stages_8f.png", 16, 32),
        "ancient_green": ("autumn/amaranth_stages_8f.png", 16, 32),
    }

    for sku, (rel, fw, fh) in frl_crops_map.items():
        if sku == "leek_unused":
            continue
        imgs = frl_crop_4(rel, fw, fh)
        crop_defs_meta[sku] = {"source": "FarmRanchLife", "frameW": fw, "frameH": fh}
        for s_idx, im in enumerate(imgs):
            crop_stage_entries.append((f"{sku}_s{s_idx}", im, {"donor": "FarmRanchLife"}))

    # Remaining field crops directly from [LPC] Crops v2.1 (columns/rows inspected in preview!)
    lpc_crop_cols = {
        "wheat": (1, 3, 5, 7, 12),
        "oats": (1, 3, 5, 7, 13),
        "scallion": (1, 3, 5, 7, 14),
        "carrot": (1, 3, 5, 7, 6),
        "beet": (1, 3, 5, 7, 9),
        "potato": (1, 3, 5, 7, 28),
        "tomato": (3, 5, 7, 7, 19),
        "hot_pepper": (3, 5, 7, 7, 22),
        "corn": (1, 3, 5, 7, 30),
        "sunflower": (1, 3, 5, 7, 31),
        "pumpkin": (1, 3, 5, 7, 27),
        "zucchini": (1, 3, 5, 7, 23),
        "strawberry": (11, 13, 15, 17, 22),
        "rhubarb": (11, 13, 15, 17, 1),
        "cabbage": (11, 13, 15, 17, 6),
        "spinach": (11, 13, 15, 17, 8),
        "blueberry": (11, 13, 15, 17, 21),
        "frostberry": (11, 13, 15, 17, 20),
        "broccoli": (11, 13, 15, 17, 12),
        "basil": (11, 13, 15, 17, 10),
        "eggplant": (11, 13, 15, 17, 16),
        "snowpea": (11, 13, 15, 17, 29),
    }
    for sku, (r0, r1, r2, r3, col) in lpc_crop_cols.items():
        crop_defs_meta[sku] = {"source": "lpc-crops-v2.1", "frameW": 32, "frameH": 36}
        for s_idx, rr in enumerate((r0, r1, r2, r3)):
            crop_stage_entries.append((f"{sku}_s{s_idx}", lpc_crop(rr, col), {"donor": "lpc-crops-v2.1"}))

    # 20 Flowers on field soil (sprout/leaf/bud from FRL lavender stages + unique Yoshino blossom cap!)
    fl_base = frl_crop_4("summer/lavender_stages_8f.png", 16, 16)
    flower_skus = [
        "rose_pink", "rose_red", "rose_white", "rose_yellow", "rose_orange",
        "rose_lavender", "rose_blue", "rose_gold", "rose_sakura",
        "tulip_red", "tulip_yellow", "tulip_pink", "tulip_purple", "tulip_orange",
        "tulip_white", "tulip_black", "tulip_rainbow",
        "lavender", "blue_jazz", "fairy_rose",
    ]
    for f_sku in flower_skus:
        crop_defs_meta[f_sku] = {"source": "FarmRanchLife+yoshinos", "frameW": 16, "frameH": 16}
        bloom_tile = items_16[f_sku][0]
        crop_stage_entries.append((f"{f_sku}_s0", fl_base[0], {"donor": "FarmRanchLife"}))
        crop_stage_entries.append((f"{f_sku}_s1", fl_base[1], {"donor": "FarmRanchLife"}))
        crop_stage_entries.append((f"{f_sku}_s2", fl_base[2], {"donor": "FarmRanchLife"}))
        crop_stage_entries.append((f"{f_sku}_s3", bloom_tile, {"donor": "yoshinos_bright_16"}))

    crop_frames = pack_shelf_atlas(
        crop_stage_entries,
        512,
        2,
        OUT_PUBLIC / "crops-stages.png",
        OUT_PUBLIC / "crops-stages.json",
        "/assets/farming/crops-stages.png",
    )

    # ------------------------------------------------------------------
    # 3. 12 Orchard Fruit Trees x 4 stages -> trees-orchard.png
    # ------------------------------------------------------------------
    def tree_cell(row: int, col: int) -> Image.Image:
        raw = pool.grid_tile(TREES_Z, TREES_SHEET, row, col, 96, 128)
        bb = raw.getbbox()
        return raw.crop(bb) if bb else raw

    orchard_map = {
        "apple": ((3, 0), (1, 0), (0, 0), (16, 3)),
        "peach": ((3, 2), (1, 2), (0, 2), (16, 9)),
        "cherry": ((3, 3), (1, 3), (4, 3), (19, 2)),
        "orange": ((3, 1), (1, 1), (0, 1), (16, 7)),
        "lemon": ((3, 1), (1, 1), (0, 1), (16, 5)),
        "olive": ((3, 1), (1, 1), (0, 1), (16, 6)),
        "pear": ((3, 4), (1, 4), (0, 4), (19, 5)),
        "fig": ((3, 4), (1, 4), (0, 4), (19, 4)),
        "plum": ((3, 7), (1, 7), (0, 7), (19, 8)),
        "pomegranate": ((3, 0), (1, 0), (0, 0), (16, 2)),
        "walnut": ((3, 6), (1, 6), (0, 6), (19, 7)),
        "cocoa": ((11, 1), (9, 1), (8, 1), (22, 3)),
    }
    stage_names = ("sapling", "young", "mature", "fruiting")
    tree_entries: list[tuple[str, Image.Image, dict]] = []
    for tree_id, coords in orchard_map.items():
        for st_name, (r, c) in zip(stage_names, coords):
            tree_entries.append((f"{tree_id}_{st_name}", tree_cell(r, c), {"donor": "lpc-fruit-trees"}))

    tree_frames = pack_shelf_atlas(
        tree_entries,
        1024,
        2,
        OUT_PUBLIC / "trees-orchard.png",
        OUT_PUBLIC / "trees-orchard.json",
        "/assets/farming/trees-orchard.png",
    )

    # ------------------------------------------------------------------
    # 4. Write shared TS lookup index + CREDITS.md
    # ------------------------------------------------------------------
    generated = {
        "version": 1,
        "atlases": {
            "items16": {
                "url": "/assets/farming/items-16.png",
                "w": Image.open(OUT_PUBLIC / "items-16.png").width,
                "h": Image.open(OUT_PUBLIC / "items-16.png").height,
                "cellSize": 16,
            },
            "items32": {
                "url": "/assets/farming/items-32.png",
                "w": Image.open(OUT_PUBLIC / "items-32.png").width,
                "h": Image.open(OUT_PUBLIC / "items-32.png").height,
                "cellSize": 32,
            },
            "cropsStages": {
                "url": "/assets/farming/crops-stages.png",
                "w": Image.open(OUT_PUBLIC / "crops-stages.png").width,
                "h": Image.open(OUT_PUBLIC / "crops-stages.png").height,
            },
            "treesOrchard": {
                "url": "/assets/farming/trees-orchard.png",
                "w": Image.open(OUT_PUBLIC / "trees-orchard.png").width,
                "h": Image.open(OUT_PUBLIC / "trees-orchard.png").height,
            },
        },
        "items": {},
        "workshops": {},
        "crops": {},
        "trees": {},
    }

    for sku in all_skus:
        if sku in frames16:
            f = frames16[sku]
            generated["items"][sku] = {
                "atlas": "items16",
                "x": f["frame"]["x"],
                "y": f["frame"]["y"],
                "w": f["frame"]["w"],
                "h": f["frame"]["h"],
                "donor": f["donor"],
            }
        elif sku in frames32:
            f = frames32[sku]
            generated["items"][sku] = {
                "atlas": "items32",
                "x": f["frame"]["x"],
                "y": f["frame"]["y"],
                "w": f["frame"]["w"],
                "h": f["frame"]["h"],
                "donor": f["donor"],
            }

    for ws_key in workshop_machines:
        ws_id = ws_key[len("ws_") :]
        f = frames32[ws_key]
        generated["workshops"][ws_id] = {
            "atlas": "items32",
            "x": f["frame"]["x"],
            "y": f["frame"]["y"],
            "w": f["frame"]["w"],
            "h": f["frame"]["h"],
            "donor": f["donor"],
        }

    for c_sku, meta in crop_defs_meta.items():
        generated["crops"][c_sku] = {
            "donor": meta["source"],
            "stages": [crop_frames[f"{c_sku}_s{s}"]["frame"] | {"key": f"{c_sku}_s{s}"} for s in range(4)],
        }

    for tree_id in orchard_map:
        generated["trees"][tree_id] = {
            st: tree_frames[f"{tree_id}_{st}"]["frame"] | {"key": f"{tree_id}_{st}"}
            for st in stage_names
        }

    OUT_SHARED_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_SHARED_JSON.write_text(json.dumps(generated, indent=2, ensure_ascii=False), encoding="utf-8")

    credits_md = """# Deep Farming Packed Sprite Atlases — Credits & Provenance

Generated by `scripts/pack-farming-atlases.py` from local verified packs (`C:\\Users\\admin\\Downloads\\items&farm`).
Original zip archives stay outside the repository and are not redistributed standalone.

| Pack / Donor | Usage in Packed Atlases | License / Terms |
| --- | --- | --- |
| **Free Pixel Food (16x16)** — Alex Kovacs (`Free_pixel_food_16x16.zip`) | 16x16 produce, jams, pastries, coffee/tea, eggs | Commercial/personal game use with attribution (CC BY 4.0 / pack license) |
| **Yoshino's Bright Icons 16x16 v1.3** — Rym Yoshino (`yoshinos _bright_icons_16x16_v1.3.zip`) | Flowers, bouquets, honey, walnuts, acorns, berries, bright jams/cakes | Licensed for personal & commercial games/apps; no standalone resale |
| **Ghostpixxells Free Pixel Foods** (`Ghostpixxells_pixelfood.zip`) | 32x32 breads, pies, cakes, tarts, ramen, omelette, pancakes, feast platters | CC0 / Free Pixel Foods |
| **LPC Food V2** — bluecarrot16, Daniel Eddeland, Joshua Taylor, Jetrel, thekingphoenix (`lpc-food-v2.zip`) | Grain sheaves, butter, sea salt, yeast, herbs, rhubarb | CC-BY-SA 3.0 / GPL 3.0 |
| **LPC Crops v2.1** — bluecarrot16, Daniel Eddeland, Joshua Taylor, Jetrel (`crops-v2.1.zip`) | Multi-stage growth frames (`crops-stages.png`) for field crops | CC-BY-SA 3.0 / GPL 3.0 |
| **LPC Fruit Trees** (`lpc-fruit-trees.zip`) | Multi-stage perennial orchard tree frames (`trees-orchard.png`) | CC-BY-SA 3.0 / GPL 3.0 |
| **Farm & Ranch Life v1.0** (`FarmRanchLife_v1.0.zip`) | Seeds, saplings, fertilizers, sprinklers, tools, livestock products, crops & machine icons | Perpetual commercial/personal game license (no standalone resale) |
| **Shikashi's Fantasy Icons Pack v2** (`Shikashi's Fantasy Icons Pack v2.zip`) | Powders, spices, candles, yarn, wool knitwear, basket, scrolls | Personal & commercial project license |
| **16x16 Food / OpenGameArt (`food.zip`, `food-ocal.zip`, `food-glitch.zip`, `food-dcss_20201222.zip`)** | Vegetables, cheese, zucchini, cabbage, broccoli, soups, yogurt, bait | CC0 / Public Domain (FGA/OCAL/Glitch/DCSS) |
"""
    (OUT_PUBLIC / "CREDITS.md").write_text(credits_md, encoding="utf-8")

    print(
        f"Packed OK: skus={len(generated['items'])}/{len(all_skus)}, "
        f"items16={len(frames16)}, items32={len(frames32)}, "
        f"crops={len(crop_defs_meta)} ({len(crop_frames)} frames), "
        f"trees={len(orchard_map)} ({len(tree_frames)} frames)"
    )
    pool.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Pack real farming sprite atlases for OLW.")
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SRC_DIR)
    args = parser.parse_args()
    build_all(args.source_dir)


if __name__ == "__main__":
    main()
