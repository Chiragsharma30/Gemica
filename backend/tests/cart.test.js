const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, startDb, stopDb, clearDb, makeUser, seedCatalog, address, request } = require('./helpers');
const Product = require('../src/models/Product');

before(startDb);
after(stopDb);
let cat;
beforeEach(async () => { await clearDb(); cat = await seedCatalog(); });

const add = (agent, productId, variantSku, quantity) => agent.post('/api/cart/items').send({ productId, variantSku, quantity });

describe('cart', () => {
  test('requires authentication', async () => {
    await request(app()).get('/api/cart').expect(401);
    await request(app()).post('/api/cart/items').send({}).expect(401);
  });

  test('add, merge same line, and compute totals on the server', async () => {
    const { agent } = await makeUser();
    await add(agent, cat.ring.id, 'R-6', 1).expect(200);
    const res = await add(agent, cat.ring.id, 'R-6', 2).expect(200);
    const c = res.body.data.cart;
    assert.equal(c.items.length, 1);
    assert.equal(c.items[0].quantity, 3);
    assert.equal(c.subtotal, 1500);
    assert.equal(c.shippingFee, 99);
    assert.equal(c.totalAmount, 1599);
  });

  test('rejects invalid quantities', async () => {
    const { agent } = await makeUser();
    for (const q of [0, -1, 11, 1.5, 'abc']) await add(agent, cat.ring.id, 'R-6', q).expect(400);
  });

  test('rejects more than available stock', async () => {
    const { agent } = await makeUser();
    await add(agent, cat.ring.id, 'R-7', 2).expect(409);
  });

  test('rejects archived products and unknown variants', async () => {
    const { agent } = await makeUser();
    await add(agent, cat.archived.id, 'O-1', 1).expect(404);
    await add(agent, cat.ring.id, 'NOPE', 1).expect(404);
  });

  test('cart reflects current price from the database, not a stored one', async () => {
    const { agent } = await makeUser();
    await add(agent, cat.ring.id, 'R-6', 1).expect(200);
    await Product.updateOne({ _id: cat.ring._id, 'variants.sku': 'R-6' }, { $set: { 'variants.$.price': 700 } });
    const res = await agent.get('/api/cart').expect(200);
    assert.equal(res.body.data.cart.items[0].unitPrice, 700);
  });

  test('flags unavailable lines before checkout', async () => {
    const { agent } = await makeUser();
    await add(agent, cat.ring.id, 'R-6', 2).expect(200);
    await Product.updateOne({ _id: cat.ring._id, 'variants.sku': 'R-6' }, { $set: { 'variants.$.stock': 1 } });
    const res = await agent.get('/api/cart').expect(200);
    assert.equal(res.body.data.cart.hasIssues, true);
    assert.equal(res.body.data.cart.items[0].issue, 'insufficient_stock');
  });

  test('update and remove; other users cannot touch your items', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const itemId = (await add(a.agent, cat.ring.id, 'R-6', 1).expect(200)).body.data.cart.items[0].itemId;
    await b.agent.patch(`/api/cart/items/${itemId}`).send({ quantity: 2 }).expect(404);
    await b.agent.delete(`/api/cart/items/${itemId}`).expect(404);
    const upd = await a.agent.patch(`/api/cart/items/${itemId}`).send({ quantity: 4 }).expect(200);
    assert.equal(upd.body.data.cart.items[0].quantity, 4);
    await a.agent.patch(`/api/cart/items/${itemId}`).send({ quantity: 0 }).expect(400);
    const del = await a.agent.delete(`/api/cart/items/${itemId}`).expect(200);
    assert.equal(del.body.data.cart.items.length, 0);
  });

  test('guest cart merge clamps quantity and skips bad lines', async () => {
    const { agent } = await makeUser();
    const res = await agent.post('/api/cart/merge').send({
      items: [
        { productId: cat.ring.id, variantSku: 'R-7', quantity: 5 },
        { productId: cat.archived.id, variantSku: 'O-1', quantity: 1 },
      ],
    }).expect(200);
    assert.equal(res.body.data.cart.items.length, 1);
    assert.equal(res.body.data.cart.items[0].quantity, 1);
  });
});

describe('wishlist', () => {
  test('add, no duplicates, remove, archived rejected', async () => {
    const { agent } = await makeUser();
    await request(app()).get('/api/wishlist').expect(401);
    await agent.post('/api/wishlist/items').send({ productId: cat.ring.id }).expect(200);
    const res = await agent.post('/api/wishlist/items').send({ productId: cat.ring.id }).expect(200);
    assert.equal(res.body.data.items.length, 1);
    await agent.post('/api/wishlist/items').send({ productId: cat.archived.id }).expect(404);
    await agent.post('/api/wishlist/items').send({ productId: 'bad' }).expect(400);
    const del = await agent.delete(`/api/wishlist/items/${cat.ring.id}`).expect(200);
    assert.equal(del.body.data.items.length, 0);
  });
});

describe('addresses', () => {
  test('validates, saves, and lists only your own', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await request(app()).get('/api/addresses').expect(401);
    await a.agent.post('/api/addresses').send({ ...address, pincode: '12' }).expect(400);
    const res = await a.agent.post('/api/addresses').send(address).expect(201);
    assert.equal(res.body.data.addresses[0].isDefault, true);
    assert.equal((await a.agent.get('/api/addresses').expect(200)).body.data.addresses.length, 1);
    assert.equal((await b.agent.get('/api/addresses').expect(200)).body.data.addresses.length, 0);
  });
});
