-- Internal integer basis-point primitive. Server RPCs must validate all money
-- and quantities and use this only after validating their own inputs.
CREATE FUNCTION public._economy_mul_bp(p_amount bigint, p_bp integer)
RETURNS bigint
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_result numeric;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 OR p_amount > 9007199254740991
     OR p_bp IS NULL OR p_bp < 0 OR p_bp > 1000000 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  v_result := p_amount::numeric * p_bp::numeric;
  IF v_result > 9007199254740991 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_result := floor(v_result / 10000);
  RETURN v_result::bigint;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._economy_mul_bp(bigint, integer)
FROM PUBLIC, anon, authenticated, service_role;
