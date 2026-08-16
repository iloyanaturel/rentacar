-- RentaFlow STEP 8: financial reporting + snapshots + contract number

DO $$
DECLARE
  org1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  admin1 UUID := '11111111-1111-1111-1111-111111111111';
  v1 UUID;
  v2 UUID;
  v3 UUID;
  c1 UUID;
  c2 UUID;
  r1 public.rentals%ROWTYPE;
  r2 public.rentals%ROWTYPE;
  r3 public.rentals%ROWTYPE;
  p_row public.payments%ROWTYPE;
  m_row public.maintenance_records%ROWTYPE;
  summary JSONB;
  perf JSONB;
  cust JSONB;
  stats JSONB;
  methods JSONB;
  contract1 TEXT;
  contract2 TEXT;
  exp_count INT;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);

  INSERT INTO public.vehicles (organization_id, plate, brand, model, daily_price, deposit_amount, current_km, status)
  VALUES (org1, '34 STP 801', 'Renault', 'Clio', 1000, 2000, 10000, 'AVAILABLE')
  RETURNING id INTO v1;
  INSERT INTO public.vehicles (organization_id, plate, brand, model, daily_price, deposit_amount, current_km, status)
  VALUES (org1, '34 STP 802', 'Ford', 'Focus', 1500, 3000, 20000, 'AVAILABLE')
  RETURNING id INTO v2;
  INSERT INTO public.vehicles (organization_id, plate, brand, model, daily_price, deposit_amount, current_km, status)
  VALUES (org1, '34 STP 803', 'Toyota', 'Corolla', 2000, 4000, 30000, 'AVAILABLE')
  RETURNING id INTO v3;

  INSERT INTO public.customers (organization_id, first_name, last_name, phone, address)
  VALUES (org1, 'Ahmet', 'Yılmaz', '05320008001', 'İstanbul')
  RETURNING id INTO c1;
  INSERT INTO public.customers (organization_id, first_name, last_name, phone)
  VALUES (org1, 'Mehmet', 'Kaya', '05320008002')
  RETURNING id INTO c2;

  -- Rental 1: 5 days × 1000 = 5000, start Sep 1
  SELECT * INTO r1 FROM public.create_rental(
    v1, c1, DATE '2026-11-01', TIME '10:00', DATE '2026-11-06', TIME '10:00',
    1000, 0, 0, 2000, 'COMPLETED'::public.rental_status, NULL, NULL, NULL
  );
  PERFORM test.assert_true(r1.contract_number LIKE 'RF-2026-%', 'contract number assigned');
  PERFORM test.assert_true(r1.customer_first_name = 'Ahmet', 'customer snapshot');
  PERFORM test.assert_true(r1.vehicle_plate = '34 STP 801', 'vehicle snapshot');
  PERFORM test.assert_true(r1.total_amount = 5000, 'rental1 total 5000');
  PERFORM test.assert_true(r1.deposit_amount = 2000, 'deposit excluded from total');

  -- Rental 2: 3 days × 1500 = 4500 + 500 extra
  SELECT * INTO r2 FROM public.create_rental(
    v2, c2, DATE '2026-11-05', TIME '10:00', DATE '2026-11-08', TIME '10:00',
    1500, 0, 500, 3000, 'ACTIVE'::public.rental_status, NULL, NULL, NULL
  );
  PERFORM test.assert_true(r2.total_amount = 5000, 'rental2 4500+500=5000');

  -- Rental 3 cancelled — must not count in revenue
  SELECT * INTO r3 FROM public.create_rental(
    v3, c1, DATE '2026-11-10', TIME '10:00', DATE '2026-11-12', TIME '10:00',
    2000, 0, 0, 4000, 'CANCELLED'::public.rental_status, NULL, NULL, NULL
  );

  -- Payments: 3000 + 2000 on r1, 1000 on r2 (void one later)
  PERFORM public.record_payment(r1.id, 3000, 'CASH'::public.payment_method, TIMESTAMPTZ '2026-11-02 12:00:00+03', NULL, NULL, NULL, 's8-p1');
  PERFORM public.record_payment(r1.id, 2000, 'CREDIT_CARD'::public.payment_method, TIMESTAMPTZ '2026-11-03 12:00:00+03', NULL, NULL, NULL, 's8-p2');
  SELECT * INTO p_row FROM public.record_payment(r2.id, 1000, 'BANK_TRANSFER'::public.payment_method, TIMESTAMPTZ '2026-11-06 12:00:00+03', NULL, NULL, NULL, 's8-p3');
  PERFORM public.reverse_payment(p_row.id, 'test reverse');

  -- Expense 4000 + maintenance 1500 (should become one expense row, not double)
  INSERT INTO public.expenses (organization_id, vehicle_id, category, amount, expense_date, description, created_by)
  VALUES (org1, v1, 'FUEL', 4000, DATE '2026-11-04', 'Yakıt', admin1);

  SELECT * INTO m_row FROM public.create_maintenance(
    v2, 'OIL_CHANGE'::public.maintenance_type, 'Yağ', NULL, DATE '2026-11-07',
    20100, 'Shell', 1500, 'COMPLETED'::public.maintenance_status, NULL, NULL, NULL
  );
  SELECT COUNT(*) INTO exp_count FROM public.expenses
  WHERE maintenance_id = m_row.id AND deleted_at IS NULL;
  PERFORM test.assert_true(exp_count = 1, 'maintenance expense once');

  summary := public.get_financial_summary(DATE '2026-11-01', DATE '2026-11-30');
  -- Revenue: 5000 + 5000 = 10000 (cancelled excluded). Deposit not in revenue.
  PERFORM test.assert_true((summary->>'revenue')::NUMERIC = 10000, 'revenue 10000');
  -- Collected: 3000+2000 = 5000 (voided 1000 excluded)
  PERFORM test.assert_true((summary->>'collected')::NUMERIC = 5000, 'collected 5000');
  -- Expenses: 4000 fuel + 1500 maintenance = 5500
  PERFORM test.assert_true((summary->>'expenses')::NUMERIC = 5500, 'expenses 5500');
  PERFORM test.assert_true((summary->>'net_income')::NUMERIC = 4500, 'net 4500');
  RAISE NOTICE 'PASS STEP8: financial summary';

  -- Outstanding includes unpaid active rentals
  PERFORM test.assert_true((summary->>'outstanding')::NUMERIC >= 5000, 'outstanding includes unpaid');

  perf := public.get_vehicle_performance(DATE '2026-11-01', DATE '2026-11-30');
  PERFORM test.assert_true(jsonb_array_length(perf) >= 3, 'vehicle performance rows');

  cust := public.get_customer_performance(DATE '2026-11-01', DATE '2026-11-30');
  PERFORM test.assert_true(jsonb_array_length(cust) >= 1, 'customer performance');

  stats := public.get_rental_statistics(DATE '2026-11-01', DATE '2026-11-30');
  PERFORM test.assert_true((stats->>'total')::INT = 3, 'rental total 3');
  PERFORM test.assert_true((stats->>'cancelled')::INT = 1, 'cancelled 1');

  methods := public.get_payment_method_report(DATE '2026-11-01', DATE '2026-11-30');
  PERFORM test.assert_true(jsonb_array_length(methods) >= 2, 'payment methods');

  contract1 := public.ensure_rental_contract_number(r1.id);
  contract2 := public.ensure_rental_contract_number(r1.id);
  PERFORM test.assert_true(contract1 = contract2, 'contract number stable');
  PERFORM test.assert_true(
    (public.get_rental_contract_data(r1.id)->>'contract_number') = contract1,
    'contract pdf data'
  );

  -- Snapshot stability: change live customer phone, contract still old
  UPDATE public.customers SET phone = '05999999999' WHERE id = c1;
  PERFORM test.assert_true(
    (SELECT customer_phone FROM public.rentals WHERE id = r1.id) = '05320008001',
    'snapshot phone preserved'
  );

  RAISE NOTICE 'PASS STEP8: all reporting tests';
END $$;
