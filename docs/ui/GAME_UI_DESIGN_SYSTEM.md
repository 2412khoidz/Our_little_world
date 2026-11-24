# Game UI Design System (Cozy Indie Variants)

- **Nhánh:** `neon/night-dev`
- **File chính:** `src/ui/designSystem/gameUiTokens.css`, `src/ui/designSystem/GameIcons.tsx`, `src/ui/components/*`
- **URL xem trực tiếp (DEV):** `/?ui-sandbox=1` · `/?experience-demo=1`
- **Trạng thái:** `Implemented & Locally tested` (Chờ người dùng chọn biến thể ưu tiên giữa Variant A và Variant B).

## 1. Mục tiêu Nâng cấp Từ SaaS Cards Sang Game Identity
Loại bỏ cảm giác "bảng quản trị web" bằng hệ thống token CSS có viền kép đóng khung, nút keycap chạm nổi, thanh công cụ cầm tay (hotbar) và Cuốn Sổ Chung dạng sách lưu giữ kỷ niệm.

## 2. Hai Biến Thể UI Độc Lập Để Đánh Giá
| Biến thể | Token Selector | Phong cách chủ đạo | Bảng màu & Font |
|---|---|---|---|
| **Variant A: Warm Pixel Cottage** | `[data-ui-variant='warm-pixel-cottage']` | Góc bo vuông pixel, viền gỗ đậm `#4c2d1f` + viền đồng lồng trong, đổ bóng bệ gỗ 4px | Giấy kem `#fbf0da`, gỗ `#d9bd93`, điểm nhấn đất nung `#d1684c`, font `'Be Vietnam Pro'` |
| **Variant B: Illustrated Storybook** | `[data-ui-variant='illustrated-storybook']` | Góc bo mềm `18px`, nền giấy linen chấm bi nhẹ, màu hoa hồng phấn pastel | Trắng kem `#fffaf2`, viền hồng đất `#7e5552`, điểm nhấn `#cf6b84`, font `'Cambria', 'Times New Roman', serif` |

## 3. Bộ Component Đã Xây Dựng (`src/ui/components/`)
1. **`GameIcons.tsx`:** SVG pixel/cozy thủ công đồng bộ (`CozyKibbleSvg`, `CozyFishSvg`, `CozyPitcherSvg`, `CozyYarnSvg`, `CozyBoxSvg`, `CozyNotebookSvg`, `CozyCatIconSvg`).
2. **`GameHotbar.tsx`:** Thanh 6–8 ô cầm tay (`46×46px` thân thiện ngón tay iPhone/Android), hiển thị badge số lượng, vạch mức nước trên bình tưới và phím tắt `1–8`.
3. **`ContextualPromptBadge.tsx`:** Chỉ hiện hành động ngữ cảnh ngay cạnh thế giới (`[J]` hành động chính, `[K]` hủy/đặt đồ, toast giải thích tiếng Việt khi không đủ điều kiện).
4. **`GameDialogueBox.tsx`:** Khung thoại cố định chân màn hình kèm chân dung mèo live SVG/canvas theo đúng màu lông và phụ kiện hiện tại.
5. **`OurLittleNotebook.tsx` & `PetNotebookPage.tsx`:** Cuốn sổ 5 tab bookmark (*Hồ sơ bé mèo*, *Nhật ký*, *Wishlist*, *Lịch hẹn*, *Album*) dùng nền giấy đặc không xuyên thấu.

## 4. Kiểm Tra Trực Quan Đã Thực Hiện
- Đã sửa lỗi font `Georgia` làm lệch dấu thanh tiếng Việt ở Variant B sang `'Cambria', 'Times New Roman', serif`.
- Đã sửa keyframes `olwPanelEnter` giữ `opacity: 1` từ đầu để modal Cuốn Sổ Chung không bị mờ/lộ nền thế giới phía sau.
- Screenshots kiểm chứng: `test-results/grand-showcase/02-ui-cottage-*.png`, `03-ui-storybook-*.png`, `07-notebook-pet-*.png`.
