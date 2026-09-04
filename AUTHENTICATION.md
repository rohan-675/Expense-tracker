# Authentication

## 1. Architecture Overview

Auth has three entry points that all converge on the same session mechanism:

```
Email/password register → creates UNVERIFIED account → verification email sent
Email/password login    → blocked until verified
Google sign-in          → always immediately verified (Google already proved email ownership)
                                    ↓
                          JWT signed, stored in an httpOnly cookie
                                    ↓
                    `protect` middleware reads cookie on every request,
                    loads the user, rejects if unverified, attaches req.user
```

The frontend never sees the JWT itself — it lives only in a `httpOnly`, `Secure`, `SameSite=None` cookie set by the backend. `GET /api/auth/me` lets the app silently check whether a valid session exists on page load (since JS can't read the cookie to check itself).

## 2. Google OAuth Flow

Uses `@react-oauth/google`'s `<GoogleLogin>` button (Google Identity Services), not a redirect/authorization-code flow:

1. Frontend renders the button via `GoogleOAuthProvider` (`client/src/main.jsx`), configured with `VITE_GOOGLE_CLIENT_ID`.
2. On success, Google gives the frontend a signed ID token (`response.credential`).
3. Frontend sends it to `POST /api/auth/google`.
4. Backend verifies the ID token's signature and `audience` against `GOOGLE_CLIENT_ID` using `google-auth-library`'s `OAuth2Client.verifyIdToken`.
5. If valid, finds or creates the user (matched by email) and sets the session cookie.

**Only "Authorized JavaScript origins" matters for this flow** — not "Authorized redirect URIs" (this app never redirects to Google's server and back; the token comes back directly to the page via a popup). Every exact origin the frontend is ever loaded from must be listed there.

**Account linking:** if a Google sign-in's email matches an existing local (password) account, the accounts are linked (`googleId` attached) rather than creating a duplicate — and the account is marked verified in the process, since Google's own verification is sufficient proof of ownership.

## 3. Email/Password Registration & Verification Flow

```
POST /api/auth/register
   ↓ validate name/email format/password/currency
   ↓ create User with emailVerified: false
   ↓ generate a random 32-byte token, store only its SHA-256 hash + 24h expiry
   ↓ email the RAW token as a link: {CLIENT_URL}/verify-email?token=...
   ↓ respond 201 with a "check your email" message — NO session cookie is set

User clicks the link → frontend calls POST /api/auth/verify-email { token }
   ↓ hash the provided token, look up a user with a matching hash + unexpired
   ↓ mark emailVerified: true, clear the token fields (single-use)
   ↓ log the user in immediately (session cookie set)

POST /api/auth/login
   ↓ if emailVerified is false → 403 "Please verify your email before logging in."
```

Unverified accounts cannot obtain a session cookie at all (registration doesn't log them in, login rejects them) — and `protect` middleware independently re-checks `emailVerified` on every request as defense-in-depth, so even a leftover/forged token for an unverified account can't reach any protected route.

**Resend:** `POST /api/auth/resend-verification { email }` issues a fresh token (invalidating the old one) and always returns the same generic message regardless of whether the email exists or is already verified, to avoid leaking which emails are registered. Rate-limited to 3 requests per 15 minutes.

## 4. Required Environment Variables

**Server (`server/.env`):**
| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | Yes | |
| `JWT_SECRET` | Yes | 32+ random characters |
| `JWT_EXPIRES_IN` | No | default `7d` |
| `JWT_COOKIE_DAYS` | No | default `7`, keep in sync with above |
| `CLIENT_URL` | Yes in production | comma-separated list if the frontend has multiple exact origins |
| `GOOGLE_CLIENT_ID` | No (Google login disabled without it) | not secret, safe to expose |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` | No (registration works but no email is sent without it) | any SMTP provider |
| `EMAIL_VERIFICATION_TTL_HOURS` | No | default `24` |

**Client (`client/.env`):**
| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | Yes | must include the `/api` prefix |
| `VITE_GOOGLE_CLIENT_ID` | No | must exactly match server's `GOOGLE_CLIENT_ID`; not secret |

## 5. Production Configuration

- Backend must run over HTTPS (the cookie is `Secure` + `SameSite=None`, required because frontend and backend are different origins).
- `CLIENT_URL` must list every exact origin the frontend is reachable from.
- `VITE_GOOGLE_CLIENT_ID`'s Google Cloud Console OAuth client must have every one of those same origins in "Authorized JavaScript origins".

## 6. Configuring Google OAuth

1. In Google Cloud Console → APIs & Services → Credentials, create (or edit) an OAuth 2.0 Client ID of type "Web application".
2. Under "Authorized JavaScript origins", add every exact origin the frontend is loaded from (protocol + host, no path, no trailing slash) — for both your production domain(s) and `http://localhost:5173` for local dev.
3. Leave "Authorized redirect URIs" empty — this flow doesn't use it.
4. Copy the Client ID into both `GOOGLE_CLIENT_ID` (server) and `VITE_GOOGLE_CLIENT_ID` (client) — they must be identical.

## 7. Configuring the Email Provider

Any standard SMTP provider works — set `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`. Examples: Gmail SMTP with an [app password](https://myaccount.google.com/apppasswords), SendGrid/Mailgun/Postmark SMTP relay, Amazon SES SMTP credentials.

If left unset, the app still works — registration succeeds, but no email is sent; the server logs a startup warning and (in non-production use only) logs the raw verification token to the console so you can test the flow locally without real email.

## 8. How to Test Authentication

1. Register a new account → confirm no session is created and a "check your email" message is shown.
2. Try logging in before verifying → confirm a 403 with a clear message and a working "resend" option.
3. Click the verification link (or use the console-logged token if email isn't configured) → confirm it logs you in and `emailVerified` becomes `true`.
4. Try reusing the same verification link → confirm it's rejected (single-use).
5. Sign in with Google (new email) → confirm instant access, no verification wall.
6. Sign in with Google using an email that already has an unverified local account → confirm it links and grandfathers the account as verified.
7. Confirm `/api/auth/me`, and any protected route, reject a session for a hypothetically-unverified user even with an otherwise-valid cookie.

## 9. Known Limitations

- The in-memory rate limiter (auth attempts, resend-verification) is per-process — fine for a single backend instance, but won't share state across multiple instances if you scale horizontally. Move to Redis if you do.
- If `EMAIL_HOST`/etc. are not configured, users can register but will never receive a real verification email — there is currently no admin UI to manually verify an account in that situation; it would need to be done directly in the database (`emailVerified: true`) or by configuring email and having the user use "resend".
- Verification tokens are single-use and expire in 24h by default; there's no "extend" mechanism — an expired link requires requesting a new one via resend.
- The Google sign-in flow verifies the token server-side but does not currently distinguish "your Google session expired" from other verification failures in the client-facing message — both surface as "Unable to verify Google account". The real reason is logged server-side.
