# Lộ trình Tổng thể — Our Little World (`MASTER_ROADMAP`)

*Hợp nhất và phản biện từ lộ trình gốc, bổ sung kết quả nghiên cứu mở rộng & ngân sách bổ sung `0₫` ([ADR-008, ADR-009, PD-06](DECISIONS.md)). Tài liệu thay thế nội dung chi tiết từng phiên bản cho `docs/ROADMAP.md`.*

---

## 1. Phản biện Dependency & Pacing (Cải thiện Lộ trình Đề xuất)

1. **Giải quyết nghẽn Tặng quà & Thức ăn Mèo (`K5`):** Trong lộ trình cũ, *Tặng quà / Hộp thư / Nuôi thú cưng* nằm ở `V0.1.5` trước `Economy Foundation V0.2.0`. Giải pháp đã duyệt trong PD-06: đưa **`item_catalog` read-only + `inventory_items` (`shared` / cá nhân) + Hạt mèo cơ bản miễn phí** vào **`V0.1.5`**, còn tiền tệ (`world_wallet`), `economy_ledger` và mua bán cơ bản tại cổng mở ở **`V0.2.0`** để không bị khóa chéo.
2. **Đưa Pomodoro Co-presence lên `V0.1.5` & Sắp xếp tiện ích đời thường sớm:** Hai bạn ưu tiên công năng cặp đôi mỗi ngày và `cocoworking` cho module Pomodoro thuần TS (`MIT`) dễ port ngay trong 0.5 ngày. Do đó đưa Pomodoro bản im lặng + Thú cưng cơ bản + Hộp thư/Quà/Khung ảnh chung về **`V0.1.5`** giúp sản phẩm có giá trị sử dụng hàng ngày rất sớm mà không cần chờ xong toàn bộ kinh tế/nấu ăn.
3. **Tách Spike `S0-5b` (Cinema VPN-less Transport Benchmark) sau `V0.1`:** Cinema trên LAN đã thử chạy được Sync PoC, nhưng qua Phase 1 phát hiện Cloudflare CDN có điều khoản giới hạn video và Tunnel chưa vượt gate dịch vụ. Khi tới S0-5b sau V0.1, đo Funnel HLS và WebRTC từ Windows host tới iPhone Safari qua 4G theo PD-03. Dùng kết quả để quyết định transport V0.4.

---

## 2. Trạng thái Spike 0 & V0.1 Slices (Di chuyển từ `ROADMAP.md`)

### Chi tiết Spike 0 (Đã làm nền PoC; còn mục chờ thiết bị thật)
| Mã | Hạng mục | Tiêu chí thoát | Hiện trạng (`25/11/2026`) |
|---|---|---|---|
| `S0-1` | Shell PWA (`sw.js`, `manifest`, không cache API/video) | Add to Home Screen iPhone thật | Build pass; **chờ iPhone thật** |
| `S0-2` | Phaser 4 pixel art + chạm/bàn phím dọc-ngang | Mượt, không cuộn nhầm Safari | E2E `430×932` pass; **chờ iPhone thật** |
| `S0-3` | 2 client realtime, mất mạng, background iPhone | Tự đồng bộ lại không kẹt ghost | Playwright Dev LAN 2 browser context pass; **chờ 2 mạng thật + iPhone** |
| `S0-4` | PoC Cinema sync (`Play/Pause/Seek/Offset/Drift`) | Sync mượt không echo loop | Windows↔K70E Wi-Fi OK; **chờ iPhone Safari; WAN đo riêng ở S0-5b** |
| `S0-5a` | Tài liệu & khung Jellyfin/Tailscale ban đầu | Xong khung thử nghiệm | Có `MEDIA_SETUP.md` (cập nhật sang VPN-less) |
| **`S0-5b`** | **Mới:** Benchmark truyền media **không cài VPN trên iPhone** (Tailscale Funnel HLS vs WebRTC + TURN Free) | 720p/1080p mượt qua 4G iPhone Safari, xác thực token, chi phí `0₫` | **Chạy khi tới S0-5b sau V0.1. Transport chờ benchmark** |
| `S0-6` | Chốt Art Direction & License | Người dùng duyệt pack `0₫` | **ĐÃ DUYỆT Demo E** ([ART_DIRECTION.md](art/ART_DIRECTION.md)) |

### Các lát cắt đã code trong V0.1 (Chưa nghiệm thu hoàn tất trước khi tích hợp Demo E & Test thật)
`V0.1-1` Scaffold + PWA + Tests → `V0.1-2` Starter Phaser 4 Map + BFS → `V0.1-3` Supabase Auth/RLS/2-member cap + Dev LAN → `V0.1-4` Realtime Presence/10Hz TX → `V0.1-5` Tủ đồ Avatar → `V0.1-6` Nội thất atomic occupancy → `V0.1-7` UI tiếng Việt & Prod Guard. *(Lưu ý: cần **tích hợp artwork Demo E**, **đo TX và thử trần 8 Hz**, **triển khai Supabase Cloud + host HTTPS đã duyệt**, và **nghiệm thu iPhone thật** trước khi đóng V0.1).*

---

## 3. Lộ trình Dài hạn Đã Duyệt (`V0.1 → Post-V1.0`)

| Phiên bản | Mục tiêu Cốt lõi | Phạm vi Chính | Phụ thuộc | Tiêu chí Thoát Chính |
|---|---|---|---|---|
| **`V0.1` — Foundation** *(Chưa đóng)* | Ngôi nhà 2 người chạy HTTPS ổn định, hình ảnh Demo E | Tích hợp atlas Demo E (sửa sàn/đường/cỏ/pet/camera), Supabase thật, ưu tiên deploy HTTPS trên Cloudflare Pages Free, test Windows+Android+iPhone thật | Demo E đã duyệt, quyền Web/PWA, xác minh tài khoản và slot Free | Đạt đủ 18 điều kiện trong `MILESTONE_ACCEPTANCE.md` |
| **`V0.1.5` — Living Home** | Căn nhà có nhịp sống & dùng được mỗi ngày | **Pet MVP** (`cat-orange`, ăn hạt free, ngủ, vuốt ve), **Inventory tối thiểu (K5)**, Tương tác đôi (ngồi sofa/giường/ôm `0₫`/emote), Hộp thư & Quà, Khung ảnh chung, **Pomodoro im lặng**, Dev Console cơ bản | `V0.1` đã nghiệm thu đủ 18 gate | Hai bạn dùng Pomodoro, nuôi mèo cơ bản & gửi quà qua hộp thư được hàng ngày |
| **`V0.2.0` — Economy Foundation** | Nền kinh tế household atomic & cân bằng | `world_wallet`, `economy_ledger`, nâng cấp Inventory sang full catalog, NPC Bác Hai Mùa & Shipping Bin 24/7, `scripts/economy-sim.ts`, Dev Console tiền tệ | `V0.1.5` đóng, dùng lại Inventory | Simulator 0 arbitrage/deadlock; RPC `FOR UPDATE` pass race tests |
| **`V0.2.1` — Farming** | Vườn trồng rau, hoa, lai giống & cây ăn quả | Làm đất, gieo, tưới, chất lượng `★`, hoa lai 8 hướng (`webfarmville`), bó hoa, cây Kỷ niệm, Cô Mai Hoa | `V0.2.0` | Cây mọc theo server time, không chết offline, 0 xung đột thu hoạch |
| **`V0.2.2` — Fishing** | Ao cá giải trí có kỹ năng 1 ngón | Mini-game kéo thanh (`greens` FSM), 3 bậc hiếm, mồi `0c`/cao cấp, nâng cần, bể cá, Chú Tư Cần | `V0.2.0`, Ao Demo E | Câu mượt 1 ngón trên iPhone, co-op đứng cạnh ao cùng câu |
| **`V0.2.3` — Intelligent Pet** | Mèo sống động có tính cách & ký ức | Full 8 needs, 9 emotions, 7 traits, 24 memories, Utility AI + Affordances thích nghi dời đồ, **Sim-Host Election**, Pet Brain Debugger | `V0.1.5` + nội thất V0.2 | Mèo tự ăn/ngủ/phơi nắng/ngồi cạnh bàn học; 2 máy nhất quán & failover `<7s` |
| **`V0.2.4` — Home Progression** | Cửa hàng nội thất 4 phong cách & mở rộng nhà | Shop nội thất `Pastel/Modern/Cottage/Rustic`, nâng công cụ, mở rộng phòng ngủ/bếp/nhà kính/hiên, Chú Mộc Lâm | `V0.2.0–V0.2.3` | Nâng cấp nhà không làm mất đồ cũ; tiện ích đời thường vẫn `0c` unlock |
| **`V0.2.5` — Cooperative Gameplay** | Hoạt động mini-game gắn kết & bảng đơn hàng | Hạ tầng **K4**, **4 mini-game MVP** (Caro PvP thân thiện, Lật thẻ, Đoán ý, Mê cung bất đối xứng), NPC Order Board 3 slot | `V0.2.0` | 4 game chạy mượt mobile, mất mạng phục hồi bàn cờ, Caro không cược/mất tài sản hay xếp hạng |
| **`V0.3` — Shared Life** | Nấu ăn kỹ năng & nhật ký đời thường cặp đôi | **Cooking 3 chế độ** (Casual/Co-op/Restaurant Orders có cháy khét), Nhật ký, Album ảnh private, Lịch hẹn, Wishlist, Picnic | `V0.2.1–V0.2.5` | Nấu ăn có rủi ro cháy thật; Nhật ký/Album RLS riêng 2 người |
| **`V0.4` — Cinema** | Rạp phim tại gia `0₫` không VPN phía iPhone | Transport theo kết quả `S0-5b` (Tailscale Funnel HLS hoặc WebRTC TURN), sync `ClockSync` suspend fix + hysteresis, phụ đề WebVTT/SRT, Voice & Ducking tùy chọn | `V0.3` đóng, `S0-5b` có phương án Go trên iPhone | Xem trọn phim 1–2h Windows→iPhone 4G không cài app ngoài, drift ổn định |
| **`V0.5` — Polish & Living Feel** | Hoàn thiện trải nghiệm như game thương mại nhẹ | Ngày/đêm, thời tiết trang trí, âm thanh nền, tối ưu 60fps/pin, backup/restore dữ liệu, audit toàn diện iPhone thật | `V0.1–V0.4` | Không leak RAM/context loss khi bật nền 30p; full regression xanh |
| **`V1.0` — Our Island** | Mở rộng đảo/làng khi chơi ổn định | Khu chợ, làng nhỏ, đảo và khám phá bằng logic Utility AI/scripted | `V0.5` ổn định và có nhu cầu thực | Cặp đôi chơi tốt trên iPhone, đơn giản để vận hành |
| **Sau V1.0 — Future AI World** | Thử nghiệm Level 3 rồi mới xét AI Town Level 4 | Ưu tiên thử model local có Utility fallback; chỉ xét API có chi phí bổ sung 0₫ | Nhu cầu đã được quan sát, ngân sách và dữ liệu được duyệt | Engine/DB giữ quyền quyết định, dữ liệu riêng không đưa vào prompt |

Bước mở triển khai tiếp theo là `OLW-010-01`. Thứ tự V0.1: atlas → avatar → scene → HTTPS/Supabase → thiết bị thật; đo realtime `OLW-010-04` có thể song song với atlas. Mốc dài hạn là dự kiến. Tiện ích đời thường không bị khóa sau số dư hoặc nâng cấp nhà.
