const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, startDb, stopDb, clearDb, makeUser, seedCatalog, address, request } = require('./helpers');
const payments = require('../src/services/paymentService');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');

let cat;
let created = 0;
before(async () => {
  await startDb();
  payments.setClient({ orders: { create: async () => ({ id: `order_fake_${++created}` }) } }); // no network
});
after(stopDb);
beforeEach(async () => { await clearDb(); cat = await seedCatalog(); });

async function onlineOrder(agent) {
  await agent.post('/api/cart/items').send({ productId: cat.ring.id, variantSku: 'R-6', quantity: 1 }).expect(200);
  return (await agent.post('/api/orders').send({ address, paymentMethod: 'razorpay' }).expect(201)).body.data.order;
}
const sign = (orderId, paymentId) => payments.hmac(`${orderId}|${paymentId}`, 'rzp-test-secret');
const webhook = (body, secret = 'rzp-test-webhook') => {
  const raw = JSON.stringify(body);
  return request(app()).post('/api/payments/webhook').set('Content-Type', 'application/json')
    .set('x-razorpay-signature', payments.hmac(raw, secret)).send(raw);
};
const captured = (rzpOrderId, id = 'pay_1') => ({ event: 'payment.captured', payload: { payment: { entity: { id, order_id: rzpOrderId } } } });

describe('payments', () => {
  test('creates a provider order for the server-computed amount and is idempotent', async () => {
    const { agent } = await makeUser();
    const order = await onlineOrder(agent);
    const a = (await agent.post('/api/payments/create').send({ orderId: order._id }).expect(200)).body.data;
    assert.equal(a.amount, 59900); // 599.00 INR in paise
    const b = (await agent.post('/api/payments/create').send({ orderId: order._id }).expect(200)).body.data;
    assert.equal(a.providerOrderId, b.providerOrderId);
    assert.equal(await Payment.countDocuments(), 1);
  });

  test('cannot create payment for COD, foreign, or unknown orders', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await a.agent.post('/api/cart/items').send({ productId: cat.ring.id, variantSku: 'R-6', quantity: 1 });
    const cod = (await a.agent.post('/api/orders').send({ address, paymentMethod: 'cod' }).expect(201)).body.data.order;
    await a.agent.post('/api/payments/create').send({ orderId: cod._id }).expect(400);
    await b.agent.post('/api/payments/create').send({ orderId: cod._id }).expect(404);
    await request(app()).post('/api/payments/create').send({ orderId: cod._id }).expect(401);
  });

  test('a frontend success alone never marks an order paid: bad signature is rejected', async () => {
    const { agent } = await makeUser();
    const order = await onlineOrder(agent);
    const p = (await agent.post('/api/payments/create').send({ orderId: order._id }).expect(200)).body.data;
    await agent.post('/api/payments/verify').send({ razorpay_order_id: p.providerOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: 'forged' }).expect(400);
    assert.equal((await Order.findById(order._id)).paymentStatus, 'pending');
  });

  test('valid signature marks paid; replay is harmless', async () => {
    const { agent } = await makeUser();
    const order = await onlineOrder(agent);
    const p = (await agent.post('/api/payments/create').send({ orderId: order._id }).expect(200)).body.data;
    const body = { razorpay_order_id: p.providerOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(p.providerOrderId, 'pay_1') };
    const res = await agent.post('/api/payments/verify').send(body).expect(200);
    assert.equal(res.body.data.order.paymentStatus, 'paid');
    await agent.post('/api/payments/verify').send(body).expect(200);
    assert.equal((await Order.findById(order._id)).paymentStatus, 'paid');
  });

  test("another customer cannot verify someone else's payment", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const order = await onlineOrder(a.agent);
    const p = (await a.agent.post('/api/payments/create').send({ orderId: order._id }).expect(200)).body.data;
    await b.agent.post('/api/payments/verify').send({ razorpay_order_id: p.providerOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(p.providerOrderId, 'pay_1') }).expect(404);
  });

  test('webhook: rejects bad signature, marks paid once, replay ignored', async () => {
    const { agent } = await makeUser();
    const order = await onlineOrder(agent);
    const p = (await agent.post('/api/payments/create').send({ orderId: order._id }).expect(200)).body.data;
    await webhook(captured(p.providerOrderId), 'wrong-secret').expect(400);
    assert.equal((await Order.findById(order._id)).paymentStatus, 'pending');
    await webhook(captured(p.providerOrderId)).expect(200);
    await webhook(captured(p.providerOrderId)).expect(200);
    assert.equal((await Order.findById(order._id)).paymentStatus, 'paid');
    assert.equal(await Payment.countDocuments({ status: 'paid' }), 1);
  });

  test('webhook payment.failed records failure and the order can still be paid on retry', async () => {
    const { agent } = await makeUser();
    const order = await onlineOrder(agent);
    const p = (await agent.post('/api/payments/create').send({ orderId: order._id }).expect(200)).body.data;
    await webhook({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_x', order_id: p.providerOrderId } } } }).expect(200);
    assert.equal((await Order.findById(order._id)).paymentStatus, 'failed');
    await webhook(captured(p.providerOrderId, 'pay_2')).expect(200);
    assert.equal((await Order.findById(order._id)).paymentStatus, 'paid');
  });

  test('cancelling a paid order flags a refund and restores stock', async () => {
    const { agent } = await makeUser();
    const order = await onlineOrder(agent);
    const p = (await agent.post('/api/payments/create').send({ orderId: order._id }).expect(200)).body.data;
    await webhook(captured(p.providerOrderId)).expect(200);
    const res = await agent.post(`/api/orders/${order._id}/cancel`).expect(200);
    assert.equal(res.body.data.order.paymentStatus, 'refund_pending');
  });

  test('payment captured after cancellation is flagged for refund, not paid', async () => {
    const { agent } = await makeUser();
    const order = await onlineOrder(agent);
    const p = (await agent.post('/api/payments/create').send({ orderId: order._id }).expect(200)).body.data;
    await agent.post(`/api/orders/${order._id}/cancel`).expect(200);
    await webhook(captured(p.providerOrderId)).expect(200);
    assert.equal((await Order.findById(order._id)).paymentStatus, 'refund_pending');
  });
});
