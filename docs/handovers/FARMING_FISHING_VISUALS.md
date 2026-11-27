# M3d + M3e — Playtest hình ảnh trang trại và câu cá

**Đã triển khai trên `feat/farming-fishing-visuals` từ Canonical RC2 `fe1937b`, chờ chủ dự án duyệt hình ảnh.**

## Máy chế biến và hiệu ứng trang trại

| Xưởng | Strip của Farm & Ranch Life |
|---|---|
| Cối xay bột & ép dầu | `oil_maker` |
| Xưởng sữa & phô mai | `cheese_press` |
| Tiệm bánh nông trại | `furnace` |
| Xưởng mứt & đồ muối | `preserves_jar` |
| Cối trộn thức ăn & phân bón | `seed_maker` |
| Xưởng dệt len thủ công | `loom` |
| Tiệm hoa & nến thơm | `bee_house` |
| Bếp hợp tác gia đình | `mayonnaise_machine` |

Mỗi strip có 6 ô 16×32. Frame 0 là nghỉ, frame 1–4 chạy ở 6 fps và frame 5 báo có thành phẩm. Khi hàng đợi đồng thời có mẻ đã xong và mẻ đang chạy, máy ưu tiên báo thu thành phẩm, bảng xưởng vẫn hiển thị tiến độ từng mẻ. Tám máy dùng chung mốc xưởng Meadowbrook trong trang trại.

- Cuốc, gieo, tưới và thu hoạch phát VFX tại ô vừa đổi trạng thái. Bản cập nhật kế tiếp từ bạn chơi có cùng VFX. Luống chín dùng vòng lấp lánh nhẹ.
- Thu hoạch cây giữ tán LPC đang dùng. Đào, táo, anh đào, cam, chanh, mận, lê, lựu và sung dùng phần quả rơi trích từ donor. Óc chó, ô liu và cacao dùng rung cây cùng hiệu ứng thu hoạch vì gói không có strip tương ứng. Cây mơ trong gói donor không thuộc vườn hiện có.
- Trái tim vuốt ve dùng vị trí hiện tại của vật nuôi. Thay đổi phiên bản, số lượt hái và danh sách người vuốt ve tách sự kiện mới khỏi gói dữ liệu lặp. Đổi bản đồ và đóng scene hủy hiệu ứng tạm cùng hẹn giờ máy.

## Câu cá

- Chill mặc định ở các điểm hiện hành. Tại suối phía Đông, chọn **Kéo dây giữ lực** để vào Tension, rồi chọn **Câu theo nhịp** để quay lại Chill.
- Phao nổi, cá cắn, gợn nước, bọt và dây câu lấy trạng thái trực tiếp từ lượt câu. Tension bắt đầu kéo ngay theo luật hiện có. Mỗi chế độ chờ kết quả từ server trước khi hiện cá đã bắt.
- Giữ ngoại hình Cozy Human. Cử động quăng cần dùng chuyển động dùng dụng cụ hiện có, góc cần và quỹ đạo phao. Chưa có bộ frame quăng riêng cho đủ kiểu tóc và trang phục OLW.
- Cả hai bảng câu dùng `GlobalViewportProvider`. Đóng bảng trả lại focus do mini-game sở hữu và giữ toàn màn hình nếu vào từ HUD.
- Cá bống nhỏ dùng sprite minnow 16×16 từ donor. Các cá khác dùng ảnh đã khớp với registry hiện có.

## Mở save DEV cô lập

```powershell
Set-Location 'C:\Users\admin\Downloads\OLW-feat-farming-fishing-visuals'
$env:OLW_DEV_LAN_STATE_FILE = Join-Path (Get-Location) '.dev-lan-state-m3-acceptance.json'
$env:VITE_OLW_DONOR_ECONOMY = '1'
$env:VITE_OLW_PRIVATE_ART = '1'
npm run dev -- --host 127.0.0.1 --port 4216 --strictPort
```

Mở [localhost cổng 4216](http://127.0.0.1:4216), chọn Mây hoặc Nắng. Save lúc tạo có 3.152 xu, bộ công cụ và cần câu, mồi, nguyên liệu xưởng, 4 luống chín, 3 cây sẵn quả và 7 loài vật nuôi. Cối bột có mẻ đã xong. Bếp và tiệm hoa bắt đầu với mẻ đang chạy. Khi để lâu, các mẻ này chín theo thời gian của game.

Để chạy lại đủ ba trạng thái ngay khi mở, tạo bản mới bằng DEV API có sẵn và trỏ biến môi trường sang bản đó trước khi chạy server. Trình tạo dùng thời gian mô phỏng trong tiến trình seeding riêng để có cây chín.

```powershell
$playtestSave = '.dev-lan-state-m3-acceptance-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.json'
node scripts/seed-farming-visual-playtest.mjs $playtestSave
$env:OLW_DEV_LAN_STATE_FILE = Join-Path (Get-Location) $playtestSave
npm run dev -- --host 127.0.0.1 --port 4216 --strictPort
```

Trong **Trang trại**, đi tới xưởng Meadowbrook và tương tác. Dùng cuốc, hạt, bình tưới và thu hoạch trên luống đầu. Mở **Hoa lai & Vườn cây ăn quả** hoặc **Chuồng vật nuôi chung** trong Menu để thực hiện các thao tác. Ao câu Chill ở phía đông bắc trang trại. Lối suối Đông nằm ở rừng.

## Môi trường kiểm tra

Bằng chứng hình ảnh dùng Chromium desktop và giả lập Chromium 430×932 / 932×430. Nghiệm thu trên iPhone Safari thật, Add to Home Screen và Supabase Cloud còn chờ. Ảnh, clip và save được lưu ngoài Git.

### Kết quả và bằng chứng

- 37 bài Vitest tập trung qua, gồm khung máy, trạng thái đã xác nhận, dọn hiệu ứng, asset whitelist, tỷ lệ vật nuôi, phần thưởng câu cá và HUD mobile.
- Chromium desktop qua bài hai người chơi xưởng/câu cá, bài canh tác co-op và bài vòng đời fullscreen mới. Chromium giả lập iPhone qua bài fullscreen mới ở cả hai tư thế và xác nhận đóng bảng giữ phiên toàn màn hình của HUD. Bài hai người chơi cũ trên project mobile dừng ở selector `menu-donor-workshop`. Lỗi cùng bước được tái hiện khi test trỏ vào máy chủ RC2 `fe1937b`.
- Typecheck, build, production guard và private asset verification qua. ESLint có 0 lỗi và 3 warning đã có ở `GlobalViewportContext.tsx`.
- Hai atlas mới gồm 27.698 byte PNG/JSON. Tổng JS tăng 20.577 byte minified (6.876 byte gzip), CSS tăng 4.095 byte (936 byte gzip) so với bản build RC2 cùng máy. Các atlas M3b/M3c giữ nguyên byte.
- Thư mục bằng chứng trên máy này là `C:\Users\admin\Downloads\OLW-M3d-M3e-evidence`. `compare-rc2.png` ghép ảnh trước/sau. Các ảnh `after-*.png` và clip `gameplay-*.webm` ghi từ phiên chơi DEV cô lập, gồm lượt câu thành công với cả Chill và Tension.
- Chồng lấn với `fix/inventory-integrity` ở `src/app/App.tsx` và `docs/PROGRESS.md`. Phần App của M3d/M3e chuyển phiên bản snapshot sang scene và giữ lớp hiển thị chạy dưới bốn bảng liên quan.
- Bộ Vitest đầy đủ với `--maxWorkers=1` chạy 931 bài qua. Lệnh trả mã lỗi vì hai suite RC2 dùng Canvas 2D trong jsdom: `donorCabacosRenderDetect.test.ts` và `pydewFarmDonorRender.test.ts`.
