/**
 * RentaFlow database types — kept in sync with supabase/migrations.
 * Prefer regenerating via `supabase gen types typescript` once a remote/local
 * project is linked; this file is the STEP 2 hand-maintained source of truth.
 */

export type UserRole = 'admin' | 'staff' | 'viewer';

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
  | 'OTHER';

export type MaintenanceType =
  | 'PERIODIC'
  | 'OIL_CHANGE'
  | 'TIRES'
  | 'BRAKES'
  | 'BATTERY'
  | 'INSPECTION'
  | 'OTHER';

export type RentalPhotoType = 'PICKUP' | 'RETURN' | 'DAMAGE' | 'OTHER';

export type FuelType =
  | 'GASOLINE'
  | 'DIESEL'
  | 'HYBRID'
  | 'ELECTRIC'
  | 'LPG'
  | 'OTHER';

export type TransmissionType = 'MANUAL' | 'AUTOMATIC' | 'OTHER';

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
          currency: string;
          timezone: string;
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
          currency?: string;
          timezone?: string;
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
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
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
          storage_path: string;
          public_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          rental_id: string;
          type?: RentalPhotoType;
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
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          voided_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
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
          maintenance_date: string;
          current_km: number | null;
          service_name: string | null;
          amount: number;
          next_maintenance_date: string | null;
          next_maintenance_km: number | null;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          vehicle_id: string;
          maintenance_type?: MaintenanceType;
          maintenance_date?: string;
          current_km?: number | null;
          service_name?: string | null;
          amount?: number;
          next_maintenance_date?: string | null;
          next_maintenance_km?: number | null;
          description?: string | null;
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
        };
        Returns: Database['public']['Tables']['payments']['Row'];
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
    };
    Enums: {
      user_role: UserRole;
      vehicle_status: VehicleStatus;
      rental_status: RentalStatus;
      payment_method: PaymentMethod;
      expense_category: ExpenseCategory;
      maintenance_type: MaintenanceType;
      rental_photo_type: RentalPhotoType;
      fuel_type: FuelType;
      transmission_type: TransmissionType;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Organization = Tables<'organizations'>;
export type Profile = Tables<'profiles'>;
export type Vehicle = Tables<'vehicles'>;
export type VehiclePhoto = Tables<'vehicle_photos'>;
export type VehicleDocument = Tables<'vehicle_documents'>;
export type Customer = Tables<'customers'>;
export type Rental = Tables<'rentals'>;
export type RentalPhoto = Tables<'rental_photos'>;
export type Payment = Tables<'payments'>;
export type Expense = Tables<'expenses'>;
export type MaintenanceRecord = Tables<'maintenance_records'>;
export type Notification = Tables<'notifications'>;
export type AuditLog = Tables<'audit_logs'>;
