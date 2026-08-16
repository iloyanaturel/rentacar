-- STEP 10: production security — cross-org isolation + role RPC denial
-- Reuses fixture orgs from STEP 2 tests when present; otherwise bootstraps.

DO $$
DECLARE
  org1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  org2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  admin1 UUID := '11111111-1111-1111-1111-111111111111';
  admin2 UUID := '44444444-4444-4444-4444-444444444444';
  staff1 UUID := '22222222-2222-2222-2222-222222222222';
  v2 UUID;
  c2 UUID;
  r1 UUID;
  p1 UUID;
  e1 UUID;
  m1 UUID;
  cnt INTEGER;
BEGIN
  INSERT INTO public.organizations (id, name) VALUES
    (org1, 'ProdSec Org1'), (org2, 'ProdSec Org2')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email) VALUES
    (admin1, 'admin1@test.local'),
    (admin2, 'admin2@test.local'),
    (staff1, 'staff1@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, organization_id, full_name, role, status) VALUES
    (admin1, org1, 'Admin One', 'admin', 'ACTIVE'),
    (admin2, org2, 'Admin Two', 'admin', 'ACTIVE'),
    (staff1, org1, 'Staff One', 'staff', 'ACTIVE')
  ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

  INSERT INTO public.vehicles (organization_id, plate, brand, model, daily_price, status)
  VALUES (org2, '06 SEC 002', 'Fiat', 'Egea', 900, 'AVAILABLE')
  RETURNING id INTO v2;

  INSERT INTO public.customers (organization_id, first_name, last_name, phone, is_active)
  VALUES (org2, 'Org2', 'Customer', '05329998877', true)
  RETURNING id INTO c2;

  PERFORM set_config('request.jwt.claim.sub', admin2::text, true);
  r1 := (public.create_rental(
    v2, c2,
    DATE '2027-01-10', TIME '10:00',
    DATE '2027-01-12', TIME '10:00',
    900, 0, 0, 1000, 'RESERVED', NULL, NULL, NULL
  )).id;

  INSERT INTO public.expenses (organization_id, category, amount, expense_date, description)
  VALUES (org2, 'FUEL', 500, DATE '2027-01-10', 'org2 fuel')
  RETURNING id INTO e1;

  INSERT INTO public.maintenance_records (
    organization_id, vehicle_id, maintenance_type, status, scheduled_date, maintenance_date, amount
  ) VALUES (
    org2, v2, 'PERIODIC', 'SCHEDULED', DATE '2027-02-01', DATE '2027-02-01', 0
  ) RETURNING id INTO m1;

  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);
  EXECUTE 'SET SESSION AUTHORIZATION rentaflow_app';
  EXECUTE 'SET ROLE authenticated';

  SELECT COUNT(*) INTO cnt FROM public.vehicles WHERE id = v2;
  IF cnt <> 0 THEN RAISE EXCEPTION 'CROSS-ORG LEAK: vehicles'; END IF;

  SELECT COUNT(*) INTO cnt FROM public.customers WHERE id = c2;
  IF cnt <> 0 THEN RAISE EXCEPTION 'CROSS-ORG LEAK: customers'; END IF;

  SELECT COUNT(*) INTO cnt FROM public.rentals WHERE id = r1;
  IF cnt <> 0 THEN RAISE EXCEPTION 'CROSS-ORG LEAK: rentals'; END IF;

  SELECT COUNT(*) INTO cnt FROM public.expenses WHERE id = e1;
  IF cnt <> 0 THEN RAISE EXCEPTION 'CROSS-ORG LEAK: expenses'; END IF;

  SELECT COUNT(*) INTO cnt FROM public.maintenance_records WHERE id = m1;
  IF cnt <> 0 THEN RAISE EXCEPTION 'CROSS-ORG LEAK: maintenance'; END IF;

  EXECUTE 'RESET ROLE';
  EXECUTE 'SET SESSION AUTHORIZATION DEFAULT';
  PERFORM set_config('request.jwt.claim.sub', admin2::text, true);
  p1 := (public.record_payment(
    r1, 500, 'CASH', now(), NULL, NULL, NULL, 'sec-idem-1'
  )).id;

  PERFORM set_config('request.jwt.claim.sub', admin1::text, true);
  EXECUTE 'SET SESSION AUTHORIZATION rentaflow_app';
  EXECUTE 'SET ROLE authenticated';
  SELECT COUNT(*) INTO cnt FROM public.payments WHERE id = p1;
  IF cnt <> 0 THEN RAISE EXCEPTION 'CROSS-ORG LEAK: payments'; END IF;

  EXECUTE 'RESET ROLE';
  EXECUTE 'SET SESSION AUTHORIZATION DEFAULT';

  PERFORM set_config('request.jwt.claim.sub', staff1::text, true);
  IF public.can_view_reports() THEN
    RAISE EXCEPTION 'STAFF should not can_view_reports';
  END IF;
  IF public.can_manage_users() THEN
    RAISE EXCEPTION 'STAFF should not can_manage_users';
  END IF;

  BEGIN
    PERFORM public.invite_organization_user('blocked@test.local', 'Blocked', 'staff');
    RAISE EXCEPTION 'STAFF invite should fail';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%STAFF invite should fail%' THEN RAISE; END IF;
  END;

  -- Cron fan-out RPC exists and is callable as postgres
  PERFORM public.refresh_operational_notifications_for_org(org2);

  RAISE NOTICE 'PASS STEP10: cross-org isolation + staff RPC denial + cron RPC';
END $$;
