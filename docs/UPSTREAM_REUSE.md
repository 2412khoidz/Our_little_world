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
| **C3 world** | Kaetram forest patterns | Follow-up if needed beyond Tuxemon forest (§ below) |

## P0 avatar — Puny CC0 + private profile sync (recovery @ `8e4454d`)

| Field | Value |
|-------|--------|
| **Gameplay pack (one)** | Shade — [Puny Characters](https://opengameart.org/content/puny-characters) **CC0** · `public/assets/donor/cc0-puny-8d/` |
| **Private profile** | `build-private-atlas.py` copies same sheets → `private-unified/donor-cc0-puny-8d/` + `manifest.avatarGameplay` (32×32 × 24 cols — matches `punyCharacter8dSheet.ts`) |
| **Wardrobe atlas** | `avatars.png` **384×288** (Demo E idle/run/sit) — public unified + private unified **aligned**; not used for in-world 8-dir walk when Puny loads |
| **Posture policy** | Sit=hurt lie=death; hoe=stave water/affection=bow harvest/fish=throw; **slash excluded**; diagonal = native 8-dir walk |
| **Rejected** | Baked 768 procedural atlas (#53); `avatarDiagonalWalk` alpha composite; Cabacos / Farm Rai farmer for **8-dir gameplay** |
| **Reference vend** | Cabacos `characters/player/*` → `public/assets/donor/cabacos-characters/` (`npm run vendor-donor:cabacos-characters`) — Sunnyside lineage contact sheet only |

### QA (private art)

```bash
node scripts/vendor-donor-puny-avatar.mjs   # refresh CC0 sheets
npm run assets:atlas:private                # when asset-candidates present — vend Puny into private-unified
node scripts/qa-private-art-avatar.mjs      # asserts 384×288 + avatarGameplay
```

### Proof (Gate B)

- E2E: `phase-ii-diagonal-walk.spec.ts`, `phase-ii-furniture-posture.spec.ts`
- Unit: `donorPunyAvatarSheet.test.ts`, `privateArtAvatarPipeline.test.ts`

## Worker G — cozy character recovery @ `integration/donor-reuse-recovery`

| Field | Value |
|-------|--------|
| **Upstream** | Shade [Puny Characters](https://opengameart.org/content/puny-characters) **CC0** (zip vend via `scripts/vendor-donor-puny-avatar.mjs`) |
| **Chosen rig** | Puny CC0 — only true 8-dir among matrix (rejected: Cabacos/Sunnyside flipX 4-way, PyDew 4-dir, LPC/Purple Cat not vendored) |
| **2P sheets** | `character-base.png` (Mây), `mage-cyan.png` (Nắng); `mage-red.png` alt via outfitColor |
| **Custom OLW** | `donorPunyAvatarTexture.ts` action reg · `donorAvatarWardrobePreview.ts` · `AvatarModal` preset UI |
| **Evidence** | `python3 scripts/build-worker-g-avatar-evidence.py` → store `media/worker-g-avatar-*.gif`, `worker-g-cozy-rig-matrix.png` |

## Asset transplant Worker A — characters @ `8fce8af` (2026-11-25)

| Field | Value |
|-------|--------|
| **Gameplay 8-dir** | Shade [Puny Characters](https://opengameart.org/content/puny-characters) **CC0** · `src/shared/donor/punyCharacter8dSheet.ts` |
| **Cabacos reference** | [Farming-Simulator-Cabacos](https://github.com/goncalojbsousa/Farming-Simulator-Cabacos) @ `79e423d` · `public/assets/donor/cabacos-characters/` |
| **Registry** | `src/shared/assets/olwAssetRegistry.ts` · `public/assets/donor/manifest.v1.json` |
| **Mây / Nắng** | `character-base` / `mage-cyan` Puny sheets (`donorPunyTextureForConfig`) — soldiers reference-only |
| **Purple Cat** | Not vendored — Cabacos audit = flipX 4-way; Puny chosen for true diagonals |
| **Banned** | Procedural diagonal composite rows in `buildAvatarSpritesheetCanvas` / `phaserAvatarTexture` fallback |

### Commands

```bash
node scripts/vendor-wave1-farm-donors.mjs
npm run vendor-donor:cabacos-characters
node scripts/vendor-donor-puny-avatar.mjs
python3 scripts/build-asset-transplant-a-contact-sheets.py
```

### Proof

- Store: `media/asset-transplant-a-donor-cabacos-characters.png`, `media/asset-transplant-a-olw-puny-8dir.png`, `media/asset-transplant-a-diagonal-walk.gif`
- Unit: `donorCabacosCharacterSheet.test.ts`, `avatarGameplayPolicy.test.ts`, `mayNangAvatarIdentity.test.ts`
- E2E: `phase-ii-diagonal-walk.spec.ts` (unchanged — Puny native diagonals)

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

## OLWH Asset Worker D — fishing-frenzy presentation @ `f3939a3`

| Field | Value |
|-------|--------|
| **Upstream URL** | [kofkdk/fishing-frenzy](https://github.com/kofkdk/fishing-frenzy) |
| **Upstream SHA** | `f3939a3f9855104abd55fdf9f465acd52da65c79` |
| **License** | Public demo repo (verify before redistribution; sprites vendored for OLW dev presentation) |
| **Vendor** | `npm run vendor-donor:fishing-frenzy` → `public/assets/donor/fishing-frenzy/sprites/` |

### Kept vs adapted

| Kept (authority) | Tidefall FSM `tidefallFishingFsm.ts`, Dev LAN `POST /donor/fishing/*`, Meadowbrook resolve |
| Adapted (presentation) | `FishRenderer` card pattern → `ChillFishingModal` catch reveal + catalog thumbs; fisher cast/reel/idle on canvas; bobber accent |

| Upstream | OLW path |
|----------|----------|
| `src/assets/sprites/*.png` | `public/assets/donor/fishing-frenzy/sprites/` |
| `FishRenderer.js` rarity borders | `fishingFrenzyRarityUi.ts`, `CatchRevealCard` |
| `sprites.js` phase fisher | `fishingFrenzyArt.ts`, `drawFishingFrenzyScene.ts` |
| `fishing-minigame.js` (reference only) | Logic **not** ported — Tidefall bar FSM remains |

### Proof

- `tests/unit/fishingFrenzySpriteMap.test.ts`
- `npm run vendor-donor:fishing-frenzy` + `node scripts/capture-fishing-frenzy-contact-sheet.mjs`
- In-game: `data-testid` `fishing-frenzy-catch-reveal`, `tidefall-fishing-canvas` (fisher overlay)

## Full sprint Worker C — farming art transplant (2026-11-25)

| Donor | OLW path | Consumer |
|-------|----------|----------|
| Cabacos `tools/*.png`, `farming/indicators/*` | `public/assets/donor/cabacos-plantation/` | `BootScene`, `HeldItemRenderer`, `FarmPlotVisualController` |
| Cabacos `plantation/crops/*` | `public/assets/donor/cabacos-plantation/crops/` | `farmCropVisualResolver` |
| PyDew `graphics/soil_water/*`, `fruit/tomato/*` | `public/assets/donor/pydew-farming/` | `FarmPlotVisualController`, `pydewCropVisualRegistry.ts` |
| Cabacos `tools/rod.png` | `public/assets/donor/cabacos-plantation/tools/rod.png` | `rod_basic` held item (Hollowmere fishing hook) |

**Excluded:** Inventory SVG/icons as map crop sprites; duplicate farming authority.

**Proof:** `farmCropVisualResolver.test.ts`, `farmHeldToolPresentation.test.ts`, `npm run assets:farming-transplant-sheet`

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
| `Seed_shop.tmj`, `tool_shop.tmj`, `Crop_market.tmj`, `Town_hall.tmj` + interior PNGs | `public/maps/donor/cabacos/` |
| (import `OLW_MAP_RECOVERY=1`) | `shop_seed.json`, `shop_tool.json`, `shop_crop_market.json`, `shop_town_hall.json`, `shop.json` (alias seed) |
| `scripts/vendor-donor-cabacos-maps.mjs` | Copies tilemaps/graphics from `vendor/farming-simulator-cabacos-upstream/` |
| `LICENSE` | `public/maps/donor/cabacos/UPSTREAM-LICENSE.txt` |

**Not used as shop:** `Casa_player.tmj` / `house_interior_sem_fundo.png` (player house portal → `home`).

### Kept vs adapted

- **Kept:** Cabacos overworld tile layers + native `ts_map`/`ts_forest`; donor shop **image interiors** with object-layer collision; counters from donor `Interactions`.
- **Adapted:** OLW `Portals` at village shop doors; C1 economy anchors on interior `Interactables`; Phaser `olwShopRender=image` + `renderDonorCabacosImageInteriorFromMap`.

### Reproduce

```bash
node scripts/vendor-wave1-farm-donors.mjs
OLW_MAP_RECOVERY=1 npm run import-donor:cabacos
VITE_OLW_EXTENDED_WORLD=1 npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
# Garden → làng Cabacos; cửa hạt/dụng cụ/chợ/tòa thị chính → nội thất donor; nhà player → home
```

### Proof (map transplant village @ 2026-11-25)

- Store: `internal/map-transplant-village.md`
- Screenshots: `media/map-transplant-village-olw.png`, `map-transplant-village-shop-seed-olw.png`, donor refs `map-transplant-village-donor-*.png`
- Tests: `donorCabacosShopInteriors.test.ts`, `npm run test`

### Donors evaluated (not transplanted)

| Repo | Commit | Verdict |
|------|--------|---------|
| [clear-code-projects/PyDew](https://github.com/clear-code-projects/PyDew) | `HEAD` | CC0 pygame Tiled 48px — wrong engine/scale for OLW Phaser 16px |
| [robintrepte/hollowmere.tretu.de](https://github.com/robintrepte/hollowmere.tretu.de) | `HEAD` | **Transplanted:** `gull_bay` → `beach.json` (§ Hollowmere below) |
| [Intelisgod/harvest-duo](https://github.com/Intelisgod/harvest-duo) | `HEAD` | **Surveyed:** `public/maps/donor/harvest-duo/` area graph + beach pier ref → Hollowmere coast polish |
| [Tuxemon/Tuxemon](https://github.com/Tuxemon/Tuxemon) | `4e63c45b` | **Transplanted:** forest — § Tuxemon forest below |
| Kaetram | — | Collision-layer pattern reference only |

---

## Tuxemon forest (`tt_forest_route1` @ `4e63c45b`)

| Field | Value |
|-------|--------|
| **Repository** | [Tuxemon/Tuxemon](https://github.com/Tuxemon/Tuxemon) @ `4e63c45b436d372daae9f802bb5efa44232fe151` |
| **Donor maps** | `mods/tuxemon/maps/tt_forest_route1.tmx` (selected), alt `dryadsgrove.tmx` |
| **Tilesets** | `core_outdoor`, `core_outdoor_water`, `core_outdoor_nature`, `prototyping_outdoor` under `public/maps/donor/tuxemon/gfx/tilesets/` |
| **License** | GPL-3.0-or-later — `public/maps/donor/tuxemon/UPSTREAM-LICENSE.txt` |
| **OLW output** | `public/assets/maps/forest.json` — layers `Ground`, `Vegetation`, `Water`, `Above Player`, `Collision` (object bake), `Portals` |

### Reproduce

```bash
node scripts/vendor-donor-tuxemon-forest.mjs
node scripts/capture-donor-tuxemon-forest-compare.mjs
node scripts/import-donor-tuxemon-forest.mjs
```

### Proof

- Compare stills: store `media/map-transplant-forest-tuxemon-*.png`
- In-game: store `media/map-transplant-forest-olw-ingame.png`
- Unit: `tests/unit/mapRecoveryImport.test.ts` (Tuxemon layer stack)

### Excluded

- Tuxemon battle/events/NPC object layers (not OLW gameplay)
- GPL engine/runtime code (maps + tileset PNGs only)

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

## OLWH-40 — Sprout Lands home + garden (`cbb0c9f`)

| Field | Value |
|-------|--------|
| **Sprout repo** | [Maaack/Sprout-Lands-Tilemap](https://github.com/Maaack/Sprout-Lands-Tilemap) @ `47ddc077797d504b77ca96d602428e2ba3ba21f5` |
| **Farmland ref** | [Adrigarsu/farmland](https://github.com/Adrigarsu/farmland) @ `c1e08bc410466c143bf17d52caf052514d89cff3` (`large_house.tscn` interior walls) |
| **Maps** | `harvest_hill_example.tscn` → `garden.json`; Farmland house layout → `home.json` |
| **Vendor** | `public/maps/donor/sprout-lands/` |
| **Import** | `npm run import-donor:sprout-home-garden` |
| **Private profile** | `olwPrivateArtPrefer=demo-e` — `VITE_OLW_PRIVATE_ART=1` keeps Demo E atlas when `private-unified` is on disk |

### Reproduce

```bash
OLW_MAP_RECOVERY=1 npm run import-donor:sprout-home-garden
npm run test -- tests/unit/donorSproutHomeGarden.test.ts
node scripts/capture-donor-sprout-garden-donor.mjs
OUT=/cursor/stores/.../media/map-transplant-home-olw.png node scripts/capture-donor-home-garden-olw.mjs
```

Evidence: store `internal/map-transplant-home.md`, `media/map-transplant-home-*`, `media/map-transplant-garden-*`.

---

## OLWH-40 — Cabacos east-coast beach (map transplant @ `769347f`)

| Field | Value |
|-------|--------|
| **Repository** | [goncalojbsousa/Farming-Simulator-Cabacos](https://github.com/goncalojbsousa/Farming-Simulator-Cabacos) |
| **Commit** | `79e423defc12bd99327cfcc28bf7ec0085996244` |
| **Map** | `public/assets/tilemap/Cabacos_map.tmj` → vendored `public/maps/donor/cabacos/Cabacos_map.tmj` |
| **Crop** | `38,10,48,34` — east coast (sand, sea, pier, cliffs) |
| **Script** | `scripts/import-donor-cabacos-beach.mjs` → `public/assets/maps/beach.json` |
| **Replaces** | Hollowmere cozy rebuild in `import-donor:world-zones` (recovery path) |

### Reproduce

```bash
OLW_MAP_RECOVERY=1 npm run import-donor:cabacos-beach
node scripts/capture-donor-cabacos-beach-donor.mjs
OUT=media/map-transplant-beach-olw.png node scripts/capture-donor-beach-olw.mjs
```

Evidence: project store `internal/map-transplant-beach.md`, `media/map-transplant-beach-*.png`.

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

### Recovery @ `8e4454d` (PetCareScene default)

| Upstream path | OLW path |
|---------------|----------|
| `selectFace` + blink loops | `PetCarePortraitRig` → `evt:pet-care-j4lpan-portrait` → `PetCareJ4lpanPortrait` |
| — | `petCareJ4lpanPortraitFlag.ts` — default on; `?pet-care-procedural=1` for legacy painter |

**Proof:** `petCareJ4lpanBridge.test.ts` · `petShopCareFace.test.ts` · `data-testid="pet-care-j4lpan-portrait"`

## Map transplant — PyDew Valley main farm (`integration/donor-reuse-recovery`)

| Field | Value |
|-------|--------|
| **Repository** | [artemn0va/pydew-valley](https://github.com/artemn0va/pydew-valley) @ `5b33bfda76d54866c648e7e54eff4e4e8a1eec8a` |
| **Source** | `data/map.tmx`, `data/Tilesets/*.tsx`, `graphics/**` |
| **OLW paths** | `public/maps/donor/pydew-valley/`, `public/assets/maps/farm.json` |
| **Scale** | Native **64×64** tiles; `getMapTilePixelSize('farm')` |
| **Plots** | **184** stable IDs via `Farmable` layer (`farmPlotContract` v1.0.2) — no `OLW_ContractSoil` |
| **Import** | `npm run import-donor:pydew-farm` |
| **Proof** | `tests/unit/donorFarmBeachSketch.test.ts`, `farmPlotContract.test.ts`, `scripts/capture-donor-pydew-farm.mjs` |

**Optional (deferred):** [hollowmere](https://github.com/robintrepte/hollowmere.tretu.de) greenhouse — Godot JSON scale mismatch vs Phaser 64px farm; no splice in this PR.

## Wave 2 — NUVORA inventory depth (stack `6d0e7fd`+)

| Field | Value |
|-------|--------|
| **Upstream** | [DarTGTtfd/NUVORA](https://github.com/DarTGTtfd/NUVORA) `public/ui.js` click/desk/craft |
| **Authority** | `inventoryHotbarAdapter.ts`, `farmShipping`, donor workshop Dev LAN RPC |
| **OLW targets** | `nuvoraSlotInteraction.ts`, `NuvoraInteractiveTray.tsx`, `NuvoraCraftDesk.tsx`, `FarmEconomyPanel` shipping desk |
| **Proof** | `tests/unit/nuvoraSlotInteraction.test.ts`, `nuvoraPresentationBridge.test.ts` |
| **Excluded** | `public/hand.js` (Three.js first-person) |

## Worker F — Cabacos inventory UI + shop/HUD (`integration/donor-reuse-recovery`)

| Field | Value |
|-------|--------|
| **Cabacos** | `src/game/ui/{ShopRow,GameHud,SeedShopPanel}.ts` @ `79e423d` — layout reference only |
| **Assets** | `npm run import-donor:cabacos-ui-inventory` → `public/assets/donor/cabacos-ui/` (`uiInventoryRegistry.ts`) |
| **Kept NUVORA** | `NuvoraInteractiveTray`, `GameHotbar` `--nuvora`, wooden desk modals |
| **Catalog images** | `CatalogSkuIcon` → `CatalogPropsIcon` / props-manifest (not text labels) on shop rows + ship grid |
| **Wallet HUD** | `WorldClockHud` coin pill when `backend.farm` active |
| **Proof** | `tests/unit/catalogSkuIcon.test.ts`, `farmEconomyShopCatalog.test.ts` |
