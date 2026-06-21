# VISION.md
## Project Delta — Universal Learning Platform

> Generated: 2026-06-21 | Phase 0 deliverable

---

## The One-Line Vision

**A single, customizable learning workspace that adapts to any field, any pace, any learner — offline-first, community-driven, and AI-assisted.**

---

## The Problem With Learning Platforms Today

Every learning platform makes you fit into *their* structure:

- **Unacademy** says: "You're a JEE aspirant. Here's JEE content. Study like everyone else."
- **Udemy** says: "You're a course buyer. Buy courses. Watch them. That's it."
- **Khan Academy** says: "You're a K-12 student. Here's our curriculum. Follow it."
- **Notion** says: "You're... whatever. Build your own system. Good luck."
- **Anki** says: "You're a memorizer. Here's cards. Ugly cards."

**Nobody says: "Tell me what you're learning, and I'll build you a workspace that fits."**

That's what Delta does.

---

## What Delta Is

Delta is a **learning workspace**, not a course platform. The difference:

| Course Platform | Learning Workspace |
|---|---|
| Content comes from the platform | Content comes from anywhere — the DB, the community, or the user |
| Structure is fixed by the platform | Structure is chosen by the user (onboarding → track → subjects → pages → appearance → components) |
| Progress = course completion | Progress = the user's own metrics (streaks, hours, mastery rings, custom counters) |
| Community is an afterthought | Community is real-time and integrated (live classes, doubts, leaderboard) |
| AI is a chatbot sidebar | AI is the tutor — it solves doubts, generates study plans, gives test feedback |
| Offline = broken | Offline = fully functional with sync when online |

---

## Who Delta Serves

### The JEE Aspirant
Picks "JEE / Engineering" → gets Physics, Chemistry, Maths → sees exam-flavored content (Full Syllabus tests, JEE Main mock types) → asks the AI tutor a physics doubt → gets a step-by-step solution → tracks progress with subject rings → competes on the leaderboard.

### The Software Developer
Picks "Software Developer" → gets Data Structures, Algorithms, System Design → sees coding-flavored content (Coding Challenge tests, Mock Interview types) → asks the AI about Big-O notation → tracks DSA progress → uses a custom TODO list component on their dashboard.

### The Language Learner
Picks "Language Learning" → gets Vocabulary, Grammar, Speaking, Listening → sees language-flavored content (Vocabulary Quiz, Listening Test types) → uses a custom flashcard component → tracks daily streak → joins a live conversation class.

### The Designer
Picks "Designer" → gets UI/UX, Typography, Color Theory, Motion Design → sees creative-flavored content (Design Brief, Portfolio Review types) → uses a custom links component for inspiration bookmarks → tracks project progress with a custom progress bar.

**Same app. Same codebase. Different experience. That's the point.**

---

## The Architecture Vision

```
┌─────────────────────────────────────────────────┐
│                 User's Browser                    │
│  ┌─────────────────────────────────────────────┐ │
│  │  Next.js 16 (App Router)                    │ │
│  │  ├─ Zustand store (offline-first, local)    │ │
│  │  ├─ TanStack Query (server state cache)     │ │
│  │  ├─ Framer Motion (3D transitions)          │ │
│  │  ├─ ThemeVars (user-customizable theme)     │ │
│  │  ├─ ScaledPage (responsive viewport scaling)│ │
│  │  └─ Custom component templates (8 types)    │ │
│  └─────────────────────────────────────────────┘ │
│         ↕ fetch              ↕ WebSocket         │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │  FastAPI (Python)│  │  Socket.io (Bun)     │ │
│  │  ├─ Auth (JWT)   │  │  ├─ Live classes     │ │
│  │  ├─ Content API  │  │  ├─ Leaderboard live  │ │
│  │  ├─ Sync (push/pull)│  ├─ Doubt community   │ │
│  │  ├─ Notes CRUD   │  │  └─ Presence          │ │
│  │  └─ AI routes    │  └──────────────────────┘ │
│  │     (z-ai-sdk)  │                            │
│  └──────────────────┘                            │
│         ↕                                        │
│  ┌──────────────────────────────────────────────┐│
│  │  PostgreSQL (prod) / SQLite (dev)            ││
│  │  17 models: User, Subject, Chapter, Video,   ││
│  │  Test, Question, Note, Doubt, Progress, etc. ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### Key Principles
1. **Offline-first** — localStorage is the source of truth; server is the sync target
2. **Track-agnostic** — same codebase, different content per user track
3. **Component-driven** — dashboard is composable; users author their own components
4. **Real-time** — live classes, leaderboard, and doubts are instant
5. **AI-assisted** — the tutor is always one click away
6. **User-customizable** — theme, density, glass, nav pages, dashboard layout

---

## The Architecture Principles (from the brief)

1. **Dependencies point inward** — core business logic never imports frameworks
2. **Explicit interfaces** — every feature has a public API
3. **No magic** — behavior is predictable and discoverable
4. **Configuration at startup** — no scattered `os.getenv()` calls
5. **Structured logging** — JSON logs with correlation IDs
6. **Plugin-first** — everything possible is extensible
7. **Test-driven** — unit + integration + e2e pyramid
8. **Observable** — metrics, tracing, health checks

---

## The Road to Production

### Phase 1: Foundation (Weeks 1-2)
- Security hardening (auth on all routes, CORS, rate limiting, input sanitization)
- Sync pull direction (apply server data on login)
- Docker + CI/CD pipeline
- Test infrastructure setup

### Phase 2: Real Content (Weeks 3-4)
- Real video streaming (HLS/DASH)
- Real question bank in DB
- Real leaderboard scoring + achievement unlocks
- PWA + offline service worker

### Phase 3: Real-time + Community (Weeks 5-6)
- Real live classes (video conferencing integration)
- Doubt community with real-time answers
- Notifications system (push + email + in-app)
- Admin panel + content authoring

### Phase 4: Polish + Scale (Weeks 7-8)
- Code-splitting + image optimization
- i18n + RTL
- Accessibility audit
- Monitoring + logging + alerting
- Load testing + optimization

---

## The Final Principle

> **Build the system as though future maintainers know nothing about your assumptions.**
>
> Prefer: explicit interfaces, documentation, predictable behavior, discoverability, simplicity.
>
> Avoid: magic, hidden coupling, undocumented conventions.
>
> A clean architecture is not measured by how clever it is, but by how easy it is to understand, extend, and maintain.
