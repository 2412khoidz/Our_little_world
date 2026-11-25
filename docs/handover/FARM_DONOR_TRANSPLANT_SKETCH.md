# Farm donor transplant (Cabacos) — Phase II sketch

**Status:** Sketch landed (`npm run import-donor:cabacos-farm`)  
**Contract:** `farmPlotContract.v1.json` — **184** anchors (`farm_main` 120 + `farm_annex` 64) unchanged.

## Current sketch (v0)

- `farm.json` keeps **cozy** `tileset-cozy` + procedural layers.
- Map properties: `olwDonor=cabacos`, `olwDonorSketch=farm-v0`.
- Light Cabacos-inspired path/hedge pass outside plot rectangles.
- Sign interactable `farm_donor_cabacos_sign` for playtest wayfinding.

## Full transplant (next)

1. **Render path:** Extend `renderDonorCabacosMap.ts` for `map-farm` when `olwDonor=cabacos` (reuse `ts_map.png` like village).
2. **Layout source:** Composite Cabacos TMJ layers `farm` / `farm2` / `farm3` into 64×56 OLW footprint OR split player farm as dedicated TMJ export @ `79e423d`.
3. **Plot graft:** Run `paintFarmPlotRegionsFromContract` after any ground bake so gids **53/54** stay on anchor tiles.
4. **Collision:** Portals + `FARM_WORLD_INTERACTABLES` anchors fixed in contract — never move without bumping `FARM_PLOT_CONTRACT_VERSION`.
5. **Alt donor:** PyDew CC0 (`clear-code-projects/PyDew`) surveyed as fallback scale reference — see `public/maps/donor/pydew/README.md`.

## Commands

```bash
npm run import-donor:cabacos-farm
npm run test -- tests/unit/donorFarmBeachSketch.test.ts
```