# PR #10 ↔ Composer 2 — `petLiving` + hand-feed wiring

**Foundation (#10)** owns SQL + `WorldBackend.petLiving` + `consumeHandFood` RPCs. **App / PetCareScene (#13)** owns shell wiring on `integration/playtest-all`. Canonical #10 handover @ `de7a4a5`.

## On stack after merge

| Concern | Location |
|---------|----------|
| SQL / RPC | `20261125001200_pet_consume_hand_food.sql`, `pet_living_*` migrations (#10) |
| Hand-feed authority | `src/features/petCare/petCareHandFeedAuthority.ts` → `backend.pet.consumeHandFood` (#13) |
| `PET_FULL` toast | `supabaseBackend` maps `PET_FULL` → user-facing “Bé no rồi…” (#13 / #10 align) |
| Optional living refresh | After success: `backend.petLiving?.getLivingSnapshot(worldId)` when present |
| DEV isolation | `?living-pet=1` fallback **only** in DEV when `SERVER_AUTHORITY_REQUIRED` |
| `WorldBackend.petLiving` | `supabaseBackend` + Dev LAN pet living routes (#10) |

## C2 wiring checklist

1. Single migration `20261125001200` on integration (deduped).
2. Map server codes (`INSUFFICIENT_ITEMS`, `VERSION_CONFLICT`, `PET_FULL`) to toasts in consume path.
3. Living proposals — use `backend.petLiving` for authority flows; no client-only proof in prod.

## Related

- **PR #11:** overworld `?living-pet=1` (DEV); shares `PetSnapshot` with care scene.

## Not in this slice

- Overworld `PetLivingMainGameDriver` server proposals (PR #11 + scene from #12).
- Bowl `applyPetCare` in care close-up (presentation bowls in scene).

## Local DoD

`npm run lint`, `typecheck`, `test`, `build` — CI via `.github/workflows/ci.yml` on `integration/night-merge`.