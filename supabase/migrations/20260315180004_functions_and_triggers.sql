-- RentaFlow STEP 2: helpers, payment sync, rental RPCs, audit helpers

-- ---------------------------------------------------------------------------
-- Auth context helpers (SECURITY DEFINER, locked search_path)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND organization_id = p_organization_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Payment status helper (computed — not stored as enum column)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_payment_status(
  p_total NUMERIC,
  p_paid NUMERIC
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_paid, 0) <= 0 THEN 'UNPAID'
    WHEN COALESCE(p_paid, 0) >= COALESCE(p_total, 0) THEN 'PAID'
    ELSE 'PARTIALLY_PAID'
  END;
$$;

-- ---------------------------------------------------------------------------
-- Recalculate rental paid/remaining from non-voided payments
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_rental_payment_totals(p_rental_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC(12, 2);
  v_paid NUMERIC(12, 2);
BEGIN
  SELECT total_amount INTO v_total
  FROM public.rentals
  WHERE id = p_rental_id;

  IF v_total IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM public.payments
  WHERE rental_id = p_rental_id
    AND voided_at IS NULL;

  UPDATE public.rentals
  SET
    paid_amount = v_paid,
    remaining_amount = GREATEST(v_total - v_paid, 0),
    updated_at = now()
  WHERE id = p_rental_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_payments_refresh_rental_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rental_id UUID;
BEGIN
  v_rental_id := COALESCE(NEW.rental_id, OLD.rental_id);
  PERFORM public.refresh_rental_payment_totals(v_rental_id);

  IF TG_OP = 'UPDATE'
     AND NEW.rental_id IS DISTINCT FROM OLD.rental_id THEN
    PERFORM public.refresh_rental_payment_totals(OLD.rental_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER payments_refresh_rental_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_payments_refresh_rental_totals();

-- Keep remaining in sync when total_amount changes on rental
CREATE OR REPLACE FUNCTION public.trg_rentals_sync_remaining()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    NEW.remaining_amount := GREATEST(NEW.total_amount - NEW.paid_amount, 0);
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.remaining_amount := GREATEST(NEW.total_amount - COALESCE(NEW.paid_amount, 0), 0);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER rentals_sync_remaining
  BEFORE INSERT OR UPDATE OF total_amount, paid_amount ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.trg_rentals_sync_remaining();

-- ---------------------------------------------------------------------------
-- Audit helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_organization_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    p_organization_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- create_rental: race-safe booking with vehicle lock + amount calc
-- Deposit is NOT included in total_amount.
-- ---------------------------------------------------------------------------
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

  -- Lock vehicle row to serialize concurrent bookings
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

  IF v_vehicle.status = 'MAINTENANCE' AND p_status IN ('ACTIVE', 'RESERVED') THEN
    RAISE EXCEPTION 'Bakımdaki araç seçilen tarihlerde müsait değil.';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id
    AND organization_id = v_org_id
    AND deleted_at IS NULL;

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
    RAISE EXCEPTION 'Kullanmak istediğiniz araç seçilen tarihlerde müsait değil.';
  END IF;

  v_daily := COALESCE(p_daily_price, v_vehicle.daily_price);
  IF v_daily < 0 THEN
    RAISE EXCEPTION 'Günlük fiyat negatif olamaz.';
  END IF;

  -- Day count: ceil of duration in 24h blocks, minimum 1
  v_days := GREATEST(
    CEIL(
      EXTRACT(
        EPOCH FROM (
          ((p_end_date + p_end_time) - (p_start_date + p_start_time))
        )
      ) / 86400.0
    )::INTEGER,
    1
  );

  v_subtotal := ROUND(v_days * v_daily, 2);
  v_total := ROUND(
    v_subtotal - COALESCE(p_discount_amount, 0) + COALESCE(p_extra_charge, 0),
    2
  );

  IF v_total < 0 THEN
    RAISE EXCEPTION 'Genel toplam negatif olamaz.';
  END IF;

  INSERT INTO public.rentals (
    organization_id,
    vehicle_id,
    customer_id,
    start_date,
    start_time,
    end_date,
    end_time,
    start_km,
    daily_price,
    total_days,
    subtotal,
    discount_amount,
    extra_charge,
    deposit_amount,
    total_amount,
    paid_amount,
    remaining_amount,
    status,
    fuel_start,
    notes,
    created_by
  )
  VALUES (
    v_org_id,
    p_vehicle_id,
    p_customer_id,
    p_start_date,
    p_start_time,
    p_end_date,
    p_end_time,
    COALESCE(p_start_km, v_vehicle.current_km),
    v_daily,
    v_days,
    v_subtotal,
    COALESCE(p_discount_amount, 0),
    COALESCE(p_extra_charge, 0),
    COALESCE(p_deposit_amount, v_vehicle.deposit_amount),
    v_total,
    0,
    v_total,
    p_status,
    p_fuel_start,
    p_notes,
    auth.uid()
  )
  RETURNING * INTO v_rental;

  IF p_status = 'ACTIVE' THEN
    UPDATE public.vehicles
    SET status = 'RENTED', updated_at = now()
    WHERE id = p_vehicle_id;
  END IF;

  PERFORM public.write_audit_log(
    v_org_id,
    'CREATE_RENTAL',
    'rental',
    v_rental.id,
    jsonb_build_object(
      'vehicle_id', p_vehicle_id,
      'customer_id', p_customer_id,
      'total_amount', v_total,
      'status', p_status
    )
  );

  RETURN v_rental;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Kullanmak istediğiniz araç seçilen tarihlerde müsait değil.';
END;
$$;

-- ---------------------------------------------------------------------------
-- complete_rental: handover + vehicle AVAILABLE (open balance allowed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_rental(
  p_rental_id UUID,
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_end_time TIME DEFAULT (CURRENT_TIME::TIME),
  p_end_km INTEGER DEFAULT NULL,
  p_fuel_end TEXT DEFAULT NULL,
  p_extra_charge NUMERIC DEFAULT 0,
  p_late_fee NUMERIC DEFAULT 0,
  p_return_notes TEXT DEFAULT NULL
)
RETURNS public.rentals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID := public.get_user_organization_id();
  v_rental public.rentals%ROWTYPE;
  v_new_extra NUMERIC(12, 2);
  v_new_total NUMERIC(12, 2);
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
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

  IF v_rental.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Kiralama zaten tamamlanmış.';
  END IF;

  IF v_rental.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'İptal edilmiş kiralama teslim alınamaz.';
  END IF;

  v_new_extra := COALESCE(v_rental.extra_charge, 0)
    + COALESCE(p_extra_charge, 0)
    + COALESCE(p_late_fee, 0);
  v_new_total := ROUND(
    v_rental.subtotal - v_rental.discount_amount + v_new_extra,
    2
  );

  UPDATE public.rentals
  SET
    end_date = p_end_date,
    end_time = p_end_time,
    end_km = p_end_km,
    fuel_end = p_fuel_end,
    extra_charge = v_new_extra,
    late_fee = COALESCE(v_rental.late_fee, 0) + COALESCE(p_late_fee, 0),
    total_amount = v_new_total,
    remaining_amount = GREATEST(v_new_total - paid_amount, 0),
    return_notes = p_return_notes,
    status = 'COMPLETED',
    updated_at = now()
  WHERE id = p_rental_id
  RETURNING * INTO v_rental;

  UPDATE public.vehicles
  SET
    status = 'AVAILABLE',
    current_km = COALESCE(p_end_km, current_km),
    updated_at = now()
  WHERE id = v_rental.vehicle_id
    AND organization_id = v_org_id
    AND deleted_at IS NULL;

  PERFORM public.write_audit_log(
    v_org_id,
    'COMPLETE_RENTAL',
    'rental',
    v_rental.id,
    jsonb_build_object(
      'remaining_amount', v_rental.remaining_amount,
      'end_km', p_end_km
    )
  );

  RETURN v_rental;
END;
$$;

-- ---------------------------------------------------------------------------
-- record_payment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_payment(
  p_rental_id UUID,
  p_amount NUMERIC,
  p_payment_method public.payment_method DEFAULT 'CASH',
  p_payment_date TIMESTAMPTZ DEFAULT now(),
  p_description TEXT DEFAULT NULL
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
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Ödeme tutarı sıfırdan büyük olmalıdır.';
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

  INSERT INTO public.payments (
    organization_id,
    rental_id,
    customer_id,
    amount,
    payment_method,
    payment_date,
    description,
    created_by
  )
  VALUES (
    v_org_id,
    p_rental_id,
    v_rental.customer_id,
    p_amount,
    p_payment_method,
    COALESCE(p_payment_date, now()),
    p_description,
    auth.uid()
  )
  RETURNING * INTO v_payment;

  PERFORM public.write_audit_log(
    v_org_id,
    'CREATE_PAYMENT',
    'payment',
    v_payment.id,
    jsonb_build_object(
      'rental_id', p_rental_id,
      'amount', p_amount,
      'payment_method', p_payment_method
      -- Do not log sensitive customer PII
    )
  );

  RETURN v_payment;
END;
$$;

-- ---------------------------------------------------------------------------
-- cancel_rental
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_rental(
  p_rental_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.rentals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID := public.get_user_organization_id();
  v_rental public.rentals%ROWTYPE;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
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

  IF v_rental.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Tamamlanmış kiralama iptal edilemez.';
  END IF;

  UPDATE public.rentals
  SET
    status = 'CANCELLED',
    notes = CASE
      WHEN p_reason IS NULL THEN notes
      WHEN notes IS NULL OR notes = '' THEN p_reason
      ELSE notes || E'\n' || p_reason
    END,
    updated_at = now()
  WHERE id = p_rental_id
  RETURNING * INTO v_rental;

  -- Free vehicle if no other active/reserved/overdue rental remains
  IF NOT EXISTS (
    SELECT 1
    FROM public.rentals r
    WHERE r.vehicle_id = v_rental.vehicle_id
      AND r.id <> v_rental.id
      AND r.deleted_at IS NULL
      AND r.status IN ('RESERVED', 'ACTIVE', 'OVERDUE')
  ) THEN
    UPDATE public.vehicles
    SET status = 'AVAILABLE', updated_at = now()
    WHERE id = v_rental.vehicle_id
      AND status = 'RENTED';
  END IF;

  PERFORM public.write_audit_log(
    v_org_id,
    'CANCEL_RENTAL',
    'rental',
    v_rental.id,
    jsonb_build_object('reason', p_reason)
  );

  RETURN v_rental;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_payment_status(NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_rental(
  UUID, UUID, DATE, TIME, DATE, TIME, NUMERIC, NUMERIC, NUMERIC, NUMERIC,
  public.rental_status, TEXT, INTEGER, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_rental(
  UUID, DATE, TIME, INTEGER, TEXT, NUMERIC, NUMERIC, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(
  UUID, NUMERIC, public.payment_method, TIMESTAMPTZ, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_rental(UUID, TEXT) TO authenticated;
