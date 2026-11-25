# PR #10 — Composer 2: `petLiving` + hand-feed App wiring (C2)

**Owner:** Composer 2 (UI shell). **This PR (#10) does not touch `App.tsx` / `WorldScene`** — those stay on PR #13 integration.

## Already on this branch (authority + adapter)

| Layer | What |
|-------|------|
| SQL | `20261125001200_pet_consume_hand_food.sql` — RPC `pet_consume_hand_food` (PET_FULL ≥92 hunger, debit inventory) |
| `WorldBackend.pet.consumeHandFood` | `supabaseBackend` + Dev LAN `POST /pet/consume-hand-food` |
| `WorldBackend.petLiving` | `getLivingSnapshot`, `submitLivingProposal`, `respondLivingProposal`, `applyLivingDecision` (authority RPCs) |
| Domain | `src/shared/petLiving/*` (brain, physical care, food catalog) |

## C2 merge checklist (after #13 lands App shell)

1. **Hand-feed from hotbar** — when context action targets pet and selected slot is `PET_FOOD_CATALOG` edible:
   - Call `backend.pet?.consumeHandFood({ worldId, itemSku, idempotencyKey, petVersion })`.
   - On success, refresh pet snapshot + inventory (same pattern as other `pet` mutations).
   - Map `PET_FULL` → toast tiếng Việt (không trừ thức ăn).
2. **Living proposals** — use `backend.petLiving` only for co-op living table flows; do **not** call deprecated `submitLivingProposal({ proof })` for authorization.
3. **Dev LAN** — require `x-dev-user-id`; no extra VPN. PET_FULL E2E: feed until hunger high, expect soft failure.
4. **Production** — hide dev impersonation; pet routes behind RLS + world membership.

## Explicit non-goals on #10

- No Quick Nav / farm hotbar (Mission 05 / #14).
- No duplicate `App.tsx` edits — rebase onto #13 and wire handlers in the slots Composer 2 owns (physical interaction + pet HUD).

## Local DoD (this branch)

`npm run lint`, `typecheck`, `test`, `build` — run before merge; GitHub Actions not required yet.