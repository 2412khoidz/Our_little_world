# RC3 — Nghiệm thu hợp nhất Dev LAN

Worktree `C:/Users/admin/Downloads/OLW-integration-rc3`, nhánh `integration/olw-canonical-rc3`. `main` giữ ở `55db4aa8c8f86ca89df9b1b95d8164d7e2d426c8` với bản sao Git `backup/pre-canonical-rc3-55db4aa`. `origin/main` lúc bắt đầu ở `fe1937b`. Worktree RC3 bắt đầu từ local main để giữ các commit chủ dự án đã hợp nhất.

| Nguồn | Commit | Xử lý |
|---|---|---|
| `fix/inventory-integrity` | `5be8de5505b38c14d6e904f828880bdec85fa08a` | Tổ tiên của main, giữ nguyên |
| `fix/billiards-room-lifecycle` | `2fe46b1`, `5d98508` | Tổ tiên của main, giữ nguyên V4.1 và Room Lifecycle Fix |
| `feat/farming-fishing-visuals` | `450765d` | Merge `5b8ce18`, giữ cả CSS phân trang cũ và mô tả vật phẩm |
| `feature/inv2-physical-inventory` | `89916dbb3c69fe4d58a67d09dea37db769182902` | Merge `337b068`, gồm `68a2a4c` và `310cefa` |
| `research/r1-deep-farming` | `d73a1c0acdbd2e4f2a27f452c4a9ae09151556b2` | Merge tài liệu `815bfde` |

INV.2 xung đột ở nhật ký, Chill, lớp tương tác và cổng xác thực thao tác, event bus, WorldScene, client và tuyến donor. Giữ nội dung nhật ký của cả hai nhánh. Cả Chill và Tension gửi định danh lượt vật lý `castId` cùng `roundSeed` của luồng M3e. Các nút tại ruộng, cây, vật nuôi và xưởng vẫn đi qua giao dịch gameplay, dùng túi chiếu từ ba lô khi bật INV.2. Giữ đồng thời animation dưới modal, neo tủ kho, J/K, gamepad, cách đổi hàng và cờ Dev LAN. Phase A của M3g vẫn ở worktree riêng với các bản vá của chủ dự án.

## Phạm vi và kiểm tra

| Luồng | Kiểm chứng trên RC3 |
|---|---|
| Ô túi, kho chung, phẩm cấp và metadata | Vitest ô/giao dịch, Chromium đổi hàng và hai người tranh chồng cuối. Kiểm tra ô ổn định khi tiêu hạt, quà vào Đồ giữ hộ khi đầy và hoàn nguyên đúng metadata. |
| Ruộng, phân bón, vòi, cây quả và hoa | Chromium dùng J để cuốc, gieo và hái quả trực tiếp. Smoke trên bản sao QA xác nhận +3 quả anh đào. Giao dịch server kiểm tra phân, vòi, hoa và thưởng qua ba lô. |
| Vật nuôi | Chromium xác nhận J vuốt ve đúng Gà Bông. Kiểm tra thu sản phẩm qua phím trên lời nhắc ghi đúng một lần thu và 2 trứng vàng trong túi, khớp biên nhận server. Server kiểm tra cho ăn, thu sản phẩm và chống nhân đôi khi gửi đồng thời. |
| Tám xưởng, chợ, bán, đơn, thư và mèo | Server kiểm tra cả tám xưởng, hoàn nguyên liệu đúng người góp, mua và bán đúng phẩm cấp, giao đơn một lần, quà/giữ hộ và thức ăn mèo. |
| Chill/Tension | Chromium quăng cần từ ô trang bị và kiểm tra tiêu mồi. Vitest kiểm tra thẻ kết quả, thoát, nhận lại cùng lượt và server chỉ ghi thưởng một lần. Nghiệm thu câu cá thủ công chuyển sang M3g. |
| Đồ rơi | Chromium hai client kiểm tra hiển thị theo bản đồ, tranh nhặt cùng chồng và nhặt tự động. Vitest kiểm tra vị trí phía trước, cooldown, phần dư khi đầy, ghi bền và phát lại giao dịch sau nạp save. |
| Điều khiển, mạng và Bi-a | Chromium kiểm tra J/K, WASD, đổi bản đồ, phím số, Shift, touch, gamepad mô phỏng, WebSocket và kết nối lại. Vitest chạy cả hai suite Billiards Room Lifecycle và Multiplayer Hardening. |

Đồ rơi nằm trong chính trạng thái kho vật lý. Máy chủ chọn ô trước mặt, xét chặn bản đồ, độ cao, đồ đạc và cây quả, rồi thử ô bên cạnh hoặc ô đang đứng khi bị chặn. Cùng bản đồ, chồng gần nhau do cùng người thả có thể gộp nếu tương thích. Mỗi thế giới tối đa 64 thực thể và không tự mất theo giờ. Phaser giữ sprite theo ID trên bản đồ hiện tại, dùng hình SKU từ atlas hoặc nguồn icon đã đăng ký, bóng, chuyển động hạ xuống rồi nhấp nhô và số lượng. Sau 850 ms người thả có thể nhặt lại. Khi người chơi đi tới gần, client gửi lệnh nhặt qua giao dịch máy chủ; phần không vừa túi vẫn nằm trên đất.

`instanceId`, `durability`, `quality` và JSON lồng nhau được bảo toàn. Gộp stack dựa trên SKU, phẩm cấp và metadata; thiết bị có ID riêng giữ từng cá thể. Gene hạt/hoa, giống cây và thuộc tính đồ câu có thể dùng metadata có schema/version theo hệ thống. Các hệ tương lai còn phải truyền metadata từ hạt sang cây rồi sang phần thưởng, định nghĩa giới hạn và xác thực dữ liệu. Xem [hợp đồng và kết quả INV.2d](../reports/INV2D_GAMEPLAY_AND_OWNER_SAVE.md).

### Lệnh kiểm tra và kết quả

- `npm run typecheck`, `npm run lint`, `npm run build`, `node scripts/verify-prod-guard.mjs`, `npm run assets:private:verify`. Lint 0 lỗi, 3 cảnh báo Fast Refresh có sẵn. Build có cảnh báo kích thước chunk, production guard kiểm 7 bundle và precache.
- `npx vitest run --maxWorkers=2 --testTimeout=15000 billiardsRoomLifecycle physicalInventory inv2GameplayTransactions donorFishingCompletion deepFarmContextActions ranchVisuals fishingCatchModal multiplayerHardening`. Đợt đầu 49 ca đạt và 2 ca bảng câu thất bại. Sau khi bổ sung cập nhật `roundSeed` ở Chill và kiểm tra cả `castId`, `npx vitest run --maxWorkers=2 fishingCatchModal` đạt 2/2.
- `npx vitest run --maxWorkers=2 physicalInventoryAuthority farmVisualScaleParity farmingSpriteAtlas livestockVisualController interactionActionGate mobileInteractablesAndHud inventoryRules` đạt 24/24. Bộ Vitest toàn phần không chạy trong đợt tích hợp.
- Với hai cờ INV.2, `npx playwright test inv2-gameplay.spec.ts inv2-world-controls.spec.ts physical-inventory.spec.ts farming-fishing-visuals.spec.ts --project=chromium-desktop` đạt 8 ca, bỏ qua touch ngoài project và phát hiện một ca nhặt tự động có race sau đổi bản đồ. Sau khi đọc vị trí theo frame tương tác, lệnh `npx playwright test physical-inventory.spec.ts inv2-world-controls.spec.ts --project=chromium-desktop --project=chromium-iphone-16-pro-max --grep 'dropping and concurrent|touch interaction button'` đạt 3 ca, bỏ qua touch ở desktop.
- Tắt hai cờ, `npx playwright test inv2-world-controls.spec.ts multiplayer-ws-hardening.spec.ts --project=chromium-desktop --grep 'J dispatches|WASD resumes|connects over WebSocket'` đạt 3/3. Luồng legacy và reconnect chạy qua save thử riêng. Không có ảnh hay video.
- Smoke QA bằng Chromium headless và log giao dịch. Sau khi khởi động relay lại vẫn thấy hai đồ rơi. Assertion ban đầu cho thu trứng giả định sai phím và số lượng. Trạng thái lưu cùng biên nhận xác nhận một lần thu cho 2 trứng vàng, đúng kết quả máy chủ. Nghiệm thu trên thiết bị thật vẫn chờ.

## Save và lệnh chạy

- Save chính giữ nguyên byte. Backup `.dev-lan-state-inv2-rc3-owner-backup-20261128-105826.json`, bản chơi `.dev-lan-state-inv2-rc3-owner-20261128-105826.json`, báo cáo `.dev-lan-state-inv2-rc3-owner-reconciliation-20261128-105826.json`. Công cụ xác nhận 2 thành viên, 50 xu, 363 đơn vị và 64 nhóm. Sinh 10 ID trang bị vì dữ liệu nguồn thiếu ID; giữ nguyên phần ngoài kho, phẩm cấp và metadata nguồn. Đối soát báo 0 đơn vị tràn. Migration chạy lại cho cùng kết quả.
- QA `.dev-lan-state-inv2-rc3-qa-ready.json` có 6.297 xu, 1.277 đơn vị của 125 nhóm gồm 4 táo và 6 hạt lúa trên sàn nhà. Có dụng cụ, cần, mồi, phân, vòi, ba lô có vật phẩm ở nhiều hàng và kho đủ nguyên liệu cho tám xưởng. Có 5 luống chín, 3 cây có quả, 7 con có sản phẩm, 6 con cần ăn, 3 xưởng có thành phẩm, 2 xưởng đang chạy khi tạo và 3 xưởng nghỉ. Thời gian xưởng tiếp tục theo đồng hồ.
- Lệnh mặc định mở QA. Đổi `$acceptance` sang `'owner'` để mở bản sao save thật. Mỗi lần chạy tạo bản sao chơi riêng.

```powershell
Set-Location 'C:/Users/admin/Downloads/OLW-integration-rc3'
$acceptance = 'qa'  # Đổi thành 'owner' để chơi bản sao save thật
$source = switch ($acceptance) {
  'qa'    { '.dev-lan-state-inv2-rc3-qa-ready.json' }
  'owner' { '.dev-lan-state-inv2-rc3-owner-20261128-105826.json' }
  default { throw 'Chọn qa hoặc owner' }
}
$playSave = Join-Path (Get-Location).Path ".dev-lan-state-inv2-rc3-play-$((Get-Date).ToString('yyyyMMdd-HHmmssfff')).json"
[IO.File]::Copy((Join-Path (Get-Location).Path $source), $playSave, $false)
$env:OLW_DEV_LAN_STATE_FILE = $playSave
$env:OLW_DEV_LAN_PHYSICAL_INVENTORY = '1'
$env:VITE_OLW_PHYSICAL_INVENTORY = '1'
$env:VITE_OLW_PRIVATE_ART = '1'
npm.cmd run dev -- --host 127.0.0.1 --port 4387 --strictPort
```

Mở [RC3 trên máy Windows](http://127.0.0.1:4387/?extended-world=1). Dùng cửa sổ riêng cho người chơi thứ hai.

1. Chọn Mây và Nắng. Đi tới táo hoặc hạt trên sàn, thử thả và cùng nhặt. Thử lại khi túi đầy và sau khi tải lại trang.
2. Đứng gần tủ lạnh, dùng J để mở kho; dùng I cho ba lô, 1–9 để chọn và Shift để đổi hàng. Thử J/K và WASD sau khi đóng bảng.
3. Qua ruộng thử hái quả, thu hoạch, vuốt ve, cho ăn và lấy sản phẩm, rồi nhận thành phẩm ở xưởng. Kiểm tra số lượng trong ba lô.
4. Mở Bi-a 3D, kết thúc ván và tái đấu trong cùng phòng. Kiểm tra người khai cuộc luân phiên.
5. Mở bản owner để so tiến trình thật và xác nhận trước khi đưa RC3 vào main.

INV.2 hiện chỉ bật trên Dev LAN với hai cờ. Local Preview và Supabase giữ luồng kho cũ. Còn chờ iPhone Safari/PWA thật, gamepad thật, nghiệm thu tích hợp và acceptance thủ công M3e tại M3g.

Sau khi chủ dự án duyệt, xác nhận main sạch và vẫn ở `55db4aa`, rồi chạy:

```powershell
git -C 'C:/Users/admin/Downloads/Our_little_world' merge --ff-only integration/olw-canonical-rc3
```
