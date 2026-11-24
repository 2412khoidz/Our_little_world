# Changelog — Our Little World

Định dạng tham khảo *Keep a Changelog*. Xem trạng thái nghiệm thu chi tiết tại [docs/PROGRESS.md](docs/PROGRESS.md).

## [Unreleased — V0.1 Final Integration] - 2026-11-25
### Added
- Atlas Demo E riêng và atlas public fallback, cùng manifest và credits theo profile.
- Avatar Modern Interiors tùy chỉnh trong game chính và Tủ đồ. Nền nhà/vườn, 12 SKU, camera fit map và kiểm thử chạm/đặt/dời/reload.

### Changed
- Đóng Master Research & Design, chốt PD-01–08 và bàn giao OLW-010-01.
- Cho phép mini-game PvP tự nguyện giữa hai người theo ADR-010. Thiết kế giữ tài sản và tiến trình ngoài kết quả ván.
- Chuẩn hóa bí danh và đường dẫn local trước baseline. Bổ sung ignore cho môi trường, khóa, archive và media local.

## [Master Research & Design Milestone] - 2026-11-25
### Added
- Hoàn tất nghiên cứu 18 repository mã nguồn mở, Cinema VPN-less transport vs sync, và định mức Free-tier Supabase/Cloudflare (`docs/research/*`).
- Hoàn tất đặc tả đề xuất Gameplay, Kinh tế hợp tác (cơ sở Marx + game balance + transaction integrity K2 + PoC `econ-check.mjs`), Living Pet AI (`K3`), Future AI Vision (`V1.0+`), Dev Console (`K6`), Master Roadmap, Milestone Acceptance, Agent Handover & Backlog chi tiết (`OLW-010-*`, `S0-5b`, `OLW-015-*`, `OLW-020-*`).
- Bổ sung `ADR-008` (duyệt Demo E), `ADR-009` (ngân sách `≈ 0₫`), `Pending Decisions` (`PD-01..PD-08`) và chỉ mục `docs/README.md`.

### Changed
- Hợp nhất `docs/ROADMAP.md` vào `docs/MASTER_ROADMAP.md` và cập nhật `AGENTS.md` giữ ngắn gọn chuẩn bàn giao cho DeepSeek V4.1 Flash.
- Khôi phục Master Prompt và checkpoint tiếp quản. Bổ sung contract V0.1–V0.2.0, chỉnh dependency giữa các mốc, ghi gate Auth, quyền asset, Cloud, iPhone và Cinema WAN.
- Phạm vi thay đổi là tài liệu. Kiểm thử local chạy lại trong Final Verification Gate.

## [0.1.0-dev] - 2026-11-25
### Added
- Bootstrap V0.1 (`Our Little Home`) + Spike 0 PoC: React 19, TypeScript 5.9.3, Phaser 4.2.1, Vite 8, VitePWA, Vitest (24 tests pass), Playwright (8 E2E pass), 3 Supabase SQL migrations + `rls_and_pairing.sql`, Dev LAN HTTP+SSE relay (`DevLanBackend`), Production Guard (`verify-prod-guard.mjs`).
- Đánh giá 17 file asset miễn phí, xây dựng Dev-only Art Demos `A..E` và hoàn thiện định hướng mỹ thuật `Demo E — Unified Cozy World` (`docs/art/ART_DIRECTION.md`, `ASSET_PIPELINE.md`).
