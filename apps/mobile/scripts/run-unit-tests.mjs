import assert from 'node:assert/strict';
import { formatCurrency } from '../utils/currency.ts';
import { loginSchema } from '../features/auth/schemas.ts';
import { computePaymentStatus } from '../utils/labels.ts';
import { getErrorMessage } from '../utils/errors.ts';
import { formatPlateDisplay, normalizePlateKey } from '../utils/plate.ts';
import { getExpiryStatus } from '../utils/expiry.ts';
import { vehicleFormSchema } from '../features/vehicles/schemas.ts';
import { calcRentalPricing } from '../utils/rentalPricing.ts';
import { customerFormSchema } from '../features/customers/schemas.ts';
import {
  calculateFuelDifference,
  calculateLateDuration,
} from '../utils/operations.ts';
import { findVehicleOverlaps, getRangeForView } from '../utils/calendar.ts';
import {
  expenseCategoryLabel,
  maintenanceStatusLabel,
  maintenanceTypeLabel,
} from '../utils/labels.ts';
import { getRangeForPreset } from '../utils/reportRange.ts';
import { permissionsForRole, hasPermission } from '../features/auth/permissions.ts';
import { calculateExtraKmCharge } from '../utils/extraKm.ts';
import { roleLabel, userStatusLabel } from '../utils/labels.ts';

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('formatCurrency TR', () => {
  assert.equal(formatCurrency(2500), '2.500,00 ₺');
});

run('loginSchema', () => {
  assert.equal(
    loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success,
    true,
  );
});

run('computePaymentStatus', () => {
  assert.equal(computePaymentStatus(1000, 400), 'PARTIALLY_PAID');
});

run('getErrorMessage hides technical errors', () => {
  const msg = getErrorMessage({
    message: 'PostgrestError: relation public.x does not exist',
  });
  assert.equal(msg.includes('Postgrest'), false);
});

run('plate normalize treats spacing/case as same key', () => {
  assert.equal(normalizePlateKey('34 ABC 123'), normalizePlateKey('34abc123'));
  assert.equal(formatPlateDisplay('34abc123'), '34 ABC 123');
});

run('vehicleFormSchema requires brand/model/plate/price', () => {
  const bad = vehicleFormSchema.safeParse({
    brand: '',
    model: '',
    plate: '',
    daily_price: '',
  });
  assert.equal(bad.success, false);

  const ok = vehicleFormSchema.safeParse({
    brand: 'Renault',
    model: 'Clio',
    plate: '34 ABC 01',
    daily_price: '1500',
  });
  assert.equal(ok.success, true);
});

run('getExpiryStatus expired/critical/warning', () => {
  const expired = getExpiryStatus('2020-01-01');
  assert.equal(expired.level, 'expired');
  assert.equal(expired.label, 'Geçmiş');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);
  const iso = tomorrow.toISOString().slice(0, 10);
  const critical = getExpiryStatus(iso);
  assert.equal(critical.level, 'critical');
});

run('calcRentalPricing 5 days × 1500 − 500 + deposit', () => {
  const pricing = calcRentalPricing({
    dailyPrice: 1500,
    startDate: '2026-08-15',
    startTime: '14:00',
    endDate: '2026-08-20',
    endTime: '14:00',
    discount: 500,
    extra: 0,
    deposit: 3000,
  });
  assert.equal(pricing.days, 5);
  assert.equal(pricing.subtotal, 7500);
  assert.equal(pricing.total, 7000);
  assert.equal(pricing.deposit, 3000);
  assert.equal(pricing.payable, 10000);
});

run('calcRentalPricing rejects discount > subtotal', () => {
  assert.throws(
    () =>
      calcRentalPricing({
        dailyPrice: 1000,
        startDate: '2026-08-15',
        startTime: '10:00',
        endDate: '2026-08-16',
        endTime: '10:00',
        discount: 5000,
        extra: 0,
        deposit: 0,
      }),
    /İndirim/,
  );
});

run('customerFormSchema phone/email/tc', () => {
  assert.equal(
    customerFormSchema.safeParse({
      first_name: 'Ahmet',
      last_name: 'Yılmaz',
      phone: '05321234567',
    }).success,
    true,
  );
  assert.equal(
    customerFormSchema.safeParse({
      first_name: 'A',
      last_name: 'B',
      phone: '123',
    }).success,
    false,
  );
  assert.equal(
    customerFormSchema.safeParse({
      first_name: 'A',
      last_name: 'B',
      phone: '05321234567',
      email: 'bad',
    }).success,
    false,
  );
  assert.equal(
    customerFormSchema.safeParse({
      first_name: 'A',
      last_name: 'B',
      phone: '05321234567',
      national_id: '123',
    }).success,
    false,
  );
});

run('calculateLateDuration and fuel difference', () => {
  const late = calculateLateDuration(
    new Date('2026-08-20T14:00:00'),
    new Date('2026-08-20T18:00:00'),
  );
  assert.equal(late.isLate, true);
  assert.equal(late.lateMinutes, 240);

  const fuel = calculateFuelDifference('FULL', 'HALF');
  assert.equal(fuel.dropped, true);
  assert.equal(fuel.deltaPercent, 50);
});

run('calendar getRangeForView week/month/day', () => {
  const anchor = new Date(2026, 7, 15); // 15 Aug 2026 Saturday
  const week = getRangeForView(anchor, 'week');
  assert.equal(week.from, '2026-08-10');
  assert.equal(week.to, '2026-08-16');
  const day = getRangeForView(anchor, 'day');
  assert.equal(day.from, '2026-08-15');
  assert.equal(day.to, '2026-08-15');
  const month = getRangeForView(anchor, 'month');
  assert.equal(month.from, '2026-08-01');
  assert.equal(month.to, '2026-08-31');
});

run('calendar findVehicleOverlaps', () => {
  const overlaps = findVehicleOverlaps([
    {
      rental_id: 'a',
      vehicle_id: 'v1',
      plate: '34',
      brand: 'A',
      model: 'B',
      customer_id: 'c',
      customer_name: 'X',
      start_date: '2026-08-10',
      start_time: '10:00',
      end_date: '2026-08-15',
      end_time: '10:00',
      status: 'ACTIVE',
      display_status: 'ACTIVE',
      total_amount: 1,
    },
    {
      rental_id: 'b',
      vehicle_id: 'v1',
      plate: '34',
      brand: 'A',
      model: 'B',
      customer_id: 'c',
      customer_name: 'Y',
      start_date: '2026-08-14',
      start_time: '10:00',
      end_date: '2026-08-20',
      end_time: '10:00',
      status: 'RESERVED',
      display_status: 'RESERVED',
      total_amount: 1,
    },
  ]);
  assert.equal(overlaps.has('a'), true);
  assert.equal(overlaps.has('b'), true);
});

run('maintenance and expense labels TR', () => {
  assert.equal(maintenanceTypeLabel('OIL_CHANGE'), 'Yağ değişimi');
  assert.equal(maintenanceStatusLabel('IN_PROGRESS'), 'Devam ediyor');
  assert.equal(expenseCategoryLabel('TOLL'), 'HGS/OGS');
});

run('reportRange this_month / today', () => {
  const month = getRangeForPreset('this_month');
  assert.equal(month.from.slice(8), '01');
  assert.ok(month.to >= month.from);
  const today = getRangeForPreset('today');
  assert.equal(today.from, today.to);
});

run('permissions owner has users.invite and reports.view', () => {
  const perms = permissionsForRole('owner');
  assert.equal(hasPermission(perms, 'users.invite'), true);
  assert.equal(hasPermission(perms, 'reports.view'), true);
});

run('permissions staff lacks reports and users', () => {
  const perms = permissionsForRole('staff');
  assert.equal(hasPermission(perms, 'reports.view'), false);
  assert.equal(hasPermission(perms, 'users.invite'), false);
  assert.equal(hasPermission(perms, 'rentals.create'), true);
});

run('calculateExtraKmCharge 250 km × 5', () => {
  assert.equal(
    calculateExtraKmCharge({
      kmLimit: 1500,
      startKm: 10000,
      endKm: 11750,
      extraKmPrice: 5,
    }),
    1250,
  );
  assert.equal(
    calculateExtraKmCharge({
      kmLimit: null,
      startKm: 0,
      endKm: 100,
      extraKmPrice: 5,
    }),
    0,
  );
});

run('role and status labels TR', () => {
  assert.equal(roleLabel('owner'), 'Sahip');
  assert.equal(userStatusLabel('SUSPENDED'), 'Pasif');
});

console.log('ALL STEP 9 UNIT TESTS PASSED');
