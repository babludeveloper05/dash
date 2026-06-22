# Project Delta: Rebuild Guide for SvelteKit & GitHub Pages

This document serves as a complete blueprint to recreate **Project Delta** (an advanced educational platform) using **SvelteKit**, improving the visual design, and deploying it as a static site to **GitHub Pages**.

---

## 1. Project Overview

**Project Delta** is an EdTech platform featuring:
- **Interactive Learning Modules**: Video, text, and quiz-based content.
- **AI Doubt Solver**: Real-time Q&A using LLMs.
- **Progress Tracking**: Dashboards for user completion rates.
- **Offline-First Capabilities**: Syncing progress when connectivity is restored.
- **Authentication**: Secure user login/signup.

### Target Architecture for Rebuild
- **Frontend**: SvelteKit (Static Adapter for GitHub Pages).
- **Styling**: Tailwind CSS + Shadcn-Svelte (for modern, accessible UI).
- **State Management**: Svelte Stores or TanStack Query.
- **Backend Strategy for Static Deploy**:
  - *Option A (Recommended)*: Use BaaS (Backend-as-a-Service) like **Supabase** or **Firebase** for Auth, DB, and Edge Functions.
  - *Option B (Demo Only)*: Mock API responses locally for the GitHub Pages demo, with instructions to connect to a real backend later.

---

## 2. Recommended SvelteKit Directory Structure

Adopt a "Feature-First" architecture for scalability.

```text
src/
├── lib/
│   ├── components/          # Shared UI components (Buttons, Inputs, Cards)
│   │   ├── ui/              # Primitive components (Shadcn)
│   │   └── shared/          # App-specific shared components (Navbar, Footer)
│   ├── features/            # Feature-based modules
│   │   ├── auth/            # Login, Signup, Protected Routes
│   │   ├── dashboard/       # User progress, stats
│   │   ├── courses/         # Course listing, player, syllabus
│   │   ├── ai-tutor/        # Chat interface, prompt handling
│   │   └── offline/         # Service worker logic, sync queue
│   ├── stores/              # Global Svelte stores (auth, theme, sync)
│   ├── utils/               # Helper functions (formatters, validators)
│   ├── api/                 # API client (fetch wrappers, Supabase client)
│   └── types/               # TypeScript interfaces
├── routes/
│   ├── (auth)/              # Auth layout group
│   │   ├── login/
│   │   └── signup/
│   ├── (app)/               # Main app layout group (protected)
│   │   ├── dashboard/
│   │   ├── courses/
│   │   │   ├── [courseId]/
│   │   │   └── catalog/
│   │   └── ai-lab/
│   ├── +layout.svelte       # Root layout (Providers, Nav)
│   └── +page.svelte         # Landing page
├── app.html
└── service-worker.ts        # For offline capabilities
static/
├── images/
└── manifest.json
```

---

## 3. Core Features & Implementation Details

### 3.1 Authentication
**Original Logic**: JWT-based auth with HTTP-only cookies.
**SvelteKit Adaptation**:
- Use **Supabase Auth** or **Auth0** for static compatibility.
- Store session in `localStorage` (if using client-side auth) or manage via SDK.
- Create a `ProtectedRoute` component in Svelte to redirect unauthenticated users.

**Data Model (User)**:
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'student' | 'instructor' | 'admin';
  progress: Record<string, number>; // courseId -> percentage
}
```

### 3.2 Course Player & Content
**Original Logic**: Nested JSON structure for syllabus, video player integration.
**SvelteKit Adaptation**:
- Use Svelte's `{#each}` blocks for recursive syllabus rendering.
- Integrate `@vimejs/svelte` or standard HTML5 `<video>` with custom controls.
- **State**: Track `currentVideoId`, `isCompleted`, `notes`.

**Data Model (Course)**:
```typescript
interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  modules: Module[];
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'quiz' | 'text';
  contentUrl: string;
  duration: number; // seconds
  isLocked: boolean;
}
```

### 3.3 AI Doubt Solver
**Original Logic**: WebSocket connection to FastAPI backend streaming LLM responses.
**SvelteKit Adaptation (Static)**:
- Since GitHub Pages cannot run WebSockets directly, use **Serverless Functions** (Supabase Edge Functions or Vercel/Netlify functions if you move hosting, but for GH Pages, rely on external API).
- **UI**: Chat interface with message history.
- **Logic**: Send user query to external API endpoint -> Stream response -> Display markdown.

**Component Structure**:
- `ChatWindow.svelte`: Scrollable message list.
- `MessageBubble.svelte`: Renders user/AI text with markdown support (`marked` library).
- `TypingIndicator.svelte`: Visual feedback.

### 3.4 Offline-First Sync
**Original Logic**: Service Worker caching + IndexedDB for queueing actions.
**SvelteKit Adaptation**:
- Use **Workbox** or SvelteKit's built-in service worker generation.
- Use **idb-keyval** or raw IndexedDB to store completed lessons locally.
- **Sync Logic**: On `window.online` event, push queued progress updates to the API.

---

## 4. UI/UX Improvements (Better Appearance)

To achieve a "better appearance" than the original:

1.  **Design System**:
    - **Font**: Inter or Plus Jakarta Sans for a modern tech feel.
    - **Colors**: Deep Indigo/Violet primary, Slate grays, with vibrant accents for success states.
    - **Dark Mode**: Built-in toggle using Tailwind's `dark:` classes.

2.  **Animations**:
    - Use **Svelte Transitions** (`fade`, `slide`, `fly`) for page loads and list items.
    - Use **Motion One** (`svelte-motion`) for complex gestures and layout animations.

3.  **Components to Build**:
    - **Glassmorphism Cards**: For course items (`backdrop-blur`, semi-transparent backgrounds).
    - **Skeleton Loaders**: For all async data fetching states.
    - **Toast Notifications**: For success/error feedback (use `svelte-toast`).
    - **Responsive Sidebar**: Collapsible navigation for mobile.

---

## 5. Step-by-Step Rebuild Plan

### Phase 1: Setup
1.  Initialize SvelteKit: `npm create svelte@latest project-delta`
2.  Install dependencies:
    ```bash
    npm install -D tailwindcss postcss autoprefixer
    npm install @sveltejs/adapter-static clsx tailwind-merge lucide-svelte
    ```
3.  Configure `svelte.config.js` for static export:
    ```javascript
    import adapter from '@sveltejs/adapter-static';
    export default {
      kit: {
        adapter: adapter({ fallback: 'index.html' }), // SPA mode for GH Pages
        paths: { base: process.argv.includes('dev') ? '' : '/project-delta' } // Repo name
      }
    };
    ```

### Phase 2: Core Layout & Routing
1.  Create `(app)` and `(auth)` route groups.
2.  Build the main `Sidebar` and `TopNav` components.
3.  Implement the Landing Page with hero section and feature grid.

### Phase 3: Feature Implementation
1.  **Auth**: Connect Supabase client. Create Login/Signup forms.
2.  **Dashboard**: Fetch user stats, render progress charts (use `chart.js` or `recharts`).
3.  **Courses**: Build the video player layout and syllabus accordion.
4.  **AI Chat**: Create the chat interface. Mock the API response for the demo if no backend is connected.

### Phase 4: Polish & Offline
1.  Add Service Worker to cache assets and API responses.
2.  Implement "Mark as Complete" logic with local queuing.
3.  Add transitions and hover effects.

### Phase 5: Deployment to GitHub Pages
1.  Create a GitHub Action workflow (`.github/workflows/deploy.yml`):
    ```yaml
    name: Deploy to GitHub Pages
    on:
      push:
        branches: ['main']
      workflow_dispatch:

    permissions:
      contents: read
      pages: write
      id-token: write

    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - setup-node: { node-version: '20' }
          - run: npm ci
          - run: npm run build
          - upload-pages-artifact: { path: './build' }

      deploy:
        needs: build
        environment:
          name: github-pages
          url: ${{ steps.deployment.outputs.page_url }}
        runs-on: ubuntu-latest
        steps:
          - id: deployment
            uses: actions/deploy-pages@v4
    ```
2.  Push code. The site will be live at `https://<username>.github.io/project-delta`.

---

## 6. API Contracts (For Backend Integration)

If you decide to build a separate backend later, these are the endpoints you need to replicate:

| Method | Endpoint | Description | Payload | Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | User login | `{ email, password }` | `{ token, user }` |
| `GET` | `/api/courses` | List all courses | - | `Course[]` |
| `GET` | `/api/courses/:id` | Get course details | - | `Course` |
| `POST` | `/api/progress` | Update lesson progress | `{ lessonId, status }` | `{ success }` |
| `POST` | `/api/ai/ask` | Send doubt to AI | `{ question, context }` | `Streamed Text` |

---

## 7. Tips for Success

*   **Type Safety**: Define all your TS interfaces in `src/lib/types` first. It makes building components much faster.
*   **Mock Data**: Create a `src/lib/data/mock.ts` file with dummy courses and users so you can develop the UI without a running backend.
*   **Performance**: Use Svelte's `onMount` for heavy computations and lazy load components with `await import()`.
*   **SEO**: Even though it's an app, add meta tags in `+page.svelte` using SvelteKit's `export const metadata`.

---

## 8. Conclusion

This guide provides the structural and logical map to transition Project Delta from a Next.js/FastAPI monolith to a sleek, static SvelteKit application. By leveraging modern Svelte features and a BaaS for backend needs, you can achieve a faster, more maintainable, and visually stunning platform deployable entirely via GitHub Actions.
