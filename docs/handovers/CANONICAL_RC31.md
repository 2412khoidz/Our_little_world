# RC3.1 — Kho đồ và trao đổi Dev LAN

Bắt đầu tại RC3 `4ac22e2` trên `integration/olw-canonical-rc3`. Chủ dự án đã duyệt 12/14 tiêu chí RC3. `main` giữ ở `55db4aa`, chờ nghiệm thu RC3.1. Worktree M3g, save canonical và các save RC3 được giữ nguyên.

## Bốn nguyên nhân và kết quả

- **Sức chứa:** RC3 thử chèn ba lô rồi chuyển phần dư mọi giao dịch gameplay vào Đồ giữ hộ. Phần thưởng vẫn được lưu, nhưng nguồn đã hết và UI báo nhận như thường. RC3.1 thử sức chứa của toàn bộ phần thưởng trong bản nháp giao dịch. Nếu một phần không vừa, bản nháp bị bỏ trước khi ghi kho, nguồn, ví hoặc biên nhận.
- **HUD:** Tọa độ neo đáy độc lập của nút tim và nút ngữ cảnh giao nhau khi thanh nhanh vật lý đẩy cụm tác vụ lên. Cụm xã hội và nút trao đổi chuyển lên dưới thanh đầu màn hình trên mobile, với khoảng an toàn và chiều cao panel theo viewport. Nút thao tác, joystick và thanh nhanh giữ vùng dưới.
- **Đồ rơi:** Sau cooldown, RC3 coi mọi di chuyển trong bán kính là muốn nhặt, kể cả bước đi ra. RC3.1 dùng bán kính 26 px và lưu lần người thả bước ra bằng vị trí máy chủ. Phải quay vào mới tự nhặt. Cả hai người đều chờ vật phẩm đáp đất. Nút **Nhặt** trong ba lô cho phép chủ động lấy khi không thể bước ra. Bước lại vào hoặc nhặt thủ công giữ nguyên điều kiện sức chứa, phiên bản và biên nhận.
- **Dụng cụ:** Migration RC3 chuyển gói khởi đầu chung vào kho nhà. Một chồng chung không cấp quyền riêng cho Nắng. Tại nhà, mỗi người mở ba lô và dùng **Nhận dụng cụ cơ bản**. Quyền xem theo người và loại dụng cụ, kể cả người vào sau hay save đã chuyển. Phiên bản nâng cấp còn dùng được trong ba lô đáp ứng loại tương ứng. Bộ cơ bản gồm cuốc, bình tưới, bình nước và cần câu. Xẻng hiện có icon nhưng chưa có SKU trong catalog Dev LAN.

### Ba lô đầy

| Nguồn | Kết quả |
|---|---|
| Đồ rơi | Nhặt phần vừa, báo số đã nhặt và số còn. Nếu không vừa món nào, giữ nguyên cả chồng. |
| Luống, quả, hoa, sản phẩm chăn nuôi, xưởng nông trại và xưởng làng | Cần đủ chỗ cho toàn bộ phần thưởng. Nếu thiếu, giữ nguyên nguồn và báo “Ba lô đầy — vật phẩm vẫn ở đây.” |
| Mua hạt và vật phẩm qua chợ nông trại | Cần đủ chỗ. Ví, số lượng kho và biên nhận mua chỉ cập nhật cùng lúc khi giao được. |
| Cá đã chốt, quà thư và hoàn vật phẩm đang giữ | Chèn phần vừa, phần dư vào Đồ giữ hộ của người nhận. Thẻ cá nói rõ khi có phần chuyển Đồ giữ hộ. Đếm Đồ giữ hộ hiện trên HUD và trong ba lô. Mở ngăn tại tủ lạnh. |
| Trao đổi trực tiếp | Tính sức chứa sau khi trừ cả hai đề nghị trong bản nháp. Nếu một bên không đủ chỗ, cả hai giữ nguyên kho. |

Sức chứa dùng quy tắc stack hiện có theo SKU, phẩm cấp, metadata, định danh cá thể, giới hạn và ô khóa. Đồ giữ hộ theo người, vẫn thấy số lượng của chính mình sau tải lại. Chồng rơi chỉ gộp khi tương thích và cùng người thả chưa ghi nhận việc rời vùng nhặt.

## Quyền dụng cụ và giao dịch

Mỗi loại dụng cụ gắn với một lần cấp bù đã lưu theo người. Nếu cả phần còn thiếu chưa vừa ba lô, quyền vẫn còn và kho giữ nguyên. Đồ được cấp gắn với ba lô cá nhân và dùng được trong gameplay. Chỉ chuyển vị trí trong ba lô. Kho chung, đồ rơi, bán, thư và trao đổi trực tiếp không nhận các món này. Đồ sở hữu từ trước vẫn theo các luật cũ, không bị thay thế. Item Progression có thể thêm các loại tương thích mới qua danh sách dụng cụ và định nghĩa metadata.

Trao đổi mở trong phạm vi 56 px, cùng bản đồ và cùng nhà. Có lời mời 25 giây, nhịp mời lại 8 giây, đề nghị hết hạn sau 2 phút nếu không cập nhật. Hai người có thể tặng một chiều, chọn từng phần chồng hoặc chuyển dụng cụ hợp lệ kèm ID, độ bền và phẩm cấp. Mọi sửa đổi đề nghị bỏ xác nhận hai bên. Khi chốt, server kiểm tra phiên, hai kết nối đang hoạt động, phạm vi, phiên bản đề nghị, ô, khóa, số lượng và metadata. Phát hiện mất kết nối, kết nối mới, rời phạm vi, hủy hoặc hết hạn thì phiên chưa chốt kết thúc. Phiên đang mở chỉ nằm trong RAM và mất khi relay khởi động lại. 64 biên nhận gần nhất trong save cho phép phát lại xác nhận đã chốt mà không chuyển vật phẩm lần nữa.

## Kiểm tra và save

- Vitest tập trung: `npx vitest run --maxWorkers=2 rc31InventoryCoop inv2GameplayTransactions physicalInventoryAuthority physicalInventory.test fishingCatchModal` đạt 39/39 ca trong 5 suite. Kiểm tra ma trận sức chứa, nhiều phần thưởng, giữ nguyên nguồn và ví qua yêu cầu song song, cá vào Đồ giữ hộ riêng của đúng người và phát lại qua restart, phần dư đồ rơi, dụng cụ mỗi người và mọi trường hợp chính của giao dịch. Hai ca nhặt tức thời cũ được cập nhật theo yêu cầu cả hai người phải đợi đáp đất. Ca mua trong fixture dùng đúng hợp đồng `itemSku` và `qty` và đã chạy đạt riêng.
- Chromium headless: `npx playwright test rc31-coop.spec.ts physical-inventory.spec.ts --project=chromium-desktop --project=chromium-iphone-16-pro-max` với hai cờ INV.2 và save thử riêng. Ca đồ rơi hai người đạt desktop và mobile. Hai ca RC3.1 đạt khi chạy lại riêng sau khi chờ đồng bộ vị trí và kiểm tra đúng nhãn mobile. Các bố cục kiểm tra gồm 393×873, 430×932 và hai kích thước xoay ngang, có và không fullscreen. Desktop chạy nhận dụng cụ và tặng một phần chồng qua UI.
- `npm run typecheck`, `npm run lint`, `npm run build`, `node scripts/verify-prod-guard.mjs` đều đạt. Lint có 3 cảnh báo Fast Refresh có sẵn. Kiểm tra bundle cũng xác nhận không đóng gói endpoint trao đổi và nút cấp dụng cụ. Không chụp ảnh/video và không chạy lại toàn bộ suite.
- QA riêng `.dev-lan-state-inv2-rc31-qa.json` có Mây và Nắng, 6.297 xu, Nắng đầy 18/18 ô nhưng chồng táo còn chỗ, ba đồ rơi ở nhà và nông trại, nhiều hàng đồ, dụng cụ, luống chín, cây có quả, vật nuôi và thành phẩm xưởng. Chuyển vị trí đồ trong QA bảo toàn số lượng. Cấp hợp lệ thêm đúng 3 món, gồm bình nước cho Mây, bình nước và cần câu cho Nắng. Cuốc và bình tưới đã có sẵn cho cả hai. Tổng 1.280 đơn vị gồm cả đồ rơi.
- INV.2 và trao đổi chỉ hỗ trợ Dev LAN. Safari/PWA thật, gamepad thật, Local Preview và Supabase physical inventory vẫn chờ. Nghiệm thu thủ công M3e tiếp tục ở M3g.

## Chơi thử

```powershell
Set-Location 'C:/Users/admin/Downloads/OLW-integration-rc3'
$source = Join-Path $PWD.Path '.dev-lan-state-inv2-rc31-qa.json'
$play = Join-Path $PWD.Path ".dev-lan-state-inv2-rc31-play-$(Get-Date -Format 'yyyyMMdd-HHmmssfff').json"
[IO.File]::Copy($source, $play, $false)
$env:OLW_DEV_LAN_STATE_FILE = $play
$env:OLW_DEV_LAN_PHYSICAL_INVENTORY = '1'
$env:VITE_OLW_PHYSICAL_INVENTORY = '1'
$env:VITE_OLW_PRIVATE_ART = '1'
npm.cmd run dev -- --host 127.0.0.1 --port 4391 --strictPort
```

Mở [RC3.1 QA](http://127.0.0.1:4391/?extended-world=1) bằng hai cửa sổ riêng. Chọn Mây và Nắng.

1. Nắng thử nhặt táo và món không cùng chồng khi túi đầy. Thử hái quả, thu vật nuôi và xưởng. Dọn ô rồi thử lại. Cá đã chốt khi đầy thì kiểm tra Đồ giữ hộ ở tủ lạnh.
2. Mây thả một món, bước ra khỏi vòng nhặt rồi quay lại. Cho Nắng thử nhặt khi Mây vừa thả.
3. Khi đứng gần nhau, dùng hai mũi tên cạnh tim để mời trao đổi. Thử tặng vài món, đổi đề nghị sau xác nhận và thử giao món Nắng không có chỗ nhận.
4. Trên mobile, thử nút tim, trao đổi, Đi vào và Kho nhà khi xoay ngang hoặc bật toàn màn hình.

Sau khi duyệt, nếu `main` sạch và vẫn ở `55db4aa`, đưa bản nghiệm thu vào main bằng:

```powershell
git -C 'C:/Users/admin/Downloads/Our_little_world' merge --ff-only integration/olw-canonical-rc3
```
