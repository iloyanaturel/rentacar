-- RentaFlow STEP 5: customer + rental availability / pricing tests

DO $$
DECLARE
  org1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  org2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  admin1 UUID := '11111111-1111-1111-1111-111111111111';
  admin2 UUID := '44444444-4444-4444-4444-444444444444';
  v_clio UUID;
  v_other UUID;
  v_org2 UUID;
  c1 UUID;
  c2 UUID;
  r1 public.rentals%ROWTYPE;
  r2 public.rentals%ROWTYPE;
  r3 public.rentals%ROWTYPE;
  avail BOOLEAN;
  stats JSONB;
BEGIN
  -- Ensure fixtures from 01_core_tests exist; create dedicated vehicles
  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);

  INSERT INTO public.vehicles (
    organization_id, plate, brand, model, daily_price, deposit_amount, status
  ) VALUES (
    org1, '34 CLI 001', 'Renault', 'Clio', 1500, 3000, 'AVAILABLE'
  ) RETURNING id INTO v_clio;

  INSERT INTO public.vehicles (
    organization_id, plate, brand, model, daily_price, status
  ) VALUES (
    org1, '34 FIA 001', 'Fiat', 'Egea', 1400, 'AVAILABLE'
  ) RETURNING id INTO v_other;

  INSERT INTO public.customers (
    organization_id, first_name, last_name, phone, is_active
  ) VALUES (
    org1, 'Ahmet', 'Yılmaz', '05321112233', true
  ) RETURNING id INTO c1;

  -- ========== Test 1: 01-05 Sep Clio succeeds ==========
  SELECT * INTO r1 FROM public.create_rental(
    v_clio, c1,
    DATE '2026-09-01', TIME '10:00',
    DATE '2026-09-05', TIME '10:00',
    1500, 500, 0, 3000, 'RESERVED'::public.rental_status, NULL, NULL, NULL
  );
  PERFORM test.assert_true(r1.id IS NOT NULL, 'Test1 rental created');
  PERFORM test.assert_true(r1.total_days = 4, 'Test1 days ceil');
  -- 4 days * 1500 = 6000 - 500 = 5500; deposit separate
  PERFORM test.assert_true(r1.subtotal = 6000, 'Test1 subtotal');
  PERFORM test.assert_true(r1.total_amount = 5500, 'Test1 total after discount');
  PERFORM test.assert_true(r1.deposit_amount = 3000, 'Test1 deposit separate');
  RAISE NOTICE 'PASS STEP5-1: 01-05 Clio + pricing/discount/deposit';

  -- Explicit 5-day finance example (15-20 Aug style)
  -- Recreate pricing assertion with exact 5*1500
  PERFORM public.cancel_rental(r1.id, 'reset');
  SELECT * INTO r1 FROM public.create_rental(
    v_clio, c1,
    DATE '2026-09-01', TIME '10:00',
    DATE '2026-09-06', TIME '10:00',
    1500, 500, 0, 3000, 'RESERVED'::public.rental_status, NULL, NULL, NULL
  );
  PERFORM test.assert_true(r1.total_days = 5, 'Finance days=5');
  PERFORM test.assert_true(r1.subtotal = 7500, 'Finance subtotal');
  PERFORM test.assert_true(r1.total_amount = 7000, 'Finance total');
  PERFORM test.assert_true(r1.deposit_amount = 3000, 'Finance deposit');
  RAISE NOTICE 'PASS STEP5-Finance: 5x1500-500=7000; deposit 3000';

  -- ========== Test 2: 03-08 same Clio fails ==========
  BEGIN
    PERFORM public.create_rental(
      v_clio, c1,
      DATE '2026-09-03', TIME '10:00',
      DATE '2026-09-08', TIME '10:00',
      1500, 0, 0, 0, 'RESERVED'::public.rental_status, NULL, NULL, NULL
    );
    RAISE EXCEPTION 'ASSERT FAILED: overlap should fail';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('müsait değil' IN SQLERRM) = 0 THEN
        RAISE EXCEPTION 'STEP5-2 unexpected: %', SQLERRM;
      END IF;
      RAISE NOTICE 'PASS STEP5-2: overlapping rental blocked';
  END;

  -- ========== Test 3: boundary 06 10:00 after [01-06) ==========
  -- period is [start, end) so next booking at end timestamp is OK
  SELECT public.check_vehicle_availability(
    v_clio,
    DATE '2026-09-06', TIME '10:00',
    DATE '2026-09-10', TIME '10:00',
    NULL
  ) INTO avail;
  PERFORM test.assert_true(avail = true, 'boundary available');
  SELECT * INTO r2 FROM public.create_rental(
    v_clio, c1,
    DATE '2026-09-06', TIME '10:00',
    DATE '2026-09-10', TIME '10:00',
    1500, 0, 0, 0, 'RESERVED'::public.rental_status, NULL, NULL, NULL
  );
  PERFORM test.assert_true(r2.id IS NOT NULL, 'boundary rental');
  RAISE NOTICE 'PASS STEP5-3: end-boundary half-open range allows adjacent booking';

  -- ========== Test 4: CANCELLED frees slot ==========
  PERFORM public.cancel_rental(r1.id, 'test cancel');
  PERFORM public.cancel_rental(r2.id, 'test cancel');
  SELECT * INTO r3 FROM public.create_rental(
    v_clio, c1,
    DATE '2026-09-01', TIME '10:00',
    DATE '2026-09-05', TIME '10:00',
    1500, 0, 0, 0, 'RESERVED'::public.rental_status, NULL, NULL, NULL
  );
  PERFORM test.assert_true(r3.id IS NOT NULL, 'after cancel');
  RAISE NOTICE 'PASS STEP5-4: CANCELLED does not block new rental';

  -- ========== Test 5: different vehicle same dates OK ==========
  SELECT * INTO r2 FROM public.create_rental(
    v_other, c1,
    DATE '2026-09-01', TIME '10:00',
    DATE '2026-09-05', TIME '10:00',
    1400, 0, 0, 0, 'RESERVED'::public.rental_status, NULL, NULL, NULL
  );
  PERFORM test.assert_true(r2.id IS NOT NULL, 'other vehicle');
  RAISE NOTICE 'PASS STEP5-5: different vehicle same dates allowed';

  -- ========== Test 6: org isolation ==========
  PERFORM set_config('request.jwt.claim.sub', admin2::text, true);
  INSERT INTO public.vehicles (
    organization_id, plate, brand, model, daily_price, status
  ) VALUES (
    org2, '34 CLI 001', 'Renault', 'Clio', 1500, 'AVAILABLE'
  ) RETURNING id INTO v_org2;
  INSERT INTO public.customers (
    organization_id, first_name, last_name, phone
  ) VALUES (
    org2, 'Ayşe', 'Demir', '05329998877'
  ) RETURNING id INTO c2;
  SELECT * INTO r2 FROM public.create_rental(
    v_org2, c2,
    DATE '2026-09-01', TIME '10:00',
    DATE '2026-09-05', TIME '10:00',
    1500, 0, 0, 0, 'RESERVED'::public.rental_status, NULL, NULL, NULL
  );
  PERFORM test.assert_true(r2.organization_id = org2, 'org2 rental');
  RAISE NOTICE 'PASS STEP5-6: different organization isolated';

  -- start_rental + ACTIVE → RENTED
  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);
  SELECT * INTO r1 FROM public.start_rental(r3.id);
  PERFORM test.assert_true(r1.status = 'ACTIVE', 'started ACTIVE');
  PERFORM test.assert_true(
    (SELECT status FROM public.vehicles WHERE id = v_clio) = 'RENTED',
    'vehicle RENTED'
  );
  RAISE NOTICE 'PASS STEP5-start: RESERVED → ACTIVE updates vehicle';

  -- customer stats
  SELECT public.get_customer_stats(c1) INTO stats;
  PERFORM test.assert_true((stats->>'rental_count')::int >= 1, 'customer stats');
  RAISE NOTICE 'PASS STEP5-customer-stats';

  -- archive customer with active rental should fail
  BEGIN
    PERFORM public.archive_customer(c1);
    RAISE EXCEPTION 'ASSERT FAILED: archive with active rental';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('aktif kiralama' IN SQLERRM) = 0 THEN
        RAISE EXCEPTION 'archive unexpected: %', SQLERRM;
      END IF;
      RAISE NOTICE 'PASS STEP5-archive-block: active rental blocks archive';
  END;

  -- discount > subtotal fails
  BEGIN
    PERFORM public.create_rental(
      v_other, c1,
      DATE '2026-11-01', TIME '10:00',
      DATE '2026-11-03', TIME '10:00',
      1000, 99999, 0, 0, 'RESERVED'::public.rental_status, NULL, NULL, NULL
    );
    RAISE EXCEPTION 'ASSERT FAILED: discount guard';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('İndirim' IN SQLERRM) = 0 THEN
        RAISE EXCEPTION 'discount unexpected: %', SQLERRM;
      END IF;
      RAISE NOTICE 'PASS STEP5-discount-guard';
  END;

  RAISE NOTICE '==============================';
  RAISE NOTICE 'ALL STEP 5 DATABASE TESTS PASSED';
  RAISE NOTICE '==============================';
END;
$$;
