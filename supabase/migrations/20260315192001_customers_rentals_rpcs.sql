-- RentaFlow STEP 5: customer archive, availability check, start_rental, discount guard

-- Strengthen create_rental: discount cannot exceed subtotal
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

  INSERT INTO public.rentals (
    organization_id, vehicle_id, customer_id,
    start_date, start_time, end_date, end_time, start_km,
    daily_price, total_days, subtotal, discount_amount, extra_charge,
    deposit_amount, total_amount, paid_amount, remaining_amount,
    status, fuel_start, notes, created_by
  ) VALUES (
    v_org_id, p_vehicle_id, p_customer_id,
    p_start_date, p_start_time, p_end_date, p_end_time,
    COALESCE(p_start_km, v_vehicle.current_km),
    v_daily, v_days, v_subtotal,
    COALESCE(p_discount_amount, 0), COALESCE(p_extra_charge, 0),
    COALESCE(p_deposit_amount, v_vehicle.deposit_amount),
    v_total, 0, v_total,
    p_status, p_fuel_start, p_notes, auth.uid()
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
      'status', p_status
    )
  );

  RETURN v_rental;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Bu araç seçilen tarihlerde müsait değil.';
END;
$$;

CREATE OR REPLACE FUNCTION public.check_vehicle_availability(
  p_vehicle_id UUID,
  p_start_date DATE,
  p_start_time TIME,
  p_end_date DATE,
  p_end_time TIME,
  p_exclude_rental_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_period tstzrange;
  v_status public.vehicle_status;
BEGIN
  IF v_org IS NULL THEN
    RETURN false;
  END IF;

  IF (p_end_date + p_end_time) < (p_start_date + p_start_time) THEN
    RETURN false;
  END IF;

  SELECT status INTO v_status
  FROM public.vehicles
  WHERE id = p_vehicle_id
    AND organization_id = v_org
    AND deleted_at IS NULL;

  IF NOT FOUND OR v_status IN ('INACTIVE', 'MAINTENANCE') THEN
    RETURN false;
  END IF;

  v_period := tstzrange(
    ((p_start_date + p_start_time) AT TIME ZONE 'Europe/Istanbul'),
    ((p_end_date + p_end_time) AT TIME ZONE 'Europe/Istanbul'),
    '[)'
  );

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.rentals r
    WHERE r.vehicle_id = p_vehicle_id
      AND r.organization_id = v_org
      AND r.deleted_at IS NULL
      AND r.status IN ('RESERVED', 'ACTIVE', 'OVERDUE')
      AND (p_exclude_rental_id IS NULL OR r.id <> p_exclude_rental_id)
      AND r.rental_period && v_period
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.start_rental(p_rental_id UUID)
RETURNS public.rentals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_rental public.rentals%ROWTYPE;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  SELECT * INTO v_rental
  FROM public.rentals
  WHERE id = p_rental_id
    AND organization_id = v_org
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kiralama bulunamadı.';
  END IF;

  IF v_rental.status <> 'RESERVED' THEN
    RAISE EXCEPTION 'Yalnızca rezervasyon durumundaki kiralamalar başlatılabilir.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rentals r
    WHERE r.vehicle_id = v_rental.vehicle_id
      AND r.id <> v_rental.id
      AND r.deleted_at IS NULL
      AND r.status IN ('ACTIVE', 'OVERDUE')
  ) THEN
    RAISE EXCEPTION 'Bu araç seçilen tarihlerde müsait değil.';
  END IF;

  UPDATE public.rentals
  SET status = 'ACTIVE', updated_at = now()
  WHERE id = p_rental_id
  RETURNING * INTO v_rental;

  UPDATE public.vehicles
  SET status = 'RENTED', updated_at = now()
  WHERE id = v_rental.vehicle_id
    AND deleted_at IS NULL;

  PERFORM public.write_audit_log(
    v_org, 'START_RENTAL', 'rental', v_rental.id, '{}'::jsonb
  );

  RETURN v_rental;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_customer(p_customer_id UUID)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_customer public.customers%ROWTYPE;
  v_has_history BOOLEAN;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id
    AND organization_id = v_org
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Müşteri bulunamadı.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rentals r
    WHERE r.customer_id = p_customer_id
      AND r.deleted_at IS NULL
      AND r.status IN ('RESERVED', 'ACTIVE', 'OVERDUE')
  ) THEN
    RAISE EXCEPTION 'Bu müşterinin aktif kiralaması bulunduğu için pasife alınamaz.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.rentals r
    WHERE r.customer_id = p_customer_id AND r.deleted_at IS NULL
  ) INTO v_has_history;

  UPDATE public.customers
  SET
    is_active = false,
    deleted_at = now(),
    updated_at = now()
  WHERE id = p_customer_id
  RETURNING * INTO v_customer;

  PERFORM public.write_audit_log(
    v_org,
    'ARCHIVE_CUSTOMER',
    'customer',
    p_customer_id,
    jsonb_build_object('had_rental_history', v_has_history)
  );

  RETURN v_customer;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_stats(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'rental_count', COALESCE(s.rental_count, 0),
      'total_spend', COALESCE(s.total_spend, 0),
      'total_paid', COALESCE(s.total_paid, 0),
      'open_balance', COALESCE(s.open_balance, 0),
      'last_rental_date', s.last_rental_date
    )
    FROM public.customers c
    LEFT JOIN public.customer_rental_summary s ON s.customer_id = c.id
    WHERE c.id = p_customer_id
      AND c.organization_id = v_org
      AND c.deleted_at IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_reserved_rental(
  p_rental_id UUID,
  p_start_date DATE,
  p_start_time TIME,
  p_end_date DATE,
  p_end_time TIME,
  p_daily_price NUMERIC,
  p_discount_amount NUMERIC DEFAULT 0,
  p_extra_charge NUMERIC DEFAULT 0,
  p_deposit_amount NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.rentals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_rental public.rentals%ROWTYPE;
  v_days INTEGER;
  v_subtotal NUMERIC(12, 2);
  v_total NUMERIC(12, 2);
  v_period tstzrange;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  IF (p_end_date + p_end_time) < (p_start_date + p_start_time) THEN
    RAISE EXCEPTION 'Teslim tarihi başlangıç tarihinden önce olamaz.';
  END IF;

  SELECT * INTO v_rental
  FROM public.rentals
  WHERE id = p_rental_id
    AND organization_id = v_org
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kiralama bulunamadı.';
  END IF;

  IF v_rental.status <> 'RESERVED' THEN
    RAISE EXCEPTION 'Yalnızca rezervasyon durumundaki kiralamalar düzenlenebilir.';
  END IF;

  v_period := tstzrange(
    ((p_start_date + p_start_time) AT TIME ZONE 'Europe/Istanbul'),
    ((p_end_date + p_end_time) AT TIME ZONE 'Europe/Istanbul'),
    '[)'
  );

  IF EXISTS (
    SELECT 1
    FROM public.rentals r
    WHERE r.vehicle_id = v_rental.vehicle_id
      AND r.id <> p_rental_id
      AND r.deleted_at IS NULL
      AND r.status IN ('RESERVED', 'ACTIVE', 'OVERDUE')
      AND r.rental_period && v_period
  ) THEN
    RAISE EXCEPTION 'Bu araç seçilen tarihlerde müsait değil.';
  END IF;

  v_days := GREATEST(
    CEIL(
      EXTRACT(
        EPOCH FROM (((p_end_date + p_end_time) - (p_start_date + p_start_time)))
      ) / 86400.0
    )::INTEGER,
    1
  );
  v_subtotal := ROUND(v_days * p_daily_price, 2);

  IF COALESCE(p_discount_amount, 0) > v_subtotal THEN
    RAISE EXCEPTION 'İndirim tutarı toplam tutardan fazla olamaz.';
  END IF;

  v_total := ROUND(
    v_subtotal - COALESCE(p_discount_amount, 0) + COALESCE(p_extra_charge, 0),
    2
  );

  UPDATE public.rentals
  SET
    start_date = p_start_date,
    start_time = p_start_time,
    end_date = p_end_date,
    end_time = p_end_time,
    daily_price = p_daily_price,
    total_days = v_days,
    subtotal = v_subtotal,
    discount_amount = COALESCE(p_discount_amount, 0),
    extra_charge = COALESCE(p_extra_charge, 0),
    deposit_amount = COALESCE(p_deposit_amount, 0),
    total_amount = v_total,
    remaining_amount = GREATEST(v_total - paid_amount, 0),
    notes = p_notes,
    updated_at = now()
  WHERE id = p_rental_id
  RETURNING * INTO v_rental;

  PERFORM public.write_audit_log(
    v_org, 'UPDATE_RENTAL', 'rental', v_rental.id,
    jsonb_build_object(
      'total_amount', v_total,
      'deposit_amount', v_rental.deposit_amount,
      'total_days', v_days
    )
  );

  RETURN v_rental;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Bu araç seçilen tarihlerde müsait değil.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_vehicle_availability(UUID, DATE, TIME, DATE, TIME, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_rental(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_customer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_reserved_rental(
  UUID, DATE, TIME, DATE, TIME, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT
) TO authenticated;
