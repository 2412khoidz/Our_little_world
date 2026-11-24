# Đặc tả Mô phỏng, Multiplayer & Offline Catch-up (`PET_SIMULATION_SPEC`)

*Bảo đảm hai thiết bị luôn nhìn thấy **một chú mèo chung nhất quán** mà **không cần server chạy game loop 60 FPS** (**K3**).*

---

## 1. Persistent Data Model (`Supabase Postgres + DevLan Parity`)

- **`pets` (1 bản ghi cho thế giới; các trường cá tính và ký ức mở ở V0.2.3):**
  `id, world_id UNIQUE, species ('cat-orange'), name, traits_jsonb, vitals_jsonb ({ hunger, thirst, energy, hygiene, fun, stimulation, social, safety }), emotion, relationship_jsonb ({ [userId]: { affinity, fedCount, playCount, lastSeenAt } }), preferences_jsonb, memory_jsonb (tối đa 24 sự kiện), map_id, anchor_tile_x, anchor_tile_y, sim_state_at, updated_at, version`.
- **`pet_events` (Nhật ký hành động đã xác thực):**
  `id, world_id, pet_id, actor_id, event_type ('feed'|'water'|'pet'|'play'|'gift_bring'|'adopt'), delta_jsonb, idempotency_key, created_at` · `UNIQUE(world_id, idempotency_key)`.

---

## 2. Offline Catch-up Có Giới hạn (Pure Timestamp Math)

Khi bất kỳ client nào tải snapshot (`now = server_now_ms`) với `elapsedMs = clamp(now - pet.sim_state_at, 0, 48 * 3600 * 1000)`:
1. **Không chạy tick rời rạc từng giây:** Áp dụng công thức suy giảm liên tục có giới hạn (`clamp` tối đa **48 giờ** tích lũy; dù nghỉ 2 tuần vẫn chỉ tính tối đa 48h).
2. **MVP V0.1.5:** Lưu hunger (mức no), energy và fun, mặc định 100 khi nhận nuôi. Tính theo milli-point nguyên: mất lần lượt 2, 1 và 1 điểm/giờ, với energy hồi tối thiểu 50 sau 8h vắng; áp sàn 30 và reset mốc khi mutation commit. Các hệ số là tham số khởi đầu. Water có thể kích hoạt phản ứng hình ảnh, chưa có stat thirst hoặc tiêu hao kho.
3. **Sàn bảo vệ V0.2.3 (`FLOOR`):** `hunger`, `thirst`, `hygiene`, `social`, `fun` **không bao giờ tụt dưới `25`** (hoặc `30` cho `safety`); nếu `energy` thấp trong lúc offline, mèo tự chuyển trạng thái nghỉ ngơi ngầm và hồi nhẹ `energy` về tối thiểu `50` thay vì cạn kiệt về `0`.
4. **Kiểm chứng đồng bộ:** TS thuần dùng để hiển thị và chạy Dev LAN. Postgres tính cùng công thức trong RPC bằng giờ server; dùng chung vector kiểm thử để kiểm tra làm tròn. Chỉ mutation đã qua RPC được ghi trạng thái bền.

---

## 3. Online Multiplayer: Sim-Host Election & Action Intent Broadcast (`K3`, từ V0.2.3)

```text
  [Client A (userId nhỏ hơn)]                 [Realtime Private Channel]                 [Client B]
       │                                                  │                                 │
       ├─ Bầu chọn min(userId, sessionId) có heartbeat ───►│                                 │
       ├─ Mỗi 3–8s, phát tối đa 0,3 Hz:               │                                 │
       │  chạy UtilityAiBrain + RNG(seed)                 │                                 │
       │  Broadcast PetActionIntent ─────────────────────►├────────────────────────────────►│
       │  { hostSessionId, seq, goal, targetTile, startedAtMs, seed }    │   Áp tức thì nếu khớp host      ├─ BFS & nội suy local tới đích
       │                                                  │                                 │
       └─ (Mất mạng / rời app > 6s stale presence) ───────┴── Client B tự thăng làm Sim Host┘
```

- **Lý do chỉ broadcast Intent (`<= 0.3 Hz`):** Tiết kiệm >95% quota Realtime message Supabase Free so với stream từng pixel 10 Hz! Cả 2 máy đều chạy cùng thuật toán BFS pathfinding trên `worldMap` nên mèo đi cùng tuyến đường và tới cùng chiếc sofa/bát ăn.
- **Tương tác đồng thời (Race Condition Protection):**
  - Nếu Mây và Nắng cùng bấm **Cho ăn** vào 1 giây: cả hai gửi RPC `pet_interact(pet_id, 'feed', item_sku, expected_version, idempotency_key)`.
  - Postgres khóa hàng `pets FOR UPDATE`, chỉ **1 lượt** tiêu hao đồ ăn/tăng `hunger` (mức no) thành công (lượt thứ 2 thấy bát vừa đầy / cooldown hoạt động nên trả thông báo dễ thương *"Mèo vừa ăn no mất rồi!"* mà không trừ đồ lần 2).
- **Reconnect:** Khi iPhone mở lại từ nền → kéo `getPetSnapshot()` mới nhất từ DB + nhận `PetActionIntent` hiện tại (hoặc tự ứng cử làm Sim Host nếu là người duy nhất online).

V0.1.5 dùng snapshot đã lưu và chuyển động trang trí tất định theo anchor/server time. Render lúc bắt đầu từ cùng tọa độ neo và xử lý lỗi đường đi cục bộ. MVP dùng mốc thời gian server, chưa cần Sim-Host. V0.2.3 dùng Presence cho danh sách thiết bị và heartbeat nhẹ có hạn dùng 6 giây, chỉ chọn phiên foreground còn sống. Khi đổi host, reset cửa sổ `seq` theo host session mới, nhận lại snapshot/anchor và kèm `layoutVersion` trong intent. Nếu layout chưa khớp thì kéo snapshot rồi tìm lại đường. Presence có thể tạm phân kỳ lúc mất mạng. Quyền Sim-Host chỉ điều khiển hoạt ảnh, mọi thay đổi nhu cầu, ký ức hoặc vật phẩm đi qua RPC đã xác thực. Hai tab cùng tài khoản, rớt host và intent tới trễ là các case bắt buộc.

Feed lấy khóa theo thứ tự world → pet/inventory, validate expected version, cooldown, SKU và số lượng định mức phía server rồi ghi event và result idempotent trong cùng giao dịch. Khóa cùng request phát lại kết quả cũ trước khi kiểm tra version hiện tại. Lượt cho ăn mới bị từ chối khi cooldown/chênh version và kho không đổi.
