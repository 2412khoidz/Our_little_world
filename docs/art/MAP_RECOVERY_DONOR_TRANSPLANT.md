# Map recovery — real donor transplants @ `8e4454d`

Owner directive: **ship authored donor maps**, not cozy overlays, procedural glade filler, Hollowmere scatter noise, or `Casa_player` shop bitmap.

## Checkpoint

| Item | Value |
|------|--------|
| Git | `integration/donor-reuse-preview` @ `8e4454d` |
| Slice id | `map-recovery-v1-8e4454d` |
| Branch | `cursor/map-recovery-real-donors-351a` |
| Enable imports | `npm run import-donor:recovery-world` (`OLW_MAP_RECOVERY=1`) |

## Zone contract

| Map | Owner donor | Remove | Target |
|-----|-------------|--------|--------|
| **farm** | Cabacos `Cabacos_map.tmj` crop | `OLW_ContractSoil` cozy overlay | Native `farm`/`farm3` tiles; **184 plot IDs** unchanged (`farmPlotContract.v1.json`) |
| **forest** | PyDew `data/maps/main.tmx` (pending vend) | `pydewGladeTilemap` procedural | Real TMX transplant + portal slice |
| **beach** | Hollowmere `gull_bay.json` | `scatter` ops + post `polishBeachGrid` | rects / pier / buildings only |
| **shop** | Cabacos overworld `seeds_market` slice | `Casa_player.tmj` + `house_interior_sem_fundo.png` | Tiled `shop.json` `olwShopRender=tiled` |

## Runtime

- `renderDonorCabacosMapLayers` skips `OLW_ContractSoil`.
- `FarmPlotVisualController` paints contract gids only when soil layer exists; tilled/planted uses Cabacos crop art.
- `WorldScene` uses Cabacos tilemap for shop when `olwShopRender=tiled`.

## Plot ID migration

**Allowed:** anchor tiles in `farmPlotContract.v1.json` may be re-aligned to Cabacos soil tiles in a follow-up import; **IDs `farm_main_*` / `farm_annex_*` stay stable** for economy + RPC.

## Follow-up

1. Vendor `public/maps/donor/pydew/main.tmx` + `import-donor:pydew-tmx.mjs`.
2. Owner VQG: farm native soil, Gull Bay without scatter palms, shop seeds market interior, forest after TMX.
3. Merge to `integration/preview-art-recovery` when green.

Store copy: `/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/docs/map-recovery-donor-transplant-8e4454d.md`