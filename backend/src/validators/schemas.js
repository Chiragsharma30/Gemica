const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const page = z.coerce.number().int().min(1).default(1);
const limit = (max = 50, def = 12) => z.coerce.number().int().min(1).max(max).default(def);

const idParam = z.object({ id: objectId });

const auth = {
  register: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.email().max(200),
    password: z.string().min(8).max(128),
  }),
  login: z.object({ email: z.email().max(200), password: z.string().min(1).max(128) }),
  forgot: z.object({ email: z.email().max(200) }),
  reset: z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128) }),
  profile: z.object({ name: z.string().trim().min(1).max(100) }),
  changePassword: z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) }),
};

const reviews = {
  create: z.object({
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(100).optional().default(''),
    comment: z.string().trim().min(1).max(1000),
  }),
  listQuery: z.object({ page, limit: limit(30, 10) }),
};

const coupons = { validate: z.object({ code: z.string().trim().min(1).max(30) }) };

const products = {
  listQuery: z.object({
    page,
    limit: limit(50, 12),
    category: z.string().trim().max(100).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).default('newest'),
    q: z.string().trim().max(100).optional(),
  }),
  idOrSlug: z.object({ id: z.string().trim().min(1).max(120) }),
};

const cart = {
  add: z.object({
    productId: objectId,
    variantSku: z.string().trim().min(1).max(60),
    quantity: z.coerce.number().int().min(1).max(10).default(1),
  }),
  update: z.object({ quantity: z.coerce.number().int().min(1).max(10) }),
  itemParams: z.object({ itemId: objectId }),
  merge: z.object({
    items: z
      .array(
        z.object({
          productId: objectId,
          variantSku: z.string().trim().min(1).max(60),
          quantity: z.coerce.number().int().min(1).max(10),
        })
      )
      .max(50),
  }),
};

const wishlist = {
  add: z.object({ productId: objectId }),
  params: z.object({ productId: objectId }),
};

const addressBody = z.object({
  fullName: z.string().trim().min(1).max(100),
  phone: z.string().trim().regex(/^[0-9+\-\s]{8,15}$/, 'Invalid phone number'),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  isDefault: z.boolean().optional().default(false),
});

const orders = {
  create: z
    .object({
      addressId: objectId.optional(),
      address: addressBody.omit({ isDefault: true }).optional(),
      paymentMethod: z.enum(['cod', 'razorpay']),
      couponCode: z.string().trim().max(30).optional(),
    })
    .refine((b) => b.addressId || b.address, { message: 'addressId or address is required', path: ['addressId'] }),
  listQuery: z.object({ page, limit: limit(50, 10) }),
};

const payments = {
  create: z.object({ orderId: objectId }),
  verify: z.object({
    razorpay_order_id: z.string().min(1).max(100),
    razorpay_payment_id: z.string().min(1).max(100),
    razorpay_signature: z.string().min(1).max(200),
  }),
};

const variant = z.object({
  sku: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(60).default('Standard'),
  price: z.number().min(0).max(10000000),
  stock: z.number().int().min(0).max(100000),
  isActive: z.boolean().optional().default(true),
});
// Allowed photo references: files uploaded to this API, the frontend's own /images assets (demo art), or https links.
const imageRef = z.string().max(500).refine(
  (s) => /^\/(uploads|images)\/[\w-][\w.-]*$/.test(s) || /^https:\/\/[^\s]+$/.test(s),
  'Invalid image reference'
);

const productBody = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().max(5000).optional().default(''),
  category: objectId,
  material: z.string().trim().max(100).optional().default(''),
  specifications: z.record(z.string(), z.string().max(200)).optional(),
  images: z.array(imageRef).max(10).optional().default([]),
  variants: z.array(variant).min(1).max(30),
  isActive: z.boolean().optional().default(true),
});

const couponBody = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only'),
  type: z.enum(['percent', 'flat']),
  value: z.number().positive().max(10000000),
  minOrder: z.number().min(0).optional().default(0),
  maxDiscount: z.number().min(0).optional().default(0),
  usageLimit: z.number().int().min(0).optional().default(0),
  expiresAt: z.coerce.date().nullable().optional(),
});

const admin = {
  couponCreate: couponBody.refine((c) => c.type !== 'percent' || c.value <= 100, { message: 'Percent cannot exceed 100', path: ['value'] }),
  couponUpdate: z.object({
    isActive: z.boolean().optional(),
    usageLimit: z.number().int().min(0).optional(),
    minOrder: z.number().min(0).optional(),
    expiresAt: z.coerce.date().nullable().optional(),
  }),
  productCreate: productBody,
  productUpdate: productBody.partial(),
  productListQuery: z.object({ page, limit: limit(100, 20), q: z.string().trim().max(100).optional(), includeArchived: z.enum(['true', 'false']).default('true') }),
  stock: z.object({ sku: z.string().trim().min(1), stock: z.number().int().min(0).max(100000) }),
  categoryCreate: z.object({ name: z.string().trim().min(1).max(60) }),
  orderStatus: z.object({ status: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']) }),
  orderListQuery: z.object({
    page,
    limit: limit(100, 20),
    status: z.enum(['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
    q: z.string().trim().max(100).optional(),
  }),
};

module.exports = { idParam, auth, reviews, coupons, products, cart, wishlist, addressBody, orders, payments, admin };
