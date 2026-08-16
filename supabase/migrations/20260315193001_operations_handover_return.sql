-- RentaFlow STEP 6: payments hardening + deposit + handover + return + damage + extras
-- Reuses existing payments / rentals / rental_photos / vehicle_mileage_logs (no duplicates)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.deposit_status AS ENUM (
    'PENDING',
    'HELD',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'FORFEITED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fuel_level AS ENUM (
    'EMPTY',
    'QUARTER',
    'HALF',
    'THREE_QUARTERS',
    'FULL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.damage_severity AS ENUM (
    'MINOR',
    'MODERATE',
    'MAJOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.damage_timing AS ENUM (
    'EXISTING',
    'NEW'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.rental_photo_category AS ENUM (
    'FRONT',
    'BACK',
    'LEFT',
    'RIGHT',
    'INTERIOR',
    'ODOMETER',
    'FUEL',
    'DAMAGE',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.extra_charge_type AS ENUM (
    'FUEL_DIFF',
    'LATE_RETURN',
    'DAMAGE',
    'CLEANING',
    'EXTRA_USAGE',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Extend payments
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payments_org_idempotency_uidx
  ON public.payments (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Extend rental_photos with category + optional links
-- ---------------------------------------------------------------------------
ALTER TABLE public.rental_photos
  ADD COLUMN IF NOT EXISTS category public.rental_photo_category DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS handover_id UUID,
  ADD COLUMN IF NOT EXISTS return_id UUID;

-- ---------------------------------------------------------------------------
-- rental_deposits (1:1 with rental; deposit ≠ rental total)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rental_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  rental_id UUID NOT NULL REFERENCES public.rentals (id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  status public.deposit_status NOT NULL DEFAULT 'PENDING',
  deducted_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deducted_amount >= 0),
  refunded_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rental_deposits_rental_uidx UNIQUE (rental_id),
  CONSTRAINT rental_deposits_amounts_check CHECK (
    deducted_amount + refunded_amount <= amount + 0.001
  )
);

CREATE TRIGGER rental_deposits_set_updated_at
  BEFORE UPDATE ON public.rental_deposits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- rental_handovers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rental_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  rental_id UUID NOT NULL REFERENCES public.rentals (id),
  odometer_km INTEGER NOT NULL CHECK (odometer_km >= 0),
  fuel_level public.fuel_level NOT NULL,
  fuel_percent NUMERIC(5, 2) CHECK (fuel_percent IS NULL OR (fuel_percent >= 0 AND fuel_percent <= 100)),
  checklist_confirmed BOOLEAN NOT NULL DEFAULT false,
  customer_ack_name TEXT,
  notes TEXT,
  idempotency_key TEXT,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rental_handovers_rental_uidx UNIQUE (rental_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS rental_handovers_org_idempotency_uidx
  ON public.rental_handovers (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- rental_returns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rental_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  rental_id UUID NOT NULL REFERENCES public.rentals (id),
  odometer_km INTEGER NOT NULL CHECK (odometer_km >= 0),
  fuel_level public.fuel_level NOT NULL,
  fuel_percent NUMERIC(5, 2) CHECK (fuel_percent IS NULL OR (fuel_percent >= 0 AND fuel_percent <= 100)),
  actual_end_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  late_minutes INTEGER NOT NULL DEFAULT 0 CHECK (late_minutes >= 0),
  send_to_maintenance BOOLEAN NOT NULL DEFAULT false,
  deposit_action TEXT CHECK (
    deposit_action IS NULL OR deposit_action IN ('FULL_REFUND', 'PARTIAL_REFUND', 'FORFEIT', 'NONE')
  ),
  deposit_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deposit_deduction >= 0),
  deposit_refund NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deposit_refund >= 0),
  checklist_confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  idempotency_key TEXT,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rental_returns_rental_uidx UNIQUE (rental_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS rental_returns_org_idempotency_uidx
  ON public.rental_returns (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- rental_damages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rental_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  rental_id UUID NOT NULL REFERENCES public.rentals (id),
  handover_id UUID REFERENCES public.rental_handovers (id) ON DELETE SET NULL,
  return_id UUID REFERENCES public.rental_returns (id) ON DELETE SET NULL,
  timing public.damage_timing NOT NULL DEFAULT 'NEW',
  severity public.damage_severity NOT NULL DEFAULT 'MINOR',
  location_key TEXT NOT NULL DEFAULT 'OTHER',
  location_label TEXT,
  description TEXT,
  estimated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (estimated_amount >= 0),
  photo_storage_path TEXT,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER rental_damages_set_updated_at
  BEFORE UPDATE ON public.rental_damages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- rental_extra_charges (line items; rental.extra_charge remains aggregate)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rental_extra_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  rental_id UUID NOT NULL REFERENCES public.rentals (id),
  return_id UUID REFERENCES public.rental_returns (id) ON DELETE SET NULL,
  charge_type public.extra_charge_type NOT NULL DEFAULT 'OTHER',
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ
);

-- FK from photos after tables exist
DO $$ BEGIN
  ALTER TABLE public.rental_photos
    ADD CONSTRAINT rental_photos_handover_fk
    FOREIGN KEY (handover_id) REFERENCES public.rental_handovers (id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.rental_photos
    ADD CONSTRAINT rental_photos_return_fk
    FOREIGN KEY (return_id) REFERENCES public.rental_returns (id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS rental_deposits_org_idx ON public.rental_deposits (organization_id);
CREATE INDEX IF NOT EXISTS rental_handovers_org_idx ON public.rental_handovers (organization_id);
CREATE INDEX IF NOT EXISTS rental_returns_org_idx ON public.rental_returns (organization_id);
CREATE INDEX IF NOT EXISTS rental_damages_rental_idx ON public.rental_damages (rental_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS rental_extra_charges_rental_idx
  ON public.rental_extra_charges (rental_id) WHERE voided_at IS NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.rental_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_deposits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rental_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_handovers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rental_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_returns FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rental_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_damages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rental_extra_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_extra_charges FORCE ROW LEVEL SECURITY;

CREATE POLICY rental_deposits_select ON public.rental_deposits
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY rental_deposits_write ON public.rental_deposits
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.can_write())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_write());

CREATE POLICY rental_handovers_select ON public.rental_handovers
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY rental_handovers_write ON public.rental_handovers
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.can_write())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_write());

CREATE POLICY rental_returns_select ON public.rental_returns
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY rental_returns_write ON public.rental_returns
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.can_write())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_write());

CREATE POLICY rental_damages_select ON public.rental_damages
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY rental_damages_write ON public.rental_damages
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.can_write())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_write());

CREATE POLICY rental_extra_charges_select ON public.rental_extra_charges
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY rental_extra_charges_write ON public.rental_extra_charges
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.can_write())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_write());

GRANT SELECT, INSERT, UPDATE ON public.rental_deposits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rental_handovers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rental_returns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_damages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rental_extra_charges TO authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fuel_level_to_percent(p_level public.fuel_level)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_level
    WHEN 'EMPTY' THEN 0
    WHEN 'QUARTER' THEN 25
    WHEN 'HALF' THEN 50
    WHEN 'THREE_QUARTERS' THEN 75
    WHEN 'FULL' THEN 100
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_rental_deposit(p_rental_id UUID)
RETURNS public.rental_deposits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_rental public.rentals%ROWTYPE;
  v_dep public.rental_deposits%ROWTYPE;
BEGIN
  SELECT * INTO v_rental FROM public.rentals
  WHERE id = p_rental_id AND organization_id = v_org AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kiralama bulunamadı.';
  END IF;

  SELECT * INTO v_dep FROM public.rental_deposits WHERE rental_id = p_rental_id;
  IF FOUND THEN
    RETURN v_dep;
  END IF;

  INSERT INTO public.rental_deposits (organization_id, rental_id, amount, status)
  VALUES (v_org, p_rental_id, COALESCE(v_rental.deposit_amount, 0), 'PENDING')
  RETURNING * INTO v_dep;
  RETURN v_dep;
END;
$$;

-- ---------------------------------------------------------------------------
-- Hardened record_payment (overpay guard + reference + idempotency)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.record_payment(UUID, NUMERIC, public.payment_method, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION public.record_payment(
  p_rental_id UUID,
  p_amount NUMERIC,
  p_payment_method public.payment_method DEFAULT 'CASH',
  p_payment_date TIMESTAMPTZ DEFAULT now(),
  p_description TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID := public.get_user_organization_id();
  v_rental public.rentals%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_paid NUMERIC(12, 2);
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Ödeme tutarı sıfırdan büyük olmalıdır.';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_payment
    FROM public.payments
    WHERE organization_id = v_org_id
      AND idempotency_key = p_idempotency_key
    LIMIT 1;
    IF FOUND THEN
      RETURN v_payment;
    END IF;
  END IF;

  SELECT * INTO v_rental
  FROM public.rentals
  WHERE id = p_rental_id
    AND organization_id = v_org_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kiralama bulunamadı.';
  END IF;

  IF v_rental.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'İptal edilmiş kiralamaya ödeme eklenemez.';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.payments
  WHERE rental_id = p_rental_id AND voided_at IS NULL;

  IF v_paid + p_amount > v_rental.total_amount + 0.001 THEN
    RAISE EXCEPTION 'Ödeme tutarı kalan borçtan fazla olamaz.';
  END IF;

  INSERT INTO public.payments (
    organization_id, rental_id, customer_id, amount, payment_method,
    payment_date, description, reference_number, note, idempotency_key, created_by
  ) VALUES (
    v_org_id, p_rental_id, v_rental.customer_id, p_amount, p_payment_method,
    COALESCE(p_payment_date, now()), p_description, p_reference_number, p_note,
    p_idempotency_key, auth.uid()
  )
  RETURNING * INTO v_payment;

  PERFORM public.write_audit_log(
    v_org_id, 'PAYMENT_CREATED', 'payment', v_payment.id,
    jsonb_build_object(
      'rental_id', p_rental_id,
      'amount', p_amount,
      'payment_method', p_payment_method
    )
  );

  RETURN v_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_payment(
  p_payment_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_payment public.payments%ROWTYPE;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  SELECT * INTO v_payment FROM public.payments
  WHERE id = p_payment_id AND organization_id = v_org
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ödeme bulunamadı.';
  END IF;
  IF v_payment.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ödeme zaten iptal edilmiş.';
  END IF;

  UPDATE public.payments
  SET
    voided_at = now(),
    note = CASE
      WHEN p_reason IS NULL THEN note
      WHEN note IS NULL OR note = '' THEN p_reason
      ELSE note || E'\n' || p_reason
    END,
    updated_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  PERFORM public.write_audit_log(
    v_org, 'PAYMENT_REVERSED', 'payment', v_payment.id,
    jsonb_build_object('rental_id', v_payment.rental_id, 'amount', v_payment.amount)
  );

  RETURN v_payment;
END;
$$;

-- ---------------------------------------------------------------------------
-- complete_handover
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_handover(
  p_rental_id UUID,
  p_odometer_km INTEGER,
  p_fuel_level public.fuel_level,
  p_checklist_confirmed BOOLEAN DEFAULT false,
  p_customer_ack_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_damages JSONB DEFAULT '[]'::jsonb,
  p_photo_ids UUID[] DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS public.rental_handovers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_rental public.rentals%ROWTYPE;
  v_vehicle public.vehicles%ROWTYPE;
  v_handover public.rental_handovers%ROWTYPE;
  v_dep public.rental_deposits%ROWTYPE;
  v_dmg JSONB;
  v_fuel_pct NUMERIC(5, 2);
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_handover FROM public.rental_handovers
    WHERE organization_id = v_org AND idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_handover; END IF;
  END IF;

  IF NOT COALESCE(p_checklist_confirmed, false) THEN
    RAISE EXCEPTION 'Teslim tamamlanmadan önce kontrol onayı gereklidir.';
  END IF;

  SELECT * INTO v_rental FROM public.rentals
  WHERE id = p_rental_id AND organization_id = v_org AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kiralama bulunamadı.'; END IF;

  IF EXISTS (SELECT 1 FROM public.rental_handovers WHERE rental_id = p_rental_id) THEN
    RAISE EXCEPTION 'Bu kiralama için teslim kaydı zaten mevcut.';
  END IF;

  IF v_rental.status NOT IN ('RESERVED', 'ACTIVE') THEN
    RAISE EXCEPTION 'Bu kiralama durumunda araç teslim edilemez.';
  END IF;

  SELECT * INTO v_vehicle FROM public.vehicles
  WHERE id = v_rental.vehicle_id AND organization_id = v_org AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Araç bulunamadı.'; END IF;

  IF p_odometer_km < COALESCE(v_vehicle.current_km, 0) THEN
    RAISE EXCEPTION 'Teslim kilometresi mevcut kilometreden küçük olamaz.';
  END IF;

  v_fuel_pct := public.fuel_level_to_percent(p_fuel_level);

  INSERT INTO public.rental_handovers (
    organization_id, rental_id, odometer_km, fuel_level, fuel_percent,
    checklist_confirmed, customer_ack_name, notes, idempotency_key, created_by
  ) VALUES (
    v_org, p_rental_id, p_odometer_km, p_fuel_level, v_fuel_pct,
    true, p_customer_ack_name, p_notes, p_idempotency_key, auth.uid()
  ) RETURNING * INTO v_handover;

  UPDATE public.rentals SET
    status = 'ACTIVE',
    start_km = p_odometer_km,
    fuel_start = p_fuel_level::text,
    updated_at = now()
  WHERE id = p_rental_id;

  UPDATE public.vehicles SET
    status = 'RENTED',
    current_km = p_odometer_km,
    updated_at = now()
  WHERE id = v_vehicle.id;

  INSERT INTO public.vehicle_mileage_logs (
    organization_id, vehicle_id, rental_id, kilometers, note, created_by
  ) VALUES (
    v_org, v_vehicle.id, p_rental_id, p_odometer_km, 'Teslim kilometresi', auth.uid()
  );

  -- Deposit held
  v_dep := public.ensure_rental_deposit(p_rental_id);
  IF v_dep.amount > 0 AND v_dep.status = 'PENDING' THEN
    UPDATE public.rental_deposits SET status = 'HELD', updated_at = now()
    WHERE id = v_dep.id;
    PERFORM public.write_audit_log(
      v_org, 'DEPOSIT_HELD', 'deposit', v_dep.id,
      jsonb_build_object('rental_id', p_rental_id, 'amount', v_dep.amount)
    );
  END IF;

  -- Damages (EXISTING at handover)
  IF p_damages IS NOT NULL AND jsonb_typeof(p_damages) = 'array' THEN
    FOR v_dmg IN SELECT * FROM jsonb_array_elements(p_damages)
    LOOP
      INSERT INTO public.rental_damages (
        organization_id, rental_id, handover_id, timing, severity,
        location_key, location_label, description, estimated_amount, created_by
      ) VALUES (
        v_org, p_rental_id, v_handover.id, 'EXISTING',
        COALESCE((v_dmg->>'severity')::public.damage_severity, 'MINOR'),
        COALESCE(v_dmg->>'location_key', 'OTHER'),
        v_dmg->>'location_label',
        v_dmg->>'description',
        COALESCE((v_dmg->>'estimated_amount')::numeric, 0),
        auth.uid()
      );
      PERFORM public.write_audit_log(
        v_org, 'DAMAGE_CREATED', 'damage', NULL,
        jsonb_build_object('rental_id', p_rental_id, 'timing', 'EXISTING')
      );
    END LOOP;
  END IF;

  IF p_photo_ids IS NOT NULL THEN
    UPDATE public.rental_photos
    SET handover_id = v_handover.id, type = 'PICKUP'
    WHERE id = ANY (p_photo_ids)
      AND rental_id = p_rental_id
      AND organization_id = v_org;
  END IF;

  PERFORM public.write_audit_log(
    v_org, 'HANDOVER_CREATED', 'handover', v_handover.id,
    jsonb_build_object(
      'rental_id', p_rental_id,
      'odometer_km', p_odometer_km,
      'fuel_level', p_fuel_level
    )
  );

  RETURN v_handover;
END;
$$;

-- ---------------------------------------------------------------------------
-- complete_return
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_return(
  p_rental_id UUID,
  p_odometer_km INTEGER,
  p_fuel_level public.fuel_level,
  p_actual_end_at TIMESTAMPTZ DEFAULT now(),
  p_send_to_maintenance BOOLEAN DEFAULT false,
  p_deposit_action TEXT DEFAULT 'FULL_REFUND',
  p_deposit_deduction NUMERIC DEFAULT 0,
  p_checklist_confirmed BOOLEAN DEFAULT false,
  p_notes TEXT DEFAULT NULL,
  p_extra_charges JSONB DEFAULT '[]'::jsonb,
  p_damages JSONB DEFAULT '[]'::jsonb,
  p_photo_ids UUID[] DEFAULT NULL,
  p_payment_amount NUMERIC DEFAULT NULL,
  p_payment_method public.payment_method DEFAULT 'CASH',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS public.rental_returns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_rental public.rentals%ROWTYPE;
  v_vehicle public.vehicles%ROWTYPE;
  v_return public.rental_returns%ROWTYPE;
  v_dep public.rental_deposits%ROWTYPE;
  v_planned_end TIMESTAMPTZ;
  v_late_minutes INTEGER := 0;
  v_extra_sum NUMERIC(12, 2) := 0;
  v_item JSONB;
  v_new_extra NUMERIC(12, 2);
  v_new_total NUMERIC(12, 2);
  v_refund NUMERIC(12, 2);
  v_fuel_pct NUMERIC(5, 2);
  v_has_reserved BOOLEAN;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_return FROM public.rental_returns
    WHERE organization_id = v_org AND idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_return; END IF;
  END IF;

  IF NOT COALESCE(p_checklist_confirmed, false) THEN
    RAISE EXCEPTION 'İade tamamlanmadan önce kontrol onayı gereklidir.';
  END IF;

  SELECT * INTO v_rental FROM public.rentals
  WHERE id = p_rental_id AND organization_id = v_org AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kiralama bulunamadı.'; END IF;

  IF EXISTS (SELECT 1 FROM public.rental_returns WHERE rental_id = p_rental_id) THEN
    RAISE EXCEPTION 'Bu kiralama için iade kaydı zaten mevcut.';
  END IF;

  IF v_rental.status NOT IN ('ACTIVE', 'OVERDUE', 'RESERVED') THEN
    RAISE EXCEPTION 'Bu kiralama durumunda iade yapılamaz.';
  END IF;

  -- Prefer ACTIVE path; allow OVERDUE-like ACTIVE
  SELECT * INTO v_vehicle FROM public.vehicles
  WHERE id = v_rental.vehicle_id AND organization_id = v_org AND deleted_at IS NULL
  FOR UPDATE;

  IF p_odometer_km < COALESCE(v_rental.start_km, v_vehicle.current_km, 0) THEN
    RAISE EXCEPTION 'İade kilometresi teslim kilometresinden küçük olamaz.';
  END IF;

  v_planned_end := ((v_rental.end_date + v_rental.end_time) AT TIME ZONE 'Europe/Istanbul');
  IF COALESCE(p_actual_end_at, now()) > v_planned_end THEN
    v_late_minutes := GREATEST(
      CEIL(EXTRACT(EPOCH FROM (COALESCE(p_actual_end_at, now()) - v_planned_end)) / 60.0)::INTEGER,
      0
    );
  END IF;

  v_fuel_pct := public.fuel_level_to_percent(p_fuel_level);
  v_refund := GREATEST(
    COALESCE(v_rental.deposit_amount, 0) - COALESCE(p_deposit_deduction, 0),
    0
  );

  INSERT INTO public.rental_returns (
    organization_id, rental_id, odometer_km, fuel_level, fuel_percent,
    actual_end_at, late_minutes, send_to_maintenance,
    deposit_action, deposit_deduction, deposit_refund,
    checklist_confirmed, notes, idempotency_key, created_by
  ) VALUES (
    v_org, p_rental_id, p_odometer_km, p_fuel_level, v_fuel_pct,
    COALESCE(p_actual_end_at, now()), v_late_minutes, COALESCE(p_send_to_maintenance, false),
    COALESCE(p_deposit_action, 'FULL_REFUND'), COALESCE(p_deposit_deduction, 0), v_refund,
    true, p_notes, p_idempotency_key, auth.uid()
  ) RETURNING * INTO v_return;

  -- Extra charges line items
  IF p_extra_charges IS NOT NULL AND jsonb_typeof(p_extra_charges) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_extra_charges)
    LOOP
      INSERT INTO public.rental_extra_charges (
        organization_id, rental_id, return_id, charge_type, description, amount, created_by
      ) VALUES (
        v_org, p_rental_id, v_return.id,
        COALESCE((v_item->>'charge_type')::public.extra_charge_type, 'OTHER'),
        v_item->>'description',
        (v_item->>'amount')::numeric,
        auth.uid()
      );
      v_extra_sum := v_extra_sum + (v_item->>'amount')::numeric;
      PERFORM public.write_audit_log(
        v_org, 'EXTRA_CHARGE_CREATED', 'extra_charge', NULL,
        jsonb_build_object('rental_id', p_rental_id, 'amount', (v_item->>'amount')::numeric)
      );
    END LOOP;
  END IF;

  -- NEW damages
  IF p_damages IS NOT NULL AND jsonb_typeof(p_damages) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_damages)
    LOOP
      INSERT INTO public.rental_damages (
        organization_id, rental_id, return_id, timing, severity,
        location_key, location_label, description, estimated_amount, created_by
      ) VALUES (
        v_org, p_rental_id, v_return.id, 'NEW',
        COALESCE((v_item->>'severity')::public.damage_severity, 'MINOR'),
        COALESCE(v_item->>'location_key', 'OTHER'),
        v_item->>'location_label',
        v_item->>'description',
        COALESCE((v_item->>'estimated_amount')::numeric, 0),
        auth.uid()
      );
      PERFORM public.write_audit_log(
        v_org, 'DAMAGE_CREATED', 'damage', NULL,
        jsonb_build_object('rental_id', p_rental_id, 'timing', 'NEW')
      );
    END LOOP;
  END IF;

  v_new_extra := COALESCE(v_rental.extra_charge, 0) + v_extra_sum;
  v_new_total := ROUND(v_rental.subtotal - v_rental.discount_amount + v_new_extra, 2);

  UPDATE public.rentals SET
    end_km = p_odometer_km,
    fuel_end = p_fuel_level::text,
    end_date = (COALESCE(p_actual_end_at, now()) AT TIME ZONE 'Europe/Istanbul')::date,
    end_time = (COALESCE(p_actual_end_at, now()) AT TIME ZONE 'Europe/Istanbul')::time,
    extra_charge = v_new_extra,
    late_fee = COALESCE(v_rental.late_fee, 0),
    total_amount = v_new_total,
    remaining_amount = GREATEST(v_new_total - paid_amount, 0),
    return_notes = p_notes,
    status = 'COMPLETED',
    updated_at = now()
  WHERE id = p_rental_id
  RETURNING * INTO v_rental;

  -- Optional payment during return
  IF p_payment_amount IS NOT NULL AND p_payment_amount > 0 THEN
    PERFORM public.record_payment(
      p_rental_id, p_payment_amount, p_payment_method, now(),
      'İade sırasında ödeme', NULL, NULL, NULL
    );
  END IF;

  -- Deposit settlement
  v_dep := public.ensure_rental_deposit(p_rental_id);
  IF COALESCE(p_deposit_action, 'FULL_REFUND') = 'FULL_REFUND' THEN
    UPDATE public.rental_deposits SET
      status = CASE WHEN amount > 0 THEN 'REFUNDED' ELSE status END,
      deducted_amount = 0,
      refunded_amount = amount,
      updated_at = now()
    WHERE id = v_dep.id;
    PERFORM public.write_audit_log(v_org, 'DEPOSIT_REFUNDED', 'deposit', v_dep.id,
      jsonb_build_object('rental_id', p_rental_id, 'refund', v_dep.amount));
  ELSIF p_deposit_action = 'PARTIAL_REFUND' THEN
    UPDATE public.rental_deposits SET
      status = 'PARTIALLY_REFUNDED',
      deducted_amount = COALESCE(p_deposit_deduction, 0),
      refunded_amount = GREATEST(amount - COALESCE(p_deposit_deduction, 0), 0),
      updated_at = now()
    WHERE id = v_dep.id;
    PERFORM public.write_audit_log(v_org, 'DEPOSIT_REFUNDED', 'deposit', v_dep.id,
      jsonb_build_object('rental_id', p_rental_id, 'deduction', p_deposit_deduction));
  ELSIF p_deposit_action = 'FORFEIT' THEN
    UPDATE public.rental_deposits SET
      status = 'FORFEITED',
      deducted_amount = amount,
      refunded_amount = 0,
      updated_at = now()
    WHERE id = v_dep.id;
    PERFORM public.write_audit_log(v_org, 'DEPOSIT_FORFEITED', 'deposit', v_dep.id,
      jsonb_build_object('rental_id', p_rental_id));
  END IF;

  INSERT INTO public.vehicle_mileage_logs (
    organization_id, vehicle_id, rental_id, kilometers, note, created_by
  ) VALUES (
    v_org, v_vehicle.id, p_rental_id, p_odometer_km, 'İade kilometresi', auth.uid()
  );

  SELECT EXISTS (
    SELECT 1 FROM public.rentals r
    WHERE r.vehicle_id = v_vehicle.id
      AND r.id <> p_rental_id
      AND r.deleted_at IS NULL
      AND r.status IN ('RESERVED', 'ACTIVE', 'OVERDUE')
  ) INTO v_has_reserved;

  UPDATE public.vehicles SET
    current_km = p_odometer_km,
    status = CASE
      WHEN COALESCE(p_send_to_maintenance, false) THEN 'MAINTENANCE'::public.vehicle_status
      WHEN v_has_reserved THEN status
      ELSE 'AVAILABLE'::public.vehicle_status
    END,
    updated_at = now()
  WHERE id = v_vehicle.id;

  IF p_photo_ids IS NOT NULL THEN
    UPDATE public.rental_photos
    SET return_id = v_return.id, type = 'RETURN'
    WHERE id = ANY (p_photo_ids)
      AND rental_id = p_rental_id
      AND organization_id = v_org;
  END IF;

  PERFORM public.write_audit_log(
    v_org, 'RETURN_CREATED', 'return', v_return.id,
    jsonb_build_object(
      'rental_id', p_rental_id,
      'odometer_km', p_odometer_km,
      'late_minutes', v_late_minutes,
      'extra_charges', v_extra_sum
    )
  );
  PERFORM public.write_audit_log(
    v_org, 'RENTAL_COMPLETED', 'rental', p_rental_id,
    jsonb_build_object('remaining_amount', v_rental.remaining_amount)
  );
  PERFORM public.write_audit_log(
    v_org, 'VEHICLE_RETURNED', 'vehicle', v_vehicle.id,
    jsonb_build_object('rental_id', p_rental_id, 'maintenance', p_send_to_maintenance)
  );

  RETURN v_return;
END;
$$;

-- Sync deposit row when rental created (via trigger on rentals insert)
CREATE OR REPLACE FUNCTION public.rentals_ensure_deposit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rental_deposits (organization_id, rental_id, amount, status)
  VALUES (NEW.organization_id, NEW.id, COALESCE(NEW.deposit_amount, 0), 'PENDING')
  ON CONFLICT (rental_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rentals_ensure_deposit_trg ON public.rentals;
CREATE TRIGGER rentals_ensure_deposit_trg
  AFTER INSERT ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.rentals_ensure_deposit();

-- Backfill deposits for existing rentals
INSERT INTO public.rental_deposits (organization_id, rental_id, amount, status)
SELECT r.organization_id, r.id, COALESCE(r.deposit_amount, 0), 'PENDING'
FROM public.rentals r
WHERE r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.rental_deposits d WHERE d.rental_id = r.id);

-- ---------------------------------------------------------------------------
-- Dashboard helpers for STEP 6
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_today_handovers()
RETURNS TABLE (
  rental_id UUID,
  vehicle_id UUID,
  plate TEXT,
  brand TEXT,
  model TEXT,
  customer_name TEXT,
  start_date DATE,
  start_time TIME,
  status public.rental_status
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    r.id,
    v.id,
    v.plate,
    v.brand,
    v.model,
    (c.first_name || ' ' || c.last_name),
    r.start_date,
    r.start_time,
    r.status
  FROM public.rentals r
  JOIN public.vehicles v ON v.id = r.vehicle_id
  JOIN public.customers c ON c.id = r.customer_id
  WHERE r.organization_id = public.get_user_organization_id()
    AND r.deleted_at IS NULL
    AND r.status = 'RESERVED'
    AND r.start_date = (now() AT TIME ZONE 'Europe/Istanbul')::date
  ORDER BY r.start_time;
$$;

CREATE OR REPLACE FUNCTION public.get_outstanding_payments()
RETURNS TABLE (
  rental_id UUID,
  plate TEXT,
  customer_name TEXT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  status public.rental_status
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    r.id,
    v.plate,
    (c.first_name || ' ' || c.last_name),
    r.total_amount,
    r.paid_amount,
    r.remaining_amount,
    r.status
  FROM public.rentals r
  JOIN public.vehicles v ON v.id = r.vehicle_id
  JOIN public.customers c ON c.id = r.customer_id
  WHERE r.organization_id = public.get_user_organization_id()
    AND r.deleted_at IS NULL
    AND r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'RESERVED')
    AND r.remaining_amount > 0
  ORDER BY r.remaining_amount DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_overdue_rentals()
RETURNS TABLE (
  rental_id UUID,
  plate TEXT,
  customer_name TEXT,
  end_date DATE,
  end_time TIME,
  remaining_amount NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    r.id,
    v.plate,
    (c.first_name || ' ' || c.last_name),
    r.end_date,
    r.end_time,
    r.remaining_amount
  FROM public.rentals r
  JOIN public.vehicles v ON v.id = r.vehicle_id
  JOIN public.customers c ON c.id = r.customer_id
  WHERE r.organization_id = public.get_user_organization_id()
    AND r.deleted_at IS NULL
    AND r.status = 'ACTIVE'
    AND (r.end_date + r.end_time) < (now() AT TIME ZONE 'Europe/Istanbul')
  ORDER BY r.end_date, r.end_time;
$$;

GRANT EXECUTE ON FUNCTION public.fuel_level_to_percent(public.fuel_level) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_rental_deposit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, public.payment_method, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_payment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_handover(UUID, INTEGER, public.fuel_level, BOOLEAN, TEXT, TEXT, JSONB, UUID[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_return(UUID, INTEGER, public.fuel_level, TIMESTAMPTZ, BOOLEAN, TEXT, NUMERIC, BOOLEAN, TEXT, JSONB, JSONB, UUID[], NUMERIC, public.payment_method, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_handovers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_outstanding_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_overdue_rentals() TO authenticated;
