-- Extra STEP 4 vehicle RPC / mileage / plate tests (appended after core suite)

DO $$
DECLARE
  org1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  admin1 UUID := '11111111-1111-1111-1111-111111111111';
  v_id UUID;
  v_row public.vehicles%ROWTYPE;
  cnt INTEGER;
BEGIN
  -- Ensure fixtures from core tests exist; create minimal if missing
  INSERT INTO public.organizations (id, name)
  VALUES (org1, 'Test Org 1')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email)
  VALUES (admin1, 'admin1@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, organization_id, full_name, role)
  VALUES (admin1, org1, 'Admin One', 'admin')
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);

  INSERT INTO public.vehicles (
    organization_id, plate, brand, model, daily_price, current_km, status
  ) VALUES (
    org1, '34 STP 400', 'Honda', 'Civic', 2100, 10000, 'AVAILABLE'
  ) RETURNING id INTO v_id;

  -- Plate normalize uniqueness: spaced vs compacted
  BEGIN
    INSERT INTO public.vehicles (
      organization_id, plate, brand, model, daily_price
    ) VALUES (
      org1, '34stp400', 'Honda', 'City', 1800
    );
    RAISE EXCEPTION 'ASSERT FAILED: normalized plate should conflict';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'PASS STEP4: Normalized plate uniqueness';
  END;

  -- Mileage increase OK
  SELECT * INTO v_row FROM public.update_vehicle_mileage(v_id, 12000, 'test');
  PERFORM test.assert_true(v_row.current_km = 12000, 'mileage up');
  SELECT COUNT(*) INTO cnt FROM public.vehicle_mileage_logs WHERE vehicle_id = v_id;
  PERFORM test.assert_true(cnt >= 1, 'mileage log exists');
  RAISE NOTICE 'PASS STEP4: Mileage update + log';

  -- Mileage decrease blocked
  BEGIN
    PERFORM public.update_vehicle_mileage(v_id, 11000, 'bad');
    RAISE EXCEPTION 'ASSERT FAILED: mileage decrease allowed';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('düşük' IN SQLERRM) = 0 THEN
        RAISE EXCEPTION 'Unexpected mileage error: %', SQLERRM;
      END IF;
      RAISE NOTICE 'PASS STEP4: Mileage decrease blocked';
  END;

  -- Status to maintenance
  SELECT * INTO v_row FROM public.update_vehicle_status(v_id, 'MAINTENANCE');
  PERFORM test.assert_true(v_row.status = 'MAINTENANCE', 'maintenance');
  RAISE NOTICE 'PASS STEP4: Status → MAINTENANCE';

  -- Soft archive
  SELECT * INTO v_row FROM public.archive_vehicle(v_id);
  PERFORM test.assert_true(v_row.deleted_at IS NOT NULL, 'soft delete');
  SELECT COUNT(*) INTO cnt FROM public.vehicles WHERE id = v_id AND deleted_at IS NULL;
  PERFORM test.assert_true(cnt = 0, 'hidden from active');
  RAISE NOTICE 'PASS STEP4: Soft delete archive';

  RAISE NOTICE 'ALL STEP 4 VEHICLE DB TESTS PASSED';
END;
$$;
