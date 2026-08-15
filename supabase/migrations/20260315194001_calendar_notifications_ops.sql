-- RentaFlow STEP 7: calendar helpers, notifications prefs/push, maintenance/expense extensions

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.maintenance_status AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend expense categories if missing (TOLLS/PARKING map to OTHER or add)
DO $$ BEGIN
  ALTER TYPE public.expense_category ADD VALUE IF NOT EXISTS 'TOLL';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.expense_category ADD VALUE IF NOT EXISTS 'PARKING';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Extend maintenance_records
-- ---------------------------------------------------------------------------
ALTER TABLE public.maintenance_records
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS status public.maintenance_status NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS completed_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.maintenance_records
SET scheduled_date = COALESCE(scheduled_date, maintenance_date),
    completed_date = CASE
      WHEN status = 'COMPLETED' THEN COALESCE(completed_date, maintenance_date)
      ELSE completed_date
    END
WHERE scheduled_date IS NULL;

-- ---------------------------------------------------------------------------
-- Extend expenses
-- ---------------------------------------------------------------------------
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS vendor TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maintenance_id UUID REFERENCES public.maintenance_records (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS expenses_vehicle_date_idx
  ON public.expenses (vehicle_id, expense_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS maintenance_vehicle_status_idx
  ON public.maintenance_records (vehicle_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS maintenance_scheduled_idx
  ON public.maintenance_records (organization_id, scheduled_date)
  WHERE deleted_at IS NULL AND status IN ('SCHEDULED', 'IN_PROGRESS');

-- ---------------------------------------------------------------------------
-- notification_settings (per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  user_id UUID NOT NULL REFERENCES auth.users (id),
  rental_start_reminder BOOLEAN NOT NULL DEFAULT true,
  rental_return_reminder BOOLEAN NOT NULL DEFAULT true,
  overdue_rental BOOLEAN NOT NULL DEFAULT true,
  payment_due BOOLEAN NOT NULL DEFAULT true,
  document_expiring BOOLEAN NOT NULL DEFAULT true,
  maintenance_due BOOLEAN NOT NULL DEFAULT true,
  reminder_hours_before_start INTEGER NOT NULL DEFAULT 24,
  reminder_hours_before_return INTEGER NOT NULL DEFAULT 24,
  document_days_before INTEGER NOT NULL DEFAULT 30,
  maintenance_days_before INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_settings_user_uidx UNIQUE (user_id)
);

CREATE TRIGGER notification_settings_set_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- device_push_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  user_id UUID NOT NULL REFERENCES auth.users (id),
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT device_push_tokens_token_uidx UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS device_push_tokens_user_idx
  ON public.device_push_tokens (user_id);

CREATE TRIGGER device_push_tokens_set_updated_at
  BEFORE UPDATE ON public.device_push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_push_tokens FORCE ROW LEVEL SECURITY;

CREATE POLICY notification_settings_select ON public.notification_settings
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (user_id = auth.uid() OR public.is_admin())
  );
CREATE POLICY notification_settings_write ON public.notification_settings
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND user_id = auth.uid()
  );

CREATE POLICY device_push_tokens_select ON public.device_push_tokens
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (user_id = auth.uid() OR public.is_admin())
  );
CREATE POLICY device_push_tokens_write ON public.device_push_tokens
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND user_id = auth.uid()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage: expense receipts under documents bucket path expenses/
-- (reuse documents bucket — first path segment = org id)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Calendar rentals in range (date-filtered, org-scoped)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_calendar_rentals(
  p_from DATE,
  p_to DATE,
  p_vehicle_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_customer_q TEXT DEFAULT NULL
)
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
  end_time TIME,
  status public.rental_status,
  display_status TEXT,
  total_amount NUMERIC
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
    c.id,
    (c.first_name || ' ' || c.last_name),
    r.start_date,
    r.start_time,
    r.end_date,
    r.end_time,
    r.status,
    CASE
      WHEN r.status = 'ACTIVE'
        AND (r.end_date + r.end_time) < (now() AT TIME ZONE 'Europe/Istanbul')
        THEN 'OVERDUE'
      ELSE r.status::text
    END,
    r.total_amount
  FROM public.rentals r
  JOIN public.vehicles v ON v.id = r.vehicle_id
  JOIN public.customers c ON c.id = r.customer_id
  WHERE r.organization_id = public.get_user_organization_id()
    AND r.deleted_at IS NULL
    AND r.status <> 'CANCELLED'
    AND r.start_date <= p_to
    AND r.end_date >= p_from
    AND (p_vehicle_id IS NULL OR r.vehicle_id = p_vehicle_id)
    AND (
      p_status IS NULL
      OR p_status = 'ALL'
      OR (
        p_status = 'OVERDUE'
        AND r.status = 'ACTIVE'
        AND (r.end_date + r.end_time) < (now() AT TIME ZONE 'Europe/Istanbul')
      )
      OR (p_status <> 'OVERDUE' AND r.status::text = p_status)
    )
    AND (
      p_customer_q IS NULL
      OR p_customer_q = ''
      OR c.first_name ILIKE '%' || p_customer_q || '%'
      OR c.last_name ILIKE '%' || p_customer_q || '%'
      OR COALESCE(c.phone, '') ILIKE '%' || p_customer_q || '%'
    )
  ORDER BY r.start_date, r.start_time;
$$;

-- ---------------------------------------------------------------------------
-- Maintenance RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_maintenance(
  p_vehicle_id UUID,
  p_maintenance_type public.maintenance_type,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_scheduled_date DATE DEFAULT CURRENT_DATE,
  p_odometer INTEGER DEFAULT NULL,
  p_service_name TEXT DEFAULT NULL,
  p_cost NUMERIC DEFAULT 0,
  p_status public.maintenance_status DEFAULT 'SCHEDULED',
  p_notes TEXT DEFAULT NULL,
  p_next_maintenance_date DATE DEFAULT NULL,
  p_next_maintenance_km INTEGER DEFAULT NULL
)
RETURNS public.maintenance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_vehicle public.vehicles%ROWTYPE;
  v_row public.maintenance_records%ROWTYPE;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  SELECT * INTO v_vehicle FROM public.vehicles
  WHERE id = p_vehicle_id AND organization_id = v_org AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Araç bulunamadı.'; END IF;

  IF p_odometer IS NOT NULL AND p_odometer < COALESCE(v_vehicle.current_km, 0) THEN
    RAISE EXCEPTION 'Bakım kilometresi mevcut kilometreden küçük olamaz.';
  END IF;

  INSERT INTO public.maintenance_records (
    organization_id, vehicle_id, maintenance_type, title, description,
    maintenance_date, scheduled_date, completed_date, current_km, service_name,
    amount, status, notes, next_maintenance_date, next_maintenance_km, created_by
  ) VALUES (
    v_org, p_vehicle_id, p_maintenance_type, p_title, p_description,
    COALESCE(p_scheduled_date, CURRENT_DATE),
    COALESCE(p_scheduled_date, CURRENT_DATE),
    CASE WHEN p_status = 'COMPLETED' THEN COALESCE(p_scheduled_date, CURRENT_DATE) ELSE NULL END,
    p_odometer, p_service_name, COALESCE(p_cost, 0), p_status, p_notes,
    p_next_maintenance_date, p_next_maintenance_km, auth.uid()
  ) RETURNING * INTO v_row;

  IF p_status = 'IN_PROGRESS' THEN
    UPDATE public.vehicles SET status = 'MAINTENANCE', updated_at = now()
    WHERE id = p_vehicle_id;
  END IF;

  IF p_status = 'COMPLETED' AND COALESCE(p_cost, 0) > 0 THEN
    INSERT INTO public.expenses (
      organization_id, vehicle_id, category, amount, expense_date,
      description, maintenance_id, created_by
    ) VALUES (
      v_org, p_vehicle_id, 'MAINTENANCE', p_cost,
      COALESCE(p_scheduled_date, CURRENT_DATE),
      COALESCE(p_title, 'Bakım'), v_row.id, auth.uid()
    );
  END IF;

  IF p_odometer IS NOT NULL THEN
    INSERT INTO public.vehicle_mileage_logs (
      organization_id, vehicle_id, kilometers, note, created_by
    ) VALUES (
      v_org, p_vehicle_id, p_odometer, 'Bakım kilometresi', auth.uid()
    );
    UPDATE public.vehicles SET current_km = p_odometer, updated_at = now()
    WHERE id = p_vehicle_id AND current_km < p_odometer;
  END IF;

  PERFORM public.write_audit_log(
    v_org, 'CREATE_MAINTENANCE', 'maintenance', v_row.id,
    jsonb_build_object('vehicle_id', p_vehicle_id, 'status', p_status, 'cost', p_cost)
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_maintenance(p_maintenance_id UUID)
RETURNS public.maintenance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.maintenance_records%ROWTYPE;
  v_has_active BOOLEAN;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  SELECT * INTO v_row FROM public.maintenance_records
  WHERE id = p_maintenance_id AND organization_id = v_org AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bakım kaydı bulunamadı.'; END IF;

  UPDATE public.maintenance_records SET
    status = 'COMPLETED',
    completed_date = CURRENT_DATE,
    maintenance_date = CURRENT_DATE,
    updated_at = now()
  WHERE id = p_maintenance_id
  RETURNING * INTO v_row;

  -- Link expense once if cost > 0 and not already linked
  IF v_row.amount > 0 AND NOT EXISTS (
    SELECT 1 FROM public.expenses e WHERE e.maintenance_id = v_row.id
  ) THEN
    INSERT INTO public.expenses (
      organization_id, vehicle_id, category, amount, expense_date,
      description, maintenance_id, created_by
    ) VALUES (
      v_org, v_row.vehicle_id, 'MAINTENANCE', v_row.amount, CURRENT_DATE,
      COALESCE(v_row.title, 'Bakım'), v_row.id, auth.uid()
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.rentals r
    WHERE r.vehicle_id = v_row.vehicle_id
      AND r.deleted_at IS NULL
      AND r.status IN ('RESERVED', 'ACTIVE', 'OVERDUE')
  ) INTO v_has_active;

  IF NOT EXISTS (
    SELECT 1 FROM public.maintenance_records m
    WHERE m.vehicle_id = v_row.vehicle_id
      AND m.id <> v_row.id
      AND m.deleted_at IS NULL
      AND m.status = 'IN_PROGRESS'
  ) AND NOT v_has_active THEN
    UPDATE public.vehicles SET status = 'AVAILABLE', updated_at = now()
    WHERE id = v_row.vehicle_id AND status = 'MAINTENANCE';
  END IF;

  PERFORM public.write_audit_log(
    v_org, 'COMPLETE_MAINTENANCE', 'maintenance', v_row.id,
    jsonb_build_object('vehicle_id', v_row.vehicle_id)
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_maintenance(p_maintenance_id UUID)
RETURNS public.maintenance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.maintenance_records%ROWTYPE;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  SELECT * INTO v_row FROM public.maintenance_records
  WHERE id = p_maintenance_id AND organization_id = v_org AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bakım kaydı bulunamadı.'; END IF;

  UPDATE public.maintenance_records SET
    status = 'IN_PROGRESS', updated_at = now()
  WHERE id = p_maintenance_id
  RETURNING * INTO v_row;

  UPDATE public.vehicles SET status = 'MAINTENANCE', updated_at = now()
  WHERE id = v_row.vehicle_id AND deleted_at IS NULL;

  PERFORM public.write_audit_log(
    v_org, 'UPDATE_MAINTENANCE', 'maintenance', v_row.id,
    jsonb_build_object('status', 'IN_PROGRESS')
  );

  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- Notification helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_notification_settings(p_user_id UUID DEFAULT auth.uid())
RETURNS public.notification_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.notification_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.notification_settings WHERE user_id = p_user_id;
  IF FOUND THEN RETURN v_row; END IF;

  INSERT INTO public.notification_settings (organization_id, user_id)
  VALUES (v_org, p_user_id)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.notifications%ROWTYPE;
BEGIN
  IF NOT public.can_write() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.';
  END IF;

  INSERT INTO public.notifications (
    organization_id, user_id, type, title, message,
    related_entity_type, related_entity_id
  ) VALUES (
    v_org, p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id
  ) RETURNING * INTO v_row;

  PERFORM public.write_audit_log(
    v_org, 'NOTIFICATION_CREATED', 'notification', v_row.id,
    jsonb_build_object('type', p_type)
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_all BOOLEAN DEFAULT false, p_ids UUID[] DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_count INTEGER;
BEGIN
  IF p_all THEN
    UPDATE public.notifications SET is_read = true
    WHERE organization_id = v_org
      AND (user_id IS NULL OR user_id = auth.uid())
      AND is_read = false;
  ELSE
    UPDATE public.notifications SET is_read = true
    WHERE organization_id = v_org
      AND id = ANY (p_ids)
      AND (user_id IS NULL OR user_id = auth.uid());
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.write_audit_log(
    v_org, 'NOTIFICATION_READ', 'notification', NULL,
    jsonb_build_object('count', v_count, 'all', p_all)
  );

  RETURN v_count;
END;
$$;

-- Generate operational notifications (callable by cron/edge or on-demand)
CREATE OR REPLACE FUNCTION public.refresh_operational_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_count INTEGER := 0;
  r RECORD;
  today_d DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date;
BEGIN
  IF v_org IS NULL THEN RETURN 0; END IF;

  -- Overdue rentals
  FOR r IN
    SELECT r.id, v.plate, v.brand, v.model,
           (c.first_name || ' ' || c.last_name) AS customer_name
    FROM public.rentals r
    JOIN public.vehicles v ON v.id = r.vehicle_id
    JOIN public.customers c ON c.id = r.customer_id
    WHERE r.organization_id = v_org
      AND r.deleted_at IS NULL
      AND r.status = 'ACTIVE'
      AND (r.end_date + r.end_time) < (now() AT TIME ZONE 'Europe/Istanbul')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.organization_id = v_org
          AND n.type = 'OVERDUE_RENTAL'
          AND n.related_entity_id = r.id
          AND n.created_at::date = today_d
      )
  LOOP
    INSERT INTO public.notifications (
      organization_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      v_org, 'OVERDUE_RENTAL',
      'Geciken teslim',
      r.brand || ' ' || r.model || ' (' || r.plate || ') teslimi gecikti — ' || r.customer_name,
      'rental', r.id
    );
    v_count := v_count + 1;
  END LOOP;

  -- Payment due (remaining > 0 on active/completed)
  FOR r IN
    SELECT r.id, v.plate, (c.first_name || ' ' || c.last_name) AS customer_name, r.remaining_amount
    FROM public.rentals r
    JOIN public.vehicles v ON v.id = r.vehicle_id
    JOIN public.customers c ON c.id = r.customer_id
    WHERE r.organization_id = v_org
      AND r.deleted_at IS NULL
      AND r.remaining_amount > 0
      AND r.status IN ('ACTIVE', 'COMPLETED', 'RESERVED')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.organization_id = v_org
          AND n.type = 'PAYMENT_DUE'
          AND n.related_entity_id = r.id
          AND n.created_at::date = today_d
      )
  LOOP
    INSERT INTO public.notifications (
      organization_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      v_org, 'PAYMENT_DUE',
      'Ödeme bekliyor',
      r.customer_name || ' — ' || r.plate || ' için ' || r.remaining_amount::text || ' ₺ kaldı',
      'rental', r.id
    );
    v_count := v_count + 1;
  END LOOP;

  -- Document expiring (30 days)
  FOR r IN
    SELECT v.id, v.plate, v.brand, v.model, 'insurance' AS doc, v.insurance_expiry AS expiry
    FROM public.vehicles v
    WHERE v.organization_id = v_org AND v.deleted_at IS NULL
      AND v.insurance_expiry IS NOT NULL
      AND v.insurance_expiry BETWEEN today_d AND today_d + 30
    UNION ALL
    SELECT v.id, v.plate, v.brand, v.model, 'casco', v.casco_expiry
    FROM public.vehicles v
    WHERE v.organization_id = v_org AND v.deleted_at IS NULL
      AND v.casco_expiry IS NOT NULL
      AND v.casco_expiry BETWEEN today_d AND today_d + 30
    UNION ALL
    SELECT v.id, v.plate, v.brand, v.model, 'inspection', v.inspection_expiry
    FROM public.vehicles v
    WHERE v.organization_id = v_org AND v.deleted_at IS NULL
      AND v.inspection_expiry IS NOT NULL
      AND v.inspection_expiry BETWEEN today_d AND today_d + 30
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.organization_id = v_org
        AND n.type = 'DOCUMENT_EXPIRING'
        AND n.related_entity_id = r.id
        AND n.message ILIKE '%' || r.doc || '%'
        AND n.created_at::date = today_d
    ) THEN
      INSERT INTO public.notifications (
        organization_id, type, title, message, related_entity_type, related_entity_id
      ) VALUES (
        v_org, 'DOCUMENT_EXPIRING',
        'Belge süresi yaklaşıyor',
        r.brand || ' ' || r.model || ' (' || r.plate || ') ' || r.doc || ' belgesi ' || r.expiry::text || ' tarihinde bitiyor',
        'vehicle', r.id
      );
      v_count := v_count + 1;
      PERFORM public.write_audit_log(
        v_org, 'DOCUMENT_ALERT_CREATED', 'vehicle', r.id,
        jsonb_build_object('doc', r.doc)
      );
    END IF;
  END LOOP;

  -- Maintenance due (next 7 days scheduled)
  FOR r IN
    SELECT m.id, v.plate, v.brand, v.model, m.scheduled_date
    FROM public.maintenance_records m
    JOIN public.vehicles v ON v.id = m.vehicle_id
    WHERE m.organization_id = v_org
      AND m.deleted_at IS NULL
      AND m.status = 'SCHEDULED'
      AND m.scheduled_date BETWEEN today_d AND today_d + 7
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.organization_id = v_org
          AND n.type = 'MAINTENANCE_DUE'
          AND n.related_entity_id = m.id
          AND n.created_at::date = today_d
      )
  LOOP
    INSERT INTO public.notifications (
      organization_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      v_org, 'MAINTENANCE_DUE',
      'Bakım zamanı yaklaşıyor',
      r.brand || ' ' || r.model || ' (' || r.plate || ') bakımı ' || r.scheduled_date::text,
      'maintenance', r.id
    );
    v_count := v_count + 1;
  END LOOP;

  -- Return reminders (tomorrow)
  FOR r IN
    SELECT r.id, v.plate, v.brand, v.model
    FROM public.rentals r
    JOIN public.vehicles v ON v.id = r.vehicle_id
    WHERE r.organization_id = v_org
      AND r.deleted_at IS NULL
      AND r.status = 'ACTIVE'
      AND r.end_date = today_d + 1
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.organization_id = v_org
          AND n.type = 'RENTAL_RETURN_REMINDER'
          AND n.related_entity_id = r.id
          AND n.created_at::date = today_d
      )
  LOOP
    INSERT INTO public.notifications (
      organization_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      v_org, 'RENTAL_RETURN_REMINDER',
      'Yarın teslim',
      r.brand || ' ' || r.model || ' (' || r.plate || ') yarın iade edilecek',
      'rental', r.id
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Dashboard ops snapshot
CREATE OR REPLACE FUNCTION public.get_ops_today_summary()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH org AS (
    SELECT public.get_user_organization_id() AS id
  ),
  today AS (
    SELECT (now() AT TIME ZONE 'Europe/Istanbul')::date AS d
  )
  SELECT jsonb_build_object(
    'handovers_today', (
      SELECT COUNT(*) FROM public.rentals r, org, today
      WHERE r.organization_id = org.id AND r.deleted_at IS NULL
        AND r.status = 'RESERVED' AND r.start_date = today.d
    ),
    'returns_today', (
      SELECT COUNT(*) FROM public.rentals r, org, today
      WHERE r.organization_id = org.id AND r.deleted_at IS NULL
        AND r.status = 'ACTIVE' AND r.end_date = today.d
    ),
    'overdue', (
      SELECT COUNT(*) FROM public.rentals r, org
      WHERE r.organization_id = org.id AND r.deleted_at IS NULL
        AND r.status = 'ACTIVE'
        AND (r.end_date + r.end_time) < (now() AT TIME ZONE 'Europe/Istanbul')
    ),
    'payments_due', (
      SELECT COUNT(*) FROM public.rentals r, org
      WHERE r.organization_id = org.id AND r.deleted_at IS NULL
        AND r.remaining_amount > 0
        AND r.status IN ('ACTIVE', 'COMPLETED', 'RESERVED')
    ),
    'maintenance_upcoming', (
      SELECT COUNT(*) FROM public.maintenance_records m, org, today
      WHERE m.organization_id = org.id AND m.deleted_at IS NULL
        AND m.status = 'SCHEDULED'
        AND m.scheduled_date BETWEEN today.d AND today.d + 7
    ),
    'documents_expiring', (
      SELECT COUNT(*) FROM public.vehicles v, org, today
      WHERE v.organization_id = org.id AND v.deleted_at IS NULL
        AND (
          (v.insurance_expiry BETWEEN today.d AND today.d + 30)
          OR (v.casco_expiry BETWEEN today.d AND today.d + 30)
          OR (v.inspection_expiry BETWEEN today.d AND today.d + 30)
        )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_calendar_rentals(DATE, DATE, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_maintenance(UUID, public.maintenance_type, TEXT, TEXT, DATE, INTEGER, TEXT, NUMERIC, public.maintenance_status, TEXT, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_maintenance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_maintenance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_notification_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(BOOLEAN, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_operational_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ops_today_summary() TO authenticated;
