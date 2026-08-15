-- RentaFlow STEP 2: core tables + constraints

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  currency TEXT NOT NULL DEFAULT 'TRY',
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  full_name TEXT,
  phone TEXT,
  role public.user_role NOT NULL DEFAULT 'staff',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  plate TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  model_year INTEGER,
  color TEXT,
  fuel_type public.fuel_type,
  transmission public.transmission_type,
  current_km INTEGER NOT NULL DEFAULT 0 CHECK (current_km >= 0),
  daily_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (daily_price >= 0),
  deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  status public.vehicle_status NOT NULL DEFAULT 'AVAILABLE',
  insurance_expiry DATE,
  casco_expiry DATE,
  inspection_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT vehicles_plate_not_blank CHECK (length(trim(plate)) > 0)
);

-- Active (non-soft-deleted) plates unique per organization
CREATE UNIQUE INDEX vehicles_org_plate_active_uidx
  ON public.vehicles (organization_id, lower(trim(plate)))
  WHERE deleted_at IS NULL;

CREATE TRIGGER vehicles_set_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vehicle_photos
-- ---------------------------------------------------------------------------
CREATE TABLE public.vehicle_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- vehicle_documents
-- ---------------------------------------------------------------------------
CREATE TABLE public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles (id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  national_id TEXT,
  license_number TEXT,
  license_expiry DATE,
  birth_date DATE,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- rentals
-- ---------------------------------------------------------------------------
CREATE TABLE public.rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles (id),
  customer_id UUID NOT NULL REFERENCES public.customers (id),

  start_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_date DATE NOT NULL,
  end_time TIME NOT NULL DEFAULT '09:00',

  start_km INTEGER CHECK (start_km IS NULL OR start_km >= 0),
  end_km INTEGER CHECK (end_km IS NULL OR end_km >= 0),

  daily_price NUMERIC(12, 2) NOT NULL CHECK (daily_price >= 0),
  total_days INTEGER NOT NULL CHECK (total_days > 0),

  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  extra_charge NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (extra_charge >= 0),
  -- Deposit is tracked separately and is NOT part of total_amount
  deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),

  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),

  status public.rental_status NOT NULL DEFAULT 'RESERVED',

  fuel_start TEXT,
  fuel_end TEXT,
  late_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (late_fee >= 0),
  return_notes TEXT,
  notes TEXT,

  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT rentals_end_after_start CHECK (
    (end_date + end_time) >= (start_date + start_time)
  ),
  CONSTRAINT rentals_end_km_gte_start CHECK (
    end_km IS NULL OR start_km IS NULL OR end_km >= start_km
  )
);

-- Period used for overlap exclusion (Europe/Istanbul wall-clock → timestamptz)
ALTER TABLE public.rentals
  ADD COLUMN rental_period tstzrange
  GENERATED ALWAYS AS (
    tstzrange(
      ((start_date + start_time) AT TIME ZONE 'Europe/Istanbul'),
      ((end_date + end_time) AT TIME ZONE 'Europe/Istanbul'),
      '[)'
    )
  ) STORED;

-- Prevent overlapping bookings for the same vehicle (CANCELLED / soft-deleted excluded)
ALTER TABLE public.rentals
  ADD CONSTRAINT rentals_vehicle_period_no_overlap
  EXCLUDE USING gist (
    vehicle_id WITH =,
    rental_period WITH &&
  )
  WHERE (
    status IN ('RESERVED', 'ACTIVE', 'OVERDUE')
    AND deleted_at IS NULL
  );

CREATE TRIGGER rentals_set_updated_at
  BEFORE UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- rental_photos
-- ---------------------------------------------------------------------------
CREATE TABLE public.rental_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  rental_id UUID NOT NULL REFERENCES public.rentals (id) ON DELETE CASCADE,
  type public.rental_photo_type NOT NULL DEFAULT 'OTHER',
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- payments (no hard delete cascade from rentals — protect financial history)
-- ---------------------------------------------------------------------------
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  rental_id UUID NOT NULL REFERENCES public.rentals (id),
  customer_id UUID NOT NULL REFERENCES public.customers (id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method public.payment_method NOT NULL DEFAULT 'CASH',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ
);

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  vehicle_id UUID REFERENCES public.vehicles (id),
  category public.expense_category NOT NULL DEFAULT 'OTHER',
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  description TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER expenses_set_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- maintenance_records
-- ---------------------------------------------------------------------------
CREATE TABLE public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles (id),
  maintenance_type public.maintenance_type NOT NULL DEFAULT 'OTHER',
  maintenance_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  current_km INTEGER CHECK (current_km IS NULL OR current_km >= 0),
  service_name TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  next_maintenance_date DATE,
  next_maintenance_km INTEGER CHECK (
    next_maintenance_km IS NULL OR next_maintenance_km >= 0
  ),
  description TEXT,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER maintenance_records_set_updated_at
  BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  user_id UUID REFERENCES auth.users (id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- audit_logs (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id),
  user_id UUID REFERENCES auth.users (id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
