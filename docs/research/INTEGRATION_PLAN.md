# Kế hoạch Tích hợp Mã nguồn mở Không Phá vỡ V0.1 (`INTEGRATION_PLAN`)

*Mục tiêu: Gắn các module tái sử dụng (Class A/B) và thiết kế mới (Class C) mà giữ nguyên toàn bộ hợp đồng V0.1 đã chạy ổn định.*

---

## 1. Chiến lược Giữ Nền tảng & Mở rộng Theo Lớp

### A. Tầng `src/shared/` (Zero Dependencies)
- Tổ chức theo thư mục miền mới song song với file V0.1 (`avatar.ts`, `catalog.ts`, `maps.ts`, `placement.ts`, `realtime.ts`, `cinemaSync.ts`):
  - `src/shared/rng.ts` — `mulberry32` + helper deterministic hash (port MIT từ `webfarmville`).
  - `src/shared/time/` — `farmCalendar.ts` (port MIT từ `harvest-hollow`: `dayIndex`, `localHour`, `seasonKey` theo IANA timezone `Asia/Ho_Chi_Minh`).
  - `src/shared/study/` — `pomodoro.ts` (port MIT từ `cocoworking`, giữ nguyên `endsAt` theo server time).
  - `src/shared/inventory/` & `src/shared/economy/` — catalog, ledger math integer basis points (`mulBp`), recipes (tham chiếu `harvest-hollow` / `webfarmville`).
  - `src/shared/pet/` — needs catch-up + Utility AI thuần (tham chiếu `Ourlittlepet` + `Petivolution`).
  - `src/shared/minigames/` — `MinigameDefinition` registry & reducers thuần.
- **Lợi ích:** Toàn bộ mã port chạy trực tiếp trong Vitest dưới Node mà không cần Phaser hay Supabase mock nặng nề.

### B. Bảo vệ `WorldBackend`, `SupabaseBackend` & `DevLanBackend`
- **Không nhồi vào 1 interface khổng lồ:** Giữ nguyên mọi method V0.1 trong `WorldBackend` (`src/lib/backend/types.ts`). Từ V0.1.5+, mở rộng theo **domain sub-interfaces tùy chọn hoặc composed facade**:
  - `world.inventory?: InventoryBackend`
  - `world.pet?: PetBackend`
  - `world.study?: StudyBackend`
  - `world.economy?: EconomyBackend`
  - `world.minigames?: MinigameBackend`
- **Giữ hợp đồng adapter:** Dev LAN chạy chung fixture domain. Supabase có test mapping và SQL assertions trên Test. LocalPreview thực thi cùng fixture nếu hỗ trợ feature, hoặc báo không hỗ trợ. Mã lỗi tới UI được dịch tiếng Việt.
- **Bảo toàn RLS & Migrations:** Không sửa hồi tố 3 file migration V0.1 đã khóa (`20261124000100..0300`); chỉ thêm các file migration tuần tự mới theo milestone (`2026xxxx_v015_...`). Giữ nguyên quy tắc `AGENTS.md`: không chạy `ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY`.

### C. Bảo toàn `ASSET_PIPELINE.md` & `Phaser 4`
- **Cảnh báo cứng:** Toàn bộ code Phaser 3 từ `webfarmville`, `cocoworking`, `Farming-Simulator-Cabacos`, `Petivolution`, `nadagotchi` **cấm copy thẳng** vào `src/game/` (Phaser 4.2.1 dùng cấu trúc `RenderNode` và pixel rounding khác Phaser 3).
- Chỉ truyền kết quả tính toán từ `src/shared/` qua `gameEventBus` xuống `WorldScene` / hệ thống vẽ Phaser 4 của dự án; giữ nguyên Demo E Semantic Asset IDs và luật Y-depth.

### D. Bảo toàn PWA & Kích thước Bundle
- Giữ `runtimeCaching: []` trong `vite.config.ts` và không precache `/spike/` hay media lớn.
- Mọi module nặng chỉ dùng ở một số màn hình (như `hls.js` / `mediabunny` cho Cinema V0.4, hoặc từng mini-game canvas lớn) **bắt buộc dùng dynamic `import()`** để không làm phình initial shell cho iPhone Safari.

---

## 2. Nghĩa vụ Ghi nhận Bản quyền (`Attribution & Notice Plan`)

1. Tại thời điểm thực sự port bất kỳ file MIT/ISC nào ở Bảng `REUSE_MATRIX.md` vào `src/` hoặc `scripts/`:
   - Tạo file `THIRD_PARTY_NOTICES.md` ở root repository, trích nguyên văn copyright & MIT/Apache text kèm URL repo và SHA nguồn.
   - Đặt 1 dòng header ngắn đầu file port: `// Adapted from <repo>@<sha> (<License>) — see THIRD_PARTY_NOTICES.md`.
2. **Tuyệt đối KHÔNG port hoặc sao chép:**
   - Hình ảnh/âm thanh từ `cocoworking`, `harvest-hollow`, `sunflower-land`, `Cabacos`.
   - Code từ `sunflower-land` (`UNLICENSED`), `pairnest` (`AGPL-3.0-only`), `Ourlittlepet` (chưa có license), `focus-town` (chưa có license).
   - Code từ `Local-Watch-Party` (`PolyForm Noncommercial 1.0.0`): chỉ học cơ chế vận hành HLS theo cửa sổ (`windowed segments`) và Web Audio ducking rồi tự viết hoàn toàn sạch trong milestone V0.4.

---

## 3. Lộ trình Tích hợp An toàn Trước Giao Task cho DeepSeek

1. **Bước 1 (V0.1 Art Integration):** Áp dụng Demo E theo [ASSET_PIPELINE.md](../art/ASSET_PIPELINE.md) — **không động vào open source logic ngoài**.
2. **Bước 2 (V0.1.5 Domain Pure Port):** Port `pomodoro.ts` (`cocoworking`) và viết `petNeeds` + Inventory tối thiểu. Thêm RNG khi use case đầu tiên cần, ở Economy Simulator. Chạy Vitest 100% trước khi đụng UI hay SQL.
3. **Bước 3 (V0.2.0 Economy & Sim):** Dùng pattern economy-model và balance-sim: catalog đầu tiên, rồi simulator và SQL RPC trên cùng config, hội tụ ở test giá/chuyển trạng thái.
4. **Bước 4 (V0.4 Cinema):** Chỉ lấy `ClockSync` (suspend fix) từ `harvest-hollow` + kiểm nghiệm `S0-5b` (Tailscale Funnel Windowed HLS vs WebRTC `captureStream`) trước khi ghép vào UI TV phòng khách.
