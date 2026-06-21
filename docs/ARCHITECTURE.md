# ARCHITECTURE.md
## Project Delta — Architecture Design

> Generated: 2026-06-21 | Phase 2 deliverable
> Status: **Pending approval** — no implementation until approved

---

## Selected Architecture: Clean Architecture + Feature-Based Modules

### Why
- **Clean Architecture**: enforces dependency rule (UI → adapters → core), keeps business logic portable, makes testing easy
- **Feature-based modules**: each feature (auth, content, doubts, tests, etc.) is self-contained with its own public API, internal implementation, and tests
- **Not hexagonal**: the app is a web SaaS, not a multi-interface system — hexagonal adds ceremony without value here

---

## Folder Structure

```
/home/z/my-project/
├── src/                          # Frontend (Next.js)
│   ├── app/                      # Next.js App Router (routes only — no logic)
│   │   ├── api/                  # API route handlers (thin proxies to FastAPI)
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Root page (renders <AppShell/>)
│   │   └── globals.css           # Global styles
│   │
│   ├── features/                 # Feature modules (one per domain area)
│   │   ├── auth/                 # Authentication
│   │   │   ├── api.ts            # Public API: login(), register(), logout(), me()
│   │   │   ├── AuthModal.tsx     # UI component
│   │   │   ├── useAuth.ts        # Hook: useAuth()
│   │   │   └── types.ts          # Auth types
│   │   ├── content/              # Content (subjects, videos, tests)
│   │   │   ├── api.ts            # Public API: getSubjects(), getVideos(), getTests()
│   │   │   ├── useContent.ts     # Hook: useContent() with TanStack Query
│   │   │   └── types.ts
│   │   ├── doubts/               # AI doubt solver
│   │   │   ├── api.ts
│   │   │   ├── DoubtsPage.tsx
│   │   │   ├── useDoubts.ts
│   │   │   └── types.ts
│   │   ├── notes/                # Notes CRUD
│   │   ├── tests/                # Test-taking engine
│   │   ├── dashboard/            # Dashboard canvas + components
│   │   ├── leaderboard/          # Leaderboard
│   │   ├── live/                 # Live sessions
│   │   ├── analytics/            # Analytics + charts
│   │   ├── settings/             # Settings
│   │   ├── profile/              # Profile
│   │   ├── achievements/         # Achievements
│   │   ├── syllabus/             # Syllabus tracker
│   │   ├── playground/           # Dashboard editor
│   │   └── onboarding/           # Onboarding wizard
│   │
│   ├── core/                     # Core business logic (framework-agnostic)
│   │   ├── store.ts              # Zustand store (the single source of truth)
│   │   ├── types.ts              # Shared domain types
│   │   └── utils.ts              # Pure utility functions
│   │
│   ├── adapters/                 # External integrations
│   │   ├── api-client.ts         # Typed fetch wrapper → FastAPI
│   │   ├── realtime-client.ts    # Socket.io client
│   │   └── sync-engine.ts        # Offline-first sync (push + pull)
│   │
│   ├── config/                   # Startup configuration only
│   │   └── index.ts              # Reads env vars, exports typed config
│   │
│   ├── shared/                   # Shared UI (design system)
│   │   ├── ui.tsx                # Primitives: GlassCard, Button, Pill, etc.
│   │   ├── global.tsx            # Layout: ScrollArea, EmptyStateWrapper, Field, FilterBar
│   │   ├── virtual.tsx           # VirtualList, VirtualGrid
│   │   ├── data.tsx              # DataCard, StatBlock
│   │   ├── theme-vars.tsx        # CSS var injector
│   │   ├── scaled-page.tsx       # Viewport scaler
│   │   ├── motion.ts             # Spring presets + variants
│   │   └── custom-renderers.tsx  # Custom component template renderers
│   │
│   └── lib/                      # Global utilities (format, subjects, etc.)
│       ├── format.ts
│       ├── subjects.ts
│       ├── types.ts
│       └── custom-templates.ts
│
├── mini-services/
│   ├── api/                      # FastAPI backend
│   │   ├── main.py               # App entry (routing only — no logic)
│   │   ├── config.py             # Typed config from env vars
│   │   ├── database.py           # Engine + session factory
│   │   ├── models.py             # SQLAlchemy models (DB schema)
│   │   ├── schemas.py            # Pydantic schemas (API contracts)
│   │   ├── auth.py               # Auth utilities (hash, JWT)
│   │   ├── services/             # Business logic layer
│   │   │   ├── auth_service.py
│   │   │   ├── content_service.py
│   │   │   ├── sync_service.py
│   │   │   └── note_service.py
│   │   ├── routers/              # Route handlers (thin — call services)
│   │   │   ├── auth.py
│   │   │   ├── content.py
│   │   │   ├── sync.py
│   │   │   ├── notes.py
│   │   │   └── community.py
│   │   ├── seed.py               # DB seeding script
│   │   └── tests/                # pytest tests
│   │
│   └── realtime/                 # Socket.io service
│       ├── index.ts              # Server entry
│       └── handlers/             # Event handlers (live, leaderboard, doubts)
│
├── docs/                         # Documentation
│   ├── REQUIREMENTS.md
│   ├── VISION.md
│   ├── GAPS.md
│   ├── ARCHITECTURE.md           # This file
│   └── API.md                    # API reference (to be written)
│
├── tests/                        # E2E tests (Playwright)
│   ├── onboarding.spec.ts
│   ├── auth.spec.ts
│   ├── doubts.spec.ts
│   └── tests.spec.ts
│
├── docker/                       # Docker configurations
│   ├── Dockerfile.nextjs
│   ├── Dockerfile.api
│   ├── Dockerfile.realtime
│   └── docker-compose.yml
│
├── .github/
│   └── workflows/
│       ├── ci.yml                # Lint + test + build on PR
│       └── deploy.yml            # Deploy on merge to main
│
├── todo.md                       # Production readiness checklist (86 items)
├── package.json
├── Caddyfile
└── start_all.py                  # Dev startup script
```

---

## Dependency Rule

```
features/ (UI + hooks)
    ↓ calls
adapters/ (API client, realtime, sync)
    ↓ calls
core/ (store, types, utils — pure, no I/O)

shared/ (UI primitives — no business logic)
config/ (startup config — reads env once)

lib/ (pure functions — format, subjects — no state)
```

**Rules:**
- `core/` never imports from `features/`, `adapters/`, or any framework
- `adapters/` never imports from `features/` (features call adapters, not vice versa)
- `features/` can import from `core/`, `adapters/`, `shared/`, `lib/`, `config/`
- `shared/` never imports from `features/` or `core/` (it's pure UI)
- `config/` is read once at startup; no `process.env` access elsewhere

---

## Feature Module Contract

Every feature module MUST export:

```typescript
// features/{name}/api.ts — public API (what other features can import)
export const featureApi = {
  getData: () => Promise<Data>,
  mutate: (input: Input) => Promise<Output>,
}

// features/{name}/useFeature.ts — React hook (what components use)
export function useFeature() {
  // Uses TanStack Query for caching + invalidation
  // Calls featureApi internally
  return { data, loading, error, refetch }
}

// features/{name}/types.ts — types only (no runtime code)
export interface FeatureData { ... }
```

**Other features import ONLY from `api.ts` or `useFeature.ts` — never from internal files.**

---

## Data Flow

```
User interaction
    ↓
Feature hook (useDoubts, useContent, etc.)
    ↓
TanStack Query (cache + invalidation)
    ↓
API client (adapters/api-client.ts)
    ↓
Next.js API route (thin proxy — adds auth cookie)
    ↓
FastAPI router (thin — parses request, calls service)
    ↓
Service layer (business logic — auth, validation, orchestration)
    ↓
SQLAlchemy model (DB access)
    ↓
PostgreSQL / SQLite
```

**Reverse flow (real-time):**
```
FastAPI / Socket.io event
    ↓
Socket.io client (adapters/realtime-client.ts)
    ↓
Feature hook (useRealtime updates query cache)
    ↓
React re-renders
```

---

## Configuration

### Frontend (`src/config/index.ts`)
```typescript
export const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8000',
  realtimeUrl: process.env.NEXT_PUBLIC_REALTIME_URL || '/',
  isProduction: process.env.NODE_ENV === 'production',
} as const
```

### Backend (`mini-services/api/config.py`)
```python
class Config:
    DATABASE_URL: str = os.environ.get("DATABASE_URL")  # NO default — fail fast
    SECRET_KEY: str = os.environ.get("SECRET_KEY")     # NO default — fail fast
    CORS_ORIGINS: list[str] = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("TOKEN_EXPIRE_MINUTES", "10080"))
```

**No `os.getenv()` or `process.env` outside these files.**

---

## Error Handling

### Frontend
- TanStack Query `onError` callback → toast notification
- Global error boundary in `page.tsx` → shows error + stack + reload button
- Every feature hook exposes `error` state

### Backend
- FastAPI exception handlers → structured JSON error response
- Domain exceptions: `UserNotFoundError`, `InvalidCredentialsError`, `ContentNotFoundError`
- No stack traces in production responses

---

## Testing Strategy

| Layer | Tool | What to test |
|---|---|---|
| Core (store, utils) | Vitest | Pure logic — store actions, selectors, formatters |
| Adapters (API client) | Vitest + MSW | Mock fetch responses, test request/response mapping |
| Feature hooks | Vitest + @testing-library/react-hooks | Hook behavior with mocked queries |
| UI components | Vitest + @testing-library/react | Rendering, user interactions, a11y |
| FastAPI routes | pytest + httpx | Request/response, auth, validation |
| FastAPI services | pytest + pytest-asyncio | Business logic with mocked DB |
| E2E | Playwright | Onboarding, auth, doubts, tests, sync |

**Coverage target: ≥ 80% on `core/` and `adapters/`**

---

## Observability

### Metrics (Prometheus)
- `http_request_duration_seconds` (FastAPI)
- `http_requests_total` (FastAPI)
- `active_websocket_connections` (Socket.io)
- `db_query_duration_seconds` (SQLAlchemy)

### Tracing (OpenTelemetry)
- Every API request gets a trace ID
- Trace propagates: browser → Next.js → FastAPI → DB
- Socket.io events are traced

### Logging (structured JSON)
```json
{
  "timestamp": "2026-06-21T10:00:00Z",
  "level": "info",
  "trace_id": "abc123",
  "service": "delta-api",
  "message": "User registered",
  "user_id": "uuid",
  "email": "user@example.com"
}
```

### Health Checks
- `GET /health` — service is alive
- `GET /ready` — service is ready (DB connected, dependencies up)

---

## Security Architecture

| Layer | Measure |
|---|---|
| **Auth** | JWT in httpOnly cookie, refresh tokens, server-side invalidation |
| **API routes** | All routes require auth (except `/health`, `/ready`, `POST /auth/register`, `POST /auth/login`) |
| **Rate limiting** | `slowapi` on FastAPI — 5 req/min on auth, 20 req/min on AI routes |
| **CORS** | Only configured origins (no `*`) |
| **CSRF** | SameSite=strict cookies + CSRF token for mutations |
| **Input sanitization** | `bleach` on Python side, DOMPurify on frontend |
| **Headers** | CSP, X-Frame-Options, X-Content-Type-Options, HSTS |
| **Secrets** | No defaults — fail fast if env vars missing in production |

---

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│  Caddy (reverse proxy + TLS)                 │
│  ├─ / → Next.js (port 3000)                 │
│  ├─ /api → FastAPI (port 8000)              │
│  └─ /socket.io → Socket.io (port 3003)      │
├─────────────────────────────────────────────┤
│  Docker Compose                              │
│  ├─ nextjs container (Node.js + standalone)  │
│  ├─ api container (Python + uvicorn)         │
│  ├─ realtime container (Bun + socket.io)     │
│  ├─ postgres container                       │
│  └─ caddy container                          │
└─────────────────────────────────────────────┘
```

---

## Migration Plan (from current codebase)

### What stays
- Next.js 16 + App Router + TypeScript
- FastAPI + SQLAlchemy + SQLite/Postgres
- Socket.io real-time
- Zustand store (with refactoring)
- Framer Motion 3D transitions
- Tailwind CSS 4 + shadcn/ui
- All 13 pages (refactored into feature modules)
- The global component layer (ui.tsx, global.tsx, virtual.tsx, data.tsx)
- The content API + auth + sync infrastructure
- The custom component template system

### What gets refactored
- Page files split into feature directories
- Direct `fetch()` calls → `adapters/api-client.ts` + TanStack Query
- `useContent()` split into per-feature hooks
- FastAPI routers → thin handlers calling `services/` layer
- Hardcoded URLs → `config/`
- Error handling → TanStack Query + error boundaries
- Store actions → feature-scoped hooks

### What gets added
- `tests/` directory (Vitest + Playwright)
- `docker/` directory (Dockerfiles + compose)
- `.github/workflows/` (CI/CD)
- `docs/API.md` (API reference)
- Alembic migrations
- Structured logging (structlog + Pino)
- OpenTelemetry tracing
- Rate limiting (slowapi)
- Input sanitization (bleach + DOMPurify)
- Security headers (Caddy config)
- PWA manifest + service worker
