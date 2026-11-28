# INV.2d — Gameplay và save thật trên Dev LAN

Nhánh `feature/inv2-physical-inventory` tiếp tục từ giao diện đã duyệt ở `310cefa`. CSS, bố cục thanh nhanh, ba lô và kho nhà giữ nguyên.

## Giao dịch và phạm vi

Máy chủ tuần tự hóa các yêu cầu kho vật lý. Bộ luật gameplay hiện hành nhận một danh sách số lượng dựng từ ba lô của người thực hiện. Danh sách chỉ tồn tại trong bản nháp của yêu cầu. Khi thành công, máy chủ đổi chênh lệch số lượng thành thao tác ô vật lý, bỏ danh sách tạm và lưu trạng thái gameplay, ví và biên nhận cùng lượt. Phản hồi và sự kiện realtime phát sau khi lưu. Save đã chuyển chỉ giữ các ô vật lý để ghi tồn kho.

Cuốc, gieo, tưới, bón và đặt vòi kiểm tra địa chỉ ô cùng ID stack trong hàng nhanh. Những bảng chọn theo SKU dùng các chồng hợp lệ trong ba lô. Ô khóa và chồng được bảo vệ khỏi tự động lấy vẫn được tôn trọng. Phần thưởng gộp theo SKU, phẩm cấp và metadata. Ba lô đầy thì phần dư vào **Đồ giữ hộ** tại tủ lạnh. Giao dịch lỗi giữ nguyên vật phẩm và trạng thái nghiệp vụ.

| Luồng | Điểm nối | Bằng chứng |
| --- | --- | --- |
| Cuốc, gieo, tưới, thu hoạch, phân và vòi | `/farm/apply` | Chromium bấm J để cuốc và gieo. HTTP qua tưới, thu hoạch, bón, đặt và lấy lại vòi. Kiểm tra ô trống, ID và phiên bản sau khi khởi động lại relay. |
| Vườn cây và hoa | `/farm/deep/apply` | HTTP trồng cây và hoa, chạy lượt lai hiện có, hái hoa và thu quả. |
| Vật nuôi | `/farm/deep/apply` | HTTP nhận nuôi, cho ăn từ ba lô và thu sản phẩm. Hai yêu cầu thu cùng mã chỉ cộng một lần. |
| Câu cá hiện hành | `/donor/fishing/*` | Chromium mở điểm câu bằng J và quăng bằng cần trong thanh nhanh. HTTP kiểm tra một mồi mỗi lượt, cần giữ ID/thuộc tính, người kia không chốt được lượt và phát lại kết quả qua restart. |
| Tám xưởng và chế biến làng | `/farm/deep/apply` và `/donor/{workshop,bakery,coop}/*` | HTTP chạy hàng đợi và thu thành phẩm ở cả tám xưởng. Hủy mẻ mới hoàn chồng có cùng phẩm cấp và metadata cho người góp. Tuyến xưởng làng đi qua cùng adapter và chưa kiểm từng công thức qua trình duyệt. |
| Chợ, thùng gom và kho | `/farm/{buy-seed,sell,ship}`, `/inventory/physical` | HTTP mua hạt, bán đúng phẩm cấp. Chromium kiểm tra cất/rút, đổi hàng, hai client rút cùng chồng và nhặt cùng món rơi. |
| Bảng đơn | `/farm/deep/apply` | HTTP giao hàng đổi xu một lần, gồm phát lại cùng mã. |
| Thư, quà và trao giữa hai người | `/mailbox/{send,open}` | HTTP kiểm tra phẩm cấp và metadata của quà. Ba lô người nhận đầy thì quà vào ngăn giữ hộ. Mở lại thư không cộng thêm. |
| Mèo | `/pet/care/apply`, `/pet/consume-hand-food`, `/pet/living/*`, `/inventory/claim-free-kibble` | HTTP bát ăn dùng đúng stack và phát lại an toàn. Đưa bằng tay, tạo và hoàn lời mời đi qua cùng giao dịch. Vòng đời Pet Care 3D trên thiết bị thật chờ nghiệm thu. |

Mẻ đã bắt đầu trước INV.2 giữ nguyên trạng thái. Save cũ không biết ô hoặc người góp của các mẻ này. Các lệnh quản trị ghi kho tổng như spawn và restore của Dev Console vẫn bị chặn khi dùng save đã chuyển.

## Metadata

| Dữ liệu | Hợp đồng hiện tại |
| --- | --- |
| Cần câu và trang bị | `metadata.instanceId` giữ định danh cá thể. `durability` và thuộc tính JSON đi cùng stack khi di chuyển, gửi quà và hoàn trả. Câu hiện tại trừ 1 độ bền khi quăng nếu trường đó có trong save. |
| Cá | `quality` thuộc khóa gộp. Thuộc tính và nguồn gốc riêng lưu trong metadata. Cá thể cần định danh có thể dùng `instanceId` và nằm một món mỗi ô. |
| Genotype hạt và hoa, tính trạng cây, giống đặt tên | Hỗ trợ object và array JSON lồng nhau. Đổi thứ tự khóa object vẫn gộp được. Khác genotype, giống hoặc tính trạng thì tách stack. Domain tương lai cần đưa metadata vào bản ghi khi gieo và trả thuộc tính vào vật phẩm khi thu hoạch. |
| Nguồn gốc | `provenance` có thể là JSON lồng nhau. Hai nguồn gốc khác nhau tách stack khi trường này có mặt. Kiểm tra giao dịch đã dùng provenance trên quà và nguyên liệu hoàn lại. |

Khi có hệ mới tạo metadata, cần schema và giới hạn kích thước riêng cho từng nhóm. Đợt này không bổ sung luật gene, giống mới hoặc Deep Fishing.

## Đối soát bản sao save thật

- Nguồn đang dùng là `C:/Users/admin/Downloads/Our_little_world/.dev-lan-state.json` theo workspace host và tài liệu canonical. SHA-256 của nguồn vẫn khớp backup `43de1999cbad203ff8da31d10ee493bdeb362e6bf9e354f37369120adf1e1e24`.
- Backup `.dev-lan-state-inv2-owner-backup-20261128-100113.json`. Bản chơi thử `.dev-lan-state-inv2-owner-acceptance-20261128-100113.json`. Đối soát từng nhóm `.dev-lan-state-inv2-owner-reconciliation-20261128-100113.json`. Tất cả ở worktree và được gitignore.
- Khớp **2 thành viên, 50 xu, 363 đơn vị, 64 nhóm SKU × chủ sở hữu × phẩm cấp × metadata nguồn**. Tất cả 363 đơn vị nguồn có phạm vi chung nên được chuyển vào **68 ô kho nhà**, hai ba lô có 18 ô trống. Có 10 ID trang bị được tạo xác định vì các dòng gốc thiếu ID cá thể. Không cần giữ hộ khi chuyển save này.
- So sánh sâu dữ liệu ngoài kho khớp, gồm hồ sơ, ví, ruộng, cây, vật nuôi, xưởng, trang trí, mèo, thư, đơn và lịch sử. Đã mở relay từ một bản sao thử của bản chuyển để đọc cả hai người, 184 luống, bảng của 8 xưởng, mèo và hộp thư. Bản thật có 0 luống đang trồng và 0 vật nuôi lúc sao lưu.
- Chạy lại migration từ cùng đầu vào cho kết quả giống nhau. Một lần chạy CLI trên file đã chuyển tạo đầu ra có cùng SHA-256.
- Bản QA riêng `.dev-lan-state-inv2-gameplay-qa-20261128.json` lấy từ fixture M3d/M3e có sẵn. Có 8 luống trồng, 4 cây quả, 13 vật nuôi, 5 mẻ và 73 đơn vị cần/mồi.

## Chơi thử

Chạy PowerShell dưới đây. Nếu muốn thử ruộng và xưởng đã chuẩn bị, đổi tên save ở dòng được gán sang `.dev-lan-state-inv2-gameplay-qa-20261128.json`.

```powershell
Set-Location 'C:\Users\admin\Downloads\OLW-feat-inv2-physical-inventory'
$env:OLW_DEV_LAN_PHYSICAL_INVENTORY = '1'
$env:VITE_OLW_PHYSICAL_INVENTORY = '1'
$env:OLW_DEV_LAN_STATE_FILE = Join-Path (Get-Location).Path '.dev-lan-state-inv2-owner-acceptance-20261128-100113.json'
npm.cmd run dev -- --host 127.0.0.1 --port 4274 --strictPort
```

1. Mở [bản chơi thử](http://127.0.0.1:4274/?extended-world=1) và chọn Mây hoặc Nắng. Đứng cạnh tủ lạnh, nhấn J rồi lấy cuốc, bình tưới, hạt, cần và mồi vào hàng nhanh.
2. Ở ruộng, chọn dụng cụ hoặc hạt và bấm J theo lời nhắc. Sau thu hoạch, kiểm tra vị trí ô và số lượng. Ở ao, cầm cần, mở điểm câu và quăng. So mồi trước/sau mỗi lượt.
3. Với bản QA, thử cho ăn, lấy sản phẩm, giao đơn và chế biến tại xưởng. Gửi một món qua thư cho người kia rồi tải lại hai tab. Nếu ba lô người nhận đã đầy, xem quà trong **Đồ giữ hộ** tại tủ.

## Phối hợp và phần còn mở

Đã đối chiếu local `main@72270c5`, `origin/main@fe1937b`, art được duyệt ở `89bbfe5`, M3d/M3e `450765d` và M3g `167a732`. M3d/M3e có các file chung ở App, bộ tương tác, modal và tuyến câu. Khi tích hợp art, truyền `physicalSource` từ món đang cầm rồi giữ `castId` qua cả hai giao diện câu. Các nút vật nuôi và xưởng gọi cùng `/farm/deep/apply`. M3g cần đọc ô, `instanceId` và độ bền ở Phase B. Các nhánh vẫn tách riêng.

- Local Preview cần adapter ô và lưu trạng thái nguyên tử.
- Supabase cần bảng ô, ràng buộc duy nhất, RLS theo thành viên và kho, RPC domain, kiểm thử nhiều kết nối, migration và rollback. Đã kiểm tra bundle production không có endpoint và cờ pilot.
- Chủ dự án còn nghiệm thu Safari iPhone/PWA và playtest bản save thật. Nhánh chưa hợp nhất vào main.

## File và kiểm thử

- Cầu nối Dev LAN gồm `scripts/devLanServerPlugin.{mjs,d.mts}`, `scripts/devLanV015Handlers.mjs`, `src/server/devLan{PhysicalInventoryRoute,PhysicalGameplay,DonorRoute,FarmRoute}.ts`.
- Đầu vào gameplay gồm `src/app/App.tsx`, `src/features/home/{MainGameInteractionLayer.tsx,executeMainGameContextAction.ts}`, `src/features/donor/ChillFishingModal.tsx`, `src/features/inventory/PhysicalInventoryPilot.tsx`, `src/features/petCare/petCareHandFeedAuthority.ts`, `src/features/mailbox/MailboxModal.tsx`, `src/ui/components/ContextualPromptBadge.tsx`, `src/lib/backend/{types,donorDevLanClient}.ts` và `src/shared/{farming/farmSnapshotTypes,interaction/interactionTypes,inventory/physicalInventory}.ts`.
- Migration và kiểm thử gồm `scripts/migrate-inv2-save.mjs`, `tests/server/inv2GameplayTransactions.test.ts` và `tests/e2e/inv2-gameplay.spec.ts`.
- 21 ca Vitest tập trung qua. Playwright bật cả hai cờ qua 13 ca. Bốn ca điều khiển khi tắt cờ qua khi chạy lại sau một lần timeout WASD. Typecheck và build production qua.
