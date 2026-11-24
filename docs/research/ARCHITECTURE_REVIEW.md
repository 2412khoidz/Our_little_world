# Đánh giá Kiến trúc & Rủi ro Mở rộng (`ARCHITECTURE_REVIEW`)

*Đối chiếu codebase V0.1 (`src/`, `supabase/`) với các quyết định kiến trúc dài hạn **K1–K8** và dữ liệu thực tế từ Phase 1.*

---

## 1. Xác nhận 8 Quyết định Kiến trúc Mục tiêu (K1–K8)

| Mã | Quyết định | Kết quả kiểm chứng Phase 1 | Điều kiện / Bổ sung |
|---|---|---|---|
| **K1** | Giữ codebase hiện tại + tách domain thuần TS vào `src/shared/<domain>/` | Giữ ranh giới đang dùng. Tái sử dụng các module thuần đã xác minh. | Tuân thủ nghiêm: `src/shared/` 0 import React/DOM/Phaser/Supabase. |
| **K2** | Server-authoritative Economy trên Supabase Free: Postgres `SECURITY DEFINER` RPC + `worlds FOR UPDATE` + `economy_ledger` append-only + `idempotency_key` | Dự kiến đủ với Postgres Free và hai người, chờ SQL/race test thật. Học `harvest-hollow` tách `earn`/`grant`/`spend`/`refund` + số nguyên. | Sinh SQL catalog seed & simulator config từ **1 nguồn TS duy nhất** để không lệch giá. |
| **K3** | Pet 1 trạng thái chung: slow decay = thuần `(snapshot, serverNow)` có clamp; hành vi tức thời = **bầu Sim Host client** qua Realtime Presence phát `PetActionIntent` | MVP đọc snapshot. V0.2.3 mới thử đồng bộ hoạt ảnh bằng host foreground có heartbeat theo user/session và failover khi stale. | Thưởng/tương tác thật (cho ăn, tặng đồ) vẫn phải đi qua RPC server để tránh client giả mạo. |
| **K4** | Mini-game: `MinigameDefinition` thuần TS; Turn-based qua `minigame_sessions` (jsonb+version); Realtime co-op qua Sim Host + RPC thưởng idempotent | **Khả thi & gọn.** Tái sử dụng cùng mô hình Presence/Broadcast của K3 và idempotency V0.1. | Server xác minh kết quả hoặc chưa bật thưởng. Trần thưởng và khóa replay cần đi kèm xác minh kết quả. |
| **K5** | Đưa Inventory tối thiểu (chưa tiền tệ) lên **V0.1.5** | **Giải quyết triệt để nghẽn dependency:** Hộp thư tặng quà & đồ ăn pet cơ bản miễn phí ở V0.1.5 chạy sạch trước khi có Economy V0.2.0. | Đảm bảo schema `inventory_items` ở V0.1.5 khớp chuẩn `owner_scope` là `shared` hoặc `user:<uuid>` để V0.2.0 dùng lại luôn. |
| **K6** | Dev Console chỉ trong `import.meta.env.DEV`; RPC `dev_*` nằm ở `supabase/dev-migrations/` tách riêng cho project Supabase Test | **Phù hợp với Supabase Free:** Xác minh Supabase Free cho **2 active projects** (1 Prod sạch + 1 Test có `dev-migrations/` + `worlds.is_test`). | Mở rộng `scripts/verify-prod-guard.mjs` cấm thêm mọi marker Dev Console/Cheat/PetDebugger lọt vào `dist/`. |
| **K7** | Không LLM/Vector DB trước V1.0; giữ `AgentBrain` nhỏ gọn | **Hợp lý với ngân sách 0₫**; Utility AI (kiểu `Petivolution`) + scripted NPC đủ hay mà zero API cost. | Không lưu embedding hay gọi LLM trong vòng lặp game chính. |
| **K8** | Static HTTPS, ưu tiên **Cloudflare Pages Free** (PD-02); Supabase Free; Cinema là ngoại lệ duy nhất cần laptop host | Static requests miễn phí theo tài liệu nhà cung cấp, rà giới hạn file và scope PWA lúc deploy. | Xem mục 2 bên dưới để xử lý quota Realtime & Supabase pause. |

---

## 2. Rủi ro Kiến trúc Phải Xử lý Trước / Trong Quá trình Mở rộng

1. **Giới hạn 2,000,000 Realtime messages/tháng & Auto-Pause 7 ngày của Supabase Free (Mức độ: Cao):**
   - *Rủi ro:* `src/shared/realtime.ts` hiện cho phép gửi tọa độ ở **10 Hz**. Hai kết nối cùng đi 1h/ngày × 30 ngày ở 8 Hz vẫn tính khoảng 3,456 triệu tin. Nhiều thiết bị tăng số lượt nhận. Project Free có thể pause khi ít truy vấn trong một tuần. [Định mức và cách tính](OPEN_SOURCE_RESEARCH.md#4-hạ-tầng-free-tier-cho-hai-người-đối-chiếu-25112026)
   - *Giải pháp:* (a) Hạ TX movement xuống **`8 Hz` (`125ms`) + delta threshold >= 2px**, tắt TX ngay khi đứng yên, ở modal hoặc tab ẩn; (b) `PetActionIntent` giữ tần suất thấp (`<= 0.3 Hz`, chỉ phát khi đổi ý định hành động); (c) Hiển thị lỗi kết nối dễ hiểu, retry có giới hạn và hướng dẫn chủ dự án kiểm tra/Resume từ dashboard khi đã xác nhận pause.
2. **Phaser 4 (`4.2.1`) trên iPhone Safari Thật & Kích thước Chunk (Mức độ: Cao):**
   - *Rủi ro:* Chưa kiểm chứng WebGL context của Phaser `4.2.1` trên iPhone 16 Pro Max Safari thật (khóa màn hình, low-power mode). Chunk `createGame-*.js` hiện đã là `1,388.16 kB` (`363.65 kB` gzip) và `precache` `1973.23 KiB`.
   - *Giải pháp:* Ghi reproduce trên thiết bị thật và review trước khi thử fallback Phaser 3.90.0 ở nhánh riêng (ADR-002), giữ `App -> lazy import()` ở `GameViewport.tsx`; **cấm** import thư viện nặng (`hls.js`, `mediabunny`, mini-game mới) vào entry bundle.
3. **Phình to `WorldBackend` & Lệch Parity `DevLanBackend ↔ SupabaseBackend` (Mức độ: Trung bình):**
   - *Rủi ro:* Hiện `WorldBackend` có 15 method; nếu nhồi thêm Farming, Economy, Pet, Study, Journal, Cinema sẽ thành interface khổng lồ khó test và dễ làm `DevLanBackend` bị lệch hành vi so với Postgres RPC.
   - *Giải pháp:* Tổ chức thành domain modules gắn sau `WorldBackend` (`inventory?`, `economy?`, `pet?`, `study?`, `cinema?`) và viết contract test Dev LAN, test mapping Supabase, SQL assertions trên Test trước nghiệm thu. LocalPreview báo không hỗ trợ nếu mốc đó chưa có adapter.
4. **Tính Deterministic & Chống Bug RNG / Race Điều kiện (Bài học từ `harvest-hollow` M0 review):**
   - *Rủi ro:* Nếu client tự gửi seed/ID để quay quà/cá/hoa, 1 dòng code lệch có thể gây bug lặp thưởng; nếu mutation chỉnh array trong JSONB trực tiếp có thể tạo lỗ/lệch state giữa 2 máy.
   - *Giải pháp:* Mọi thưởng/giá/RNG mở hộp, câu cá, đơn hàng tính ở Postgres RPC (hoặc seed/nonce từ server); luôn lưu inventory dưới dạng **dòng định danh (tabular rows `UNIQUE(world_id, owner_scope, item_sku)`)** thay vì JSON blob lớn; giữ `FOR UPDATE` + `mutation_idempotency`.
5. **Cinema V0.4 VPN-less Transport: Chưa Có Kết quả Đo Băng thông Thực tế (Mức độ: Cao — Cần Spike `S0-5b`):**
   - *Thực tế:* Cloudflare giới hạn video qua CDN. Funnel HLS và WebRTC là hai ứng viên, throughput, auth và chi phí chờ S0-5b. [Đối chiếu provider](OPEN_SOURCE_RESEARCH.md#3-nghiên-cứu-riêng-cinema-transport-vs-state-sync-xác-minh-25112026)
   - *Giải pháp:* Tách riêng Spike `S0-5b` (kiểm tra Tailscale Funnel windowed HLS vs WebRTC trên laptop Windows thật → iPhone 16 Pro Max thật qua mạng di động 4G) trước khi cam kết kiến trúc Cinema V0.4.

6. **Auth email lúc deploy:** Đăng ký xác nhận và reset qua SMTP tích hợp chỉ gửi cho địa chỉ thuộc team. PD-08 ưu tiên tạo sẵn hai tài khoản, tắt đăng ký công khai và kiểm tra quy trình khôi phục có xác minh quyền sở hữu. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
