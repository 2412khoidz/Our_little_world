-- Align persisted farm contract with Composer 3 farmPlotContract v1.0.1 (shop portal tile only).

ALTER TABLE public.world_farm_worlds
  DROP CONSTRAINT IF EXISTS world_farm_worlds_contract_version_check;

ALTER TABLE public.world_farm_worlds
  ALTER COLUMN contract_version SET DEFAULT '1.0.1';

ALTER TABLE public.world_farm_worlds
  ADD CONSTRAINT world_farm_worlds_contract_version_check
  CHECK (contract_version IN ('1.0.0', '1.0.1'));

UPDATE public.world_farm_worlds
SET contract_version = '1.0.1'
WHERE contract_version = '1.0.0';