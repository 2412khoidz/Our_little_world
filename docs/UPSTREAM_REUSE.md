# Upstream reuse index

Integration branch `integration/donor-reuse-preview` owns provenance entries here.

Each transplant documents: donor ref, license/terms check, files touched, gameplay proof (capture or E2E), and scope excluded.

**Policy:** playable vendored code and assets — not pattern-only reports. Mission merge stack (#10–#14) waits for owner direction unless a slice is explicitly transplanted into this branch.

## Merged slices (rollup)

| ID | Donor / PR | Summary | Proof |
|----|------------|---------|-------|
| **C2-pet** | [SawyerHood/nintendogs-threejs](https://github.com/SawyerHood/nintendogs-threejs) @ `43d231c` · PR **#20** @ `e0a8741` | Phaser pet atlas stride fix + DEV `?donor-pet-three=1` Three.js care slice (cat-orange billboard) | `src/donors/nintendogs-threejs-43d231c/UPSTREAM_REUSE.md` · store `media/vqg-pet-care-c2.png` |
| **C2-pet-multi** | memu-cat + Petivolution utility + nadagotchi/hackipups eval · checkpoint `7474eb0` | Autonomy on `PhysicalCarePetState`; licensed rig **or** 48px illustration (`petCareIllustrationAtlasEnabled`); Three.js opt-in only; **2P shared session** (toggle removed) | `docs/phase-ii/PET_CARE_2D_PLAN.md` · memu/petivolution UPSTREAM · Phase II HUD: 8-slot hotbar + corner ♥ dock |
| **C3-world** | [Farming-Simulator-Cabacos](https://github.com/goncalojbsousa/Farming-Simulator-Cabacos) @ `79e423d` · PR **#21** @ `ad156cc` | Cabacos overworld + Casa_player → `village.json` / `shop.json` | § Cabacos below · store `media/donor-cabacos-olw-village-after.png` |
| **C3-beach** | Hollowmere `gull_bay` · PR **#23** @ `b1aa9e4` | Authored beach → `beach.json` + village edge portals | § Hollowmere below · `donor-hollowmere-beach-olw.png` |
| **C3-decorate** | cocoworking `947494f` + cozy-space `7b8cb1e` | Interior-only decorate (catalog, snap, rotate, persist); beach nav sheet | [`docs/donor/UPSTREAM_REUSE.md`](donor/UPSTREAM_REUSE.md) · `tests/unit/decorate*.test.ts` |
| **C1-economy** | webfarmville + harvest-hollow + chill-fishing + canvas-games · PR **#22** + **#25** @ `769c54f` | Mill + Hollow bakery/coop + pond + **east_stream** tension reel | [`docs/donor/UPSTREAM_REUSE.md`](donor/UPSTREAM_REUSE.md) · `tests/e2e/donor-economy-two-client.spec.ts` |
| **OLWH-27** | Demo E props manifest · PR **#19** @ `80e118d` | Inventory + hotbar `CatalogPropsIcon` (CSS atlas slices) | `scripts/vqg-inventory-modal-capture.mjs` · unit: `catalogSkuPropsIcon.test.ts` |
| **W3-clock** | [nhungcute/game-xay-nha](https://github.com/nhungcute/game-xay-nha) @ `ab2ad7f7` (AI Farm) | Day/night curve + HUD clock + Phaser overlay; farm growth authority unchanged | `src/donors/ai-farm-xay-nha/UPSTREAM_REUSE.md` · `tests/unit/aiFarmDayCyclePresentation.test.ts` · `tests/unit/worldClockPresentation.test.ts` |

## Pending (composer / open PR)

| Track | Branch / PR | Notes |
|-------|-------------|-------|
| **C3 art** | Cabacos → Demo E tile gid remap | Cabacos still draws **Sunnyside donor PNGs**; `import-donor-cabacos.mjs` has no Demo E remap yet — VQG / ART_DIRECTION mismatch until C3 follow-up |
| **C3 world** | Kaetram forest, Tuxemon (GPL skip), PyDew scale | Next donors per multi-donor sprint |

## P0 avatar rig — 8-dir walk / sit / lie (2026-11-25)

| Field | Value |
|-------|--------|
| **Donor audit (human sheet)** | Cabacos @ `79e423d`: `characters/player/walk/base_walk_strip8.png` — 96×64 flip-X, **not** 8-dir. Farm Rai Larn Na @ `2bbb65c`: `farmer.webp` 144×144 @ 48px — farm overworld only, no sit/lie/tool-on-body. |
| **OLW decision** | Baked **CC0 unified** `avatars.png` rows 0–7 (idle / walk / sit / 4× diagonal walk / lie); removed runtime `avatarDiagonalWalk.ts` alpha composite. |
| **Tool carry** | No donor body tool-use sheet @ 16×32; `HeldItemRenderer` keeps props/world-props icons + walk bob; harvest tools from Cabacos stay hotbar icons only. |
| **Preview nav** | `extendedWorldDevFlag.ts` — preview build ignores stale `localStorage` opt-out (DEV lab banner still opts out). |

### Proof

- `scripts/vendor-wave1-farm-donors.mjs` (fresh clone in `vendor/*-upstream/`)
- `node scripts/build-unified-atlas.mjs` → `public/assets/unified/avatars.png` 384×768
- E2E: `phase-ii-diagonal-walk.spec.ts`, `phase-ii-furniture-posture.spec.ts` (Chromium desktop)
- Captures: `test-results/vqg-phase-ii-diagonal-walk.png`, `vqg-phase-ii-furniture-sit.png`, `vqg-phase-ii-furniture-bed.png`

## Wave 1 C1 — farm presentation + donor clone area (2026-11-25)

| Field | Value |
|-------|--------|
| **Farm Rai Larn Na** | [kensfpon/Farm-Rai-Larn-Na](https://github.com/kensfpon/Farm-Rai-Larn-Na) @ `2bbb65c8c7bcafeae0f70623ea57a2c86b4bb9ba` |
| **Cabacos (farming loop)** | [goncalojbsousa/Farming-Simulator-Cabacos](https://github.com/goncalojbsousa/Farming-Simulator-Cabacos) @ `79e423defc12bd99327cfcc28bf7ec0085996244` |
| **Clone refresh** | `node scripts/vendor-wave1-farm-donors.mjs` → `vendor/farm-rai-larn-na-upstream/`, `vendor/farming-simulator-cabacos-upstream/` (local; not shipped in production bundle) |

### Source → OLW (this slice)

| Upstream | OLW path | Kept |
|----------|----------|------|
| Farm Rai `src/rules/actions.ts` (hoe → tilled) | `src/shared/donor/farm-rai-2bbb65c/tillSoilAuthoritySlice.ts` | Till **presentation** intent only; authority stays `src/shared/farming/crops.ts` |
| Cabacos `FarmingSystem.ts` soil image + `ItemData.ts` wheat spritesheet | `public/assets/donor/cabacos-plantation/soil.png`, `crops/wheat.png` | `src/game/farming/FarmPlotVisualController.ts`, `src/shared/donor/cabacos-79e423d/cropGrowthSpriteStage.ts` |
| Cabacos `stageGrowthDays` mental model | `src/shared/farming/farmGrowthClock.ts` (`cabacosGrowthStageForPermille`) | Maps `growthPermille` → frame 0–3; no duplicate crop state |

### Excluded

- Farm Rai DOM/HTML estate UI, save format, stamina economy.
- Cabacos day/night energy, full `FarmingSystem` persistence, non-wheat crops (until catalog alignment).

### Proof

- `tests/unit/farmGrowthClock.test.ts` — `timeScale` matches harvest vs snapshot.
- `tests/unit/donorDevLanSession.test.ts` — donor workshop client sends `x-dev-user-id`.
- `tests/unit/farmPlotInspect.test.ts` — inspect ETA copy.
- Dev LAN: workshop modal + farm plot inspect on `farm` map.

## Wave 2 IF — crop variety, hoe FX, Tidefall catalog in FSM UI

| Field | Value |
|-------|--------|
| **Base** | `integration/donor-reuse-preview` @ `6d0e7fd` |
| **Cabacos SHA** | `79e423defc12bd99327cfcc28bf7ec0085996244` |
| **Tidefall SHA** | `6a77169d198757413ccd92d310bf655d2f177506` |

| Upstream | OLW path |
|----------|----------|
| `plantation/crops/*.png` (5 SKUs) | `public/assets/donor/cabacos-plantation/crops/` |
| `tools/hoe.png` | `public/assets/donor/cabacos-plantation/tools/hoe.png` |
| SKU registry | `src/shared/donor/cabacos-79e423d/cropVisualRegistry.ts` |
| Till swing | `FarmTillToolFx.ts`, `HeldItemRenderer.ts` |
| `fish.json` | `scripts/vendor-tidefall-fish-catalog.mjs`, `tidefallFishCatalog.v1.json` |
| FSM UI list | `ChillFishingModal.tsx` (`tidefall-fish-catalog`, `tidefall-active-fish`) |

**Proof:** `cabacosCropVisual.test.ts`, `tidefallFishCatalog.test.ts`

## Wave 3–4 IF — Rai Larna seed shop UI + farm tool swings @ 8e4454d

| Field | Value |
|-------|--------|
| **Base** | `integration/donor-reuse-preview` @ `8e4454d` |
| **Farm Rai SHA** | `2bbb65c8c7bcafeae0f70623ea57a2c86b4bb9ba` |
| **Cabacos SHA** | `79e423defc12bd99327cfcc28bf7ec0085996244` |

| Upstream | OLW path |
|----------|----------|
| `presentation/shops.ts` (trader merchant) | `farmRaiShopPresentation.ts`, `FarmEconomyPanel.tsx`, `farmRaiShopSkin.css` |
| `public/art/trader.webp`, `docs/readme/icons/crop-*.webp` | `scripts/vendor-farm-rai-shop-art.mjs` → `public/assets/donor/farm-rai-larn-na/shop/` |
| Farm map NPC pin | `FarmRaiShopNpcMarker.ts` (trader portrait @ seed-shop tile) |
| Cabacos `tools/watering_can.png`, `sickle.png` | `FarmToolSwingFx.ts` (tween swings — **no** donor swing spritesheets; only `idle`/`walk` strips in Cabacos) |

**Proof:** `farmRaiShopPresentation.test.ts`, `farmToolSwingFx.test.ts`

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
| [Intelisgod/harvest-duo](https://github.com/Intelisgod/harvest-duo) | `HEAD` | **Surveyed:** `public/maps/donor/harvest-duo/` area graph + beach pier ref → Hollowmere coast polish |
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

---

## PREV-50 — pet-shop care face + idle loops (stack `6d0e7fd`)

| Field | Value |
|-------|--------|
| **Upstream URL** | [j4lpan/pet-shop](https://github.com/j4lpan/pet-shop) |
| **Upstream SHA** | `77f8b59a33c93881b44e15209b310b199a423d2a` (MIT Jalpan Dave 2026) |
| **License / terms** | MIT |
| **OLW branch** | `cursor/petshop-care-anim-86c2` on `integration/donor-reuse-preview` |

### Source → destination

| Upstream path | OLW path |
|---------------|----------|
| `src/main.js` `selectFace()` | `src/shared/donor/pet-shop-j4lpan/petShopCareFace.ts` |
| `src/main.js` blink / idle yawn / tail wag | `src/shared/donor/pet-shop-j4lpan/petShopCareAnimLoop.ts` |
| `CAT_SVG` eye/mouth groups + `styles.css` data attrs | `petShopCloseUpCatSvg.ts`, `petShopCloseUpCat.css`, `PetShopCloseUpCat.tsx` |
| Care button flash | `src/features/pets/PetPanel.tsx` |
| Evidence | `src/donors/pet-shop-j4lpan/UPSTREAM_REUSE.md` · `scripts/vendor-pet-shop-upstream.mjs` |

### Gameplay

| | Mô tả |
|-|--------|
| **Before** | Pet panel SVG close-up (PR #47) — static tail sway, single eye/mouth. |
| **After** | Chăm sóc: vuốt ve / đổ bát / rót nước → mắt–miệng pet-shop + đuôi vẫy mạnh; nháy mắt / ngáp / giật tai idle; tâm trạng OLW map sang biểu cảm. |
| **Proof** | `tests/unit/petShopCareFace.test.ts` · `petShopCareAnimLoop.test.ts` |

```bash
npm run test -- tests/unit/petShopCareFace.test.ts tests/unit/petShopCareAnimLoop.test.ts
```

**Kept / adapted:** Presentation-only; vitals/mood authority unchanged.  
**Excluded:** Desktop tray locomotion, multi-pet AI, Tauri shell.

## Wave 2 — NUVORA inventory depth (stack `6d0e7fd`+)

| Field | Value |
|-------|--------|
| **Upstream** | [DarTGTtfd/NUVORA](https://github.com/DarTGTtfd/NUVORA) `public/ui.js` click/desk/craft |
| **Authority** | `inventoryHotbarAdapter.ts`, `farmShipping`, donor workshop Dev LAN RPC |
| **OLW targets** | `nuvoraSlotInteraction.ts`, `NuvoraInteractiveTray.tsx`, `NuvoraCraftDesk.tsx`, `FarmEconomyPanel` shipping desk |
| **Proof** | `tests/unit/nuvoraSlotInteraction.test.ts`, `nuvoraPresentationBridge.test.ts` |
| **Excluded** | `public/hand.js` (Three.js first-person) |
