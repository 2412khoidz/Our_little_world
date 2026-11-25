# Upstream reuse index

Integration branch `integration/donor-reuse-preview` owns provenance entries here.

Each transplant documents: donor ref, license/terms check, files touched, gameplay proof (capture or E2E), and scope excluded.

**Policy:** playable vendored code and assets — not pattern-only reports. Mission merge stack (#10–#14) waits for owner direction unless a slice is explicitly transplanted into this branch.

## Merged slices (rollup)

| ID | Donor / PR | Summary | Proof |
|----|------------|---------|-------|
| **C2-pet** | [SawyerHood/nintendogs-threejs](https://github.com/SawyerHood/nintendogs-threejs) @ `43d231c` · PR **#20** @ `e0a8741` | Phaser pet atlas stride fix + DEV `?donor-pet-three=1` Three.js care slice (cat-orange billboard) | `src/donors/nintendogs-threejs-43d231c/UPSTREAM_REUSE.md` · store `media/vqg-pet-care-c2.png` |
| **C3-world** | [Farming-Simulator-Cabacos](https://github.com/goncalojbsousa/Farming-Simulator-Cabacos) @ `79e423d` · PR **#21** @ `ad156cc` | Cabacos overworld + Casa_player → `village.json` / `shop.json` | § Cabacos below · store `media/donor-cabacos-olw-village-after.png` |
| **C3-beach** | [Hollowmere](https://github.com/robintrepte/hollowmere.tretu.de) `gull_bay` | Authored beach → `beach.json` + Cabacos edge portals | § Hollowmere below · `donor-hollowmere-beach-olw.png` |
| **C1-economy** | webfarmville `c420bc2` + harvest-hollow `9b23e1a` + chill-fishing MIT · PR **#22** @ `db7e290` | Dev LAN mill queue + pond reel → shared inventory | [`docs/donor/UPSTREAM_REUSE.md`](donor/UPSTREAM_REUSE.md) · `tests/e2e/donor-economy-two-client.spec.ts` |

## Pending (composer / open PR)

| Track | Branch / PR | Notes |
|-------|-------------|-------|
| C3 | Demo E gid remap on Cabacos, props inventory (#19) | Not on donor spine yet |

## Frozen acceptance (do not move)

`integration/playtest-all` @ `c01d291f709bc639eba378999482d904c1d8d0c3`

---

## Cabacos village + player house (P0 donor · Mission C3)

| Field | Value |
|-------|--------|
| **Repository** | [goncalojbsousa/Farming-Simulator-Cabacos](https://github.com/goncalojbsousa/Farming-Simulator-Cabacos) |
| **Commit** | [`79e423defc12bd99327cfcc28bf7ec0085996244`](https://github.com/goncalojbsousa/Farming-Simulator-Cabacos/tree/79e423defc12bd99327cfcc28bf7ec0085996244) |
| **License** | MIT (`UPSTREAM-LICENSE.txt` in vendor tree) |
| **Why chosen** | Phaser 3 + Tiled `.tmj`, full overworld + interior doors; closest Phaser-native donor vs PyDew (pygame 48px) and Hollowmere (Godot JSON ops). |

### Source → destination

| Upstream file | OLW path |
|---------------|----------|
| `public/assets/tilemap/Cabacos_map.tmj` | `public/maps/donor/cabacos/Cabacos_map.tmj` (canonical) |
| (import script) | `public/assets/maps/village.json` |
| `ts_map.png`, `ts_forest.png` | `public/maps/donor/cabacos/` |
| `Casa_player.tmj` + `house_interior_sem_fundo.png` | `public/maps/donor/cabacos/` |
| (import script) | `public/assets/maps/shop.json` (collision + portal; image via `renderDonorCabacosShopInterior`) |
| `LICENSE` | `public/maps/donor/cabacos/UPSTREAM-LICENSE.txt` |

### Kept vs adapted

- **Kept:** Tile layers, `Collision`, door `Interactions` geometry; Sunnyside-style tileset PNGs vendored for dev attribution (not remapped to Demo E atlas in this slice — follow-up remap in `scripts/import-donor-cabacos.mjs`).
- **Adapted:** OLW `Portals` / `Interactables` object groups; garden/farm warp targets; Phaser 4 loader keys `donor-cabacos-*`; interior drawn as image layer + baked object collision grid.

### Reproduce

```bash
node scripts/import-donor-cabacos.mjs
VITE_OLW_EXTENDED_WORLD=1 npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
# Garden → portal làng → explore; door house → interior shop map
```

### Donors evaluated (not transplanted)

| Repo | Commit | Verdict |
|------|--------|---------|
| [clear-code-projects/PyDew](https://github.com/clear-code-projects/PyDew) | `HEAD` | CC0 pygame Tiled 48px — wrong engine/scale for OLW Phaser 16px |
| [robintrepte/hollowmere.tretu.de](https://github.com/robintrepte/hollowmere.tretu.de) | `HEAD` | **Transplanted:** `gull_bay` → `beach.json` (§ Hollowmere below) |
| [Intelisgod/harvest-duo](https://github.com/Intelisgod/harvest-duo) | `HEAD` | Pygame `build_beach()` — layout reference; pygame scale mismatch |
| [Tuxemon/Tuxemon](https://github.com/Tuxemon/Tuxemon) | — | GPL — pattern only, no asset vendoring |
| Kaetram | — | Not cloned this slice — reserved for forest candidate |

---

## Hollowmere Gull Bay beach (Mission C3 step 2)

| Field | Value |
|-------|--------|
| **Repository** | [robintrepte/hollowmere.tretu.de](https://github.com/robintrepte/hollowmere.tretu.de) |
| **Map** | `game/data/maps/gull_bay.json` → vendored `public/maps/donor/hollowmere/gull_bay.json` |
| **License** | MIT (`public/maps/donor/hollowmere/UPSTREAM-LICENSE.txt`) |
| **Why chosen** | Authored 48×34 beach with pier/water/ops — clearer gameplay than procedural `beach.json`; pairs with Cabacos village via west warp ↔ `village-to-beach` / `beach-to-village`. |

### Source → destination

| Upstream | OLW path |
|----------|----------|
| `gull_bay.json` | `public/maps/donor/hollowmere/gull_bay.json` |
| (import script) | `public/assets/maps/beach.json` (tileset-cozy / Demo E–compatible gids) |
| Cabacos village patch | `village.json` portal `village-to-beach` → spawn beach `(1,16)` |

### Kept vs adapted

- **Kept:** `ops` rect/pier/scatter/clearpath, building footprint, west `open` warp to town analogue.
- **Adapted:** Godot tile names → cozy atlas gids; ferry/sign objects not wired (OLW interactables later); target map `village` (Cabacos) not Hollowmere `town`.

### Reproduce

```bash
npm run import-donor:world-zones
VITE_OLW_EXTENDED_WORLD=1 npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
# Village east exit → Gull Bay; west shore → về làng Cabacos
```