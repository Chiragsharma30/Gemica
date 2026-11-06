const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const orderService = require('./services/orderService');

(async () => {
  await connectDB();
  console.log('MongoDB connected'); // eslint-disable-line no-console
  const server = app.listen(env.port, () => console.log(`Gemica API listening on http://localhost:${env.port}`)); // eslint-disable-line no-console

  let timer;
  if (env.unpaidOrderExpiryMinutes > 0) {
    // Cancel unpaid online orders and release their stock.
    timer = setInterval(() => {
      orderService.expireUnpaidOrders({ minutes: env.unpaidOrderExpiryMinutes })
        .then((n) => n && console.log(`Expired ${n} unpaid order(s)`)) // eslint-disable-line no-console
        .catch((e) => console.error('Expiry job failed', e.message)); // eslint-disable-line no-console
    }, 5 * 60 * 1000);
    timer.unref();
  }
  const shutdown = () => { clearInterval(timer); server.close(() => process.exit(0)); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((err) => {
  console.error(`\n${err.message}\n`); // eslint-disable-line no-console
  process.exit(1);
});
