const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, startDb, stopDb, clearDb, makeUser } = require('./helpers');
const env = require('../src/config/env');
const imageStore = require('../src/services/imageStore');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const written = [];

before(startDb);
after(async () => {
  for (const f of written) fs.rmSync(path.join(imageStore.UPLOAD_DIR, f), { force: true });
  imageStore.setFetch((...a) => fetch(...a));
  Object.assign(env.cloudinary, { cloudName: '', apiKey: '', apiSecret: '' });
  await stopDb();
});
beforeEach(clearDb);

const upload = (agent, buf, name = 'a.png', type = 'image/png') => agent.post('/api/admin/uploads').attach('image', buf, { filename: name, contentType: type });

describe('local image storage', () => {
  test('extension follows the real content, not the file name', async () => {
    const { agent } = await makeUser({ role: 'admin' });
    const res = await upload(agent, JPG, 'sneaky.png', 'image/png').expect(201);
    assert.match(res.body.data.url, /^\/uploads\/[\w-]+\.jpg$/);
    written.push(path.basename(res.body.data.url));
  });
});

describe('Cloudinary storage', () => {
  beforeEach(() => Object.assign(env.cloudinary, { cloudName: 'democloud', apiKey: 'key123', apiSecret: 'sekret' }));

  test('sends a correctly signed upload and returns the hosted https URL', async () => {
    const calls = [];
    imageStore.setFetch(async (url, opts) => {
      calls.push({ url, form: opts.body });
      return { ok: true, status: 200, json: async () => ({ secure_url: 'https://res.cloudinary.com/democloud/image/upload/v1/gemica/x.png' }) };
    });
    const { agent } = await makeUser({ role: 'admin' });
    const res = await upload(agent, PNG).expect(201);
    assert.equal(res.body.data.url, 'https://res.cloudinary.com/democloud/image/upload/v1/gemica/x.png');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.cloudinary.com/v1_1/democloud/image/upload');
    const f = calls[0].form;
    assert.equal(f.get('api_key'), 'key123');
    assert.equal(f.get('folder'), 'gemica');
    const expected = crypto.createHash('sha1').update(`folder=gemica&timestamp=${f.get('timestamp')}sekret`).digest('hex');
    assert.equal(f.get('signature'), expected);
    assert.equal(f.get('file').size, PNG.length);
  });

  test('the hosted URL can be saved on a product', async () => {
    const Category = require('../src/models/Category');
    const cat = await Category.create({ name: 'Rings', slug: 'rings' });
    const { agent } = await makeUser({ role: 'admin' });
    const res = await agent.post('/api/admin/products').send({
      name: 'Photo Ring', category: String(cat._id), images: ['https://res.cloudinary.com/democloud/image/upload/v1/gemica/x.png'],
      variants: [{ sku: 'P-1', price: 100, stock: 1 }],
    }).expect(201);
    assert.equal(res.body.data.product.images[0].startsWith('https://'), true);
  });

  test('a provider failure becomes a clear 502 and nothing is stored locally', async () => {
    imageStore.setFetch(async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'Invalid Signature' } }) }));
    const { agent } = await makeUser({ role: 'admin' });
    const res = await upload(agent, PNG).expect(502);
    assert.match(res.body.message, /Invalid Signature/);
    imageStore.setFetch(async () => { throw new Error('offline'); });
    await upload(agent, PNG).expect(502);
  });

  test('spoofed files are rejected before anything is sent to the host', async () => {
    let called = 0;
    imageStore.setFetch(async () => { called += 1; return { ok: true, json: async () => ({ secure_url: 'https://x' }) }; });
    const { agent } = await makeUser({ role: 'admin' });
    await upload(agent, Buffer.from('<script>alert(1)</script>')).expect(400);
    assert.equal(called, 0);
  });
});

describe('product photo references', () => {
  const Category = require('../src/models/Category');
  const Product = require('../src/models/Product');

  test('editing a demo product keeps its built-in /images pictures and can add new photos', async () => {
    const cat = await Category.create({ name: 'Rings', slug: 'rings' });
    const p = await Product.create({ name: 'Demo Ring', slug: 'demo-ring', category: cat._id, images: ['/images/rings-1.svg', '/images/rings-2.svg'], variants: [{ sku: 'D-1', price: 10, stock: 1 }] });
    const { agent } = await makeUser({ role: 'admin' });
    const res = await agent.patch(`/api/admin/products/${p._id}`).send({
      images: ['https://res.cloudinary.com/x/image/upload/a.png', '/uploads/abc-123.jpg', '/images/rings-1.svg'],
    }).expect(200);
    assert.equal(res.body.data.product.images.length, 3);
  });

  test('unsafe references are still rejected', async () => {
    const cat = await Category.create({ name: 'Rings', slug: 'rings' });
    const p = await Product.create({ name: 'Demo Ring', slug: 'demo-ring', category: cat._id, variants: [{ sku: 'D-1', price: 10, stock: 1 }] });
    const { agent } = await makeUser({ role: 'admin' });
    for (const bad of ['/images/../secret', '/uploads/..', '/images/', '/images/a/b.png', 'http://insecure.com/a.jpg', 'javascript:alert(1)', '//evil.com/a.png', 'data:image/png;base64,AAAA', '/etc/passwd']) {
      await agent.patch(`/api/admin/products/${p._id}`).send({ images: [bad] }).expect(400);
    }
  });
});
