#!/usr/bin/env python3
"""Convert vendored Tuxemon .tmx → OLW forest.json with donor tilesets (no cozy remap)."""
from __future__ import annotations

import argparse
import base64
import json
import re
import struct
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path


TW = 16


def parse_tsx(tsx_path: Path) -> dict:
    root = ET.parse(tsx_path).getroot()
    name = root.get("name", tsx_path.stem)
    img = root.find("image")
    if img is None:
        raise ValueError(f"No image in {tsx_path}")
    img_src = img.get("source", "")
    img_path = (tsx_path.parent / img_src).resolve()
    return {
        "name": name,
        "columns": int(root.get("columns", "1")),
        "tilecount": int(root.get("tilecount", "1")),
        "tilewidth": int(root.get("tilewidth", str(TW))),
        "tileheight": int(root.get("tileheight", str(TW))),
        "imagewidth": int(img.get("width", "0")),
        "imageheight": int(img.get("height", "0")),
        "image_file": img_path.name,
        "margin": int(root.get("margin", "0")),
        "spacing": int(root.get("spacing", "0")),
    }


def decode_layer_data(data_el: ET.Element, width: int, height: int) -> list[int]:
    encoding = data_el.get("encoding", "")
    compression = data_el.get("compression")
    raw = (data_el.text or "").strip()
    if encoding == "base64":
        blob = base64.b64decode(raw)
        if compression == "zlib":
            blob = zlib.decompress(blob)
        if len(blob) % 4 != 0:
            raise ValueError("Invalid tile layer byte length")
        gids = list(struct.unpack(f"<{len(blob)//4}I", blob))
        return gids
    if encoding == "":
        vals = [int(x) for x in raw.split(",") if x.strip()]
        return vals
    raise ValueError(f"Unsupported layer encoding {encoding}")


def load_tmx(tmx_path: Path) -> ET.Element:
    return ET.parse(tmx_path).getroot()


def resolve_tilesets(map_el: ET.Element, maps_dir: Path, public_url_prefix: str) -> tuple[list[dict], dict[str, tuple[int, int]]]:
    tilesets: list[dict] = []
    gid_ranges: dict[str, tuple[int, int]] = {}
    for ts_el in map_el.findall("tileset"):
        firstgid = int(ts_el.get("firstgid", "1"))
        source = ts_el.get("source")
        if source:
            tsx_path = (maps_dir / source).resolve()
            if not tsx_path.exists():
                tsx_path = (maps_dir.parent / source).resolve()
            meta = parse_tsx(tsx_path)
            lastgid = firstgid + meta["tilecount"] - 1
            gid_ranges[meta["name"]] = (firstgid, lastgid)
            tilesets.append(
                {
                    "columns": meta["columns"],
                    "firstgid": firstgid,
                    "image": f"{public_url_prefix}/{meta['image_file']}",
                    "imageheight": meta["imageheight"],
                    "imagewidth": meta["imagewidth"],
                    "margin": meta["margin"],
                    "name": meta["name"],
                    "spacing": meta["spacing"],
                    "tilecount": meta["tilecount"],
                    "tileheight": meta["tileheight"],
                    "tilewidth": meta["tilewidth"],
                }
            )
    return tilesets, gid_ranges


def tile_layer(name: str, lid: int, data: list[int], w: int, h: int) -> dict:
    return {
        "id": lid,
        "name": name,
        "type": "tilelayer",
        "visible": True,
        "opacity": 1,
        "x": 0,
        "y": 0,
        "width": w,
        "height": h,
        "data": data,
    }


def empty_layer(w: int, h: int) -> list[int]:
    return [0] * (w * h)


def merge_layer(dst: list[int], src: list[int]) -> None:
    for i, gid in enumerate(src):
        if gid:
            dst[i] = gid


def extract_water(ground: list[int], extras: list[list[int]], water_range: tuple[int, int] | None) -> list[int]:
    w, h = len(ground), 0
    if not water_range:
        return empty_layer(int(len(ground) ** 0.5), int(len(ground) ** 0.5))
    lo, hi = water_range
    size = len(ground)
    side = int(size**0.5)
    water = empty_layer(side, side)
    all_layers = [ground, *extras]
    for layer in all_layers:
        for i, gid in enumerate(layer):
            if lo <= gid <= hi:
                water[i] = gid
    return water


def strip_water_from(layer: list[int], water_range: tuple[int, int] | None) -> None:
    if not water_range:
        return
    lo, hi = water_range
    for i, gid in enumerate(layer):
        if lo <= gid <= hi:
            layer[i] = 0


def bake_collisions(map_el: ET.Element, w: int, h: int) -> list[int]:
    blocked = empty_layer(w, h)
    gid = 1
    for og in map_el.findall("objectgroup"):
        lname = (og.get("name") or "").lower()
        if "collision" not in lname:
            continue
        for obj in og.findall("object"):
            x0 = int(float(obj.get("x", "0")) // TW)
            y0 = int(float(obj.get("y", "0")) // TW)
            x1 = int((float(obj.get("x", "0")) + float(obj.get("width", "0")) + TW - 1) // TW)
            y1 = int((float(obj.get("y", "0")) + float(obj.get("height", "0")) + TW - 1) // TW)
            for ty in range(max(0, y0), min(h, y1)):
                for tx in range(max(0, x0), min(w, x1)):
                    blocked[ty * w + tx] = gid
    return blocked


def classify_layers(map_el: ET.Element, w: int, h: int) -> dict[str, list[int]]:
    ground = empty_layer(w, h)
    vegetation = empty_layer(w, h)
    above = empty_layer(w, h)
    tile_layers: list[tuple[str, list[int]]] = []
    for layer in map_el.findall("layer"):
        name = layer.get("name") or ""
        data_el = layer.find("data")
        if data_el is None:
            continue
        tile_layers.append((name, decode_layer_data(data_el, w, h)))

    if not tile_layers:
        raise ValueError("No tile layers in map")

    # First visible ground-style layer
    ground_name, ground_data = tile_layers[0]
    merge_layer(ground, ground_data)

    for name, data in tile_layers[1:]:
        lname = name.lower()
        if "above" in lname:
            merge_layer(above, data)
        elif lname.startswith("ptt"):
            continue
        else:
            merge_layer(vegetation, data)

    return {"Ground": ground, "Vegetation": vegetation, "Above Player": above}


def add_portals(slice_path: Path, tw: int) -> dict:
    slice_data = json.loads(slice_path.read_text(encoding="utf-8"))
    objects = []
    oid = 1
    rv = slice_data["portals"]["returnToVillage"]
    fe = rv["forestEdgeTile"]
    vs = rv["villageSpawnTile"]
    objects.append(
        {
            "id": oid,
            "name": "forest-to-village",
            "type": "portal",
            "x": fe["tileX"] * tw,
            "y": fe["tileY"] * tw,
            "width": tw,
            "height": tw * 2,
            "properties": [
                {"name": "targetMapId", "type": "string", "value": "village"},
                {"name": "spawnX", "type": "int", "value": vs["tileX"]},
                {"name": "spawnY", "type": "int", "value": vs["tileY"]},
                {"name": "labelVi", "type": "string", "value": rv.get("labelVi", "Về làng")},
            ],
        }
    )
    oid += 1
    if "beach" in slice_data.get("portals", {}):
        fb = slice_data["portals"]["beach"]
        feb = fb["forestEdgeTile"]
        objects.append(
            {
                "id": oid,
                "name": "forest-to-beach",
                "type": "portal",
                "x": feb["tileX"] * tw,
                "y": feb["tileY"] * tw,
                "width": tw,
                "height": tw * 2,
                "properties": [
                    {"name": "targetMapId", "type": "string", "value": "beach"},
                    {"name": "spawnX", "type": "int", "value": fb["beachSpawnTile"]["tileX"]},
                    {"name": "spawnY", "type": "int", "value": fb["beachSpawnTile"]["tileY"]},
                    {"name": "labelVi", "type": "string", "value": fb.get("labelVi", "Ra bãi biển")},
                ],
            }
        )
    return {
        "id": 20,
        "name": "Portals",
        "type": "objectgroup",
        "visible": True,
        "opacity": 1,
        "draworder": "topdown",
        "x": 0,
        "y": 0,
        "objects": objects,
    }


def convert(
    tmx_path: Path,
    slice_path: Path,
    manifest_path: Path,
    out_path: Path,
    donor_map_slug: str,
) -> None:
    maps_dir = tmx_path.parent
    map_el = load_tmx(tmx_path)
    w = int(map_el.get("width", "0"))
    h = int(map_el.get("height", "0"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    public_prefix = "/maps/donor/tuxemon/gfx/tilesets"
    tilesets, gid_ranges = resolve_tilesets(map_el, maps_dir, public_prefix)
    classified = classify_layers(map_el, w, h)
    water_range = gid_ranges.get("core_outdoor_water")
    water = extract_water(classified["Ground"], [classified["Vegetation"]], water_range)
    strip_water_from(classified["Ground"], water_range)
    strip_water_from(classified["Vegetation"], water_range)
    collision = bake_collisions(map_el, w, h)
    portals = add_portals(slice_path, TW)

    layers = [
        tile_layer("Ground", 1, classified["Ground"], w, h),
        tile_layer("Vegetation", 2, classified["Vegetation"], w, h),
        tile_layer("Water", 3, water, w, h),
        tile_layer("Above Player", 4, classified["Above Player"], w, h),
        tile_layer("Collision", 5, collision, w, h),
        portals,
    ]

    out = {
        "compressionlevel": -1,
        "height": h,
        "width": w,
        "infinite": False,
        "layers": layers,
        "nextlayerid": 21,
        "nextobjectid": 50,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.11.0",
        "tileheight": TW,
        "tilewidth": TW,
        "tilesets": tilesets,
        "type": "map",
        "version": "1.10",
        "properties": [
            {"name": "mapId", "type": "string", "value": "forest"},
            {"name": "olwDonor", "type": "string", "value": "tuxemon"},
            {"name": "olwDonorSha", "type": "string", "value": manifest.get("commit", "unknown")},
            {"name": "olwDonorMap", "type": "string", "value": donor_map_slug},
            {"name": "olwDonorRender", "type": "string", "value": "tiled-multi"},
            {
                "name": "olwDonorNote",
                "type": "string",
                "value": "Tuxemon forest transplant — native tilesets, baked object collisions",
            },
        ],
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Wrote {out_path} ({w}x{h}) from {tmx_path.name}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tmx", required=True, type=Path)
    parser.add_argument("--slice", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--slug", required=True)
    args = parser.parse_args()
    convert(args.tmx, args.slice, args.manifest, args.out, args.slug)


if __name__ == "__main__":
    main()