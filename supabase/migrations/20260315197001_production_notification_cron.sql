-- STEP 10: production scheduler fan-out for operational notifications
-- Callable only via service_role (Edge Function cron). Does not expand client surface.

CREATE OR REPLACE FUNCTION public.refresh_operational_notifications_for_org(
  p_organization_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  rec RECORD;
  today_d DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id required';
  END IF;

  -- Mirror refresh_operational_notifications logic scoped to p_organization_id
  FOR rec IN
    SELECT rent.id AS id, v.plate, v.brand, v.model
    FROM public.rentals rent
    JOIN public.vehicles v ON v.id = rent.vehicle_id
    WHERE rent.organization_id = p_organization_id
      AND rent.deleted_at IS NULL
      AND rent.status = 'ACTIVE'
      AND (rent.end_date + rent.end_time) < (now() AT TIME ZONE 'Europe/Istanbul')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.organization_id = p_organization_id
          AND n.type = 'OVERDUE_RENTAL'
          AND n.related_entity_id = rent.id
          AND n.created_at::date = today_d
      )
  LOOP
    INSERT INTO public.notifications (
      organization_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      p_organization_id, 'OVERDUE_RENTAL',
      'Geciken teslim',
      rec.brand || ' ' || rec.model || ' (' || rec.plate || ') teslimi gecikti',
      'rental', rec.id
    );
    v_count := v_count + 1;
  END LOOP;

  FOR rec IN
    SELECT m.id AS id, v.plate, v.brand, v.model, m.scheduled_date
    FROM public.maintenance_records m
    JOIN public.vehicles v ON v.id = m.vehicle_id
    WHERE m.organization_id = p_organization_id
      AND m.deleted_at IS NULL
      AND m.status = 'SCHEDULED'
      AND m.scheduled_date BETWEEN today_d AND today_d + 7
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.organization_id = p_organization_id
          AND n.type = 'MAINTENANCE_DUE'
          AND n.related_entity_id = m.id
          AND n.created_at::date = today_d
      )
  LOOP
    INSERT INTO public.notifications (
      organization_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      p_organization_id, 'MAINTENANCE_DUE',
      'Bakım yaklaştı',
      rec.brand || ' ' || rec.model || ' (' || rec.plate || ') bakımı ' || rec.scheduled_date::text,
      'maintenance', rec.id
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Restrict: revoke from authenticated/anon; grant only service_role when available
REVOKE ALL ON FUNCTION public.refresh_operational_notifications_for_org(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_operational_notifications_for_org(UUID) FROM anon, authenticated;
DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.refresh_operational_notifications_for_org(UUID) TO service_role;
EXCEPTION WHEN undefined_object THEN
  NULL; -- local test stubs may lack service_role grants path
END $$;
