# Production Deployment Checklist

## Architecture
The frontend (React/Vite, static build) and backend (Node/Express API) are
deployed as two separate services — e.g. frontend on Netlify/Vercel, backend
on Render/Railway. They talk to each other over CORS + an httpOnly cookie for
auth, so the two env-var groups below must point at each other exactly.

## Backend environment variables (server/.env)
- `NODE_ENV=production`
- `PORT` (usually provided by the hosting platform)
- `MONGO_URI`
- `JWT_SECRET` (at least 32 random characters — generate with e.g. `openssl rand -base64 48`)
- `JWT_EXPIRES_IN` (default `7d`)
- `JWT_COOKIE_DAYS` (default `7`, keep in sync with the above)
- `CLIENT_URL` — the exact deployed frontend origin (scheme + host, no trailing slash/path). Wrong value here = every request fails CORS with no obvious error to the user.
- Optional: `GOOGLE_CLIENT_ID`, `OPENAI_API_KEY`, `OPENAI_MODEL`
- Receipt storage — see "File uploads" below: `STORAGE_DRIVER` (`local` or `s3`), and if `s3`: `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`, and `S3_ENDPOINT`/`S3_FORCE_PATH_STYLE` for non-AWS providers (Cloudflare R2, Backblaze B2, DigitalOcean Spaces).

## Frontend environment variables (client/.env)
- `VITE_API_URL=https://your-backend-domain/api` — the exact deployed backend base URL, including `/api`.
- Optional: `VITE_GOOGLE_CLIENT_ID`

## Authentication
Auth uses an httpOnly, Secure, SameSite=None cookie set by the backend on
login/register — the frontend never sees or stores the JWT itself, which
means it can't be stolen via XSS the way a localStorage token could be. This
requires:
- The backend to run over HTTPS in production (`secure: true` cookies are
  dropped by browsers over plain HTTP). Render/Railway/most PaaS hosts give
  you HTTPS by default.
- `CLIENT_URL` (backend) and `VITE_API_URL` (frontend) to be correct, since
  cross-site cookies depend on CORS being configured correctly.
- The frontend's axios client already sends `withCredentials: true` — no
  action needed there.

## File uploads (receipts)
Receipts default to local disk (`STORAGE_DRIVER=local`, or unset). This is
fine on a host with a real persistent volume (e.g. a VPS/Docker host with an
attached volume). **Many PaaS hosts wipe local disk on every redeploy or
restart** — if that's where you're deploying, set `STORAGE_DRIVER=s3` and the
`S3_*` variables to use a bucket instead (works with AWS S3 or any
S3-compatible provider: Cloudflare R2, Backblaze B2, DigitalOcean Spaces).
The server logs a warning on startup if it detects local storage + production
mode, as a safety net.

## Content Security Policy (client/vercel.json)
`vercel.json`'s `headers` block is static JSON evaluated at deploy time — it **cannot** read `VITE_API_URL` or any other environment variable. The `Content-Security-Policy` header's `connect-src` directive contains a literal placeholder:
```
https://YOUR-BACKEND-DOMAIN.example.com
```
**You must manually replace this with your real backend's origin** (the same value as `VITE_API_URL`, without the `/api` path) before deploying, or the frontend will be blocked by its own CSP from calling the API. If you later display receipt images inline (rather than opening them in a new tab, which is the current behavior), also add your S3/R2 bucket's public origin to `img-src`.

## Before deploying
1. **Never deploy a pre-built `client/dist/` folder.** It bakes in whatever `VITE_API_URL` was set at build time. Always rebuild for the target environment: set the real `VITE_API_URL` and run `npm run build` in `client` as part of your deploy pipeline (most static hosts do this automatically from a build command).
2. Run `npm ci` and `npm start` in `server` with the production environment variables set.
3. SPA fallback is already configured: `client/public/_redirects` (Netlify) and `client/vercel.json` (Vercel) route all paths to `index.html` so page refreshes/deep links don't 404. If you deploy behind your own Nginx/Apache instead, add an equivalent `try_files $uri /index.html;` rule.
4. Confirm `CLIENT_URL` (backend) and `VITE_API_URL` (frontend) match exactly.
5. Rotate any secrets that were ever exposed (check your git history, not just the current working tree).
6. If receipts matter to you long-term, decide on `STORAGE_DRIVER` before your first real user uploads a file — switching later won't migrate already-uploaded files automatically.

## Scaling notes
- The rate limiter and receipt-cron-processing (recurring transactions are
  generated lazily when a user loads their data) are in-process/in-memory.
  Fine for a single backend instance. If you scale to multiple instances,
  move rate limiting to a shared store (e.g. Redis) and consider a real
  scheduled job for recurring transactions instead of the lazy on-request
  approach.
