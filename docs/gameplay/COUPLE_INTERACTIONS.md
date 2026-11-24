# Tương tác Cặp đôi (`COUPLE_INTERACTIONS`)

*Phiên bản bắt đầu từ **V0.1.5** và mở rộng dần ở **V0.2–V0.3**. Không biến tình cảm thành nghĩa vụ kinh tế (`0` xu thưởng khi ôm/hôn/nhắn).*

---

## 1. Danh mục 13 Tương tác & Khả năng Sprite Thực tế (`0₫`)

Kiểm tra trực tiếp file nguồn `Modern Interiors Free` (`Adam/Alex/Amelia_16x16.png` tại `asset-candidates/extracted/modern-interiors-free/Characters_free/`) cho thấy bản Free chỉ có **`idle`, `idle_anim`, `run`, `phone`, `sit`, `sit2`, `sit3`** (4 hướng). **Không có** sheet riêng cho `hug`, `hold_hands`, `sleep`, `dance`. Bảng dưới đây phân định trung thực cách xử lý với ngân sách **`0₫`** theo PD-05:

| # | Tương tác | Yêu cầu cả 2 online? | Cơ chế thực hiện | Xử lý hình ảnh ở `0₫` (Trung thực với sprite Free) | Mốc |
|---|---|---|---|---|---|
| 1 | **Ôm nhau** | Có (Invite/Accept) | Tiến lại 2 ô kề nhau quay mặt vào nhau | Ghép pose đứng kề cận sát biên `4px` + rung lắc nhẹ + **bong bóng tim pixel nổi lên** | `V0.1.5` |
| 2 | **Nắm tay đi dạo** | Có (Invite/Accept) | Follower avatar bám bước trễ `12px` theo leader | Hai avatar đi cùng hướng sát nhau + hạt lấp lánh gắn giữa 2 tay | `V0.2+` |
| 3 | **Ngồi chung Sofa** | Không (tự ngồi hoặc ngồi cạnh) | Bấm vào slot trái/phải của sofa dài | Dùng **sprite `sit` / `sit2` có sẵn** quay xuống xem TV / nhìn nhau | `V0.1.5` |
| 4 | **Ngồi ghế ngoài vườn** | Không / Có | Ghế băng gỗ cạnh ao & hoa | Dùng **sprite `sit` / `sit2` có sẵn** | `V0.1.5` |
| 5 | **Nằm nghỉ cạnh nhau** | Không / Có | Leo lên slot trái/phải giường đôi | Đặt sprite đầu `idle` tựa gối + **lớp phủ chăn pixel (`cover blanket overlay`)** đè phần thân | `V0.1.5` |
| 6 | **Tặng hoa** | Có thể bất đồng bộ | Tặng từ kho cá nhân / qua tay trực tiếp | Mở hiệu ứng bó hoa rơi + tin nhắn kèm theo | `V0.2.1` |
| 7 | **Tặng quà bất ngờ** | Bất đồng bộ | Gói quà từ Inventory riêng vào Hộp thư / Đặt bàn | Hộp quà có nơ mở ra khi người kia chạm | `V0.1.5` |
| 8 | **Gửi thư** | Bất đồng bộ | Viết thư ngắn đặt vào Hộp thư đỏ trước cổng | Biểu tượng lá thư nhấp nhô trên hộp thư khi có thư chưa đọc | `V0.1.5` |
| 9 | **Gửi Emote nhanh** | Có / Bất đồng bộ gần | Nút nhanh 1 chạm: tim, vẫy tay, buồn ngủ, cổ vũ, nhớ bạn | Bong bóng pixel art trên đầu avatar + truyền qua Realtime broadcast | `V0.1.5` |
| 10 | **Chụp ảnh chung** | Có hoặc ghép pose | Đóng khung khu vực quanh cặp đôi → ẩn UI → xuất ảnh PNG lưu Album | Ghi chú ngày giờ + phòng + góc nhà | `V0.3` |
| 11 | **Picnic ngoài vườn** | Không / Có | Hai slot ngồi trên thảm picnic anh đào (Demo E) | Dùng `sit2` đối diện hoặc quay ngang + giỏ đồ ăn bày giữa | `V0.3` |
| 12 | **Khiêu vũ chậm** | Có (Invite/Accept) | Hai avatar xoay vòng nhịp 4 bước theo nhạc chill | Phối hợp đổi `facing` (`down → left → up → right`) theo nhịp 1.2s + nốt nhạc | `V0.5` |
| 13 | **Cùng chơi với thú cưng** | Không / Có | Cả 2 cùng chạm mèo khi ở cùng phòng → mèo chạy giữa 2 người | Animation `Happy` của `Free Pets Pack` + tim bay giữa 3 nhân vật | `V0.1.5 / V0.2.3` |

---

## 2. Giao thức Đồng bộ Tương tác Đôi (`Invite / Accept / Interrupt`)

1. **Invite:** Người A đứng gần B (<= `3` ô) hoặc chạm tên B → gửi broadcast `{ type: 'COUPLE_INVITE', kind, fromUserId, expiresAtServerMs: now + 15_000 }`. B thấy toast nổi nhẹ có 2 nút **[Đồng ý]** / **[Để sau]** (không làm che màn hình nếu đang học Pomodoro).
2. **Accept & Sync Start:** Khi B nhận lời, hệ thống chọn điểm neo hợp lệ (ví dụ 2 ô kề nhau hoặc slot sofa), tự dẫn BFS 2 nhân vật tới đích rồi cùng kích hoạt trạng thái ở `startAtServerMs = now + 250ms` (dùng `ClockOffsetEstimator` từ `cinemaSync.ts` để hai máy khởi chạy khớp nhịp).
3. **Interruption Rules (Ngắt an toàn):**
   - Người chơi gõ phím di chuyển / chạm ô khác / mở modal học tập → **ngắt ngay lập tức không khóa người dùng**, gửi packet `COUPLE_INTERACTION_END` cho bên kia trả về `idle`.
   - Nếu một người rớt mạng (`stale > 5s`) → tự nhả trạng thái cặp đôi cho người còn lại sau 2s.
4. **Quy tắc Kinh tế:** Toàn bộ 13 hành động trên **cho 0 xu và không có chỉ số KPI/điểm yêu thương bắt buộc**; giá trị cốt lõi là kỷ niệm, ảnh lưu album và niềm vui gắn kết.

---

## 3. Data Model, Dependencies & Acceptance Criteria

- **Data model:**
  - *Transient (`Realtime Broadcast`):* `CoupleEmotePacket`, `CoupleInvitePacket`, `CoupleSyncPose`.
  - *Persistent (`Postgres`):* `letters_and_gifts (id, world_id, sender_id, recipient_id, kind, item_sku, note, opened_at, created_at)` với RLS chỉ 2 thành viên xem được.
- **Dependencies:** `ClockOffsetEstimator` (`cinemaSync.ts`), BFS pathfinding, **K5** Inventory cá nhân (`V0.1.5`).
- **Acceptance criteria:** Gửi emote & ngồi chung sofa khớp hướng nhìn trên 2 máy qua Wi-Fi & 4G; ngắt ngang bằng chạm bước đi không bao giờ làm kẹt avatar bất động; gửi quà bất ngờ khi đối phương đang offline vẫn giữ nguyên trong hộp thư khi họ mở app hôm sau.
