const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const { UPLOAD_DIR } = require('./middleware/upload');

const app = express();
app.disable('x-powered-by');
if (env.isProd) app.set('trust proxy', env.trustProxy);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // allow client origin to load /uploads images
app.use(cors({ origin: env.frontendUrl, credentials: true }));

// Razorpay signs the exact raw bytes, so the webhook must be parsed raw BEFORE express.json().
app.use('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
