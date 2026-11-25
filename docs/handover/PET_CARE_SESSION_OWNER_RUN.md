# Pet care — owner long session (5–10 phút)

**Branch:** `cursor/mission-05b-pet-hotbar-depth-36fd` (from #13) · base PR [#13](https://github.com/2412khoidz/Our_little_world/pull/13)

## Prerequisites

- Dev LAN: `npm run dev` (hoặc `preview` sau build)
- Hai browser profile optional (sync test)
- `?living-pet=1` chỉ khi test overworld brain — **hand-feed authority** dùng Dev LAN backend bình thường

## Automated (7 phút + trace)

```bash
npm run build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run preview &
npm run test:e2e:pet-care-long
# hoặc soak 5 phút: OLW_ACCEPTANCE_LONG=1 OLW_SOAK_MINUTES=5 npm run test:e2e -- tests/e2e/pet-care-session-acceptance.spec.ts
```

Diversity telemetry (DEV `?living-pet=1`): `window.__OLW_PET_CARE_SOAK` + `evt:pet-care-autonomy-cue` — e2e ghi `pet-care-soak-summary.json` (artifacts + worker `media/`).

Artifacts:

- `/opt/cursor/artifacts/pet-care-session-summary.json`
- `/opt/cursor/artifacts/pet-care-session-final.png`
- Playwright `test-results/**/trace.zip`

## Manual checklist

1. Nhà → nhận mèo → **J** vào care (hoặc HUD Chăm sóc)
2. Vuốt canvas (đầu/cằm/lưng) — bubble khác nhau
3. HUD: Gọi · Chải · Rót nước · Quan sát
4. Hotbar **1–8** + **J**: cá/hạt (authority trừ kho), len/hộp
5. Im lặng ~30s — autonomy (zzz, gọi, từ chối)
6. ESC thoát → vào lại — một `PetSnapshot`

## Hotbar ↔ farm (contract)

Cùng `buildHotbarSlotsFromInventory` + `executeMainGameContextAction`.  
Farm tools (Composer 1): thêm SKU vào `FARM_TOOL_HOTBAR_SKUS` trong `src/shared/interaction/hotbarContract.ts` — xem `PET_CARE_HOTBAR_CONTRACT.md`.