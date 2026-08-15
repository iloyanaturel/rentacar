/**
 * RentaFlow database types — kept in sync with supabase/migrations.
 * Prefer regenerating via `supabase gen types typescript` once a remote/local
 * project is linked; this file is the STEP 2 hand-maintained source of truth.
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer';

export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export type VehicleStatus =
  | 'AVAILABLE'
  | 'RENTED'
  | 'MAINTENANCE'
  | 'INACTIVE';

export type RentalStatus =
  | 'RESERVED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OVERDUE';

export type PaymentMethod =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER'
  | 'OTHER';

/** Computed — not a DB enum column */
export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';

export type ExpenseCategory =
  | 'MAINTENANCE'
  | 'FUEL'
  | 'INSURANCE'
  | 'CASCO'
  | 'TAX'
  | 'TIRES'
  | 'REPAIR'
  | 'CLEANING'
  | 'TOLL'
  | 'PARKING'
  | 'OTHER';

export type MaintenanceType =
  | 'PERIODIC'
  | 'OIL_CHANGE'
  | 'TIRES'
  | 'BRAKES'
  | 'BATTERY'
  | 'INSPECTION'
  | 'OTHER';

export type MaintenanceStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type RentalPhotoType = 'PICKUP' | 'RETURN' | 'DAMAGE' | 'OTHER';
export type FuelLevel =
  | 'EMPTY'
  | 'QUARTER'
  | 'HALF'
  | 'THREE_QUARTERS'
  | 'FULL';
export type DepositStatus =
  | 'PENDING'
  | 'HELD'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FORFEITED';
export type DamageSeverity = 'MINOR' | 'MODERATE' | 'MAJOR';
export type DamageTiming = 'EXISTING' | 'NEW';
export type RentalPhotoCategory =
  | 'FRONT'
  | 'BACK'
  | 'LEFT'
  | 'RIGHT'
  | 'INTERIOR'
  | 'ODOMETER'
  | 'FUEL'
  | 'DAMAGE'
  | 'OTHER';
export type ExtraChargeType =
  | 'FUEL_DIFF'
  | 'LATE_RETURN'
  | 'DAMAGE'
  | 'CLEANING'
  | 'EXTRA_USAGE'
  | 'OTHER';

export type FuelType =
  | 'GASOLINE'
  | 'DIESEL'
  | 'HYBRID'
  | 'ELECTRIC'
  | 'LPG'
  | 'OTHER';

export type TransmissionType = 'MANUAL' | 'AUTOMATIC' | 'SEMI_AUTOMATIC' | 'OTHER';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          website: string | null;
          tax_office: string | null;
          tax_number: string | null;
          currency: string;
          timezone: string;
          locale: string;
          date_format: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          website?: string | null;
          tax_office?: string | null;
          tax_number?: string | null;
          currency?: string;
          timezone?: string;
          locale?: string;
          date_format?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          status: UserStatus;
          avatar_url: string | null;
          invited_at: string | null;
          invited_by: string | null;
          suspended_at: string | null;
          last_sign_in_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          status?: UserStatus;
          avatar_url?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
          suspended_at?: string | null;
          last_sign_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      organization_settings: {
        Row: {
          organization_id: string;
          currency: string;
          timezone: string;
          locale: string;
          date_format: string;
          tax_enabled: boolean;
          tax_rate: number;
          default_deposit_amount: number;
          default_daily_km_limit: number | null;
          extra_km_price: number;
          late_return_tolerance_minutes: number;
          late_return_fee: number;
          contract_title: string;
          contract_footer: string | null;
          contract_body: string | null;
          onboarding_business_done: boolean;
          onboarding_vehicle_done: boolean;
          onboarding_user_done: boolean;
          onboarding_rental_done: boolean;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          currency?: string;
          timezone?: string;
          locale?: string;
          date_format?: string;
          tax_enabled?: boolean;
          tax_rate?: number;
          default_deposit_amount?: number;
          default_daily_km_limit?: number | null;
          extra_km_price?: number;
          late_return_tolerance_minutes?: number;
          late_return_fee?: number;
          contract_title?: string;
          contract_footer?: string | null;
          contract_body?: string | null;
          onboarding_business_done?: boolean;
          onboarding_vehicle_done?: boolean;
          onboarding_user_done?: boolean;
          onboarding_rental_done?: boolean;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organization_settings']['Insert']>;
      };
      organization_invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          token: string;
          invited_by: string | null;
          accepted_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          token?: string;
          invited_by?: string | null;
          accepted_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organization_invitations']['Insert']>;
      };

      vehicles: {
        Row: {
          id: string;
          organization_id: string;
          plate: string;
          brand: string;
          model: string;
          model_year: number | null;
          color: string | null;
          fuel_type: FuelType | null;
          transmission: TransmissionType | null;
          current_km: number;
          daily_price: number;
          deposit_amount: number;
          status: VehicleStatus;
          insurance_expiry: string | null;
          casco_expiry: string | null;
          inspection_expiry: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          plate: string;
          brand: string;
          model: string;
          model_year?: number | null;
          color?: string | null;
          fuel_type?: FuelType | null;
          transmission?: TransmissionType | null;
          current_km?: number;
          daily_price?: number;
          deposit_amount?: number;
          status?: VehicleStatus;
          insurance_expiry?: string | null;
          casco_expiry?: string | null;
          inspection_expiry?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>;
      };
      vehicle_photos: {
        Row: {
          id: string;
          organization_id: string;
          vehicle_id: string;
          storage_path: string;
          public_url: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          vehicle_id: string;
          storage_path: string;
          public_url?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['vehicle_photos']['Insert']>;
      };
      vehicle_documents: {
        Row: {
          id: string;
          organization_id: string;
          vehicle_id: string;
          document_type: string;
          storage_path: string;
          expiry_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          vehicle_id: string;
          document_type: string;
          storage_path: string;
          expiry_date?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['vehicle_documents']['Insert']
        >;
      };
      vehicle_mileage_logs: {
        Row: {
          id: string;
          organization_id: string;
          vehicle_id: string;
          rental_id: string | null;
          kilometers: number;
          note: string | null;
          recorded_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          vehicle_id: string;
          rental_id?: string | null;
          kilometers: number;
          note?: string | null;
          recorded_at?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['vehicle_mileage_logs']['Insert']
        >;
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          email: string | null;
          national_id: string | null;
          license_number: string | null;
          license_expiry: string | null;
          birth_date: string | null;
          address: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          email?: string | null;
          national_id?: string | null;
          license_number?: string | null;
          license_expiry?: string | null;
          birth_date?: string | null;
          address?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      rentals: {
        Row: {
          id: string;
          organization_id: string;
          vehicle_id: string;
          customer_id: string;
          start_date: string;
          start_time: string;
          end_date: string;
          end_time: string;
          start_km: number | null;
          end_km: number | null;
          daily_price: number;
          total_days: number;
          subtotal: number;
          discount_amount: number;
          extra_charge: number;
          deposit_amount: number;
          total_amount: number;
          paid_amount: number;
          remaining_amount: number;
          status: RentalStatus;
          fuel_start: string | null;
          fuel_end: string | null;
          late_fee: number;
          return_notes: string | null;
          notes: string | null;
          contract_number: string | null;
          km_limit: number | null;
          extra_km_price: number | null;
          late_return_tolerance_minutes: number | null;
          late_return_fee_snapshot: number | null;
          tax_rate: number | null;
          currency: string | null;
          contract_title_snapshot: string | null;
          contract_body_snapshot: string | null;
          customer_first_name: string | null;
          customer_last_name: string | null;
          customer_phone: string | null;
          customer_address: string | null;
          vehicle_plate: string | null;
          vehicle_brand: string | null;
          vehicle_model: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          vehicle_id: string;
          customer_id: string;
          start_date: string;
          start_time?: string;
          end_date: string;
          end_time?: string;
          start_km?: number | null;
          end_km?: number | null;
          daily_price: number;
          total_days: number;
          subtotal?: number;
          discount_amount?: number;
          extra_charge?: number;
          deposit_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          remaining_amount?: number;
          status?: RentalStatus;
          fuel_start?: string | null;
          fuel_end?: string | null;
          late_fee?: number;
          return_notes?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['rentals']['Insert']>;
      };
      rental_photos: {
        Row: {
          id: string;
          organization_id: string;
          rental_id: string;
          type: RentalPhotoType;
          category: RentalPhotoCategory | null;
          handover_id: string | null;
          return_id: string | null;
          storage_path: string;
          public_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          rental_id: string;
          type?: RentalPhotoType;
          category?: RentalPhotoCategory | null;
          handover_id?: string | null;
          return_id?: string | null;
          storage_path: string;
          public_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['rental_photos']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          organization_id: string;
          rental_id: string;
          customer_id: string;
          amount: number;
          payment_method: PaymentMethod;
          payment_date: string;
          description: string | null;
          reference_number: string | null;
          note: string | null;
          idempotency_key: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          voided_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          rental_id: string;
          customer_id: string;
          amount: number;
          payment_method?: PaymentMethod;
          payment_date?: string;
          description?: string | null;
          reference_number?: string | null;
          note?: string | null;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          voided_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      rental_deposits: {
        Row: {
          id: string;
          organization_id: string;
          rental_id: string;
          amount: number;
          status: DepositStatus;
          deducted_amount: number;
          refunded_amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          rental_id: string;
          amount: number;
          status?: DepositStatus;
          deducted_amount?: number;
          refunded_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['rental_deposits']['Insert']>;
      };
      rental_handovers: {
        Row: {
          id: string;
          organization_id: string;
          rental_id: string;
          odometer_km: number;
          fuel_level: FuelLevel;
          fuel_percent: number | null;
          checklist_confirmed: boolean;
          customer_ack_name: string | null;
          notes: string | null;
          idempotency_key: string | null;
          created_by: string | null;
          created_at: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          rental_id: string;
          odometer_km: number;
          fuel_level: FuelLevel;
          fuel_percent?: number | null;
          checklist_confirmed?: boolean;
          customer_ack_name?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          completed_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['rental_handovers']['Insert']
        >;
      };
      rental_returns: {
        Row: {
          id: string;
          organization_id: string;
          rental_id: string;
          odometer_km: number;
          fuel_level: FuelLevel;
          fuel_percent: number | null;
          actual_end_at: string;
          late_minutes: number;
          send_to_maintenance: boolean;
          deposit_action: string | null;
          deposit_deduction: number;
          deposit_refund: number;
          checklist_confirmed: boolean;
          notes: string | null;
          idempotency_key: string | null;
          created_by: string | null;
          created_at: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          rental_id: string;
          odometer_km: number;
          fuel_level: FuelLevel;
          fuel_percent?: number | null;
          actual_end_at?: string;
          late_minutes?: number;
          send_to_maintenance?: boolean;
          deposit_action?: string | null;
          deposit_deduction?: number;
          deposit_refund?: number;
          checklist_confirmed?: boolean;
          notes?: string | null;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          completed_at?: string;
        };
        Update: Partial<Database['public']['Tables']['rental_returns']['Insert']>;
      };
      rental_damages: {
        Row: {
          id: string;
          organization_id: string;
          rental_id: string;
          handover_id: string | null;
          return_id: string | null;
          timing: DamageTiming;
          severity: DamageSeverity;
          location_key: string;
          location_label: string | null;
          description: string | null;
          estimated_amount: number;
          photo_storage_path: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          rental_id: string;
          handover_id?: string | null;
          return_id?: string | null;
          timing?: DamageTiming;
          severity?: DamageSeverity;
          location_key?: string;
          location_label?: string | null;
          description?: string | null;
          estimated_amount?: number;
          photo_storage_path?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['rental_damages']['Insert']>;
      };
      rental_extra_charges: {
        Row: {
          id: string;
          organization_id: string;
          rental_id: string;
          return_id: string | null;
          charge_type: ExtraChargeType;
          description: string | null;
          amount: number;
          created_by: string | null;
          created_at: string;
          voided_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          rental_id: string;
          return_id?: string | null;
          charge_type?: ExtraChargeType;
          description?: string | null;
          amount: number;
          created_by?: string | null;
          created_at?: string;
          voided_at?: string | null;
        };
        Update: Partial<
          Database['public']['Tables']['rental_extra_charges']['Insert']
        >;
      };
      expenses: {
        Row: {
          id: string;
          organization_id: string;
          vehicle_id: string | null;
          category: ExpenseCategory;
          amount: number;
          expense_date: string;
          description: string | null;
          receipt_url: string | null;
          vendor: string | null;
          notes: string | null;
          maintenance_id: string | null;
          deleted_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          vehicle_id?: string | null;
          category?: ExpenseCategory;
          amount: number;
          expense_date?: string;
          description?: string | null;
          receipt_url?: string | null;
          vendor?: string | null;
          notes?: string | null;
          maintenance_id?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
      };
      maintenance_records: {
        Row: {
          id: string;
          organization_id: string;
          vehicle_id: string;
          maintenance_type: MaintenanceType;
          title: string | null;
          maintenance_date: string;
          scheduled_date: string | null;
          completed_date: string | null;
          current_km: number | null;
          service_name: string | null;
          amount: number;
          status: MaintenanceStatus;
          notes: string | null;
          next_maintenance_date: string | null;
          next_maintenance_km: number | null;
          description: string | null;
          deleted_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          vehicle_id: string;
          maintenance_type?: MaintenanceType;
          title?: string | null;
          maintenance_date?: string;
          scheduled_date?: string | null;
          completed_date?: string | null;
          current_km?: number | null;
          service_name?: string | null;
          amount?: number;
          status?: MaintenanceStatus;
          notes?: string | null;
          next_maintenance_date?: string | null;
          next_maintenance_km?: number | null;
          description?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['maintenance_records']['Insert']
        >;
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          type: string;
          title: string;
          message: string;
          is_read: boolean;
          related_entity_type: string | null;
          related_entity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          type: string;
          title: string;
          message: string;
          is_read?: boolean;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
    Views: {
      vehicle_revenue_summary: {
        Row: {
          organization_id: string;
          vehicle_id: string;
          plate: string;
          brand: string;
          model: string;
          rental_count: number;
          rental_days: number;
          total_rental_amount: number;
          total_collected_amount: number;
          total_outstanding_amount: number;
        };
      };
      vehicle_expense_summary: {
        Row: {
          organization_id: string;
          vehicle_id: string;
          plate: string;
          total_expense_amount: number;
          expense_count: number;
        };
      };
      vehicle_profit_summary: {
        Row: {
          organization_id: string;
          vehicle_id: string;
          plate: string;
          brand: string;
          model: string;
          rental_count: number;
          rental_days: number;
          total_rental_amount: number;
          total_collected_amount: number;
          total_expense_amount: number;
          gross_contribution: number;
        };
      };
      monthly_revenue_summary: {
        Row: {
          organization_id: string;
          month_start: string;
          rental_count: number;
          booked_amount: number;
          collected_amount: number;
          outstanding_amount: number;
        };
      };
      customer_rental_summary: {
        Row: {
          organization_id: string;
          customer_id: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          rental_count: number;
          total_spend: number;
          total_paid: number;
          open_balance: number;
          last_rental_date: string | null;
        };
      };
      vehicle_utilization_summary: {
        Row: {
          organization_id: string;
          vehicle_id: string;
          plate: string;
          status: VehicleStatus;
          rented_days_lifetime: number;
          completed_like_rentals: number;
        };
      };
    };
    Functions: {
      create_rental: {
        Args: {
          p_vehicle_id: string;
          p_customer_id: string;
          p_start_date: string;
          p_start_time: string;
          p_end_date: string;
          p_end_time: string;
          p_daily_price?: number;
          p_discount_amount?: number;
          p_extra_charge?: number;
          p_deposit_amount?: number;
          p_status?: RentalStatus;
          p_notes?: string;
          p_start_km?: number;
          p_fuel_start?: string;
        };
        Returns: Database['public']['Tables']['rentals']['Row'];
      };
      complete_rental: {
        Args: {
          p_rental_id: string;
          p_end_date?: string;
          p_end_time?: string;
          p_end_km?: number;
          p_fuel_end?: string;
          p_extra_charge?: number;
          p_late_fee?: number;
          p_return_notes?: string;
        };
        Returns: Database['public']['Tables']['rentals']['Row'];
      };
      record_payment: {
        Args: {
          p_rental_id: string;
          p_amount: number;
          p_payment_method?: PaymentMethod;
          p_payment_date?: string;
          p_description?: string;
          p_reference_number?: string;
          p_note?: string;
          p_idempotency_key?: string;
        };
        Returns: Database['public']['Tables']['payments']['Row'];
      };
      reverse_payment: {
        Args: { p_payment_id: string; p_reason?: string };
        Returns: Database['public']['Tables']['payments']['Row'];
      };
      complete_handover: {
        Args: {
          p_rental_id: string;
          p_odometer_km: number;
          p_fuel_level: FuelLevel;
          p_checklist_confirmed?: boolean;
          p_customer_ack_name?: string;
          p_notes?: string;
          p_damages?: Json;
          p_photo_ids?: string[] | null;
          p_idempotency_key?: string;
        };
        Returns: Database['public']['Tables']['rental_handovers']['Row'];
      };
      complete_return: {
        Args: {
          p_rental_id: string;
          p_odometer_km: number;
          p_fuel_level: FuelLevel;
          p_actual_end_at?: string;
          p_send_to_maintenance?: boolean;
          p_deposit_action?: string;
          p_deposit_deduction?: number;
          p_checklist_confirmed?: boolean;
          p_notes?: string;
          p_extra_charges?: Json;
          p_damages?: Json;
          p_photo_ids?: string[] | null;
          p_payment_amount?: number | null;
          p_payment_method?: PaymentMethod;
          p_idempotency_key?: string;
        };
        Returns: Database['public']['Tables']['rental_returns']['Row'];
      };
      get_today_handovers: {
        Args: Record<string, never>;
        Returns: {
          rental_id: string;
          vehicle_id: string;
          plate: string;
          brand: string;
          model: string;
          customer_name: string;
          start_date: string;
          start_time: string;
          status: RentalStatus;
        }[];
      };
      get_outstanding_payments: {
        Args: Record<string, never>;
        Returns: {
          rental_id: string;
          plate: string;
          customer_name: string;
          total_amount: number;
          paid_amount: number;
          remaining_amount: number;
          status: RentalStatus;
        }[];
      };
      get_overdue_rentals: {
        Args: Record<string, never>;
        Returns: {
          rental_id: string;
          plate: string;
          customer_name: string;
          end_date: string;
          end_time: string;
          remaining_amount: number;
        }[];
      };
      cancel_rental: {
        Args: {
          p_rental_id: string;
          p_reason?: string;
        };
        Returns: Database['public']['Tables']['rentals']['Row'];
      };
      compute_payment_status: {
        Args: {
          p_total: number;
          p_paid: number;
        };
        Returns: PaymentStatus;
      };
      get_vehicle_utilization: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          vehicle_id: string;
          plate: string;
          brand: string;
          model: string;
          period_days: number;
          rented_days: number;
          utilization_rate: number;
        }[];
      };
      get_user_organization_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      get_dashboard_summary: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_today_returns: {
        Args: Record<string, never>;
        Returns: {
          rental_id: string;
          vehicle_id: string;
          plate: string;
          brand: string;
          model: string;
          customer_id: string;
          customer_name: string;
          end_date: string;
          end_time: string;
          total_amount: number;
          paid_amount: number;
          remaining_amount: number;
          status: RentalStatus;
          payment_status: PaymentStatus;
        }[];
      };
      get_upcoming_rentals: {
        Args: {
          p_days?: number;
        };
        Returns: {
          rental_id: string;
          vehicle_id: string;
          plate: string;
          brand: string;
          model: string;
          customer_id: string;
          customer_name: string;
          start_date: string;
          start_time: string;
          end_date: string;
          total_amount: number;
          status: RentalStatus;
        }[];
      };
      get_vehicle_stats: {
        Args: { p_vehicle_id: string };
        Returns: Json;
      };
      update_vehicle_status: {
        Args: {
          p_vehicle_id: string;
          p_status: VehicleStatus;
        };
        Returns: Database['public']['Tables']['vehicles']['Row'];
      };
      update_vehicle_mileage: {
        Args: {
          p_vehicle_id: string;
          p_kilometers: number;
          p_note?: string;
        };
        Returns: Database['public']['Tables']['vehicles']['Row'];
      };
      archive_vehicle: {
        Args: { p_vehicle_id: string };
        Returns: Database['public']['Tables']['vehicles']['Row'];
      };
      check_vehicle_availability: {
        Args: {
          p_vehicle_id: string;
          p_start_date: string;
          p_start_time: string;
          p_end_date: string;
          p_end_time: string;
          p_exclude_rental_id?: string | null;
        };
        Returns: boolean;
      };
      start_rental: {
        Args: { p_rental_id: string };
        Returns: Database['public']['Tables']['rentals']['Row'];
      };
      archive_customer: {
        Args: { p_customer_id: string };
        Returns: Database['public']['Tables']['customers']['Row'];
      };
      get_customer_stats: {
        Args: { p_customer_id: string };
        Returns: Json;
      };
      update_reserved_rental: {
        Args: {
          p_rental_id: string;
          p_start_date: string;
          p_start_time: string;
          p_end_date: string;
          p_end_time: string;
          p_daily_price: number;
          p_discount_amount?: number;
          p_extra_charge?: number;
          p_deposit_amount?: number;
          p_notes?: string | null;
        };
        Returns: Database['public']['Tables']['rentals']['Row'];
      };

      ensure_organization_settings: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['organization_settings']['Row'];
      };
      update_organization_settings: {
        Args: { p_patch: Json };
        Returns: Database['public']['Tables']['organization_settings']['Row'];
      };
      update_business_profile: {
        Args: { p_patch: Json };
        Returns: Database['public']['Tables']['organizations']['Row'];
      };
      list_organization_users: {
        Args: Record<string, never>;
        Returns: Json;
      };
      invite_organization_user: {
        Args: {
          p_email: string;
          p_full_name: string;
          p_role?: UserRole;
        };
        Returns: Database['public']['Tables']['organization_invitations']['Row'];
      };
      set_user_status: {
        Args: { p_user_id: string; p_status: UserStatus };
        Returns: Database['public']['Tables']['profiles']['Row'];
      };
      set_user_role: {
        Args: { p_user_id: string; p_role: UserRole };
        Returns: Database['public']['Tables']['profiles']['Row'];
      };
      get_user_permissions: {
        Args: Record<string, never>;
        Returns: string[];
      };
      get_onboarding_status: {
        Args: Record<string, never>;
        Returns: Json;
      };
      touch_last_sign_in: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      calculate_extra_km_charge: {
        Args: { p_rental_id: string; p_end_odometer: number };
        Returns: Json;
      };
      can_view_reports: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_manage_users: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_manage_settings: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_user_active: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      update_own_profile: {
        Args: { p_patch: Json };
        Returns: Database['public']['Tables']['profiles']['Row'];
      };
      record_auth_event: {
        Args: { p_action: string };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      vehicle_status: VehicleStatus;
      rental_status: RentalStatus;
      payment_method: PaymentMethod;
      expense_category: ExpenseCategory;
      maintenance_type: MaintenanceType;
      rental_photo_type: RentalPhotoType;
      fuel_type: FuelType;
      transmission_type: TransmissionType;
      deposit_status: DepositStatus;
      fuel_level: FuelLevel;
      damage_severity: DamageSeverity;
      damage_timing: DamageTiming;
      rental_photo_category: RentalPhotoCategory;
      extra_charge_type: ExtraChargeType;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Organization = Tables<'organizations'>;
export type Profile = Tables<'profiles'>;
export type Vehicle = Tables<'vehicles'>;
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];
export type VehiclePhoto = Tables<'vehicle_photos'>;
export type VehicleDocument = Tables<'vehicle_documents'>;
export type VehicleMileageLog = Tables<'vehicle_mileage_logs'>;
export type Customer = Tables<'customers'>;
export type Rental = Tables<'rentals'>;
export type RentalPhoto = Tables<'rental_photos'>;
export type Payment = Tables<'payments'>;
export type RentalDeposit = Tables<'rental_deposits'>;
export type RentalHandover = Tables<'rental_handovers'>;
export type RentalReturn = Tables<'rental_returns'>;
export type RentalDamage = Tables<'rental_damages'>;
export type RentalExtraCharge = Tables<'rental_extra_charges'>;
export type Expense = Tables<'expenses'>;
export type MaintenanceRecord = Tables<'maintenance_records'>;
export type Notification = Tables<'notifications'>;
export type AuditLog = Tables<'audit_logs'>;
