-- RentaFlow STEP 2: reporting views (security_invoker → underlying RLS applies)

-- Vehicle rental revenue (booked totals — not deposits, not collections)
CREATE OR REPLACE VIEW public.vehicle_revenue_summary
WITH (security_invoker = true)
AS
SELECT
  v.organization_id,
  v.id AS vehicle_id,
  v.plate,
  v.brand,
  v.model,
  COUNT(r.id) FILTER (
    WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'RESERVED')
  ) AS rental_count,
  COALESCE(
    SUM(r.total_days) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'RESERVED')
    ),
    0
  ) AS rental_days,
  COALESCE(
    SUM(r.total_amount) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE')
    ),
    0
  ) AS total_rental_amount,
  COALESCE(
    SUM(r.paid_amount) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE')
    ),
    0
  ) AS total_collected_amount,
  COALESCE(
    SUM(r.remaining_amount) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'RESERVED')
    ),
    0
  ) AS total_outstanding_amount
FROM public.vehicles v
LEFT JOIN public.rentals r
  ON r.vehicle_id = v.id
 AND r.deleted_at IS NULL
WHERE v.deleted_at IS NULL
GROUP BY v.organization_id, v.id, v.plate, v.brand, v.model;

-- Vehicle expenses
CREATE OR REPLACE VIEW public.vehicle_expense_summary
WITH (security_invoker = true)
AS
SELECT
  v.organization_id,
  v.id AS vehicle_id,
  v.plate,
  COALESCE(SUM(e.amount), 0) AS total_expense_amount,
  COUNT(e.id) AS expense_count
FROM public.vehicles v
LEFT JOIN public.expenses e
  ON e.vehicle_id = v.id
WHERE v.deleted_at IS NULL
GROUP BY v.organization_id, v.id, v.plate;

-- Vehicle profit contribution (rental amount − expenses; deposits excluded)
CREATE OR REPLACE VIEW public.vehicle_profit_summary
WITH (security_invoker = true)
AS
SELECT
  rev.organization_id,
  rev.vehicle_id,
  rev.plate,
  rev.brand,
  rev.model,
  rev.rental_count,
  rev.rental_days,
  rev.total_rental_amount,
  rev.total_collected_amount,
  COALESCE(exp.total_expense_amount, 0) AS total_expense_amount,
  (rev.total_rental_amount - COALESCE(exp.total_expense_amount, 0)) AS gross_contribution
FROM public.vehicle_revenue_summary rev
LEFT JOIN public.vehicle_expense_summary exp
  ON exp.vehicle_id = rev.vehicle_id
 AND exp.organization_id = rev.organization_id;

-- Monthly revenue (by rental start month) — booked vs collected
CREATE OR REPLACE VIEW public.monthly_revenue_summary
WITH (security_invoker = true)
AS
SELECT
  r.organization_id,
  date_trunc('month', r.start_date::timestamp)::date AS month_start,
  COUNT(*) FILTER (
    WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'RESERVED')
  ) AS rental_count,
  COALESCE(
    SUM(r.total_amount) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE')
    ),
    0
  ) AS booked_amount,
  COALESCE(
    SUM(r.paid_amount) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'RESERVED')
    ),
    0
  ) AS collected_amount,
  COALESCE(
    SUM(r.remaining_amount) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'RESERVED')
    ),
    0
  ) AS outstanding_amount
FROM public.rentals r
WHERE r.deleted_at IS NULL
GROUP BY r.organization_id, date_trunc('month', r.start_date::timestamp)::date;

-- Customer rental summary (no national_id / license in view)
CREATE OR REPLACE VIEW public.customer_rental_summary
WITH (security_invoker = true)
AS
SELECT
  c.organization_id,
  c.id AS customer_id,
  c.first_name,
  c.last_name,
  c.phone,
  COUNT(r.id) FILTER (
    WHERE r.status <> 'CANCELLED'
  ) AS rental_count,
  COALESCE(
    SUM(r.total_amount) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE')
    ),
    0
  ) AS total_spend,
  COALESCE(
    SUM(r.paid_amount) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'RESERVED')
    ),
    0
  ) AS total_paid,
  COALESCE(
    SUM(r.remaining_amount) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'RESERVED')
    ),
    0
  ) AS open_balance,
  MAX(r.start_date) FILTER (
    WHERE r.status <> 'CANCELLED'
  ) AS last_rental_date
FROM public.customers c
LEFT JOIN public.rentals r
  ON r.customer_id = c.id
 AND r.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.organization_id, c.id, c.first_name, c.last_name, c.phone;

-- Utilization helper view: rented days over lifetime of active vehicles
-- (date-range utilization for reports is computed in application/RPC with params)
CREATE OR REPLACE VIEW public.vehicle_utilization_summary
WITH (security_invoker = true)
AS
SELECT
  v.organization_id,
  v.id AS vehicle_id,
  v.plate,
  v.status,
  COALESCE(
    SUM(r.total_days) FILTER (
      WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE')
    ),
    0
  ) AS rented_days_lifetime,
  COUNT(r.id) FILTER (
    WHERE r.status IN ('ACTIVE', 'COMPLETED', 'OVERDUE')
  ) AS completed_like_rentals
FROM public.vehicles v
LEFT JOIN public.rentals r
  ON r.vehicle_id = v.id
 AND r.deleted_at IS NULL
WHERE v.deleted_at IS NULL
GROUP BY v.organization_id, v.id, v.plate, v.status;

-- Parameterized utilization for a date range (RPC for dashboard/reports)
CREATE OR REPLACE FUNCTION public.get_vehicle_utilization(
  p_from DATE,
  p_to DATE
)
RETURNS TABLE (
  vehicle_id UUID,
  plate TEXT,
  brand TEXT,
  model TEXT,
  period_days INTEGER,
  rented_days NUMERIC,
  utilization_rate NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_period_days INTEGER;
BEGIN
  IF p_to < p_from THEN
    RAISE EXCEPTION 'Bitiş tarihi başlangıçtan önce olamaz.';
  END IF;

  v_period_days := (p_to - p_from) + 1;

  RETURN QUERY
  SELECT
    v.id,
    v.plate,
    v.brand,
    v.model,
    v_period_days,
    COALESCE(SUM(
      GREATEST(
        0,
        (
          LEAST(r.end_date, p_to) - GREATEST(r.start_date, p_from) + 1
        )
      )
    ), 0)::NUMERIC AS rented_days,
    ROUND(
      (
        COALESCE(SUM(
          GREATEST(
            0,
            (LEAST(r.end_date, p_to) - GREATEST(r.start_date, p_from) + 1)
          )
        ), 0)::NUMERIC
        / NULLIF(v_period_days, 0)
      ) * 100,
      1
    ) AS utilization_rate
  FROM public.vehicles v
  LEFT JOIN public.rentals r
    ON r.vehicle_id = v.id
   AND r.organization_id = v.organization_id
   AND r.deleted_at IS NULL
   AND r.status IN ('RESERVED', 'ACTIVE', 'COMPLETED', 'OVERDUE')
   AND r.start_date <= p_to
   AND r.end_date >= p_from
  WHERE v.organization_id = v_org
    AND v.deleted_at IS NULL
  GROUP BY v.id, v.plate, v.brand, v.model;
END;
$$;

GRANT SELECT ON public.vehicle_revenue_summary TO authenticated;
GRANT SELECT ON public.vehicle_expense_summary TO authenticated;
GRANT SELECT ON public.vehicle_profit_summary TO authenticated;
GRANT SELECT ON public.monthly_revenue_summary TO authenticated;
GRANT SELECT ON public.customer_rental_summary TO authenticated;
GRANT SELECT ON public.vehicle_utilization_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vehicle_utilization(DATE, DATE) TO authenticated;
