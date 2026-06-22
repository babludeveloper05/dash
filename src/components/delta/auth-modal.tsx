'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, User as UserIcon, Loader2, Check, AlertCircle } from 'lucide-react'
import { useStore } from '@/lib/store'
import { GlassCard } from './ui'

export function AuthModal() {
  const { authModalOpen, setAuthModalOpen, setAuthUser } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset state when modal opens
  useEffect(() => {
    if (authModalOpen) {
      setError('')
      setLoading(false)
    }
  }, [authModalOpen])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name: name || 'New Learner' }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      // Success — store the user, close modal
      setAuthUser(data.user)
      setAuthModalOpen(false)
      // Reload to pick up synced state
      window.location.reload()
    } catch {
      setError('Network error — is the backend running?')
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {authModalOpen && (
        <motion.div
          className="fixed inset-0 z-[130] grid place-items-center bg-black/65 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !loading && setAuthModalOpen(false)}
        >
          <GlassCard
            strong
            className="w-[min(420px,92vw)] p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => !loading && setAuthModalOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 grid place-items-center size-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="size-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <span className="grid place-items-center size-10 rounded-xl bg-primary text-primary-foreground elev-1 shrink-0">
                <UserIcon className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mode === 'login'
                    ? 'Sign in to sync your progress across devices.'
                    : 'Join Delta to sync your learning across devices.'}
                </p>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-border mb-4">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError('') }}
                  className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-all ${
                    mode === m
                      ? 'bg-cream text-cream-foreground elev-1 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'login' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={submit} className="flex flex-col gap-3">
              {mode === 'register' && (
                <AuthField icon={<UserIcon className="size-3.5" />} label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
                  />
                </AuthField>
              )}
              <AuthField icon={<Mail className="size-3.5" />} label="Email">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
                />
              </AuthField>
              <AuthField icon={<Lock className="size-3.5" />} label="Password">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
                />
              </AuthField>

              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:brightness-110 active:translate-y-px transition-all disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" /> Please wait…</>
                ) : mode === 'login' ? (
                  <><Check className="size-4" /> Sign in</>
                ) : (
                  <><Check className="size-4" /> Create account</>
                )}
              </button>
            </form>

            <p className="text-[11px] text-muted-foreground/70 mt-4 text-center text-pretty">
              Your data syncs to your account when online. Guest mode keeps everything local.
            </p>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AuthField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-xl border border-border bg-white/5 px-3 py-2 focus-within:border-primary/60 focus-within:bg-white/[0.07] transition-colors">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
        {icon}
        {label}
      </span>
      {children}
    </label>
  )
}
