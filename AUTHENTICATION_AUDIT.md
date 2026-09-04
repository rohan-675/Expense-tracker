# Authentication Audit

## Problems Found

1. **CORS accepted only one exact `CLIENT_URL` origin.** If the frontend is ever reachable at more than one exact origin (custom domain vs. its `www.` variant, a platform-provided fallback domain, etc.), any request from an unlisted origin — including the Google login POST — fails CORS silently, with no clear error surfaced to the end user.
2. **`client/.env.example` had `VITE_API_URL` missing the `/api` prefix.** If this was ever what got deployed to the real frontend host, every single API call (not just Google) would 404.
3. **`client/.env` (local) had `VITE_GOOGLE_CLIENT_ID` blank**, meaning the Google button doesn't render at all locally. Worth confirming this is actually set in your real hosting dashboard, since a build with this unset would show no Google button anywhere, not just intermittently.
4. **Google ID token verification failures were logged with no detail** — any rejection (audience mismatch, expired token, clock skew, wrong issuer) surfaced as the same generic message with nothing in the logs to distinguish the cause.
5. **No real email ownership verification.** Registration only checked email format, so any syntactically valid address (including ones the registrant doesn't own) could create a fully active account.
6. **`server/.env` and `client/.env` were committed to git history** (see Security section — this is independent of the two items above, found while inspecting the repo).

## Root Cause of the Google Login Issue

I could not reproduce a live failure in this environment (no real browser, no access to your Google Cloud Console configuration), so I could not pin this to one single confirmed cause the way "inspect the browser console" would. What I *can* confirm from the code itself: **two concrete, real misconfigurations exist that would each independently cause Google login (and in one case, everything else) to fail for a subset of visitors** — both described above (#1 and #2). Given the reported symptom ("works on some devices, fails on others"), item #1 (CORS exact-origin mismatch) is the more likely fit: it fails consistently for anyone reaching the frontend via an origin not in the allow-list, while working fine for anyone using the "correct" one — which looks exactly like "some devices work, others don't" depending on which URL/bookmark each person happens to use.

**I'm not fully confident this is the complete picture without one piece of evidence I don't have access to:** the actual browser console/network error from a device where it's currently failing, and the exact list of "Authorized JavaScript origins" configured in your Google Cloud Console. If you can get either of those, I can confirm or rule out the remaining possibilities (a mismatched/missing Authorized JavaScript origin on Google's side, or third-party-cookie blocking in Safari/Incognito affecting session persistence after a successful Google auth).

## Changes Made

1. `CLIENT_URL` now accepts a comma-separated list of origins (backward compatible with a single value).
2. Fixed `client/.env.example`'s `VITE_API_URL` to include `/api`, with a comment explaining why it matters.
3. Added detailed server-side logging of the specific `google-auth-library` rejection reason in `googleLogin`.
4. Documented the "Authorized JavaScript origins, not redirect URIs" requirement clearly in `AUTHENTICATION.md`.
5. Implemented full email verification (see below).

## Security Improvements

- Verification tokens: 32 random bytes (`crypto.randomBytes`), only the SHA-256 hash is stored (mirrors password hashing — a database leak can't be replayed as a valid link), expire in 24h, single-use (cleared on success).
- `protect` middleware independently re-checks `emailVerified` on every request, not just at login — an unverified user cannot reach any protected API even with a technically-valid token.
- `resend-verification` always returns an identical response regardless of whether the email exists or is already verified (no user enumeration), and has its own rate limit (3/15min) separate from the general auth limiter.
- Backend now validates email format independently of the frontend (never trusts client-side validation alone).
- Google's `email_verified` claim is checked; a Google token claiming an unverified email is rejected.
- **Found and must be rotated:** `server/.env` and `client/.env` were committed to git history (commit `ee0f1e86`, later removed in `db6f79e8`) in a repo with a remote at `github.com/rohan-675/Expense-tracker.git`. I did not print or reproduce any secret values. **Rotate `JWT_SECRET`, `MONGO_URI` (database password), and `OPENAI_API_KEY` immediately** — `GOOGLE_CLIENT_ID` is not a secret and needs no action. If the repository has ever been public, consider scrubbing history (`git filter-repo` / BFG).

## Files Modified

- `server/src/models/User.js` — added `emailVerified`, `verificationTokenHash` (select: false), `verificationTokenExpiry` (select: false)
- `server/src/controllers/authController.js` — register/login/Google flows updated; new `verifyEmail`, `resendVerificationEmail`
- `server/src/routes/authRoutes.js` — new `/verify-email`, `/resend-verification` routes with dedicated rate limiter
- `server/src/middleware/authMiddleware.js` — added unverified-user check
- `server/server.js` — multi-origin CORS parsing, runs startup migration, warns if email isn't configured
- `server/src/config/env.js` — no changes needed (validation logic untouched)
- New: `server/src/utils/verificationToken.js`, `server/src/utils/validateEmail.js`
- New: `server/src/services/emailService.js`
- New: `server/src/startup/migrateEmailVerification.js`
- `client/src/context/AuthContext.jsx` — `register` no longer logs in; added `verifyEmail`, `resendVerification`
- `client/src/pages/Register.jsx` — shows "check your email" state instead of navigating to dashboard
- `client/src/pages/Login.jsx` — handles 403 unverified case with a resend button
- New: `client/src/pages/VerifyEmail.jsx`
- `client/src/App.jsx` — new `/verify-email` route
- `client/src/styles.css` — `.link-button` style
- `client/.env.example`, `server/.env.example` — corrected/added variables

## Environment Variables Added

`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`, `EMAIL_VERIFICATION_TTL_HOURS` (server, all optional — app still runs without them, just won't send real email).

## Existing Users

A startup migration (`migrateEmailVerification.js`) runs on every server boot: any user document that predates this feature (i.e. genuinely missing the `emailVerified` field in the database) is set to `emailVerified: true`. New users created after this ships always have the field set explicitly at creation time, so they're never touched by this migration. This is idempotent and safe to leave running indefinitely — confirmed via a live test that it only affects legacy documents and correctly identifies them by the field's absence, not its value.

## Testing Performed

All tests ran against a real running Express server (mocked database layer, real middleware/controller/service code):

- **Registration → verification flow (12 checks):** register creates no session; login before verifying → 403; invalid email format → 400; duplicate email → 409; wrong token → 400; resend → 200 and logs a usable token when email isn't configured; resend gives identical responses for known/unknown emails; verifying with the real token → 200, sets session, `emailVerified: true`; reusing the same token → fails (single-use); login after verifying → 200; resend gets rate-limited after repeated calls. **All passed.**
- **Google + CORS (5 checks):** multi-origin CORS accepts both listed origins and rejects an unlisted one; new Google sign-in is immediately verified with no email step. **All passed.**
- **Account linking + migration (5 checks):** startup migration targets exactly the documents missing the field; an existing unverified local account gets grandfathered to verified when it signs in with Google on the same email, linked (not duplicated). **All passed.**
- **Full regression (7 checks):** confirmed existing protected routes (`/transactions`, `/analytics`, `/assistant/ask`) still work end-to-end for a verified user after all these changes, and explicitly confirmed a forged token for a hypothetically-unverified user is still rejected by `protect` middleware. **All passed** (one earlier failure in this pass turned out to be a gap in my own test mock, not an app bug — traced and confirmed before reporting this as passing).
- **Frontend build:** `vite build` succeeded with zero errors after all changes.
- **Syntax check:** `node --check` on every server file after every change.

## Remaining Manual Configuration Required From You

1. **Rotate `JWT_SECRET`, `MONGO_URI`, and `OPENAI_API_KEY`** (see Security section) — this is independent of everything else and time-sensitive.
2. **Confirm your real deployed frontend's `VITE_API_URL`** includes `/api` (the example file had it missing).
3. **Confirm `VITE_GOOGLE_CLIENT_ID` is actually set** in your frontend host's environment variables (it was blank in the local `.env` I inspected).
4. **Set `CLIENT_URL`** to a comma-separated list of every exact origin your frontend is reachable from, and add the same list to your Google Cloud Console OAuth client's "Authorized JavaScript origins".
5. **Configure `EMAIL_HOST`/`EMAIL_USER`/`EMAIL_PASSWORD`/`EMAIL_FROM`** so real verification emails actually send — without this, new registrations are stuck unable to verify.
6. **To fully close out the Google login bug:** reproduce the failure on a currently-failing device and send the exact browser console/network error, plus your Google Cloud Console's configured Authorized JavaScript origins — that's the one piece of evidence I structurally cannot get from code inspection alone.
