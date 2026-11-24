# Báo cáo tổng hợp Master Research & Design

Ngày 25/11/2026. Phase 0–6 được bàn giao ở mức nghiên cứu và đặc tả. V0.1 đang dùng starter CC0 và còn chờ nghiệm thu.

## 1. Đã hoàn thành những gì?

Carbon để lại checkpoint, nghiên cứu 18 repo, bảng reuse và kiến trúc, 5 tài liệu gameplay, 6 tài liệu kinh tế, 5 tài liệu pet, tầm nhìn AI và bản nháp Phase 6. Takeover khôi phục Master Prompt, xác minh revision và module dẫn đầu, sửa các điểm mâu thuẫn và hoàn tất roadmap, backlog, Dev Tools, tiêu chí nghiệm thu, handover, chỉ mục và changelog. [Master Prompt](MASTER_TASK.md) · [Checkpoint kiểm chứng](TAKEOVER_CHECKPOINT.md) · [Chỉ mục tài liệu](../README.md)

## 2. Repository nào đáng tái sử dụng nhất?

`cocoworking` cho đồng hồ Pomodoro thuần TypeScript, `harvest-hollow` cho clock suspend recovery và số học nguyên, `webfarmville` cho runner cân bằng, RNG và hoa lai. `watchparty` hữu ích khi benchmark Cinema cần phân tích transcode và WebRTC. Các nguồn này đều có MIT ở revision đã kiểm. [Commit, LICENSE và source](OPEN_SOURCE_RESEARCH.md#nguồn-ưu-tiên-khi-bắt-đầu-port)

## 3. Module nào có thể tái sử dụng, port hoặc chỉ tham khảo?

Port `pomodoro.ts`, `ClockSync`, `mulBp` và các pattern runner/RNG; ghi source và MIT notice khi thực sự port. Chỉ tham khảo mẫu HLS/ducking từ Local-Watch-Party và ý tưởng pet từ Ourlittlepet/Petivolution. Giữ animation và scene trong Phaser 4 của dự án. Các workaround Safari của WatchParty cần được kiểm chứng trước khi áp dụng. [Ma trận reuse](REUSE_MATRIX.md)

## 4. Có giữ codebase hiện tại?

Giữ React/Vite PWA, Phaser 4, `WorldBackend`, Supabase/Postgres/RLS và Dev LAN. Thêm domain tối thiểu theo task để bảo toàn entrypoint V0.1. Cân nhắc thử Phaser 3 ở nhánh riêng chỉ khi tiêu chí Safari thật gặp lỗi lặp và chủ dự án đồng ý. [Kiến trúc hiện tại](../ARCHITECTURE.md) · [Tổng quan mục tiêu](../ARCHITECTURE_OVERVIEW.md)

## 5. Rủi ro kỹ thuật nào cần xử lý?

- **Realtime:** Với đúng hai kết nối đi liên tục 1h/ngày, 8 Hz vẫn dự tính 3,456 triệu tin/30 ngày trước Presence và nhiều tab. Test delta, stop/resume và đo usage. Project Free có thể pause khi ít hoạt động.
- **Deploy:** Kiểm quyền phát hành atlas tĩnh, chọn phương án Auth phù hợp hai người và chạy SQL/RLS ở Cloud Test. SMTP mặc định không phục vụ email ngoài team. Phương án tạo sẵn cần duyệt và kiểm tra khôi phục.
- **iPhone/Cinema:** Xác minh WebGL/PWA và reconnect trên iPhone thật. PoC LAN đo sync. S0-5b đo riêng đường truyền Windows → Safari WAN, xác thực, codec, seek và ngân sách.
- **Mở rộng:** Giữ mutation có thẩm quyền ở RPC. Reuse contract test và khóa world để bảo toàn kho, ví và pet khi có hai writer. [Đánh giá kiến trúc](ARCHITECTURE_REVIEW.md) · [Định mức](OPEN_SOURCE_RESEARCH.md#4-hạ-tầng-free-tier-cho-hai-người-đối-chiếu-25112026)

## 6. Roadmap cuối cùng là gì?

Spike 0 + **V0.1** atlas/HTTPS/thiết bị → **V0.1.5** Living Home theo PD-06 → **V0.2.0–0.2.5** Economy, Farming, Fishing, Intelligent Pet, Home Progression, Co-op → **V0.3** Shared Life → **V0.4** Cinema sau S0-5b → **V0.5** Polish → **V1.0** Our Island → sau V1.0 mới cân nhắc LLM và AI Town. Funnel HLS và WebRTC được nghiên cứu khi tới S0-5b. V0.1.5 chỉ mở sau nghiệm thu V0.1. [Master Roadmap](../MASTER_ROADMAP.md)

## 7. Nền kinh tế được đề xuất như thế nào?

Ví và tư liệu chung, túi cá nhân cho quà bất ngờ, phân biệt giá trị tham chiếu theo lao động chuẩn và giá giao dịch. V0.1.5 chỉ cần kho không tiền. V0.2.0 thêm ví/ledger và hái thảo mộc miễn phí bán qua Shipping Bin để thoát ví trống. PoC 38 xu giả định có câu cá và chưa xác nhận thời gian thực. [Economy Design](../economy/ECONOMY_DESIGN.md) · [Simulator Spec](../economy/ECONOMY_SIMULATOR_SPEC.md)

## 8. Pet AI được thiết kế như thế nào?

MVP một mèo cam với ba nhu cầu, catch-up giới hạn 48h, sàn 30, snapshot dùng chung. V0.2.3 bổ sung Utility AI, affordance, cá tính và ký ức hữu hạn. Host foreground được bầu theo user/session để điều phối hoạt ảnh. Postgres xử lý tương tác và tiêu hao nguyên tử. [Pet AI](../pet/PET_AI_ARCHITECTURE.md) · [Pet Simulation](../pet/PET_SIMULATION_SPEC.md)

## 9. Quyết định và điều kiện triển khai

Chủ dự án đã chốt PD-01–08 khi đóng Master Research. Khi triển khai, xác minh quyền từng asset, slot Supabase Free và quy trình khôi phục tài khoản. Transport Cinema vẫn chờ S0-5b. [Quyết định đã chốt](../DECISIONS.md#quyết-định-đã-chốt)

## 10. Bài nào cần thiết bị/hạ tầng thật?

iPhone 16 Pro Max Safari và Add to Home Screen, khóa máy/đổi mạng, phiên Auth và thao tác chạm. Windows và Redmi K70E đối chiếu bản HTTPS nối Cloud. Supabase Test cần SQL, RLS/Realtime, 2 kết nối ghi và người thứ ba. S0-5b có protocol iPhone WAN riêng. [Gate nghiệm thu](../MILESTONE_ACCEPTANCE.md) · [Media protocol](../MEDIA_SETUP.md)

## 11. Task nào sẵn sàng giao cho DeepSeek?

Backlog chi tiết có 21 task với dependency, phạm vi, contract, invariants, test và reviewer. `OLW-010-01` là task đầu tiên sau baseline. `OLW-010-04` có thể đo song song. Các nhóm `OLW-015-*` và `OLW-020-*` có đặc tả để giao khi mở mốc. SQL/RLS, build guard, Sim-Host và media auth cần review kỹ thuật. [Backlog](../IMPLEMENTATION_BACKLOG.md) · [Handover](../AGENT_HANDOVER.md)

## 12. Còn phần nào chưa hoàn thành?

V0.1 còn atlas, deploy, Auth/RLS Cloud và iPhone thật. V0.1.5 trở đi là thiết kế. Cinema WAN, quyền media, chi phí relay và hiệu năng chờ benchmark. Lint, typecheck, 24 Vitest, production build, guard và 8 Playwright Chromium đã chạy lại và pass; Vite báo chunk lớn. [Tiến độ và kết quả](../PROGRESS.md)

## 13. Task triển khai kế tiếp là gì?

**OLW-010-01** kiểm tra quyền và tạo atlas Demo E tối thiểu cho nhà/vườn/rig avatar, kèm manifest, credits, fallback và kiểm tra artifact. Tiếp theo là avatar `OLW-010-02` và scene `OLW-010-03` trước deploy và acceptance thật. [Backlog](../IMPLEMENTATION_BACKLOG.md) · [Asset pipeline](../art/ASSET_PIPELINE.md)
