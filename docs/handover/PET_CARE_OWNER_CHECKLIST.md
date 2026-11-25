# Pet Care — Owner acceptance checklist (Mission 04C)

**Branch:** `cursor/mission-04c-pet-experience-36fd` / PR #13  
**Merge deps:** PR **#10** (consumption RPC) before Supabase prod; PR **#11** (living overworld) can merge before/parallel — care uses same `PetSnapshot`.

## Session goals (5–10 phút)

| # | Hành động | Kỳ vọng |
|---|-----------|---------|
| 1 | Vào care (J gần mèo hoặc đồ chơi) | `PetCareScene`, mèo cận cảnh atlas 48px, đuôi/đồng tử |
| 2 | Vuốt đầu/cằm/lưng | Bubble + anim purr/groom khác nhau |
| 3 | Gọi mèo / Quan sát | Chủ động hoặc zzz; autonomy sau im lặng |
| 4 | Slot len → J | Kéo len, mèo vồ/đuổi |
| 5 | Slot hộp → J | Hộp + peek anim |
| 6 | Slot cá → J | Sniff/eat + **trừ kho** (dev LAN / Supabase) |
| 7 | Chải (J khi không cầm đồ trong care) | Groom anim |
| 8 | Thoát ESC, vào lại | State mèo không fork |

## Automated

```bash
# CI ~90s session + trace
npm run test:e2e -- tests/e2e/pet-care-session-acceptance.spec.ts

# Owner long run ~5 phút
OLW_ACCEPTANCE_LONG=1 npm run test:e2e -- tests/e2e/pet-care-session-acceptance.spec.ts

# Screenshot burst
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 node scripts/capture-pet-care-session.mjs
```

## Authority

- Prod Supabase: `pet_consume_hand_food` (migration `20261125001200`).
- Dev LAN: `POST /pet/consume-hand-food`.
- DEV-only: `?living-pet=1` + `SERVER_AUTHORITY_REQUIRED` → presentation fallback (không trừ kho).