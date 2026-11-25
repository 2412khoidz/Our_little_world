# PR #10 ↔ Composer 2 — `petLiving` + hand-feed wiring

**Foundation (#10)** owns SQL + `WorldBackend.petLiving` + `consumeHandFood` RPCs. **App / PetCareScene (#13)** owns shell wiring after stack merge (`integration/playtest-all`).

## On stack after merge

| Concern | Location |
|---------|----------|
| SQL / RPC | `20261125001200_pet_consume_hand_food.sql`, `pet_living_*` migrations (#10) |
| Hand-feed authority | `src/features/petCare/petCareHandFeedAuthority.ts` → `backend.pet.consumeHandFood` (#13) |
| Optional living refresh | After success: `backend.petLiving?.getLivingSnapshot(worldId)` when present |
| DEV isolation | `?living-pet=1` fallback **only** in DEV when `SERVER_AUTHORITY_REQUIRED` |
| `WorldBackend.petLiving` | `supabaseBackend` + Dev LAN pet living routes (#10) |

## C2 wiring checklist

1. Merge **#10** before prod Supabase living + consume on a single migration file.
2. Drop duplicate `20261125001200` if both branches carried it — **keep one** on integration.
3. Map server codes (`INSUFFICIENT_ITEMS`, `VERSION_CONFLICT`, `COOLDOWN_ACTIVE`) to toasts in consume path.
4. Living proposals — use `backend.petLiving` for authority flows; do not use deprecated client-only proof paths in prod.

## Not in this slice

- Overworld `PetLivingMainGameDriver` server proposals (PR #11 + scene from #12).
- Bowl `applyPetCare` in care close-up (presentation bowls in scene).

## Local DoD

`npm run lint`, `typecheck`, `test`, `build` — CI via `.github/workflows/ci.yml` on `integration/night-merge`.