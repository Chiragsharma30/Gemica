# Gemica — Frontend (React + Vite)

The storefront and admin dashboard. Node 20+ (22 recommended). Plain CSS, React Router, no UI framework.

## Run it locally
The backend must be running first (see `../backend/README.md`).
```bash
npm install
npm run dev        # http://localhost:5173  (forwards /api and /uploads to the backend on :5000)
```
| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | 22 component and utility tests |

## Adding your pictures
**Product photos (recommended way):** log in as admin (`admin@gemica.test / Admin@12345`) → **Admin → Products → Edit** → upload photos or paste a link → **Make main** to choose the first photo → **Save**. They appear everywhere: shop, product page, cart, orders. For this to survive deployment, add your Cloudinary keys in the backend `.env` (see `../backend/README.md`).

**The demo pictures** (gold line-art placeholders) live in `public/images/`. The seeded products use them until you replace the photos in the admin area.

**Hero banner and category tiles on the home page:** put your files in `public/images/` (for example `hero.jpg`, `rings.jpg`) and change the file names in `src/pages/Home.jsx` (the `<img src="/images/hero.svg">` line and the `CATS` list at the top). Tips: use JPG/WebP, about 1200 px wide for the hero and 800×1000 px (4:5) for product photos, and keep files under 2 MB.

## Deploy
### Vercel (recommended)
1. Open `vercel.json` and replace `https://YOUR-BACKEND-URL.onrender.com` (3 places) with your deployed backend address.
2. Vercel → **Add New Project** → import the repository → **Root Directory: `frontend`** → Framework: Vite → Deploy.
3. Leave `VITE_API_URL` empty. The `vercel.json` rewrites forward `/api` and `/uploads` to the backend, so the browser sees one site and login cookies work in every browser.
4. In the backend settings, set `FRONTEND_URL` to your Vercel address and `TRUST_PROXY=2`.

### Netlify
Build command `npm run build`, publish directory `dist`, base directory `frontend`. Add a file `public/_redirects`:
```
/api/*      https://YOUR-BACKEND-URL.onrender.com/api/:splat      200
/uploads/*  https://YOUR-BACKEND-URL.onrender.com/uploads/:splat  200
/*          /index.html                                           200
```

### Other static hosts
Upload `dist/`, enable "single-page app" fallback to `index.html`, set `VITE_API_URL=https://YOUR-BACKEND/api` before building, and put both sites on the same parent domain (for example `www.example.com` and `api.example.com`), otherwise some browsers block the login cookie.

## Design
`docs/design.md` — colours, type, spacing, components and accessibility rules used by `src/styles/`.
