import assert from 'node:assert/strict';
import { formatCurrency } from '../utils/currency.ts';
import { loginSchema } from '../features/auth/schemas.ts';
import { computePaymentStatus } from '../utils/labels.ts';
import { getErrorMessage } from '../utils/errors.ts';

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
  assert.equal(formatCurrency(0), '0,00 ₺');
  assert.equal(formatCurrency(10000.5), '10.000,50 ₺');
});

run('loginSchema required fields', () => {
  const empty = loginSchema.safeParse({ email: '', password: '' });
  assert.equal(empty.success, false);

  const badEmail = loginSchema.safeParse({
    email: 'not-an-email',
    password: 'x',
  });
  assert.equal(badEmail.success, false);

  const ok = loginSchema.safeParse({
    email: 'demo@rentaflow.local',
    password: 'secret',
  });
  assert.equal(ok.success, true);
});

run('computePaymentStatus', () => {
  assert.equal(computePaymentStatus(1000, 0), 'UNPAID');
  assert.equal(computePaymentStatus(1000, 400), 'PARTIALLY_PAID');
  assert.equal(computePaymentStatus(1000, 1000), 'PAID');
});

run('getErrorMessage hides technical errors', () => {
  const msg = getErrorMessage({
    message: 'PostgrestError: relation public.x does not exist',
  });
  assert.equal(msg.includes('Postgrest'), false);
  assert.match(msg, /sorun|İşlem/i);
});

console.log('ALL STEP 3 UNIT TESTS PASSED');
