# Chỉ mục Tài liệu Dự án (`docs/README.md`)

Toàn bộ tài liệu kiến trúc, nghiên cứu, thiết kế và kế hoạch triển khai của **Our Little World** được phân loại gọn dưới đây (tránh đọc thừa hoặc lặp lại nội dung).

## 1. Quy tắc Cốt lõi & Định hướng (Bắt buộc cho Mọi Agent)
- [AGENTS.md](../AGENTS.md) — Luật dự án, ràng buộc `0₫`, phạm vi milestone hiện tại, ranh giới code và Definition of Done.
- [README.md](../README.md) — Hướng dẫn cài đặt, chạy Local/Dev LAN giữa Windows & điện thoại, kiểm thử.
- [CHANGELOG.md](../CHANGELOG.md) — Lịch sử thay đổi phiên bản & milestone nghiên cứu.
- [docs/PRODUCT_SPEC.md](PRODUCT_SPEC.md) — Tầm nhìn sản phẩm, chân dung người dùng & nguyên tắc bất biến.

## 2. Lộ trình, Tiến độ, Quyết định & Nghiệm thu
- [docs/MASTER_ROADMAP.md](MASTER_ROADMAP.md) — Lộ trình đã duyệt `Spike 0 → V0.1 → V1.0+` (đã thay thế `ROADMAP.md`).
- [docs/IMPLEMENTATION_BACKLOG.md](IMPLEMENTATION_BACKLOG.md) — Task phân rã sẵn (`OLW-*`) kèm đầy đủ contract, invariants & test cases để giao DeepSeek V4.1 Flash.
- [docs/PROGRESS.md](PROGRESS.md) — Nhật ký tiến độ thực tế, các bài test đã pass & hạng mục chờ thiết bị thật.
- [docs/MILESTONE_ACCEPTANCE.md](MILESTONE_ACCEPTANCE.md) — Bảng nghiệm thu `18` tiêu chí V0.1 & tiêu chí thoát các phiên bản sau.
- [docs/DECISIONS.md](DECISIONS.md) — Toàn bộ ADR (`ADR-001..010`) và các quyết định đã chốt (`PD-01..08`).
- [docs/AGENT_HANDOVER.md](AGENT_HANDOVER.md) — Quy trình bàn giao & review cho DeepSeek V4.1 Flash / Neon / Codex.
- [docs/handover/](handover/) — Mission 01: Cursor Cloud environment, baseline audit, feature matrix, missing assets, roadmap.

## 3. Kiến trúc, Bảo mật, Kiểm thử & Media
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) — Kiến trúc V0.1 đang chạy (`WorldBackend`, `DevLanBackend`, RLS, rủi ro Safari/PWA).
- [docs/ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) — Sơ đồ tổng thể dài hạn **K1–K8** (`V0.1 → V1.0+`).
- [docs/DEV_TOOLS.md](DEV_TOOLS.md) — Đặc tả Developer Console cách ly (`import.meta.env.DEV` + `dev-migrations` tách project Test).
- [docs/SECURITY.md](SECURITY.md) — Chính sách RLS, giới hạn 2 thành viên, private channel & quyền riêng tư.
- [docs/TEST_PLAN.md](TEST_PLAN.md) — Ma trận kiểm thử tự động & thiết bị thật.
- [docs/MEDIA_SETUP.md](MEDIA_SETUP.md) — Thiết lập thử nghiệm Cinema Spike 0 & hướng VPN-less V0.4.

## 4. Định hướng Mỹ thuật (Đã duyệt Demo E)
- [docs/art/ART_DIRECTION.md](art/ART_DIRECTION.md) — Bản sắc **Demo E (`Unified Cozy World`)**, bảng so sánh avatar, bản quyền Web/PWA.
- [docs/art/ASSET_PIPELINE.md](art/ASSET_PIPELINE.md) — `14` quy tắc chuẩn hóa & kế hoạch tích hợp không phá vỡ V0.1.
- [docs/ART_EVALUATION.md](ART_EVALUATION.md) — Kết quả kiểm kê SHA-256 & 4 demo gốc A–D.
- [docs/ASSETS.md](ASSETS.md) — Quản lý starter CC0 V0.1 & thư mục licensed local.

## 5. Master Research

- [Master Prompt](research/MASTER_TASK.md) — Nguyên văn yêu cầu đã khôi phục từ Antigravity.
- [Checkpoint tiếp quản](research/TAKEOVER_CHECKPOINT.md) — Bằng chứng, kết quả Final Verification Gate và task tiếp theo.
- [docs/research/MASTER_RESEARCH_SUMMARY.md](research/MASTER_RESEARCH_SUMMARY.md) — **Báo cáo tổng hợp trả lời 13 câu hỏi chốt.**
- [docs/research/OPEN_SOURCE_RESEARCH.md](research/OPEN_SOURCE_RESEARCH.md) — Sàng lọc 18 repo, Cinema Transport/Sync, và bảng Free-tier (`25/11/2026`).
- [docs/research/REUSE_MATRIX.md](research/REUSE_MATRIX.md) — Ma trận tái sử dụng theo module (`A/B/C/D`), license & trích dẫn `path#symbol`.
- [docs/research/INTEGRATION_PLAN.md](research/INTEGRATION_PLAN.md) — Kế hoạch port module thuần TS không phá V0.1 & `THIRD_PARTY_NOTICES`.
- [docs/research/ARCHITECTURE_REVIEW.md](research/ARCHITECTURE_REVIEW.md) — Xác nhận `K1–K8` & 5 rủi ro cần xử lý (`8Hz` quota Realtime, Phaser 4, parity).
- [docs/research/CHECKPOINT.md](research/CHECKPOINT.md) — Checkpoint lịch sử do Carbon để lại.

## 6. Thiết kế Hệ thống Chuyên sâu (`gameplay / economy / pet / ai`)
- **Gameplay (`docs/gameplay/`):** [GAME_DESIGN.md](gameplay/GAME_DESIGN.md) · [WORLD_PROGRESSION.md](gameplay/WORLD_PROGRESSION.md) · [MINIGAME_DESIGN.md](gameplay/MINIGAME_DESIGN.md) · [NPC_DESIGN.md](gameplay/NPC_DESIGN.md) · [COUPLE_INTERACTIONS.md](gameplay/COUPLE_INTERACTIONS.md)
- **Economy (`docs/economy/`):** [ECONOMY_DESIGN.md](economy/ECONOMY_DESIGN.md) · [ECONOMY_MODEL.md](economy/ECONOMY_MODEL.md) · [PRODUCTION_CHAINS.md](economy/PRODUCTION_CHAINS.md) · [MARKET_AND_NPC.md](economy/MARKET_AND_NPC.md) · [BALANCING_PLAN.md](economy/BALANCING_PLAN.md) · [ECONOMY_SIMULATOR_SPEC.md](economy/ECONOMY_SIMULATOR_SPEC.md)
- **Pet (`docs/pet/`):** [PET_DESIGN.md](pet/PET_DESIGN.md) · [PET_AI_ARCHITECTURE.md](pet/PET_AI_ARCHITECTURE.md) · [PET_ANIMATION_MATRIX.md](pet/PET_ANIMATION_MATRIX.md) · [PET_SIMULATION_SPEC.md](pet/PET_SIMULATION_SPEC.md) · [PET_TEST_PLAN.md](pet/PET_TEST_PLAN.md)
- **Future AI (`docs/ai/`):** [FUTURE_AI_VISION.md](ai/FUTURE_AI_VISION.md)
