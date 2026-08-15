export type {
  Database,
  Tables,
  Organization,
  Profile,
  Vehicle,
  VehicleInsert,
  VehicleUpdate,
  VehiclePhoto,
  VehicleDocument,
  VehicleMileageLog,
  Customer,
  Rental,
  RentalPhoto,
  Payment,
  Expense,
  MaintenanceRecord,
  Notification,
  AuditLog,
  UserRole,
  VehicleStatus,
  RentalStatus,
  PaymentMethod,
  PaymentStatus,
  ExpenseCategory,
  MaintenanceType,
  RentalPhotoType,
  FuelType,
  TransmissionType,
  Json,
} from './database.types';

/** Computed payment status — mirrors public.compute_payment_status */
export function computePaymentStatus(
  totalAmount: number,
  paidAmount: number,
): 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' {
  if (paidAmount <= 0) return 'UNPAID';
  if (paidAmount >= totalAmount) return 'PAID';
  return 'PARTIALLY_PAID';
}
