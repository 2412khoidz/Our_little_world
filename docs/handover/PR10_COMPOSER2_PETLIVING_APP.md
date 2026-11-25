# PR #10 → Composer 2 App wiring (implemented on PR #13)

Foundation (#10) owns SQL + `WorldBackend.petLiving`; **App shell stays on #13**.

## Done on `cursor/mission-04c-pet-experience-36fd`

| Concern | Location |
|---------|----------|
| Hand-feed authority | `src/features/petCare/petCareHandFeedAuthority.ts` → `backend.pet.consumeHandFood` |
| Optional living refresh | After success: `backend.petLiving?.getLivingSnapshot(worldId)` when present |
| DEV isolation | `?living-pet=1` fallback **only** in DEV when `SERVER_AUTHORITY_REQUIRED` |
| Types | `PetLivingBackend` + `petAuthorityTypes.ts` aligned with #10 |

## Merge integration

1. Merge **#10** before claiming prod Supabase living + consume.
2. Drop duplicate migration `20261125001200` if both branches carry it (one file).
3. Map server codes (`INSUFFICIENT_ITEMS`, `VERSION_CONFLICT`, `COOLDOWN_ACTIVE`) — user-facing toasts in `App.tsx` consume path.

## Not on #13

- Overworld `PetLivingMainGameDriver` server proposals (PR #11/#10 driver).
- Bowl `applyPetCare` in care close-up (presentation-only bowls in scene).