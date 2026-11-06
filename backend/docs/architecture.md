# ARCHITECTURE — Gemica

**Stack:** Node.js · Express.js · MongoDB (Mongoose) · React.js (Vite)

---

## 1. System Overview

```
┌──────────────────────┐   HTTPS / JSON    ┌───────────────────────────┐
│  React.js (Vite)     │ ────────────────► │  Express.js REST API      │
│  Storefront + Admin  │ ◄──────────────── │  /api/*                   │
└──────────────────────┘   HTTP-only       └─────────────┬─────────────┘
                           cookie (JWT)                  │
                                          ┌──────────────▼─────────────┐
                                          │ Middleware → Controllers → │
                                          │ Services → Mongoose Models │
                                          └──────────────┬─────────────┘
                                                         │
                                          ┌──────────────▼─────────────┐
                                          │  MongoDB                   │
                                          └────────────────────────────┘
                                          Razorpay (server-side only)
```

Request flow: **Route → validation middleware → auth middleware → controller → service (business logic) → model → response → central error handler.**

---

## 2. Technology Stack

| Area | Choice | Notes |
|---|---|---|
| Runtime | Node.js (LTS) | |
| Server | Express.js | REST, modular routers |
| Database | MongoDB + Mongoose | Schemas, indexes, transactions |
| Frontend | React.js + Vite | JavaScript, React Router, Context API |
| Styling | Plain CSS with CSS variables | No CSS framework |
| HTTP client | Native `fetch` wrapper | No Axios |
| Payments | Razorpay SDK | Only third-party service |
| Uploads | `multer` | Local `/uploads` or hosted URLs |

See `rules.md` for the approved dependency list.

---

## 3. Folder Structure

The repository root holds exactly two deployable apps plus `.gitignore`. Each can be deployed on its own.

```
gemica/
├── .gitignore
├── backend/                      Express REST API  (deploy to Render / Railway / any Node host)
│   ├── src/
│   │   ├── server.js             entry: connect DB, start listening, background jobs
│   │   ├── app.js                express app, middleware, routes
│   │   ├── config/               env, db (Atlas checks)
│   │   ├── models/               User, Product, Category, Cart, Wishlist, Order, Payment, Coupon, Review
│   │   ├── routes/               single router (grouped by resource)
│   │   ├── controllers/          thin HTTP handlers
│   │   ├── services/             pricing, orderStatus, stock, cart, coupon, order, payment, mailer, imageStore
│   │   ├── middleware/           auth, validate, error, rateLimit, upload
│   │   ├── validators/           zod schemas
│   │   ├── utils/                ApiError, asyncHandler, respond, money, slugify
│   │   ├── scripts/              check-env (Atlas connection check)
│   │   └── seed/                 demo data
│   ├── tests/                    node:test + Supertest + in-memory MongoDB
│   ├── uploads/                  local image uploads (development only; git-ignored)
│   ├── docs/                     api, architecture, prd, rules, memory, tracker
│   ├── .env  .env.example  docker-compose.yml  package.json  README.md
│   └── ...
└── frontend/                     React + Vite storefront and admin  (deploy to Vercel / Netlify)
    ├── index.html  vite.config.js  vercel.json  package.json  README.md
    ├── public/images/            placeholder art (hero, categories, seed products)
    ├── frontend/docs/design.md            design system
    └── src/
        ├── main.jsx
        ├── api/                  fetch wrapper + per-resource API modules
        ├── context/              Auth, Cart, Wishlist, Toast providers
        ├── components/           Header, Footer, ProductCard, Reviews, Field, States ...
        ├── pages/                customer pages (+ admin/)
        ├── routes/               route table + guards
        ├── styles/               tokens.css, base.css, components.css
        ├── utils/                format, guestCart, recentlyViewed, razorpay launcher
        └── test/                 component tests (Vitest)
```

---

## 4. REST API

Prefix `/api`. Response shape: `{ "success": true, "data": {...}, "message": "" }`. Errors: `{ "success": false, "message": "...", "errors": [...] }`.

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` |
| Catalogue | `GET /products` (query: `page, limit, category, minPrice, maxPrice, sort, q`) · `GET /products/:id` · `GET /categories` |
| Cart | `GET /cart` · `POST /cart/items` · `PATCH /cart/items/:itemId` · `DELETE /cart/items/:itemId` |
| Wishlist | `GET /wishlist` · `POST /wishlist/items` · `DELETE /wishlist/items/:productId` |
| Addresses | `GET /addresses` · `POST /addresses` |
| Orders | `POST /orders` · `GET /orders/my-orders` · `GET /orders/:id` |
| Payments | `POST /payments/create` · `POST /payments/verify` · `POST /payments/webhook` |
| Admin | `GET /admin/dashboard` · `POST /admin/products` · `PATCH /admin/products/:id` · `DELETE /admin/products/:id` · `GET /admin/orders` · `PATCH /admin/orders/:id/status` |

Existing endpoints are never renamed or have their response shape changed; new behaviour is added additively (see `rules.md`).

---

## 5. Data Models (Mongoose)

- **User** — name, email (unique index), passwordHash (`select: false`), role, addresses[].
- **Category** — name, slug (unique), isActive.
- **Product** — name, slug (unique), description, categoryId (index), material, images[], variants[{sku, size, price, stock, isActive}], isActive. Text index on name/description; compound index on `categoryId + isActive`.
- **Cart** — userId (unique), items[{productId, variantSku, quantity}].
- **Wishlist** — userId (unique), productIds[] (set semantics).
- **Order** — orderNumber (unique), userId (index), items[snapshot], shippingAddressSnapshot, amounts, paymentMethod, paymentStatus, orderStatus, idempotencyKey (unique, sparse).
- **Payment** — orderId (index), provider, providerPaymentReference (unique), amount, currency, status.

Enums:
- `orderStatus`: `placed → confirmed → processing → shipped → delivered`, plus `cancelled`.
- `paymentStatus`: `pending | paid | failed | refunded | cod_pending | cod_collected`.

---

## 6. Authentication and Authorization

- Register/login issue a signed JWT stored in an **HTTP-only, SameSite, Secure (production)** cookie.
- `auth` middleware verifies the cookie and loads the user; `role('admin')` middleware guards `/api/admin/*`.
- Ownership checks: every cart, address and order query filters by `req.user._id`.
- Passwords hashed with bcrypt; login is rate limited.
- Client-provided roles, totals, stock and payment status are ignored.

---

## 7. Checkout and Payment Flow

1. Client sends `POST /orders` with address, payment method and an `Idempotency-Key` header.
2. Server loads the cart, re-reads current prices and stock from MongoDB, computes totals.
3. In a transaction (or atomic `findOneAndUpdate` with `stock >= qty`), stock is decremented and the order is created with price/address snapshots.
4. **COD:** `paymentStatus = cod_pending`, order `placed`.
5. **Online:** `POST /payments/create` creates a Razorpay order for the server-computed amount; client opens Razorpay checkout.
6. `POST /payments/verify` validates the signature server-side; on success mark `paid` (idempotent).
7. `POST /payments/webhook` (raw body, signature verified) reconciles status; duplicate events are ignored.
8. Failed or abandoned payments release reserved stock; cancellation restores stock.

---

## 8. Frontend Architecture

- **Routing:** React Router; `ProtectedRoute` for customer pages, `AdminRoute` for admin pages.
- **State:** `AuthContext` (user, login, logout), `CartContext` (server cart for users, `localStorage` guest cart merged on login), `WishlistContext`.
- **API layer:** one `api/client.js` fetch wrapper (credentials included, JSON handling, error normalization) and small modules per resource.
- **UX states:** every data page handles loading, empty, error and success.

---

## 9. Security

Helmet headers, CORS allowlist, rate limiting on auth/payment routes, schema validation on all inputs, upload type/size limits, no stack traces in production, secrets in `.env`, structured logging that excludes passwords, tokens and payment secrets.

---

## 10. Testing Plan

| Level | Tools | Scope |
|---|---|---|
| Backend unit/integration | Jest, Supertest, mongodb-memory-server | Auth, products, cart, orders, payments, admin, access control |
| Frontend | Vitest, React Testing Library | Cart logic, forms, protected routes |
| Manual | Checklist in `tracker.md` | Full journeys, mobile layouts |

Mandatory security cases: other user's order, admin route as customer, tampered price, negative quantity, webhook replay, oversized upload.

---

## 11. Deployment

- **Frontend:** `vite build` → static hosting (e.g. Vercel/Netlify).
- **Backend:** Node host (e.g. Render/Railway); `NODE_ENV=production`.
- **Database:** MongoDB Atlas.
- **Env variables:**
  - Server: `PORT, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN, FRONTEND_URL, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET`
  - Client: `VITE_API_URL`
- Cookies require HTTPS and a correct CORS `credentials` configuration between the two origins.

---

## 12. Implementation Notes (as built)

- Tests use Node's built-in runner (`node:test`) with Supertest and `mongodb-memory-server`; Jest was dropped (it breaks the MongoDB driver handshake).
- Additive endpoints beyond the original list: `POST /cart/merge`, `POST /orders/:id/cancel`, `GET /health`, `GET /admin/products`, `GET /admin/products/:id`, `PATCH /admin/products/:id/stock`, `POST /admin/categories`, `POST /admin/uploads`.
- `Payment` stores `providerOrderId` and `providerPaymentId`; `Order.paymentStatus` also includes `refund_pending`.
- Stock is reserved with atomic conditional updates and compensating rollback (no multi-document transactions required).
- Validation is done with `zod` and exposed to controllers as `req.valid`.

## 13. Phase 2 additions (as built)

- New models: `Coupon`, `Review`. `User` gained `tokenVersion`, reset-token fields; `Product` gained `ratingAvg`/`ratingCount`; `Order` gained `couponCode`.
- New services: `mailer` (nodemailer; console/in-memory fallback), `couponService`. `orderService` now handles coupons, confirmation email and `expireUnpaidOrders` (run every 5 minutes by `server.js`). `paymentService` gained `refundOrder` (claims the order first, so a double click cannot refund twice).
- Config: `config/db.js` rejects the placeholder `MONGO_URI` and translates common Atlas failures into plain advice.
- Frontend: Reviews, Stars, ProductRow components; ForgotPassword, ResetPassword, Invoice and admin Coupons pages; recently-viewed list in `localStorage`.
