# Upstream reuse log (OLW)

Playable transplants only — no pattern-only reports.

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
git clone https://github.com/goncalojbsousa/Farming-Simulator-Cabacos.git
cd Farming-Simulator-Cabacos && git checkout 79e423d
npm ci && npm run dev   # upstream gameplay screenshot

# OLW transplant
cd our-little-world
node scripts/import-donor-cabacos.mjs
VITE_OLW_EXTENDED_WORLD=1 npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
# Garden → portal làng → explore; door house → interior shop map
```

### Screenshots

- Upstream: `/cursor/stores/self/media/donor-cabacos-upstream-screenshot.png`
- OLW after transplant: `/cursor/stores/self/media/donor-cabacos-olw-village-after.png`

### Donors evaluated (not transplanted)

| Repo | Commit | Verdict |
|------|--------|---------|
| [clear-code-projects/PyDew](https://github.com/clear-code-projects/PyDew) | `HEAD` | CC0 pygame Tiled 48px — wrong engine/scale for OLW Phaser 16px |
| [robintrepte/hollowmere.tretu.de](https://github.com/robintrepte/hollowmere.tretu.de) | `HEAD` | MIT JSON `ops`/`warps` — data reference only, no Tiled vendor |