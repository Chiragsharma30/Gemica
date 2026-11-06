# Gemica — Backend (Express + MongoDB)

REST API for the Gemica jewellery store. Node 20+ (22 recommended).

## Run it locally

1. **Add your MongoDB Atlas string.** Open `.env` and replace the whole `MONGO_URI=` line:
   ```
   MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/gemica?retryWrites=true&w=majority
   ```
   - Atlas → **Database Access**: create a user. **Network Access**: allow your IP (or `0.0.0.0/0`).
   - Keep `/gemica` after `.net`. URL-encode special characters in the password (`@` → `%40`).
2. Install and start:
   ```bash
   npm install
   npm run check:db      # proves the Atlas string works
   npm run seed          # demo products + demo accounts (first time only)
   npm run dev           # http://localhost:5000
   ```
   Then start the frontend (see `../frontend/README.md`).

With the placeholder still in `.env`, the server stops and tells you exactly what to change. Connection problems are explained in plain words (wrong password, IP not allowed, wrong host).

**Demo accounts:** `admin@gemica.test / Admin@12345` · `customer@gemica.test / Customer@12345`.
`npm run seed` refuses to run on a database that already has data; `npm run seed -- --force` wipes and reseeds.

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Start with auto-restart |
| `npm start` | Production start |
| `npm run check` / `check:db` | Validate `.env` / also test the Atlas connection |
| `npm run seed` | Load demo data |
| `npm test` | 103 tests against an in-memory MongoDB (set `MONGOMS_SYSTEM_BINARY=/path/to/mongod` if it cannot download one) |

## Settings (`.env`)
| Setting | Purpose |
|---|---|
| `MONGO_URI` | **Required.** Your Atlas string |
| `JWT_SECRET` | **Required.** Long random text. Change it before deploying |
| `FRONTEND_URL` | Exact address of the website (used for CORS and email links) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Product photo hosting (see below) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Online payment and refunds. Without them, COD works |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Real emails. Without them they are printed in the terminal |
| `TRUST_PROXY` | Proxies in front of the API in production (default 1; use 2 if the frontend host forwards `/api`) |
| `SHIPPING_FLAT_FEE`, `FREE_SHIPPING_THRESHOLD`, `UNPAID_ORDER_EXPIRY_MINUTES` | Shop rules (₹99, free from ₹1,999, 60 min) |

## Product pictures
In the website: log in as admin → **Admin → Products → Edit** (or **Add product**) → choose one or more photos (JPG/PNG/WebP, up to 2 MB each) or paste an image link → the first photo is the main one (**Make main** reorders) → **Save**.

Where the files go:
- **Cloudinary keys set** → photos are uploaded to your Cloudinary account and the product stores a permanent `https://` link. **Use this for deployment.**
- **No keys** → photos are saved in `backend/uploads/` (fine on your own computer; most hosts delete these files on every redeploy).

Free Cloudinary account: cloudinary.com → Dashboard → API Keys → copy the three values into `.env`.

## Deploy (Render, Railway or any Node host)
1. Push the repository to GitHub.
2. Create a **Web Service**: Root Directory `backend`, Build `npm install`, Start `npm start`, Health check path `/api/health`.
3. Add the environment variables above. Set `NODE_ENV=production`, a long random `JWT_SECRET`, `FRONTEND_URL` to your website address, and your Cloudinary keys.
4. Atlas → Network Access: allow the host (hosts use changing IPs, so `0.0.0.0/0` is the usual choice).
5. Open `https://YOUR-BACKEND/api/health`. Then run the seed once from your own computer pointed at the same Atlas database (`npm run seed`), or create products in the admin area.
6. Razorpay: add a webhook to `https://YOUR-BACKEND/api/payments/webhook` (events `payment.captured`, `payment.failed`).

Then deploy the frontend (`../frontend/README.md`).

## More documentation (`docs/`)
`api.md` (every endpoint) · `architecture.md` · `prd.md` · `rules.md` · `memory.md` (decisions, known issues, API registry) · `tracker.md` (what is done and what is next).
