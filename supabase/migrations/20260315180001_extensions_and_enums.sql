-- RentaFlow STEP 2: extensions + enums
-- Compatible with Supabase Postgres

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Roles (lowercase per product spec)
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'staff', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.vehicle_status AS ENUM (
    'AVAILABLE',
    'RENTED',
    'MAINTENANCE',
    'INACTIVE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.rental_status AS ENUM (
    'RESERVED',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'OVERDUE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'CASH',
    'CREDIT_CARD',
    'BANK_TRANSFER',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.expense_category AS ENUM (
    'MAINTENANCE',
    'FUEL',
    'INSURANCE',
    'CASCO',
    'TAX',
    'TIRES',
    'REPAIR',
    'CLEANING',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_type AS ENUM (
    'PERIODIC',
    'OIL_CHANGE',
    'TIRES',
    'BRAKES',
    'BATTERY',
    'INSPECTION',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.rental_photo_type AS ENUM (
    'PICKUP',
    'RETURN',
    'DAMAGE',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fuel_type AS ENUM (
    'GASOLINE',
    'DIESEL',
    'HYBRID',
    'ELECTRIC',
    'LPG',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.transmission_type AS ENUM (
    'MANUAL',
    'AUTOMATIC',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
