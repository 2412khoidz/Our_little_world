# pet-shop (j4lpan/pet-shop) — reuse evidence

| Field | Value |
|-------|--------|
| Upstream | https://github.com/j4lpan/pet-shop @ `main` (cloned 2026-11-25) |
| License | MIT (Jalpan Dave, 2026) |
| Playtest | Desktop app: `npm install` + `npm run tauri dev` (Tauri). Source UI: `src/main.js` (`CAT_SVG` close-up renderer). |
| OLW branch | `cursor/nuvora-petshop-c2-302d` |

## Transplanted modules

| Donor | OLW target | Notes |
|-------|------------|-------|
| `src/main.js` — `CAT_SVG` 团子款 close-up + CSS vars | `src/donors/pet-shop-j4lpan/petShopCloseUpCatSvg.ts` | Orange tabby preset for Quýt |
| — | `src/features/pet/PetShopCloseUpCat.tsx` | Pet panel portrait; replaces upscaled Phaser portrait path for care UI |

Does **not** replace main-game Phaser pet sprite or `?donor-pet-three=1` Three.js route in this slice.