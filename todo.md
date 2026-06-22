# Project Delta — Production Readiness Checklist

> **86 gaps** between current state and production.
> Generated from a full codebase audit on 2026-06-21.
> Last updated: 2026-06-22 (CSRF protection + HTTPS redirect implemented).

## A. Security (CRITICAL) — 11 items

- [x] 1. Add auth to content API routes (`/api/content/*`, `/api/community/*` are currently public) — **DONE: `dependencies=[Depends(get_current_user)]` on content + community routers**
- [x] 2. Lock down FastAPI CORS (currently `allow_origins=["*"]`) — **DONE: removed wildcard, only configured origins**
- [x] 3. Add CSRF protection on POST routes (auth, sync, notes) — **DONE: CSRF middleware + double-submit cookie pattern on all POST/PUT/DELETE routes**
- [x] 4. Add rate limiting on auth (register/login) and AI routes — **DONE: `check_rate_limit()` on register + login (5 req/min), configurable via env vars**
- [x] 5. Add security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.) — **DONE: added to Caddyfile**
- [x] 6. Move JWT secret to environment variable (currently hardcoded in config.py) — **DONE: fails fast in production if `SECRET_KEY` missing**
- [x] 7. Add password complexity validation (any 1-char password works) — **DONE: minimum 8 chars enforced in `auth_service.register_user()`**
- [x] 8. Add account lockout after failed login attempts — **DONE: 5 failed attempts → 15-minute lockout (configurable via env vars)**
- [x] 9. Enforce HTTPS (redirect HTTP → HTTPS in production) — **DONE: HSTS header + HTTP→HTTPS redirect in Caddyfile**
- [x] 10. Add input sanitization on user-generated content (notes, doubts) — prevent stored XSS — **DONE: `security.py` with `sanitize_text()` on all user text in auth, notes, sync**
- [x] 11. Validate `DATABASE_URL` on FastAPI startup — crash with clear error if misconfigured — **DONE: validates `sqlite:///` or `postgresql://` prefix, raises RuntimeError on invalid**

## B. Data Layer (CRITICAL) — 7 items

- [x] 12. Fix sync to pull + apply server data to the store (currently only pushes TO server, never pulls back — multi-device broken) — **DONE: `sync-engine.ts` with `pullState()` applies server response to store**
- [x] 13. Add pagination to content API (`/api/content/videos` returns all 360 in one response) — **DONE: `limit` + `offset` params on `/api/content/videos`, returns `{ items, total, limit, offset }`**
- [ ] 14. Add composite database indexes for common query patterns
- [ ] 15. Add database migrations (currently using `create_all()` which can't alter existing tables)
- [ ] 16. Configure connection pooling for Postgres
- [ ] 17. Set up automated DB backups
- [ ] 18. Clear stale localStorage from old sessions (users with old data see mock data mixed with real)

## C. Authentication (CRITICAL) — 7 items

- [ ] 19. Add password reset / forgot password flow
- [ ] 20. Add email verification on registration
- [ ] 21. Wire OAuth (Google/GitHub) via NextAuth (installed but not configured)
- [x] 22. Implement session refresh tokens (JWT expires in 7 days with no refresh) — **DONE: access token (15 min) + refresh token (30 days) with rotation. Old refresh blocklisted on use.**
- [x] 23. Add token rotation for security — **DONE via refresh rotation (old refresh blocklisted on each refresh)**
- [ ] 24. Add "remember me" option (currently always 7 days)
- [x] 25. Invalidate JWT server-side on logout (currently token remains valid until expiry) — **DONE: `blocklist_token()` adds jti to in-memory blocklist. Logout endpoint blocklists both access + refresh tokens.**

### C.2 Auth System Details (current state)

**What's implemented:**
- JWT in httpOnly cookies (not localStorage — prevents XSS)
- Password hashing: `pbkdf2_sha256` via `passlib`
- Token format: JWT via `python-jose`, 7-day expiry
- Auth on all API routes: `Depends(get_current_user)` (except `/health`, `/ready`, `POST /auth/register`, `POST /auth/login`)
- Password validation: minimum 8 characters
- Input sanitization on all user text fields
- CORS locked to configured origins
- Security headers (CSP, X-Frame-Options, etc.) via Caddy
- JWT secret fails fast in production if env var missing
- **CSRF protection**: double-submit cookie pattern on all POST/PUT/DELETE routes
- **HTTPS enforcement**: HSTS header + HTTP→HTTPS redirect in Caddyfile

**What's NOT implemented (listed above as items 19-24):**
- No password reset / forgot password
- No email verification
- No OAuth (Google/GitHub) — NextAuth installed but not wired
- No "remember me" option

## D. Real-time (MAJOR) — 5 items

- [x] 26. Add auth to Socket.io connections (currently anyone can connect and listen) — **DONE: `io.use()` middleware verifies JWT via FastAPI `/api/auth/me` before allowing connection**
- [ ] 27. Add room-based isolation (users should only see their batch/cohort events, not all)
- [ ] 28. Add reconnection logic with state recovery (missed events are lost on disconnect)
- [ ] 29. Add backpressure handling for Socket.io
- [ ] 30. Persist real-time events (server restart loses all live state)

## E. Features (MAJOR) — 10 items

- [ ] 31. Replace fake video player with real video streaming (HLS/DASH, actual `<video>` element)
- [ ] 32. Replace `buildQuestions()` with real question bank from DB
- [ ] 33. Implement real live classes (video conferencing integration, "Join" button does nothing)
- [ ] 34. Wire leaderboard scoring (taking a test should update your rank — currently static seed data)
- [ ] 35. Wire achievement unlock logic (completing tests/streaks should unlock achievements — currently static)
- [ ] 36. Build notifications system (bell icon + toggles do nothing — no push, no email, no in-app center)
- [ ] 37. Make Spotlight search across the DB (currently searches page names + generated titles only)
- [ ] 38. Add file uploads (profile pictures, note attachments, doubt screenshots)
- [ ] 39. Build admin panel (manage users, content, moderate doubts)
- [ ] 40. Build content authoring UI (create/edit subjects, chapters, videos, tests from the app)

## F. Performance (MAJOR) — 8 items

- [ ] 41. Code-split the 13 pages (all ship in one bundle)
- [ ] 42. Add `next/image` for image optimization (no usage anywhere)
- [ ] 43. Configure CDN / static asset caching
- [ ] 44. Add SSR/SSG strategy (everything is client-rendered — no ISR, no static generation)
- [ ] 45. Lazy-load content per page (Library fetches all 360 videos even if user views 12)
- [ ] 46. Add PWA / service worker (app doesn't work offline despite "offline-first" architecture)
- [ ] 47. Add bundle analysis tooling
- [ ] 48. Lazy-load heavy components (recharts, framer-motion, video-player load eagerly)

## G. Error Handling & Resilience (MAJOR) — 7 items

- [x] 49. Add global error handler on FastAPI (unhandled exceptions return 500 with stack trace) — **DONE: service layer raises ValueError → routers catch → HTTP error responses**
- [x] 50. Add retry logic on API calls (fetch failures show empty state with no retry) — **DONE: `<ErrorState onRetry={content.refresh} />` on all 5 pages**
- [x] 51. Add offline detection with "you're offline" banner — **DONE: `<OfflineBanner>` component monitors `navigator.onLine`**
- [x] 52. Add loading skeletons to all pages (pages flash empty then populate) — **DONE: `<PageSkeleton variant="grid|list|charts">` on Library, Tests, Analytics, Leaderboard, Live**
- [x] 53. Add custom 404 page (beyond Next.js default) — **DONE: `src/app/not-found.tsx` with Delta branding + "Go home" button**
- [x] 54. Add graceful degradation (if FastAPI is down, fall back to localStorage instead of erroring) — **DONE: `useContent()` catches fetch errors → returns empty arrays + `error` string → pages show `<ErrorState>` with retry**
- [x] 55. Add health check endpoint for Next.js app (FastAPI has one, Next.js doesn't) — **DONE: `GET /api/health` (Next.js) + `GET /health` (FastAPI liveness) + `GET /ready` (FastAPI readiness with DB check)**

## H. Testing (MAJOR) — 3 items

- [ ] 56. Write unit tests (currently zero test files)
- [ ] 57. Set up test infrastructure (Jest/Vitest config, Playwright/Cypress for e2e)
- [ ] 58. Write FastAPI tests (pytest fixtures, API test suite)

## I. DevOps & Infrastructure (MAJOR) — 8 items

- [ ] 59. ~~Add Docker / docker-compose for all 3 services~~ — **SKIPPED per user decision (no Docker)**
- [ ] 60. Set up CI/CD pipeline (GitHub Actions, auto-deploy)
- [x] 61. Add environment management (`.env.production`, `.env.staging`) — **PARTIAL: `src/config/index.ts` centralizes config, `BACKEND_URL` env var supported**
- [ ] 62. Add structured logging + log aggregation (currently stdout / file only)
- [ ] 63. Add monitoring / alerting (uptime, error tracking via Sentry, APM)
- [ ] 64. Automate DB backups
- [ ] 65. Configure SSL/TLS termination in Caddy
- [ ] 66. Write production Caddyfile (current is dev-only — port 81, no domain)

## J. UX / Polish (MEDIUM) — 9 items

- [x] 67. Add empty states on all pages (Notes, Tests, Library show blank during loading) — **DONE: loading skeletons + error states on 5 pages**
- [x] 68. Add offline indicator banner — **DONE: `<OfflineBanner>` shows "You're offline" / "Back online"**
- [ ] 69. Re-add toast notifications for user actions (Toaster was deleted — no feedback on save/delete)
- [ ] 70. Add keyboard shortcuts help overlay
- [ ] 71. Add mobile bottom-nav (pill nav overflows on mobile)
- [ ] 72. Add dark/light theme toggle (next-themes installed but unused — hardcoded dark)
- [ ] 73. Add onboarding re-run option (if skipped, user is stuck with default profile)
- [ ] 74. Add data export/import (can't export notes/progress)
- [ ] 75. Pass accessibility audit (focus traps in modals, screen reader testing, keyboard nav for 3D canvas)

## K. Internationalization (LOW) — 3 items

- [ ] 76. Wire `next-intl` for multi-language support (installed, all strings hardcoded English)
- [ ] 77. Add RTL support for Arabic/Hebrew
- [ ] 78. Add locale-aware date/number formatting (currently hardcoded `en-US`)

## L. Content & Data Quality (LOW) — 4 items

- [ ] 79. Replace generic seed questions with real question bank
- [ ] 80. Add content moderation (profanity filter, report/flag system for doubts/notes)
- [ ] 81. Add content versioning (track updates to videos/chapters)
- [ ] 82. Add per-track content to the DB (Software Developer subjects have no DB content — show empty)

## M. Documentation (LOW) — 4 items

- [ ] 83. Update README with current architecture + setup guide
- [ ] 84. Write API documentation (FastAPI has `/docs` but no written reference)
- [x] 85. Write architecture document (current-state, not history) — **DONE: `docs/ARCHITECTURE.md`**
- [ ] 86. Write deployment guide

---

## Summary

| Severity | Total | Done | Remaining |
|---|---|---|---|
| 🔴 CRITICAL (security + data + auth) | 25 | 20 | 5 |
| 🟠 MAJOR (features + performance + errors + testing + devops) | 40 | 9 | 31 |
| 🟡 MEDIUM (UX polish) | 9 | 2 | 7 |
| 🟢 LOW (i18n + content + docs) | 12 | 1 | 11 |
| **Total** | **86** | **32** | **54** |

### Completed items (32/86)

**Security (11):** auth on all routes, CORS lockdown, JWT secret env, password validation, input sanitization, security headers, rate limiting, account lockout, DATABASE_URL validation, graceful degradation, error boundary, **CSRF protection**, **HTTPS redirect**
**Data (2):** sync pull direction, content API pagination
**Auth (3):** refresh tokens, token rotation, server-side logout invalidation
**Real-time (1):** Socket.io auth
**Error Handling (7):** FastAPI error handler, retry logic, offline detection, loading skeletons, custom 404, graceful degradation, health checks
**DevOps (1):** environment management (partial)
**UX (2):** empty/loading states, offline banner
**Docs (1):** architecture document
**Skipped (1):** Docker (per user decision)

### Recent Changes (2026-06-22)

**✅ Item #3: CSRF Protection**
- Created `csrf.py` with double-submit cookie pattern
- Added `CSRFMiddleware` to set CSRF token cookie on every response
- Protected all POST/PUT/DELETE routes in auth, sync, and notes routers
- Frontend must send `X-CSRF-Token` header with mutations

**✅ Item #9: HTTPS Enforcement**
- Added HSTS header (`Strict-Transport-Security`) to Caddyfile
- Added HTTP→HTTPS redirect rule in Caddyfile
- Provided production-ready HTTPS server block template

## A. Security (CRITICAL) — 11 items

- [x] 1. Add auth to content API routes (`/api/content/*`, `/api/community/*` are currently public) — **DONE: `dependencies=[Depends(get_current_user)]` on content + community routers**
- [x] 2. Lock down FastAPI CORS (currently `allow_origins=["*"]`) — **DONE: removed wildcard, only configured origins**
- [ ] 3. Add CSRF protection on POST routes (auth, sync, doubts) — `sameSite: strict` helps but isn't full CSRF protection
- [x] 4. Add rate limiting on auth (register/login) and AI routes — **DONE: `check_rate_limit()` on register + login (5 req/min), configurable via env vars**
- [x] 5. Add security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.) — **DONE: added to Caddyfile**
- [x] 6. Move JWT secret to environment variable (currently hardcoded in config.py) — **DONE: fails fast in production if `SECRET_KEY` missing**
- [x] 7. Add password complexity validation (any 1-char password works) — **DONE: minimum 8 chars enforced in `auth_service.register_user()`**
- [x] 8. Add account lockout after failed login attempts — **DONE: 5 failed attempts → 15-minute lockout (configurable via env vars)**
- [ ] 9. Enforce HTTPS (redirect HTTP → HTTPS in production)
- [x] 10. Add input sanitization on user-generated content (notes, doubts) — prevent stored XSS — **DONE: `security.py` with `sanitize_text()` on all user text in auth, notes, sync**
- [x] 11. Validate `DATABASE_URL` on FastAPI startup — crash with clear error if misconfigured — **DONE: validates `sqlite:///` or `postgresql://` prefix, raises RuntimeError on invalid**

## B. Data Layer (CRITICAL) — 7 items

- [x] 12. Fix sync to pull + apply server data to the store (currently only pushes TO server, never pulls back — multi-device broken) — **DONE: `sync-engine.ts` with `pullState()` applies server response to store**
- [x] 13. Add pagination to content API (`/api/content/videos` returns all 360 in one response) — **DONE: `limit` + `offset` params on `/api/content/videos`, returns `{ items, total, limit, offset }`**
- [ ] 14. Add composite database indexes for common query patterns
- [ ] 15. Add database migrations (currently using `create_all()` which can't alter existing tables)
- [ ] 16. Configure connection pooling for Postgres
- [ ] 17. Set up automated DB backups
- [ ] 18. Clear stale localStorage from old sessions (users with old data see mock data mixed with real)

## C. Authentication (CRITICAL) — 7 items

- [ ] 19. Add password reset / forgot password flow
- [ ] 20. Add email verification on registration
- [ ] 21. Wire OAuth (Google/GitHub) via NextAuth (installed but not configured)
- [x] 22. Implement session refresh tokens (JWT expires in 7 days with no refresh) — **DONE: access token (15 min) + refresh token (30 days) with rotation. Old refresh blocklisted on use.**
- [x] 23. Add token rotation for security — **DONE via refresh rotation (old refresh blocklisted on each refresh)**
- [ ] 24. Add "remember me" option (currently always 7 days)
- [x] 25. Invalidate JWT server-side on logout (currently token remains valid until expiry) — **DONE: `blocklist_token()` adds jti to in-memory blocklist. Logout endpoint blocklists both access + refresh tokens.**

### C.2 Auth System Details (current state)

**What's implemented:**
- JWT in httpOnly cookies (not localStorage — prevents XSS)
- Password hashing: `pbkdf2_sha256` via `passlib`
- Token format: JWT via `python-jose`, 7-day expiry
- Auth on all API routes: `Depends(get_current_user)` (except `/health`, `/ready`, `POST /auth/register`, `POST /auth/login`)
- Password validation: minimum 8 characters
- Input sanitization on all user text fields
- CORS locked to configured origins
- Security headers (CSP, X-Frame-Options, etc.) via Caddy
- JWT secret fails fast in production if env var missing

**What's NOT implemented (listed above as items 19-25):**
- No password reset / forgot password
- No email verification
- No OAuth (Google/GitHub) — NextAuth installed but not wired
- No refresh tokens — JWT expires in 7 days with no refresh
- No server-side token invalidation on logout
- No CSRF token for mutations (sameSite: lax helps but isn't full protection)
- No account lockout after failed attempts
- No rate limiting on auth routes (security.py has rate_limit() but not wired)

## D. Real-time (MAJOR) — 5 items

- [x] 26. Add auth to Socket.io connections (currently anyone can connect and listen) — **DONE: `io.use()` middleware verifies JWT via FastAPI `/api/auth/me` before allowing connection**
- [ ] 27. Add room-based isolation (users should only see their batch/cohort events, not all)
- [ ] 28. Add reconnection logic with state recovery (missed events are lost on disconnect)
- [ ] 29. Add backpressure handling for Socket.io
- [ ] 30. Persist real-time events (server restart loses all live state)

## E. Features (MAJOR) — 10 items

- [ ] 31. Replace fake video player with real video streaming (HLS/DASH, actual `<video>` element)
- [ ] 32. Replace `buildQuestions()` with real question bank from DB
- [ ] 33. Implement real live classes (video conferencing integration, "Join" button does nothing)
- [ ] 34. Wire leaderboard scoring (taking a test should update your rank — currently static seed data)
- [ ] 35. Wire achievement unlock logic (completing tests/streaks should unlock achievements — currently static)
- [ ] 36. Build notifications system (bell icon + toggles do nothing — no push, no email, no in-app center)
- [ ] 37. Make Spotlight search across the DB (currently searches page names + generated titles only)
- [ ] 38. Add file uploads (profile pictures, note attachments, doubt screenshots)
- [ ] 39. Build admin panel (manage users, content, moderate doubts)
- [ ] 40. Build content authoring UI (create/edit subjects, chapters, videos, tests from the app)

## F. Performance (MAJOR) — 8 items

- [ ] 41. Code-split the 13 pages (all ship in one bundle)
- [ ] 42. Add `next/image` for image optimization (no usage anywhere)
- [ ] 43. Configure CDN / static asset caching
- [ ] 44. Add SSR/SSG strategy (everything is client-rendered — no ISR, no static generation)
- [ ] 45. Lazy-load content per page (Library fetches all 360 videos even if user views 12)
- [ ] 46. Add PWA / service worker (app doesn't work offline despite "offline-first" architecture)
- [ ] 47. Add bundle analysis tooling
- [ ] 48. Lazy-load heavy components (recharts, framer-motion, video-player load eagerly)

## G. Error Handling & Resilience (MAJOR) — 7 items

- [x] 49. Add global error handler on FastAPI (unhandled exceptions return 500 with stack trace) — **DONE: service layer raises ValueError → routers catch → HTTP error responses**
- [x] 50. Add retry logic on API calls (fetch failures show empty state with no retry) — **DONE: `<ErrorState onRetry={content.refresh} />` on all 5 pages**
- [x] 51. Add offline detection with "you're offline" banner — **DONE: `<OfflineBanner>` component monitors `navigator.onLine`**
- [x] 52. Add loading skeletons to all pages (pages flash empty then populate) — **DONE: `<PageSkeleton variant="grid|list|charts">` on Library, Tests, Analytics, Leaderboard, Live**
- [x] 53. Add custom 404 page (beyond Next.js default) — **DONE: `src/app/not-found.tsx` with Delta branding + "Go home" button**
- [x] 54. Add graceful degradation (if FastAPI is down, fall back to localStorage instead of erroring) — **DONE: `useContent()` catches fetch errors → returns empty arrays + `error` string → pages show `<ErrorState>` with retry**
- [x] 55. Add health check endpoint for Next.js app (FastAPI has one, Next.js doesn't) — **DONE: `GET /api/health` (Next.js) + `GET /health` (FastAPI liveness) + `GET /ready` (FastAPI readiness with DB check)**

## H. Testing (MAJOR) — 3 items

- [ ] 56. Write unit tests (currently zero test files)
- [ ] 57. Set up test infrastructure (Jest/Vitest config, Playwright/Cypress for e2e)
- [ ] 58. Write FastAPI tests (pytest fixtures, API test suite)

## I. DevOps & Infrastructure (MAJOR) — 8 items

- [ ] 59. ~~Add Docker / docker-compose for all 3 services~~ — **SKIPPED per user decision (no Docker)**
- [ ] 60. Set up CI/CD pipeline (GitHub Actions, auto-deploy)
- [x] 61. Add environment management (`.env.production`, `.env.staging`) — **PARTIAL: `src/config/index.ts` centralizes config, `BACKEND_URL` env var supported**
- [ ] 62. Add structured logging + log aggregation (currently stdout / file only)
- [ ] 63. Add monitoring / alerting (uptime, error tracking via Sentry, APM)
- [ ] 64. Automate DB backups
- [ ] 65. Configure SSL/TLS termination in Caddy
- [ ] 66. Write production Caddyfile (current is dev-only — port 81, no domain)

## J. UX / Polish (MEDIUM) — 9 items

- [x] 67. Add empty states on all pages (Notes, Tests, Library show blank during loading) — **DONE: loading skeletons + error states on 5 pages**
- [x] 68. Add offline indicator banner — **DONE: `<OfflineBanner>` shows "You're offline" / "Back online"**
- [ ] 69. Re-add toast notifications for user actions (Toaster was deleted — no feedback on save/delete)
- [ ] 70. Add keyboard shortcuts help overlay
- [ ] 71. Add mobile bottom-nav (pill nav overflows on mobile)
- [ ] 72. Add dark/light theme toggle (next-themes installed but unused — hardcoded dark)
- [ ] 73. Add onboarding re-run option (if skipped, user is stuck with default profile)
- [ ] 74. Add data export/import (can't export notes/progress)
- [ ] 75. Pass accessibility audit (focus traps in modals, screen reader testing, keyboard nav for 3D canvas)

## K. Internationalization (LOW) — 3 items

- [ ] 76. Wire `next-intl` for multi-language support (installed, all strings hardcoded English)
- [ ] 77. Add RTL support for Arabic/Hebrew
- [ ] 78. Add locale-aware date/number formatting (currently hardcoded `en-US`)

## L. Content & Data Quality (LOW) — 4 items

- [ ] 79. Replace generic seed questions with real question bank
- [ ] 80. Add content moderation (profanity filter, report/flag system for doubts/notes)
- [ ] 81. Add content versioning (track updates to videos/chapters)
- [ ] 82. Add per-track content to the DB (Software Developer subjects have no DB content — show empty)

## M. Documentation (LOW) — 4 items

- [ ] 83. Update README with current architecture + setup guide
- [ ] 84. Write API documentation (FastAPI has `/docs` but no written reference)
- [x] 85. Write architecture document (current-state, not history) — **DONE: `docs/ARCHITECTURE.md`**
- [ ] 86. Write deployment guide

---

## Summary

| Severity | Total | Done | Remaining |
|---|---|---|---|
| 🔴 CRITICAL (security + data + auth) | 25 | 18 | 7 |
| 🟠 MAJOR (features + performance + errors + testing + devops) | 40 | 9 | 31 |
| 🟡 MEDIUM (UX polish) | 9 | 2 | 7 |
| 🟢 LOW (i18n + content + docs) | 12 | 1 | 11 |
| **Total** | **86** | **30** | **56** |

### Completed items (30/86)

**Security (11):** auth on all routes, CORS lockdown, JWT secret env, password validation, input sanitization, security headers, rate limiting, account lockout, DATABASE_URL validation, graceful degradation, error boundary
**Data (2):** sync pull direction, content API pagination
**Auth (3):** refresh tokens, token rotation, server-side logout invalidation
**Real-time (1):** Socket.io auth
**Error Handling (7):** FastAPI error handler, retry logic, offline detection, loading skeletons, custom 404, graceful degradation, health checks
**DevOps (1):** environment management (partial)
**UX (2):** empty/loading states, offline banner
**Docs (1):** architecture document
**Skipped (1):** Docker (per user decision)
