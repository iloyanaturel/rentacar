-- RentaFlow STEP 3: Dashboard aggregation RPC (Europe/Istanbul)

CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_today DATE := (timezone('Europe/Istanbul', now()))::date;
  v_month_start DATE := date_trunc('month', v_today::timestamp)::date;
  v_month_end DATE := (date_trunc('month', v_today::timestamp) + INTERVAL '1 month' - INTERVAL '1 day')::date;
  v_result JSONB;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.';
  END IF;

  SELECT jsonb_build_object(
    'today', v_today,
    'vehicles', jsonb_build_object(
      'total', COUNT(*) FILTER (WHERE deleted_at IS NULL),
      'available', COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'AVAILABLE'),
      'rented', COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'RENTED'),
      'maintenance', COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'MAINTENANCE'),
      'inactive', COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'INACTIVE')
    )
  )
  INTO v_result
  FROM public.vehicles
  WHERE organization_id = v_org;

  v_result := v_result || jsonb_build_object(
    'finance', (
      SELECT jsonb_build_object(
        -- Booked rental totals this month (not deposits)
        'month_rental_count', COUNT(*) FILTER (
          WHERE r.deleted_at IS NULL
            AND r.status IN ('RESERVED', 'ACTIVE', 'COMPLETED', 'OVERDUE')
            AND r.start_date BETWEEN v_month_start AND v_month_end
        ),
        'month_booked_amount', COALESCE(SUM(r.total_amount) FILTER (
          WHERE r.deleted_at IS NULL
            AND r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE')
            AND r.start_date BETWEEN v_month_start AND v_month_end
        ), 0),
        'month_collected_amount', COALESCE((
          SELECT SUM(p.amount)
          FROM public.payments p
          WHERE p.organization_id = v_org
            AND p.voided_at IS NULL
            AND (timezone('Europe/Istanbul', p.payment_date))::date
                BETWEEN v_month_start AND v_month_end
        ), 0),
        'outstanding_amount', COALESCE(SUM(r.remaining_amount) FILTER (
          WHERE r.deleted_at IS NULL
            AND r.status IN ('RESERVED', 'ACTIVE', 'COMPLETED', 'OVERDUE')
            AND r.remaining_amount > 0
        ), 0),
        'today_booked_amount', COALESCE(SUM(r.total_amount) FILTER (
          WHERE r.deleted_at IS NULL
            AND r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE')
            AND r.start_date = v_today
        ), 0)
      )
      FROM public.rentals r
      WHERE r.organization_id = v_org
    )
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_today_returns()
RETURNS TABLE (
  rental_id UUID,
  vehicle_id UUID,
  plate TEXT,
  brand TEXT,
  model TEXT,
  customer_id UUID,
  customer_name TEXT,
  end_date DATE,
  end_time TIME,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  status public.rental_status,
  payment_status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_today DATE := (timezone('Europe/Istanbul', now()))::date;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    v.id,
    v.plate,
    v.brand,
    v.model,
    c.id,
    trim(c.first_name || ' ' || c.last_name),
    r.end_date,
    r.end_time,
    r.total_amount,
    r.paid_amount,
    r.remaining_amount,
    r.status,
    public.compute_payment_status(r.total_amount, r.paid_amount)
  FROM public.rentals r
  JOIN public.vehicles v ON v.id = r.vehicle_id
  JOIN public.customers c ON c.id = r.customer_id
  WHERE r.organization_id = v_org
    AND r.deleted_at IS NULL
    AND r.end_date = v_today
    AND r.status IN ('RESERVED', 'ACTIVE', 'OVERDUE')
  ORDER BY r.end_time ASC
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_upcoming_rentals(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  rental_id UUID,
  vehicle_id UUID,
  plate TEXT,
  brand TEXT,
  model TEXT,
  customer_id UUID,
  customer_name TEXT,
  start_date DATE,
  start_time TIME,
  end_date DATE,
  total_amount NUMERIC,
  status public.rental_status
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_today DATE := (timezone('Europe/Istanbul', now()))::date;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    v.id,
    v.plate,
    v.brand,
    v.model,
    c.id,
    trim(c.first_name || ' ' || c.last_name),
    r.start_date,
    r.start_time,
    r.end_date,
    r.total_amount,
    r.status
  FROM public.rentals r
  JOIN public.vehicles v ON v.id = r.vehicle_id
  JOIN public.customers c ON c.id = r.customer_id
  WHERE r.organization_id = v_org
    AND r.deleted_at IS NULL
    AND r.status IN ('RESERVED', 'ACTIVE')
    AND r.start_date > v_today
    AND r.start_date <= (v_today + GREATEST(p_days, 1))
  ORDER BY r.start_date ASC, r.start_time ASC
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_returns() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_upcoming_rentals(INTEGER) TO authenticated;
