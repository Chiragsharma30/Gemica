# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Gemica — Jewellery E-commerce Platform

**Version:** 1.0
**Status:** Proposed
**Stack (strict):** Node.js, Express.js, MongoDB, React.js
**Target:** Portfolio project, placement interviews, future production expansion

---

## 1. Executive Summary

Gemica is a full-stack e-commerce platform where customers browse, compare and buy jewellery online. It offers categories, filtering, product variants, cart, wishlist, checkout, order tracking and customer accounts. An admin dashboard lets administrators manage products, inventory, orders and basic sales statistics.

### Product Vision
A simple, visually appealing and reliable jewellery shopping experience with easy product discovery, transparent pricing and smooth order management.

### Assumptions
- Catalogue: fashion and imitation jewellery.
- Payments: Cash on Delivery (COD) and online payment (Razorpay).
- Single store, single admin-managed catalogue.
- Currency is configurable; initial currency is INR.
- Product images are stored as files on disk (via `multer`) or as hosted URLs, never as binary data inside MongoDB.

---

## 2. Problem Statement

Customers need a frictionless way to discover jewellery, understand specifications and complete purchases. Store owners need an efficient way to update products, manage stock and process orders. Gemica provides a storefront, REST API, database and admin dashboard in one application.

## 3. Product Objectives

1. Responsive, premium-looking storefront.
2. Search, filter and view jewellery products.
3. Authentication, persistent cart and wishlist.
4. Checkout, payment processing and order history.
5. Admin management of products, inventory and orders.
6. Proper authentication, authorization, validation and error handling.
7. A deployed, demo-ready application.

### Success Criteria
- Customers can complete the entire shopping journey.
- Product data and prices come from the backend.
- Stock cannot be purchased beyond available quantity.
- Order creation and payment status are reliable.
- Unauthorized users cannot reach admin APIs.
- Core customer and admin flows pass functional tests.
- App works on desktop and mobile.

---

## 4. Target Users

**Guest Customer** — browses, searches, filters, views details, uses a temporary cart, must log in to check out.

**Registered Customer** — manages account and addresses, keeps persistent cart and wishlist, places orders, pays, views order history, requests cancellation where eligible.

**Administrator** — adds/edits/archives products, uploads images, manages variants and stock, processes orders, updates fulfilment status, views sales statistics.

---

## 5. Scope and Priorities

### Phase 1 — MVP
- Responsive homepage and navigation
- Catalogue, product details
- Search, filter, sort, pagination
- Register, login, logout
- Cart and wishlist
- Address management
- Checkout and order creation
- COD and Razorpay payment
- Customer order history
- Admin auth and authorization
- Product, inventory and order management
- Loading, empty, success and error states

### Phase 2 — Enhancements
Reviews and ratings, coupons, email confirmations, invoices, returns/refunds, advanced analytics, recently viewed, related products, SEO, shipping integrations, password recovery.

### Out of Scope (MVP)
Multi-vendor marketplace, native mobile apps, AI recommendations, AR try-on, loyalty programmes, multi-warehouse inventory.

---

## 6. Functional Requirements

### FR-01 Homepage
- Hero banner with primary shop action; featured collections and categories; bestseller/featured cards; navigation to shop, wishlist, cart, account; footer with contact, policy and support links; responsive layout.
- **Acceptance:** visitor reaches catalogue from home; featured products load from backend; layout works on mobile, tablet, desktop.

### FR-02 Product Catalogue
- Show name, image, price, availability.
- Filter by category (rings, necklaces, earrings, bracelets, others) and price range.
- Sort by price, newest, popularity.
- Pagination; clear empty and error states.
- **Acceptance:** filters/sort return matching results; inactive products hidden; pagination never loads the full catalogue.

### FR-03 Product Details
- Multiple images, description, price, material, specifications.
- Variants (ring size, chain length), stock availability, quantity within limits.
- Add to Cart and Add to Wishlist.
- **Acceptance:** required variant must be selected; out-of-stock variants cannot be bought; backend re-validates price and stock at order time.

### FR-04 Authentication and Account
- Register (name, email, password), login, logout; field and email validation.
- Hash passwords with bcrypt; authenticate via secure HTTP-only cookie (JWT).
- Protected customer pages. Password recovery is Phase 2.
- **Acceptance:** duplicate email rejected; invalid credentials create no session; customers cannot see others' data; failures return proper error codes.

### FR-05 Shopping Cart
- Add, change quantity, remove; variant selection; subtotal and estimate.
- Persist for logged-in users; guest cart merged after login.
- Backend validates availability and current price.
- **Acceptance:** totals update; invalid quantities rejected; stale/unavailable items flagged before checkout; client cannot change the payable amount.

### FR-06 Wishlist
- Add, remove, view, move to cart.
- **Acceptance:** tied to authenticated user; no duplicates; unavailable products cannot be bought.

### FR-07 Checkout
- Login required for MVP; select/enter address; order summary; subtotal, shipping, discount, tax, total; payment method choice.
- Backend revalidates price, stock and delivery eligibility; prevents duplicate submissions.
- **Acceptance:** address fields validated; server calculates final total; no order with invalid product or insufficient stock; errors do not empty the cart.

### FR-08 Payments
- Razorpay order created from backend; result verified on server; failures and cancellations handled; webhook verified; no raw card data stored; payment status tracked separately from order status.
- **Acceptance:** frontend success alone never marks an order paid; invalid signatures rejected; duplicate callbacks cause no duplicate actions; COD recorded with correct state.

### FR-09 Orders and Tracking
- Unique order number; items stored as snapshots (name, variant, unit price, quantity); history and details; payment and fulfilment status; cancellation when allowed.
- **Acceptance:** customers only see own orders; historical prices never change; invalid status transitions rejected; stock and payment consistent on cancellation.

### FR-10 Admin Dashboard
- Admin-only access; order, revenue and inventory summaries; create/edit/archive products; categories and variants; image upload; stock adjustment; view/update orders; search orders by ID or customer.
- **Acceptance:** non-admins blocked even via manual requests; invalid data rejected; stock persists; status updates follow allowed transitions; archived products remain in order history.

---

## 7. User Journeys

**A — Customer Purchase:** home → browse/search → filter → product → variant + quantity → cart → login/register → review cart → address → payment method → backend validates → order created, payment processed → confirmation and history.

**B — Admin Adds Product:** login → product page → create → description, price, category, images, variants → initial stock → backend validates and saves → visible when active.

**C — Order Fulfilment:** admin opens orders → views new order → confirms payment/COD → processes and dispatches → updates status → customer sees status → delivery recorded at final state.

---

## 8. Technical Stack (Strict)

| Layer | Technology |
|---|---|
| Frontend | React.js (Vite), JavaScript, React Router, Context API, plain CSS (CSS variables) |
| Backend | Node.js, Express.js, REST API |
| Database | MongoDB with Mongoose |
| Integrations | Razorpay (online payment) only |

No other frameworks or libraries are added unless approved in `rules.md`.

---

## 9. Data Model

**User:** `_id`, `name`, `email` (unique), `passwordHash`, `role` (customer/admin), `addresses`, timestamps.

**Product:** `_id`, `name`, `slug`, `description`, `categoryId`, `material`, `images`, `variants[]`, `isActive`, timestamps. Variant: `sku`, `size`/attribute, `price`, `stock`, `isActive`.

**Category:** `_id`, `name`, `slug`, `isActive`.

**Cart:** `_id`, `userId`, `items[]` (productId, variantSku, quantity), `updatedAt`.

**Wishlist:** `_id`, `userId`, `productIds[]`, `updatedAt`.

**Order:** `_id`, `orderNumber`, `userId`, `items[]` (snapshots), `shippingAddressSnapshot`, `subtotal`, `shippingFee`, `discountAmount`, `taxAmount`, `totalAmount`, `paymentMethod`, `paymentStatus`, `orderStatus`, `idempotencyKey`, timestamps.

**Payment:** `_id`, `orderId`, `provider`, `providerPaymentReference`, `amount`, `currency`, `status`, timestamps. No card details.

**Review (Phase 2):** `_id`, `userId`, `productId`, `rating`, `comment`, `createdAt`.

---

## 10. API Requirements

All routes use the `/api` prefix.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register customer |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/products` | List and filter products |
| GET | `/api/products/:id` | Product details |
| GET | `/api/categories` | List categories |
| GET | `/api/cart` | Get cart |
| POST | `/api/cart/items` | Add item |
| PATCH | `/api/cart/items/:itemId` | Update quantity |
| DELETE | `/api/cart/items/:itemId` | Remove item |
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/wishlist/items` | Add product |
| DELETE | `/api/wishlist/items/:productId` | Remove product |
| GET | `/api/addresses` | List addresses |
| POST | `/api/addresses` | Create address |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/my-orders` | Customer's orders |
| GET | `/api/orders/:id` | Order details |
| POST | `/api/payments/create` | Start online payment |
| POST | `/api/payments/verify` | Verify payment |
| POST | `/api/payments/webhook` | Provider events |
| GET | `/api/admin/dashboard` | Admin metrics |
| POST | `/api/admin/products` | Create product |
| PATCH | `/api/admin/products/:id` | Update product |
| DELETE | `/api/admin/products/:id` | Archive product |
| GET | `/api/admin/orders` | Admin order list |
| PATCH | `/api/admin/orders/:id/status` | Update order status |

**Conventions:** correct HTTP status codes; validate body, query and IDs; consistent JSON shape `{ success, data, message }`; paginate lists; never trust client totals, roles, stock or payment status; never expose stack traces or secrets.

---

## 11. Security Requirements
1. bcrypt password hashing.
2. Secure HTTP-only cookies.
3. HTTPS in production.
4. Validate and sanitize all input.
5. Server-side role checks on admin APIs.
6. Ownership checks for cart, addresses, orders.
7. Rate limit login and sensitive endpoints.
8. CORS limited to trusted origins.
9. Secrets in environment variables.
10. Validate upload type and size.
11. Verify payment signatures and webhooks.
12. Prevent duplicate orders and overselling.
13. Use transactions or atomic updates where needed.
14. Log security and order events without passwords, tokens or payment secrets.

---

## 12. Non-Functional Requirements
- **Performance:** pagination, indexes, optimized images, no redundant API calls.
- **Usability:** clear navigation, accessible labels, keyboard support, visible focus, loading/empty/error states.
- **Reliability:** graceful network and payment failures; retry-safe order and payment handling; preserved order history.
- **Maintainability:** separate routes, controllers, models, middleware, services; reusable components; documented API and setup.
- **Compatibility:** current major browsers; responsive layouts.

---

## 13. Design Direction
Premium, elegant, minimal. Ivory/cream background, muted gold accent, charcoal text, elegant serif headings with readable sans-serif body. Full details in `design.md`.

---

## 14. Testing
**Functional:** auth and access control; catalogue filters/sort/pagination; cart and variants; wishlist; checkout validation; orders; payment success/failure/retry; admin management.
**Security:** access another user's order; admin actions as customer; tampered prices; negative/excessive quantities; webhook replay; expired sessions; malicious or oversized uploads.
**Acceptance:** MVP is demo-ready when main customer and admin flows pass, critical security checks pass, and no critical defect blocks ordering or order management.

---

## 15. Milestones
1. **Foundation** — repo, React app, Express server, MongoDB connection, base styles.
2. **Catalogue** — schemas, seed data, product APIs, shop and detail pages.
3. **Authentication** — register, login, logout, sessions, protected pages.
4. **Cart and Wishlist** — persistence, guest merge, variants.
5. **Checkout and Orders** — addresses, order creation, stock validation, payments, history.
6. **Admin** — products, inventory, orders, metrics.
7. **Testing and Deployment** — tests, secrets, deploy, README.

## 16. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Incorrect checkout prices | Recalculate totals on server |
| Overselling | Atomic inventory updates |
| Fake payment success | Verify signatures and webhooks |
| Unauthorized admin access | Backend role-based authorization |
| Slow product pages | Optimize images, paginate |
| Duplicate orders | Idempotency keys, unique constraints |
| Lost order history | Immutable item and address snapshots |

## 17. Final Deliverables
Responsive storefront, auth and account pages, catalogue, cart, wishlist, checkout, orders, Razorpay and COD, admin dashboard, models and APIs, validation and error handling, automated tests for critical flows, deployment config, README (setup, env variables, architecture, API overview, screenshots), demo credentials and sample data with no real secrets.

## 18. Definition of Done
A new developer can run Gemica locally from the README; a customer can browse and buy an available product end to end; an admin can manage products and orders; critical security and payment checks are tested.

**Final direction:** Gemica is a modular, single-store application on Node.js, Express.js, MongoDB and React.js, with a premium storefront and an authenticated admin dashboard. The MVP prioritizes a reliable end-to-end shopping journey before advanced features.
