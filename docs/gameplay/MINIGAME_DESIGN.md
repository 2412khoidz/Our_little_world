# Thiết kế Mini-Games & Hạ tầng Chơi Chung (`MINIGAME_DESIGN`)

*Áp dụng **K4** ([ARCHITECTURE_REVIEW.md](../research/ARCHITECTURE_REVIEW.md)) — thiết kế hạ tầng nhẹ gọn, chỉ triển khai trước 4 mini-game MVP ở `V0.2.5`, không xây framework nặng nề.*

---

## 1. Danh mục Mini-Games (Thời lượng chuẩn 2–10 phút)

### Nhóm A — Nhẹ nhàng / Theo lượt (Turn-based & Casual, `14` ý tưởng)
| # | Tên | Hình thức | Mục tiêu triển khai |
|---|---|---|---|
| 1 | **Caro (lưới 15×15)** | Hai người luân phiên đi quân trong ván PvP tự nguyện | **MVP V0.2.5** |
| 2 | **Lật thẻ trí nhớ (Memory Pairs)** | Solo hoặc đổi lượt Co-op | **MVP V0.2.5** |
| 3 | **Đoán ý người yêu (Couple Quiz / Match)** | 2 người bất đồng bộ / cùng lúc | **MVP V0.2.5** |
| 4 | **Othello / Reversi** | PvP theo lượt, lật quân | Sau MVP |
| 5 | **Battleship** | PvP theo lượt, mỗi người chỉ thấy thông tin hợp lệ của mình | Sau MVP |
| 6 | **Vẽ và Đoán (Quick Pixel/Sketch)** | Vẽ trên canvas 1 người đoán | V0.3+ |
| 7 | **Ghép ảnh kỷ niệm (Jigsaw nhỏ)** | Ghép mảnh từ Album | V0.3+ |
| 8 | **Nonogram Co-op** | Cùng tô ô giải tranh | V0.3+ |
| 9–14 | *Đoán địa điểm (Wishlist), Tìm đồ vật, Phối đồ, Thi trang trí phòng, Ghép bó hoa, Câu chuyện nối tiếp* | Đời thường / sáng tạo cặp đôi | Mở dần `V0.3 → V1.0` |

### Nhóm B — Phối hợp Realtime (Co-op Challenges, `12` ý tưởng)
| # | Tên | Cơ chế bất đối xứng / phối hợp | Mục tiêu |
|---|---|---|---|
| 1 | **Dẫn đường trong mê cung (Asymmetric Maze)** | 1 người thấy bẫy/bản đồ tổng, 1 người đi trên màn hình cận | **MVP V0.2.5** |
| 2 | **Nấu ăn Co-op (2 trạm bếp)** | Cắt sơ chế ↔ Canh chảo lửa | **V0.3** (gắn thẳng Gameplay Cooking) |
| 3 | **Bắt đom đóm đêm vườn** | 1 người soi đèn lồng, 1 người vợt | V0.5 (khi có Ngày/Đêm) |
| 4–12 | *Giải đố bất đối xứng, Giải cứu mèo, Cùng khiêng đồ, Chèo thuyền đôi, Trồng hoa tốc độ, Song tấu nhịp, Đảo kho báu, Cùng xây cầu, Phiêu lưu đi cảnh 2D* | Bổ trợ 2 vai trò (*It Takes Two / We Were Here / PICO PARK* style) | Mở chọn lọc `V0.3 → V1.0+` |

---

## 2. Hạ tầng Mini-Game Nhẹ Dùng Chung (`K4`)

Không tách microservice riêng; dùng 1 chuẩn duy nhất trong `src/shared/minigames/`:

```ts
export interface MinigameDefinition<TState, TAction> {
  id: string;
  mode: 'turn_based' | 'friendly_pvp' | 'realtime_coop';
  minPlayers: 1 | 2;
  maxPlayers: 2;
  initialState: (seed: number, playerIds: string[]) => TState;
  reduce: (state: TState, action: TAction, actorId: string, nowMs: number) => TState;
  isFinished: (state: TState) => boolean;
  computeScore: (state: TState) => { outcome: 'coop_clear' | 'incomplete' | 'win' | 'draw' | 'cancel'; winnerId?: string; points: number };
}
```

- **Registry:** Map tĩnh `MINIGAME_REGISTRY` theo `id`. DeepSeek thêm mini-game mới chỉ bằng cách viết 1 file thuần `reducer` + React/Phaser view mà không sửa backend router.
- **Session & Đồng bộ:**
  - *Turn-based (`minigame_sessions`):* Lưu `{ id, world_id, game_id, status, state_json, version, seed, updated_at }`. Mỗi nước đi gọi RPC `minigame_submit_action(session_id, action, expected_version)` kiểm tra đúng lượt + nâng `version + 1` → Realtime `postgres_changes` hoặc broadcast báo đối phương.
  - *Realtime Co-op (Mê cung bất đối xứng):* Bầu 1 **Sim Host** theo quy tắc phiên foreground `(userId, sessionId)` có heartbeat như Pet **K3**, chạy simulation nội bộ ở 15–20 Hz, gửi state delta qua Realtime channel `minigame:<world_id>:<session_id>`; khi xong server xác minh kết quả trước khi ghi thưởng idempotent; nếu chưa có xác minh thì MVP chỉ hiển thị hoàn thành và không cộng xu.
- **Thưởng & Anti-abuse:** Cặp đôi chỉ 2 người tin cậy, nhưng vẫn đặt **trần xu/giờ & idempotent claim 1 lần/session** ở Postgres (`minigame_rewards_ledger`) để tránh lỗi nhấn đúp mạng chập chờn cộng 2 lần xu.

---

## 3. Reconnect, Hủy ván, Edge Cases & Acceptance Criteria

- **Reconnect:** Với game theo lượt, tải lại trang trên iPhone mở đúng bàn cờ ở `version` mới nhất; với co-op realtime, cho phép tạm dừng `30s` chờ người kia quay lại hoặc bấm *"Kết thúc an toàn"* (không trừ xu hay phạt thua).
- **Hủy ván (Cancellation):** Bất kỳ bên nào chọn *Hủy ván* → chuyển `status = 'cancelled'`, hoàn vé/vật phẩm tham gia nếu có (trừ mode Restaurant Order đã cháy đồ).
- **Testing:** Bắt buộc viết **100% deterministic reducer tests** (Vitest) kiểm tra nước đi sai lượt, thắng/hòa, replay nước đi, người thứ ba bị chặn và test chống claim thưởng co-op 2 lần trên cùng `session_id`.
- **Acceptance Criteria V0.2.5:**
  - 4 mini-game MVP (`Caro`, `Lật thẻ`, `Đoán ý`, `Mê cung bất đối xứng`) chạy sạch trên màn hình `430×932` bằng chạm 1 ngón.
  - Đổi thiết bị / F5 giữa ván Caro giữ nguyên bàn cờ.
  - Mất mạng 10s giữa ván mê cung không làm treo màn hình hay nhân đôi phần thưởng.

Caro là mini-game PvP thân thiện đầu tiên trong phạm vi V0.2.5. Othello và Battleship có thể mở sau MVP. Cả hai người chấp nhận lời mời trước khi vào ván và được hủy không phạt. Thắng, thua hay hòa chỉ hiển thị trong ván. PvP không có xếp hạng dài hạn, cược, phí, mất tài sản, thưởng kinh tế theo kết quả hoặc yêu cầu mở khóa. Với Battleship, snapshot phía người chơi chỉ hiển thị phần thông tin được phép.
