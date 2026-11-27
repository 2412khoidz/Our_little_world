# Roadmap Tổng quan — Our Little World

*Cập nhật: 27/11/2026 | Canonical Baseline: `main` (`e5de4ac`, release `v0.2.5` + hotfixes đã duyệt)*

Tài liệu này cung cấp cái nhìn nhanh; **nguồn chân lý chi tiết** nằm ở **[MASTER_ROADMAP.md](MASTER_ROADMAP.md)** và danh sách triển khai nằm ở **[NEXT_MISSIONS.md](NEXT_MISSIONS.md)**.

## Bức tranh Tổng thể

| Giai đoạn | Trạng thái | Tóm tắt trọng tâm |
|---|---|---|
| **`v0.2.5` Baseline (`main`)** | `OWNER APPROVED` | Thế giới `16×16` 6 khu vực, Avatar V2, Audio riêng tư, `NET.1.1` WS + `/__share/<token>`, Deep Farming A–G (40 cây, 20 hoa, 12 cây ăn quả, 7 thú nuôi, 84 công thức, 8 xưởng, Order Board, Câu cá), Quýt 2D + Vuena 3D Pet Care, Billiards V2, Couple P0 (`hug`, `hold_hands`), Study Pomodoro, Mailbox, Album ảnh + Hotfix chặn tap nhầm mèo & va chạm 3 gốc cây |
| **`V0.2.x` — Gameplay Foundation** | `IN PROGRESS` | **Canonical RC2 đã duyệt trên `main`:** `M0` Phase 1 Mobile-first HUD, `M1` Billiards V4.1 + fair-start, `M3a` Audit, `M3b` 32 SKU fixes, `M3c–M3c.2` Livestock & Ambient transplant. **Còn lại (`PLANNED`):** tối ưu menu phụ `M0`, **M2 Couple P1**, **M3d** Machines/VFX, **M3e** Fishing Art |
| **`V0.2.4` — Home Progression** | `PLANNED` | Cửa hàng nội thất 4 phong cách, mở rộng phòng (bếp, ngủ, học, nhà kính), giữ nguyên đồ & save cũ |
| **`V0.3` — Shared Life** | `PLANNED` | Bếp nấu ăn tương tác co-op (`src/shared/cooking/`), Nhật ký / Wishlist / Lịch hẹn thật (thay Dev prototype), Picnic |
| **`V0.4` — Cinema & Co-op Play** | `PLANNED` *(Cinema UI `BLOCKED` chờ `S0-5b`)* | Benchmark streaming Windows → iPhone 4G không VPN (`S0-5b`), rạp phim tại gia (sync, phụ đề, track âm thanh), nối WS cho Caro / Othello / Battleship / Memory |
| **`V0.5` — Quality & Living World** | `PLANNED` | Đồng bộ mỹ thuật các shop, hành vi NPC sâu hơn, âm thanh môi trường, tối ưu Safari/pin, sao lưu/khôi phục save |
| **`V1.0` — Our Island** | `PLANNED` | Mở rộng làng/biển/rừng, interiors mới, sự kiện theo mùa & tiến trình đảo chung cho 2 người |
| **Cloud / Supabase 24/7** | `DEFERRED` | Tạm hoãn có chủ đích; kiến trúc chính hiện tại là **Windows Dev LAN + Cloudflare Quick Tunnel** |

## Tài liệu Liên quan
- [MASTER_ROADMAP.md](MASTER_ROADMAP.md) — Lộ trình tổng thể & kiểm toán thực trạng đầy đủ.
- [V02_ROADMAP.md](V02_ROADMAP.md) — Chi tiết phần công việc `V0.2` còn lại.
- [NEXT_MISSIONS.md](NEXT_MISSIONS.md) — Danh sách mission tiếp theo (`M0`..`M10`), phân tích song song/tuần tự & donor sẵn có.
- [ASSET_LIBRARY_INVENTORY.md](art/ASSET_LIBRARY_INVENTORY.md) & [ASSET_REUSE_BACKLOG.md](art/ASSET_REUSE_BACKLOG.md) — Kết quả kiểm kê kho tài nguyên `M3a` (`OWNER APPROVED`).
- [PROGRESS.md](PROGRESS.md) — Nhật ký tích hợp & kiểm chứng thực tế.
- [MILESTONE_ACCEPTANCE.md](MILESTONE_ACCEPTANCE.md) — Cổng nghiệm thu Local Playable vs Deferred Cloud.
- [IMPLEMENTATION_BACKLOG.md](IMPLEMENTATION_BACKLOG.md) — Backlog nhiệm vụ chi tiết cho coding agent.
