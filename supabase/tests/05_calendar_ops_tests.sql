-- RentaFlow STEP 7: calendar / maintenance / expenses / notifications

DO $$
DECLARE
  org1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  admin1 UUID := '11111111-1111-1111-1111-111111111111';
  v_id UUID;
  c_id UUID;
  r_row public.rentals%ROWTYPE;
  m_row public.maintenance_records%ROWTYPE;
  exp_count INT;
  cal_count INT;
  n_count INT;
  settings_row public.notification_settings%ROWTYPE;
  ops JSONB;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);

  INSERT INTO public.vehicles (
    organization_id, plate, brand, model, daily_price, deposit_amount, current_km, status,
    insurance_expiry
  ) VALUES (
    org1, '34 STP 701', 'Ford', 'Focus', 1800, 4000, 50000, 'AVAILABLE',
    (now() AT TIME ZONE 'Europe/Istanbul')::date + 10
  ) RETURNING id INTO v_id;

  INSERT INTO public.customers (organization_id, first_name, last_name, phone)
  VALUES (org1, 'Mehmet', 'Demir', '05320007001')
  RETURNING id INTO c_id;

  SELECT * INTO r_row FROM public.create_rental(
    v_id, c_id,
    DATE '2026-08-15', TIME '10:00',
    DATE '2026-08-18', TIME '10:00',
    1800, 0, 0, 4000, 'RESERVED'::public.rental_status, NULL, NULL, NULL
  );

  SELECT COUNT(*) INTO cal_count
  FROM public.get_calendar_rentals(DATE '2026-08-01', DATE '2026-08-31', NULL, NULL, NULL);
  PERFORM test.assert_true(cal_count >= 1, 'calendar range returns rental');

  SELECT COUNT(*) INTO cal_count
  FROM public.get_calendar_rentals(DATE '2026-09-01', DATE '2026-09-30', NULL, NULL, NULL)
  WHERE rental_id = r_row.id;
  PERFORM test.assert_true(cal_count = 0, 'calendar excludes out-of-range');
  RAISE NOTICE 'PASS STEP7: calendar range filter';

  SELECT * INTO m_row FROM public.create_maintenance(
    v_id,
    'OIL_CHANGE'::public.maintenance_type,
    'Yağ değişimi',
    'Periyodik yağ',
    (now() AT TIME ZONE 'Europe/Istanbul')::date + 3,
    50500,
    'Shell',
    1500,
    'SCHEDULED'::public.maintenance_status,
    NULL,
    NULL,
    NULL
  );
  PERFORM test.assert_true(m_row.status = 'SCHEDULED', 'maintenance scheduled');
  PERFORM test.assert_true(
    (SELECT current_km FROM public.vehicles WHERE id = v_id) = 50500,
    'odometer updated on create'
  );
  RAISE NOTICE 'PASS STEP7: create maintenance + km';

  SELECT * INTO m_row FROM public.start_maintenance(m_row.id);
  PERFORM test.assert_true(m_row.status = 'IN_PROGRESS', 'maintenance in progress');
  PERFORM test.assert_true(
    (SELECT status FROM public.vehicles WHERE id = v_id) = 'MAINTENANCE',
    'vehicle maintenance status'
  );
  RAISE NOTICE 'PASS STEP7: start maintenance → vehicle MAINTENANCE';

  SELECT * INTO m_row FROM public.complete_maintenance(m_row.id);
  PERFORM test.assert_true(m_row.status = 'COMPLETED', 'maintenance completed');
  SELECT COUNT(*) INTO exp_count
  FROM public.expenses
  WHERE maintenance_id = m_row.id AND deleted_at IS NULL;
  PERFORM test.assert_true(exp_count = 1, 'maintenance cost → single expense');

  -- complete again should not duplicate expense
  BEGIN
    PERFORM public.complete_maintenance(m_row.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT COUNT(*) INTO exp_count
  FROM public.expenses
  WHERE maintenance_id = m_row.id AND deleted_at IS NULL;
  PERFORM test.assert_true(exp_count = 1, 'no duplicate maintenance expense');
  RAISE NOTICE 'PASS STEP7: complete maintenance + expense once';

  SELECT * INTO settings_row FROM public.ensure_notification_settings(NULL);
  PERFORM test.assert_true(settings_row.user_id = admin1, 'notification settings ensured');

  n_count := public.refresh_operational_notifications();
  PERFORM test.assert_true(n_count >= 0, 'refresh notifications ok');

  PERFORM public.mark_notifications_read(true, NULL);
  PERFORM test.assert_true(
    (SELECT COUNT(*) FROM public.notifications WHERE is_read = false AND user_id = admin1) = 0,
    'mark all read'
  );
  RAISE NOTICE 'PASS STEP7: notifications settings + refresh + mark read';

  ops := public.get_ops_today_summary();
  PERFORM test.assert_true(ops ? 'handovers_today', 'ops summary keys');
  RAISE NOTICE 'PASS STEP7: ops today summary';

  RAISE NOTICE 'PASS STEP7: all';
END $$;
