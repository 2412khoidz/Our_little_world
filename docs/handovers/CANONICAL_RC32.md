# RC3.2 — Nghiệm thu giao diện và giới hạn chồng đồ

Bắt đầu từ RC3.1 `04c7749` cộng commit QR và thông báo `3cb71eb`, trên `integration/olw-canonical-rc3`. Canonical `main` vẫn ở `55db4aa`. Save canonical, bản QA cũ và worktree M3g giữ nguyên.

## Giao diện

- **Trao đổi** dùng hai khay đề nghị và lưới ba lô vật lý. Chọn ô để xem số lượng, phẩm cấp, giống hoặc độ bền nếu có. Có nút −, +1, +5, Tối đa, cập nhật và bỏ khỏi đề nghị. Có thể kéo món vào khay của mình trên desktop. Khay đối phương cho xem món và trạng thái xác nhận. Giữ nguyên revision, giao dịch nguyên tử và biên nhận máy chủ.
- **Modal** trao đổi trước đây nằm trong vùng xếp lớp của cụm xã hội, thấp hơn thanh điều hướng. Cửa hàng có wrapper trung gian và danh sách không có giới hạn cuộn riêng. Modal trao đổi được đưa lên vùng modal trong app shell, nằm trong phần tử fullscreen. Cửa hàng, kho vật lý và xưởng dùng khung giới hạn theo viewport và safe area. Header và footer cần thiết giữ vị trí khi cuộn. Thanh điều hướng ẩn lúc mở modal. Chuồng vật nuôi đã có header và vùng cuộn riêng.
- **Cửa hàng** giữ các nhóm hàng và luật giá hiện có. Ví và nút đóng ở ngoài danh sách. Có thể mua ×1, ×5 hoặc ×10 qua cùng giao dịch máy chủ và xem tổng giá trước khi mua.
- **Dải tối** là nhãn món đang cầm `.olw-m-held-pill` của HUD cũ được vẽ trong cùng khu vực với thanh nhanh vật lý. Nhãn và nút bỏ cầm giờ neo theo mép trên thật của thanh nhanh. Mục **Công dụng** của món đang cầm có trong ba lô trên mobile. Kiểm tra hộp giới hạn ở 393×700, 430×932 và 873×380.
- **Câu cá** giữ nguyên sprite và tên cá. Kiểm tra relay thật cho thấy Chill đã trả và lưu đúng biên nhận nhưng bỏ hai trường số lượng và giữ hộ khi truyền dữ liệu sang thẻ. Thẻ kết quả giờ hiện số được thưởng và nơi nhận từng phần. Khi đầy, ghi **“Ba lô đầy, chuyển vào Đồ giữ hộ.”** và hướng dẫn mở kho nhà tại tủ lạnh. Link mời và QR từ commit trước vẫn hoạt động theo cùng một địa chỉ.

## Giới hạn và bảo toàn vật phẩm

Catalog Dev LAN có 119 SKU ở 99 và 141 SKU ở 999. Các mức còn lại là 1, 2, 3, 5, 10 và 30. Kho vật lý giờ dùng trần **99** và giữ các mức catalog thấp hơn. Trang bị cá thể vẫn là **1**. Metadata, phẩm cấp và định danh tiếp tục phân tách chồng. Luật catalog của các hệ cũ giữ nguyên.

| Luồng | Kiểm soát |
|---|---|
| Ba lô, hàng nhanh và kho chung | Cùng phép chèn và sức chứa theo ô. Chồng tương thích được đổ đầy trước, rồi mới dùng ô trống. |
| Tách, kéo, đổi ô, nhận đồ giữ hộ và di chuyển giữa kho | Giới hạn theo đích, giữ nguyên khóa và ID của món cá thể. |
| Đồ rơi | Lệnh thả mới không vượt một chồng. Nhặt một phần giữ phần dư cùng phẩm cấp và metadata. |
| Nông trại, cây quả, vật nuôi, xưởng và mua hàng | Áp giới hạn trong bản nháp giao dịch. Thiếu chỗ giữ lại toàn bộ phần thưởng tự nguyện và số xu. |
| Câu cá, thư và quà | Phần dư vào ngăn giữ hộ hiện có của người nhận. Cả phần trong túi và giữ hộ vẫn được bảo toàn. |
| Trao đổi và dụng cụ | Trao đổi trừ cả hai đề nghị trước khi kiểm tra chỗ để nhận. Dụng cụ dùng ID cá thể và quy tắc gắn người nhận. |
| Save | Giữ ô gốc của chồng quá giới hạn, tách phần dư và đưa phần không vừa ba lô vào giữ hộ cùng người. Giữ kiện dữ liệu rất lớn đã có trong kho và đồ rơi cũ như lượng chờ rút. Mỗi ô nhận vẫn dùng giới hạn vật lý. |

Bản sao save thật `.dev-lan-state-inv2-rc32-owner-copy.json` và báo cáo `.dev-lan-state-inv2-rc32-owner-reconciliation.json` có **2 thành viên, 50 xu, 363 đơn vị, 64 nhóm**. Migration sinh **10 ID** cho trang bị thiếu ID từ nguồn, **0** phần tràn và kiểm tra lặp lại cho cùng kết quả. Bài kiểm tra save vật lý cũ xác nhận tách 301 thành 99 trong ba lô và 99 + 99 + 4 trong giữ hộ, giữ nguyên ô bạc và bảo toàn tổng.

## Kiểm tra

- `npx vitest run --maxWorkers=2 rc31InventoryCoop inv2GameplayTransactions physicalInventoryAuthority physicalInventory.test fishingCatchModal remoteShareModal` đạt 41/41. Ca bổ sung `npx vitest run --maxWorkers=2 rc31InventoryCoop -t 'frees both outgoing'` đạt 1/1, đổi được hai trang bị giữa hai ba lô đầy sau khi giải phóng ô gửi.
- Playwright Chromium chọn hai project desktop và mobile, chạy `rc31-coop.spec.ts` và `physical-inventory.spec.ts`. Ca kho dùng chung từng mở nhầm ba lô trước khi gọi tủ, lỗi có trong thiết lập từ RC3.1. Sau khi bỏ bước đó, ca kho chung đạt trên cả hai project. Kiểm tra cửa hàng bấm mua món cuối, giữ nút đóng và ví trong viewport khi cuộn. Kiểm tra trao đổi cuối cùng qua desktop thấp và mobile 393×700, xác nhận chọn ô không đổi hình học và bấm được xác nhận. Bố cục mobile dùng vùng cuộn để giữ khay và footer ổn định.
- Smoke Chromium với Nắng 18/18 ô và không có chồng cá tương thích. Ca kiểm thử đặt điểm kéo thành công 1000 tại request chốt, relay thật ghi đúng một cá vào giữ hộ của Nắng, giữ kho Mây nguyên và thẻ Chill hiện số lượng cùng câu thông báo. Hai bài kiểm tra riêng của thẻ câu đạt sau khi sửa, gồm hiển thị phần thưởng chia giữa túi và giữ hộ.
- Typecheck, lint, build và production guard. Lint giữ ba cảnh báo Fast Refresh sẵn có. Thiết bị thật, kiểm thử camera QR thật và backend physical inventory Supabase/Local Preview còn chờ. Không chạy bộ test toàn phần, không chụp ảnh/video.

## Dùng save QA

`.dev-lan-state-inv2-rc32-qa.json` được tạo riêng từ RC3.1 QA. Nắng có 18/18 ô, cần câu ở nút 4 và không có chồng cá tương thích. Có chồng sát 99, phẩm cấp khác nhau, đồ rơi, dụng cụ cá thể, cây chín, vật nuôi và xưởng đã chuẩn bị.

```powershell
Set-Location 'C:/Users/admin/Downloads/OLW-integration-rc3'
$fixture = Join-Path $PWD.Path '.dev-lan-state-inv2-rc32-qa.json'
$play = Join-Path $PWD.Path ".dev-lan-state-inv2-rc32-play-$(Get-Date -Format 'yyyyMMdd-HHmmssfff').json"
[IO.File]::Copy($fixture, $play, $false)
$env:OLW_DEV_LAN_STATE_FILE = $play
$env:OLW_DEV_LAN_PHYSICAL_INVENTORY = '1'
$env:VITE_OLW_PHYSICAL_INVENTORY = '1'
$env:VITE_OLW_PRIVATE_ART = '1'
npm.cmd run dev -- --host 127.0.0.1 --port 4396 --strictPort
```

Mở [RC3.2 QA](http://127.0.0.1:4396/?extended-world=1) bằng hai cửa sổ riêng.

1. Hai người đứng gần nhau, thử trao đổi bằng lưới, chỉnh số lượng rồi xác nhận. Đổi đề nghị sau một lần xác nhận.
2. Mở cửa hàng, cuộn đến món cuối và thử mua. Xoay ngang và thu chiều cao cửa sổ để kiểm tra nút đóng.
3. Dùng Nắng câu khi ba lô đầy, xem số cá và phần vào giữ hộ. Lấy cá ở tủ lạnh khi có chỗ.
4. Kiểm tra nhãn món đang cầm ở trên hàng nhanh. Với chồng táo 95, thử nhặt 4 táo ở nhà và xem ô đạt 99.

Sau khi chủ dự án duyệt, nếu `main` sạch và vẫn ở `55db4aa`:

```powershell
git -C 'C:/Users/admin/Downloads/Our_little_world' merge --ff-only integration/olw-canonical-rc3
```
