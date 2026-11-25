# PyDew Valley (artemn0va/pydew-valley) — Worker E environment FX

| Field | Value |
| --- | --- |
| Upstream | https://github.com/artemn0va/pydew-valley |
| Vend path | `public/maps/donor/pydew-valley/` |
| SHA | `public/maps/donor/pydew-valley/UPSTREAM_SHA.txt` |
| License | CC0 (`UPSTREAM-LICENSE.txt`) |

## OLW usage (recovery slice E)

| Upstream asset | OLW consumer |
| --- | --- |
| `graphics/rain/drops/*.png` | `WorldLightingOverlay` drizzle particles (`pydewRainPresentation.ts`) |
| `graphics/water/*.png`, environment tilesets | Farm map `farm.json` via `renderDonorPydewMap.ts` (Worker C/D maps) |
| `graphics/soil_water/*` | Farm plot visuals (farming worker; not duplicated here) |

Rain particle density and fall speed follow `WorldClockPresentation.weather` (`drizzle` + `intensity`), not local RNG.