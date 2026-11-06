const ok = (res, data = null, message = '', status = 200) =>
  res.status(status).json({ success: true, data, message });
const created = (res, data = null, message = '') => ok(res, data, message, 201);
module.exports = { ok, created };
