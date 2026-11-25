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
| **Pet Care** | Rig Phaser cận cảnh (layer tai/đuôi/bubble); HUD React mỏng | `PetCareCloseUpRig`, `cmd:pet-care-action` |

Không fork `PetSnapshot` / memory / personality.

## Slice 5 (branch hiện tại)

- `petCareHandFeedAuthority.ts` — Supabase/Dev LAN `consumeHandFood` + optional `petLiving.getLivingSnapshot`; DEV fallback isolated
- `PetLivingBackend` on WorldBackend (types aligned #10)
- Session goals tracker + mobile overlay touch targets

## Slice 4

- **Dedicated care atlas** `petCarePortraitPainter.ts` (48px procedural, không copy upscaled 24px)
- **`pet_consume_hand_food`** migration + Supabase `consumeHandFood` (prod path); DEV fallback presentation chỉ khi `?living-pet=1` + `SERVER_AUTHORITY_REQUIRED`
- E2E **pet-care-session-acceptance** (60s CI / 6 phút với `OLW_ACCEPTANCE_LONG=1`, trace on)
- Owner checklist: `PET_CARE_OWNER_CHECKLIST.md`

## Slice 3

- **`PetCareScene`** tách khỏi WorldScene — giảm xung đột map/PR #12
- **`PetCarePortraitRig`**: atlas care riêng + **mắt/đồng tử** + nhịp thở; toys kéo (len/hộp) + chase
- **`PetCareAutonomy`**: mèo chủ động gọi/ngủ/chơi khi player im lặng
- Authority: `consumeHandFood` (dev LAN) + `evt:pet-care-request-consume` — trừ kho + `cmd:sync-pet`
- Hotbar contract: `docs/handover/PET_CARE_HOTBAR_CONTRACT.md`

## Slice 2

- **PetCareCloseUpRig** (~5.75× sprite + tai/đuôi procedural) thay zoom 2.85×
- Vuốt trực tiếp trên canvas; `petCareReactions` theo personality (refuse bụng, sniff ăn)
- Hotbar toys/food + J: `roll_toy`, `offer_food`, chải (`brush`), gọi/quan sát trên HUD
- **`ensurePetCareStarterPackIfMissing`** trên GET `/inventory` — world cũ cũng có đồ

## Tiếp theo

- HD sheet / biểu cảm mắt riêng; authority PR #10 cho trừ kho
- Mini-session scripted (ngủ → liếm → chơi len) telemetry cho owner trial

## Owner trial

1. `npm run dev` → `/?living-pet=1`
2. Seed couple → nhận nuôi mèo → **claim kibble không bắt buộc** nếu starter pack đã có
3. Hotbar 1–4 có icon; đến gần mèo → **Chăm sóc gần (J)** → vuốt trên màn hình