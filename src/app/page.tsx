'use client'

import { Component, type ReactNode } from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 grid place-items-center bg-background p-8">
          <div className="max-w-lg w-full">
            <h1 className="text-xl font-semibold text-destructive mb-2">Something went wrong</h1>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all bg-white/5 rounded-xl p-4 border border-border overflow-auto max-h-60">
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

import { AppShell } from "@/components/delta/app-shell";

export default function Page() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
