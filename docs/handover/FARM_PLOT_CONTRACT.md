# Farm plot integration contract (Composer 1 ↔ Composer 3)

**Contract version:** `1.0.1` — plot anchors unchanged; `village-to-shop` door tile **(38,13)** aligned to shop door art  
**Owner:** Composer 3 (PR #12) — map anchors & presentation only.  
**Consumer:** Composer 1 (PR #14) — planting, growth, shipping RPC; **do not** duplicate rects in economy code.

Breaking anchor changes → bump `FARM_PLOT_CONTRACT_VERSION` in `farmPlotContract.ts`, regenerate JSON, comment on **#12 and #14**.

## Source files

| File | Purpose |
| --- | --- |
| `src/shared/world/farmPlotContract.ts` | Plot regions, tile gids, named interactable anchors |
| `src/shared/world/farmPlotContract.v1.json` | Machine-readable export (`buildFarmPlotContractExport()`) |
| `public/assets/maps/farm.json` | Authoritative collision + ground art (regen via script) |
| `scripts/generate-world-zone-maps.mjs` | Generator — **Interactables** object layer must match contract tiles |

Regenerate after map edits:

```bash
node scripts/generate-world-zone-maps.mjs
node scripts/export-farm-plot-contract.mjs
```

## Map identity

- **MapId:** `farm`
- **Size:** 64×56 tiles (16px) — see `getParsedTiledWorld('farm')`
- **Default spawn:** tile `(55, 20)` — east path to village portal

## Tiled layer ids (`farm.json`)

| Layer | Id | Notes |
| --- | --- | --- |
| Ground | 1 | Soil gids **53** (dry), **54** (wet visual cue) |
| Paths | 2 | Cobble 22–23 |
| Water | 3 | Pond gid **51** (animated in Phaser) |
| Buildings | 4 | Barn / storehouse north |
| Vegetation | 5 | Fences, trees |
| Collision | 6 | `gid > 0` blocks movement |
| Portals | object id **10** | `farm-to-village` |
| Interactables | object id **11** | Shipping bin, pond, barn door |

## Plot regions (walkable soil)

Row-major **`plotAnchorId`** = `` `${regionId}_${localIndex}` `` (0-based within region).

| Region id | Label | Origin (tile) | Grid | Plot count |
| --- | --- | --- | --- | --- |
| `farm_main` | Ruộng chính | (16, 10) | 12×10 | 120 |
| `farm_annex` | Ruộng phụ | (40, 28) | 8×8 | 64 |

Helpers:

- `enumerateFarmPlotAnchors()` — all `{ anchorId, tileX, tileY }`
- `farmPlotTileFromAnchor(region, localIndex)`
- `isFarmSoilTile(x, y)`

**Acceptance:** ≥ **160** walkable soil tiles inside the two rects (Vitest `tiledWorldContract` + `farmPlotContract`).

Composer 1 should bind simulation state to `plotAnchorId` (not garden `0..23` unless you explicitly bridge garden ↔ farm).

## World interactables (J key / HUD)

| `anchorId` | Tiled object `name` | Kind | Tile | Composer 1 hook |
| --- | --- | --- | --- | --- |
| `farm_shipping_bin` | `farm_shipping_bin` | `shipping_bin` | (7, 7) | Open shipping UI → `shared/economy/shippingBin` RPC |
| `farm_pond_water` | `farm_pond_water` | `water_source` | (52, 11) | Refill water tool; wet soil gid **54** as visual sync optional |
| `farm_barn_door` | `farm_barn_door` | `door` | (9, 9) | Future barn interior / livestock (V0.3+) |

Parsed at runtime: `parseTiledWorldMap` → `interactableSpawns`.  
HUD wiring: `buildTiledWorldInteractableTargets('farm')` (called from `WorldScene` interaction frame).

**V0.2 presentation:** `shipping_bin` / plots resolve to `inspect_prop` notices — no wallet or inventory changes in PR #12.

## Shop door (village, not farm)

| Constant | Value |
| --- | --- |
| Portal object id | `village-to-shop` |
| Door tiles | (38, 14) on `village` |
| Target map | `shop` |

Shop economy lives with Composer 1; world only provides portal + `shop` interior map.

## Visual / farming loop alignment

- **Dry soil:** gid 53 — plantable footprint  
- **Wet soil:** gid 54 — use after water action (client art only until Composer 1 drives state)  
- **Pond:** gid 51 — blocking water; adjacent shore tiles use 52  

Do **not** edit `src/shared/farming/*` or economy RPC from this track.

## Tests

- `tests/unit/farmPlotContract.test.ts` — anchor count & JSON sync  
- `tests/unit/tiledWorldContract.test.ts` — connectivity & ≥160 soil tiles  

## Integration conflicts

PR #12 touches `WorldScene.ts` (`buildTiledWorldInteractableTargets` on `evt:interaction-frame`) and `interactionTypes.ts` (`shipping_bin`). Rebase before #14 if hotbar/interaction routers change.