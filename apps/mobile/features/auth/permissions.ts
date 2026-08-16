import type { UserRole } from '@rentaflow/shared';

export type Permission =
  | 'vehicles.view'
  | 'vehicles.create'
  | 'vehicles.update'
  | 'vehicles.delete'
  | 'customers.view'
  | 'customers.create'
  | 'customers.update'
  | 'rentals.view'
  | 'rentals.create'
  | 'rentals.update'
  | 'rentals.cancel'
  | 'rentals.complete'
  | 'payments.view'
  | 'payments.create'
  | 'payments.reverse'
  | 'expenses.view'
  | 'expenses.create'
  | 'expenses.update'
  | 'expenses.delete'
  | 'maintenance.view'
  | 'maintenance.create'
  | 'maintenance.update'
  | 'reports.view'
  | 'reports.export'
  | 'users.view'
  | 'users.invite'
  | 'users.suspend'
  | 'settings.view'
  | 'settings.update';

/** Client-side fallback when RPC not yet loaded — mirrors DB get_user_permissions */
export function permissionsForRole(role: UserRole | string | null | undefined): Permission[] {
  switch (role) {
    case 'owner':
    case 'admin':
      return [
        'vehicles.view',
        'vehicles.create',
        'vehicles.update',
        'vehicles.delete',
        'customers.view',
        'customers.create',
        'customers.update',
        'rentals.view',
        'rentals.create',
        'rentals.update',
        'rentals.cancel',
        'rentals.complete',
        'payments.view',
        'payments.create',
        'payments.reverse',
        'expenses.view',
        'expenses.create',
        'expenses.update',
        'expenses.delete',
        'maintenance.view',
        'maintenance.create',
        'maintenance.update',
        'reports.view',
        'reports.export',
        'users.view',
        'users.invite',
        'users.suspend',
        'settings.view',
        'settings.update',
      ];
    case 'manager':
      return [
        'vehicles.view',
        'vehicles.create',
        'vehicles.update',
        'customers.view',
        'customers.create',
        'customers.update',
        'rentals.view',
        'rentals.create',
        'rentals.update',
        'rentals.cancel',
        'rentals.complete',
        'payments.view',
        'payments.create',
        'expenses.view',
        'expenses.create',
        'maintenance.view',
        'maintenance.create',
        'maintenance.update',
        'reports.view',
        'reports.export',
        'settings.view',
      ];
    case 'staff':
      return [
        'vehicles.view',
        'customers.view',
        'customers.create',
        'customers.update',
        'rentals.view',
        'rentals.create',
        'rentals.update',
        'rentals.complete',
        'payments.view',
        'payments.create',
        'maintenance.view',
        'settings.view',
      ];
    case 'viewer':
    default:
      return [
        'vehicles.view',
        'customers.view',
        'rentals.view',
        'payments.view',
        'expenses.view',
        'maintenance.view',
        'settings.view',
      ];
  }
}

export function hasPermission(
  perms: readonly string[] | null | undefined,
  permission: Permission,
): boolean {
  return Boolean(perms?.includes(permission));
}
