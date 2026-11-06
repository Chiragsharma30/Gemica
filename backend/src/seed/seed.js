// Demo data: node seed/seed.js  (refuses to run in production)
require('../config/env');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const slugify = require('../utils/slugify');

const CATS = ['Rings', 'Necklaces', 'Earrings', 'Bracelets'];

const P = (cat, name, material, price, labels, description, n) => ({
  cat, name, material, description,
  images: [`/images/${slugify(cat)}-${n}.svg`, `/images/${slugify(cat)}-${(n % 3) + 1}.svg`],
  variants: labels.map((label, i) => ({ sku: `${slugify(name).toUpperCase().slice(0, 12)}-${i + 1}`, label, price, stock: 8 + i * 2 })),
});

const PRODUCTS = [
  P('Rings', 'Aurelia Solitaire Ring', 'Gold-plated brass, cubic zirconia', 899, ['Size 6', 'Size 7', 'Size 8'], 'A timeless solitaire with a brilliant-cut stone.', 1),
  P('Rings', 'Luna Stackable Band', 'Gold-plated brass', 499, ['Size 6', 'Size 7', 'Size 8'], 'Slim stackable band, wear one or three.', 2),
  P('Rings', 'Vesper Signet Ring', 'Antique-gold brass', 1299, ['Size 7', 'Size 8', 'Size 9'], 'A modern take on the classic signet.', 3),
  P('Necklaces', 'Celeste Pendant Necklace', 'Gold-plated brass, crystal', 1499, ['16 inch', '18 inch'], 'Delicate crystal pendant on a fine chain.', 1),
  P('Necklaces', 'Marguerite Pearl Strand', 'Glass pearls, gold-plated clasp', 2299, ['18 inch', '20 inch'], 'Lustrous faux pearls hand-knotted on silk thread.', 2),
  P('Necklaces', 'Orion Layered Chain', 'Gold-plated stainless steel', 1799, ['Standard'], 'Two-layer chain with a coin accent.', 3),
  P('Earrings', 'Odette Drop Earrings', 'Gold-plated brass, cubic zirconia', 799, ['Standard'], 'Graceful teardrops that catch the light.', 1),
  P('Earrings', 'Solene Hoop Earrings', 'Gold-plated stainless steel', 699, ['Small', 'Medium'], 'Everyday hoops, hypoallergenic posts.', 2),
  P('Earrings', 'Isla Pearl Studs', 'Glass pearl, sterling-silver posts', 549, ['Standard'], 'Classic studs for every occasion.', 3),
  P('Bracelets', 'Thalia Tennis Bracelet', 'Rhodium-plated brass, cubic zirconia', 2499, ['6.5 inch', '7 inch'], 'A line of sparkling stones, secure box clasp.', 1),
  P('Bracelets', 'Ember Charm Bracelet', 'Gold-plated brass', 1199, ['Standard'], 'Adjustable chain with three charms.', 2),
  P('Bracelets', 'Noor Cuff', 'Antique-gold brass', 1599, ['Standard'], 'Open cuff with an engraved pattern.', 3),
];

(async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed in production');
  await connectDB();
  if ((await User.countDocuments()) > 0 && !process.argv.includes('--force')) {
    console.log('Database already has data. Re-seeding will DELETE all users, categories and products.\nRun again with --force to continue:  npm run seed -- --force'); // eslint-disable-line no-console
    await mongoose.disconnect();
    return;
  }
  await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({})]);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@gemica.test';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  await User.create({ name: 'Gemica Admin', email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10), role: 'admin' });
  await User.create({ name: 'Demo Customer', email: 'customer@gemica.test', passwordHash: await bcrypt.hash('Customer@12345', 10) });

  const cats = {};
  for (const name of CATS) cats[name] = await Category.create({ name, slug: slugify(name) });

  for (const p of PRODUCTS) {
    await Product.create({ name: p.name, slug: slugify(p.name), description: p.description, material: p.material, category: cats[p.cat]._id, images: p.images, variants: p.variants });
  }
  console.log(`Seeded ${CATS.length} categories, ${PRODUCTS.length} products.\nAdmin:    ${adminEmail} / ${adminPassword}\nCustomer: customer@gemica.test / Customer@12345`); // eslint-disable-line no-console
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); }); // eslint-disable-line no-console
