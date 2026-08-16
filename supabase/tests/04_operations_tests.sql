-- RentaFlow STEP 6: payment / handover / return / deposit tests

DO $$
DECLARE
  org1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  admin1 UUID := '11111111-1111-1111-1111-111111111111';
  v_id UUID;
  c_id UUID;
  r_row public.rentals%ROWTYPE;
  p1 public.payments%ROWTYPE;
  p2 public.payments%ROWTYPE;
  h_row public.rental_handovers%ROWTYPE;
  ret public.rental_returns%ROWTYPE;
  dep public.rental_deposits%ROWTYPE;
  paid NUMERIC;
  rem NUMERIC;
  veh_status public.vehicle_status;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);

  INSERT INTO public.vehicles (
    organization_id, plate, brand, model, daily_price, deposit_amount, current_km, status
  ) VALUES (
    org1, '34 STP 601', 'Renault', 'Clio', 1500, 3000, 42500, 'AVAILABLE'
  ) RETURNING id INTO v_id;

  INSERT INTO public.customers (organization_id, first_name, last_name, phone)
  VALUES (org1, 'Ayşe', 'Kaya', '05320006001')
  RETURNING id INTO c_id;

  SELECT * INTO r_row FROM public.create_rental(
    v_id, c_id,
    DATE '2026-08-15', TIME '14:00',
    DATE '2026-08-20', TIME '14:00',
    1500, 500, 0, 3000, 'RESERVED'::public.rental_status, NULL, NULL, NULL
  );
  PERFORM test.assert_true(r_row.total_amount = 7000, 'rental total 7000');
  PERFORM test.assert_true(r_row.deposit_amount = 3000, 'deposit separate');

  SELECT * INTO dep FROM public.rental_deposits WHERE rental_id = r_row.id;
  PERFORM test.assert_true(dep.status = 'PENDING', 'deposit pending');
  RAISE NOTICE 'PASS STEP6: rental + deposit row';

  -- Payments 3000 + 2000
  SELECT * INTO p1 FROM public.record_payment(
    r_row.id, 3000, 'CASH'::public.payment_method, now(), 'ilk', NULL, NULL, 'idem-1'
  );
  SELECT * INTO p2 FROM public.record_payment(
    r_row.id, 2000, 'CREDIT_CARD'::public.payment_method, now(), 'iki', NULL, NULL, 'idem-2'
  );
  SELECT paid_amount, remaining_amount INTO paid, rem FROM public.rentals WHERE id = r_row.id;
  PERFORM test.assert_true(paid = 5000, 'paid 5000');
  PERFORM test.assert_true(rem = 2000, 'remaining 2000');

  -- Overpay blocked
  BEGIN
    PERFORM public.record_payment(r_row.id, 5000, 'CASH'::public.payment_method, now(), NULL, NULL, NULL, NULL);
    RAISE EXCEPTION 'ASSERT FAILED: overpay';
  EXCEPTION WHEN OTHERS THEN
    IF position('kalan borçtan fazla' IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'overpay unexpected: %', SQLERRM;
    END IF;
    RAISE NOTICE 'PASS STEP6: overpay blocked';
  END;

  -- Idempotency
  SELECT * INTO p1 FROM public.record_payment(
    r_row.id, 3000, 'CASH'::public.payment_method, now(), 'ilk', NULL, NULL, 'idem-1'
  );
  PERFORM test.assert_true(
    (SELECT COUNT(*) FROM public.payments WHERE rental_id = r_row.id AND voided_at IS NULL) = 2,
    'idempotent'
  );
  RAISE NOTICE 'PASS STEP6: payments + idempotency';

  -- Handover
  SELECT * INTO h_row FROM public.complete_handover(
    r_row.id, 42650, 'FULL'::public.fuel_level, true, 'Ayşe Kaya', NULL,
    '[{"severity":"MINOR","location_key":"FRONT_BUMPER","location_label":"Ön tampon","description":"çizik","estimated_amount":0}]'::jsonb,
    NULL, 'handover-1'
  );
  SELECT status INTO veh_status FROM public.vehicles WHERE id = v_id;
  PERFORM test.assert_true(veh_status = 'RENTED', 'vehicle rented');
  PERFORM test.assert_true(
    (SELECT status FROM public.rentals WHERE id = r_row.id) = 'ACTIVE',
    'rental active'
  );
  PERFORM test.assert_true(
    (SELECT status FROM public.rental_deposits WHERE rental_id = r_row.id) = 'HELD',
    'deposit held'
  );
  RAISE NOTICE 'PASS STEP6: handover ACTIVE + RENTED + deposit HELD';

  -- Return with extra 1000, partial deposit, maintenance
  SELECT * INTO ret FROM public.complete_return(
    r_row.id,
    43120,
    'HALF'::public.fuel_level,
    TIMESTAMPTZ '2026-08-20 18:00:00+03',
    true,
    'PARTIAL_REFUND',
    1000,
    true,
    'iade notu',
    '[{"charge_type":"CLEANING","description":"temizlik","amount":1000}]'::jsonb,
    '[{"severity":"MODERATE","location_key":"RIGHT_FRONT_DOOR","location_label":"Sağ ön kapı","description":"yeni","estimated_amount":2000}]'::jsonb,
    NULL,
    NULL,
    'CASH'::public.payment_method,
    'return-1'
  );

  PERFORM test.assert_true(ret.late_minutes > 0, 'late minutes');
  SELECT total_amount, paid_amount, remaining_amount INTO paid, rem, rem
  FROM public.rentals WHERE id = r_row.id;
  -- paid was 5000, total became 8000 (7000+1000), remaining 3000
  PERFORM test.assert_true(
    (SELECT total_amount FROM public.rentals WHERE id = r_row.id) = 8000,
    'grand total 8000'
  );
  PERFORM test.assert_true(
    (SELECT remaining_amount FROM public.rentals WHERE id = r_row.id) = 3000,
    'remaining 3000'
  );
  PERFORM test.assert_true(
    (SELECT status FROM public.rentals WHERE id = r_row.id) = 'COMPLETED',
    'completed'
  );
  PERFORM test.assert_true(
    (SELECT status FROM public.vehicles WHERE id = v_id) = 'MAINTENANCE',
    'maintenance'
  );
  PERFORM test.assert_true(
    (SELECT status FROM public.rental_deposits WHERE rental_id = r_row.id) = 'PARTIALLY_REFUNDED',
    'deposit partial'
  );
  PERFORM test.assert_true(
    (SELECT COUNT(*) FROM public.rental_damages WHERE rental_id = r_row.id AND timing = 'NEW') = 1,
    'new damage'
  );
  PERFORM test.assert_true(
    (SELECT COUNT(*) FROM public.vehicle_mileage_logs WHERE rental_id = r_row.id) >= 2,
    'mileage logs'
  );
  RAISE NOTICE 'PASS STEP6: return COMPLETED + MAINTENANCE + finance consistency';

  RAISE NOTICE '==============================';
  RAISE NOTICE 'ALL STEP 6 DATABASE TESTS PASSED';
  RAISE NOTICE '==============================';
END;
$$;
