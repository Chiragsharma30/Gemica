const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { authLimiter, paymentLimiter } = require('../middleware/rateLimit');
const { uploadImage } = require('../middleware/upload');
const S = require('../validators/schemas');

const auth = require('../controllers/authController');
const product = require('../controllers/productController');
const category = require('../controllers/categoryController');
const cart = require('../controllers/cartController');
const wishlist = require('../controllers/wishlistController');
const address = require('../controllers/addressController');
const order = require('../controllers/orderController');
const payment = require('../controllers/paymentController');
const admin = require('../controllers/adminController');
const review = require('../controllers/reviewController');
const coupon = require('../controllers/couponController');
const asyncHandler = require('../utils/asyncHandler');

const h = asyncHandler;
const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' }, message: '' }));

// Auth
router.post('/auth/register', authLimiter, validate({ body: S.auth.register }), h(auth.register));
router.post('/auth/login', authLimiter, validate({ body: S.auth.login }), h(auth.login));
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/me', requireAuth, validate({ body: S.auth.profile }), h(auth.updateProfile));
router.post('/auth/change-password', requireAuth, authLimiter, validate({ body: S.auth.changePassword }), h(auth.changePassword));
router.post('/auth/forgot-password', authLimiter, validate({ body: S.auth.forgot }), h(auth.forgotPassword));
router.post('/auth/reset-password', authLimiter, validate({ body: S.auth.reset }), h(auth.resetPassword));

// Catalogue
router.get('/products', validate({ query: S.products.listQuery }), h(product.list));
router.get('/products/:id', validate({ params: S.products.idOrSlug }), h(product.getOne));
router.get('/products/:id/related', validate({ params: S.products.idOrSlug }), h(product.related));
router.get('/products/:id/reviews', validate({ params: S.products.idOrSlug, query: S.reviews.listQuery }), h(review.list));
router.post('/products/:id/reviews', requireAuth, validate({ params: S.products.idOrSlug, body: S.reviews.create }), h(review.create));
router.get('/categories', h(category.list));
router.post('/coupons/validate', requireAuth, validate({ body: S.coupons.validate }), h(coupon.validate));

// Cart
router.get('/cart', requireAuth, h(cart.get));
router.post('/cart/items', requireAuth, validate({ body: S.cart.add }), h(cart.add));
router.post('/cart/merge', requireAuth, validate({ body: S.cart.merge }), h(cart.merge));
router.patch('/cart/items/:itemId', requireAuth, validate({ params: S.cart.itemParams, body: S.cart.update }), h(cart.update));
router.delete('/cart/items/:itemId', requireAuth, validate({ params: S.cart.itemParams }), h(cart.remove));

// Wishlist
router.get('/wishlist', requireAuth, h(wishlist.get));
router.post('/wishlist/items', requireAuth, validate({ body: S.wishlist.add }), h(wishlist.add));
router.delete('/wishlist/items/:productId', requireAuth, validate({ params: S.wishlist.params }), h(wishlist.remove));

// Addresses
router.get('/addresses', requireAuth, address.list);
router.post('/addresses', requireAuth, validate({ body: S.addressBody }), h(address.create));

// Orders
router.post('/orders', requireAuth, validate({ body: S.orders.create }), h(order.create));
router.get('/orders/my-orders', requireAuth, validate({ query: S.orders.listQuery }), h(order.myOrders));
router.get('/orders/:id', requireAuth, validate({ params: S.idParam }), h(order.getOne));
router.post('/orders/:id/cancel', requireAuth, validate({ params: S.idParam }), h(order.cancel));

// Payments (webhook raw-body parsing is mounted in app.js)
router.post('/payments/create', requireAuth, paymentLimiter, validate({ body: S.payments.create }), h(payment.create));
router.post('/payments/verify', requireAuth, paymentLimiter, validate({ body: S.payments.verify }), h(payment.verify));
router.post('/payments/webhook', h(payment.webhook));

// Admin
const adminOnly = [requireAuth, requireRole('admin')];
router.get('/admin/dashboard', adminOnly, h(admin.dashboard));
router.get('/admin/products', adminOnly, validate({ query: S.admin.productListQuery }), h(admin.listProducts));
router.get('/admin/products/:id', adminOnly, validate({ params: S.idParam }), h(admin.getProduct));
router.post('/admin/products', adminOnly, validate({ body: S.admin.productCreate }), h(admin.createProduct));
router.patch('/admin/products/:id', adminOnly, validate({ params: S.idParam, body: S.admin.productUpdate }), h(admin.updateProduct));
router.delete('/admin/products/:id', adminOnly, validate({ params: S.idParam }), h(admin.archiveProduct));
router.patch('/admin/products/:id/stock', adminOnly, validate({ params: S.idParam, body: S.admin.stock }), h(admin.setStock));
router.post('/admin/categories', adminOnly, validate({ body: S.admin.categoryCreate }), h(admin.createCategory));
router.post('/admin/uploads', adminOnly, uploadImage, h(admin.uploadImage));
router.get('/admin/coupons', adminOnly, h(admin.listCoupons));
router.post('/admin/coupons', adminOnly, validate({ body: S.admin.couponCreate }), h(admin.createCoupon));
router.patch('/admin/coupons/:id', adminOnly, validate({ params: S.idParam, body: S.admin.couponUpdate }), h(admin.updateCoupon));
router.post('/admin/orders/:id/refund', adminOnly, validate({ params: S.idParam }), h(admin.refundOrder));
router.get('/admin/orders', adminOnly, validate({ query: S.admin.orderListQuery }), h(admin.listOrders));
router.patch('/admin/orders/:id/status', adminOnly, validate({ params: S.idParam, body: S.admin.orderStatus }), h(admin.updateOrderStatus));

module.exports = router;
