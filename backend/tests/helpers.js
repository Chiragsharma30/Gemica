const mongoose = require('mongoose');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Optional: use a locally installed mongod instead of downloading one.
//   MONGOMS_SYSTEM_BINARY=/path/to/mongod npm test
let mongod;
const app = () => require('../src/app');

async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('gemica_test'));
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // build unique/partial indexes
}
async function stopDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}
async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

async function makeUser({ role = 'customer', email = `${role}-${Math.random().toString(36).slice(2)}@t.test`, password = 'Passw0rd!' } = {}) {
  const User = require('../src/models/User');
  const user = await User.create({ name: 'Test User', email, passwordHash: await bcrypt.hash(password, 4), role });
  const agent = request.agent(app());
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return { user, agent, email, password };
}

async function seedCatalog() {
  const Category = require('../src/models/Category');
  const Product = require('../src/models/Product');
  const cat = await Category.create({ name: 'Rings', slug: 'rings' });
  const cat2 = await Category.create({ name: 'Earrings', slug: 'earrings' });
  const ring = await Product.create({
    name: 'Test Ring', slug: 'test-ring', category: cat._id, images: ['/images/rings-1.svg'], material: 'Brass',
    variants: [
      { sku: 'R-6', label: 'Size 6', price: 500, stock: 5 },
      { sku: 'R-7', label: 'Size 7', price: 600, stock: 1 },
    ],
  });
  const earring = await Product.create({
    name: 'Test Earring', slug: 'test-earring', category: cat2._id, variants: [{ sku: 'E-1', label: 'Standard', price: 2500, stock: 3 }],
  });
  const archived = await Product.create({
    name: 'Old Ring', slug: 'old-ring', category: cat._id, isActive: false, variants: [{ sku: 'O-1', price: 100, stock: 9 }],
  });
  return { cat, cat2, ring, earring, archived };
}

const address = { fullName: 'A B', phone: '9876543210', line1: '1 Main St', city: 'Mumbai', state: 'MH', pincode: '400001' };

module.exports = { app, startDb, stopDb, clearDb, makeUser, seedCatalog, address, request };
