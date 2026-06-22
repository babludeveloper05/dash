'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/*  Surfaces                                                           */
/* ------------------------------------------------------------------ */

export function GlassCard({
  className,
  children,
  strong,
  hover,
  ...props
}: {
  className?: string
  children?: ReactNode
  strong?: boolean
  hover?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        strong ? 'glass-strong' : 'glass',
        'rounded-2xl elev-1 transition-all duration-300',
        hover && 'hover:elev-2 hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('hairline w-full', className)} />
}

/* ------------------------------------------------------------------ */
/*  Pills / buttons                                                    */
/* ------------------------------------------------------------------ */

export function Pill({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
        active
          ? 'bg-cream text-cream-foreground elev-1 font-semibold'
          : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-border',
        className
      )}
    >
      {children}
    </button>
  )
}

export function IconButton({
  children,
  onClick,
  className,
  label,
  active,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  label: string
  active?: boolean
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid place-items-center rounded-full size-9 transition-all border border-border',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  )
}

export function PrimaryButton({
  children,
  onClick,
  className,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground',
        'transition-all hover:brightness-110 active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        className
      )}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full bg-white/5 border border-border px-4 py-2 text-xs font-medium text-foreground',
        'transition-all hover:bg-white/10 active:translate-y-px',
        className
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Data viz primitives                                                */
/* ------------------------------------------------------------------ */

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  className,
  trackClass = 'text-white/10',
  valueClass = 'text-primary',
  children,
}: {
  value: number // 0..1
  size?: number
  stroke?: number
  className?: string
  trackClass?: string
  valueClass?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const safeValue = isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
  const offset = c * (1 - safeValue)
  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} stroke="currentColor" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={valueClass}
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

// Big metric numeral styled like the reference ( ,77,32% )

export function MetricCard({
  label,
  value,
  sub,
  icon,
  trend,
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  trend?: { value: number; suffix?: string }
  className?: string
}) {
  return (
    <GlassCard className={cn('p-4 flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          {icon}
          {label}
        </span>
        {trend && (
          <span
            className={cn(
              'text-[11px] font-medium tabular px-1.5 py-0.5 rounded-md',
              trend.value >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
            )}
          >
            {trend.value >= 0 ? '+' : ''}
            {trend.value}
            {trend.suffix ?? ''}
          </span>
        )}
      </div>
      <div className="text-2xl font-light tracking-tight tabular">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </GlassCard>
  )
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
  className?: string
}) {
  const tones: Record<string, string> = {
    default: 'bg-white/5 text-muted-foreground border-border',
    primary: 'bg-primary/12 text-primary border-primary/20',
    success: 'bg-success/12 text-success border-success/20',
    warning: 'bg-warning/12 text-warning border-warning/20',
    destructive: 'bg-destructive/12 text-destructive border-destructive/20',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Form controls                                                      */
/* ------------------------------------------------------------------ */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors border border-border',
        checked ? 'bg-primary' : 'bg-white/10'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-cream transition-transform',
          checked ? 'translate-x-5.5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-border p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-all',
            value === o.value ? 'bg-cream text-cream-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Identity                                                           */
/* ------------------------------------------------------------------ */

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return (
    <div
      className={cn(
        'grid place-items-center rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-border text-foreground font-medium',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Layout helpers                                                     */
/* ------------------------------------------------------------------ */


export function EmptyState({ icon, title, hint, cta }: { icon: ReactNode; title: string; hint?: string; cta?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center h-full text-muted-foreground py-12">
      <div className="grid place-items-center size-14 rounded-2xl bg-white/5 border border-border text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {hint && <p className="text-xs mt-1 max-w-xs text-pretty">{hint}</p>}
      </div>
      {cta}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-white/5', className)} />
}

/**
 * PageSkeleton — full-page loading skeleton shown while content is fetching.
 * Adapts to the page type with a rough layout preview.
 */
export function PageSkeleton({ variant = 'grid' }: { variant?: 'grid' | 'list' | 'dashboard' | 'charts' }) {
  if (variant === 'dashboard') {
    return (
      <div className="flex flex-col gap-4 p-5">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    )
  }
  if (variant === 'list') {
    return (
      <div className="flex flex-col gap-2 p-5">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }
  if (variant === 'charts') {
    return (
      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    )
  }
  // grid (default — Library, Tests, etc.)
  return (
    <div className="flex flex-col gap-4 p-5">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      <div className="grid grid-cols-2 @sm:grid-cols-3 @lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-56" />
        ))}
      </div>
    </div>
  )
}

/**
 * ErrorState — shown when a page's content fetch fails. Shows the error
 * message + a retry button.
 */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <div className="grid place-items-center size-12 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{message || 'Something went wrong'}</p>
        <p className="text-xs text-muted-foreground mt-1">Check your connection and try again.</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-medium hover:brightness-110 transition-all"
        >
          Retry
        </button>
      )}
    </div>
  )
}
