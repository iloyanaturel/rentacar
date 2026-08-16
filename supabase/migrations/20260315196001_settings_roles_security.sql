-- RentaFlow STEP 9: settings, roles/permissions, invitations, rental pricing snapshots

-- ---------------------------------------------------------------------------
-- Extend user_role enum (keep existing admin/staff/viewer)
-- ---------------------------------------------------------------------------
DO $$ BEGIN ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager'; EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Organizations: business fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS tax_office TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'tr-TR',
  ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'DD.MM.YYYY';

-- ---------------------------------------------------------------------------
-- Profiles: status + invitation metadata
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users (id),
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- Promote existing admins conceptually remain admin; first admin → owner optional later
UPDATE public.profiles SET status = 'ACTIVE' WHERE status IS NULL;

-- ---------------------------------------------------------------------------
-- organization_settings (1:1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations (id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'TRY',
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  locale TEXT NOT NULL DEFAULT 'tr-TR',
  date_format TEXT NOT NULL DEFAULT 'DD.MM.YYYY',
  tax_enabled BOOLEAN NOT NULL DEFAULT false,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  default_deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (default_deposit_amount >= 0),
  default_daily_km_limit INTEGER CHECK (default_daily_km_limit IS NULL OR default_daily_km_limit >= 0),
  extra_km_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (extra_km_price >= 0),
  late_return_tolerance_minutes INTEGER NOT NULL DEFAULT 60 CHECK (late_return_tolerance_minutes >= 0),
  late_return_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (late_return_fee >= 0),
  contract_title TEXT NOT NULL DEFAULT 'Kiralama Sözleşmesi',
  contract_footer TEXT,
  contract_body TEXT,
  onboarding_business_done BOOLEAN NOT NULL DEFAULT false,
  onboarding_vehicle_done BOOLEAN NOT NULL DEFAULT false,
  onboarding_user_done BOOLEAN NOT NULL DEFAULT false,
  onboarding_rental_done BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER organization_settings_set_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY organization_settings_select ON public.organization_settings
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY organization_settings_write ON public.organization_settings
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role()::text IN ('owner', 'admin')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role()::text IN ('owner', 'admin')
  );

GRANT SELECT, INSERT, UPDATE ON public.organization_settings TO authenticated;

-- Seed settings for existing orgs
INSERT INTO public.organization_settings (organization_id, currency, timezone)
SELECT o.id, COALESCE(o.currency, 'TRY'), COALESCE(o.timezone, 'Europe/Istanbul')
FROM public.organizations o
WHERE o.deleted_at IS NULL
ON CONFLICT (organization_id) DO NOTHING;

-- Auto-create settings when org created
CREATE OR REPLACE FUNCTION public.organizations_ensure_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_settings (organization_id, currency, timezone)
  VALUES (NEW.id, COALESCE(NEW.currency, 'TRY'), COALESCE(NEW.timezone, 'Europe/Istanbul'))
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_ensure_settings_trg ON public.organizations;
CREATE TRIGGER organizations_ensure_settings_trg
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.organizations_ensure_settings();

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  email TEXT NOT NULL,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'staff',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users (id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_invitations_email_org_uidx UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS organization_invitations_token_idx
  ON public.organization_invitations (token);

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations FORCE ROW LEVEL SECURITY;

CREATE POLICY organization_invitations_select ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role()::text IN ('owner', 'admin')
  );

CREATE POLICY organization_invitations_write ON public.organization_invitations
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role()::text IN ('owner', 'admin')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role()::text IN ('owner', 'admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;

-- ---------------------------------------------------------------------------
-- Rental pricing snapshots
-- ---------------------------------------------------------------------------
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS km_limit INTEGER,
  ADD COLUMN IF NOT EXISTS extra_km_price NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_return_tolerance_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS late_return_fee_snapshot NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS contract_title_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS contract_body_snapshot TEXT;

-- ---------------------------------------------------------------------------
-- Auth helpers: role capabilities (extend without breaking admin/staff/viewer)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text IN ('owner', 'admin') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT role::text IN ('owner', 'admin', 'manager', 'staff')
        AND status = 'ACTIVE'
      FROM public.profiles WHERE id = auth.uid()
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT role::text IN ('owner', 'admin') AND status = 'ACTIVE'
      FROM public.profiles WHERE id = auth.uid()
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_reports()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT role::text IN ('owner', 'admin', 'manager') AND status = 'ACTIVE'
      FROM public.profiles WHERE id = auth.uid()
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_settings()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_users();
$$;

CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'ACTIVE' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_status public.user_status;
BEGIN
  SELECT role::text, status INTO v_role, v_status FROM public.profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_status <> 'ACTIVE' THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  IF v_role = 'owner' THEN
    RETURN ARRAY[
      'vehicles.view','vehicles.create','vehicles.update','vehicles.delete',
      'customers.view','customers.create','customers.update',
      'rentals.view','rentals.create','rentals.update','rentals.cancel','rentals.complete',
      'payments.view','payments.create','payments.reverse',
      'expenses.view','expenses.create','expenses.update','expenses.delete',
      'maintenance.view','maintenance.create','maintenance.update',
      'reports.view','reports.export',
      'users.view','users.invite','users.suspend',
      'settings.view','settings.update'
    ];
  ELSIF v_role = 'admin' THEN
    RETURN ARRAY[
      'vehicles.view','vehicles.create','vehicles.update','vehicles.delete',
      'customers.view','customers.create','customers.update',
      'rentals.view','rentals.create','rentals.update','rentals.cancel','rentals.complete',
      'payments.view','payments.create','payments.reverse',
      'expenses.view','expenses.create','expenses.update','expenses.delete',
      'maintenance.view','maintenance.create','maintenance.update',
      'reports.view','reports.export',
      'users.view','users.invite','users.suspend',
      'settings.view','settings.update'
    ];
  ELSIF v_role = 'manager' THEN
    RETURN ARRAY[
      'vehicles.view','vehicles.create','vehicles.update',
      'customers.view','customers.create','customers.update',
      'rentals.view','rentals.create','rentals.update','rentals.cancel','rentals.complete',
      'payments.view','payments.create',
      'expenses.view','expenses.create',
      'maintenance.view','maintenance.create','maintenance.update',
      'reports.view','reports.export',
      'settings.view'
    ];
  ELSIF v_role = 'staff' THEN
    RETURN ARRAY[
      'vehicles.view',
      'customers.view','customers.create','customers.update',
      'rentals.view','rentals.create','rentals.update','rentals.complete',
      'payments.view','payments.create',
      'maintenance.view',
      'settings.view'
    ];
  ELSE -- viewer
    RETURN ARRAY[
      'vehicles.view','customers.view','rentals.view','payments.view',
      'expenses.view','maintenance.view','settings.view'
    ];
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions() TO authenticated;


CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid()
    AND status = 'ACTIVE';
$$;

CREATE OR REPLACE FUNCTION public.ensure_organization_settings()
RETURNS public.organization_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
  v_row public.organization_settings%ROWTYPE;
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Organizasyon bulunamadı.'; END IF;
  INSERT INTO public.organization_settings (organization_id)
  VALUES (v_org)
  ON CONFLICT (organization_id) DO NOTHING;
  SELECT * INTO v_row FROM public.organization_settings WHERE organization_id = v_org;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organization_settings(p_patch JSONB)
RETURNS public.organization_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.organization_settings%ROWTYPE;
BEGIN
  IF NOT public.can_manage_settings() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz bulunmuyor.';
  END IF;
  PERFORM public.ensure_organization_settings();

  UPDATE public.organization_settings SET
    currency = COALESCE(p_patch->>'currency', currency),
    timezone = COALESCE(p_patch->>'timezone', timezone),
    locale = COALESCE(p_patch->>'locale', locale),
    date_format = COALESCE(p_patch->>'date_format', date_format),
    tax_enabled = COALESCE((p_patch->>'tax_enabled')::BOOLEAN, tax_enabled),
    tax_rate = COALESCE((p_patch->>'tax_rate')::NUMERIC, tax_rate),
    default_deposit_amount = COALESCE((p_patch->>'default_deposit_amount')::NUMERIC, default_deposit_amount),
    default_daily_km_limit = CASE
      WHEN p_patch ? 'default_daily_km_limit' THEN NULLIF(p_patch->>'default_daily_km_limit','')::INTEGER
      ELSE default_daily_km_limit END,
    extra_km_price = COALESCE((p_patch->>'extra_km_price')::NUMERIC, extra_km_price),
    late_return_tolerance_minutes = COALESCE((p_patch->>'late_return_tolerance_minutes')::INTEGER, late_return_tolerance_minutes),
    late_return_fee = COALESCE((p_patch->>'late_return_fee')::NUMERIC, late_return_fee),
    contract_title = COALESCE(p_patch->>'contract_title', contract_title),
    contract_footer = COALESCE(p_patch->>'contract_footer', contract_footer),
    contract_body = COALESCE(p_patch->>'contract_body', contract_body),
    onboarding_business_done = COALESCE((p_patch->>'onboarding_business_done')::BOOLEAN, onboarding_business_done),
    onboarding_vehicle_done = COALESCE((p_patch->>'onboarding_vehicle_done')::BOOLEAN, onboarding_vehicle_done),
    onboarding_user_done = COALESCE((p_patch->>'onboarding_user_done')::BOOLEAN, onboarding_user_done),
    onboarding_rental_done = COALESCE((p_patch->>'onboarding_rental_done')::BOOLEAN, onboarding_rental_done),
    onboarding_completed_at = CASE
      WHEN COALESCE((p_patch->>'onboarding_completed')::BOOLEAN, false) THEN now()
      ELSE onboarding_completed_at END,
    updated_at = now()
  WHERE organization_id = v_org
  RETURNING * INTO v_row;

  UPDATE public.organizations SET
    currency = COALESCE(p_patch->>'currency', currency),
    timezone = COALESCE(p_patch->>'timezone', timezone),
    locale = COALESCE(p_patch->>'locale', locale),
    date_format = COALESCE(p_patch->>'date_format', date_format),
    updated_at = now()
  WHERE id = v_org;

  PERFORM public.write_audit_log(
    v_org, 'BUSINESS_SETTINGS_UPDATED', 'organization_settings', v_org, p_patch
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_business_profile(p_patch JSONB)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.organizations%ROWTYPE;
BEGIN
  IF NOT public.can_manage_settings() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz bulunmuyor.';
  END IF;

  UPDATE public.organizations SET
    name = COALESCE(NULLIF(p_patch->>'name',''), name),
    phone = COALESCE(p_patch->>'phone', phone),
    email = COALESCE(p_patch->>'email', email),
    website = COALESCE(p_patch->>'website', website),
    address = COALESCE(p_patch->>'address', address),
    tax_office = COALESCE(p_patch->>'tax_office', tax_office),
    tax_number = COALESCE(p_patch->>'tax_number', tax_number),
    logo_url = COALESCE(p_patch->>'logo_url', logo_url),
    updated_at = now()
  WHERE id = v_org
  RETURNING * INTO v_row;

  UPDATE public.organization_settings SET
    onboarding_business_done = true,
    updated_at = now()
  WHERE organization_id = v_org;

  PERFORM public.write_audit_log(v_org, 'BUSINESS_SETTINGS_UPDATED', 'organization', v_org, p_patch);
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_organization_users()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
BEGIN
  IF NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz bulunmuyor.';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'phone', p.phone,
      'role', p.role,
      'status', p.status,
      'avatar_url', p.avatar_url,
      'last_sign_in_at', p.last_sign_in_at,
      'created_at', p.created_at,
      'email', au.email
    ) ORDER BY p.created_at)
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE p.organization_id = v_org
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_organization_user(
  p_email TEXT,
  p_full_name TEXT,
  p_role public.user_role DEFAULT 'staff'
)
RETURNS public.organization_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.organization_invitations%ROWTYPE;
  v_token TEXT := encode(extensions.gen_random_bytes(24), 'hex');
BEGIN
  IF NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz bulunmuyor.';
  END IF;
  IF p_role::text = 'owner' AND public.get_user_role()::text <> 'owner' THEN
    RAISE EXCEPTION 'OWNER rolü yalnızca OWNER tarafından atanabilir.';
  END IF;
  IF lower(trim(p_email)) = '' THEN
    RAISE EXCEPTION 'E-posta zorunludur.';
  END IF;

  INSERT INTO public.organization_invitations (
    organization_id, email, full_name, role, token, invited_by
  ) VALUES (
    v_org, lower(trim(p_email)), NULLIF(trim(p_full_name),''), p_role, v_token, auth.uid()
  )
  ON CONFLICT (organization_id, email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    token = EXCLUDED.token,
    invited_by = auth.uid(),
    accepted_at = NULL,
    expires_at = now() + interval '14 days'
  RETURNING * INTO v_row;

  PERFORM public.write_audit_log(
    v_org, 'USER_INVITED', 'invitation', v_row.id,
    jsonb_build_object('email_domain', split_part(v_row.email, '@', 2), 'role', p_role)
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_status(p_user_id UUID, p_status public.user_status)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
BEGIN
  IF NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz bulunmuyor.';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Kendi hesabınızı pasifleştiremezsiniz.';
  END IF;

  SELECT * INTO v_target FROM public.profiles
  WHERE id = p_user_id AND organization_id = v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kullanıcı bulunamadı.'; END IF;

  IF v_target.role::text = 'owner' AND p_status = 'SUSPENDED' THEN
    IF (SELECT COUNT(*) FROM public.profiles
        WHERE organization_id = v_org AND role::text = 'owner' AND status = 'ACTIVE') <= 1 THEN
      RAISE EXCEPTION 'Son OWNER pasifleştirilemez.';
    END IF;
  END IF;

  UPDATE public.profiles SET
    status = p_status,
    suspended_at = CASE WHEN p_status = 'SUSPENDED' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_row;

  PERFORM public.write_audit_log(
    v_org,
    CASE WHEN p_status = 'SUSPENDED' THEN 'USER_SUSPENDED' ELSE 'USER_ROLE_CHANGED' END,
    'profile', p_user_id,
    jsonb_build_object('status', p_status)
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id UUID, p_role public.user_role)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_owner_count INT;
BEGIN
  IF NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz bulunmuyor.';
  END IF;

  SELECT * INTO v_target FROM public.profiles
  WHERE id = p_user_id AND organization_id = v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kullanıcı bulunamadı.'; END IF;

  IF v_target.role::text = 'owner' AND p_role::text <> 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count FROM public.profiles
    WHERE organization_id = v_org AND role::text = 'owner' AND status = 'ACTIVE';
    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'Son OWNER rolü değiştirilemez. Önce başka bir OWNER atayın.';
    END IF;
  END IF;

  IF p_role::text = 'owner' AND public.get_user_role()::text <> 'owner' THEN
    RAISE EXCEPTION 'OWNER rolü yalnızca OWNER tarafından atanabilir.';
  END IF;

  UPDATE public.profiles SET role = p_role, updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_row;

  PERFORM public.write_audit_log(
    v_org, 'USER_ROLE_CHANGED', 'profile', p_user_id,
    jsonb_build_object('role', p_role)
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_last_sign_in()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET last_sign_in_at = now(), updated_at = now()
  WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_onboarding_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_settings public.organization_settings%ROWTYPE;
  v_vehicle_count INT;
  v_user_count INT;
BEGIN
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('ready', false);
  END IF;
  PERFORM public.ensure_organization_settings();
  SELECT * INTO v_settings FROM public.organization_settings WHERE organization_id = v_org;
  SELECT COUNT(*) INTO v_vehicle_count FROM public.vehicles WHERE organization_id = v_org AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_user_count FROM public.profiles WHERE organization_id = v_org;

  IF v_vehicle_count > 0 AND NOT v_settings.onboarding_vehicle_done THEN
    UPDATE public.organization_settings SET onboarding_vehicle_done = true WHERE organization_id = v_org;
    v_settings.onboarding_vehicle_done := true;
  END IF;
  IF v_user_count > 1 AND NOT v_settings.onboarding_user_done THEN
    UPDATE public.organization_settings SET onboarding_user_done = true WHERE organization_id = v_org;
    v_settings.onboarding_user_done := true;
  END IF;

  RETURN jsonb_build_object(
    'business', v_settings.onboarding_business_done,
    'vehicle', v_settings.onboarding_vehicle_done,
    'user', v_settings.onboarding_user_done,
    'rental_settings', v_settings.onboarding_rental_done,
    'completed', v_settings.onboarding_completed_at IS NOT NULL,
    'percent', (
      (CASE WHEN v_settings.onboarding_business_done THEN 25 ELSE 0 END) +
      (CASE WHEN v_settings.onboarding_vehicle_done THEN 25 ELSE 0 END) +
      (CASE WHEN v_settings.onboarding_user_done THEN 25 ELSE 0 END) +
      (CASE WHEN v_settings.onboarding_rental_done THEN 25 ELSE 0 END)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_organization_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_organization_settings(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_profile(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_organization_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_organization_user(TEXT, TEXT, public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_status(UUID, public.user_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_sign_in() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_onboarding_status() TO authenticated;

-- Patched create_rental with pricing snapshots
CREATE OR REPLACE FUNCTION public.create_rental(
  p_vehicle_id UUID,
  p_customer_id UUID,
  p_start_date DATE,
  p_start_time TIME,
  p_end_date DATE,
  p_end_time TIME,
  p_daily_price NUMERIC DEFAULT NULL,
  p_discount_amount NUMERIC DEFAULT 0,
  p_extra_charge NUMERIC DEFAULT 0,
  p_deposit_amount NUMERIC DEFAULT 0,
  p_status public.rental_status DEFAULT 'RESERVED',
  p_notes TEXT DEFAULT NULL,
  p_start_km INTEGER DEFAULT NULL,
  p_fuel_start TEXT DEFAULT NULL
)
RETURNS public.rentals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID := public.get_user_organization_id();
  v_vehicle public.vehicles%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_daily NUMERIC(12, 2);
  v_days INTEGER;
  v_subtotal NUMERIC(12, 2);
  v_total NUMERIC(12, 2);
  v_rental public.rentals%ROWTYPE;
  v_period tstzrange;
  v_contract TEXT;
  v_settings public.organization_settings%ROWTYPE;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.';
  END IF;

  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  IF (p_end_date + p_end_time) < (p_start_date + p_start_time) THEN
    RAISE EXCEPTION 'Teslim tarihi başlangıç tarihinden önce olamaz.';
  END IF;

  IF COALESCE(p_discount_amount, 0) < 0 OR COALESCE(p_extra_charge, 0) < 0 THEN
    RAISE EXCEPTION 'İndirim veya ek ücret negatif olamaz.';
  END IF;

  SELECT * INTO v_vehicle
  FROM public.vehicles
  WHERE id = p_vehicle_id
    AND organization_id = v_org_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Araç bulunamadı.';
  END IF;

  IF v_vehicle.status = 'INACTIVE' THEN
    RAISE EXCEPTION 'Pasif araç kiralanamaz.';
  END IF;

  IF v_vehicle.status = 'MAINTENANCE' THEN
    RAISE EXCEPTION 'Bu araç seçilen tarihlerde müsait değil.';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id
    AND organization_id = v_org_id
    AND deleted_at IS NULL
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Müşteri bulunamadı.';
  END IF;

  v_period := tstzrange(
    ((p_start_date + p_start_time) AT TIME ZONE 'Europe/Istanbul'),
    ((p_end_date + p_end_time) AT TIME ZONE 'Europe/Istanbul'),
    '[)'
  );

  IF EXISTS (
    SELECT 1
    FROM public.rentals r
    WHERE r.vehicle_id = p_vehicle_id
      AND r.deleted_at IS NULL
      AND r.status IN ('RESERVED', 'ACTIVE', 'OVERDUE')
      AND r.rental_period && v_period
  ) THEN
    RAISE EXCEPTION 'Bu araç seçilen tarihlerde müsait değil.';
  END IF;

  v_daily := COALESCE(p_daily_price, v_vehicle.daily_price);
  IF v_daily < 0 THEN
    RAISE EXCEPTION 'Günlük fiyat negatif olamaz.';
  END IF;

  v_days := GREATEST(
    CEIL(
      EXTRACT(
        EPOCH FROM (((p_end_date + p_end_time) - (p_start_date + p_start_time)))
      ) / 86400.0
    )::INTEGER,
    1
  );

  v_subtotal := ROUND(v_days * v_daily, 2);

  IF COALESCE(p_discount_amount, 0) > v_subtotal THEN
    RAISE EXCEPTION 'İndirim tutarı toplam tutardan fazla olamaz.';
  END IF;

  v_total := ROUND(
    v_subtotal - COALESCE(p_discount_amount, 0) + COALESCE(p_extra_charge, 0),
    2
  );

  IF v_total < 0 THEN
    RAISE EXCEPTION 'Genel toplam negatif olamaz.';
  END IF;

  INSERT INTO public.organization_settings (organization_id)
  VALUES (v_org_id) ON CONFLICT (organization_id) DO NOTHING;
  SELECT * INTO v_settings FROM public.organization_settings WHERE organization_id = v_org_id;

  v_contract := public.allocate_contract_number(v_org_id);

  INSERT INTO public.rentals (
    organization_id, vehicle_id, customer_id,
    start_date, start_time, end_date, end_time, start_km,
    daily_price, total_days, subtotal, discount_amount, extra_charge,
    deposit_amount, total_amount, paid_amount, remaining_amount,
    status, fuel_start, notes, created_by,
    contract_number,
    customer_first_name, customer_last_name, customer_phone, customer_address,
    vehicle_plate, vehicle_brand, vehicle_model,
    km_limit, extra_km_price, late_return_tolerance_minutes, late_return_fee_snapshot,
    tax_rate, currency, contract_title_snapshot, contract_body_snapshot
  ) VALUES (
    v_org_id, p_vehicle_id, p_customer_id,
    p_start_date, p_start_time, p_end_date, p_end_time,
    COALESCE(p_start_km, v_vehicle.current_km),
    v_daily, v_days, v_subtotal,
    COALESCE(p_discount_amount, 0), COALESCE(p_extra_charge, 0),
    COALESCE(NULLIF(p_deposit_amount, 0), NULLIF(v_settings.default_deposit_amount, 0), v_vehicle.deposit_amount),
    v_total, 0, v_total,
    p_status, p_fuel_start, p_notes, auth.uid(),
    v_contract,
    v_customer.first_name, v_customer.last_name, v_customer.phone, v_customer.address,
    v_vehicle.plate, v_vehicle.brand, v_vehicle.model,
    CASE WHEN v_settings.default_daily_km_limit IS NULL THEN NULL
         ELSE v_settings.default_daily_km_limit * v_days END,
    COALESCE(v_settings.extra_km_price, 0),
    COALESCE(v_settings.late_return_tolerance_minutes, 60),
    COALESCE(v_settings.late_return_fee, 0),
    CASE WHEN v_settings.tax_enabled THEN COALESCE(v_settings.tax_rate, 0) ELSE 0 END,
    COALESCE(v_settings.currency, 'TRY'),
    v_settings.contract_title,
    v_settings.contract_body
  )
  RETURNING * INTO v_rental;

  IF p_status = 'ACTIVE' THEN
    UPDATE public.vehicles
    SET status = 'RENTED', updated_at = now()
    WHERE id = p_vehicle_id;
  END IF;

  PERFORM public.write_audit_log(
    v_org_id, 'CREATE_RENTAL', 'rental', v_rental.id,
    jsonb_build_object(
      'vehicle_id', p_vehicle_id,
      'customer_id', p_customer_id,
      'total_amount', v_total,
      'deposit_amount', v_rental.deposit_amount,
      'status', p_status,
      'contract_number', v_contract
    )
  );

  RETURN v_rental;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Bu araç seçilen tarihlerde müsait değil.';
END;
$$;




-- Branding storage path under documents bucket: {org}/branding/
-- (reuse documents policies — first path segment = organization_id)

CREATE OR REPLACE FUNCTION public.calculate_extra_km_charge(
  p_km_limit INTEGER,
  p_start_km INTEGER,
  p_end_km INTEGER,
  p_extra_km_price NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_km_limit IS NULL OR p_start_km IS NULL OR p_end_km IS NULL THEN 0
    WHEN p_end_km < p_start_km THEN 0
    ELSE GREATEST(0, (p_end_km - p_start_km) - p_km_limit) * COALESCE(p_extra_km_price, 0)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_extra_km_charge(INTEGER, INTEGER, INTEGER, NUMERIC) TO authenticated;

-- ---------------------------------------------------------------------------
-- Profile self-update + auth audit (no PII in metadata)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_own_profile(p_patch JSONB)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.profiles%ROWTYPE;
  v_org UUID;
BEGIN
  UPDATE public.profiles SET
    full_name = COALESCE(NULLIF(p_patch->>'full_name',''), full_name),
    phone = CASE WHEN p_patch ? 'phone' THEN NULLIF(p_patch->>'phone','') ELSE phone END,
    avatar_url = CASE WHEN p_patch ? 'avatar_url' THEN NULLIF(p_patch->>'avatar_url','') ELSE avatar_url END,
    updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil bulunamadı.';
  END IF;

  v_org := v_row.organization_id;
  PERFORM public.write_audit_log(
    v_org, 'PROFILE_UPDATED', 'profile', v_row.id,
    jsonb_build_object('fields', COALESCE(p_patch->'fields', to_jsonb(ARRAY(SELECT jsonb_object_keys(p_patch)))))
  );
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_auth_event(p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID;
  v_action TEXT := upper(trim(p_action));
BEGIN
  IF v_action NOT IN ('LOGIN', 'LOGOUT', 'PASSWORD_CHANGED') THEN
    RAISE EXCEPTION 'Geçersiz auth event.';
  END IF;
  SELECT organization_id INTO v_org FROM public.profiles WHERE id = auth.uid();
  IF v_org IS NULL THEN
    RETURN;
  END IF;
  PERFORM public.write_audit_log(v_org, v_action, 'auth', auth.uid(), '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_profile(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_auth_event(TEXT) TO authenticated;
