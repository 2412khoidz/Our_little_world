# Kiến trúc Trí tuệ Nhân tạo Thú cưng (`PET_AI_ARCHITECTURE`)

*Áp dụng quyết định kiến trúc **K3** + tách rời hoàn toàn Decision-making khỏi Execution/Renderer (`WorldObservation → AgentBrain → ValidatedAction → ActionExecutor`).*

---

## 1. Pipeline 4 Tầng (`src/shared/pet/`)

```text
WorldObservation (vitals, emotion, nearby affordances, partner positions, time, weather, new furniture, memory)
       │
       ▼
AgentBrain.decide(obs, rng)  ──► [Giai đoạn 1: UtilityAiBrain | Sau V1.0+: HybridLlmBrain]
       │
       ▼ (Kiểm tra ràng buộc đường đi & occupancy — ActionValidator)
ValidatedAction { actionId, targetRef, tileX, tileY, durationMs, interruptible }
       │
       ▼ (Broadcast PetActionIntent cho Sim Peer + thực thi FSM trên Phaser 4)
ActionExecutor (BFS Pathfind → Walk → Execute Affordance → Apply Side-Effects / Local Events)
```

---

## 2. Utility AI Scorer (`V0.2.3`, tham chiếu `Petivolution` + Chống Jitter)

- **Công thức điểm cho mỗi hành động ứng viên $a$:**
  $$U(a) = \big(w_{\text{base}}(a) + \sum_{k} w_{\text{need},k} \cdot u_k + w_{\text{emo}}(a, e) + w_{\text{trait}}(a) + w_{\text{mem}}(a) + w_{\text{ctx}}(a)\big) \cdot m_{\text{avail}}(a) - d_{\text{dist}}(a)$$
  - `u_k`: độ cấp bách phi tuyến (ví dụ $(1 - \text{need}/100)^2$ cho Đói/Khát/Năng lượng).
  - **Anti-Sleep-Loop (bài học `Petivolution/utility.ts:219`):** Khi `hunger < 35` hoặc `thirst < 35`, trừ nặng điểm `sleep/rest` (`-5.0`) để mèo ưu tiên đi ăn/uống thay vì kẹt vòng ngủ.
- **4 Cơ chế Chống Giật / Máy móc:**
  1. **Commitment Window:** Một hành động khi bắt đầu giữ cam kết tối thiểu `T_min` (`4–12s` tùy hành động).
  2. **Hysteresis Bonus (`+0.25`):** Hành động đang chạy nhận điểm giữ nhịp, chỉ đổi sau commitment nếu điểm ứng viên lớn hơn điểm hành động hiện tại ít nhất 0,25 điểm hoặc gặp kích thích khẩn.
  3. **Per-Action Cooldown:** Sau khi `stretch`, `yawn`, `groom`, hoặc `sniff_new_item`, khóa cooldown `45–180s` để không lặp liên tục một chỗ.
  4. **Interruption Rules:** Khi người chơi bấm vuốt ve / cho ăn / dời mất đồ vật đích → hủy ngay hành động cũ gọn gàng, chuyển về phản ứng hoặc chọn lại.

---

## 3. Hệ thống Affordance (`World Object Contracts`)

Mọi đồ vật có thẻ `petAffordances` khai báo tọa độ tiếp cận (`interactionTile`), trạng thái chiếm chỗ (`occupancy`), yêu cầu (`requiresFullBowl`) và hoạt ảnh:

| Đồ vật | Hành động cung cấp cho Mèo | Điều kiện & Thích nghi khi Nội thất Bị Dời |
|---|---|---|
| **Bát thức ăn / Bát nước** | `eat`, `drink` | Nếu bát vừa bị cất hoặc người chơi dời chỗ → listener `worldMutated` kích hoạt re-pathfind hoặc tạm dừng chuyển hành động khác mà **không đứng khựng kẹt tường**. |
| **Sofa / Giường đôi** | `sit_on`, `sleep`, `nap_near_partner` | Kiểm tra ô trống slot sofa/mép giường (`interactionOffsets`). |
| **Cửa sổ phòng / Vườn nắng** | `sunbathe`, `window_watch` | Ưu tiên giờ `07:00–16:00` trời nắng; tự động thu về góc ấm khi tối/mưa. |
| **Bàn học 2 chỗ** | `study_companion` | Kích hoạt trọng số cao (`+1.8`) khi có người chơi ngồi vào chế độ Pomodoro. |
| **Hộp giấy** | `hide`, `peek_play` | Tăng điểm mạnh nếu cảm xúc là `scared` hoặc tính cách `curious`. |
| **Trụ cào móng & Đồ chơi** | `scratch`, `stretch`, `play_toy`, `pounce` | Cộng tác 1–2 người ném đồ chơi; mèo có thể tự nhặt tha về thảm. |

---

## 4. Abstraction Cho Tương lai (`V1.0+`)
```ts
export interface AgentBrain {
  readonly kind: 'utility' | 'hybrid_llm';
  decide(obs: WorldObservation, rng: () => number): PetDecisionResult;
}
```
MVP dùng FSM đơn giản theo snapshot. Từ V0.2.3 dùng UtilityAiBrain thuần TS, không có phí suy luận. Đến `V1.0+`, lớp `HybridLlmBrain` chỉ cần bọc thêm gợi ý cấp cao vào tập action allowlist hợp lệ của `ActionValidator`.

Validator loại đích không thể tới và affordance hết hiệu lực trước khi xếp điểm. Nếu không còn ứng viên hợp lệ, chọn `idle` tại ô an toàn. Điểm bằng nhau dùng thứ tự action ID cố định; RNG đã seed chỉ dùng khi được thiết kế rõ. Ngưỡng anti-sleep-loop chỉ áp dụng khi có bát ăn/uống khả dụng.
