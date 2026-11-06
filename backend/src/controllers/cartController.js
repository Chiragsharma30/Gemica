const cartService = require('../services/cartService');
const { ok } = require('../utils/respond');

const view = async (cart) => ({ cart: await cartService.describeCart(cart) });

exports.get = async (req, res) => ok(res, await view(await cartService.getOrCreateCart(req.user._id)));
exports.add = async (req, res) => ok(res, await view(await cartService.addItem(req.user._id, req.valid.body)), 'Added to cart', 200);
exports.update = async (req, res) =>
  ok(res, await view(await cartService.setQuantity(req.user._id, req.valid.params.itemId, req.valid.body.quantity)));
exports.remove = async (req, res) => ok(res, await view(await cartService.removeItem(req.user._id, req.valid.params.itemId)));
exports.merge = async (req, res) => ok(res, await view(await cartService.mergeItems(req.user._id, req.valid.body.items)));
