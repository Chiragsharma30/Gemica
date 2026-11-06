const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, startDb, stopDb, clearDb, seedCatalog, request } = require('./helpers');

before(startDb);
after(stopDb);
beforeEach(async () => { await clearDb(); await seedCatalog(); });

const slugs = (res) => res.body.data.items.map((p) => p.slug);

describe('catalogue', () => {
  test('lists only active products, with pagination metadata', async () => {
    const res = await request(app()).get('/api/products').expect(200);
    assert.equal(res.body.data.total, 2);
    assert.deepEqual(slugs(res).sort(), ['test-earring', 'test-ring']);
  });

  test('paginates without loading everything', async () => {
    const res = await request(app()).get('/api/products?limit=1&page=2').expect(200);
    assert.equal(res.body.data.items.length, 1);
    assert.equal(res.body.data.totalPages, 2);
  });

  test('filters by category slug and price range', async () => {
    assert.deepEqual(slugs(await request(app()).get('/api/products?category=rings').expect(200)), ['test-ring']);
    assert.deepEqual(slugs(await request(app()).get('/api/products?minPrice=1000').expect(200)), ['test-earring']);
  });

  test('sorts by price', async () => {
    assert.equal(slugs(await request(app()).get('/api/products?sort=price_asc').expect(200))[0], 'test-ring');
    assert.equal(slugs(await request(app()).get('/api/products?sort=price_desc').expect(200))[0], 'test-earring');
  });

  test('search is regex-safe', async () => {
    await request(app()).get('/api/products?q=.*(').expect(200);
    const res = await request(app()).get('/api/products?q=earring').expect(200);
    assert.equal(res.body.data.total, 1);
  });

  test('unknown category returns an empty page', async () => {
    const res = await request(app()).get('/api/products?category=nope').expect(200);
    assert.equal(res.body.data.total, 0);
  });

  test('rejects invalid query params', async () => {
    await request(app()).get('/api/products?limit=9999').expect(400);
    await request(app()).get('/api/products?sort=hax').expect(400);
  });

  test('detail by slug and id; archived and unknown are 404', async () => {
    const bySlug = await request(app()).get('/api/products/test-ring').expect(200);
    assert.equal(bySlug.body.data.product.variants.length, 2);
    await request(app()).get(`/api/products/${bySlug.body.data.product.id}`).expect(200);
    await request(app()).get('/api/products/old-ring').expect(404);
    await request(app()).get('/api/products/missing').expect(404);
  });

  test('lists categories', async () => {
    const res = await request(app()).get('/api/categories').expect(200);
    assert.equal(res.body.data.categories.length, 2);
  });
});
