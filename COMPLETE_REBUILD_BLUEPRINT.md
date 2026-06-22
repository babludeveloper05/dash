# 🚀 Project Delta: Complete Rebuild Blueprint (SvelteKit + GitHub Pages)

> **Goal**: Recreate the entire Project Delta educational platform from scratch using **SvelteKit**, with **modern UI/UX**, **offline-first architecture**, and **static deployment to GitHub Pages**.

This document is your **single source of truth**. Follow it step-by-step to build a production-ready, visually stunning EdTech platform.

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Complete Directory Structure](#3-complete-directory-structure)
4. [Step-by-Step Setup](#4-step-by-step-setup)
5. [Core Features Implementation](#5-core-features-implementation)
   - [5.1 Authentication System](#51-authentication-system)
   - [5.2 Course Player & Syllabus](#52-course-player--syllabus)
   - [5.3 AI Doubt Solver](#53-ai-doubt-solver)
   - [5.4 Progress Tracking Dashboard](#54-progress-tracking-dashboard)
   - [5.5 Offline-First Sync](#55-offline-first-sync)
6. [UI/UX Design System](#6-uiux-design-system)
7. [Data Models & Mock Data](#7-data-models--mock-data)
8. [API Contracts](#8-api-contracts)
9. [Deployment to GitHub Pages](#9-deployment-to-github-pages)
10. [Post-Launch Improvements](#10-post-launch-improvements)

---

## 1. Project Overview

**Project Delta** is a modern educational platform featuring:
- 🎓 **Interactive Courses**: Video, text, and quiz-based lessons.
- 🤖 **AI Tutor**: Real-time doubt solving with LLM integration.
- 📊 **Progress Dashboard**: Visual analytics for learning tracking.
- 📴 **Offline Mode**: Queue actions locally, sync when online.
- 🔐 **Secure Auth**: Email/password + OAuth support.

### Why SvelteKit?
- ⚡ **Blazing Fast**: Svelte's compile-time reactivity.
- 🎨 **Better DX**: Less boilerplate, more features.
- 🌐 **Static Export**: Perfect for GitHub Pages hosting.
- 💰 **Zero Cost Hosting**: No server required for frontend.

---

## 2. Tech Stack & Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | SvelteKit v2 | App framework with SSR/SSG |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS + Shadcn-Svelte | Modern, accessible UI |
| **State** | Svelte Stores + TanStack Query | Global & server state |
| **Backend** | Supabase (or Mock) | Auth, DB, Edge Functions |
| **Offline** | Service Worker + IndexedDB | Caching & sync queue |
| **Charts** | Chart.js + svelte-chartjs | Progress visualizations |
| **Icons** | Lucide Svelte | Beautiful icon set |
| **Animations** | Svelte Transitions + Motion One | Smooth UX |
| **Deployment** | GitHub Actions + GitHub Pages | CI/CD pipeline |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Pages (Static)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  SvelteKit App                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │   │
│  │  │   Routes   │  │ Components │  │    Stores    │   │   │
│  │  └────────────┘  └────────────┘  └──────────────┘   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │   │
│  │  │  Service   │  │   Mock     │  │   Tailwind   │   │   │
│  │  │   Worker   │  │   Data     │  │   + Shadcn   │   │   │
│  │  └────────────┘  └────────────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls (HTTPS)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend-as-a-Service                        │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐           │
│  │  Supabase  │  │   Edge     │  │   External   │           │
│  │   (Auth)   │  │ Functions  │  │   LLM API    │           │
│  └────────────┘  └────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Complete Directory Structure

```
project-delta/
├── .github/
│   └── workflows/
│       └── deploy.yml                 # GitHub Actions CI/CD
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/                    # Shadcn primitives
│   │   │   │   ├── button.svelte
│   │   │   │   ├── card.svelte
│   │   │   │   ├── input.svelte
│   │   │   │   ├── dialog.svelte
│   │   │   │   └── toast.svelte
│   │   │   └── shared/
│   │   │       ├── Navbar.svelte
│   │   │       ├── Sidebar.svelte
│   │   │       ├── Footer.svelte
│   │   │       ├── LoadingSpinner.svelte
│   │   │       └── ErrorBoundary.svelte
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.svelte
│   │   │   │   ├── SignupForm.svelte
│   │   │   │   ├── ProtectedRoute.svelte
│   │   │   │   └── auth.store.ts
│   │   │   ├── courses/
│   │   │   │   ├── CourseCatalog.svelte
│   │   │   │   ├── CourseCard.svelte
│   │   │   │   ├── CoursePlayer.svelte
│   │   │   │   ├── SyllabusTree.svelte
│   │   │   │   ├── VideoPlayer.svelte
│   │   │   │   └── courses.store.ts
│   │   │   ├── ai-tutor/
│   │   │   │   ├── ChatWindow.svelte
│   │   │   │   ├── MessageBubble.svelte
│   │   │   │   ├── TypingIndicator.svelte
│   │   │   │   └── ai.store.ts
│   │   │   ├── dashboard/
│   │   │   │   ├── StatsOverview.svelte
│   │   │   │   ├── ProgressChart.svelte
│   │   │   │   └── RecentActivity.svelte
│   │   │   └── offline/
│   │   │       ├── SyncQueue.svelte
│   │   │       ├── offline.store.ts
│   │   │       └── sync.service.ts
│   │   ├── stores/
│   │   │   ├── theme.store.ts
│   │   │   └── notification.store.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── helpers.ts
│   │   ├── api/
│   │   │   ├── client.ts                # Fetch wrapper
│   │   │   ├── supabase.ts              # Supabase client
│   │   │   └── endpoints.ts             # API URL constants
│   │   ├── types/
│   │   │   ├── index.ts                 # All TS interfaces
│   │   │   └── api.types.ts
│   │   └── data/
│   │       └── mock.ts                  # Mock data for dev
│   ├── routes/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── +page.svelte
│   │   │   └── signup/
│   │   │       └── +page.svelte
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   │   └── +page.svelte
│   │   │   ├── courses/
│   │   │   │   ├── catalog/
│   │   │   │   │   └── +page.svelte
│   │   │   │   └── [courseId]/
│   │   │   │       ├── [lessonId]/
│   │   │   │       │   └── +page.svelte
│   │   │   │       └── +page.svelte
│   │   │   └── ai-lab/
│   │   │       └── +page.svelte
│   │   ├── +layout.svelte               # Root layout
│   │   ├── +page.svelte                 # Landing page
│   │   └── +error.svelte                # Error page
│   ├── app.html
│   ├── app.css                          # Global styles
│   └── service-worker.ts                # PWA offline logic
├── static/
│   ├── images/
│   │   ├── logo.svg
│   │   └── placeholders/
│   ├── manifest.json                    # PWA manifest
│   └── favicon.png
├── tailwind.config.js
├── postcss.config.js
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. Step-by-Step Setup

### 4.1 Initialize Project

```bash
# Create new SvelteKit project
npm create svelte@latest project-delta
cd project-delta

# Select options:
# - Skeleton project
# - TypeScript
# - ESLint + Prettier

# Install dependencies
npm install

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install Shadcn-Svelte
npx shadcn-svelte@latest init

# Install additional packages
npm install @sveltejs/adapter-static
npm install lucide-svelte clsx tailwind-merge
npm install chart.js svelte-chartjs
npm install marked DOMPurify
npm install idb-keyval
npm install @supabase/supabase-js
npm install svelte-toast
```

### 4.2 Configure SvelteKit for Static Export

Update `svelte.config.js`:

```javascript
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html', // SPA mode
      precompress: false,
      strict: true
    }),
    paths: {
      base: process.argv.includes('dev') ? '' : '/project-delta' // Repo name
    },
    alias: {
      $lib: './src/lib',
      $components: './src/lib/components',
      $features: './src/lib/features',
      $stores: './src/lib/stores',
      $types: './src/lib/types'
    }
  }
};

export default config;
```

### 4.3 Tailwind Configuration

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          500: '#10b981',
          600: '#059669',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
```

Add global styles in `src/app.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-transparent;
}

::-webkit-scrollbar-thumb {
  @apply bg-muted rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-muted-foreground/50;
}
```

---

## 5. Core Features Implementation

### 5.1 Authentication System

#### Types (`src/lib/types/index.ts`)

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'student' | 'instructor' | 'admin';
  createdAt: string;
  progress: Record<string, number>; // courseId -> percentage
}

export interface Session {
  user: User;
  token: string;
  expiresAt: string;
}
```

#### Auth Store (`src/lib/features/auth/auth.store.ts`)

```typescript
import { writable, derived } from 'svelte/store';
import type { User, Session } from '$types';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    
    async initialize() {
      // Check localStorage for existing session
      const savedSession = localStorage.getItem('delta_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          // Validate token expiration here
          set({
            user: session.user,
            session,
            isLoading: false,
            isAuthenticated: true
          });
        } catch {
          localStorage.removeItem('delta_session');
          set(initialState);
        }
      } else {
        set(initialState);
      }
    },

    async login(email: string, password: string) {
      update(state => ({ ...state, isLoading: true }));
      
      try {
        // Replace with actual API call or Supabase auth
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (!response.ok) throw new Error('Login failed');
        
        const session = await response.json();
        localStorage.setItem('delta_session', JSON.stringify(session));
        
        set({
          user: session.user,
          session,
          isLoading: false,
          isAuthenticated: true
        });
        
        return { success: true };
      } catch (error) {
        set(initialState);
        return { success: false, error: error.message };
      }
    },

    async logout() {
      localStorage.removeItem('delta_session');
      set(initialState);
    },

    updateProgress(courseId: string, percentage: number) {
      update(state => {
        if (!state.user) return state;
        
        return {
          ...state,
          user: {
            ...state.user,
            progress: {
              ...state.user.progress,
              [courseId]: percentage
            }
          }
        };
      });
    }
  };
}

export const authStore = createAuthStore();
```

#### Login Form (`src/lib/features/auth/LoginForm.svelte`)

```svelte
<script lang="ts">
  import { authStore } from './auth.store';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import { Card, CardContent, CardHeader, CardTitle } from '$components/ui/card';
  import { toast } from 'svelte-toast';

  let email = '';
  let password = '';
  let isLoading = false;

  async function handleSubmit() {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    isLoading = true;
    const result = await authStore.login(email, password);
    isLoading = false;

    if (result.success) {
      toast.success('Welcome back!');
      // Redirect handled by ProtectedRoute
    } else {
      toast.error(result.error || 'Login failed');
    }
  }
</script>

<Card class="w-full max-w-md mx-auto">
  <CardHeader>
    <CardTitle class="text-2xl font-bold text-center">Sign In</CardTitle>
  </CardHeader>
  <CardContent>
    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <label for="email" class="text-sm font-medium">Email</label>
        <Input
          id="email"
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          disabled={isLoading}
        />
      </div>

      <div class="space-y-2">
        <label for="password" class="text-sm font-medium">Password</label>
        <Input
          id="password"
          type="password"
          bind:value={password}
          placeholder="••••••••"
          disabled={isLoading}
        />
      </div>

      <Button 
        type="submit" 
        class="w-full" 
        disabled={isLoading}
      >
        {#if isLoading}
          <span class="animate-pulse">Signing in...</span>
        {:else}
          Sign In
        {/if}
      </Button>

      <p class="text-sm text-center text-muted-foreground">
        Don't have an account? 
        <a href="/signup" class="text-primary hover:underline">Sign up</a>
      </p>
    </form>
  </CardContent>
</Card>
```

#### Protected Route Component (`src/lib/features/auth/ProtectedRoute.svelte`)

```svelte
<script lang="ts">
  import { authStore } from './auth.store';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import LoadingSpinner from '$components/shared/LoadingSpinner.svelte';

  export let children;

  let isReady = false;
  let isAllowed = false;

  onMount(async () => {
    await authStore.initialize();
    
    const unsubscribe = authStore.subscribe(state => {
      if (!state.isLoading) {
        isReady = true;
        isAllowed = state.isAuthenticated;
        
        if (!isAllowed) {
          goto('/login');
        }
      }
    });

    return unsubscribe;
  });
</script>

{#if !isReady}
  <div class="flex items-center justify-center min-h-screen">
    <LoadingSpinner />
  </div>
{:else if isAllowed}
  <slot {children} />
{/if}
```

---

### 5.2 Course Player & Syllabus

#### Types

```typescript
export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  duration: number; // total seconds
  modules: Module[];
  enrolledAt?: string;
  progress: number; // 0-100
}

export interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'quiz' | 'text';
  contentUrl: string;
  duration: number; // seconds
  isCompleted: boolean;
  isLocked: boolean;
  order: number;
}
```

#### Course Player Page (`src/routes/(app)/courses/[courseId]/[lessonId]/+page.svelte`)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { courseStore } from '$features/courses/courses.store';
  import VideoPlayer from '$features/courses/VideoPlayer.svelte';
  import SyllabusTree from '$features/courses/SyllabusTree.svelte';
  import { Button } from '$components/ui/button';
  import { CheckCircle, Lock } from 'lucide-svelte';
  import { toast } from 'svelte-toast';

  let courseId = $derived($page.params.courseId);
  let lessonId = $derived($page.params.lessonId);
  
  let course = $state(null);
  let currentLesson = $state(null);
  let isLoading = true;

  onMount(async () => {
    course = await courseStore.getCourseById(courseId);
    currentLesson = course.modules
      .flatMap(m => m.lessons)
      .find(l => l.id === lessonId);
    
    isLoading = false;
  });

  async function markComplete() {
    await courseStore.markLessonComplete(courseId, lessonId);
    toast.success('Lesson completed!');
    
    // Auto-navigate to next lesson
    const allLessons = course.modules.flatMap(m => m.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
    if (currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      // Navigate to next lesson
    }
  }
</script>

{#if isLoading}
  <div class="flex items-center justify-center h-full">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
{:else if course && currentLesson}
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
    <!-- Main Content -->
    <div class="lg:col-span-2 space-y-4">
      <div class="bg-card rounded-lg overflow-hidden shadow-lg">
        {#if currentLesson.type === 'video'}
          <VideoPlayer 
            src={currentLesson.contentUrl}
            title={currentLesson.title}
          />
        {:else if currentLesson.type === 'text'}
          <article class="prose dark:prose-invert max-w-none p-6">
            <!-- Load text content -->
          </article>
        {:else if currentLesson.type === 'quiz'}
          <div class="p-6">
            <!-- Quiz component -->
          </div>
        {/if}
      </div>

      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">{currentLesson.title}</h1>
        <Button 
          onClick={markComplete}
          disabled={currentLesson.isCompleted}
          variant={currentLesson.isCompleted ? 'secondary' : 'default'}
        >
          {#if currentLesson.isCompleted}
            <CheckCircle class="w-4 h-4 mr-2" />
            Completed
          {:else}
            Mark as Complete
          {/if}
        </Button>
      </div>
    </div>

    <!-- Syllabus Sidebar -->
    <div class="lg:col-span-1">
      <SyllabusTree 
        {course}
        currentLessonId={lessonId}
      />
    </div>
  </div>
{/if}
```

#### Syllabus Tree Component (`src/lib/features/courses/SyllabusTree.svelte`)

```svelte
<script lang="ts">
  import type { Course, Module, Lesson } from '$types';
  import { CheckCircle, Lock, PlayCircle } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  export let course: Course;
  export let currentLessonId: string;

  function navigateToLesson(lesson: Lesson) {
    if (lesson.isLocked) return;
    goto(`/courses/${course.id}/${lesson.id}`);
  }

  function getLessonIcon(lesson: Lesson) {
    if (lesson.isCompleted) return CheckCircle;
    if (lesson.isLocked) return Lock;
    return PlayCircle;
  }
</script>

<div class="bg-card rounded-lg shadow-md overflow-hidden">
  <div class="p-4 border-b">
    <h2 class="font-semibold text-lg">Course Content</h2>
    <p class="text-sm text-muted-foreground">
      {course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} lessons
    </p>
  </div>

  <div class="max-h-[600px] overflow-y-auto">
    {#each course.modules as module (module.id)}
      <div class="border-b last:border-0">
        <div class="p-3 bg-muted/50">
          <h3 class="font-medium text-sm">{module.title}</h3>
        </div>
        
        {#each module.lessons as lesson (lesson.id)}
          {@const Icon = getLessonIcon(lesson)}
          <button
            on:click={() => navigateToLesson(lesson)}
            class="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left
                   {lesson.id === currentLessonId ? 'bg-primary/10 border-l-2 border-primary' : ''}
                   {lesson.isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
            disabled={lesson.isLocked}
          >
            <Icon 
              class="w-5 h-5 flex-shrink-0 
                     {lesson.isCompleted ? 'text-accent' : lesson.isLocked ? 'text-muted-foreground' : 'text-primary'}" 
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{lesson.title}</p>
              <p class="text-xs text-muted-foreground">
                {Math.floor(lesson.duration / 60)} min
              </p>
            </div>
          </button>
        {/each}
      </div>
    {/each}
  </div>
</div>
```

---

### 5.3 AI Doubt Solver

#### AI Store (`src/lib/features/ai-tutor/ai.store.ts`)

```typescript
import { writable } from 'svelte/store';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AIState = {
  messages: [],
  isLoading: false,
  error: null
};

function createAIStore() {
  const { subscribe, set, update } = writable<AIState>(initialState);

  return {
    subscribe,

    reset() {
      set(initialState);
    },

    async sendMessage(question: string, context?: string) {
      update(state => ({
        ...state,
        isLoading: true,
        error: null,
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: question,
            timestamp: new Date()
          }
        ]
      }));

      try {
        // For demo: mock response
        // In production: call Supabase Edge Function or external API
        const response = await simulateAIResponse(question, context);
        
        update(state => ({
          ...state,
          isLoading: false,
          messages: [
            ...state.messages,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: response,
              timestamp: new Date()
            }
          ]
        }));
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error.message
        }));
      }
    }
  };
}

// Mock AI response (replace with actual API call)
async function simulateAIResponse(question: string, context?: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return `Great question about "${question}"! 
  
Here's a detailed explanation:

1. **Concept Overview**: This is a fundamental concept in the topic.
2. **Key Points**: 
   - Point one explanation
   - Point two explanation
3. **Example**: Here's a practical example...

Would you like me to clarify anything else?`;
}

export const aiStore = createAIStore();
```

#### Chat Window Component (`src/lib/features/ai-tutor/ChatWindow.svelte`)

```svelte
<script lang="ts">
  import { aiStore, type Message } from './ai.store';
  import MessageBubble from './MessageBubble.svelte';
  import TypingIndicator from './TypingIndicator.svelte';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import { Send, Sparkles } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { marked } from 'marked';

  let messageInput = '';
  let chatContainer: HTMLDivElement;
  let isAutoScrollEnabled = true;

  const messages = $derived($aiStore.messages);
  const isLoading = $derived($aiStore.isLoading);

  onMount(() => {
    scrollToBottom();
  });

  $effect(() => {
    if (isAutoScrollEnabled) {
      scrollToBottom();
    }
  });

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  async function handleSend() {
    if (!messageInput.trim() || isLoading) return;
    
    const question = messageInput;
    messageInput = '';
    
    await aiStore.sendMessage(question);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }
</script>

<div class="flex flex-col h-full bg-card rounded-lg shadow-lg">
  <!-- Header -->
  <div class="p-4 border-b flex items-center gap-2">
    <Sparkles class="w-5 h-5 text-primary" />
    <h2 class="font-semibold">AI Tutor</h2>
  </div>

  <!-- Messages -->
  <div 
    bind:this={chatContainer}
    class="flex-1 overflow-y-auto p-4 space-y-4"
  >
    {#if messages.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
        <Sparkles class="w-12 h-12 mb-4 opacity-50" />
        <p class="text-lg font-medium">Ask me anything!</p>
        <p class="text-sm">I'm here to help you learn</p>
      </div>
    {:else}
      {#each messages as message (message.id)}
        <MessageBubble {message} />
      {/each}
      
      {#if isLoading}
        <TypingIndicator />
      {/if}
    {/if}
  </div>

  <!-- Input -->
  <div class="p-4 border-t">
    <div class="flex gap-2">
      <Input
        bind:value={messageInput}
        on:keydown={handleKeydown}
        placeholder="Type your question..."
        disabled={isLoading}
        class="flex-1"
      />
      <Button 
        onClick={handleSend}
        disabled={!messageInput.trim() || isLoading}
        size="icon"
      >
        <Send class="w-4 h-4" />
      </Button>
    </div>
  </div>
</div>
```

---

### 5.4 Progress Tracking Dashboard

#### Dashboard Page (`src/routes/(app)/dashboard/+page.svelte`)

```svelte
<script lang="ts">
  import { authStore } from '$features/auth/auth.store';
  import { courseStore } from '$features/courses/courses.store';
  import StatsOverview from '$features/dashboard/StatsOverview.svelte';
  import ProgressChart from '$features/dashboard/ProgressChart.svelte';
  import RecentActivity from '$features/dashboard/RecentActivity.svelte';
  import { onMount } from 'svelte';

  let stats = $state(null);
  let courses = $state([]);
  let isLoading = true;

  onMount(async () => {
    const [statsData, coursesData] = await Promise.all([
      courseStore.getUserStats(),
      courseStore.getEnrolledCourses()
    ]);
    
    stats = statsData;
    courses = coursesData;
    isLoading = false;
  });
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold">Dashboard</h1>
    <p class="text-muted-foreground">Track your learning progress</p>
  </div>

  {#if isLoading}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {#each Array(4) as _}
        <div class="h-32 bg-muted rounded-lg animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <StatsOverview {stats} />
    
    <div class="grid gap-6 md:grid-cols-2">
      <ProgressChart {courses} />
      <RecentActivity {courses} />
    </div>
  {/if}
</div>
```

---

### 5.5 Offline-First Sync

#### Service Worker (`src/service-worker.ts`)

```typescript
/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE_NAME = `delta-cache-${version}`;
const ASSETS = [...build, ...files];

// Install event
sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate event
sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      for (const key of keys) {
        if (key !== CACHE_NAME) {
          await caches.delete(key);
        }
      }
      return sw.clients.claim();
    })
  );
});

// Fetch event
sw.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache same-origin requests
  if (url.origin !== sw.location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed, return cached or offline page
        return caches.match('/offline.html');
      });

      return cachedResponse || fetchPromise;
    })
  );
});
```

#### Offline Store (`src/lib/features/offline/offline.store.ts`)

```typescript
import { writable } from 'svelte/store';
import { set, get, keys } from 'idb-keyval';

interface SyncItem {
  id: string;
  type: 'progress' | 'quiz' | 'note';
  data: any;
  timestamp: Date;
  synced: boolean;
}

interface OfflineState {
  isOnline: boolean;
  pendingItems: SyncItem[];
  lastSync: Date | null;
}

const initialState: OfflineState = {
  isOnline: navigator.onLine,
  pendingItems: [],
  lastSync: null
};

function createOfflineStore() {
  const { subscribe, set, update } = writable<OfflineState>(initialState);

  // Listen to online/offline events
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      update(state => ({ ...state, isOnline: true }));
      syncQueue();
    });
    
    window.addEventListener('offline', () => {
      update(state => ({ ...state, isOnline: false }));
    });
  }

  return {
    subscribe,

    async queueItem(item: Omit<SyncItem, 'id' | 'timestamp' | 'synced'>) {
      const newItem: SyncItem = {
        ...item,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        synced: false
      };

      // Save to IndexedDB
      await set(`sync_${newItem.id}`, newItem);
      
      update(state => ({
        ...state,
        pendingItems: [...state.pendingItems, newItem]
      }));

      if (state.isOnline) {
        syncQueue();
      }
    },

    async syncQueue() {
      const allKeys = await keys();
      const pendingKeys = allKeys.filter(k => k.startsWith('sync_'));
      
      for (const key of pendingKeys) {
        const item = await get(key);
        if (!item.synced) {
          try {
            // Send to API
            await fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item)
            });
            
            // Mark as synced
            item.synced = true;
            await set(key, item);
            
            update(state => ({
              ...state,
              pendingItems: state.pendingItems.filter(i => i.id !== item.id),
              lastSync: new Date()
            }));
          } catch (error) {
            console.error('Sync failed:', error);
          }
        }
      }
    }
  };
}

export const offlineStore = createOfflineStore();
```

---

## 6. UI/UX Design System

### Color Palette

```javascript
// tailwind.config.js
colors: {
  primary: { /* Indigo scale */ },
  accent: { /* Emerald scale */ },
  destructive: { /* Red scale */ },
  muted: { /* Slate scale */ },
}
```

### Typography

- **Headings**: `font-bold tracking-tight`
- **Body**: `font-normal leading-relaxed`
- **Code**: `font-mono text-sm`

### Components Checklist

- [ ] Buttons (default, secondary, outline, ghost, link)
- [ ] Inputs (text, email, password, textarea)
- [ ] Cards (with header, content, footer)
- [ ] Dialogs/Modals
- [ ] Toast notifications
- [ ] Dropdown menus
- [ ] Tabs
- [ ] Accordion (for syllabus)
- [ ] Progress bars
- [ ] Skeleton loaders
- [ ] Empty states

### Animation Guidelines

Use Svelte's built-in transitions:

```svelte
<script>
  import { fade, slide, fly } from 'svelte/transition';
</script>

<div transition:fade={{ duration: 300 }}>
  Content
</div>

{#each items as item (item.id)}
  <div in:fly={{ y: 20, duration: 400 }} out:fade>
    {item.name}
  </div>
{/each}
```

---

## 7. Data Models & Mock Data

### Mock Data File (`src/lib/data/mock.ts`)

```typescript
import type { Course, User } from '$types';

export const mockUser: User = {
  id: 'user_1',
  email: 'student@example.com',
  name: 'Alex Johnson',
  role: 'student',
  createdAt: '2024-01-01T00:00:00Z',
  progress: {
    'course_1': 45,
    'course_2': 12
  }
};

export const mockCourses: Course[] = [
  {
    id: 'course_1',
    title: 'Advanced JavaScript Mastery',
    description: 'Master modern JavaScript concepts including closures, promises, and async/await.',
    thumbnail: '/images/courses/js-advanced.jpg',
    instructor: 'Sarah Chen',
    duration: 7200,
    progress: 45,
    modules: [
      {
        id: 'mod_1',
        title: 'Closures & Scope',
        order: 1,
        lessons: [
          {
            id: 'lesson_1',
            title: 'Understanding Lexical Scope',
            type: 'video',
            contentUrl: '/videos/js-1.mp4',
            duration: 600,
            isCompleted: true,
            isLocked: false,
            order: 1
          },
          {
            id: 'lesson_2',
            title: 'Closures in Practice',
            type: 'video',
            contentUrl: '/videos/js-2.mp4',
            duration: 720,
            isCompleted: true,
            isLocked: false,
            order: 2
          },
          {
            id: 'lesson_3',
            title: 'Quiz: Closures',
            type: 'quiz',
            contentUrl: '/quizzes/js-closures',
            duration: 300,
            isCompleted: false,
            isLocked: false,
            order: 3
          }
        ]
      }
    ]
  }
];
```

---

## 8. API Contracts

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `POST` | `/api/auth/login` | User login | `{ email, password }` | `{ session, user }` |
| `POST` | `/api/auth/signup` | User registration | `{ email, password, name }` | `{ session, user }` |
| `GET` | `/api/courses` | List all courses | - | `Course[]` |
| `GET` | `/api/courses/:id` | Get course details | - | `Course` |
| `POST` | `/api/progress` | Update lesson progress | `{ courseId, lessonId, status }` | `{ success }` |
| `GET` | `/api/user/stats` | Get user statistics | - | `{ totalHours, completedLessons, streak }` |
| `POST` | `/api/ai/ask` | Ask AI tutor | `{ question, context }` | `Streamed text` |
| `POST` | `/api/sync` | Sync offline actions | `SyncItem[]` | `{ synced: number }` |

---

## 9. Deployment to GitHub Pages

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

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

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './build'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Deployment Steps

1. **Create GitHub Repository**:
   ```bash
   git init
   git remote add origin https://github.com/yourusername/project-delta.git
   ```

2. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: GitHub Actions
   - Wait for first deployment

3. **Access Your Site**:
   - URL: `https://yourusername.github.io/project-delta`

---

## 10. Post-Launch Improvements

### Phase 2 Features

- [ ] **Real-time WebSockets**: Move to Vercel/Netlify for serverless functions
- [ ] **Push Notifications**: Using Web Push API
- [ ] **Social Sharing**: Share achievements on social media
- [ ] **Gamification**: Badges, leaderboards, streaks
- [ ] **Mobile App**: Wrap with Capacitor/Tauri
- [ ] **Analytics**: Integrate Plausible or Google Analytics
- [ ] **SEO Optimization**: Meta tags, Open Graph, sitemap
- [ ] **Performance**: Lazy loading, code splitting, image optimization

### Monitoring & Maintenance

- Set up error tracking (Sentry)
- Monitor performance (Lighthouse CI)
- Regular dependency updates
- User feedback collection

---

## 🎉 Conclusion

You now have a **complete blueprint** to rebuild Project Delta from scratch with:

✅ **Modern SvelteKit architecture**  
✅ **Beautiful UI with Tailwind + Shadcn**  
✅ **Offline-first capabilities**  
✅ **GitHub Pages deployment**  
✅ **Scalable feature-first structure**  

Follow this guide step-by-step, and you'll have a production-ready educational platform that's **faster**, **more maintainable**, and **visually stunning**.

Happy coding! 🚀
