# Tuxemon forest donor (GPL-3.0)

Upstream: [Tuxemon/Tuxemon](https://github.com/Tuxemon/Tuxemon) — maps `dryadsgrove.tmx`, `tt_forest_route1.tmx`.

```bash
# Refresh vendored assets (requires upstream clone at /tmp/tuxemon-upstream or TUXEMON_UPSTREAM)
node scripts/vendor-donor-tuxemon-forest.mjs

# Visual compare donor maps → store media/*.png
node scripts/capture-donor-tuxemon-forest-compare.mjs

# Apply chosen map to public/assets/maps/forest.json (default: tt_forest_route1)
node scripts/import-donor-tuxemon-forest.mjs
# OLW_TUXEMON_FOREST_MAP=dryadsgrove node scripts/import-donor-tuxemon-forest.mjs
```

Selected map recorded in `SELECTED_MAP.json` after compare script runs.