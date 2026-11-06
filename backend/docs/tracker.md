# TRACKER — Gemica

**Status:** ⬜ not started · 🧪 built, partly verified · ✅ done and tested
**Last updated:** 2026-11-02

## Test status
- Backend: **103 passing** (real MongoDB) · Frontend: **22 passing** + production build
- Real-browser E2E (headless Firefox): **46 checks passing** — full purchase, coupon, invoice, admin fulfilment, verified review, password reset by emailed link, wishlist, guest-cart merge, sold-out handling, 404s, access control, 390px phone layout on 14 routes
- Live run: `npm run dev` in each folder against a MongoDB, seed guard, friendly placeholder/connection errors

## Milestones
| Milestone | Status |
|---|---|
| 1 Foundation · 2 Catalogue · 3 Authentication · 4 Cart & Wishlist · 5 Checkout & Orders · 6 Admin | ✅ |
| 7 Testing & Deployment | 🧪 testing ✅, deployment ⬜ |

## Feature checklist
| Area | Item | Status |
|---|---|---|
| Atlas | Placeholder `.env`, startup check, friendly errors, `check:db` | ✅ |
| Shop | Catalogue, search, filter, sort, pagination, variants, stock | ✅ |
| Shop | Reviews & ratings (verified buyers), related, recently viewed | ✅ |
| Accounts | Register, login, logout, profile, change password | ✅ |
| Accounts | Forgot / reset password (emailed link, single-use, 1 hour) | ✅ (console emails; real SMTP untested) |
| Cart | Guest cart + merge, server pricing, stock flags | ✅ |
| Checkout | Addresses, COD, server totals, idempotency, coupons | ✅ |
| Payments | Razorpay create / verify / webhook | 🧪 faked provider only |
| Payments | Admin refund through Razorpay API | 🧪 faked provider only |
| Orders | History, tracking, cancel, invoice, confirmation email, auto-expiry of unpaid online orders | ✅ |
| Admin | Dashboard (14-day chart, top products), products, stock, uploads, categories, orders, coupons | ✅ |
| Security | Cookies, rate limits, ownership, role checks, signed webhooks, upload content checks | ✅ |
| QA | Responsive (390px) and real-browser flows in Firefox | ✅ |
| QA | Chrome / Safari / screen reader | ⬜ |
| QA | Live Razorpay test keys end to end | ⬜ |
| Ops | Persistent image storage (Cloudinary) and deploy configs | ✅ built (Cloudinary tested with a faked host) |
| Ops | Actually deploy backend + frontend with production secrets | ⬜ |

## Next steps
1. Paste your Atlas string into `backend/.env`, run `npm install`, `npm run check:db`, `npm run seed`, `npm run dev`.
2. Try online payment once with Razorpay **test** keys (use a tunnel such as ngrok for the webhook).
3. Add SMTP credentials to send real emails.
4. Create a free Cloudinary account and add its three keys; then deploy (see each folder's README).

## Not planned
Shipping-carrier integrations · multi-warehouse inventory · loyalty programme · native apps · AR try-on.

## Session log
| Date | Done | Next |
|---|---|---|
| 2026-10-28 | MVP built and tested | Browser QA, deploy |
| 2026-11-02 | Atlas readiness, Phase 2 features, real-browser QA, layout bug fixed | Atlas string, Razorpay test, deploy |
