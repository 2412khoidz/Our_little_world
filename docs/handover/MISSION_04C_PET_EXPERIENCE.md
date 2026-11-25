# MISSION 04C — Pet Experience Overhaul

**Branch:** `cursor/mission-04c-pet-experience-36fd`  
**Builds on:** PR #11 (Living Pet brain + movement)  
**Authority:** PR #10 → see `MISSION_04B3B_AUTHORITY_WIRING.md`  
**World map:** Composer 3 owns `WorldScene` map props — pet work uses **camera/pet layers only**, not garden/meadow tiles.

## Design research (owner refs)

| Nguồn | Áp dụng OLW |
|-------|-------------|
| [nintendogs-threejs](https://github.com/SawyerHood/nintendogs-threejs) | Góc nhìn cận, thân hình chiếm khung, vuốt = vùng cơ thể → animation |
| [webfarmville Kitty Corner](https://github.com/Shiz0id/webfarmville) | “Corner” tách khỏi world — vẫn một pet state |
| **Nintendogs** | Vuốt có phản hồi vị trí; đồ chơi/đồ ăn đưa tới miệng; không UI chỉ số cạnh tranh |
| **Neko Atsume** | Mèo tự đến/đi; đồ vật đặt trong không gian; quan sát ấm, không micromanagement |

## Hai chế độ — một state

| Mode | Mô tả | Code |
|------|--------|------|
| **World** | Autonomous trong nhà (04A/04B-1) — mèo lớn hơn (~1.45×) | `PetLivingMainGameDriver` + `PetEntity` |
| **Pet Care** | Camera zoom + sprite ~2.8×; vuốt/đồ chơi/đồ ăn | `cmd:pet-care-mode`, `PetCareTouchOverlay` |

Không fork `PetSnapshot` / memory / personality.

## Slice 1 (branch hiện tại)

- Dev LAN **starter pack** thật (kibble + cá + len + bình nước) → hotbar hiện icon/qty
- Mèo **world scale** 1.45×
- **Pet Care** vào bằng prompt J khi gần mèo; thoát ESC
- Vuốt/stroke → bubble + intent `pet_purr` / `groom` presentation

## Tiếp theo

- Đồ chơi (cần câu, len), grooming brush, sniff accept/refuse presentation
- Renderer cận cảnh: sheet HD hoặc layered ears/tail (không chỉ scale)
- Personality modifiers cho refuse/shy
- Nối PR #10 authority cho consumption

## Owner trial

1. `npm run dev` → `/?living-pet=1`
2. Seed couple → nhận nuôi mèo → **claim kibble không bắt buộc** nếu starter pack đã có
3. Hotbar 1–4 có icon; đến gần mèo → **Chăm sóc gần (J)** → vuốt trên màn hình