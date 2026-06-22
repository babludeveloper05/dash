# Next.js → SvelteKit Migration Guide

A complete, codebase-specific plan to port **Project Delta** from Next.js 16 (App Router)
to **SvelteKit 2 + Svelte 5 (runes)**. This is not a generic tutorial — every rule,
mapping, and code sample is derived from the actual files in `src/`.

---

## 0. TL;DR — Why this migration is tractable

The app is **already a client-rendered SPA**. There is exactly **one Next.js route**
(`src/app/page.tsx`) that renders `<AppShell />`. "Navigation" between the 13 screens
is *not* file-based routing — it's a `activeTab` field in a Zustand store, switched by a
`switch` statement in `app-shell.tsx`. The server only exists as a set of **proxy
Route Handlers** to a FastAPI backend.

That means the migration is mostly:

1. **Zustand store → Svelte 5 runes store** (one mechanical translation, one file).
2. **framer-motion → Svelte transitions / `motion`** (17 files, repetitive patterns).
3. **`'use client'` React components → `.svelte` components** (mechanical, repetitive).
4. **Route Handlers (`route.ts`) → `+server.ts`** (near 1:1, both are Web `Request`/`Response`).
5. **`middleware.ts` → `hooks.server.ts`**.

We keep the **same SPA model**: one root route, client-side tab switching. No need to
convert the 13 screens into 13 SvelteKit routes (though §10 covers that as an optional
upgrade).

---

## 1. Current architecture audit

| Concern | Current implementation | Files |
| --- | --- | --- |
| Framework | Next.js 16 App Router, React 19 | `next.config.ts`, `src/app/*` |
| Routing | **SPA** — single route renders `AppShell`; `activeTab` in store switches 13 screens | `src/app/page.tsx`, `src/features/app-shell.tsx` |
| Global state | Zustand + `persist` (localStorage key `project-delta-v1`) | `src/lib/store.ts` |
| Styling | Tailwind v4 (`@theme` in CSS), OKLCH design tokens | `src/app/globals.css` |
| UI primitives | **Custom** (no shadcn `components/ui` is actually imported) | `src/shared/ui.tsx` |
| Animation | framer-motion (page transitions, 3D perspective, parallax, `AnimatePresence`) | `src/lib/motion.ts` + 16 components |
| Fonts | `next/font/google` (Geist, Geist Mono) → CSS vars | `src/app/layout.tsx` |
| Runtime theming | `ThemeVars` injects CSS custom props from store prefs | `src/shared/theme-vars.tsx` |
| API | Route Handlers proxying to FastAPI; httpOnly cookie auth + token rotation + CSRF | `src/app/api/**/route.ts`, `src/lib/server-auth.ts`, `src/lib/csrf.ts` |
| Edge logic | Security middleware (HTTPS redirect, HSTS, headers) | `src/middleware.ts` |
| Realtime | socket.io-client singleton via Caddy `?XTransformPort=3003` | `src/lib/realtime.ts` |
| Data fetching | Client hooks using `fetch` (`credentials: 'include'`) | `src/hooks/use-content.ts` |
| Config | Centralized env access (no `process.env` elsewhere) | `src/config/index.ts` |
| Path alias | `@/*` → `src/*` | `tsconfig.json` |

### API route inventory (each becomes a `+server.ts`)
```
/api                       /api/health
/api/auth/login            /api/auth/logout         /api/auth/me
/api/auth/refresh          /api/auth/register
/api/content/subjects      /api/content/tests       /api/content/videos
/api/community/leaderboard /api/community/live
/api/doubts/ask            /api/sync
```

---

## 2. Target SvelteKit architecture

```
project/
├─ svelte.config.js          # adapter + alias config
├─ vite.config.ts            # Tailwind v4 plugin, etc.
├─ src/
│  ├─ app.html               # replaces app/layout.tsx <html>/<body> shell
│  ├─ app.css                # ← globals.css (verbatim, minus next-specific bits)
│  ├─ app.d.ts               # App.Locals types (auth context, etc.)
│  ├─ hooks.server.ts        # ← middleware.ts (security headers, HTTPS, auth)
│  ├─ lib/
│  │  ├─ config.ts           # ← src/config/index.ts (use $env/* instead of process.env)
│  │  ├─ store.svelte.ts     # ← src/lib/store.ts (Zustand → runes)
│  │  ├─ motion.ts           # ← src/lib/motion.ts (variants → Svelte transition params)
│  │  ├─ server/
│  │  │  ├─ auth.ts          # ← src/lib/server-auth.ts (token rotation)
│  │  │  └─ csrf.ts          # ← src/lib/csrf.ts
│  │  ├─ api-client.ts       # ← src/adapters/api-client.ts (unchanged logic)
│  │  ├─ realtime.ts         # ← src/lib/realtime.ts (singleton, mostly unchanged)
│  │  ├─ format.ts subjects.ts types.ts utils.ts test-utils.ts custom-templates.ts  # mostly verbatim
│  │  ├─ data.ts global.ts   # ← src/shared/data.tsx, global.tsx (JSX → Svelte where needed)
│  │  ├─ components/
│  │  │  ├─ ui/              # ← src/shared/ui.tsx, split into .svelte files
│  │  │  ├─ AppShell.svelte  ThemeVars.svelte  TopNav.svelte  Spotlight.svelte …
│  │  │  └─ pages/           # ← src/features/pages/*  (13 screens as .svelte)
│  │  └─ actions/            # Svelte actions ← React hooks (use-canvas-fit, use-virtual)
│  └─ routes/
│     ├─ +layout.svelte      # mounts ThemeVars, global providers
│     ├─ +page.svelte        # renders <AppShell /> (the SPA entry)
│     └─ api/                # ← every route.ts becomes +server.ts
│        ├─ health/+server.ts
│        ├─ auth/login/+server.ts  …
│        └─ …
└─ static/                   # ← public/ (icons, etc.)
```

---

## 3. Hard rules (non-negotiable conventions)

1. **Svelte 5 runes only.** Use `$state`, `$derived`, `$effect`, `$props`. Do **not** use
   legacy `export let`, `$:` reactive labels, or stores-as-default. The only stores allowed
   are runes-in-`.svelte.ts` modules (see §5).
2. **One source of truth for env.** Keep the `config.ts` discipline: no file may read
   `$env/*` except `src/lib/config.ts`. Public vars use `$env/static/public`
   (must be prefixed `PUBLIC_`); server-only secrets use `$env/dynamic/private` or
   `$env/static/private`.
3. **Server code stays server-side.** Anything importing `$env/*/private`, cookies, or the
   FastAPI URL lives in `+server.ts`, `hooks.server.ts`, or `src/lib/server/**`. SvelteKit
   will refuse to bundle `$lib/server/*` into the client — rely on that as a guardrail.
4. **Preserve the cookie/auth contract exactly.** Cookie names (`delta-token`,
   `delta-refresh`), maxAges (15 min / 30 days), `httpOnly`, `sameSite: 'lax'`,
   `secure` in production, and the 401→refresh→retry flow must behave identically.
5. **Keep the SPA model in Phase 1.** `activeTab` switching stays in the store. Do not
   rewrite to file-based routes until the app is at parity (see §10, optional).
6. **No `process.env`, no `next/*` imports, no `'use client'`/`'use server'`** anywhere
   after migration. Grep for these as a completion gate.
7. **Path alias.** Use `$lib` for everything under `src/lib`. Replace `@/...` imports.
   (You *can* re-add an `@` alias in `svelte.config.js`, but `$lib` is idiomatic — pick one
   and apply it everywhere.)
8. **Accessibility & semantics preserved.** Keep `aria-*`, roles, `sr-only`, alt text.
   Svelte's compiler will warn on a11y issues — treat warnings as errors.
9. **Tailwind tokens unchanged.** `globals.css` (OKLCH tokens, `.glass`, `.elev-*`,
   `.glow-*`) ports verbatim to `app.css`. Do not redesign during migration.
10. **Every PR keeps the app runnable.** Migrate leaf-first (utils → primitives → pages →
    shell) so `bun run dev` works at each step.

---

## 4. Dependency mapping

| Next.js / React dep | SvelteKit / Svelte replacement | Notes |
| --- | --- | --- |
| `next`, `react`, `react-dom` | `@sveltejs/kit`, `svelte`, `vite` | core swap |
| `next/font/google` | `@fontsource/geist-sans`, `@fontsource-variable/geist`, etc. | self-host; import in `app.css` or `+layout.svelte` |
| `zustand` + `persist` | runes module + tiny `persisted()` helper | see §5 |
| `framer-motion` | Built-in `svelte/transition` + `svelte/motion` (`Tween`, `Spring`); `motion` (Motion One) for advanced | see §6 |
| `@radix-ui/*` | `bits-ui` (or `melt`) | only if those primitives are actually used; most UI here is custom |
| `next-themes` | the existing `ThemeVars` rune effect | already custom; no lib needed |
| `react-hook-form` + `@hookform/resolvers` | native forms + `zod` (kept) or `sveltekit-superforms` | forms are simple here |
| `@tanstack/react-query` | `load` functions + runes, or `@tanstack/svelte-query` | prefer `load`/runes; query lib optional |
| `@tanstack/react-table` | `@tanstack/svelte-table` | same headless core |
| `react-markdown` | `svelte-exmarkdown` or `marked` + sanitize | |
| `react-syntax-highlighter` | `shiki` (framework-agnostic) | |
| `@mdxeditor/editor` | `tiptap` (svelte) or `carta-md` | re-evaluate need |
| `recharts` | `layerchart` (Svelte) or `@unovis/svelte` | analytics page |
| `embla-carousel-react` | `embla-carousel-svelte` | same core |
| `@dnd-kit/*` | `svelte-dnd-action` | dashboard drag/grid |
| `vaul` (drawer) | `vaul-svelte` | |
| `sonner` (toasts) | `svelte-sonner` | |
| `cmdk` (Spotlight) | `cmdk-sv` or hand-roll (Spotlight is custom-ish) | |
| `input-otp` | `bits-ui` PinInput or hand-roll | |
| `socket.io-client` | **unchanged** (framework-agnostic) | keep singleton pattern |
| `date-fns`, `clsx`, `tailwind-merge`, `class-variance-authority`, `uuid`, `zod`, `lucide-react` | **unchanged** (`lucide-svelte` for icons) | `lucide-react` → `lucide-svelte` |
| `tailwindcss` v4, `@tailwindcss/postcss` | `tailwindcss` v4 + `@tailwindcss/vite` | use the Vite plugin |

> **Rule:** install a replacement only when the feature is actually used. Audit each import
> before adding a dependency.

---

## 5. State: Zustand → Svelte 5 runes

`src/lib/store.ts` is the single biggest file. Translate it to `src/lib/store.svelte.ts`.

### 5a. The pattern

Zustand's `create((set, get) => ({...}))` becomes a class (or factory) of `$state` fields +
methods. Selectors (`useStore(s => s.x)`) become direct property access — Svelte's reactivity
is fine-grained, so no selector memoization is needed.

**Before (Zustand):**
```ts
export const useStore = create<DeltaState>()(persist((set, get) => ({
  activeTab: 'home',
  direction: 1,
  setTab: (t) => set((s) => { /* compute direction */ return { activeTab: t, direction } }),
  cycleTab: (dir) => { const i = TAB_ORDER.indexOf(get().activeTab); /* ... */ },
  // ...
}), { name: 'project-delta-v1', partialize: (s) => ({ /* ... */ }) }))
```

**After (runes, `store.svelte.ts`):**
```ts
import { TAB_ORDER, type TabId } from './tabs'

class DeltaStore {
  activeTab = $state<TabId>('home')
  direction = $state<1 | -1>(1)
  // ...all the persisted + ephemeral fields as $state

  setTab(t: TabId) {
    if (t === this.activeTab) return
    const oldIdx = TAB_ORDER.indexOf(this.activeTab)
    const newIdx = TAB_ORDER.indexOf(t)
    this.direction = oldIdx === -1 || newIdx === -1 ? 1 : newIdx >= oldIdx ? 1 : -1
    this.activeTab = t
  }

  cycleTab(dir: -1 | 1) {
    const i = TAB_ORDER.indexOf(this.activeTab)
    const anchor = i === -1 ? 0 : i
    this.activeTab = TAB_ORDER[(anchor + dir + TAB_ORDER.length) % TAB_ORDER.length]
    this.direction = dir
  }

  // Derived getters replace the `subjectProgress()` / `totalHours()` selectors:
  get totalHours() {
    const ESTIMATED = 40 / 60
    return Math.round(Object.values(this.videoProgress)
      .reduce((acc, p) => acc + (p.fraction ?? 0) * ESTIMATED, 0))
  }
}

export const store = new DeltaStore()
```

Usage in components: `import { store } from '$lib/store.svelte'` then read `store.activeTab`
and call `store.setTab('library')`. No hook, no provider.

### 5b. Persistence (replacing `persist` + `partialize`)

Write a small helper that mirrors the `partialize` whitelist and the `project-delta-v1` key:
```ts
// $lib/persist.ts
import { browser } from '$app/environment'

const KEY = 'project-delta-v1'
// list mirrors the OLD partialize() exactly:
const PERSISTED = ['videoProgress','streak','dailyGoalHours','hoursToday',
  'customCountdownDate','countdownLabel','notes','quickScratch','history',
  'components','gridMode','onboardingDone','liveAttended','profile',
  'notifications','doubts','doubtVotes','enabledTabs','appearance',
  'customComponents','customComponentData'] as const

export function hydrate(store: Record<string, unknown>) {
  if (!browser) return
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) Object.assign(store, JSON.parse(raw).state ?? JSON.parse(raw))
  } catch {}
  $effect.root(() => {
    $effect(() => {
      const snapshot = Object.fromEntries(PERSISTED.map((k) => [k, (store as any)[k]]))
      localStorage.setItem(KEY, JSON.stringify(snapshot))
    })
  })
}
```
Call `hydrate(store)` once in the root `+layout.svelte` (guarded by `browser`). Keep the same
JSON shape so existing users' localStorage isn't wiped — match Zustand's `{ state, version }`
envelope if you want zero-loss migration, otherwise accept a one-time reset.

> **Gotcha:** the old store is `'use client'` and reads localStorage lazily. In SvelteKit,
> SSR runs server-side where `localStorage` is undefined — always guard with `browser` and
> hydrate in an effect/`onMount`, never at module top level.

---

## 6. Animation: framer-motion → Svelte

framer-motion appears in 17 files. Most usages fall into three buckets.

### 6a. Enter/exit lists (`AnimatePresence` + `motion.div`)
Use Svelte's built-in transitions. `staggerContainer/staggerItem` → `transition:fly` with a
per-item `delay` computed from index.
```svelte
{#each items as item, i (item.id)}
  <div in:fly={{ y: 12, duration: 300, delay: i * 40 }} out:fade>
    …
  </div>
{/each}
```

### 6b. Page transitions (the 3D `pageVariants` / `parallaxBgVariants` in `motion.ts`)
This is the most custom part. Two options:
- **Built-in `key` block + custom transition function.** Wrap `<ActivePage />` in
  `{#key store.activeTab}` and write a `crossfade`/custom JS transition that reads
  `store.direction` to pick the translateZ/translateX sweep. Svelte's `transition:fn` can
  return `{ css: (t, u) => '...' }` — port the variant transforms there.
- **Motion One (`motion` package).** Keep an imperative approach close to framer-motion via
  `animate()` inside an `$effect` keyed on `activeTab`.

Port `src/lib/motion.ts` into plain transform-string builders that both options consume.

### 6c. Springs / motion values (`useSpring`, `useMotionValue`, `useTransform`)
The scroll-progress bar in `AppShell` uses `useMotionValue` + `useSpring`. Replace with
`svelte/motion`:
```ts
import { Spring } from 'svelte/motion'
const progress = new Spring(0, { stiffness: 0.2, damping: 0.4 })
// on scroll: progress.target = scrollTop / max
// in markup: style="transform: scaleX({progress.current})"
```
`useTransform` → a `$derived` expression off the spring value.

> **Rule:** respect reduced motion. `useReducedMotion()` → a `$state` initialized from
> `window.matchMedia('(prefers-reduced-motion: reduce)')` in an effect, or the
> `prefers-reduced-motion` CSS where possible.

---

## 7. Components: React `.tsx` → `.svelte`

Mechanical translation rules (apply consistently):

| React | Svelte 5 |
| --- | --- |
| `function C(props)` + `'use client'` | `<script lang="ts">` block in `C.svelte` |
| `props: { x }` / `export let`? | `let { x, children } = $props()` |
| `useState(v)` | `let x = $state(v)` |
| `useMemo(() => f, [deps])` | `let x = $derived(f)` (auto-tracked) |
| `useEffect(fn, [deps])` | `$effect(() => fn)` or `onMount` for mount-only |
| `useRef` (DOM) | `let el: HTMLElement; <div bind:this={el}>` |
| `useRef` (mutable value) | plain `let` / module var |
| `className={cn(...)}` | `class={cn(...)}` (keep `clsx`/`tailwind-merge`) |
| conditional `{cond && <X/>}` | `{#if cond}<X/>{/if}` |
| `.map(x => <X/>)` | `{#each list as x (x.id)}<X/>{/each}` |
| `onClick={fn}` | `onclick={fn}` (Svelte 5 native events, no `on:`) |
| `children` | `{@render children?.()}` (snippets) |
| context (`createContext`) | `setContext` / `getContext` |
| `<Icon className="size-4"/>` (lucide-react) | `<Icon class="size-4"/>` (lucide-svelte) |
| Error boundary (`app/page.tsx`) | `<svelte:boundary>` with `failed` snippet, or root `+error.svelte` |

**`ErrorBoundary`** in `page.tsx` → Svelte 5 `<svelte:boundary>`:
```svelte
<svelte:boundary>
  <AppShell />
  {#snippet failed(error, reset)}
    <div class="fixed inset-0 grid place-items-center bg-background p-8"> … </div>
  {/snippet}
</svelte:boundary>
```

**`ThemeVars`** (`theme-vars.tsx`) → a `.svelte` with one `$effect` that writes
`document.documentElement.style.setProperty(...)`. Logic is identical; just swap `useEffect`
deps for the auto-tracked `$effect` reading `store.appearance.*`.

**`useContent`** (`use-content.ts`) → a runes module `content.svelte.ts` exposing reactive
`$state` arrays + a `refresh()` method, OR move the parallel `fetch`es into a `+page.ts`/
`+layout.ts` `load` function and pass via `data`. Since the app is a CSR SPA, a client-side
runes module is the smaller change; use `load` only if you later adopt SSR (§10).

---

## 8. Server: Route Handlers & middleware

### 8a. `route.ts` → `+server.ts`
Both use the Web Platform `Request`/`Response`. The shape is nearly identical.

**Before (`app/api/auth/login/route.ts`):**
```ts
export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req); if (csrfError) return csrfError
  const body = await req.json()
  const res = await fetch(`${config.backendUrl}/api/auth/login`, {...})
  const data = await res.json()
  const response = NextResponse.json({ user: data.user })
  response.cookies.set('delta-token', data.access_token, { httpOnly:true, ... })
  return response
}
```

**After (`routes/api/auth/login/+server.ts`):**
```ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { config } from '$lib/config'
import { checkCsrf } from '$lib/server/csrf'

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  checkCsrf(request)                       // throw error(403) inside on failure
  const body = await request.json()
  const res = await fetch(`${config.backendUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) error(res.status, data.detail || 'Invalid credentials')
  cookies.set('delta-token', data.access_token, {
    httpOnly: true, sameSite: 'lax', maxAge: 60 * 15, path: '/', secure: config.isProduction,
  })
  cookies.set('delta-refresh', data.refresh_token, {
    httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/', secure: config.isProduction,
  })
  return json({ user: data.user })
}
```

Mapping cheatsheet:
- `NextRequest` → destructured `RequestEvent` (`request`, `cookies`, `url`, `params`, `locals`).
- `NextResponse.json(x, { status })` → `json(x, { status })`.
- `NextResponse.json({error}, {status})` for errors → `error(status, message)` (throws).
- `req.cookies.get(n)?.value` → `cookies.get(n)`.
- `response.cookies.set(...)` → `cookies.set(name, value, { path, ... })` — **`path` is required**.
- Reading body: `await request.json()` (same).
- 502 fallback try/catch → keep; return `json({error}, { status: 502 })`.

### 8b. `server-auth.ts` (token rotation) → `$lib/server/auth.ts`
The `withAuthRefresh` / `rotateTokens` / `applyRotatedCookies` logic is framework-agnostic
fetch code. Port it to take SvelteKit's `cookies` + `fetch` from the `RequestEvent` instead of
`NextRequest`/`NextResponse`. Because SvelteKit `cookies.set` mutates the response directly,
`forwardRotatedCookies` collapses into just calling `cookies.set` after a refresh — simpler.

### 8c. `middleware.ts` → `hooks.server.ts`
```ts
import type { Handle } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'
import { config } from '$lib/config'

const HSTS_MAX_AGE = 63072000

export const handle: Handle = async ({ event, resolve }) => {
  const proto = event.request.headers.get('x-forwarded-proto') ?? event.url.protocol.replace(':','')
  const isHttps = proto === 'https'
  if (config.isProduction && !isHttps) {
    const u = new URL(event.url); u.protocol = 'https:'; u.port = ''
    redirect(301, u)
  }
  const res = await resolve(event)
  if (config.isProduction && isHttps)
    res.headers.set('Strict-Transport-Security', `max-age=${HSTS_MAX_AGE}; includeSubDomains; preload`)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  return res
}
```
The Next.js `matcher` (skip `_next/*`, static assets) is unnecessary — `hooks.server.ts`
runs for SvelteKit-handled requests; static assets are served before hooks. If you want to
skip header work for assets, branch on `event.url.pathname`.

### 8d. CSRF (`csrf.ts`)
SvelteKit has **built-in CSRF protection** (origin check on form POSTs), configurable via
`csrf.checkOrigin` in `svelte.config.js`. Keep your custom `checkCsrf` for the JSON API
endpoints if it does more than origin-checking (e.g. header/token validation); otherwise
lean on the built-in and delete the custom one. Port whatever remains to `$lib/server/csrf.ts`
and `throw error(403, ...)` instead of returning a `NextResponse`.

---

## 9. Config, fonts, styling, realtime

- **Config (`src/config/index.ts` → `$lib/config.ts`):** replace `process.env.BACKEND_URL`
  with `$env/dynamic/private` (`env.BACKEND_URL`) — server-only. Replace
  `process.env.NEXT_PUBLIC_REALTIME_PORT` with `PUBLIC_REALTIME_PORT` from
  `$env/static/public`. `isProduction` → `import.meta.env.PROD` or `dev` from `$app/environment`.
  Keep the "only this file reads env" rule.
- **Fonts:** drop `next/font`. Install `@fontsource-variable/geist` +
  `@fontsource-variable/geist-mono`, import them in `app.css`, and keep the
  `--font-geist-sans` / `--font-geist-mono` CSS variables the Tailwind `@theme` already
  references. The `font-sans` / `font-mono` utility classes stay the same.
- **`globals.css` → `app.css`:** copy verbatim. It's Tailwind v4 `@theme` + custom
  utilities (`.glass`, `.elev-*`, `.glow-primary`). Wire Tailwind via `@tailwindcss/vite`
  in `vite.config.ts`. Move the `dark`, `bg-background`, and font-variable classes from
  `<html>` in `layout.tsx` into `app.html`'s `<html>`/`<body>`.
- **`app.html`:** replicate the `layout.tsx` shell — `lang="en"`, `class="dark bg-background …"`,
  `<body class="font-sans antialiased">`, and the favicon `<link>`s. Metadata
  (`title`/`description`/icons/themeColor) goes in `app.html` `<head>` or per-route
  `<svelte:head>`; `viewport`/`themeColor` → `<meta>` tags in `app.html`.
- **Realtime (`realtime.ts`):** keep socket.io-client. The singleton + `useRealtime` hook
  becomes a runes module: a module-level `socket` + a `connected = $state(false)` and an
  `initRealtime()` called once in `+layout.svelte` `onMount` (browser-only). The
  `subscribeLeaderboard` / `subscribeDoubts` / `joinRealtime` functions port unchanged.
- **Hooks → actions/modules:** `use-canvas-fit` and `use-virtual` (DOM-measuring hooks)
  become **Svelte actions** (`use:canvasFit`) or runes modules. `use-auth-refresh` (interval +
  focus/reconnect refresh) becomes an `$effect` in `+layout.svelte`.

---

## 10. (Optional, post-parity) Adopt real routing & SSR

Once at parity you *may* upgrade from the SPA model:

- Convert each screen to a route: `routes/(app)/library/+page.svelte`, etc. Replace
  `store.activeTab`/`setTab` with `<a href>` + `$page.url.pathname` and SvelteKit nav.
- Keep the 3D page transition by using `onNavigate` + the View Transitions API, or a layout
  `{#key}` wrapper.
- Move data loading into `+page.ts` / `+layout.ts` `load` functions for SSR + streaming.
- Add `+layout.server.ts` to read auth cookies and expose `locals.user`, so the shell can
  render logged-in state without a client round-trip (replaces the `/api/auth/me` fetch in
  `AppShell`).

This is **not required** for a faithful migration and should be a separate effort.

---

## 11. Roadmap (phased checklist)

> Migrate leaf-first so the app stays runnable. Suggested branch: `feat/sveltekit`.

### Phase 0 — Scaffold
- [ ] `npm create svelte@latest` (Skeleton, TS, Vite) in a parallel dir or branch.
- [ ] Add Tailwind v4 via `@tailwindcss/vite`; copy `globals.css` → `app.css`.
- [ ] Configure `svelte.config.js`: adapter (`adapter-node` to match the current bun/standalone
      deploy, or `adapter-auto`), `$lib` alias, `csrf` options.
- [ ] Port `app.html` from `layout.tsx` (html classes, fonts, favicons, meta).
- [ ] Install self-hosted Geist fonts; verify `font-sans`/`font-mono` render.
- [ ] **Gate:** blank SvelteKit app boots with correct dark background + fonts.

### Phase 1 — Pure logic (no UI)
- [ ] Port `config` → `$lib/config.ts` (`$env/*`).
- [ ] Port `format.ts`, `subjects.ts`, `types.ts`, `utils.ts`, `test-utils.ts`,
      `custom-templates.ts`, `motion.ts` (transform builders) — mostly verbatim.
- [ ] Port `store.ts` → `store.svelte.ts` (runes) + `persist.ts` (§5). Unit-check the
      reducers (`setTab`, `cycleTab`, `submitTest`, doubt mutations, custom components).
- [ ] **Gate:** `import { store }` works in a throwaway `+page.svelte`; tab math correct.

### Phase 2 — Server (API parity)
- [ ] Port `csrf` and `server-auth` → `$lib/server/*`.
- [ ] Port all 14 `route.ts` → `+server.ts` (auth, content, community, doubts, sync, health).
- [ ] Port `middleware.ts` → `hooks.server.ts`.
- [ ] **Gate:** `curl` each endpoint; login sets cookies; 401→refresh→retry works; headers present.

### Phase 3 — UI primitives & chrome
- [ ] Split `shared/ui.tsx` into `$lib/components/ui/*.svelte` (GlassCard, PrimaryButton,
      MetricCard, Avatar, EmptyState, ProgressRing, IconButton, …).
- [ ] Port `ThemeVars`, `TopNav`, `Spotlight`, `OfflineBanner`, `AuthModal`, `Onboarding`,
      `VideoLayer`/video-player, `scaled-page`.
- [ ] Port `AppShell.svelte` (tab switch + page transition + scroll spring + keybindings).
- [ ] Wire `+layout.svelte` (ThemeVars mount, hydrate store, realtime init, auth-refresh effect)
      and `+page.svelte` (`<svelte:boundary><AppShell/></svelte:boundary>`).
- [ ] **Gate:** shell renders; tab switching + transitions + theming work; auth modal opens.

### Phase 4 — The 13 screens
- [ ] Port `use-content` → `content.svelte.ts`; replace `react-query` usage if any.
- [ ] Port pages in this order (simplest first): `settings`, `profile`, `achievements`,
      `leaderboard`, `notes`, `syllabus`, `doubts`, `analytics` (charts), `tests`,
      `library` (virtualized), `live` (realtime), `playground` (dnd), `home` (dashboard/dnd grid).
- [ ] Swap libs per §4 as each page needs them (charts, dnd, carousel, table, markdown).
- [ ] **Gate:** each page reaches visual + behavioral parity with the Next.js version
      (compare against the `audit-*.png` / `verify-*.png` screenshots in the repo).

### Phase 5 — Cutover
- [ ] Replace `package.json` scripts (`vite dev`, `vite build`, `node build`).
- [ ] Update `Caddyfile` / deploy to serve the SvelteKit `adapter-node` output;
      keep the `XTransformPort=3003` realtime route.
- [ ] Grep gates: **no** `next/`, `process.env`, `'use client'`, `framer-motion`,
      `@/` imports remain.
- [ ] Run a11y + `svelte-check`; treat warnings as errors.
- [ ] Delete `src/app`, `next.config.ts`, `next-env.d.ts`, Next deps from `package.json`.

---

## 12. Verification gates (definition of done)

1. `svelte-check` passes with zero errors and zero a11y warnings.
2. All API endpoints return identical payloads/status codes to the Next.js version
   (diff against recorded responses).
3. Auth: login → cookies set (httpOnly, correct maxAge/secure); access-token expiry triggers
   silent refresh; logout clears both cookies.
4. State: existing `project-delta-v1` localStorage hydrates without loss (or a documented
   one-time reset).
5. Theming: changing accent hue / density / glass in Settings recolors the whole app live.
6. Transitions: tab switch shows the directional 3D sweep; reduced-motion users get a static
   swap; scroll progress bar springs.
7. Realtime: socket connects via `?XTransformPort=3003`; leaderboard/doubts/live update live.
8. Screens match the repo's audit/verify screenshots.
9. Production build (`adapter-node`) boots and serves behind Caddy.

---

## 13. Quick translation reference (pin this near your editor)

```
useState(v)                  → let v = $state(init)
useMemo(fn,[d])              → let v = $derived(fn)        // or $derived.by(() => {...})
useEffect(fn,[d])            → $effect(() => { fn; return cleanup })
useRef<HTMLEl>(null) + DOM   → let el; <div bind:this={el}>
props                        → let { a, b, children } = $props()
{cond && <X/>}               → {#if cond}<X/>{/if}
list.map(x=><X/>)            → {#each list as x (x.id)}<X/>{/each}
onClick / onChange           → onclick / oninput
className                    → class
<Ctx.Provider>               → setContext(key, val)  /  getContext(key)
zustand useStore(s=>s.x)     → store.x        (import { store } from '$lib/store.svelte')
NextResponse.json(d,{status})→ json(d,{status})         // from '@sveltejs/kit'
NextResponse error           → error(status, msg)        // throws
req.cookies.get(n)?.value    → cookies.get(n)
response.cookies.set(n,v,o)  → cookies.set(n,v,{path:'/',...o})
middleware.ts                → hooks.server.ts (Handle)
app/api/x/route.ts (POST)    → routes/api/x/+server.ts (export const POST)
process.env.PUBLIC_*         → $env/static/public
process.env.SECRET           → $env/dynamic/private (server only)
next/font                    → @fontsource-variable/* in app.css
framer-motion variants       → svelte/transition + svelte/motion (Spring/Tween)
lucide-react                 → lucide-svelte
```

---

*Migrate one layer at a time, keep `dev` green at every step, and diff each screen against the
existing `verify-*.png` screenshots. The SPA shape of this app means you can ship it as a
SvelteKit CSR app first and adopt routing/SSR later as a clean follow-up.*
