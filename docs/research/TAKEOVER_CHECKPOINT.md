# Checkpoint tiếp quản Master Research

Ngày tiếp quản: 25/11/2026. Phạm vi là nghiên cứu và đặc tả. [Checkpoint của Carbon](CHECKPOINT.md) giữ lại lịch sử trước bàn giao.

| Phase | Trạng thái khi tiếp quản | Bằng chứng đã khôi phục | Việc còn lại khi kiểm kê |
|---|---|---|---|
| 0 · Context và kế hoạch | NEEDS VERIFICATION | Git `main` chưa có commit, index trống, 141 tệp untracked. Manifest Antigravity khớp 774/774 mục lúc bắt đầu. Hai bản bàn giao, kế hoạch gốc của sản phẩm và checkpoint còn đọc được. | Tìm bản nguyên văn `MASTER_TASK.md` trong artifact liên quan và ghi rõ giới hạn nếu thiếu. |
| 1 · Mã nguồn mở và Cinema | NEEDS VERIFICATION | Đủ 18 checkout trong `antigravity/scratch/olw-refs`, SHA khớp `repo-inventory.json`. Đã đọc trực tiếp các module dẫn đầu tại các revision đó. | Sửa suy luận quota, giới hạn nhà cung cấp và điều kiện thử WAN. |
| 2 · Gameplay và progression | COMPLETE | 5 đặc tả trong `docs/gameplay/`, gồm loop, tiến trình nhà, mini-game, NPC và tương tác đôi. | Đồng bộ nhãn mốc đề xuất với roadmap. |
| 3 · Economy | NEEDS VERIFICATION | 6 đặc tả trong `docs/economy/`, có thiết kế simulator và `scratch/econ-poc/econ-check.mjs`. | Rà đường phục hồi ví 0 xu và dữ liệu giữa V0.1.5 và V0.2.0. |
| 4 · Living Pet | NEEDS VERIFICATION | 5 đặc tả trong `docs/pet/`, gồm AI, sprite, catch-up và test. | Làm rõ client nào điều phối khi có nhiều thiết bị và hành động nào được phép ghi DB. |
| 5 · Future AI | COMPLETE | Có `docs/ai/FUTURE_AI_VISION.md`, giới hạn Utility AI ở các mốc đầu. | Đồng bộ điều kiện thử LLM sau V1.0 với roadmap. |
| 6 · Dev Tools, Roadmap, Handover | PARTIAL | Có bản nháp roadmap, backlog, công cụ dev, bảng nghiệm thu, handover, tổng quan kiến trúc, changelog và báo cáo. | Hoàn thiện contract, dependency, chỉ mục và Final Verification Gate. |

**Quyết định đã khôi phục:** Demo E đã duyệt, kiến trúc hiện tại được giữ, đúng hai người, iPhone Safari/PWA, trải nghiệm HTTPS không buộc người xem cài VPN, chi phí bổ sung gần 0₫. Các đề xuất tại thời điểm tiếp quản được cập nhật thành quyết định ở [DECISIONS.md](../DECISIONS.md#quyết-định-đã-chốt).

**Task kế tiếp khi kiểm kê:** rà các bằng chứng kỹ thuật có thể đổi quyết định, sau đó làm rõ các task V0.1, V0.1.5 và V0.2.0 trước khi chốt kiểm chứng cuối.

## Kiểm chứng và sửa đặc tả

- **Phase 0: COMPLETE.** Khôi phục nguyên văn yêu cầu từ hai bản USER_INPUT trùng nội dung trong transcript Antigravity, bước 873 và 1017. Lưu [MASTER_TASK.md](MASTER_TASK.md) và đối chiếu deliverable theo phase.
- **Phase 1: COMPLETE.** Cả 18 HEAD khớp inventory. Kiểm tra trực tiếp license và các symbol trong Pomodoro, ClockSync, ledger math, balance-sim, RNG/blooms, WatchParty, HLS, Pet Utility và Syncplay. Cập nhật [nghiên cứu](OPEN_SOURCE_RESEARCH.md), [reuse](REUSE_MATRIX.md), [review](ARCHITECTURE_REVIEW.md), [kế hoạch tích hợp](INTEGRATION_PLAN.md) và [protocol WAN](../MEDIA_SETUP.md). 8 Hz giảm 20% khi tải đi liên tục, không tự đủ trần 2 triệu tin/tháng. S0-5b là phép đo riêng và chờ người dùng.
- **Phase 2: COMPLETE.** Giữ thiết kế gameplay, progression, NPC và tương tác đôi đã có. Tại thời điểm nghiên cứu, Caro được mô tả dạng giải thế co-op theo ràng buộc cũ. ADR-010 hiện cho phép Caro PvP thân thiện. [Mini-game](../gameplay/MINIGAME_DESIGN.md)
- **Phase 3: COMPLETE ở mức đặc tả.** Chạy lại PoC số học của Carbon, xác nhận giới hạn mẫu và giả định câu cá. V0.2.0 phục hồi ví trống qua thảo mộc/Shipping Bin; V0.2.2 mới có mồi/cá. Đồng bộ invariants, rounding, nguồn giá và output simulator. [Economy](../economy/ECONOMY_SIMULATOR_SPEC.md)
- **Phase 4: COMPLETE ở mức đặc tả.** MVP đọc snapshot và mô phỏng nhẹ. Election theo user/session và heartbeat thuộc V0.2.3; Postgres giữ quyền ghi nhu cầu/kho và test race. [Pet simulation](../pet/PET_SIMULATION_SPEC.md)
- **Phase 5: COMPLETE.** Giữ nghiên cứu AI Town ở dạng danh mục, cân nhắc thử LLM sau V1.0. [Future AI](../ai/FUTURE_AI_VISION.md)
- **Phase 6: COMPLETE.** Đã chỉnh contract, dependency và gate trong [backlog](../IMPLEMENTATION_BACKLOG.md), [roadmap](../MASTER_ROADMAP.md), [dev tools](../DEV_TOOLS.md), [handover](../AGENT_HANDOVER.md), [kiến trúc](../ARCHITECTURE_OVERVIEW.md), [acceptance](../MILESTONE_ACCEPTANCE.md), [quyết định](../DECISIONS.md), tiến độ, chỉ mục và changelog. Hoàn tất [báo cáo tổng hợp](MASTER_RESEARCH_SUMMARY.md) và Final Verification Gate bên dưới.

## Final Verification Gate — 25/11/2026

| Hạng mục | Kết quả |
|---|---|
| Master Prompt và deliverables Phase 0–6 | Đủ tài liệu. Master Prompt khớp hai bản gốc. Chỉ mục trỏ tới hồ sơ bàn giao. |
| Backlog V0.1, S0-5b, V0.1.5, V0.2.0 | 21 task có đủ trường của mục 6.6. Kiểm tra 24 cạnh dependency Task ID, không thiếu đích và không có vòng. Mốc sau ở cấp epic. |
| Liên kết tài liệu | Đã kiểm tra tất cả Markdown của dự án, gồm đích tài liệu và heading anchor nội bộ. |
| Production scope | 774/774 SHA-256 khớp manifest Carbon, gồm các tệp runtime, tooling, assets và dependencies trong danh sách. Không có tệp mới ngoài manifest trong `src/`, `public/`, `scripts/`, `supabase/` và `tests/`. |
| Git | `main` chưa có commit. `git diff` và `git diff --cached` trống do working tree vẫn untracked và index trống. Từ 141 lên 143 tệp untracked do thêm Master Prompt và checkpoint. Hash là bằng chứng bảo toàn runtime. |
| Local | Lint, typecheck, Vitest **24/24** (6 file) đều exit 0. Build và guard pass, quét 3 JS bundle không thấy marker dev. Kiểm tra manifest precache không có video mẫu, asset candidates, local-licensed hoặc URL Supabase. Vite cảnh báo chunk >500 kB. |
| Chromium | Playwright **8/8, 23,0s** ở desktop và viewport cảm ứng 430×932. Dùng bản sao tạm cho build và E2E để giữ nguyên dist và trạng thái Dev LAN trong project. |
| Cloud và thiết bị thật | Chưa chạy SQL trên Supabase Cloud, chưa deploy HTTPS, chưa thử Safari/PWA thật. Bằng chứng Windows ↔ Redmi trước đây giới hạn PoC sync cùng Wi-Fi. S0-5b WAN và dữ liệu thực tế về relay vẫn chờ. |
| Quyết định và giả định | PD-01/02/07/08 là các việc cần chốt để phát hành V0.1. PD-03–06 mở ở mốc liên quan. Hệ số decay và giá economy là mẫu thiết kế. Định mức nhà cung cấp đã đối chiếu theo tài liệu công khai, cấu hình tài khoản chờ deploy. |

**Bàn giao đề xuất lúc kết thúc nghiên cứu:** khi mở V0.1 Final Integration, giao **OLW-010-01** để kiểm quyền asset, tạo atlas tối thiểu và ghi credits. OLW-010-04 có thể đo song song. Sau đó thực hiện 010-02/03, 010-05 và 010-06 theo gate. [Backlog](../IMPLEMENTATION_BACKLOG.md) · [Quyền và quyết định](../DECISIONS.md#quyết-định-đã-chốt)

## Checkpoint baseline V0.1 Final Integration

Ngày 25/11/2026, chủ dự án đóng Master Research & Design và mở V0.1 Final Integration với ngân sách bổ sung **0₫**. PD-01–08 đã chốt. ADR-010 cho phép Caro, Othello và Battleship tự nguyện giữa hai thành viên, với kết quả trong ván, không mất tài sản và không xếp hạng dài hạn. [Quyết định](../DECISIONS.md#quyết-định-đã-chốt) · [Đặc tả](../PRODUCT_SPEC.md)

**Baseline Git cục bộ:** Checkpoint này nằm trong root commit trên `main`. Từ checkout của dự án, dùng `git rev-list --max-parents=0 HEAD` để lấy hash baseline. Baseline gồm mã nguồn và tài liệu được rà soát, sáu PNG starter/icon và video Spike 0 tổng hợp. `.env.example` có giá trị trống. Bản ZIP tài liệu, asset-candidates, raw pack, môi trường, khóa, dependencies, dist và trạng thái Dev LAN được giữ ngoài Git. Bí danh và đường dẫn thiết bị đã được chuẩn hóa. Công cụ dev nhận đường dẫn local qua `OLW_ART_DOWNLOADS_DIR` và `OLW_ARTIFACT_COPY` khi cần.

**Kiểm chứng baseline:** Lint, typecheck, Vitest **24/24**, build và production guard đều pass. Playwright Chromium **8/8** (22,8 giây), gồm desktop và viewport iPhone. Hai script Python đã qua kiểm tra cú pháp. Chạy kiểm thử trong bản sao tạm để giữ dữ liệu thử nghiệm local. Vite vẫn cảnh báo chunk >500 kB. Supabase Cloud, HTTPS deploy, iPhone Safari/PWA thật và Cinema WAN vẫn chờ gate tương ứng.

**Task sẵn sàng nhận: OLW-010-01.** Đọc PD-01, ADR-008, [Art Direction](../art/ART_DIRECTION.md), [Asset Pipeline](../art/ASSET_PIPELINE.md) và block task. Bắt đầu từ bảng semantic ID trong `src/game/artDemos/semanticAssetRegistry.ts`, kiểm kê nguồn/version/giấy phép và chọn subset cần dùng cho V0.1. Chỉ dùng asset có quyền phát hành Web/PWA rõ ràng. Asset chưa rõ quyền dùng fallback CC0. Ghi credits, kiểm tra manifest/rect và artifact trước khi chuyển sang 010-02 và 010-03. Checkpoint kết thúc trước khi tạo atlas hoặc tích hợp artwork. [Backlog](../IMPLEMENTATION_BACKLOG.md)

## OLW-010-01 — Atlas đã hoàn thành

PD-01 được chủ dự án cập nhật trong lúc thực hiện. Dùng bản gốc Demo E cho phát triển riêng phi thương mại, giữ CC0 làm fallback cho môi trường public khi chưa rõ quyền. Hai profile có manifest và credits riêng. Chạy `npm run assets:atlas:private` với source pack sẵn có để tạo atlas ignored. Không đưa `dist-private` qua Internet trước khi xác minh. Vite public xuất theo allowlist. Guard đã kiểm cùng tệp ZIP giả và atlas private trong sandbox.

Kiểm thử pass lint, typecheck, 26 Vitest, 8 Chromium E2E, public build/guard và private build. File private tái tạo trùng SHA-256. Public PWA precache 25 mục, 1.999,56 KiB. Không nghiệm thu thiết bị thật tại bước này.

Bước kế: OLW-010-02. Dùng atlas avatar của profile đang hoạt động, kết hợp ramp từ unifiedAvatarBuilder, giữ API và animation key cũ. Sau đó dùng atlas world cho OLW-010-03. [Profile và giấy phép](../art/ASSET_PIPELINE.md#4-tạo-bản-phát-triển-riêng-và-bản-public)
