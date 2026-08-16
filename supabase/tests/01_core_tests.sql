-- RentaFlow STEP 2 database tests
-- Emulates auth.uid() via request.jwt.claim.sub
-- Uses SET SESSION AUTHORIZATION to a non-superuser so RLS is enforced.

CREATE SCHEMA IF NOT EXISTS test;

CREATE OR REPLACE FUNCTION test.assert_true(cond BOOLEAN, msg TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT cond THEN
    RAISE EXCEPTION 'ASSERT FAILED: %', msg;
  END IF;
END;
$$;

DO $$
DECLARE
  org1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  org2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  admin1 UUID := '11111111-1111-1111-1111-111111111111';
  staff1 UUID := '22222222-2222-2222-2222-222222222222';
  viewer1 UUID := '33333333-3333-3333-3333-333333333333';
  admin2 UUID := '44444444-4444-4444-4444-444444444444';
  v_id UUID;
  v_id2 UUID;
  c_id UUID;
  r_row public.rentals%ROWTYPE;
  r_id UUID;
  r_id2 UUID;
  p_row public.payments%ROWTYPE;
  cnt INTEGER;
  paid NUMERIC;
  rem NUMERIC;
  total NUMERIC;
  status_text TEXT;
  veh_status public.vehicle_status;
  days_expected INTEGER;
BEGIN
  GRANT USAGE ON SCHEMA test TO rentaflow_app, authenticated;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test TO rentaflow_app, authenticated;

  -- Bootstrap as superuser (bypass RLS for fixtures)
  INSERT INTO public.organizations (id, name) VALUES
    (org1, 'Test Org 1'),
    (org2, 'Test Org 2')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email) VALUES
    (admin1, 'admin1@test.local'),
    (staff1, 'staff1@test.local'),
    (viewer1, 'viewer1@test.local'),
    (admin2, 'admin2@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, organization_id, full_name, role) VALUES
    (admin1, org1, 'Admin One', 'admin'),
    (staff1, org1, 'Staff One', 'staff'),
    (viewer1, org1, 'Viewer One', 'viewer'),
    (admin2, org2, 'Admin Two', 'admin')
  ON CONFLICT (id) DO NOTHING;

  -- ========== TEST 1: vehicle create ==========
  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);
  INSERT INTO public.vehicles (
    organization_id, plate, brand, model, daily_price, status
  ) VALUES (
    org1, '34 TST 001', 'Toyota', 'Corolla', 2000, 'AVAILABLE'
  ) RETURNING id INTO v_id;
  PERFORM test.assert_true(v_id IS NOT NULL, 'Test 1: Araç oluşturulabiliyor');
  RAISE NOTICE 'PASS Test 1: Araç oluşturulabiliyor';

  -- ========== TEST 2: duplicate plate same org ==========
  BEGIN
    INSERT INTO public.vehicles (
      organization_id, plate, brand, model, daily_price
    ) VALUES (
      org1, '34 TST 001', 'Toyota', 'Yaris', 1500
    );
    RAISE EXCEPTION 'ASSERT FAILED: Test 2 should have failed on duplicate plate';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'PASS Test 2: Aynı organization içinde aynı plaka engellendi';
  END;

  UPDATE public.vehicles SET deleted_at = now() WHERE id = v_id;
  INSERT INTO public.vehicles (
    organization_id, plate, brand, model, daily_price
  ) VALUES (
    org1, '34 TST 001', 'Toyota', 'Corolla', 2000
  ) RETURNING id INTO v_id;
  PERFORM test.assert_true(v_id IS NOT NULL, 'Test 2b soft-delete reuse');
  RAISE NOTICE 'PASS Test 2b: Soft-delete sonrası plaka yeniden kullanılabilir';

  -- ========== TEST 3: same plate different org ==========
  PERFORM set_config('request.jwt.claim.sub', admin2::text, true);
  INSERT INTO public.vehicles (
    organization_id, plate, brand, model, daily_price
  ) VALUES (
    org2, '34 TST 001', 'Renault', 'Clio', 1200
  ) RETURNING id INTO v_id2;
  PERFORM test.assert_true(v_id2 IS NOT NULL, 'Test 3');
  RAISE NOTICE 'PASS Test 3: İki farklı organization aynı plakayı kullanabiliyor';

  -- ========== TEST 4: RLS isolation (non-superuser) ==========
  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);
  EXECUTE 'SET SESSION AUTHORIZATION rentaflow_app';
  EXECUTE 'SET ROLE authenticated';
  SELECT COUNT(*) INTO cnt FROM public.vehicles WHERE id = v_id2;
  IF cnt <> 0 THEN
    EXECUTE 'RESET ROLE';
    EXECUTE 'SET SESSION AUTHORIZATION DEFAULT';
    RAISE EXCEPTION 'ASSERT FAILED: Test 4: Başka org aracı görünmemeli';
  END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET SESSION AUTHORIZATION DEFAULT';
  RAISE NOTICE 'PASS Test 4: Kullanıcı başka organization araçlarını göremiyor';

  -- Customer
  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);
  INSERT INTO public.customers (
    organization_id, first_name, last_name, phone
  ) VALUES (
    org1, 'Ali', 'Veli', '05320001111'
  ) RETURNING id INTO c_id;

  -- ========== TEST 5: overlapping rental blocked ==========
  SELECT * INTO r_row FROM public.create_rental(
    v_id, c_id,
    DATE '2026-09-01', TIME '10:00',
    DATE '2026-09-05', TIME '10:00',
    2000, 0, 0, 5000, 'RESERVED'::public.rental_status, NULL, NULL, NULL
  );
  r_id := r_row.id;

  BEGIN
    PERFORM public.create_rental(
      v_id, c_id,
      DATE '2026-09-03', TIME '10:00',
      DATE '2026-09-08', TIME '10:00',
      2000, 0, 0, 5000, 'RESERVED'::public.rental_status, NULL, NULL, NULL
    );
    RAISE EXCEPTION 'ASSERT FAILED: Test 5 overlap should fail';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('müsait değil' IN SQLERRM) = 0 THEN
        RAISE EXCEPTION 'Test 5 unexpected: %', SQLERRM;
      END IF;
      RAISE NOTICE 'PASS Test 5: Çakışan kiralama engellendi';
  END;

  -- ========== TEST 6: CANCELLED does not block ==========
  PERFORM public.cancel_rental(r_id, 'Test iptal');

  SELECT * INTO r_row FROM public.create_rental(
    v_id, c_id,
    DATE '2026-09-03', TIME '10:00',
    DATE '2026-09-08', TIME '10:00',
    2000, 0, 0, 5000, 'ACTIVE'::public.rental_status, NULL, NULL, NULL
  );
  r_id2 := r_row.id;
  SELECT status INTO veh_status FROM public.vehicles WHERE id = v_id;
  PERFORM test.assert_true(veh_status = 'RENTED', 'ACTIVE → RENTED');
  RAISE NOTICE 'PASS Test 6: CANCELLED çakışmaya neden olmuyor; ACTIVE → RENTED';

  -- ========== TEST 7: payment totals ==========
  SELECT * INTO p_row FROM public.record_payment(
    r_id2, 3000, 'CASH'::public.payment_method, now(), 'Kısmi'
  );
  SELECT paid_amount, remaining_amount, total_amount,
         public.compute_payment_status(total_amount, paid_amount)
  INTO paid, rem, total, status_text
  FROM public.rentals WHERE id = r_id2;

  PERFORM test.assert_true(paid = 3000, 'paid_amount');
  PERFORM test.assert_true(status_text = 'PARTIALLY_PAID', 'PARTIALLY_PAID');
  PERFORM test.assert_true(rem = total - 3000, 'remaining');
  RAISE NOTICE 'PASS Test 7: Ödeme hesapları doğru (PARTIALLY_PAID)';

  -- ========== TEST 8: complete rental ==========
  PERFORM public.complete_rental(
    r_id2, DATE '2026-09-08', TIME '10:00', 50000, 'FULL', 0, 0, 'OK'
  );
  SELECT status INTO veh_status FROM public.vehicles WHERE id = v_id;
  PERFORM test.assert_true(veh_status = 'AVAILABLE', 'AVAILABLE after complete');
  SELECT status::text, remaining_amount INTO status_text, rem
  FROM public.rentals WHERE id = r_id2;
  PERFORM test.assert_true(status_text = 'COMPLETED', 'COMPLETED');
  PERFORM test.assert_true(rem > 0, 'open balance kept');
  RAISE NOTICE 'PASS Test 8: Teslim → AVAILABLE; açık bakiye korunur';

  -- ========== TEST 9: staff write via RLS ==========
  PERFORM set_config('request.jwt.claim.sub', staff1::text, true);
  EXECUTE 'SET SESSION AUTHORIZATION rentaflow_app';
  EXECUTE 'SET ROLE authenticated';
  INSERT INTO public.vehicles (organization_id, plate, brand, model, daily_price)
  VALUES (org1, '34 STF 001', 'Fiat', 'Egea', 1400);
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET SESSION AUTHORIZATION DEFAULT';
  RAISE NOTICE 'PASS Test 9: Staff araç ekleyebiliyor';

  -- ========== TEST 10: viewer cannot write ==========
  PERFORM set_config('request.jwt.claim.sub', viewer1::text, true);
  EXECUTE 'SET SESSION AUTHORIZATION rentaflow_app';
  EXECUTE 'SET ROLE authenticated';
  BEGIN
    INSERT INTO public.vehicles (organization_id, plate, brand, model, daily_price)
    VALUES (org1, '34 VEW 001', 'Ford', 'Focus', 1300);
    EXECUTE 'RESET ROLE';
    EXECUTE 'SET SESSION AUTHORIZATION DEFAULT';
    RAISE EXCEPTION 'ASSERT FAILED: viewer should not insert';
  EXCEPTION
    WHEN OTHERS THEN
      BEGIN
        EXECUTE 'RESET ROLE';
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
      BEGIN
        EXECUTE 'SET SESSION AUTHORIZATION DEFAULT';
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
      IF SQLERRM LIKE 'ASSERT FAILED:%' THEN
        RAISE;
      END IF;
      RAISE NOTICE 'PASS Test 10: Viewer veri değiştiremiyor';
  END;

  -- Deposit excluded from total_amount
  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);
  days_expected := GREATEST(
    CEIL(EXTRACT(EPOCH FROM (TIMESTAMP '2026-10-03 09:00' - TIMESTAMP '2026-10-01 09:00')) / 86400.0)::INTEGER,
    1
  );
  SELECT * INTO r_row FROM public.create_rental(
    (SELECT id FROM public.vehicles WHERE plate = '34 STF 001' AND organization_id = org1 AND deleted_at IS NULL LIMIT 1),
    c_id,
    DATE '2026-10-01', TIME '09:00',
    DATE '2026-10-03', TIME '09:00',
    1400, 0, 0, 9999, 'RESERVED'::public.rental_status, NULL, NULL, NULL
  );
  PERFORM test.assert_true(r_row.total_amount = days_expected * 1400, 'total without deposit');
  PERFORM test.assert_true(r_row.deposit_amount = 9999, 'deposit separate');
  RAISE NOTICE 'PASS Extra: Depozito total_amount içinde değil';

  RAISE NOTICE '==============================';
  RAISE NOTICE 'ALL STEP 2 DATABASE TESTS PASSED';
  RAISE NOTICE '==============================';
END;
$$;
