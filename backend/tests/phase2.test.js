const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, startDb, stopDb, clearDb, makeUser, seedCatalog, address, request } = require('./helpers');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const Coupon = require('../src/models/Coupon');
const User = require('../src/models/User');
const payments = require('../src/services/paymentService');
const orderService = require('../src/services/orderService');
const { outbox } = require('../src/services/mailer');
const { assertMongoUri } = require('../src/config/db');

before(startDb);
after(stopDb);
let cat;
beforeEach(async () => { await clearDb(); cat = await seedCatalog(); outbox.length = 0; });

const stockOf = async (sku) => (await Product.findOne({ 'variants.sku': sku })).variants.find((v) => v.sku === sku).stock;
const fill = (agent, productId = cat.ring.id, sku = 'R-6', qty = 1) => agent.post('/api/cart/items').send({ productId, variantSku: sku, quantity: qty }).expect(200);
const place = (agent, body = {}) => agent.post('/api/orders').send({ address, paymentMethod: 'cod', ...body });
const mailTo = async (to) => { for (let i = 0; i < 20; i += 1) { const m = outbox.find((x) => x.to === to); if (m) return m; await new Promise((r) => setTimeout(r, 25)); } return null; };

describe('Atlas config', () => {
  test('rejects the placeholder connection string with instructions', () => {
    assert.throws(() => assertMongoUri('mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/gemica'), /placeholder/);
    assert.throws(() => assertMongoUri(''), /placeholder/);
    assert.throws(() => assertMongoUri('http://nope'), /must start with/);
  });
  test('accepts a real-looking Atlas string and a local one', () => {
    assert.doesNotThrow(() => assertMongoUri('mongodb+srv://bob:pw@abc12.ab1cd.mongodb.net/gemica?retryWrites=true'));
    assert.doesNotThrow(() => assertMongoUri('mongodb://127.0.0.1:27017/gemica'));
  });
});

describe('password reset and account', () => {
  test('forgot → reset flow, token is single-use, old password stops working', async () => {
    const { email } = await makeUser({ email: 'ann@t.test', password: 'OldPassw0rd!' });
    await request(app()).post('/api/auth/forgot-password').send({ email }).expect(200);
    const mail = await mailTo(email);
    assert.ok(mail, 'reset email sent');
    const token = mail.text.match(/token=([a-f0-9]+)/)[1];
    await request(app()).post('/api/auth/reset-password').send({ token, password: 'short' }).expect(400);
    await request(app()).post('/api/auth/reset-password').send({ token, password: 'NewPassw0rd!' }).expect(200);
    await request(app()).post('/api/auth/reset-password').send({ token, password: 'Another1234!' }).expect(400);
    await request(app()).post('/api/auth/login').send({ email, password: 'OldPassw0rd!' }).expect(401);
    await request(app()).post('/api/auth/login').send({ email, password: 'NewPassw0rd!' }).expect(200);
  });

  test('does not reveal whether an email is registered', async () => {
    const a = await request(app()).post('/api/auth/forgot-password').send({ email: 'nobody@t.test' }).expect(200);
    assert.match(a.body.message, /If that email is registered/);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(outbox.length, 0);
  });

  test('invalid and expired tokens are rejected', async () => {
    await request(app()).post('/api/auth/reset-password').send({ token: 'f'.repeat(64), password: 'NewPassw0rd!' }).expect(400);
    const { email } = await makeUser({ email: 'exp@t.test' });
    await request(app()).post('/api/auth/forgot-password').send({ email }).expect(200);
    const token = (await mailTo(email)).text.match(/token=([a-f0-9]+)/)[1];
    await User.collection.updateOne({ email }, { $set: { resetExpires: new Date(Date.now() - 1000) } });
    await request(app()).post('/api/auth/reset-password').send({ token, password: 'NewPassw0rd!' }).expect(400);
  });

  test('changing password signs out other devices but keeps this one', async () => {
    const a = await makeUser({ email: 'dev@t.test', password: 'OldPassw0rd!' });
    const other = request.agent(app());
    await other.post('/api/auth/login').send({ email: a.email, password: 'OldPassw0rd!' }).expect(200);
    await a.agent.post('/api/auth/change-password').send({ currentPassword: 'wrong-one', newPassword: 'NewPassw0rd!' }).expect(400);
    await a.agent.post('/api/auth/change-password').send({ currentPassword: 'OldPassw0rd!', newPassword: 'NewPassw0rd!' }).expect(200);
    await a.agent.get('/api/auth/me').expect(200);
    await other.get('/api/auth/me').expect(401);
  });

  test('profile name can be updated; requires login', async () => {
    const { agent } = await makeUser();
    const res = await agent.patch('/api/auth/me').send({ name: 'New Name' }).expect(200);
    assert.equal(res.body.data.user.name, 'New Name');
    await agent.patch('/api/auth/me').send({ name: '' }).expect(400);
    await request(app()).patch('/api/auth/me').send({ name: 'x' }).expect(401);
  });
});

describe('coupons', () => {
  const mk = (agent, over = {}) => agent.post('/api/admin/coupons').send({ code: 'SAVE10', type: 'percent', value: 10, ...over });

  test('only admins can manage coupons; validates input', async () => {
    const cust = await makeUser();
    const admin = await makeUser({ role: 'admin' });
    await mk(cust.agent).expect(403);
    await request(app()).get('/api/admin/coupons').expect(401);
    await mk(admin.agent, { value: 150 }).expect(400);
    await mk(admin.agent, { code: 'a b' }).expect(400);
    await mk(admin.agent).expect(201);
    await mk(admin.agent, { code: 'save10' }).expect(409);
    assert.equal((await admin.agent.get('/api/admin/coupons').expect(200)).body.data.coupons.length, 1);
  });

  test('discount is applied by the server and totals are correct', async () => {
    const admin = await makeUser({ role: 'admin' });
    await mk(admin.agent).expect(201);
    const { agent } = await makeUser();
    await agent.post('/api/coupons/validate').send({ code: 'SAVE10' }).expect(400); // empty cart
    await fill(agent, cat.ring.id, 'R-6', 2); // 1000
    const preview = (await agent.post('/api/coupons/validate').send({ code: 'save10' }).expect(200)).body.data;
    assert.equal(preview.discount, 100);
    assert.equal(preview.totalAmount, 999); // 1000 - 100 + 99
    const o = (await place(agent, { couponCode: 'SAVE10' }).expect(201)).body.data.order;
    assert.equal(o.discountAmount, 100);
    assert.equal(o.totalAmount, 999);
    assert.equal(o.couponCode, 'SAVE10');
    assert.equal((await Coupon.findOne({ code: 'SAVE10' })).usedCount, 1);
  });

  test('flat coupons, caps, minimum order, expiry, inactive and unknown codes', async () => {
    const admin = await makeUser({ role: 'admin' });
    await mk(admin.agent, { code: 'FLAT200', type: 'flat', value: 200, minOrder: 1500 }).expect(201);
    await mk(admin.agent, { code: 'CAP', type: 'percent', value: 50, maxDiscount: 120 }).expect(201);
    await mk(admin.agent, { code: 'OLD', expiresAt: new Date(Date.now() - 86400000).toISOString() }).expect(201);
    const off = (await mk(admin.agent, { code: 'OFF' }).expect(201)).body.data.coupon;
    await admin.agent.patch(`/api/admin/coupons/${off._id}`).send({ isActive: false }).expect(200);
    const { agent } = await makeUser();
    await fill(agent, cat.ring.id, 'R-6', 2); // 1000
    const check = (code) => agent.post('/api/coupons/validate').send({ code });
    assert.match((await check('FLAT200').expect(400)).body.message, /1500/);
    assert.equal((await check('CAP').expect(200)).body.data.discount, 120);
    await check('OLD').expect(400);
    await check('OFF').expect(400);
    await check('NOPE').expect(400);
    await fill(agent, cat.earring.id, 'E-1', 1); // +2500
    assert.equal((await check('FLAT200').expect(200)).body.data.discount, 200);
  });

  test('usage limit is enforced and a bad code blocks the order without side effects', async () => {
    const admin = await makeUser({ role: 'admin' });
    await mk(admin.agent, { code: 'ONCE', usageLimit: 1 }).expect(201);
    const a = await makeUser();
    const b = await makeUser();
    await fill(a.agent); await fill(b.agent);
    await place(a.agent, { couponCode: 'ONCE' }).expect(201);
    await place(b.agent, { couponCode: 'ONCE' }).expect(400);
    await place(b.agent, { couponCode: 'BOGUS' }).expect(400);
    assert.equal(await Order.countDocuments(), 1);
    assert.equal(await stockOf('R-6'), 4); // only one unit left the shelf
  });

  test('concurrent redemptions cannot exceed the limit', async () => {
    const admin = await makeUser({ role: 'admin' });
    await mk(admin.agent, { code: 'RACE', usageLimit: 1 }).expect(201);
    const users = await Promise.all([makeUser(), makeUser(), makeUser()]);
    for (const u of users) await fill(u.agent);
    const results = await Promise.all(users.map((u) => place(u.agent, { couponCode: 'RACE' })));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal((await Coupon.findOne({ code: 'RACE' })).usedCount, 1);
    assert.equal(await stockOf('R-6'), 4);
  });

  test('cancelling an order gives the coupon use back', async () => {
    const admin = await makeUser({ role: 'admin' });
    await mk(admin.agent, { usageLimit: 5 }).expect(201);
    const { agent } = await makeUser();
    await fill(agent);
    const id = (await place(agent, { couponCode: 'SAVE10' }).expect(201)).body.data.order._id;
    assert.equal((await Coupon.findOne({ code: 'SAVE10' })).usedCount, 1);
    await agent.post(`/api/orders/${id}/cancel`).expect(200);
    assert.equal((await Coupon.findOne({ code: 'SAVE10' })).usedCount, 0);
  });
});

describe('reviews and related products', () => {
  const deliver = async (agent) => {
    await fill(agent);
    const id = (await place(agent).expect(201)).body.data.order._id;
    await Order.updateOne({ _id: id }, { orderStatus: 'delivered' });
  };

  test('only verified buyers (delivered orders) can review', async () => {
    const { agent } = await makeUser();
    const body = { rating: 5, comment: 'Lovely' };
    await request(app()).post('/api/products/test-ring/reviews').send(body).expect(401);
    await agent.post('/api/products/test-ring/reviews').send(body).expect(403);
    await fill(agent);
    await place(agent).expect(201); // placed, not delivered yet
    await agent.post('/api/products/test-ring/reviews').send(body).expect(403);
  });

  test('review is saved, rating average updates, one review per customer', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await deliver(a.agent); await deliver(b.agent);
    await a.agent.post('/api/products/test-ring/reviews').send({ rating: 6, comment: 'x' }).expect(400);
    await a.agent.post('/api/products/test-ring/reviews').send({ rating: 4, comment: '' }).expect(400);
    await a.agent.post('/api/products/test-ring/reviews').send({ rating: 5, comment: 'Beautiful' }).expect(201);
    await b.agent.post('/api/products/test-ring/reviews').send({ rating: 2, title: 'Meh', comment: 'Fine' }).expect(201);
    await a.agent.post('/api/products/test-ring/reviews').send({ rating: 4, comment: 'Edited' }).expect(200); // update, not duplicate
    const list = (await request(app()).get('/api/products/test-ring/reviews').expect(200)).body.data;
    assert.equal(list.total, 2);
    assert.equal(list.ratingCount, 2);
    assert.equal(list.ratingAvg, 3); // (4 + 2) / 2
    assert.ok(list.items.every((r) => !r.author.includes(' ')));
    const card = (await request(app()).get('/api/products?q=Test Ring')).body.data.items[0];
    assert.equal(card.ratingAvg, 3);
    await request(app()).get('/api/products/old-ring/reviews').expect(404);
  });

  test('related products: same category, excludes itself and archived', async () => {
    const Product2 = require('../src/models/Product');
    await Product2.create({ name: 'Second Ring', slug: 'second-ring', category: cat.cat._id, variants: [{ sku: 'S-1', price: 10, stock: 1 }] });
    const res = await request(app()).get('/api/products/test-ring/related').expect(200);
    assert.deepEqual(res.body.data.items.map((p) => p.slug), ['second-ring']);
    await request(app()).get('/api/products/nope/related').expect(404);
  });
});

describe('refunds, expiry, emails, analytics', () => {
  async function paidThenCancelled() {
    payments.setClient({ orders: { create: async () => ({ id: `order_r_${Math.random()}` }) } });
    const cust = await makeUser();
    const admin = await makeUser({ role: 'admin' });
    await fill(cust.agent);
    const order = (await place(cust.agent, { paymentMethod: 'razorpay' }).expect(201)).body.data.order;
    const p = (await cust.agent.post('/api/payments/create').send({ orderId: order._id }).expect(200)).body.data;
    await cust.agent.post('/api/payments/verify').send({
      razorpay_order_id: p.providerOrderId, razorpay_payment_id: 'pay_9', razorpay_signature: payments.hmac(`${p.providerOrderId}|pay_9`, 'rzp-test-secret'),
    }).expect(200);
    await cust.agent.post(`/api/orders/${order._id}/cancel`).expect(200);
    return { cust, admin, order };
  }

  test('admin refunds a cancelled paid order once, for the right amount', async () => {
    const { cust, admin, order } = await paidThenCancelled();
    const calls = [];
    payments.setClient({ payments: { refund: async (id, body) => { calls.push([id, body.amount]); return { id: 'rfnd_1' }; } } });
    await cust.agent.post(`/api/admin/orders/${order._id}/refund`).expect(403);
    const res = await admin.agent.post(`/api/admin/orders/${order._id}/refund`).expect(200);
    assert.equal(res.body.data.order.paymentStatus, 'refunded');
    assert.deepEqual(calls, [['pay_9', 59900]]);
    await admin.agent.post(`/api/admin/orders/${order._id}/refund`).expect(400);
    assert.equal(calls.length, 1);
  });

  test('a failed provider refund leaves the order awaiting refund', async () => {
    const { admin, order } = await paidThenCancelled();
    payments.setClient({ payments: { refund: async () => { throw new Error('gateway down'); } } });
    await admin.agent.post(`/api/admin/orders/${order._id}/refund`).expect(502);
    assert.equal((await Order.findById(order._id)).paymentStatus, 'refund_pending');
  });

  test('unpaid online orders expire and release stock; fresh and paid orders are untouched', async () => {
    payments.setClient({ orders: { create: async () => ({ id: `order_e_${Math.random()}` }) } });
    const a = await makeUser(); const b = await makeUser(); const c = await makeUser();
    await fill(a.agent); await fill(b.agent); await fill(c.agent);
    const old = (await place(a.agent, { paymentMethod: 'razorpay' }).expect(201)).body.data.order;
    const fresh = (await place(b.agent, { paymentMethod: 'razorpay' }).expect(201)).body.data.order;
    const cod = (await place(c.agent).expect(201)).body.data.order;
    assert.equal(await stockOf('R-6'), 2);
    await Order.collection.updateMany({ _id: { $in: [new (require('mongoose').Types.ObjectId)(old._id), new (require('mongoose').Types.ObjectId)(cod._id)] } }, { $set: { createdAt: new Date(Date.now() - 3 * 3600 * 1000) } });
    assert.equal(await orderService.expireUnpaidOrders({ minutes: 60 }), 1);
    assert.equal((await Order.findById(old._id)).orderStatus, 'cancelled');
    assert.equal((await Order.findById(fresh._id)).orderStatus, 'placed');
    assert.equal((await Order.findById(cod._id)).orderStatus, 'placed'); // COD never expires
    assert.equal(await stockOf('R-6'), 3);
    assert.equal(await orderService.expireUnpaidOrders({ minutes: 60 }), 0);
  });

  test('order confirmation email is sent with the total', async () => {
    const { agent, email } = await makeUser();
    await fill(agent);
    const o = (await place(agent).expect(201)).body.data.order;
    const mail = await mailTo(email);
    assert.ok(mail);
    assert.match(mail.subject, new RegExp(o.orderNumber));
    assert.match(mail.text, /Total: Rs\. 599/);
  });

  test('dashboard includes 14-day sales and top products', async () => {
    const admin = await makeUser({ role: 'admin' });
    const { agent } = await makeUser();
    await fill(agent, cat.ring.id, 'R-6', 2);
    await place(agent).expect(201);
    const d = (await admin.agent.get('/api/admin/dashboard').expect(200)).body.data;
    assert.equal(d.salesByDay.length, 14);
    assert.equal(d.salesByDay[13].orders, 1);
    assert.equal(d.salesByDay[13].sales, 1099);
    assert.equal(d.topProducts[0].name, 'Test Ring');
    assert.equal(d.topProducts[0].units, 2);
  });
});
