const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/respond');

exports.list = (req, res) => ok(res, { addresses: req.user.addresses });

exports.create = async (req, res) => {
  const user = req.user;
  if (user.addresses.length >= 10) throw ApiError.badRequest('Maximum 10 saved addresses');
  const body = req.valid.body;
  if (body.isDefault || user.addresses.length === 0) {
    user.addresses.forEach((a) => { a.isDefault = false; });
    body.isDefault = true;
  }
  user.addresses.push(body);
  await user.save();
  created(res, { addresses: user.addresses }, 'Address saved');
};
