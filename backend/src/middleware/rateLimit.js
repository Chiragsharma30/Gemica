const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const make = (max, windowMs) =>
  env.isTest
    ? (req, res, next) => next()
    : rateLimit({
        windowMs,
        limit: max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: 'Too many requests, please try again later' },
      });

module.exports = {
  authLimiter: make(20, 15 * 60 * 1000),
  paymentLimiter: make(60, 15 * 60 * 1000),
};
