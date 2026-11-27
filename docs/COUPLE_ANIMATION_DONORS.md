# Nghiên cứu nguồn Donor — Hoạt ảnh Cặp đôi (Natural Couple Animations)

Tài liệu này ghi nhận trung thực các nguồn donor đã kiểm tra và mức độ sử dụng trong **Our Little World** (chỉ giữ P0: **Ôm nhau** & **Nắm tay đi dạo**; các mục P1 đợi chủ dự án nghiệm thu hình ảnh P0).

## 1. Nguồn đã kiểm tra trực tiếp

| Nguồn | Tập tin / dòng đã kiểm tra | Hình thức áp dụng |
|---|---|---|
| `https://github.com/jordgubben/promenad` | `src/kinematics.c` (dòng 200–267: `move_limb_tips_to_their_linked_partners`, `move_limbs_directly_to_end_effectors`, `reposition_bones_with_fabrik`), `src/data_model.c` (dòng 157–178: `create_arm`), `src/app_root.c` (dòng 101–117) | **Port thuật toán (Adapted / Translated to TypeScript)** trong `src/shared/couple/coupleHandKinematics.ts`: giải 2 đoạn xương cánh tay (`solveTwoBoneArmFabrik`, 3 vòng FABRIK forward+inverse với trọng lực khuỷu tay) và neo điểm nắm tay chung bằng `lerp(0.5, tipA, tipB)` từ `computeSharedHandAnchor`. Không dùng C/Raylib làm runtime dependency. |
| `https://github.com/aedenthorn/StardewValleyMods` | `HugsAndKisses/Kissing.cs` (dòng 95–195, 234–322) & `HugsAndKisses/ModEntry.cs` | **Tham khảo kiến trúc (Adapted concept)** cho đồng bộ hướng mặt đối diện (`left`/`right`), khóa trạng thái tạm trong khi ôm & hủy sạch anim/movement khi tách ra (`src/shared/couple/coupleStateMachine.ts`). Không ghép tài nguyên sprite của Stardew Valley. |
| `https://github.com/JoXW100/StardewValleyMods` | `HugsAndKisses/ModEntry.cs`, `HugsAndKisses/Framework/Kissing.cs` (dòng 1–110) | **Tham khảo cấu trúc module** tách phần điều phối sự kiện mạng và kiểm tra điều kiện khoảng cách/trạng thái ngủ (`Framework/Kissing.cs`). |
| `https://onefreeman1337.github.io/csaf-releases/rpg-maker-mz-plugins/embrace/` | Tài liệu kiến trúc `PostureCore` / `EmbraceCore` (bố cục pixel ghép từ frame chuẩn, giữ nguyên nguyên-pixel, giữ nguyên màu tóc/trang phục/phụ kiện) | **Áp dụng phương pháp ghép frame offline/cache theo avatar** trong `src/game/avatar/couplePairedPoseTextures.ts`: clone trực tiếp pixel từ spritesheet nhân vật đã nhuộm màu (`AvatarConfig`), nghiêng đầu nhẹ `1px`, chuyển ánh mắt êm dịu và thu cánh tay rủ để render cánh tay ôm hai lớp chiều sâu không trùng tay; **không** sao chép mã nguồn thương mại đóng. |
| `https://github.com/patrickriordan/GGJ2022` | Kiểm tra GitHub API & `main`/`master` tree | **Không truy cập được (HTTP 404 — repo không tồn tại hoặc ở chế độ riêng tư)** tại thời điểm kiểm tra (`2026-11-26`), không trích xuất mã nguồn. |

## 2. ranh giới & Quy tắc bảo toàn
- Bảo toàn toàn bộ `AvatarConfig` của cả hai người chơi (màu da, kiểu tóc, màu tóc, kiểu áo, màu áo, kính/nơ).
- Giữ nguyên `CoupleInvitePayload`, `CoupleAcceptPayload`, `CoupleEndPayload`, `CouplePostureKind` — chỉ bổ sung trường đồng bộ pha tùy chọn (`phase`, `phaseStartedAtMs`, `anchorX`, `anchorY`).
- Không thay thế hoạt ảnh tay/cơ thể bằng emoji nổi hay chỉ dịch chuyển vị trí đứng cạnh nhau.
