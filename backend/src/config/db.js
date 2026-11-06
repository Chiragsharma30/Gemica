const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');

// On Windows / certain ISPs, default DNS fails or refuses SRV queries for mongodb+srv://.
// Setting public DNS (Google, Cloudflare) ensures SRV records resolve reliably.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // In environments where custom DNS servers cannot be set, keep default.
}

const PLACEHOLDER = /YOUR_|<\s*(db_)?(username|password|user|cluster)|xxxxx|\bcluster0\.example/i;

class DbConfigError extends Error {}

// Fails fast with an actionable message instead of a cryptic driver error.
function assertMongoUri(uri) {
  if (!uri || PLACEHOLDER.test(uri)) {
    throw new DbConfigError(
      [
        'MONGO_URI is still the placeholder value.',
        '  1. Open backend/.env',
        '  2. Replace MONGO_URI with your MongoDB Atlas connection string, e.g.',
        '     mongodb+srv://<user>:<password>@<cluster>.mongodb.net/gemica?retryWrites=true&w=majority',
        '  3. In Atlas: Database Access -> create a user; Network Access -> allow your IP (or 0.0.0.0/0 for development).',
        '     If your password has special characters (@ : / ? # %), URL-encode them.',
      ].join('\n')
    );
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) throw new DbConfigError('MONGO_URI must start with mongodb:// or mongodb+srv://');
}

function explain(err) {
  const m = String(err && err.message);
  if (/bad auth|authentication failed/i.test(m)) return 'Atlas rejected the username or password. Check Database Access, and URL-encode special characters in the password.';
  if (/ENOTFOUND|querySrv|ECONNREFUSED.*srv/i.test(m)) return 'Could not resolve the cluster address. Check the host in MONGO_URI and your internet connection.';
  if (/Server selection timed out|ReplicaSetNoPrimary|MongoServerSelectionError/i.test(m)) return 'Could not reach the database. In Atlas -> Network Access, add your current IP address (or 0.0.0.0/0 for development).';
  return m;
}

async function connectDB(uri = env.mongoUri) {
  assertMongoUri(uri);
  mongoose.set('strictQuery', true);
  const options = { serverSelectionTimeoutMS: 10000 };
  const pathWithoutQuery = uri.replace(/\?.*$/, '').replace(/^mongodb(\+srv)?:\/\/[^/]+/, '');
  if (!pathWithoutQuery || pathWithoutQuery === '/') {
    options.dbName = 'gemica';
  }
  try {
    await mongoose.connect(uri, options);
  } catch (err) {
    throw new DbConfigError(`MongoDB connection failed: ${explain(err)}`);
  }
  return mongoose.connection;
}

module.exports = connectDB;
module.exports.assertMongoUri = assertMongoUri;
module.exports.DbConfigError = DbConfigError;
