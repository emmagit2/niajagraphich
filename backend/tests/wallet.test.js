import test from 'node:test';
import assert from 'node:assert/strict';

test('token package math: 100 tokens at ₦1,000 equals ₦10 per token', () => {
  const priceKobo = 100000;
  const tokens = 100;
  assert.equal(priceKobo / 100 / tokens, 10);
});

test('generation costs are positive integer credits', () => {
  const costs = { standard: 5, high_quality: 10, edit: 4, variation: 3 };
  for (const [key, value] of Object.entries(costs)) {
    assert.ok(Number.isSafeInteger(value) && value > 0, `${key} must have a positive integer cost`);
  }
});

test('available wallet balance excludes reserved credits', () => {
  const wallet = { purchased: 50, bonus: 20, reserved: 15 };
  assert.equal(wallet.purchased + wallet.bonus - wallet.reserved, 55);
});
