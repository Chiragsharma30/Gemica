# API Reference — Gemica

Base path `/api`. All responses: `{ "success": true|false, "data": ..., "message": "" }`. Errors add `errors: [{ path, message }]` for validation failures.
Auth is an HTTP-only cookie (`gemica_token`) set by login/register. Send requests with credentials.

## Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `name, email, password(8+)` | Always creates a `customer`; 409 on duplicate email |
| POST | `/auth/login` | `email, password` | 401 on bad credentials; rate limited |
| POST | `/auth/logout` | — | Clears cookie |
| GET | `/auth/me` | — | 401 if no session |
| PATCH | `/auth/me` | `name` | Update profile |
| POST | `/auth/change-password` | `currentPassword, newPassword(8+)` | Signs out other devices; this one stays signed in |
| POST | `/auth/forgot-password` | `email` | Always 200 (does not reveal if the email exists); emails a 1-hour link |
| POST | `/auth/reset-password` | `token, password(8+)` | Single-use token; signs out all devices |

## Catalogue (public)
| Method | Path | Query / Notes |
|---|---|---|
| GET | `/products` | `page, limit(≤50), category(slug or id), minPrice, maxPrice, sort(newest\|price_asc\|price_desc\|popular), q` |
| GET | `/products/:idOrSlug` | Active products only |
| GET | `/categories` | Active categories |
| GET | `/products/:idOrSlug/related` | Up to 4 from the same category |
| GET | `/products/:idOrSlug/reviews` | `page, limit(≤30)`; first names only; includes `ratingAvg`, `ratingCount` |
| POST | `/products/:idOrSlug/reviews` | Auth. `rating(1–5), title?, comment`. 403 unless the customer has a **delivered** order containing the product. One review per customer (re-posting edits it) |

## Coupons (auth)
`POST /coupons/validate {code}` previews the discount against the current cart (nothing is consumed). Apply at checkout by sending `couponCode` to `POST /orders`. Percent or flat, optional minimum order, cap, usage limit and expiry; a use is returned if the order is cancelled.

## Cart (auth)
| Method | Path | Body |
|---|---|---|
| GET | `/cart` | Priced from current catalogue; lines flagged `unavailable` / `insufficient_stock` |
| POST | `/cart/items` | `productId, variantSku, quantity(1–10)` |
| POST | `/cart/merge` | `items[]` — merges the guest cart after login |
| PATCH | `/cart/items/:itemId` | `quantity` |
| DELETE | `/cart/items/:itemId` | — |

## Wishlist, Addresses (auth)
`GET /wishlist` · `POST /wishlist/items {productId}` · `DELETE /wishlist/items/:productId` · `GET /addresses` · `POST /addresses {fullName, phone, line1, line2?, city, state, pincode(6 digits), isDefault?}`

## Orders (auth, owner only)
| Method | Path | Notes |
|---|---|---|
| POST | `/orders` | Body `{ addressId \| address, paymentMethod: "cod"\|"razorpay" }`. Optional header `Idempotency-Key`. Server computes totals; 409 if stock changed |
| GET | `/orders/my-orders` | `page, limit` |
| GET | `/orders/:id` | 404 for other users' orders |
| POST | `/orders/:id/cancel` | Only while `placed`/`confirmed`; restores stock |

## Payments
| Method | Path | Notes |
|---|---|---|
| POST | `/payments/create` | `{ orderId }` → Razorpay order for the server-computed amount |
| POST | `/payments/verify` | `razorpay_order_id, razorpay_payment_id, razorpay_signature` — HMAC verified server-side |
| POST | `/payments/webhook` | Razorpay-signed raw body; idempotent |

## Admin (role `admin`)
`GET /admin/dashboard` (adds `salesByDay` for 14 days and `topProducts`) · `GET /admin/coupons` · `POST /admin/coupons` · `PATCH /admin/coupons/:id {isActive, usageLimit, minOrder, expiresAt}` · `POST /admin/orders/:id/refund` (cancelled paid online orders only; issues a Razorpay refund once) · `GET /admin/products` · `GET /admin/products/:id` · `POST /admin/products` · `PATCH /admin/products/:id` · `DELETE /admin/products/:id` (archive) · `PATCH /admin/products/:id/stock {sku, stock}` · `POST /admin/categories {name}` · `POST /admin/uploads` (multipart `image`, JPG/PNG/WebP ≤ 2 MB) · `GET /admin/orders` (`page, limit, status, q`) · `PATCH /admin/orders/:id/status {status}`

Order status flow: `placed → confirmed → processing → shipped → delivered`; `cancelled` allowed before `shipped`. Online-payment orders must be `paid` before they progress.

## Status codes
`200/201` success · `400` validation or invalid transition · `401` not signed in · `403` wrong role · `404` not found (also used to hide other users' resources) · `409` conflict (duplicate, stock) · `429` rate limited · `502` payment provider error (e.g. refund) · `503` payments not configured.
