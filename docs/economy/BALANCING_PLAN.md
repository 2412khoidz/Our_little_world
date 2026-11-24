# Kế hoạch Cân bằng & Mục tiêu Pacing (`BALANCING_PLAN`)

*Nguyên tắc: Mọi tham số giá, thời gian, chất lượng và ngưỡng mở khóa phải nằm trong **file config duy nhất** (`src/shared/economy/catalogConfig.ts` dùng chung để sinh SQL seed và chạy Simulator), tuyệt đối không sửa rải rác trong code logic.*

---

## 1. Sources & Sinks

| Nguồn xu vào (`Sources`) | Điểm thoát xu (`Sinks`) | Cơ chế kiểm soát lạm phát |
|---|---|---|
| Bán Shipping Bin / NPC trực tiếp (`earned`) | Hạt giống, mồi cao cấp, gia vị tiêu hao (Sinks tuần hoàn) | Bão hòa mềm (`0.70` floor) chống 1 cây cày tiền tuyệt đối |
| Hoàn thành Đơn hàng & Nhà hàng (`earned`) | Nội thất 4 bộ sưu tập & đồ chơi thú cưng | Đơn hàng giới hạn 3 slot active / chu kỳ làm mới |
| Mini-game co-op & theo lượt (`granted`) | Nâng cấp công cụ & bếp (3 bậc) | Trần thưởng mini-game theo giờ (`reward_cap_hourly`) |
| Thành tựu / Quà mở khóa lần đầu (`granted`) | Mở rộng nhà, nhà kính, ao cá, khu chợ (`V0.2.4+`) | Giá trị thưởng cố định 1 lần theo từng cấp |

> **Cấm nguồn thưởng vô hạn:** Tương tác tình cảm cặp đôi (`ôm/nhắn/emote`) = `0 xu`; học Pomodoro chỉ tặng token trang trí/thưởng tối đa 1 lần mỗi phiên xác nhận (giới hạn mềm trong ngày để không biến việc học thành cày game).

---

## 2. Đối chiếu Mục tiêu Pacing & Kết quả Đo Sơ bộ (PoC `econ-check.mjs`)

> [!NOTE]
> Các con số dưới đây là **kết quả PoC sơ bộ (`econ-check.mjs`, seed `20261125`)** chạy mô phỏng đơn giản ngoài repo — **chưa phải simulator đầy đủ** sau khi triển khai V0.2.0. Dùng làm mốc tham chiếu ban đầu.

| Mốc phần thưởng | Ngân sách gợi ý | Mục tiêu thiết kế đề bài | Thời gian thực chơi ước lượng (`PoC`) | Kết luận điều chỉnh |
|---|---|---|---|---|
| **Trang trí nhỏ** | `35–60 xu` (ví dụ `45c`) | `5–15 phút` | `12m` (`casual`) / `15m` (`decorator`) / `22m` (`coop`) | Casual/decorator trong dải, co-op vượt dải; giả định ví khởi đầu V0.2.0 (`120c`) giúp mua ngay món đầu tiên + vẫn giữ động lực kiếm thêm. |
| **Đồ chơi pet** | `65–90 xu` (ví dụ `80c`) | `10–20 phút` | `22m` (`coop/optimizer`) / `24m` (`casual`) | Các persona nêu trên đều vượt trần 20 phút. Giữ đây là điểm cần hiệu chỉnh. |
| **Nội thất đẹp** | `140–220 xu` (ví dụ `180c`) | `30–60 phút` | `36m` (`casual`) / `44m` (`coop`) / `60m` (`decorator`) | Đạt đúng dải `30–60 phút`. |
| **Hoàn thiện 1 góc phòng** | `320–550 xu` (ví dụ `420c`) | `1–3 giờ` | `72m = 1.2h` (`casual`) / `88m = 1.5h` (`coop`) / `132m = 2.2h` (`solo`) | Nằm gọn trong dải `1–3 giờ`. |
| **Mở rộng nhà cấp 1** | `1,200–1,800 xu` (ví dụ `1,400c`) | `3–8 giờ tích lũy` | `220m = 3.7h` (`coop`) / `228m = 3.8h` (`casual`) / `418m = 7.0h` (`solo`) | Nằm gọn trong `3–8 giờ`; người chơi ít (`long_absence` 1 lần/tuần) đạt mốc nội thất đẹp mà không nản. |

---

## 3. Quy trình Chỉnh số liệu Bằng Config
1. Thay đổi tham số hệ số (`W`, `SELL_MULTIPLIERS`, `SATURATION_THRESHOLD`, `SINK_COSTS`) trong 1 file `catalogConfig.ts`.
2. Chạy `npm run economy:sim` kiểm tra không gãy pacing hoặc tạo arbitrage.
3. Chạy generator cập nhật SQL catalog migration cho Supabase & Dev LAN trước khi phát hành bản cân bằng mới.

Đã chạy lại PoC của Carbon. Nó dùng thu nhập giả lập, không thực hiện các lần mua hoặc trừ sinks, chỉ chạy 6 persona ở ngày 30, và phép thử arbitrage chỉ xét bán lại trực tiếp hoặc một công thức không có công/thời gian. Kết quả chưa chứng minh pacing, nguồn cung vô hạn hoặc tính toàn vẹn transaction phía DB.
