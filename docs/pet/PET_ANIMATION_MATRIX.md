# Ma trận Animation & Âm thanh Thú cưng (`PET_ANIMATION_MATRIX`)

*Kiểm chứng thực tế từ `asset-candidates/extracted/free-pets-pack/README.txt` và `cat-orange/cat-orange_16px_top-down.json` (`CC BY 4.0`, credit `Frakassets`). Tuyệt đối không khai khống frame không tồn tại.*

---

## 1. Dữ liệu Spritesheet Thực tế Đã Xác minh (`cat-orange`)

- **File nguồn:** `cat-orange_16px_top-down_outline_lit.png` + `_shine.png` + `_shadow.png` (`192×256px`, cell `16×16px`, góc nhìn 45° top-down, `12 FPS`, tổng **`128` frames**). Ngoài ra có sẵn layer `_unlit.png` phục vụ đổi màu lông `0₫`.
- **4 Nhóm Animation Gốc (Mỗi nhóm đủ 4 hướng: `South`, `East`, `North`, `West`):**
  1. `Happy_*` (`24` frames tổng: `6 frames/hướng`) — nhảy nhót, vẫy đuôi, lắc người mừng rỡ.
  2. `Idle_*` (`32` frames tổng: `8 frames/hướng`) — thở, ngó nghiêng, cử động tai & đuôi nhẹ.
  3. `Sleep_*` (`48` frames tổng: `12 frames/hướng`) — cuộn tròn nằm ngủ, nhắm mắt, phập phồng thở.
  4. `Walk_*` (`24` frames tổng: `6 frames/hướng`) — bước đi 4 hướng rõ nét.

---

## 2. Ánh xạ 16 Hành vi Sang Sprite Hiện có (`0₫` Không Tốn Phí)

| Hành vi mục tiêu | Có sheet riêng trong Free pack? | Giải pháp hiển thị trung thực ở `0₫` (Sprite + Tween + Particle) | Micro-motion / Biểu cảm kèm |
|---|---|---|---|
| **Idle** | **Có (`Idle_*`, 8f)** | Chạy thẳng animation `Idle_*` (đã có sẵn cử động tai, đuôi, thở tự nhiên) | Chớp mắt/bong bóng tâm trạng nhỏ |
| **Walk** | **Có (`Walk_*`, 6f @ 10–12 FPS)** | Chạy thẳng `Walk_*` di chuyển theo lưới 16px | Đổ bóng `_shadow.png` |
| **Run (Chạy đón / Đuổi)** | Không có sheet riêng | Phát `Walk_*` tốc độ **`16–18 FPS`** + nâng tốc độ di chuyển `1.8×` | Hạt bụi nhỏ phía sau chân |
| **Sit (Ngồi chờ / Câu cá)** | Không có sheet riêng | Giữ frame `Idle_*[0..2]` + nhún nhẹ Y (`0..-1px`) | Nốt nhạc hoặc mắt chăm chú |
| **Lie down (Nằm thư giãn)** | Không có sheet riêng | Giữ frame đầu của `Sleep_*` hoặc `Sleep_*` với bong bóng không chữ `"~"` thay `"Zzz"` | Đuôi ve vẩy chậm |
| **Sleep (Ngủ sâu)** | **Có (`Sleep_*`, 12f @ 6 FPS)** | Chạy `Sleep_*` ở `6 FPS` cho nhịp thở ngủ sâu | Hạt pixel `"Zzz"` trôi chậm |
| **Eat / Drink (Ăn / Uống)** | Không có sheet riêng | Đứng trước bát gốm `South/East/West`, xen `Happy_*` nhịp chậm + nghiêng `tween scaleY` | Biểu tượng hạt/giọt nước + tim nhỏ |
| **Groom (Liếm lông)** | Không có sheet riêng | Đứng yên `Idle_*` xen kẽ nhịp `Happy_*` biên độ nhỏ | Hạt lấp lánh sạch sẽ `✨` |
| **Stretch (Vươn vai / Cào móng)** | Không có sheet riêng | `Idle_*` kết hợp tween `scaleX: 1.15, scaleY: 0.88` trong `500ms` rồi hồi | Hạt cát/vệt cào khi ở trụ cào |
| **Yawn (Ngáp)** | Không có sheet riêng | `Idle_*` + icon ngáp/giọt nước mắt buồn ngủ trong 1s | Chuyển dần sang `Sleep` |
| **Play / Pounce (Chơi / Rình vồ)** | Không có sheet riêng | Rình = giữ khung thấp + lắc X `±1px`; Vồ = tween nhảy parabol dùng `Happy_*` | Dấu `?` → `!` → tim |
| **Startle / Hide (Giật mình / Trốn)** | Không có sheet riêng | Giật mình = nhảy nảy `scaleY` dùng `Happy_*` frame + icon `!`; Trốn = chui vào tile `cardboard_box` | Ẩn nhẹ alpha bên trong hộp |
| **Affection (Làm nũng / Dụi đầu)** | **Dùng `Happy_*` (6f @ 12 FPS)** | Chạy `Happy_*` quay mặt vào chủ + nhích sát 4px | Chuỗi tim pixel bay lên |

---

## 3. Âm thanh Cooldown & Mute Policy (`V0.1.5+`)
- Dùng âm thanh CC0 / Web Audio synth nhẹ (tiếng *meo*, *rừ rừ purr*, tiếng gặm hạt), **tải lazy**.
- **Cooldown cứng:** Tiếng meo/biểu cảm không phát quá `1 lần / 20 giây` (trừ khi chủ chủ động chạm vuốt ve).
- **Cài đặt:** Nút Mute riêng tiếng thú cưng + tự động tắt âm mèo khi vào **Chế độ học Pomodoro Im lặng** hoặc khi rạp **Cinema** đang phát phim.
