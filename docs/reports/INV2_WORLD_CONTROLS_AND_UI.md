# INV.2 — Điều khiển thế giới và trải nghiệm túi đồ

Nhánh thử là `feature/inv2-physical-inventory`. Bản trước chỉnh sửa là `680e3c9`. Baseline trước INV.2 là `72270c5`. Commit khôi phục điều khiển là `68a2a4c`.

## Tái hiện và nguyên nhân

| Bản chạy Chromium | Thiết lập | Kết quả tại cửa ra vườn |
| --- | --- | --- |
| `72270c5` | Cả hai cờ tắt, save thử riêng | Tại ô trong nhà (8, 10), thấy lời nhắc J và chuyển sang bản đồ `garden`. |
| `680e3c9` | Cả hai cờ INV.2 bật, save thử riêng | Mở và đóng ba lô được. Lời nhắc biến mất và J giữ nhân vật ở `home`. |
| Bản sửa | Cả hai cờ INV.2 bật, save thử riêng | J tại cửa chuyển sang `garden` trước và sau khi mở ba lô. Trong lúc modal mở, cửa không kích hoạt. Cảm ứng cũng chuyển bản đồ. |

Trong `App.tsx`, `680e3c9` chỉ mount `MainGameInteractionLayer` khi backend không có inventory vật lý. Component này sở hữu listener J/K, lời nhắc và nút cảm ứng cùng với thanh nhanh cũ. Pilot chỉ đăng ký thao tác ba lô và thanh nhanh.

`WorldScene` vẫn đọc WASD bằng Phaser và gửi `evt:interaction-frame` với bản đồ, vị trí, hướng nhìn và đối tượng. J đi qua listener trình duyệt trong `MainGameInteractionLayer`. Bộ điều phối xác nhận action với frame hiện tại rồi thực thi qua `executeMainGameContextAction`. Cửa gửi yêu cầu đổi bản đồ. NPC gửi `cmd:interact-npc`. Tủ áo và khung ảnh mở panel tương ứng. Nút cảm ứng đi qua cùng bộ điều phối. Trace tại làng ghi nhận cả `cmd:interact-npc` và `evt:open-npc-dialogue`.

Bản sửa duy trì bộ điều phối chung ở cả hai chế độ. Pilot cấp trạng thái món đang cầm theo ID chồng. Chế độ thường giữ shortcut 1–8. INV.2 dùng chín ô thật và K cất món đang cầm. Khi mở modal, `GameViewport` tạm dừng điều khiển Phaser. Bộ điều phối xét khóa modal, chế độ trang trí và vùng nhập liệu. Modal INV.2 giữ vòng focus Tab. Escape bỏ chọn món hoặc đóng modal. Nhấn nhanh riêng phím Shift để đổi hàng. Giữ Shift khi di chuyển vẫn chạy nhanh và Shift+Tab vẫn duyệt focus.

Canh tác, câu cá, mua hàng, xưởng và các thao tác dùng vật phẩm khi chăm mèo còn chờ kết nối với ô vật lý. Bộ điều phối báo tiếng Việt khi thử các thao tác này trên pilot. Cửa, NPC, tủ áo và khung ảnh độc lập với kho.

## Chẩn đoán giao diện và thiết kế đã triển khai

| Ảnh đối chiếu | Chú thích |
| --- | --- |
| `before-hotbar.png` và ảnh owner gửi | Bên phải chín ô có hai nút chữ lớn. “Hàng 1 ↻” chưa chỉ ra Shift. “Ba lô” chiếm một nút màu đối lập. |
| `before-backpack.png` | Tiêu đề ghép “Ba lô và kho”. Kho xuất hiện ngay khi mở ba lô trong nhà. Ô tìm và bộ lọc mặc định nằm giữa các hàng nút. Chọn món nâng ô và chèn thêm nút vào bố cục. |
| `after-hotbar-desktop.png`, `after-hotbar-touch.png` | Chín ô là phần chính. Biểu tượng ba lô có nhãn I ở góc dưới trên desktop. Vạch xanh đánh dấu hàng đang dùng. Nút vạch có gợi ý Shift trên desktop và vùng bấm riêng trên mobile. |
| `after-backpack.png` | I hoặc nút ba lô mở đồ cá nhân ở mọi bản đồ. Ô chọn đổi viền. Tên, số lượng và thao tác xuất hiện trong chân panel đã chừa chỗ. Dấu ba chấm mở bảng thao tác nổi. |
| `after-storage-desktop.png`, `after-storage-touch.png` | J hoặc nút tương tác cạnh tủ lạnh mở hai khay chuyển đồ. Máy chủ kiểm tra vị trí. Hai khay đặt cạnh nhau trên màn rộng, xếp dọc khi hẹp. Ô tìm, lọc và nút chuyển đồ dùng cùng bảng màu gỗ. |

Ảnh nằm trong `test-results/inv2-control-captures/` của worktree. Ảnh sau chụp với sáu món chuyển vào ba lô thử để thấy các ô và nhãn phím.

## Phạm vi triển khai và file

| Hạng mục | File |
| --- | --- |
| Duy trì bộ điều phối và dùng chung đầu vào | `src/app/App.tsx`, `src/features/home/{GameViewport,MainGameInteractionLayer}.tsx`, `executeMainGameContextAction.ts`, `interactionActionGate.ts`, `useHeldItemFromHotbar.ts`, `useWorldGamepad.ts`, `src/game/eventBus.ts` |
| Gắn kho với tủ trong thế giới | `src/game/scenes/WorldScene.ts`, `src/shared/interaction/{interactionTypes,interactionResolver,mainGameInteractables,mainGameWorldAnchors}.ts` |
| Màn hình ba lô, kho, hotbar và thao tác | `src/features/inventory/PhysicalInventoryPilot.tsx`, `src/features/inventory/physicalInventory.css` |
| Yêu cầu kho và kiểm tra bán kính ở Dev LAN | `src/lib/backend/devLanBackend.ts`, `src/server/devLanPhysicalInventoryRoute.ts`, `src/shared/inventory/{physicalInventory,physicalInventoryApi,physicalInventoryEconomy}.ts` |
| Kiểm thử | `tests/e2e/{inv2-world-controls,physical-inventory}.spec.ts`, `tests/e2e/helpers/extendedWorldVqg.ts`, `tests/server/physicalInventoryAuthority.test.ts`, `tests/unit/physicalInventory.test.ts` |

Lấy dữ liệu kho cần truy vấn rõ ngăn và vị trí phiên trong bán kính tủ. Các giao dịch vẫn dùng địa chỉ ô, ID stack, phiên bản save và khóa chống phát lại. Thử nghiệm hai client bao gồm rút cùng chồng, nhặt cùng món rơi và retry.

## Kiểm thử

- Playwright với cả hai cờ INV.2 bật qua 12 ca trên Chromium desktop và viewport iPhone 16 Pro Max. Phủ J trước và sau modal, NPC, cửa, tủ áo, khung ảnh, WASD, 1–9, K, nút cảm ứng, tay cầm giả lập, Shift, lọc kho, bố cục ổn định khi chọn món và tranh chấp hai client.
- Playwright khi tắt cả hai cờ qua 4 ca điều khiển tương ứng. Ba ca kho cũ trên Chromium desktop cũng qua với lúa, táo và con trỏ stale.
- Vitest tập trung qua 19 ca, gồm quyền kho theo vị trí, bảo toàn vật phẩm, bộ giải tương tác, cổng xác nhận action và script worktree.
- Các ca điều hướng nhanh cũ, bước chuẩn bị tap-to-move và hai ca thu hoạch trong bộ Inventory Integrity vẫn lỗi khi chạy trên cả nhánh INV.2 và baseline `72270c5`. Baseline tái hiện “Cây chưa chín” và hai phản hồi thu hoạch cùng trả 409. Các lỗi này tách khỏi đường J và giao dịch kho vật lý.
- Lint qua với bốn cảnh báo có sẵn. Typecheck và build production qua. Kiểm tra bundle không tìm thấy endpoint vật lý, hai cờ, hoặc modal kho pilot.
- Lệnh `npm run test` mặc định vướng hai suite donor cần Canvas 2D trong jsdom và timeout 5 giây của hai ca script worktree. Khi loại đúng hai suite donor và tăng timeout lên 15 giây, Vitest qua 939/939 ca trên 204 suite.

## Chơi thử

Dùng [lệnh Dev LAN INV.2](INV2_PHYSICAL_INVENTORY.md#commit-và-cách-chạy) với save cô lập. Từ cửa nhà đi sang góc dưới bên trái để thấy lời nhắc kho. Thử I ở nhà và ngoài vườn, J ở cửa và tủ lạnh, 1–9 để chọn món và nhấn nhanh Shift để đổi hàng. Trên mobile, chạm biểu tượng tương ứng. Tay cầm chuẩn dùng A/X cho tương tác chính/phụ, Y để mở ba lô, B để đóng và hai nút vai để đổi hàng INV.2.

## Còn mở

- Nghiệm thu iPhone Safari/PWA và tay cầm thật. Kiểm tra tự động dùng viewport cảm ứng Chromium và giả lập Gamepad API. Điều hướng lưới đồ bằng tay cầm và giữ lâu để mở bảng thao tác chưa triển khai.
- Nối domain gameplay với ô vật lý, Local Preview và Supabase. Xem [bàn giao nền tảng INV.2](INV2_PHYSICAL_INVENTORY.md#bàn-giao-tích-hợp).
- Nhánh chờ owner nghiệm thu trước khi hợp nhất.
