-- RentaFlow STEP 2: Row Level Security

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners as well (Supabase best practice)
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_photos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rentals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rental_photos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id = public.get_user_organization_id()
    AND deleted_at IS NULL
  );

CREATE POLICY organizations_update_admin ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    id = public.get_user_organization_id()
    AND public.is_admin()
  )
  WITH CHECK (
    id = public.get_user_organization_id()
    AND public.is_admin()
  );

-- Inserts typically via service role / bootstrap; authenticated admins may not create orgs in MVP

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_same_org ON public.profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND organization_id = public.get_user_organization_id()
  );

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_admin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- Generic tenant read / write patterns
-- ---------------------------------------------------------------------------

-- vehicles
CREATE POLICY vehicles_select ON public.vehicles
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND deleted_at IS NULL
  );

CREATE POLICY vehicles_insert ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY vehicles_update ON public.vehicles
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY vehicles_delete_admin ON public.vehicles
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_admin()
  );

-- vehicle_photos
CREATE POLICY vehicle_photos_select ON public.vehicle_photos
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY vehicle_photos_insert ON public.vehicle_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY vehicle_photos_update ON public.vehicle_photos
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY vehicle_photos_delete ON public.vehicle_photos
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

-- vehicle_documents
CREATE POLICY vehicle_documents_select ON public.vehicle_documents
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY vehicle_documents_insert ON public.vehicle_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY vehicle_documents_update ON public.vehicle_documents
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY vehicle_documents_delete ON public.vehicle_documents
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

-- customers
CREATE POLICY customers_select ON public.customers
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND deleted_at IS NULL
  );

CREATE POLICY customers_insert ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY customers_update ON public.customers
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY customers_delete_admin ON public.customers
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_admin()
  );

-- rentals
CREATE POLICY rentals_select ON public.rentals
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND deleted_at IS NULL
  );

CREATE POLICY rentals_insert ON public.rentals
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY rentals_update ON public.rentals
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY rentals_delete_admin ON public.rentals
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_admin()
  );

-- rental_photos
CREATE POLICY rental_photos_select ON public.rental_photos
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY rental_photos_insert ON public.rental_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY rental_photos_update ON public.rental_photos
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY rental_photos_delete ON public.rental_photos
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

-- payments
CREATE POLICY payments_select ON public.payments
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY payments_insert ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY payments_update ON public.payments
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

-- Soft-void only; hard delete admin-only
CREATE POLICY payments_delete_admin ON public.payments
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_admin()
  );

-- expenses
CREATE POLICY expenses_select ON public.expenses
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY expenses_insert ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY expenses_update ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY expenses_delete_admin ON public.expenses
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_admin()
  );

-- maintenance_records
CREATE POLICY maintenance_select ON public.maintenance_records
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY maintenance_insert ON public.maintenance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY maintenance_update ON public.maintenance_records
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY maintenance_delete_admin ON public.maintenance_records
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_admin()
  );

-- notifications
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (user_id = auth.uid() OR user_id IS NULL OR public.is_admin())
  );

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (user_id = auth.uid() OR public.is_admin())
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
  );

CREATE POLICY notifications_insert_write ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

-- audit_logs: append-only for writers; readable by admin (staff read-only for transparency)
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (public.is_admin() OR public.can_write())
  );

CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_write()
  );

-- Grants for authenticated role (Supabase)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
