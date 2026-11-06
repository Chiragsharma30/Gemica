// Verifies backend/.env is ready (Atlas string filled in, JWT secret present) and can reach the database.
const env = require('../config/env');
const connectDB = require('../config/db');
const mongoose = require('mongoose');

(async () => {
  connectDB.assertMongoUri(env.mongoUri);
  if (process.argv.includes('--connect')) {
    await connectDB();
    const db = mongoose.connection;
    const users = await db.collection('users').countDocuments();
    console.log(`MongoDB connection OK (database "${db.name}", ${users} user(s)).`); // eslint-disable-line no-console
    await mongoose.disconnect();
  } else {
    console.log('backend/.env looks ready.'); // eslint-disable-line no-console
  }
})().catch((err) => {
  console.error(`\n${err.message}\n`); // eslint-disable-line no-console
  process.exit(1);
});
