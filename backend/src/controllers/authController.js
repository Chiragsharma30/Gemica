const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendMailSafe } = require('../services/mailer');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/respond');
const { COOKIE } = require('../middleware/auth');

const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const issue = (res, user) => {
  const token = jwt.sign({ id: user._id, v: user.tokenVersion }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.cookie(COOKIE, token, cookieOptions);
};

exports.register = async (req, res) => {
  const { name, email, password } = req.valid.body;
  if (await User.exists({ email: email.toLowerCase() })) throw ApiError.conflict('Email is already registered');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: 'customer' }); // role never from client
  issue(res, user);
  created(res, { user: user.toSafeJSON() }, 'Registered');
};

exports.login = async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) throw ApiError.unauthorized('Invalid email or password');
  issue(res, user);
  ok(res, { user: user.toSafeJSON() }, 'Logged in');
};

exports.logout = (req, res) => {
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined });
  ok(res, null, 'Logged out');
};

exports.me = (req, res) => ok(res, { user: req.user.toSafeJSON() });

exports.updateProfile = async (req, res) => {
  req.user.name = req.valid.body.name;
  await req.user.save();
  ok(res, { user: req.user.toSafeJSON() }, 'Profile updated');
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw ApiError.badRequest('Current password is incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.tokenVersion += 1; // signs out every other device
  await user.save();
  issue(res, user); // keep this device signed in
  ok(res, null, 'Password changed');
};

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

// Always answers the same way so it cannot be used to discover which emails are registered.
exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.valid.body.email.toLowerCase() });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = hashToken(token);
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    await sendMailSafe({
      to: user.email,
      subject: 'Reset your Gemica password',
      text: `Hi ${user.name},\n\nUse this link within 1 hour to choose a new password:\n${env.frontendUrl}/reset-password?token=${token}\n\nIf you did not ask for this, you can ignore this email.\n\n- Gemica`,
    });
  }
  ok(res, null, 'If that email is registered, a reset link has been sent.');
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.valid.body;
  const user = await User.findOne({ resetTokenHash: hashToken(token), resetExpires: { $gt: new Date() } }).select('+resetTokenHash +resetExpires');
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');
  user.passwordHash = await bcrypt.hash(password, 10);
  user.tokenVersion += 1;
  user.resetTokenHash = undefined;
  user.resetExpires = undefined;
  await user.save();
  ok(res, null, 'Password updated. You can now log in.');
};
