# Farm donor transplant (Cabacos) — Phase II sketch

**Status:** Deep reuse v1 (`farm-v1-deep`, `npm run import-donor:cabacos-farm`)  
**Contract:** `farmPlotContract.v1.json` — **184** anchors (`farm_main` 120 + `farm_annex` 64) unchanged.

## Deep reuse v1 (shipped)

- `farm.json` crops Cabacos overworld `@ (2,2)` **64×56** with layers `land`…`decoration_03`.
- `OLW_ContractSoil` overlay (cozy gids) preserves **184** anchors; OLW `Collision` + portals/interactables unchanged.
- `WorldScene` uses `renderDonorCabacosMapLayers` when `olwDonor=cabacos` (binds `ts_map`, `ts_forest`, `tileset-cozy`).

## Next

1. Tune crop offset / scale for owner Cabacos bar parity (may need dedicated farm TMJ export).
2. Donor collision merge vs Cabacos `Collision` crop.
3. PyDew fallback — `public/maps/donor/pydew/README.md`.

## Commands

```bash
npm run import-donor:cabacos-farm
npm run test -- tests/unit/donorFarmBeachSketch.test.ts
```