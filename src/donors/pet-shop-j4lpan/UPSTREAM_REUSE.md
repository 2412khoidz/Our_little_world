# pet-shop (j4lpan/pet-shop) — reuse evidence

| Field | Value |
|-------|--------|
| Upstream | https://github.com/j4lpan/pet-shop @ `77f8b59a33c93881b44e15209b310b199a423d2a` (2026-11-25) |
| License | MIT (Jalpan Dave, 2026) |
| Playtest | Desktop app: `npm install` + `npm run tauri dev` (Tauri). Source UI: `src/main.js` (`CAT_SVG` close-up renderer). |
| OLW branch | `cursor/petshop-care-anim-86c2` → `integration/donor-reuse-preview` |
| Clone refresh | `node scripts/vendor-pet-shop-upstream.mjs` → `vendor/pet-shop-j4lpan-upstream/` (local only) |

## Transplanted modules

| Donor | OLW target | Notes |
|-------|------------|-------|
| `src/main.js` — `CAT_SVG` 团子款 close-up + CSS vars | `src/donors/pet-shop-j4lpan/petShopCloseUpCatSvg.ts` | Orange tabby preset for Quýt; eye/mouth variant groups |
| `src/main.js` — `selectFace()` mood/mode mapping | `src/shared/donor/pet-shop-j4lpan/petShopCareFace.ts` | OLW `PetMood` + care flash (`pet`/`feed`/`water`) |
| `src/main.js` — `triggerBlink` / idle yawn / `triggerTailWag` timing | `src/shared/donor/pet-shop-j4lpan/petShopCareAnimLoop.ts` + `PetShopCloseUpCat.tsx` | Blink, ear twitch, yawn, boosted tail wag on care |
| `src/styles.css` — `data-eyes` / `data-mouth` | `src/features/pet/petShopCloseUpCat.css` | CSS-driven face swap |
| — | `src/features/pet/PetShopCloseUpCat.tsx` | Pet panel portrait; replaces upscaled Phaser portrait path for care UI |
| — | `src/features/pets/PetPanel.tsx` | Wires care buttons → flash window for face loop |

Does **not** replace main-game Phaser pet sprite or `?donor-pet-three=1` Three.js route in this slice.  
Does **not** port tray walking / multi-pet chase / Tauri shell.