const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, startDb, stopDb, clearDb, makeUser, seedCatalog, address, request } = require('./helpers');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');

before(startDb);
after(stopDb);
let cat;
beforeEach(async () => { await clearDb(); cat = await seedCatalog(); });

const stockOf = async (sku) => (await Product.findOne({ 'variants.sku': sku })).variants.find((v) => v.sku === sku).stock;
const fill = (agent, productId, sku, qty) => agent.post('/api/cart/items').send({ productId, variantSku: sku, quantity: qty }).expect(200);
const place = (agent, body = {}, key) => {
  const r = agent.post('/api/orders');
  if (key) r.set('Idempotency-Key', key);
  return r.send({ address, paymentMethod: 'cod', ...body });
};

describe('checkout and orders', () => {
  test('requires authentication', async () => {
    await request(app()).post('/api/orders').send({ address, paymentMethod: 'cod' }).expect(401);
    await request(app()).get('/api/orders/my-orders').expect(401);
  });

  test('COD order: server computes totals, snapshots items, decrements stock, clears cart', async () => {
    const { agent } = await makeUser();
    await fill(agent, cat.ring.id, 'R-6', 2);
    const res = await place(agent, { totalAmount: 1, subtotal: 1, items: [{ unitPrice: 1 }] }).expect(201); // client-supplied money is ignored
    const o = res.body.data.order;
    assert.equal(o.subtotal, 1000);
    assert.equal(o.shippingFee, 99);
    assert.equal(o.totalAmount, 1099);
    assert.equal(o.paymentStatus, 'cod_pending');
    assert.equal(o.orderStatus, 'placed');
    assert.equal(o.items[0].name, 'Test Ring');
    assert.equal(o.items[0].unitPrice, 500);
    assert.match(o.orderNumber, /^GM/);
    assert.equal(await stockOf('R-6'), 3);
    assert.equal((await agent.get('/api/cart')).body.data.cart.items.length, 0);
  });

  test('historical order prices do not change when the catalogue changes', async () => {
    const { agent } = await makeUser();
    await fill(agent, cat.ring.id, 'R-6', 1);
    const id = (await place(agent).expect(201)).body.data.order._id;
    await Product.updateOne({ _id: cat.ring._id, 'variants.sku': 'R-6' }, { $set: { 'variants.$.price': 9999 } });
    const o = (await agent.get(`/api/orders/${id}`).expect(200)).body.data.order;
    assert.equal(o.items[0].unitPrice, 500);
    assert.equal(o.totalAmount, 599);
  });

  test('saved address id is snapshotted', async () => {
    const { agent } = await makeUser();
    const addrId = (await agent.post('/api/addresses').send(address).expect(201)).body.data.addresses[0]._id;
    await fill(agent, cat.ring.id, 'R-6', 1);
    const o = (await agent.post('/api/orders').send({ addressId: addrId, paymentMethod: 'cod' }).expect(201)).body.data.order;
    assert.equal(o.shippingAddress.city, 'Mumbai');
  });

  test('rejects empty cart, missing address, bad payment method', async () => {
    const { agent } = await makeUser();
    await place(agent).expect(400);
    await fill(agent, cat.ring.id, 'R-6', 1);
    await agent.post('/api/orders').send({ paymentMethod: 'cod' }).expect(400);
    await place(agent, { paymentMethod: 'bitcoin' }).expect(400);
    await place(agent, { address: { ...address, pincode: 'x' } }).expect(400);
  });

  test('refuses to oversell when stock dropped after carting; no order, no stock change', async () => {
    const { agent } = await makeUser();
    await fill(agent, cat.ring.id, 'R-6', 3);
    await Product.updateOne({ _id: cat.ring._id, 'variants.sku': 'R-6' }, { $set: { 'variants.$.stock': 2 } });
    const res = await place(agent).expect(409);
    assert.equal(res.body.errors[0].issue, 'insufficient_stock');
    assert.equal(await Order.countDocuments(), 0);
    assert.equal(await stockOf('R-6'), 2);
  });

  test('refuses archived products at order time', async () => {
    const { agent } = await makeUser();
    await fill(agent, cat.ring.id, 'R-6', 1);
    await Product.updateOne({ _id: cat.ring._id }, { isActive: false });
    await place(agent).expect(409);
  });

  test('multi-line failure rolls back already-reserved lines', async () => {
    const { agent } = await makeUser();
    await fill(agent, cat.ring.id, 'R-6', 2);
    await fill(agent, cat.earring.id, 'E-1', 1);
    await Product.updateOne({ _id: cat.earring._id, 'variants.sku': 'E-1' }, { $set: { 'variants.$.stock': 0 } });
    await place(agent).expect(409);
    assert.equal(await stockOf('R-6'), 5);
  });

  test('concurrent buyers cannot oversell the last unit', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await fill(a.agent, cat.ring.id, 'R-7', 1);
    await fill(b.agent, cat.ring.id, 'R-7', 1);
    const [ra, rb] = await Promise.all([place(a.agent), place(b.agent)]);
    assert.deepEqual([ra.status, rb.status].sort(), [201, 409]);
    assert.equal(await stockOf('R-7'), 0);
    assert.equal(await Order.countDocuments(), 1);
  });

  test('idempotency key prevents duplicate orders and double stock decrement', async () => {
    const { agent } = await makeUser();
    await fill(agent, cat.ring.id, 'R-6', 1);
    const first = await place(agent, {}, 'key-1').expect(201);
    const second = await place(agent, {}, 'key-1').expect(200);
    assert.equal(first.body.data.order._id, second.body.data.order._id);
    assert.equal(await Order.countDocuments(), 1);
    assert.equal(await stockOf('R-6'), 4);
  });

  test('customers only see their own orders', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await fill(a.agent, cat.ring.id, 'R-6', 1);
    const id = (await place(a.agent).expect(201)).body.data.order._id;
    await b.agent.get(`/api/orders/${id}`).expect(404);
    await b.agent.post(`/api/orders/${id}/cancel`).expect(404);
    assert.equal((await b.agent.get('/api/orders/my-orders').expect(200)).body.data.total, 0);
    assert.equal((await a.agent.get('/api/orders/my-orders').expect(200)).body.data.total, 1);
    await a.agent.get('/api/orders/not-an-id').expect(400);
  });

  test('cancel restores stock exactly once; cannot cancel twice', async () => {
    const { agent } = await makeUser();
    await fill(agent, cat.ring.id, 'R-6', 2);
    const id = (await place(agent).expect(201)).body.data.order._id;
    assert.equal(await stockOf('R-6'), 3);
    const res = await agent.post(`/api/orders/${id}/cancel`).expect(200);
    assert.equal(res.body.data.order.orderStatus, 'cancelled');
    assert.equal(await stockOf('R-6'), 5);
    await agent.post(`/api/orders/${id}/cancel`).expect(400);
    assert.equal(await stockOf('R-6'), 5);
  });

  test('customer cannot cancel once the order is processing', async () => {
    const { agent } = await makeUser();
    await fill(agent, cat.ring.id, 'R-6', 1);
    const id = (await place(agent).expect(201)).body.data.order._id;
    await Order.updateOne({ _id: id }, { orderStatus: 'processing' });
    await agent.post(`/api/orders/${id}/cancel`).expect(400);
  });
});
