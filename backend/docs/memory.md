# PROJECT MEMORY — Gemica

Living log of decisions, progress and changes. **Update after every meaningful change.**

## 1. Project Snapshot

| Item | Value |
|---|---|
| Name | Gemica |
| Stack | Node.js 22, Express 5, MongoDB (Mongoose 9), React 19 (Vite) |
| Currency | INR |
| Payments | COD + Razorpay |
| Phase | Phase 1 MVP + most of Phase 2 built; verified in real Firefox; deployment pending |
| Last updated | 2026-10-28 |

## 2. Key Decisions

| # | Decision | Reason |
|---|---|---|
| D1 | Brand name is **Gemica** (formerly "ShopNest Jewellery") | Owner choice |
| D2 | Stack limited to Node, Express, MongoDB, React | Focus |
| D3 | Plain CSS + variables, no Tailwind | No unnecessary dependencies |
| D4 | Native `fetch` wrapper, no Axios | No unnecessary dependencies |
| D5 | JWT in HTTP-only cookie | Not readable by scripts |
| D6 | Server computes all prices/totals/stock checks; client money fields are ignored | Never trust client |
| D7 | Orders snapshot items and address | Preserve history |
| D8 | Payment status separate from order status | Reconciliation |
| D9 | Razorpay is the only external service | India payments |
| D10 | **Tests use Node's built-in `node:test` + Supertest, not Jest** | Jest's sandbox breaks the MongoDB driver handshake; fewer dependencies |
| D11 | Stock reserved with atomic `updateOne` + `$elemMatch stock >= qty`, compensating rollback on failure; no Mongo transactions | Works on standalone MongoDB and in tests |
| D12 | Guest cart in `localStorage` (display only); server re-prices after login/merge | Cart is not a credential |
| D13 | Uploads validated by MIME **and** magic bytes, 2 MB max, random filenames | Spoofable MIME types |
| D14 | Product `minPrice` denormalised for fast sort/filter | Variants hold prices |
| D15 | Payment model uses `providerOrderId`/`providerPaymentId` (vs `providerPaymentReference` in PRD) | Razorpay has both ids |
| D17 | Monorepo with `frontend/` + `backend/` (no workspaces tool); root `package.json` holds scripts only | No extra dependencies |
| D18 | `.env` ships with a placeholder `MONGO_URI`; the app refuses to start with it and explains how to fix it | User supplies their own Atlas string |
| D19 | Sessions carry a `tokenVersion`; changing/resetting a password bumps it | Signs out stolen/old sessions |
| D20 | Reviews limited to customers with a delivered order for that product | Honest "verified purchase" |
| D21 | Coupon use is claimed atomically and returned on cancellation | No over-redemption |
| D22 | Unpaid Razorpay orders auto-cancel after 60 min (env-configurable) and release stock | Fixes K1 |
| D23 | Invoice is a print-styled page (Print / Save as PDF), no PDF library | No new dependency |
| D24 | Repo root contains only `backend/`, `frontend/`, `.gitignore`; each app is deployable on its own (no root package.json, no CI/scripts at root) | Owner's requested layout; independent deploys |
| D25 | Product images: Cloudinary when configured (signed REST upload, no SDK), local `uploads/` otherwise; real file type is checked from content | Hosts delete local files on redeploy |
| D26 | Frontend host proxies `/api` and `/uploads` to the backend (`vercel.json`) so cookies are first-party; `TRUST_PROXY` configurable | Cross-site cookies are blocked by Safari/Chrome |
| D16 | Unpaid online orders keep their stock until paid or cancelled; no auto-expiry yet | See Known Issues |

## 3. Conventions
API prefix `/api`; `{ success, data, message }`; route → controller → service → model; zod validation via `req.valid`; branches `feature/<name>`; commits `type: summary`.

## 4. Approved Dependencies
**Server:** express, mongoose, dotenv, bcryptjs, jsonwebtoken, cookie-parser, cors, helmet, express-rate-limit, zod, multer, razorpay, nodemailer (password-reset and order emails; falls back to console output without SMTP)
**Server dev:** supertest, mongodb-memory-server, nodemon
**Client:** react, react-dom, react-router-dom
**Client dev:** vite, @vitejs/plugin-react, vitest, jsdom, @testing-library/react

## 5. API Registry (frozen contracts — do not break)

| Method | Endpoint | Auth | Shipped | Status |
|---|---|---|---|---|
| POST | `/api/auth/register` | Public | 2026-10-28 | Tested |
| POST | `/api/auth/login` | Public | 2026-10-28 | Tested |
| POST | `/api/auth/logout` | Public | 2026-10-28 | Tested |
| GET | `/api/auth/me` | User | 2026-10-28 | Tested |
| GET | `/api/products` | Public | 2026-10-28 | Tested |
| GET | `/api/products/:idOrSlug` | Public | 2026-10-28 | Tested |
| GET | `/api/categories` | Public | 2026-10-28 | Tested |
| GET | `/api/cart` | User | 2026-10-28 | Tested |
| POST | `/api/cart/items` | User | 2026-10-28 | Tested |
| POST | `/api/cart/merge` | User (added) | 2026-10-28 | Tested |
| PATCH | `/api/cart/items/:itemId` | User | 2026-10-28 | Tested |
| DELETE | `/api/cart/items/:itemId` | User | 2026-10-28 | Tested |
| GET | `/api/wishlist` | User | 2026-10-28 | Tested |
| POST | `/api/wishlist/items` | User | 2026-10-28 | Tested |
| DELETE | `/api/wishlist/items/:productId` | User | 2026-10-28 | Tested |
| GET | `/api/addresses` | User | 2026-10-28 | Tested |
| POST | `/api/addresses` | User | 2026-10-28 | Tested |
| POST | `/api/orders` | User (Idempotency-Key header) | 2026-10-28 | Tested |
| GET | `/api/orders/my-orders` | User | 2026-10-28 | Tested |
| GET | `/api/orders/:id` | Owner | 2026-10-28 | Tested |
| POST | `/api/orders/:id/cancel` | Owner (added) | 2026-10-28 | Tested |
| POST | `/api/payments/create` | User | 2026-10-28 | Tested |
| POST | `/api/payments/verify` | User | 2026-10-28 | Tested |
| POST | `/api/payments/webhook` | Razorpay signature | 2026-10-28 | Tested |
| GET | `/api/admin/dashboard` | Admin | 2026-10-28 | Tested |
| GET | `/api/admin/products` | Admin (added) | 2026-10-28 | Tested |
| GET | `/api/admin/products/:id` | Admin (added) | 2026-10-28 | Tested |
| POST | `/api/admin/products` | Admin | 2026-10-28 | Tested |
| PATCH | `/api/admin/products/:id` | Admin | 2026-10-28 | Tested |
| DELETE | `/api/admin/products/:id` | Admin (archives) | 2026-10-28 | Tested |
| PATCH | `/api/admin/products/:id/stock` | Admin (added) | 2026-10-28 | Tested |
| POST | `/api/admin/categories` | Admin (added) | 2026-10-28 | Tested |
| POST | `/api/admin/uploads` | Admin (added) | 2026-10-28 | Tested |
| GET | `/api/admin/orders` | Admin | 2026-10-28 | Tested |
| PATCH | `/api/admin/orders/:id/status` | Admin | 2026-10-28 | Tested |
| GET | `/api/health` | Public (added) | 2026-10-28 | Tested |

| PATCH | `/api/auth/me` | User (added) | 2026-11-02 | Tested |
| POST | `/api/auth/change-password` | User (added) | 2026-11-02 | Tested |
| POST | `/api/auth/forgot-password` | Public (added) | 2026-11-02 | Tested |
| POST | `/api/auth/reset-password` | Public (added) | 2026-11-02 | Tested |
| GET | `/api/products/:idOrSlug/related` | Public (added) | 2026-11-02 | Tested |
| GET/POST | `/api/products/:idOrSlug/reviews` | Public / verified buyer (added) | 2026-11-02 | Tested |
| POST | `/api/coupons/validate` | User (added) | 2026-11-02 | Tested |
| GET/POST/PATCH | `/api/admin/coupons[/:id]` | Admin (added) | 2026-11-02 | Tested |
| POST | `/api/admin/orders/:id/refund` | Admin (added) | 2026-11-02 | Tested |

"Added" = not in the original PRD list; additive, needed by the UI/workflows. `POST /orders` gained an optional `couponCode`; `GET /admin/dashboard` and product list items gained extra fields (no existing field changed).

## 6. Known Issues / Limitations

| ID | Description | Status |
|---|---|---|
| K1 | Abandoned online-payment orders held stock | **Fixed** (auto-expiry, D22) |
| K2 | Refunds only flagged | **Fixed** (admin refund via Razorpay API; tested with a faked provider) |
| K3 | Razorpay tested only against a faked SDK and signed payloads, not live | Open — test once with Razorpay test keys |
| K4 | UI not checked in a real browser | **Mostly fixed** — 3 Selenium/Firefox runs (46 checks) incl. 390px phone layout; screen-reader and Safari/Chrome not tested |
| K5 | Uploaded images lived on local disk | **Fixed** (Cloudinary option, D25; Cloudinary itself tested against a faked host) |
| K6 | Password recovery / confirmation emails | **Fixed** (real SMTP untested; console fallback tested) |
| K7 | Prices tax-inclusive; no GST logic | Open |
| K8 | Shipping-carrier integrations, multi-warehouse, loyalty (out of scope) | Not planned |
| K9 | Google Fonts are loaded from the internet; falls back to Georgia/system fonts offline | Cosmetic |

## 7. Open Questions
Shipping rules (currently flat ₹99, free ≥ ₹1,999, env-configurable) · GST handling · production image storage.

## 8. Change Log

| Date | Area | Change | Tests | Result |
|---|---|---|---|---|
| 2026-10-28 | Server | Models, services, controllers, routes, seed, upload hardening | 75 server tests (real MongoDB) | Pass |
| 2026-10-28 | Server | Added `GET /admin/products/:id` for edit form (additive) | admin suite | Pass |
| 2026-10-28 | Client | Pages, contexts, admin UI, CSS design system, Razorpay launcher | 17 Vitest tests + production build | Pass |
| 2026-10-28 | E2E | Seed + live server + HTTP purchase flow (register → cart → COD order → admin 403) | manual curl | Pass |
| 2026-11-02 | Structure | Final layout `backend/` + `frontend/` + `.gitignore`; Cloudinary image storage; multi-photo upload, add-by-link, make-main in admin; `vercel.json`; `TRUST_PROXY` | 103 backend, 22 frontend, browser run | Pass |
| 2026-11-02 | Bugfix | Admin could not save seeded products: photo validation rejected the built-in `/images/...` pictures → now accepted (path tricks still blocked), regression tests added | 103 backend tests + browser | Fixed |
| 2026-11-02 | Bugfix | Broken "add photo by link" regex (invalid pattern made the button do nothing) → `isHttpsUrl` helper + tests; error toasts no longer block clicks | 22 frontend + browser | Fixed |
| 2026-11-02 | Features | Coupons, reviews+ratings, related/recently viewed, password reset/change, profile, order & reset emails, invoice, refunds, unpaid-order expiry, dashboard analytics | 103 backend tests | Pass |
| 2026-11-02 | Ops | Atlas placeholder `.env`, connection checks with friendly errors, seed guard, `npm run dev` runner | live run | Pass |
| 2026-11-02 | Bugfix | Image `height` attribute overrode CSS aspect-ratio (hero/product/cart images wrong shape) → `height:auto` | real Firefox | Fixed |
| 2026-11-02 | QA | Real-browser E2E (Firefox/Selenium): purchase, coupon, invoice, admin fulfilment, review, reset, phone layout, sold-out and 404 edge cases | 46 checks | Pass |
| 2026-10-28 | Structure | Restructured into `frontend/`, `backend/src/`, `docs/`; added CI workflow, docker-compose, root scripts, `docs/api.md`; renamed env `CLIENT_URL`→`FRONTEND_URL` | 75 backend + 17 frontend, build, live smoke | Pass |
| 2026-10-28 | Docs | Created PRD, architecture, design, rules, memory, tracker, README | n/a | Done |
