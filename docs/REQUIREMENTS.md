# REQUIREMENTS.md
## Project Delta — Universal Learning Platform

> Generated: 2026-06-21 | Phase 0 deliverable

---

## 1. Domain Definition

### Problem
Learners across all disciplines — students, professionals, hobbyists — lack a single, customizable workspace that adapts to their field, their pace, and their learning style. Existing platforms are either exam-locked (Unacademy, Physics Wallah), skill-locked (Udemy, Coursera), or rigid in structure (Notion, Anki). There is no platform where a JEE aspirant, a frontend developer upskilling, and a language learner share the same architecture but see entirely different content, tools, and workflows.

### Target Users
1. **Students** preparing for competitive exams (JEE, NEET, UPSC, GATE, boards)
2. **Professionals** upskilling (developers, designers, PMs, data scientists, marketers)
3. **Personal growth learners** (language learning, fitness, music, creative writing)
4. **Self-directed learners** who want to build their own curriculum and track progress

### Pain Points in Current Solutions
| Pain point | Existing platforms | Delta's answer |
|---|---|---|
| Locked to one exam/field | Unacademy = JEE/NEET only; Udemy = course-based, no progress tracking | Exam-agnostic; user picks track + subjects during onboarding |
| No customizable dashboard | All platforms have fixed layouts | Free-form canvas with drag/resize + custom component authoring (TODO list, timer, counter, etc.) |
| No offline-first support | Most platforms require constant internet | Offline-first with localStorage + sync when online |
| No real-time community | Forums are separate from the learning interface | Socket.io real-time: live classes, doubt community, leaderboard |
| One-size-fits-all content | Same video/test structure for everyone | Per-track content packs + content generator for custom subjects |
| No AI assistance | Limited or expensive AI tutoring | AI doubt-solver (LLM), planned: study-plan generator, AI test feedback, conversational tutor |
| Rigid appearance | No theme customization | User picks accent color, density, glassmorphism, nav pages |

### Project Type
**SaaS Platform** (web application + API service + real-time service)

---

## 2. Existing Solutions Analysis

### 2.1 Unacademy
- **Strengths**: Large content library, live classes, structured courses, strong brand in India
- **Weaknesses**: Exam-locked (JEE/NEET/UPSC only), no offline mode, fixed UI, expensive subscription, no customization
- **Missing features**: Custom dashboard, cross-field learning, offline-first, component authoring
- **Architectural limitations**: Monolithic frontend, no plugin/extension system, server-dependent
- **User complaints**: "Too expensive", "Same content repackaged", "No way to customize what I see", "App crashes offline"

### 2.2 Udemy
- **Strengths**: Huge course catalog, lifetime access, affordable sales, instructor marketplace
- **Weaknesses**: No progress tracking beyond course completion, no community, no live classes, no dashboard
- **Missing features**: Dashboard, real-time community, AI tutor, progress analytics, streaks/gamification
- **Architectural limitations**: Course-centric (not learner-centric), no real-time layer, no offline sync
- **User complaints**: "Courses are outdated", "No way to track my learning across courses", "No community"

### 2.3 Notion (as a learning workspace)
- **Strengths**: Fully customizable, offline-capable, great editor, templating
- **Weaknesses**: Not purpose-built for learning — no video player, no test engine, no progress tracking, no streaks
- **Missing features**: Content delivery (videos/tests), gamification, real-time community, AI tutor
- **Architectural limitations**: General-purpose tool — no learning-specific abstractions
- **User complaints**: "Too much setup needed", "Not designed for studying", "No progress analytics"

### 2.4 Anki (spaced repetition)
- **Strengths**: Excellent spaced repetition algorithm, offline-first, open-source, highly customizable
- **Weaknesses**: Ugly UI, steep learning curve, no video/content delivery, no community, no dashboards
- **Missing features**: Modern UI, content library, live classes, social features, AI tutor
- **Architectural limitations**: Desktop-first, no web version, no real-time, no API
- **User complaints**: "Ugly", "Hard to use", "No way to study with friends", "Cards only — no videos or tests"

### 2.5 Khan Academy
- **Strengths**: Free, excellent content quality, mastery-based learning, good progress tracking
- **Weaknesses**: K-12 focused, no customization, no community/real-time, no custom content, no offline
- **Missing features**: Custom dashboard, custom subjects, real-time community, component authoring, AI tutor
- **Architectural limitations**: Content-locked to their catalog, no user-generated content, monolithic
- **User complaints**: "Only for school students", "Can't add my own subjects", "No way to study with friends"

---

## 3. Success Criteria

"Production-ready" for Project Delta means:

| Criterion | Definition | Measurement |
|---|---|---|
| **Scalability** | Supports 10,000+ concurrent users without degradation | Load test: < 200ms p95 response time at 10k concurrent |
| **High availability** | 99.9% uptime (≤ 8.76h downtime/year) | Uptime monitoring + health checks |
| **Security** | No OWASP Top 10 vulnerabilities; auth on all endpoints; input sanitized | Penetration test + automated security scanning |
| **Extensibility** | New tracks/subjects/components can be added without touching core code | Plugin architecture + feature flags |
| **Performance** | LCP < 2.5s, FID < 100ms, CLS < 0.1 (Core Web Vitals) | Lighthouse audit ≥ 90 |
| **Observability** | Every request traceable; errors surface to monitoring; metrics dashboard | OpenTelemetry + Sentry + Grafana |
| **Documentation** | A new developer can set up + run the project in < 30 minutes | README + architecture docs + API reference |
| **Contributor friendliness** | PRs can be reviewed + merged in < 24h; tests run automatically | CI/CD pipeline + contribution guide |
| **Offline-first** | App works fully offline; syncs when online | PWA + service worker + localStorage fallback |
| **Test coverage** | ≥ 80% line coverage on core business logic | Jest/Vitest + pytest coverage reports |

---

## 4. Constraints

| Constraint | Value |
|---|---|
| **Frontend language** | TypeScript 5 (strict mode) |
| **Frontend framework** | Next.js 16 (App Router) |
| **Backend language** | Python 3.12 |
| **Backend framework** | FastAPI |
| **Real-time** | Socket.io (Node.js/Bun) |
| **Database (dev)** | SQLite |
| **Database (prod)** | PostgreSQL |
| **ORM (frontend)** | None (raw fetch + TanStack Query) |
| **ORM (backend)** | SQLAlchemy 2.0 |
| **State management** | Zustand (client) |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Animations** | Framer Motion |
| **AI SDK** | z-ai-web-dev-sdk (server-side only) |
| **Team size** | 1-3 developers |
| **Target platforms** | Web (desktop + mobile browser), PWA installable |
| **Licensing** | Private/proprietary (for now) |
| **Deployment** | Docker containers behind Caddy reverse proxy |
| **Runtime** | Bun (frontend + realtime), CPython (backend) |

---

## 5. Core Feature Set (MVP → Production)

### MVP (current state — done)
- [x] 7-step onboarding (profile, track, subjects, pages, appearance, goal)
- [x] 13 pages: Home, Library, Tests, Notes, Live, Analytics, Leaderboard, Achievements, Profile, Settings, Syllabus, Doubts, Playground
- [x] Free-form dashboard canvas with drag/resize/scale
- [x] 12 built-in dashboard components + 8 custom component templates
- [x] 3D page transitions (perspective + parallax)
- [x] FastAPI backend (17 models, auth, sync, content API)
- [x] Socket.io real-time service
- [x] Offline-first sync (push to server)
- [x] AI doubt-solver (z-ai-web-dev-sdk)
- [x] Track-aware content (19 presets across students/professionals/growth)

### Production (gaps — from todo.md)
- [ ] Security hardening (auth on all routes, CORS, CSRF, rate limiting, input sanitization)
- [ ] Sync pull direction (apply server data to store on login)
- [ ] Real video streaming (HLS/DASH)
- [ ] Real question bank (not generated)
- [ ] Real live classes (video conferencing)
- [ ] Real leaderboard scoring + achievement unlocks
- [ ] Notifications system
- [ ] PWA + offline service worker
- [ ] Code-splitting + image optimization
- [ ] Test suite (unit + integration + e2e)
- [ ] Docker + CI/CD
- [ ] Monitoring + logging + alerting
- [ ] Admin panel + content authoring
- [ ] i18n + RTL
- [ ] Accessibility audit
