"""Inventory, SHA-256 deduplicate, copy, and extract local art asset candidates.

Reads all files from the browser sandbox download folder, computes SHA-256 digests,
skips exact duplicates and redundant engine-specific projects, copies unique archives
into `asset-candidates/zips/`, extracts clean sprite trees (excluding `__MACOSX` and
engine project duplicates) into `asset-candidates/extracted/`, and writes a full
JSON inventory to `asset-candidates/INVENTORY.json`.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CANDIDATES_DIR = REPO_ROOT / "asset-candidates"
DOWNLOADS_DIR = Path(os.environ.get("OLW_ART_DOWNLOADS_DIR") or CANDIDATES_DIR / "downloads")
ZIPS_DIR = CANDIDATES_DIR / "zips"
EXTRACTED_DIR = CANDIDATES_DIR / "extracted"

# Exact normalized mapping from source archive name to clean kebab-case target dir
ARCHIVE_TARGETS: dict[str, dict[str, object]] = {
    "Cozy Farm Free.zip": {
        "id": "cozy-farm-free",
        "packName": "Cozy Farm (Free)",
        "author": "shubibubi",
        "skipReason": None,
    },
    "free_version.zip": {
        "id": "cozy-farm-free-dup",
        "packName": "Cozy Farm (Free Duplicate)",
        "author": "shubibubi",
        "skipReason": "Exact SHA-256 duplicate of Cozy Farm Free.zip",
    },
    "Cozy Interior Free.zip": {
        "id": "cozy-interior-free",
        "packName": "Cozy Interior (Free)",
        "author": "shubibubi",
        "skipReason": None,
    },
    "char free.zip": {
        "id": "cozy-people-free",
        "packName": "Cozy People (Free)",
        "author": "shubibubi",
        "skipReason": None,
    },
    "Sprout Lands - Sprites - Basic pack.zip": {
        "id": "sprout-lands-basic",
        "packName": "Sprout Lands - Sprites - Basic Pack",
        "author": "Cup Nooble",
        "skipReason": None,
    },
    "Sprout_Lands_-_Sprites_-_Basic_pack.zip": {
        "id": "sprout-lands-basic-dup",
        "packName": "Sprout Lands - Sprites - Basic Pack (Duplicate)",
        "author": "Cup Nooble",
        "skipReason": "Exact SHA-256 duplicate of Sprout Lands - Sprites - Basic pack.zip",
    },
    "Sprout Lands - UI Pack - Basic pack.zip": {
        "id": "sprout-lands-ui",
        "packName": "Sprout Lands - UI Pack - Basic Pack",
        "author": "Cup Nooble",
        "skipReason": None,
    },
    "Sprout Sorry pack.zip": {
        "id": "sprout-lands-sorry",
        "packName": "Sprout Lands - Sorry Pack (Free Early Access)",
        "author": "Cup Nooble",
        "skipReason": None,
    },
    "Cozy_Lands_Basic_v1.25.zip": {
        "id": "cozy-lands-basic",
        "packName": "Cozy Lands - Basic Pack v1.25",
        "author": "Amo-QAQ",
        "skipReason": None,
    },
    "Cute_Fantasy_Free.zip": {
        "id": "cute-fantasy-free",
        "packName": "Cute Fantasy RPG (Free)",
        "author": "Kenmi",
        "skipReason": None,
    },
    "Modern_Interiors_Free_v2.2.zip": {
        "id": "modern-interiors-free",
        "packName": "Modern Interiors (Free v2.2)",
        "author": "LimeZu",
        "skipReason": None,
    },
    "Sunnyside_World_ASSET_PACK_V2.1.zip": {
        "id": "sunnyside-world",
        "packName": "Sunnyside World Asset Pack v2.1",
        "author": "Daniel Diggle",
        "skipReason": None,
    },
    "Sunnyside_World_ARCHIVED_ASSETS.zip": {
        "id": "sunnyside-world-archived",
        "packName": "Sunnyside World Archived Assets",
        "author": "Daniel Diggle",
        "skipReason": "Superseded by Sunnyside_World_ASSET_PACK_V2.1.zip",
    },
    "sunnyside_world_chatacter_anim_human_v1.0.aseprite": {
        "id": "sunnyside-human-aseprite",
        "packName": "Sunnyside Human Animation Source (.aseprite)",
        "author": "Daniel Diggle",
        "skipReason": "Source .aseprite file (copy to zips/, no extraction needed)",
    },
    "Ninja_Adventure_-_Asset_Pack.zip": {
        "id": "ninja-adventure",
        "packName": "Ninja Adventure Asset Pack",
        "author": "Pixel-boy & AAA",
        "skipReason": None,
    },
    "Godot_Project_V4.zip": {
        "id": "ninja-adventure-godot-v4",
        "packName": "Ninja Adventure Godot V4 Project",
        "author": "Pixel-boy & AAA",
        "skipReason": "Godot example project duplicating Ninja_Adventure_-_Asset_Pack.zip",
    },
    "free_pets_pack_frakassets.zip": {
        "id": "free-pets-pack",
        "packName": "Free Pets Pack",
        "author": "Frakassets",
        "skipReason": None,
    },
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def should_extract_member(pack_id: str, member_name: str) -> bool:
    if "__MACOSX" in member_name or member_name.endswith(".DS_Store") or member_name.endswith("/"):
        return False
    norm = member_name.replace("\\", "/")
    if pack_id == "sunnyside-world":
        # Keep Sunnyside_World_Assets/ and any root docs; skip Sunnyside_World_Gamemaker/ UUID duplicates
        if "Sunnyside_World_Gamemaker/" in norm:
            return False
        return (
            "Sunnyside_World_Assets/" in norm
            or norm.lower().endswith((".txt", ".md", "license"))
        )
    if pack_id == "ninja-adventure":
        # Extract tilesets, actors, items, UI, and license/readme docs; skip heavy audio/FX for visual demo
        top_prefixes = (
            "Ninja Adventure - Asset Pack/Backgrounds/",
            "Ninja Adventure - Asset Pack/Actor/",
            "Ninja Adventure - Asset Pack/Items/",
            "Ninja Adventure - Asset Pack/Ui/",
        )
        return norm.startswith(top_prefixes) or norm.lower().endswith((".txt", ".md", "license"))
    if pack_id == "free-pets-pack":
        # Keep 16px & 32px top-down sprites + Aseprite JSON + license/readme
        return (
            "_16px_top-down" in norm
            or "_32px_top-down" in norm
            or norm.lower().endswith((".txt", ".md"))
        )
    if pack_id == "modern-interiors-free":
        # Skip RPGMAKERMV / 32x32 / 48x48 upscales to keep extracted tree clean, keep 16x16 & Characters_free & docs
        if "/32x32/" in norm or "/48x48/" in norm or "RPGMAKERMV" in norm:
            return False
        return True
    return True


def strip_common_root(pack_id: str, norm_path: str) -> str:
    prefixes = {
        "sunnyside-world": "Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Assets/",
        "ninja-adventure": "Ninja Adventure - Asset Pack/",
        "free-pets-pack": "free_pets_pack_frakassets/",
        "modern-interiors-free": "Modern tiles_Free/",
        "cozy-lands-basic": "Cozy Lands - Asset Pack - Basic pack/",
        "cute-fantasy-free": "Cute_Fantasy_Free/",
        "sprout-lands-basic": "Sprout Lands - Sprites - Basic pack/",
        "sprout-lands-ui": "Sprout Lands - UI Pack - Basic pack/",
        "sprout-lands-sorry": "Sprout Sorry pack/",
    }
    pref = prefixes.get(pack_id)
    if pref and norm_path.startswith(pref):
        return norm_path[len(pref) :]
    return norm_path


def main() -> None:
    if not DOWNLOADS_DIR.exists():
        raise FileNotFoundError(f"Downloads directory not found: {DOWNLOADS_DIR}")

    ZIPS_DIR.mkdir(parents=True, exist_ok=True)
    if EXTRACTED_DIR.exists():
        shutil.rmtree(EXTRACTED_DIR)
    EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)

    seen_hashes: dict[str, str] = {}
    records: list[dict[str, object]] = []

    files = sorted(DOWNLOADS_DIR.iterdir(), key=lambda p: p.name.lower())
    for src in files:
        if not src.is_file():
            continue
        digest = sha256_file(src)
        dup_of = seen_hashes.get(digest)
        if dup_of is None:
            seen_hashes[digest] = src.name

        meta = ARCHIVE_TARGETS.get(src.name, {})
        pack_id = str(meta.get("id") or src.stem.lower().replace(" ", "-"))
        skip_reason = meta.get("skipReason")
        if dup_of and not skip_reason:
            skip_reason = f"Exact SHA-256 duplicate of {dup_of}"

        record: dict[str, object] = {
            "fileName": src.name,
            "sizeBytes": src.stat().st_size,
            "sha256": digest,
            "duplicateOf": dup_of,
            "packId": pack_id,
            "packName": meta.get("packName", src.stem),
            "author": meta.get("author", "Unknown"),
            "status": "skipped" if skip_reason else "extracted",
            "skipReason": skip_reason,
            "extractedPngCount": 0,
            "totalZipPngCount": 0,
            "docs": [],
        }

        is_zip = src.suffix.lower() == ".zip"
        if is_zip:
            with zipfile.ZipFile(src, "r") as zf:
                infos = [
                    i
                    for i in zf.infolist()
                    if not i.is_dir()
                    and "__MACOSX" not in i.filename
                    and not i.filename.endswith(".DS_Store")
                ]
                png_infos = [i for i in infos if i.filename.lower().endswith(".png")]
                doc_infos = [
                    i
                    for i in infos
                    if i.filename.lower().endswith((".txt", ".md", "license"))
                ]
                record["totalZipPngCount"] = len(png_infos)
                docs_summary: list[dict[str, str]] = []
                for d in doc_infos[:8]:
                    text = zf.read(d).decode("utf-8", errors="replace").strip()
                    docs_summary.append({"path": d.filename, "excerpt": text[:1500]})
                record["docs"] = docs_summary

                if skip_reason is None:
                    dest_zip = ZIPS_DIR / src.name
                    shutil.copy2(src, dest_zip)
                    out_dir = EXTRACTED_DIR / pack_id
                    out_dir.mkdir(parents=True, exist_ok=True)
                    extracted_pngs = 0
                    for info in infos:
                        if not should_extract_member(pack_id, info.filename):
                            continue
                        rel = strip_common_root(pack_id, info.filename.replace("\\", "/"))
                        # Protect against path traversal in zip entries
                        target_path = (out_dir / rel).resolve()
                        if not str(target_path).startswith(str(out_dir.resolve())):
                            continue
                        target_path.parent.mkdir(parents=True, exist_ok=True)
                        with zf.open(info) as zsrc, target_path.open("wb") as fout:
                            shutil.copyfileobj(zsrc, fout)
                        if rel.lower().endswith(".png"):
                            extracted_pngs += 1
                    record["extractedPngCount"] = extracted_pngs
        else:
            # Copy source .aseprite into zips/ for documentation completeness
            if src.name == "sunnyside_world_chatacter_anim_human_v1.0.aseprite":
                shutil.copy2(src, ZIPS_DIR / src.name)
                record["status"] = "copied_reference_only"

        records.append(record)
        print(
            f"[{record['status']:21s}] {src.name:48s} "
            f"{record['sizeBytes']:10,d} B | pngs={record['extractedPngCount']}/{record['totalZipPngCount']}"
        )

    inventory = {
        "downloadsDir": str(DOWNLOADS_DIR),
        "totalFilesFound": len(records),
        "uniqueHashes": len(seen_hashes),
        "duplicateFiles": [r["fileName"] for r in records if r["duplicateOf"]],
        "records": records,
    }
    inv_path = CANDIDATES_DIR / "INVENTORY.json"
    inv_path.write_text(json.dumps(inventory, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote inventory to {inv_path}")


if __name__ == "__main__":
    main()
