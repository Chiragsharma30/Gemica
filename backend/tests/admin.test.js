const fs = require('fs');
const path = require('path');
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, startDb, stopDb, clearDb, makeUser, seedCatalog, address, request } = require('./helpers');
const { UPLOAD_DIR } = require('../src/middleware/upload');
const Order = require('../src/models/Order');
const payments = require('../src/services/paymentService');

before(startDb);
after(async () => {
  for (const f of fs.readdirSync(UPLOAD_DIR)) if (f !== '.gitkeep') fs.unlinkSync(path.join(UPLOAD_DIR, f));
  await stopDb();
});
let cat;
beforeEach(async () => { await clearDb(); cat = await seedCatalog(); });

const productBody = (c) => ({ name: 'New Bangle', category: String(c._id), variants: [{ sku: 'NB-1', label: 'Standard', price: 1200, stock: 4 }] });

describe('admin access control', () => {
  const routes = [
    ['get', '/api/admin/dashboard'], ['get', '/api/admin/orders'], ['get', '/api/admin/products'], ['get', '/api/admin/products/507f1f77bcf86cd799439011'],
    ['post', '/api/admin/products'], ['post', '/api/admin/categories'], ['post', '/api/admin/uploads'],
    ['patch', '/api/admin/products/507f1f77bcf86cd799439011'], ['delete', '/api/admin/products/507f1f77bcf86cd799439011'],
    ['patch', '/api/admin/orders/507f1f77bcf86cd799439011/status'],
  ];
  test('anonymous gets 401', async () => {
    for (const [m, u] of routes) await request(app())[m](u).send({}).expect(401);
  });
  test('customers get 403 even when sending valid-looking requests manually', async () => {
    const { agent } = await makeUser();
    for (const [m, u] of routes) await agent[m](u).send(productBody(cat.cat)).expect(403);
  });
});

describe('admin products', () => {
  test('create validates input, generates unique slug, and shows on storefront', async () => {
    const { agent } = await makeUser({ role: 'admin' });
    await agent.post('/api/admin/products').send({ name: 'x' }).expect(400);
    await agent.post('/api/admin/products').send({ ...productBody(cat.cat), variants: [] }).expect(400);
    await agent.post('/api/admin/products').send({ ...productBody(cat.cat), variants: [{ sku: 'A', price: -5, stock: 1 }] }).expect(400);
    await agent.post('/api/admin/products').send({ ...productBody(cat.cat), category: '507f1f77bcf86cd799439011' }).expect(400);
    await agent.post('/api/admin/products').send({ ...productBody(cat.cat), variants: [{ sku: 'D', price: 1, stock: 1 }, { sku: 'D', price: 2, stock: 1 }] }).expect(400);
    const a = await agent.post('/api/admin/products').send(productBody(cat.cat)).expect(201);
    const b = await agent.post('/api/admin/products').send({ ...productBody(cat.cat), variants: [{ sku: 'NB-2', price: 1, stock: 1 }] }).expect(201);
    assert.equal(a.body.data.product.slug, 'new-bangle');
    assert.equal(b.body.data.product.slug, 'new-bangle-2');
    await request(app()).get('/api/products/new-bangle').expect(200);
  });

  test('rejects unsafe image references', async () => {
    const { agent } = await makeUser({ role: 'admin' });
    await agent.post('/api/admin/products').send({ ...productBody(cat.cat), images: ['javascript:alert(1)'] }).expect(400);
    await agent.post('/api/admin/products').send({ ...productBody(cat.cat), images: ['/uploads/../../etc/passwd'] }).expect(400);
  });

  test('update changes price; archive hides it from customers but keeps order history', async () => {
    const admin = await makeUser({ role: 'admin' });
    const cust = await makeUser();
    await cust.agent.post('/api/cart/items').send({ productId: cat.ring.id, variantSku: 'R-6', quantity: 1 });
    const orderId = (await cust.agent.post('/api/orders').send({ address, paymentMethod: 'cod' }).expect(201)).body.data.order._id;

    const upd = await admin.agent.patch(`/api/admin/products/${cat.ring.id}`).send({ variants: [{ sku: 'R-6', label: 'Size 6', price: 450, stock: 9 }] }).expect(200);
    assert.equal(upd.body.data.product.minPrice, 450);

    await admin.agent.delete(`/api/admin/products/${cat.ring.id}`).expect(200);
    await request(app()).get('/api/products/test-ring').expect(404);
    const o = (await cust.agent.get(`/api/orders/${orderId}`).expect(200)).body.data.order;
    assert.equal(o.items[0].name, 'Test Ring');
    assert.equal((await admin.agent.get('/api/admin/products').expect(200)).body.data.total, 3);
  });

  test('admin can fetch an archived product by id', async () => {
    const { agent } = await makeUser({ role: 'admin' });
    const res = await agent.get(`/api/admin/products/${cat.archived.id}`).expect(200);
    assert.equal(res.body.data.product.slug, 'old-ring');
    await agent.get('/api/admin/products/507f1f77bcf86cd799439011').expect(404);
    await agent.get('/api/admin/products/bad').expect(400);
  });

  test('stock adjustment persists', async () => {
    const { agent } = await makeUser({ role: 'admin' });
    await agent.patch(`/api/admin/products/${cat.ring.id}/stock`).send({ sku: 'R-6', stock: 42 }).expect(200);
    await agent.patch(`/api/admin/products/${cat.ring.id}/stock`).send({ sku: 'R-6', stock: -1 }).expect(400);
    await agent.patch(`/api/admin/products/${cat.ring.id}/stock`).send({ sku: 'NOPE', stock: 1 }).expect(404);
    const p = (await request(app()).get('/api/products/test-ring')).body.data.product;
    assert.equal(p.variants.find((v) => v.sku === 'R-6').stock, 42);
  });

  test('categories: create and reject duplicates', async () => {
    const { agent } = await makeUser({ role: 'admin' });
    await agent.post('/api/admin/categories').send({ name: 'Anklets' }).expect(201);
    await agent.post('/api/admin/categories').send({ name: 'anklets' }).expect(409);
  });
});

describe('admin orders and dashboard', () => {
  async function place(method = 'cod') {
    const admin = await makeUser({ role: 'admin' });
    const cust = await makeUser();
    await cust.agent.post('/api/cart/items').send({ productId: cat.ring.id, variantSku: 'R-6', quantity: 1 });
    const order = (await cust.agent.post('/api/orders').send({ address, paymentMethod: method }).expect(201)).body.data.order;
    return { admin, cust, order };
  }

  test('status follows permitted transitions only', async () => {
    const { admin, order } = await place();
    const set = (s) => admin.agent.patch(`/api/admin/orders/${order._id}/status`).send({ status: s });
    await set('shipped').expect(400);
    await set('bogus').expect(400);
    await set('confirmed').expect(200);
    await set('processing').expect(200);
    await set('shipped').expect(200);
    const done = await set('delivered').expect(200);
    assert.equal(done.body.data.order.paymentStatus, 'cod_collected');
    await set('cancelled').expect(400);
  });

  test('online-payment orders cannot progress until paid', async () => {
    payments.setClient({ orders: { create: async () => ({ id: 'order_admin_1' }) } });
    const { admin, cust, order } = await place('razorpay');
    await admin.agent.patch(`/api/admin/orders/${order._id}/status`).send({ status: 'confirmed' }).expect(400);
    await Order.updateOne({ _id: order._id }, { paymentStatus: 'paid' });
    await admin.agent.patch(`/api/admin/orders/${order._id}/status`).send({ status: 'confirmed' }).expect(200);
    assert.ok(cust);
  });

  test('admin cancel restores stock', async () => {
    const { admin, order } = await place();
    await admin.agent.patch(`/api/admin/orders/${order._id}/status`).send({ status: 'cancelled' }).expect(200);
    const p = (await request(app()).get('/api/products/test-ring')).body.data.product;
    assert.equal(p.variants.find((v) => v.sku === 'R-6').stock, 5);
  });

  test('list orders with status filter and search by order number or customer', async () => {
    const { admin, order, cust } = await place();
    assert.equal((await admin.agent.get('/api/admin/orders').expect(200)).body.data.total, 1);
    assert.equal((await admin.agent.get(`/api/admin/orders?q=${order.orderNumber}`).expect(200)).body.data.total, 1);
    assert.equal((await admin.agent.get(`/api/admin/orders?q=${encodeURIComponent(cust.email)}`).expect(200)).body.data.total, 1);
    assert.equal((await admin.agent.get('/api/admin/orders?q=nomatch').expect(200)).body.data.total, 0);
    assert.equal((await admin.agent.get('/api/admin/orders?status=shipped').expect(200)).body.data.total, 0);
  });

  test('dashboard summarises orders, revenue and low stock', async () => {
    const { admin, order } = await place();
    await Order.updateOne({ _id: order._id }, { paymentStatus: 'cod_collected' });
    const d = (await admin.agent.get('/api/admin/dashboard').expect(200)).body.data;
    assert.equal(d.totalOrders, 1);
    assert.equal(d.revenue, order.totalAmount);
    assert.ok(d.lowStock.some((x) => x.sku === 'R-7'));
  });
});

describe('admin uploads', () => {
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

  test('accepts a real image and serves it', async () => {
    const { agent } = await makeUser({ role: 'admin' });
    const res = await agent.post('/api/admin/uploads').attach('image', PNG, { filename: 'a.png', contentType: 'image/png' }).expect(201);
    assert.match(res.body.data.url, /^\/uploads\/[\w-]+\.png$/);
    await request(app()).get(res.body.data.url).expect(200);
  });

  test('rejects wrong MIME type, spoofed content, missing file and oversize files', async () => {
    const { agent } = await makeUser({ role: 'admin' });
    await agent.post('/api/admin/uploads').attach('image', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' }).expect(400);
    await agent.post('/api/admin/uploads').attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'a.png', contentType: 'image/png' }).expect(400);
    await agent.post('/api/admin/uploads').send({}).expect(400);
    await agent.post('/api/admin/uploads').attach('image', Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]), { filename: 'big.png', contentType: 'image/png' }).expect(400);
  });
});
