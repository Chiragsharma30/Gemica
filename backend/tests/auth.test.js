const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, startDb, stopDb, clearDb, makeUser, request } = require('./helpers');

before(startDb);
after(stopDb);
beforeEach(clearDb);

const creds = { name: 'Jane', email: 'jane@example.com', password: 'Passw0rd!' };

describe('auth', () => {
  test('health check', async () => {
    await request(app()).get('/api/health').expect(200);
  });

  test('register sets an HTTP-only cookie and hides the hash', async () => {
    const res = await request(app()).post('/api/auth/register').send(creds).expect(201);
    assert.equal(res.body.data.user.email, creds.email);
    assert.equal(res.body.data.user.role, 'customer');
    assert.doesNotMatch(JSON.stringify(res.body), /passwordHash/);
    assert.match(res.headers['set-cookie'][0], /HttpOnly/i);
  });

  test('role cannot be set by the client', async () => {
    const res = await request(app()).post('/api/auth/register').send({ ...creds, role: 'admin' }).expect(201);
    assert.equal(res.body.data.user.role, 'customer');
  });

  test('duplicate email rejected (case-insensitive)', async () => {
    await request(app()).post('/api/auth/register').send(creds).expect(201);
    await request(app()).post('/api/auth/register').send({ ...creds, email: 'JANE@example.com' }).expect(409);
  });

  test('validation failures return 400', async () => {
    await request(app()).post('/api/auth/register').send({ name: '', email: 'nope', password: '123' }).expect(400);
  });

  test('invalid credentials create no session', async () => {
    await request(app()).post('/api/auth/register').send(creds).expect(201);
    const res = await request(app()).post('/api/auth/login').send({ email: creds.email, password: 'wrong-password' }).expect(401);
    assert.equal(res.headers['set-cookie'], undefined);
  });

  test('me requires auth, works after login, and logout clears it', async () => {
    await request(app()).get('/api/auth/me').expect(401);
    const { agent } = await makeUser();
    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
  });

  test('tampered token is rejected', async () => {
    await request(app()).get('/api/auth/me').set('Cookie', 'gemica_token=not.a.jwt').expect(401);
  });
});
