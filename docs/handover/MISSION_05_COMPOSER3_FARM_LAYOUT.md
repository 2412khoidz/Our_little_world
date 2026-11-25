# Mission 05 — Composer 3 farm layout contract

**Owner grid (canonical):** `6 × 4` row-major plot indices (`0..23`) — `src/shared/farming/crops.ts` (`GARDEN_COLUMNS`, `GARDEN_ROWS`).

## Plot anchor table (Composer 3 — farm map)

**Authoritative:** `src/shared/world/farmPlotContract.ts` + `docs/handover/FARM_PLOT_CONTRACT.md` (PR #12).

**Mission 05 bridge:** `src/shared/farming/farmPlayableBridge.ts` binds the 6×4 Dev LAN slice to `farm_main_0..23` (not duplicated rects).

| plotId | tileX | tileY | world px (16px tile) |
| --- | ---: | ---: | --- |
| 0–23 | see file | see file | `(tileX * 16 + 8, tileY * 16 + 8)` interact center |

Rules:

- Plots sit on **walkable** garden tiles (no sakura trunks, no porch no-place).
- One `crop_plot` interactable per index; `id` = `garden-plot-{plotId}`.
- Future 04D: add `mapId` column + second anchor table — do **not** hardcode home 16×12 for farm logic.

## Server persistence

- Table `garden_farm_worlds` (per `world_id`): `farm_seed`, `version`, `plots_jsonb`.
- RPC `farm_apply` locks `worlds` then plot row / JSON — same pattern as inventory debit.

## Visual (Composer 3 / WorldScene)

- States: `empty` (grass), `tilled` (dirt), `planted` + growth stage 0–3 from `growthProgress03`.
- No new atlas required for slice: colored overlays or existing `a-farm` / Demo E soil frames.

## Extension hooks

- `garden_plot_regions` (later): polygon or tile list if farm expands beyond 6×4.
- `layout_version` on world: invalidate cached blocked grids when furniture blocks plot tiles.