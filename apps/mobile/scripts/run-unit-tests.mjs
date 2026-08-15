import assert from 'node:assert/strict';
import { formatCurrency } from '../utils/currency.ts';
import { loginSchema } from '../features/auth/schemas.ts';
import { computePaymentStatus } from '../utils/labels.ts';
import { getErrorMessage } from '../utils/errors.ts';
import { formatPlateDisplay, normalizePlateKey } from '../utils/plate.ts';
import { getExpiryStatus } from '../utils/expiry.ts';
import { vehicleFormSchema } from '../features/vehicles/schemas.ts';

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

console.log('ALL STEP 4 UNIT TESTS PASSED');
