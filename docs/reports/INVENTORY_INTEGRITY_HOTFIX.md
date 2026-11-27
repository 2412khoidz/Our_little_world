# Hotfix quyền sở hữu túi đồ và kinh tế

Nhánh `fix/inventory-integrity` tách từ RC2 `origin/main@fe1937b7d26db484f5caedc8d93376c82b614bf6`. Mọi lần chạy Dev LAN trong báo cáo dùng save tách biệt.

## Tái hiện và kết quả

| Thao tác trong Chromium | RC2 | Sau hotfix |
| --- | --- | --- |
| Gieo hết 5 hạt lúa khi nhà đã nhận mèo | Kho máy chủ đi từ `5 → 4 → 3 → 2 → 1 → 5`. Túi hiện lại `×5` sau Làm mới. | Kho đi từ `5 → 4 → 3 → 2 → 1 → 0`. Ô hạt biến mất và vẫn trống sau khi mở lại. Lần gieo cuối trên desktop đi qua nút hành động gieo trong game. |
| Click nhấc 4 táo đỏ ở ô 0, rồi click đặt vào ô trống | Ô cũ `4`, con trỏ `4`, máy chủ `4`. Sau khi đặt vào ô 35, con trỏ biến mất và táo vẫn ở ô 0. | Khi nhấc, ô nguồn `0`, con trỏ `4`. Khi đặt, ô nguồn `0`, ô đích `4`, con trỏ trống. Máy chủ luôn `4`. |
| Chuột phải tách 4 táo đỏ | Ô gốc `4`, con trỏ `2`, máy chủ `4`. | Ô gốc `2`, con trỏ `2`. Đặt một quả và hủy phần còn lại cho kết quả ô gốc `3`, ô đích `1`. |
| Kéo trực tiếp từ ô 0 đến ô 17 | Ô đích `4`, tổng máy chủ `4`. Nhánh kéo thả nguyên tử chạy đúng với fixture này. | Kéo trực tiếp, đổi hai SKU và kéo ngoài túi giữ đúng số lượng. Kéo từ thanh nhanh về túi cùng phạm vi gỡ liên kết. |

Lỗi táo là hiển thị thừa lúc nhấc/tách và bỏ mất lần đặt mong muốn. Trong cả ba đường tái hiện, số lượng trên máy chủ vẫn là 4.

## Kiểm toán mã

| Phát hiện đã xác nhận | Nguồn trên RC2 và đường sửa |
| --- | --- |
| Snapshot cấp lại vật phẩm đã hết | `scripts/devLanV015Handlers.mjs:140` và `:294`. Chuyển cấp phát sang khởi tạo save. Snapshot chỉ đọc. [Dev LAN inventory](../../scripts/devLanV015Handlers.mjs) |
| Hai gói khởi đầu chồng nhau và có thể ghi đè ví | `src/server/devLanFarmRoute.ts:35`. Lần mở nông trại đầu tiên trên fixture RC2 có 10 hạt trước khi đưa về 5 để tái hiện. Local Preview còn thay cả mảng kho. [Dev LAN Farm](../../src/server/devLanFarmRoute.ts), [Local Preview](../../src/lib/backend/localPreviewBackend.ts) |
| Đối chiếu layout bỏ sót con trỏ | `src/app/App.tsx:436`. Modal mới đối chiếu ô và con trỏ cùng nhau. App chỉ lưu layout đã hoàn tất, theo thế giới và người dùng. [Modal](../../src/features/inventory/InventoryModal.tsx), [Layout](../../src/shared/inventory/inventoryLayoutStore.ts) |
| Hết ô thì giấu stack mới | `src/shared/inventory/inventoryLayoutStore.ts:65`. Bản mới thêm trang 36 ô chung hoặc 18 ô riêng và giữ vị trí đã lưu. Tách đôi khi trang đầy chuyển đến trang có ô mới. [Layout](../../src/shared/inventory/inventoryLayoutStore.ts) |
| Hạn mức kho khác nhau giữa các đường ghi | `scripts/devLanV015Handlers.mjs:258` giới hạn tổng SKU, còn `src/shared/farming/deepFarmState.ts:330` cộng thẳng. `stackLimit` giờ là kích thước ô mặc định. Số lượng rất lớn dùng ô chứa lớn để hạn chế số ô. Ledger dùng giới hạn biểu diễn số nguyên PostgreSQL `2.147.483.647` trên mỗi dòng, theo thế giới, chủ sở hữu, SKU và phẩm cấp. [Ledger](../../src/shared/inventory/inventoryLedger.mjs), [SQL](../../supabase/migrations/20261127000300_inventory_authority.sql) |
| Hủy chạm có thể thả món | `src/features/inventory/nuvora/NuvoraInteractiveTray.tsx:347` chuyển `pointercancel` vào luồng thả. Bản mới kiểm tra pointer ID, ô nguồn, trang và đích. Escape trả món đang cầm. [Tray](../../src/features/inventory/nuvora/NuvoraInteractiveTray.tsx) |
| Hủy mẻ chế biến trả nguyên liệu về phẩm cấp thường | `deepFarmState.ts` và `farm_apply_deep_action` trước đây lưu công thức nhưng thiếu phẩm cấp đã trừ. Bản mới ghi phần đã giữ theo từng phẩm cấp, rồi trả lại đúng phần đó. Đơn cũ vẫn hoàn phẩm cấp thường vì lịch sử thiếu thông tin. [Dev LAN](../../src/shared/farming/deepFarmState.ts), [SQL](../../supabase/migrations/20261127000400_inventory_workshop_receipts.sql) |
| Phản hồi hoặc bản ghi phát lại có thể mang snapshot cũ | App tải kho hiện tại sau khi nhận hạt hoặc xử lý thư, bỏ phản hồi GET cũ và loại kho của ngữ cảnh trước. Biên nhận xưởng gắn với tác nhân và nội dung, phát lại với trạng thái hiện tại. [App](../../src/app/App.tsx), [Dev LAN Deep Farm](../../src/server/devLanDeepFarmHandlers.ts) |

Phạm vi kiểm toán gồm mua hạt/công cụ, bán lẻ và thùng hàng, gieo/thu hoạch/thu hồi vòi tưới, hoa/cây ăn quả/vật nuôi/đơn hàng, xưởng donor, thu cá và trứng, thư/quà, chuyển ngăn, hạt mèo hằng ngày và thức ăn giữ chỗ. Chuyển ngăn Dev LAN chỉ chốt bản sao kho sau khi cả hai vế thành công. Bản vá đặt khóa thế giới trước khóa nông trại trong SQL. Kiểm thử SQL còn tìm thấy hai lỗi cài mới ở migration nông trại cũ và một ràng buộc sự kiện gây rollback cho ăn bằng tay. Hotfix sửa các lỗi ấy trong đường cài mới và migration tiến tới.

## Di chuyển save

- Dev LAN và Local Preview dùng phiên bản starter 1. Nhà mới được cấp gói đúng một lần. Với nhà cũ, lần nâng cấp chỉ bù dụng cụ thiết yếu còn thiếu, hợp nhất các dòng trùng chính xác cùng phạm vi và phẩm cấp bằng cách cộng số lượng, và giữ ví hiện có. Nhà cũ không được cấp lại hạt hay đồ ăn đã dùng.
- PostgreSQL dùng khóa chính theo thế giới, chủ sở hữu, SKU và phẩm cấp. Migration bù dụng cụ cho nhà cũ và trigger cấp gói khởi đầu cho nhà mới trong giao dịch tạo nhà.
- Câu cá donor vẫn dùng mồi mặc định miễn phí trong lúc câu. Đọc kho không cấp thêm mồi. Hạt mèo tiếp tục nhận tối đa một lần mỗi ngày UTC khi túi chung đã hết hạt.

## Playtest cô lập

```powershell
Set-Location 'C:/Users/admin/Downloads/OLW-fix-inventory-integrity'
$env:OLW_DEV_LAN_STATE_FILE = '.dev-lan-state-inventory-acceptance.json'
$env:VITE_OLW_PRIVATE_ART = '1'
npm run dev -- --host 127.0.0.1 --port 4194 --strictPort
```

Mở `http://127.0.0.1:4194/?extended-world=1`, chọn Mây hoặc mở một ngữ cảnh trình duyệt riêng cho Nắng. Save có 4 táo đỏ ở trang đầu, 5 hạt lúa, 50 xu, mèo Quýt, 6 ô đã cuốc, 47 stack chung và 20 stack riêng cho Mây. Dùng **Trang sau** khi muốn đặt táo vào ô trống ở trang thứ hai. Ảnh chụp nằm trong `playwright-report/inventory-integrity-evidence/`. Xem danh sách file bằng `git show --stat --oneline HEAD`.

## Kiểm thử

- Playwright kiểm tra thao tác game qua Chromium desktop và cấu hình cảm ứng iPhone 16 Pro Max. Hai client thử mua, thu hoạch và giữ nguyên liệu đồng thời, tiêu phần hạt mèo cuối, phát lại yêu cầu, thay đổi kho khi đối phương đang cầm món rồi trả một GET cũ đến muộn. Thử nhận hàng mua, nông sản và quà qua cả hai trang túi.
- Chạy 29 migration trên PostgreSQL nhúng. 15 script cài mới và 16 script đường nâng cấp đã qua.
- Khởi động lại hẳn Vite/Dev LAN trên bản sao save tách biệt. Hạt lúa vẫn là 0 và ví vẫn là 50 xu.
- Chạy lint, typecheck, build và kiểm tra production guard. Browser tests donor và farming chạy desktop, Billiards chạy desktop và cấu hình Chromium iPhone.

## Giới hạn nghiệm thu

- iPhone/Safari thật, Quick Tunnel và Supabase Cloud nhiều kết nối còn chờ nghiệm thu. Kiểm thử SQL dùng PostgreSQL nhúng PGlite với fixture auth cục bộ, trên cài mới và đường nâng cấp.
- Các spec legacy donor và farm tích hợp chạy được trên desktop. Áp cấu hình mobile lên các spec cũ có thể vướng selector điều hướng desktop. Spec inventory mới đi qua menu mobile và kiểm tra hai client kết nối cùng máy chủ.
- Vitest toàn bộ trên Windows dùng Canvas native cài ngoài repo qua `NODE_PATH`, số worker giới hạn và timeout 15 giây. Không đổi npm dependencies hoặc lockfile.
