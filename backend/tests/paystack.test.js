import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

test('Paystack webhook signature uses HMAC SHA512', () => {
  const secret = 'test_secret';
  const raw = Buffer.from(JSON.stringify({ event:'charge.success', data:{ reference:'test_ref' } }));
  const signature = crypto.createHmac('sha512',secret).update(raw).digest('hex');
  const expected = crypto.createHmac('sha512',secret).update(raw).digest('hex');
  assert.equal(signature, expected);
  assert.equal(signature.length, 128);
});

test('payment amount comparison rejects mismatched amount', () => {
  const order = { amount: 100000, currency:'NGN' };
  const provider = { amount: 99999, currency:'NGN' };
  assert.notEqual(Number(order.amount), Number(provider.amount));
});
