-- RentaFlow STEP 2: performance indexes

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
  ON public.profiles (organization_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);

CREATE INDEX IF NOT EXISTS idx_vehicles_organization_id
  ON public.vehicles (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_status
  ON public.vehicles (organization_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_plate_trgm_support
  ON public.vehicles (organization_id, plate)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_brand_model
  ON public.vehicles (organization_id, lower(brand), lower(model))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle_id
  ON public.vehicle_photos (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_organization_id
  ON public.vehicle_photos (organization_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id
  ON public.vehicle_documents (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_customers_organization_id
  ON public.customers (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON public.customers (organization_id, phone)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_name
  ON public.customers (organization_id, lower(first_name), lower(last_name))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_organization_id
  ON public.rentals (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_vehicle_id
  ON public.rentals (vehicle_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_customer_id
  ON public.rentals (customer_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_dates
  ON public.rentals (organization_id, start_date, end_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_status
  ON public.rentals (organization_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_period_gist
  ON public.rentals USING gist (rental_period)
  WHERE deleted_at IS NULL
    AND status IN ('RESERVED', 'ACTIVE', 'OVERDUE');

CREATE INDEX IF NOT EXISTS idx_rental_photos_rental_id
  ON public.rental_photos (rental_id);

CREATE INDEX IF NOT EXISTS idx_payments_organization_id
  ON public.payments (organization_id);

CREATE INDEX IF NOT EXISTS idx_payments_rental_id
  ON public.payments (rental_id)
  WHERE voided_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_customer_id
  ON public.payments (customer_id);

CREATE INDEX IF NOT EXISTS idx_payments_payment_date
  ON public.payments (organization_id, payment_date);

CREATE INDEX IF NOT EXISTS idx_expenses_organization_id
  ON public.expenses (organization_id);

CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id
  ON public.expenses (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date
  ON public.expenses (organization_id, expense_date);

CREATE INDEX IF NOT EXISTS idx_maintenance_organization_id
  ON public.maintenance_records (organization_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id
  ON public.maintenance_records (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id
  ON public.notifications (organization_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id
  ON public.audit_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id);
