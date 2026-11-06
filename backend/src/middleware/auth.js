const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

const COOKIE = 'gemica_token';

async function userFromRequest(req) {
  const token = req.cookies && req.cookies[COOKIE];
  if (!token) return null;
  try {
    const { id, v } = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(id);
    return user && (v ?? 0) === user.tokenVersion ? user : null;
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  try {
    const user = await userFromRequest(req);
    if (!user) throw ApiError.unauthorized();
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user && req.user.role) ? next() : next(ApiError.forbidden('Insufficient permissions'));

module.exports = { requireAuth, requireRole, COOKIE };
