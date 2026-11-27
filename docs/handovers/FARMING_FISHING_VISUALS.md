# M3d + M3e — Playtest hình ảnh trang trại và câu cá

**Đã triển khai trên `feat/farming-fishing-visuals` từ Canonical RC2 `fe1937b`, chờ chủ dự án duyệt hình ảnh.**

## Máy chế biến và hiệu ứng trang trại

| Xưởng | Hình ảnh đang dùng |
|---|---|
| Cối xay bột & ép dầu | Cối gió Hollowmere, bao hạt và bụi xay Farm & Ranch Life |
| Xưởng sữa & phô mai | Thùng đánh bơ và xô sữa Farm & Ranch Life |
| Tiệm bánh nông trại | Lò gạch OLW, lửa và ổ bánh từ kho hình có sẵn |
| Xưởng mứt & đồ muối | Hũ mứt Farm & Ranch Life |
| Cối trộn thức ăn & phân bón | Thùng ủ và bao thức ăn Farm & Ranch Life |
| Xưởng dệt len thủ công | Khung dệt Farm & Ranch Life |
| Tiệm hoa & nến thơm | Mặt bàn OLW, hoa và bó hoa từ atlas vật phẩm |
| Bếp hợp tác gia đình | Bếp gạch, quầy bếp và bát súp từ hình có sẵn |

Mỗi strip có 6 ô 24×32. Frame 0 là nghỉ, frame 1–4 chạy ở 6 fps và frame 5 có ánh báo thành phẩm. Trong bảng xưởng, biểu tượng cạnh máy dùng thành phẩm thật của mẻ đã xong. Khi hàng đợi đồng thời có mẻ đã xong và mẻ đang chạy, máy ưu tiên báo thu thành phẩm, bảng xưởng vẫn hiển thị tiến độ từng mẻ. Tám máy dùng chung mốc xưởng Meadowbrook trong trang trại.

- Cuốc, gieo, tưới và thu hoạch phát VFX tại ô vừa đổi trạng thái. Bản cập nhật kế tiếp từ bạn chơi có cùng VFX. Luống chín dùng vòng lấp lánh nhẹ.
- Thu hoạch cây giữ tán LPC đang dùng. Đào, táo, anh đào, cam, chanh, mận, lê, lựu và sung dùng phần quả rơi trích từ donor. Óc chó, ô liu và cacao dùng rung cây cùng hiệu ứng thu hoạch vì gói không có strip tương ứng. Cây mơ trong gói donor không thuộc vườn hiện có.
- Trái tim vuốt ve dùng vị trí hiện tại của vật nuôi. Thay đổi phiên bản, số lượt hái và danh sách người vuốt ve tách sự kiện mới khỏi gói dữ liệu lặp. Đổi bản đồ và đóng scene hủy hiệu ứng tạm cùng hẹn giờ máy.

## Câu cá

- Chill mặc định ở các điểm hiện hành. Tại suối phía Đông, chọn **Tension · Giữ rồi thả**. Tension kéo khi giữ nút và hạ độ căng khi thả. **Chill · Bấm theo nhịp** quay lại chế độ canh phao rồi bấm khi kim ở vùng xanh.
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

Mở [localhost cổng 4216](http://127.0.0.1:4216), chọn Mây hoặc Nắng. Save lúc tạo có 3.152 xu, bộ công cụ và cần câu, mồi, thức ăn cho vật nuôi, nguyên liệu xưởng, 4 luống chín, 3 cây sẵn quả và 7 loài vật nuôi. Cối bột có mẻ đã xong. Bếp và tiệm hoa bắt đầu với mẻ đang chạy. Khi để lâu, các mẻ này chín theo thời gian của game.

Để chạy lại đủ ba trạng thái ngay khi mở, tạo bản mới bằng DEV API có sẵn và trỏ biến môi trường sang bản đó trước khi chạy server. Trình tạo dùng thời gian mô phỏng trong tiến trình seeding riêng để có cây chín.

```powershell
$playtestSave = '.dev-lan-state-m3-acceptance-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.json'
node scripts/seed-farming-visual-playtest.mjs $playtestSave
$env:OLW_DEV_LAN_STATE_FILE = Join-Path (Get-Location) $playtestSave
npm run dev -- --host 127.0.0.1 --port 4216 --strictPort
```

Trong **Trang trại**, đi sát gốc cây ở vườn phía tây nam. Khi hiện **Hái quả**, bấm phím ghi trên nút hoặc chạm nút. Đi sát vật nuôi đã đón ở đồng cỏ phía đông để thấy **Vuốt ve**, **Cho ăn** nếu có thức ăn phù hợp trong túi chung, hoặc **Thu hoạch** khi có sản phẩm. Đứng trên lối đất phía trước dãy máy, ngay dưới máy cần dùng. Bấm tên máy để mở đúng xưởng. Khi có mẻ xong, **J / Nhận thành phẩm** lấy mẻ và **K / tên máy** mở bảng xưởng. Trên mobile chạm nút tương ứng. Menu vẫn có bảng cây, vật nuôi và xưởng.

Chọn ô vật phẩm trên thanh nhanh rồi mở **Công dụng**, hoặc chọn ô trong **Túi đồ** để xem thông tin. Trong công thức xưởng, tên nguyên liệu hiện cạnh hình và có mục **Công dụng**.

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


## Phản hồi nghiệm thu của chủ dự án

Hái quả, vuốt ve, cho ăn và thu sản phẩm đã có trong bảng Menu từ RC2. Điểm thiếu là đường tương tác tại chỗ. Bản bổ sung lấy tọa độ từ cây, vật nuôi và máy đang hiển thị. Cổng J/K và nút chạm kiểm tra lại thao tác trước khi gọi cùng giao dịch nông trại.

Ở Chill, vòng lặp có thể gửi kết quả cũ lúc đang đợi quăng lại. Gói đồng bộ cũ cũng có thể thay trạng thái đã chốt trong phiên DEV. Bản hiện tại gắn yêu cầu với lượt câu đã mở, giữ kết quả server đã chốt và cho thử nhận lại cùng lượt nếu phản hồi gián đoạn. **Xong** trở về màn chờ. **Quăng lại** bắt đầu lượt mới. Cá, sprite và số lượng nhận được xác minh qua kết quả server.

M3g Phase A ở nhánh `feat/deep-fishing-progression` có engine và authority riêng. Phase B có thể tái sử dụng atlas `ranch-fishing`, `FishingVisualCue`, hàm hiển thị thu dây `fishingReelMotion(progress, elapsedMs, activelyPulling)` và thẻ kết quả. Đưa tiến độ thực của engine M3g vào hàm hiển thị và chỉ hiện cá khi nhận kết quả chốt. `roundSeed` chỉ đối chiếu lượt trong API DEV hiện có. Phần này chưa kết nối phiên M3g.

### Kiểm tra sau chỉnh sửa

- 21 bài Vitest tập trung qua. API Dev LAN trả đúng tên, ảnh và vật phẩm của cá ở ao và suối, phát thưởng một lần, bỏ qua đồng bộ muộn và từ chối yêu cầu lệch lượt. Bài kiểm tra bảng câu xác nhận xem được ảnh cá, quăng lại và quay về màn chờ.
- Chromium tự động xác nhận hái quả, vuốt ve, cho ăn và nhận thành phẩm qua API chạy thật, mở đúng trạm Cối xay bột, đọc được tên nguyên liệu và dùng được nút chạm trên viewport 430 × 932.
- Typecheck, build và production guard qua. ESLint có 0 lỗi và 3 cảnh báo sẵn có ở GlobalViewportContext. Kiểm tra đủ 8 dải máy có khung nghỉ, chạy và sẵn sàng riêng. Đợt này chưa chạy lại toàn bộ bộ kiểm thử, chưa duyệt hình trên iPhone thật.
