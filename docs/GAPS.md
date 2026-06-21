# GAPS.md
## Project Delta — Gap Analysis

> Generated: 2026-06-21 | Phase 1 deliverable
> Audited against the current codebase at `/home/z/my-project`

---

## Architecture

### GAP-A1: UI components directly call fetch()
- **Severity**: High
- **Location**: `src/components/delta/pages/doubts.tsx:110,150`, `src/components/delta/pages/live.tsx:31`, `src/components/delta/pages/leaderboard.tsx:31`, `src/components/delta/auth-modal.tsx:37`, `src/components/delta/top-nav.tsx:122`
- **Root Cause**: No data layer abstraction — components bypass any service/repository pattern and call `fetch()` directly
- **Recommendation**: Introduce a `lib/api/` layer with typed client functions (`api.content.getSubjects()`, `api.auth.login()`, etc.). Components call the API layer, never `fetch()` directly. Use TanStack Query (installed, unused) for caching/invalidation.

### GAP-A2: Business logic in UI components
- **Severity**: Medium
- **Location**: `src/components/delta/pages/doubts.tsx:282` (`useStore.getState().hasVotedDoubt(d.id)` inside JSX render), `src/components/delta/pages/notes.tsx:69` (`useStore.getState().notes[0]`)
- **Root Cause**: No separation between presentation and business logic — components read store state directly inside render paths instead of via selectors
- **Recommendation**: Extract business logic into hooks (`useDoubts()`, `useNotes()`) that wrap store access + API calls

### GAP-A3: Monolithic page files
- **Severity**: Medium
- **Location**: `src/components/delta/pages/tests.tsx` (948 lines), `src/components/delta/video-player.tsx` (725 lines), `src/components/delta/onboarding.tsx` (626 lines), `src/components/delta/pages/settings.tsx` (602 lines)
- **Root Cause**: Each page is a single file containing all views, sub-components, and logic
- **Recommendation**: Split into feature directories: `features/tests/{AvailableView,AttemptView,ResultsView,HistoryView,AnalysisView}/`

### GAP-A4: No service layer on FastAPI side
- **Severity**: High
- **Location**: `mini-services/api/routers/*.py` — routers directly access SQLAlchemy models
- **Root Cause**: Missing service/repository abstraction — business logic lives in route handlers
- **Recommendation**: Introduce `services/` layer (e.g., `UserService`, `ContentService`, `SyncService`) that encapsulates business logic. Routers only parse requests and call services.

---

## Configuration

### GAP-C1: Hardcoded backend URLs
- **Severity**: High
- **Location**: `src/app/api/auth/register/route.ts:11`, `src/app/api/auth/login/route.ts:10`, `src/app/api/auth/me/route.ts:13`, `src/app/api/sync/route.ts:16`, `src/app/api/content/*/route.ts`, `src/app/api/community/*/route.ts` — all hardcode `http://localhost:8000`
- **Root Cause**: No centralized configuration — each API route hardcodes the backend URL
- **Recommendation**: Create `src/lib/config.ts` that reads `BACKEND_URL` from env. All API routes import from there.

### GAP-C2: FastAPI CORS allows all origins
- **Severity**: Critical
- **Location**: `mini-services/api/config.py:25` — `allow_origins=CORS_ORIGINS + ["*"]`
- **Root Cause**: Permissive CORS for development was never locked down
- **Recommendation**: Remove `["*"]`. Only allow configured origins in production.

### GAP-C3: JWT secret hardcoded
- **Severity**: Critical
- **Location**: `mini-services/api/config.py:23` — `SECRET_KEY = os.environ.get("SECRET_KEY", "delta-dev-secret-change-in-production")`
- **Root Cause**: Fallback default is insecure; if env var is missing, the app silently uses the hardcoded secret
- **Recommendation**: Fail fast if `SECRET_KEY` is not set in production. No default.

---

## Reliability

### GAP-R1: No error handling on frontend fetch calls
- **Severity**: High
- **Location**: `src/components/delta/pages/live.tsx:31-40`, `src/components/delta/pages/leaderboard.tsx:31-37` — `.catch(() => {})` silently swallows errors
- **Root Cause**: No error boundary or retry pattern for API calls
- **Recommendation**: Use TanStack Query with `retry` + `onError` callbacks. Show error states in UI.

### GAP-R2: Sync doesn't apply server data
- **Severity**: Critical
- **Location**: `src/lib/sync.ts:120-130` — receives `SyncResponse` but only logs `synced_at`, never applies the data to the store
- **Root Cause**: The pull direction of sync was never implemented — only push works
- **Recommendation**: After receiving the sync response, apply `data.notes`, `data.doubts`, `data.profile`, etc. to the Zustand store via `useStore.setState()`.

### GAP-R3: No loading states on most pages
- **Severity**: Medium
- **Location**: `src/components/delta/pages/library.tsx`, `src/components/delta/pages/tests.tsx`, `src/components/delta/pages/syllabus.tsx` — pages render empty content while `useContent()` is loading
- **Root Cause**: `useContent()` returns `loading: true` but pages don't check it
- **Recommendation**: Each page should show a skeleton/spinner while `content.loading === true`

### GAP-R4: No graceful degradation when backend is down
- **Severity**: High
- **Location**: All pages that call `useContent()` — if FastAPI is down, `useContent()` returns empty arrays, pages show empty states with no error message
- **Root Cause**: No fallback strategy — the app doesn't detect backend unavailability
- **Recommendation**: `useContent()` should track fetch errors and expose an `error` field. Pages show "Backend unavailable — showing cached data" with a retry button.

---

## Security

### GAP-S1: Content API routes have no authentication
- **Severity**: Critical
- **Location**: `mini-services/api/routers/content.py` — all endpoints are public (`def list_subjects(db: Session = Depends(get_db))` with no `get_current_user`)
- **Root Cause**: Content routes were added without auth dependency
- **Recommendation**: Add `user: User = Depends(get_current_user)` to all content endpoints (or make them public-read with rate limiting)

### GAP-S2: No input sanitization on user content
- **Severity**: High
- **Location**: `mini-services/api/routers/notes.py` — `NoteCreate` accepts raw `title`, `content`, `tags` with no sanitization. Same for doubts.
- **Root Cause**: No XSS prevention layer
- **Recommendation**: Sanitize all user-generated text with `bleach` (Python) before storing. Escape on render.

### GAP-S3: No rate limiting
- **Severity**: High
- **Location**: All FastAPI routes + Next.js API routes
- **Root Cause**: No rate limiting middleware installed
- **Recommendation**: Add `slowapi` (FastAPI) + Next.js middleware for rate limiting auth + AI routes

### GAP-S4: Socket.io has no authentication
- **Severity**: Critical
- **Location**: `mini-services/realtime/index.ts` — accepts all connections, no token verification
- **Root Cause**: Real-time service was built without auth
- **Recommendation**: Verify JWT on socket connection. Reject unauthenticated connections.

---

## Testing

### GAP-T1: Zero test files
- **Severity**: Critical
- **Location**: Entire `src/` and `mini-services/api/` directories
- **Root Cause**: No test infrastructure was ever set up
- **Recommendation**: Set up Vitest (frontend) + pytest (backend). Write unit tests for store actions, API routes, content generator, sync logic. Write e2e tests with Playwright for critical flows (onboarding, auth, doubts, tests).

---

## DevOps

### GAP-D1: No Docker
- **Severity**: High
- **Location**: No `Dockerfile` or `docker-compose.yml` in project root
- **Root Cause**: App runs only via manual `start_all.py` script
- **Recommendation**: Create multi-stage Dockerfiles for each service (Next.js, FastAPI, Socket.io). Create `docker-compose.yml` for local dev + production deployment.

### GAP-D2: No CI/CD
- **Severity**: High
- **Location**: No `.github/workflows/` directory
- **Root Cause**: No pipeline was set up
- **Recommendation**: GitHub Actions: lint → type-check → test → build → security scan → deploy

### GAP-D3: No environment management
- **Severity**: Medium
- **Location**: `.env` has one variable (`DATABASE_URL`). No `.env.production`, `.env.staging`
- **Root Cause**: Single-environment development
- **Recommendation**: Create `.env.example` with all required vars. Use `NEXT_PUBLIC_BACKEND_URL` for frontend → backend URL.

### GAP-D4: No structured logging
- **Severity**: Medium
- **Location**: FastAPI logs to stdout via `print()` + uvicorn default. Next.js logs to `dev.log` file.
- **Root Cause**: No logging framework installed
- **Recommendation**: Use `structlog` (Python) + Pino (Node.js) for structured JSON logs with correlation IDs.

---

## Data Access

### GAP-DA1: No pagination on content API
- **Severity**: High
- **Location**: `mini-services/api/routers/content.py` — `list_videos()` returns all videos in one response
- **Root Cause**: No pagination parameter
- **Recommendation**: Add `limit` + `offset` parameters. Return total count in response header.

### GAP-DA2: No database migrations
- **Severity**: High
- **Location**: `mini-services/api/main.py:24` — uses `Base.metadata.create_all()` which can't alter existing tables
- **Root Cause**: No migration tool (Alembic) configured
- **Recommendation**: Set up Alembic for SQLAlchemy migrations. Never use `create_all()` in production.

---

## Performance

### GAP-P1: No code-splitting
- **Severity**: Medium
- **Location**: All 13 pages imported eagerly in `app-shell.tsx`
- **Root Cause**: Static imports, no `next/dynamic`
- **Recommendation**: Use `next/dynamic` to lazy-load pages. Only the active page should be in the bundle.

### GAP-P2: useContent fetches all data on every page
- **Severity**: Medium
- **Location**: `src/hooks/use-content.ts` — fetches all subjects, all videos, all tests, all leaderboard entries, all live sessions on mount, regardless of which page is active
- **Root Cause**: Single hook for all content — no per-page granularity
- **Recommendation**: Split into `useSubjects()`, `useVideos(subjectId)`, `useTests(filters)`, `useLeaderboard(scope)`, `useLiveSessions()`. Each page only fetches what it needs.

### GAP-P3: No image optimization
- **Severity**: Low
- **Location**: No `next/image` usage anywhere in `src/`
- **Root Cause**: App uses CSS backgrounds + raw `<img>` tags
- **Recommendation**: Replace with `next/image` for all images (avatars, thumbnails, icons)

---

## Summary

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Architecture | 0 | 2 | 2 | 0 | 4 |
| Configuration | 2 | 1 | 0 | 0 | 3 |
| Reliability | 1 | 2 | 1 | 0 | 4 |
| Security | 2 | 2 | 0 | 0 | 4 |
| Testing | 1 | 0 | 0 | 0 | 1 |
| DevOps | 0 | 2 | 2 | 0 | 4 |
| Data Access | 0 | 2 | 0 | 0 | 2 |
| Performance | 0 | 0 | 2 | 1 | 3 |
| **Total** | **6** | **11** | **9** | **1** | **27** |
