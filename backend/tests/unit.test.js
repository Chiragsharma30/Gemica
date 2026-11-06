const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { computeTotals } = require('../src/services/pricing');
const { canTransition, TRANSITIONS } = require('../src/services/orderStatus');
const { hmac } = require('../src/services/paymentService');
const slugify = require('../src/utils/slugify');

describe('pricing.computeTotals', () => {
  const opts = { shippingFlatFee: 99, freeShippingThreshold: 1999 };
  test('adds flat shipping below threshold', () => {
    const t = computeTotals([{ unitPrice: 500, quantity: 2 }], opts);
    assert.equal(t.subtotal, 1000);
    assert.equal(t.shippingFee, 99);
    assert.equal(t.totalAmount, 1099);
  });
  test('free shipping at or above threshold', () => {
    assert.equal(computeTotals([{ unitPrice: 1999, quantity: 1 }], opts).shippingFee, 0);
  });
  test('rounds to 2 decimals', () => {
    assert.equal(computeTotals([{ unitPrice: 0.1, quantity: 3 }], opts).subtotal, 0.3);
  });
  test('empty cart totals zero', () => {
    assert.equal(computeTotals([], opts).totalAmount, 0);
  });
});

describe('orderStatus transitions', () => {
  test('allows the happy path', () => {
    const path = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];
    for (let i = 0; i < path.length - 1; i += 1) assert.equal(canTransition(path[i], path[i + 1]), true);
  });
  test('rejects skipping and reversing', () => {
    assert.equal(canTransition('placed', 'shipped'), false);
    assert.equal(canTransition('delivered', 'processing'), false);
    assert.equal(canTransition('cancelled', 'placed'), false);
  });
  test('terminal states have no exits', () => {
    assert.deepEqual(TRANSITIONS.delivered, []);
    assert.deepEqual(TRANSITIONS.cancelled, []);
  });
  test('cannot cancel after shipping', () => assert.equal(canTransition('shipped', 'cancelled'), false));
});

describe('utils', () => {
  test('slugify', () => assert.equal(slugify('  Aurelia Solitaire Ring! '), 'aurelia-solitaire-ring'));
  test('hmac is deterministic', () => assert.equal(hmac('a|b', 's'), hmac('a|b', 's')));
});
