# World exploration capture (Mission 04D) — 5–10 min

**PR #12** — dùng cho owner nghiệm thu hoặc agent ghi hình. **Tắt** collision debug (`C` / `?collision-debug=`).

**Entry:** `http://localhost:5173/?extended-world=1` → QuickNav **Làng**.

| # | Phút ~ | Hành động | Bằng chứng |
|---|--------|-----------|------------|
| 1 | 0–1 | Dạo quảng trường cobble; J với **Cô Lan** / **Ông Minh** | NPC dialogue screenshot |
| 2 | 1–2 | Hồ tây + 4 kiểu nhà phía bắc (porch / hẹp / chuẩn / rộng); J cửa nhà dân (preview V0.3) | `village-square` + nhà đa dạng |
| 3 | 2–3 | **Bác Hai** → cửa shop **(38,13)** → interior gỗ → ra làng | `shop-interior` |
| 4 | 3–5 | Tây → **farm**: ruộng chính + **annex** (40,28), thùng gom, ao | `farm-barn`, annex trong frame |
| 5 | 5–7 | Đông → **rừng**: lối ngách tới glade + nhánh bắc; tiếp **biển** (cát, cầu gỗ, nước) | `forest nook` + `mission04d-beach-shore-postfix.png` |
| 6 | 7–9 | Nam → **garden** → **home** (rug/bếp peek) → về làng | home interior flash |
| 7 | 9–10 | Farm ↔ village ↔ shop — không màn trống; 2 tab nếu có DEV LAN | two-client optional |

**Artifacts:** lưu PNG/MP4 dưới `/opt/cursor/artifacts/` hoặc PR comment.

**Contract:** `farmPlotContract` **1.0.1** — không bump trừ khi đổi plot/shop anchor tiles.

**Milestone:** Phase 6 world quality **chưa Done** tại PR checkpoint — tiếp autotile, nhà vào trong, điều hướng portal UX.