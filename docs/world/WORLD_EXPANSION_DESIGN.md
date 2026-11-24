# World Expansion Design Sandbox (`64×64` & `96×96`)

- **Nhánh:** `neon/night-dev`
- **Modules:** `src/game/worldSandbox/{worldExpansionMap.ts, WorldExpansionScene.ts}`, `src/features/sandboxes/{WorldExpansionSandbox.tsx, CombinedExperienceDemo.tsx}`
- **URL xem trực tiếp (DEV):** `/?world-sandbox=1` · `/?experience-demo=1`
- **Lưu ý ranh giới:** File production `src/shared/maps.ts` được giữ nguyên 100%.

## 1. Cấu Trúc Bản Đồ Mở Rộng (Lưới 16×16px)
- Hỗ trợ chuyển đổi tức thì giữa kích thước **`64×64` (1024×1024px)** và **`96×96` (1536×1536px)** để chủ dự án đánh giá nhịp độ đi bộ thực tế.
- **10 Địa điểm (Landmarks) có giá trị sử dụng rõ ràng:**
  1. *Ngôi nhà chung & Hiên hoa* (`cottage` — điểm sinh hoạt, hộp thư đỏ, bát ăn/nước của mèo)
  2. *Vườn rau rào gỗ* (`garden` — trồng trọt)
  3. *Đồng hoa & Vườn quả* (`orchard` — hái quả & mật ong)
  4. *Hồ câu & Cầu gỗ đôi* (`fishing_pond` — câu cá cho bữa tối và món khoái khẩu của mèo)
  5. *Bãi Picnic hoa anh đào* (`picnic_glade` — điểm hẹn thư giãn)
  6. *Đường mòn Rừng thông* (`pine_trail` — đi dạo cùng mèo)
  7. *Quảng trường & Chợ Bác Hai* (`square` — giao lưu / mua sắm tương lai)
  8. *Bãi biển & Cầu tàu gỗ* (`beach` — bờ biển cát vàng phía nam)
  9. *Mũi ngắm Hoàng hôn* (`sunset_cape` — ngắm cảnh theo chu kỳ sáng/hoàng hôn/chạng vạng)
  10. *Góc Anh Đào Bí Mật* (`secret_sakura` — góc riêng cho cặp đôi khám phá)

## 2. Hoàn Thiện Môi Trường & Mobile UX
- Sân nhà mở rộng dùng 100% tài nguyên đã xác minh trong `worldExtendedArtIds.json` (`peach_tree`, `apple_tree`, `sakura_bush`, `planter_box`, `fence_3w`, `sunflower`, `beehive`, `bridge_wood`, `picnic_blanket`), đường đất có viền đất tối tạo chiều sâu.
- **Tối ưu di động (`430×932`, `390×844`, `844×390`):** Thanh công cụ `[Tùy chỉnh]` và danh sách `[Bản đồ]` mặc định thu gọn trên màn hình nhỏ để chừa tối đa khung nhìn gameplay; bổ sung Touch D-pad bên trái với điều khiển trượt mượt của `WorldExpansionScene.setJoystick()`.
- **Chống double-canvas React StrictMode:** Mount `Phaser.Game` được bảo vệ bằng `requestAnimationFrame` + `host.replaceChildren()` khi cleanup.
