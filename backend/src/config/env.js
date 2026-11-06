const path = require('path');
const dotenv = require('dotenv');

// Always load backend/.env even when commands are run from the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
dotenv.config({ quiet: true });

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

const env = {
  isTest,
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gemica',
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'test-secret' : ''),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || (isTest ? 'rzp-test-secret' : ''),
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || (isTest ? 'rzp-test-webhook' : ''),
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'gemica',
    get enabled() { return !!(this.cloudName && this.apiKey && this.apiSecret); },
  },
  // Number of reverse proxies in front of the API (Render/Railway = 1; Vercel proxy + Render = 2).
  trustProxy: (() => { const v = process.env.TRUST_PROXY ?? '1'; return v === 'false' ? false : Number.isNaN(Number(v)) ? v : Number(v); })(),
  mailFrom: process.env.MAIL_FROM || 'Gemica <no-reply@gemica.example>',
  unpaidOrderExpiryMinutes: Number(process.env.UNPAID_ORDER_EXPIRY_MINUTES ?? 60), // 0 disables
  currency: process.env.CURRENCY || 'INR',
  shippingFlatFee: Number(process.env.SHIPPING_FLAT_FEE ?? 99),
  freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD ?? 1999),
  maxQtyPerItem: 10,
};

if (!isTest && !env.jwtSecret) {
  throw new Error('JWT_SECRET must be set in the environment');
}

module.exports = env;
