-- RentaFlow STEP 4: vehicle mileage logs, plate normalize unique, vehicle RPCs

-- Stronger plate uniqueness: ignore case + whitespace
DROP INDEX IF EXISTS public.vehicles_org_plate_active_uidx;

CREATE UNIQUE INDEX vehicles_org_plate_active_uidx
  ON public.vehicles (
    organization_id,
    regexp_replace(lower(plate), '\s+', '', 'g')
  )
  WHERE deleted_at IS NULL;

-- Semi-automatic transmission (frontend: Yarı Otomatik)
DO $$ BEGIN
  ALTER TYPE public.transmission_type ADD VALUE IF NOT EXISTS 'SEMI_AUTOMATIC';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- vehicle_mileage_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_mileage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles (id),
  rental_id UUID REFERENCES public.rentals (id),
  kilometers INTEGER NOT NULL CHECK (kilometers >= 0),
  note TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mileage_logs_vehicle
  ON public.vehicle_mileage_logs (vehicle_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_mileage_logs_organization
  ON public.vehicle_mileage_logs (organization_id);

ALTER TABLE public.vehicle_mileage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_mileage_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY mileage_logs_select ON public.vehicle_mileage_logs
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY mileage_logs_insert ON public.vehicle_mileage_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY mileage_logs_update ON public.vehicle_mileage_logs
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY mileage_logs_delete_admin ON public.vehicle_mileage_logs
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_admin()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_mileage_logs TO authenticated;

-- ---------------------------------------------------------------------------
-- Vehicle detail financial + utilization stats
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_vehicle_stats(p_vehicle_id UUID)
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
  v_month_days INTEGER;
  v_rented_days NUMERIC;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı organizasyonu bulunamadı.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles
    WHERE id = p_vehicle_id
      AND organization_id = v_org
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Araç bulunamadı.';
  END IF;

  v_month_days := (v_month_end - v_month_start) + 1;

  SELECT COALESCE(SUM(
    GREATEST(
      0,
      (LEAST(r.end_date, v_month_end) - GREATEST(r.start_date, v_month_start) + 1)
    )
  ), 0)
  INTO v_rented_days
  FROM public.rentals r
  WHERE r.vehicle_id = p_vehicle_id
    AND r.organization_id = v_org
    AND r.deleted_at IS NULL
    AND r.status IN ('RESERVED', 'ACTIVE', 'COMPLETED', 'OVERDUE')
    AND r.start_date <= v_month_end
    AND r.end_date >= v_month_start;

  RETURN (
    SELECT jsonb_build_object(
      'rental_count', COALESCE(rev.rental_count, 0),
      'rental_days', COALESCE(rev.rental_days, 0),
      'total_rental_amount', COALESCE(rev.total_rental_amount, 0),
      'total_collected_amount', COALESCE(rev.total_collected_amount, 0),
      'total_expense_amount', COALESCE(exp.total_expense_amount, 0),
      'gross_contribution',
        COALESCE(rev.total_rental_amount, 0) - COALESCE(exp.total_expense_amount, 0),
      'month_utilization_rate',
        ROUND((v_rented_days / NULLIF(v_month_days, 0)) * 100, 1),
      'month_rented_days', v_rented_days,
      'month_days', v_month_days
    )
    FROM public.vehicles v
    LEFT JOIN public.vehicle_revenue_summary rev ON rev.vehicle_id = v.id
    LEFT JOIN public.vehicle_expense_summary exp ON exp.vehicle_id = v.id
    WHERE v.id = p_vehicle_id
      AND v.organization_id = v_org
  );
END;
$$;

-- Safe status change (blocks RENTED → AVAILABLE manual)
CREATE OR REPLACE FUNCTION public.update_vehicle_status(
  p_vehicle_id UUID,
  p_status public.vehicle_status
)
RETURNS public.vehicles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_vehicle public.vehicles%ROWTYPE;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  IF p_status = 'RENTED' THEN
    RAISE EXCEPTION 'Kirada durumu yalnızca kiralama işlemleriyle atanır.';
  END IF;

  SELECT * INTO v_vehicle
  FROM public.vehicles
  WHERE id = p_vehicle_id
    AND organization_id = v_org
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Araç bulunamadı.';
  END IF;

  IF v_vehicle.status = 'RENTED' THEN
    RAISE EXCEPTION 'Bu araç aktif bir kiralamada olduğu için durumu değiştirilemez.';
  END IF;

  UPDATE public.vehicles
  SET status = p_status, updated_at = now()
  WHERE id = p_vehicle_id
  RETURNING * INTO v_vehicle;

  PERFORM public.write_audit_log(
    v_org,
    'STATUS_CHANGE_VEHICLE',
    'vehicle',
    p_vehicle_id,
    jsonb_build_object('status', p_status)
  );

  RETURN v_vehicle;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_vehicle_mileage(
  p_vehicle_id UUID,
  p_kilometers INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS public.vehicles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_vehicle public.vehicles%ROWTYPE;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  IF p_kilometers IS NULL OR p_kilometers < 0 THEN
    RAISE EXCEPTION 'Kilometre geçerli olmalıdır.';
  END IF;

  SELECT * INTO v_vehicle
  FROM public.vehicles
  WHERE id = p_vehicle_id
    AND organization_id = v_org
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Araç bulunamadı.';
  END IF;

  IF p_kilometers < v_vehicle.current_km THEN
    RAISE EXCEPTION 'Yeni kilometre mevcut kilometreden düşük olamaz.';
  END IF;

  UPDATE public.vehicles
  SET current_km = p_kilometers, updated_at = now()
  WHERE id = p_vehicle_id
  RETURNING * INTO v_vehicle;

  INSERT INTO public.vehicle_mileage_logs (
    organization_id, vehicle_id, kilometers, note, created_by
  ) VALUES (
    v_org, p_vehicle_id, p_kilometers, p_note, auth.uid()
  );

  PERFORM public.write_audit_log(
    v_org,
    'UPDATE_MILEAGE',
    'vehicle',
    p_vehicle_id,
    jsonb_build_object('kilometers', p_kilometers)
  );

  RETURN v_vehicle;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_vehicle(p_vehicle_id UUID)
RETURNS public.vehicles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_vehicle public.vehicles%ROWTYPE;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  SELECT * INTO v_vehicle
  FROM public.vehicles
  WHERE id = p_vehicle_id
    AND organization_id = v_org
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Araç bulunamadı.';
  END IF;

  IF v_vehicle.status = 'RENTED' OR EXISTS (
    SELECT 1 FROM public.rentals r
    WHERE r.vehicle_id = p_vehicle_id
      AND r.deleted_at IS NULL
      AND r.status IN ('RESERVED', 'ACTIVE', 'OVERDUE')
  ) THEN
    RAISE EXCEPTION 'Bu araç aktif bir kiralamada olduğu için silinemez.';
  END IF;

  UPDATE public.vehicles
  SET
    deleted_at = now(),
    status = 'INACTIVE',
    updated_at = now()
  WHERE id = p_vehicle_id
  RETURNING * INTO v_vehicle;

  PERFORM public.write_audit_log(
    v_org,
    'DELETE_VEHICLE',
    'vehicle',
    p_vehicle_id,
    '{}'::jsonb
  );

  RETURN v_vehicle;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vehicle_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vehicle_status(UUID, public.vehicle_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vehicle_mileage(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_vehicle(UUID) TO authenticated;
