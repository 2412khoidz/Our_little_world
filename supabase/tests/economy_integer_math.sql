BEGIN;
SET LOCAL plpgsql.check_asserts = on;
DO $$
BEGIN
  ASSERT public._economy_mul_bp(0, 10000) = 0;
  ASSERT public._economy_mul_bp(5, 15500) = 7;
  ASSERT public._economy_mul_bp(9999, 7000) = 6999;
  ASSERT public._economy_mul_bp(900719925474, 10000) = 900719925474;
  BEGIN
    PERFORM public._economy_mul_bp(900719925475, 10000);
    RAISE EXCEPTION 'unsafe product accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'VALIDATION_ERROR' THEN RAISE; END IF;
  END;
  ASSERT NOT has_function_privilege('authenticated', 'public._economy_mul_bp(bigint,integer)', 'EXECUTE');
  ASSERT public._economy_saturation_mul_bp(0, 20, 250, 7000) = 10000;
  ASSERT public._economy_saturation_mul_bp(20, 20, 250, 7000) = 9750;
  ASSERT public._economy_saturation_mul_bp(35, 20, 250, 7000) = 7000;
  ASSERT NOT has_function_privilege('authenticated', 'public._economy_saturation_mul_bp(integer,integer,integer,integer)', 'EXECUTE');
END;
$$;
ROLLBACK;
