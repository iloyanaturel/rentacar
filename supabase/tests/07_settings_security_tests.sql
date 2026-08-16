-- STEP 9: settings, roles, permissions, rental pricing snapshots
-- Assumes prior test fixtures from 01–06 may exist; uses isolated org.

DO $$
DECLARE
  v_org UUID := gen_random_uuid();
  v_owner UUID := gen_random_uuid();
  v_staff UUID := gen_random_uuid();
  v_vehicle UUID;
  v_customer UUID;
  v_rental public.rentals%ROWTYPE;
  v_settings public.organization_settings%ROWTYPE;
  v_invite public.organization_invitations%ROWTYPE;
  v_perms TEXT[];
  v_charge NUMERIC;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_owner, 'owner-step9@test.local'),
    (v_staff, 'staff-step9@test.local');

  INSERT INTO public.organizations (id, name, currency, timezone)
  VALUES (v_org, 'Step9 Org', 'TRY', 'Europe/Istanbul');

  INSERT INTO public.profiles (id, organization_id, full_name, role, status)
  VALUES
    (v_owner, v_org, 'Owner User', 'owner', 'ACTIVE'),
    (v_staff, v_org, 'Staff User', 'staff', 'ACTIVE');

  -- settings auto-created by trigger
  SELECT * INTO v_settings FROM public.organization_settings WHERE organization_id = v_org;
  ASSERT v_settings.organization_id IS NOT NULL, 'organization_settings missing';
  ASSERT v_settings.currency = 'TRY', 'default currency';

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);

  -- business profile
  PERFORM public.update_business_profile(jsonb_build_object(
    'name', 'Step9 Fleet',
    'tax_office', 'Kadıköy',
    'tax_number', '1234567890',
    'website', 'https://example.com'
  ));
  ASSERT (SELECT onboarding_business_done FROM public.organization_settings WHERE organization_id = v_org),
    'business onboarding flag';

  -- rental + tax settings
  PERFORM public.update_organization_settings(jsonb_build_object(
    'tax_enabled', true,
    'tax_rate', 20,
    'default_daily_km_limit', 300,
    'extra_km_price', 5,
    'late_return_tolerance_minutes', 60,
    'late_return_fee', 250,
    'default_deposit_amount', 5000,
    'onboarding_rental_done', true
  ));

  INSERT INTO public.vehicles (
    organization_id, plate, brand, model, daily_price, deposit_amount, status, current_km
  ) VALUES (
    v_org, '34 S9 001', 'Fiat', 'Egea', 1500, 3000, 'AVAILABLE', 10000
  ) RETURNING id INTO v_vehicle;

  INSERT INTO public.customers (
    organization_id, first_name, last_name, phone, is_active
  ) VALUES (
    v_org, 'Ayşe', 'Demir', '05321112233', true
  ) RETURNING id INTO v_customer;

  -- create rental — snapshots
  v_rental := public.create_rental(
    v_vehicle, v_customer,
    DATE '2026-12-01', TIME '10:00',
    DATE '2026-12-06', TIME '10:00',
    NULL, 0, 0, 0, 'RESERVED', NULL, NULL, NULL
  );

  ASSERT v_rental.km_limit = 1500, 'km_limit snapshot 300*5';
  ASSERT v_rental.extra_km_price = 5, 'extra_km snapshot';
  ASSERT v_rental.tax_rate = 20, 'tax snapshot';
  ASSERT v_rental.currency = 'TRY', 'currency snapshot';
  ASSERT v_rental.late_return_tolerance_minutes = 60, 'late tolerance snapshot';

  -- changing settings must not rewrite rental
  PERFORM public.update_organization_settings(jsonb_build_object(
    'extra_km_price', 99,
    'tax_rate', 10,
    'default_daily_km_limit', 100
  ));
  ASSERT (SELECT extra_km_price FROM public.rentals WHERE id = v_rental.id) = 5,
    'rental snapshot immutable';
  ASSERT (SELECT tax_rate FROM public.rentals WHERE id = v_rental.id) = 20,
    'tax snapshot immutable';

  v_charge := public.calculate_extra_km_charge(1500, 10000, 11750, 5);
  ASSERT v_charge = 1250, 'extra km 250*5';

  -- permissions
  v_perms := public.get_user_permissions();
  ASSERT 'users.invite' = ANY (v_perms), 'owner has users.invite';
  ASSERT 'reports.view' = ANY (v_perms), 'owner has reports';

  -- invite + role
  v_invite := public.invite_organization_user('newhire@test.local', 'Yeni Personel', 'staff');
  ASSERT v_invite.token IS NOT NULL, 'invite token';

  -- staff cannot manage users
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  v_perms := public.get_user_permissions();
  ASSERT NOT ('users.invite' = ANY (v_perms)), 'staff no invite';
  ASSERT NOT ('reports.view' = ANY (v_perms)), 'staff no reports';

  BEGIN
    PERFORM public.invite_organization_user('x@test.local', 'X', 'staff');
    RAISE EXCEPTION 'staff invite should fail';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%staff invite should fail%' THEN RAISE; END IF;
  END;

  -- suspend staff as owner
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM public.set_user_status(v_staff, 'SUSPENDED');
  ASSERT public.get_user_organization_id() IS NOT NULL;

  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  ASSERT public.get_user_organization_id() IS NULL, 'suspended has no org id';
  ASSERT public.can_write() = false, 'suspended cannot write';

  -- last owner protection
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  BEGIN
    PERFORM public.set_user_role(v_owner, 'admin');
    RAISE EXCEPTION 'last owner demote should fail';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%last owner demote should fail%' THEN RAISE; END IF;
  END;

  RAISE NOTICE 'STEP 9 settings/security tests OK';
END $$;
