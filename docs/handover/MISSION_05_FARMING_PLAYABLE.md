# Mission 05 — Co-op farming vertical slice (checkpoint)

**Branch:** `cursor/mission-05-farming-slice-d77e`  
**Scope:** Playable Dev LAN loop in main game (garden map); SQL wallet/farm parity **in progress**.

## Playtest (owner, 2 clients — Dev LAN)

1. `npm run dev` on Windows; two browsers (or iPhone + PC) same Wi-Fi URL.
2. Sign in as **Mây** / **Nắng** (local presets).
3. Ra **Ngoài vườn** (cửa cottage).
4. Lần đầu **mở bản đồ Vườn** (tab Vườn hoặc cửa cottage): app gọi GET `/farm` và server cấp **cuốc**, **bình tưới**, **bình nước**, **5× seed_wheat**, **50 xu** (không cần mở cửa hàng trước).
5. Thanh hotbar (1–8): chọn **cuốc** → đứng cạnh luống → **J** cuốc.
6. Chọn **hạt lúa mì** → **J** gieo.
7. Chọn **bình tưới** → **J** tưới (Dev LAN tăng tốc sinh trưởng ×120 để vòng lặp <1 phút).
8. **J** thu hoạch (tay không hoặc không giữ dụng cụ).
9. Ghé **Gian hạt Bác Hai** (gần hộp thư) → **J** mở cửa hàng → bán lúa (mọi cấp chất lượng), mua hạt.

## Composer 2 (hotbar / held item)

- Extend `inventoryHotbarAdapter` icons for `tool_*` / `seed_*` (presentational).
- `interactionResolver` `crop_plot` actions: `till_plot`, `plant_crop`, `water_crop`, `harvest_crop`.
- Do not mutate inventory client-side.

## Composer 3 (layout)

See `MISSION_05_COMPOSER3_FARM_LAYOUT.md` — plot anchors `gardenPlotLayout.ts`.

## Research ports (MIT)

- `webfarmville` — blooms/orders patterns (not copied).
- `harvest-hollow` — integer ledger / day index (existing `ledgerMath.ts`).

## Verification

- `npm run test` (farming + till)
- Manual: 2-client loop above
- **Pending:** `supabase` farm_apply RPC, SQL regression, Playwright `farming-co-op.spec.ts`