-- RentaFlow STEP 8: reporting RPCs, rental snapshots, contract numbers

ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS customer_first_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_last_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_brand TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS rentals_org_contract_number_uidx
  ON public.rentals (organization_id, contract_number)
  WHERE contract_number IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.organization_contract_sequences (
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  year INTEGER NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, year)
);

ALTER TABLE public.organization_contract_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_contract_sequences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_contract_seq_select ON public.organization_contract_sequences;
CREATE POLICY org_contract_seq_select ON public.organization_contract_sequences
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

GRANT SELECT ON public.organization_contract_sequences TO authenticated;

UPDATE public.rentals r
SET
  customer_first_name = COALESCE(r.customer_first_name, c.first_name),
  customer_last_name = COALESCE(r.customer_last_name, c.last_name),
  customer_phone = COALESCE(r.customer_phone, c.phone),
  customer_address = COALESCE(r.customer_address, c.address),
  vehicle_plate = COALESCE(r.vehicle_plate, v.plate),
  vehicle_brand = COALESCE(r.vehicle_brand, v.brand),
  vehicle_model = COALESCE(r.vehicle_model, v.model)
FROM public.customers c, public.vehicles v
WHERE r.customer_id = c.id
  AND r.vehicle_id = v.id
  AND (r.customer_first_name IS NULL OR r.vehicle_plate IS NULL);

CREATE OR REPLACE FUNCTION public.allocate_contract_number(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Europe/Istanbul'))::INTEGER;
  v_next INTEGER;
BEGIN
  INSERT INTO public.organization_contract_sequences (organization_id, year, last_value)
  VALUES (p_org_id, v_year, 1)
  ON CONFLICT (organization_id, year)
  DO UPDATE SET last_value = public.organization_contract_sequences.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN 'RF-' || v_year::TEXT || '-' || LPAD(v_next::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_rental_contract_number(p_rental_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.rentals%ROWTYPE;
  v_number TEXT;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.';
  END IF;

  SELECT * INTO v_row
  FROM public.rentals
  WHERE id = p_rental_id
    AND organization_id = v_org
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kiralama bulunamadı.';
  END IF;

  IF v_row.contract_number IS NOT NULL THEN
    RETURN v_row.contract_number;
  END IF;

  v_number := public.allocate_contract_number(v_org);
  UPDATE public.rentals
  SET contract_number = v_number, updated_at = now()
  WHERE id = p_rental_id;

  RETURN v_number;
END;
$$;

-- Patched create_rental with snapshots + contract
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

  v_contract := public.allocate_contract_number(v_org_id);

  INSERT INTO public.rentals (
    organization_id, vehicle_id, customer_id,
    start_date, start_time, end_date, end_time, start_km,
    daily_price, total_days, subtotal, discount_amount, extra_charge,
    deposit_amount, total_amount, paid_amount, remaining_amount,
    status, fuel_start, notes, created_by,
    contract_number,
    customer_first_name, customer_last_name, customer_phone, customer_address,
    vehicle_plate, vehicle_brand, vehicle_model
  ) VALUES (
    v_org_id, p_vehicle_id, p_customer_id,
    p_start_date, p_start_time, p_end_date, p_end_time,
    COALESCE(p_start_km, v_vehicle.current_km),
    v_daily, v_days, v_subtotal,
    COALESCE(p_discount_amount, 0), COALESCE(p_extra_charge, 0),
    COALESCE(p_deposit_amount, v_vehicle.deposit_amount),
    v_total, 0, v_total,
    p_status, p_fuel_start, p_notes, auth.uid(),
    v_contract,
    v_customer.first_name, v_customer.last_name, v_customer.phone, v_customer.address,
    v_vehicle.plate, v_vehicle.brand, v_vehicle.model
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



-- Expense summary: soft-delete aware (maintenance costs already in expenses)
CREATE OR REPLACE VIEW public.vehicle_expense_summary
WITH (security_invoker = true)
AS
SELECT
  v.organization_id,
  v.id AS vehicle_id,
  v.plate,
  COALESCE(SUM(e.amount) FILTER (WHERE e.deleted_at IS NULL), 0) AS total_expense_amount,
  COUNT(e.id) FILTER (WHERE e.deleted_at IS NULL) AS expense_count
FROM public.vehicles v
LEFT JOIN public.expenses e ON e.vehicle_id = v.id
WHERE v.deleted_at IS NULL
GROUP BY v.organization_id, v.id, v.plate;

CREATE OR REPLACE FUNCTION public.get_financial_summary(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_revenue NUMERIC := 0;
  v_collected NUMERIC := 0;
  v_outstanding NUMERIC := 0;
  v_expenses NUMERIC := 0;
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.'; END IF;
  IF p_to < p_from THEN RAISE EXCEPTION 'Bitiş tarihi başlangıçtan önce olamaz.'; END IF;

  SELECT COALESCE(SUM(r.total_amount), 0) INTO v_revenue
  FROM public.rentals r
  WHERE r.organization_id = v_org AND r.deleted_at IS NULL AND r.status <> 'CANCELLED'
    AND r.start_date BETWEEN p_from AND p_to;

  SELECT COALESCE(SUM(p.amount), 0) INTO v_collected
  FROM public.payments p
  WHERE p.organization_id = v_org AND p.voided_at IS NULL
    AND p.payment_date::date BETWEEN p_from AND p_to;

  SELECT COALESCE(SUM(r.remaining_amount), 0) INTO v_outstanding
  FROM public.rentals r
  WHERE r.organization_id = v_org AND r.deleted_at IS NULL
    AND r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'RESERVED')
    AND r.remaining_amount > 0;

  SELECT COALESCE(SUM(e.amount), 0) INTO v_expenses
  FROM public.expenses e
  WHERE e.organization_id = v_org AND e.deleted_at IS NULL
    AND e.expense_date BETWEEN p_from AND p_to;

  RETURN jsonb_build_object(
    'from', p_from, 'to', p_to,
    'revenue', v_revenue, 'collected', v_collected,
    'outstanding', v_outstanding, 'expenses', v_expenses,
    'net_income', v_revenue - v_expenses
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_financial_report(p_months INTEGER DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_start DATE;
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.'; END IF;
  v_start := date_trunc(
    'month',
    ((now() AT TIME ZONE 'Europe/Istanbul')::date - make_interval(months => GREATEST(p_months, 1) - 1))
  )::date;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.month_start)
    FROM (
      SELECT gs.month_start,
             COALESCE(rev.revenue, 0) AS revenue,
             COALESCE(col.collected, 0) AS collected,
             COALESCE(exp.expenses, 0) AS expenses,
             COALESCE(rev.revenue, 0) - COALESCE(exp.expenses, 0) AS net_income
      FROM (
        SELECT generate_series(
          v_start,
          date_trunc('month', (now() AT TIME ZONE 'Europe/Istanbul')::date)::date,
          '1 month'::interval
        )::date AS month_start
      ) gs
      LEFT JOIN (
        SELECT date_trunc('month', r.start_date)::date AS month_start, SUM(r.total_amount) AS revenue
        FROM public.rentals r
        WHERE r.organization_id = v_org AND r.deleted_at IS NULL AND r.status <> 'CANCELLED'
          AND r.start_date >= v_start
        GROUP BY 1
      ) rev ON rev.month_start = gs.month_start
      LEFT JOIN (
        SELECT date_trunc('month', p.payment_date::date)::date AS month_start, SUM(p.amount) AS collected
        FROM public.payments p
        WHERE p.organization_id = v_org AND p.voided_at IS NULL AND p.payment_date::date >= v_start
        GROUP BY 1
      ) col ON col.month_start = gs.month_start
      LEFT JOIN (
        SELECT date_trunc('month', e.expense_date)::date AS month_start, SUM(e.amount) AS expenses
        FROM public.expenses e
        WHERE e.organization_id = v_org AND e.deleted_at IS NULL AND e.expense_date >= v_start
        GROUP BY 1
      ) exp ON exp.month_start = gs.month_start
    ) t
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_vehicle_performance(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_period INTEGER;
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.'; END IF;
  IF p_to < p_from THEN RAISE EXCEPTION 'Bitiş tarihi başlangıçtan önce olamaz.'; END IF;
  v_period := (p_to - p_from) + 1;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.net_income DESC)
    FROM (
      SELECT
        v.id AS vehicle_id,
        v.plate, v.brand, v.model,
        COALESCE((
          SELECT COUNT(*)::INTEGER FROM public.rentals r
          WHERE r.vehicle_id = v.id AND r.organization_id = v_org AND r.deleted_at IS NULL
            AND r.status <> 'CANCELLED' AND r.start_date BETWEEN p_from AND p_to
        ), 0) AS rental_count,
        COALESCE((
          SELECT SUM(GREATEST(0, (LEAST(r.end_date, p_to) - GREATEST(r.start_date, p_from) + 1)))
          FROM public.rentals r
          WHERE r.vehicle_id = v.id AND r.organization_id = v_org AND r.deleted_at IS NULL
            AND r.status <> 'CANCELLED' AND r.start_date <= p_to AND r.end_date >= p_from
        ), 0)::NUMERIC AS rental_days,
        COALESCE((
          SELECT SUM(r.total_amount) FROM public.rentals r
          WHERE r.vehicle_id = v.id AND r.organization_id = v_org AND r.deleted_at IS NULL
            AND r.status <> 'CANCELLED' AND r.start_date BETWEEN p_from AND p_to
        ), 0) AS revenue,
        COALESCE((
          SELECT SUM(e.amount) FROM public.expenses e
          WHERE e.vehicle_id = v.id AND e.organization_id = v_org AND e.deleted_at IS NULL
            AND e.expense_date BETWEEN p_from AND p_to
        ), 0) AS expenses,
        COALESCE((
          SELECT SUM(r.total_amount) FROM public.rentals r
          WHERE r.vehicle_id = v.id AND r.organization_id = v_org AND r.deleted_at IS NULL
            AND r.status <> 'CANCELLED' AND r.start_date BETWEEN p_from AND p_to
        ), 0) - COALESCE((
          SELECT SUM(e.amount) FROM public.expenses e
          WHERE e.vehicle_id = v.id AND e.organization_id = v_org AND e.deleted_at IS NULL
            AND e.expense_date BETWEEN p_from AND p_to
        ), 0) AS net_income,
        ROUND((
          COALESCE((
            SELECT SUM(GREATEST(0, (LEAST(r.end_date, p_to) - GREATEST(r.start_date, p_from) + 1)))
            FROM public.rentals r
            WHERE r.vehicle_id = v.id AND r.organization_id = v_org AND r.deleted_at IS NULL
              AND r.status <> 'CANCELLED' AND r.start_date <= p_to AND r.end_date >= p_from
          ), 0)::NUMERIC
          / NULLIF(GREATEST(1, v_period - COALESCE((
              SELECT SUM(GREATEST(0,
                (LEAST(COALESCE(m.completed_date, LEAST(COALESCE(m.scheduled_date, p_to), p_to)), p_to)
                 - GREATEST(COALESCE(m.scheduled_date, p_from), p_from) + 1)))
              FROM public.maintenance_records m
              WHERE m.vehicle_id = v.id AND m.organization_id = v_org AND m.deleted_at IS NULL
                AND m.status IN ('IN_PROGRESS', 'COMPLETED', 'SCHEDULED')
                AND COALESCE(m.scheduled_date, m.maintenance_date) <= p_to
                AND COALESCE(m.completed_date, m.scheduled_date, m.maintenance_date) >= p_from
            ), 0)), 0)
        ) * 100, 1) AS occupancy_rate,
        v_period AS period_days
      FROM public.vehicles v
      WHERE v.organization_id = v_org AND v.deleted_at IS NULL
    ) t
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_performance(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_org UUID := public.get_user_organization_id();
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.total_spend DESC)
    FROM (
      SELECT c.id AS customer_id, c.first_name, c.last_name, c.phone,
        COUNT(r.id) FILTER (WHERE r.status <> 'CANCELLED' AND r.start_date BETWEEN p_from AND p_to)::INTEGER AS rental_count,
        COALESCE(SUM(r.total_amount) FILTER (WHERE r.status <> 'CANCELLED' AND r.start_date BETWEEN p_from AND p_to), 0) AS total_spend,
        COALESCE(SUM(r.paid_amount) FILTER (WHERE r.status <> 'CANCELLED' AND r.start_date BETWEEN p_from AND p_to), 0) AS total_paid,
        COALESCE(SUM(r.remaining_amount) FILTER (WHERE r.status IN ('ACTIVE','COMPLETED','OVERDUE','RESERVED')), 0) AS open_balance,
        MAX(r.start_date) FILTER (WHERE r.status <> 'CANCELLED') AS last_rental_date
      FROM public.customers c
      LEFT JOIN public.rentals r ON r.customer_id = c.id AND r.organization_id = v_org AND r.deleted_at IS NULL
      WHERE c.organization_id = v_org AND c.deleted_at IS NULL
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(r.id) FILTER (WHERE r.status <> 'CANCELLED' AND r.start_date BETWEEN p_from AND p_to) > 0
         OR COALESCE(SUM(r.remaining_amount) FILTER (WHERE r.status IN ('ACTIVE','COMPLETED','OVERDUE','RESERVED')), 0) > 0
    ) t
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_rental_statistics(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_org UUID := public.get_user_organization_id();
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.'; END IF;
  RETURN (
    SELECT jsonb_build_object(
      'total', COUNT(*) FILTER (WHERE r.start_date BETWEEN p_from AND p_to),
      'active', COUNT(*) FILTER (WHERE r.status = 'ACTIVE' AND r.start_date BETWEEN p_from AND p_to),
      'completed', COUNT(*) FILTER (WHERE r.status = 'COMPLETED' AND r.start_date BETWEEN p_from AND p_to),
      'cancelled', COUNT(*) FILTER (WHERE r.status = 'CANCELLED' AND r.start_date BETWEEN p_from AND p_to),
      'overdue', COUNT(*) FILTER (
        WHERE r.status = 'ACTIVE'
          AND (r.end_date + r.end_time) < (now() AT TIME ZONE 'Europe/Istanbul')
          AND r.start_date BETWEEN p_from AND p_to
      ),
      'reserved', COUNT(*) FILTER (WHERE r.status = 'RESERVED' AND r.start_date BETWEEN p_from AND p_to),
      'avg_duration_days', ROUND(COALESCE(AVG(r.total_days) FILTER (
        WHERE r.status <> 'CANCELLED' AND r.start_date BETWEEN p_from AND p_to), 0)::NUMERIC, 1),
      'avg_rental_value', ROUND(COALESCE(
        SUM(r.total_amount) FILTER (WHERE r.status = 'COMPLETED' AND r.start_date BETWEEN p_from AND p_to)
        / NULLIF(COUNT(*) FILTER (WHERE r.status = 'COMPLETED' AND r.start_date BETWEEN p_from AND p_to), 0), 0)::NUMERIC, 2),
      'fleet_occupancy', (
        SELECT ROUND((
          COALESCE(SUM(GREATEST(0, (LEAST(r2.end_date, p_to) - GREATEST(r2.start_date, p_from) + 1))), 0)::NUMERIC
          / NULLIF((SELECT COUNT(*) FROM public.vehicles v WHERE v.organization_id = v_org AND v.deleted_at IS NULL)
                   * ((p_to - p_from) + 1), 0)
        ) * 100, 1)
        FROM public.rentals r2
        WHERE r2.organization_id = v_org AND r2.deleted_at IS NULL AND r2.status <> 'CANCELLED'
          AND r2.start_date <= p_to AND r2.end_date >= p_from
      )
    )
    FROM public.rentals r
    WHERE r.organization_id = v_org AND r.deleted_at IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_payment_method_report(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_org UUID := public.get_user_organization_id();
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('payment_method', t.payment_method, 'amount', t.amount, 'count', t.cnt) ORDER BY t.amount DESC)
    FROM (
      SELECT p.payment_method::TEXT AS payment_method, SUM(p.amount) AS amount, COUNT(*)::INTEGER AS cnt
      FROM public.payments p
      WHERE p.organization_id = v_org AND p.voided_at IS NULL AND p.payment_date::date BETWEEN p_from AND p_to
      GROUP BY p.payment_method
    ) t
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_expense_breakdown(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_org UUID := public.get_user_organization_id();
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('category', t.category, 'amount', t.amount, 'count', t.cnt) ORDER BY t.amount DESC)
    FROM (
      SELECT e.category::TEXT AS category, SUM(e.amount) AS amount, COUNT(*)::INTEGER AS cnt
      FROM public.expenses e
      WHERE e.organization_id = v_org AND e.deleted_at IS NULL AND e.expense_date BETWEEN p_from AND p_to
      GROUP BY e.category
    ) t
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_revenue_breakdown(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_org UUID := public.get_user_organization_id();
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.'; END IF;
  RETURN (
    SELECT jsonb_build_object(
      'rental_subtotal', COALESCE(SUM(r.subtotal) FILTER (WHERE r.status <> 'CANCELLED'), 0),
      'discount', COALESCE(SUM(r.discount_amount) FILTER (WHERE r.status <> 'CANCELLED'), 0),
      'extra_charge', COALESCE(SUM(r.extra_charge) FILTER (WHERE r.status <> 'CANCELLED'), 0),
      'late_fee', COALESCE(SUM(r.late_fee) FILTER (WHERE r.status <> 'CANCELLED'), 0),
      'total_revenue', COALESCE(SUM(r.total_amount) FILTER (WHERE r.status <> 'CANCELLED'), 0),
      'deposit_excluded', COALESCE(SUM(r.deposit_amount) FILTER (WHERE r.status <> 'CANCELLED'), 0)
    )
    FROM public.rentals r
    WHERE r.organization_id = v_org AND r.deleted_at IS NULL AND r.start_date BETWEEN p_from AND p_to
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_brand_performance(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_org UUID := public.get_user_organization_id();
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.revenue DESC)
    FROM (
      SELECT COALESCE(r.vehicle_brand, v.brand) AS brand,
             COUNT(r.id)::INTEGER AS rental_count,
             COALESCE(SUM(r.total_days), 0)::NUMERIC AS rental_days,
             COALESCE(SUM(r.total_amount), 0) AS revenue
      FROM public.rentals r
      JOIN public.vehicles v ON v.id = r.vehicle_id
      WHERE r.organization_id = v_org AND r.deleted_at IS NULL AND r.status <> 'CANCELLED'
        AND r.start_date BETWEEN p_from AND p_to
      GROUP BY COALESCE(r.vehicle_brand, v.brand)
    ) t
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_rental_contract_data(p_rental_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_rental public.rentals%ROWTYPE;
  v_org_name TEXT;
  v_contract TEXT;
  v_handover public.rental_handovers%ROWTYPE;
  v_return public.rental_returns%ROWTYPE;
  v_damages JSONB;
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.'; END IF;
  SELECT * INTO v_rental FROM public.rentals
  WHERE id = p_rental_id AND organization_id = v_org AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kiralama bulunamadı.'; END IF;

  v_contract := public.ensure_rental_contract_number(p_rental_id);
  SELECT name INTO v_org_name FROM public.organizations WHERE id = v_org;
  SELECT * INTO v_handover FROM public.rental_handovers WHERE rental_id = p_rental_id;
  SELECT * INTO v_return FROM public.rental_returns WHERE rental_id = p_rental_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'timing', d.timing, 'severity', d.severity, 'location_label', d.location_label,
    'description', d.description, 'estimated_amount', d.estimated_amount
  )), '[]'::jsonb) INTO v_damages
  FROM public.rental_damages d WHERE d.rental_id = p_rental_id AND d.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'organization_name', v_org_name,
    'contract_number', v_contract,
    'rental', to_jsonb(v_rental) - 'rental_period',
    'customer', jsonb_build_object(
      'first_name', COALESCE(v_rental.customer_first_name, ''),
      'last_name', COALESCE(v_rental.customer_last_name, ''),
      'phone', COALESCE(v_rental.customer_phone, ''),
      'address', COALESCE(v_rental.customer_address, '')
    ),
    'vehicle', jsonb_build_object(
      'plate', COALESCE(v_rental.vehicle_plate, ''),
      'brand', COALESCE(v_rental.vehicle_brand, ''),
      'model', COALESCE(v_rental.vehicle_model, ''),
      'start_km', v_rental.start_km
    ),
    'handover', CASE WHEN v_handover.id IS NULL THEN NULL ELSE jsonb_build_object(
      'odometer_km', v_handover.odometer_km, 'fuel_level', v_handover.fuel_level,
      'completed_at', v_handover.completed_at) END,
    'return', CASE WHEN v_return.id IS NULL THEN NULL ELSE jsonb_build_object(
      'odometer_km', v_return.odometer_km, 'fuel_level', v_return.fuel_level,
      'actual_end_at', v_return.actual_end_at) END,
    'damages', v_damages
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_contract_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_rental_contract_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_financial_report(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vehicle_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rental_statistics(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_method_report(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expense_breakdown(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_breakdown(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_brand_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rental_contract_data(UUID) TO authenticated;
