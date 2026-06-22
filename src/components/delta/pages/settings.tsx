'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  User, Bell, Target, RotateCcw, Check, Trash2, Sparkles,
  Calendar, AlertTriangle, Palette, Home, Library, FileText,
  StickyNote, Radio, Activity, Medal, Award, Layers, MessageCircleQuestion,
  LayoutDashboard, Settings as SettingsIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  GlassCard, Toggle, Avatar, PrimaryButton, GhostButton,
} from '@/components/delta/ui'
import { ScaledPage } from '@/components/delta/scaled-page'
import { useStore, type UserProfile, type TabId } from '@/lib/store'
import { cn } from '@/lib/utils'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'

const PAGE_OPTIONS: { id: TabId; label: string; icon: LucideIcon; locked?: boolean }[] = [
  { id: 'home', label: 'Home', icon: Home, locked: true },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'tests', label: 'Tests', icon: FileText },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'analytics', label: 'Analytics', icon: Activity },
  { id: 'leaderboard', label: 'Leaderboard', icon: Medal },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'syllabus', label: 'Syllabus', icon: Layers },
  { id: 'doubts', label: 'Doubts', icon: MessageCircleQuestion },
  { id: 'playground', label: 'Playground', icon: LayoutDashboard },
  { id: 'profile', label: 'Profile', icon: User, locked: true },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, locked: true },
]

export function SettingsPage() {
  const dailyGoalHours = useStore((s) => s.dailyGoalHours)
  const setDailyGoal = useStore((s) => s.setDailyGoal)
  const customCountdownDate = useStore((s) => s.customCountdownDate)
  const countdownLabel = useStore((s) => s.countdownLabel)
  const setCountdown = useStore((s) => s.setCountdown)
  const resetComponents = useStore((s) => s.resetComponents)
  const setTab = useStore((s) => s.setTab)
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const notifications = useStore((s) => s.notifications)
  const setNotifications = useStore((s) => s.setNotifications)
  const appearance = useStore((s) => s.appearance)
  const setAppearance = useStore((s) => s.setAppearance)
  const enabledTabs = useStore((s) => s.enabledTabs)
  const setEnabledTabs = useStore((s) => s.setEnabledTabs)

  // Account section: edit a local draft, commit to the store only on Save.
  // Previously the fields were uncontrolled (defaultValue + onBlur) and the
  // Save button was a no-op, so typing then clicking Save *without blurring
  // first* silently lost edits while flashing a false "Saved" badge.
  const [draft, setDraft] = useState<UserProfile>(profile)
  const draftDirty =
    draft.name !== profile.name ||
    draft.examName !== profile.examName ||
    draft.track !== profile.track ||
    draft.targetYear !== profile.targetYear ||
    draft.batch !== profile.batch ||
    draft.location !== profile.location ||
    draft.bio !== profile.bio

  // Countdown label: controlled local state committed on each change so there
  // is no blur dependency. (The date input was already onChange-driven.)
  const [labelDraft, setLabelDraft] = useState(countdownLabel)

  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const reduce = useReducedMotion() ?? false

  function flash() {
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1400)
  }

  function saveAccount() {
    if (!draftDirty) return
    setProfile(draft)
    flash()
  }

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(customCountdownDate).getTime() - Date.now()) / 86400000)
  )

  function handleClearData() {
    try {
      localStorage.removeItem('project-delta-v1')
    } catch {
      /* ignore storage errors */
    }
    location.reload()
  }

  return (
    <ScaledPage>
      <motion.div
        variants={staggerContainer(reduce)}
        initial="initial"
        animate="animate"
      >
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex items-center justify-end gap-2 px-5 pt-5">
        {savedFlash ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-success animate-in fade-in duration-200">
            <Check className="size-4" /> Saved
          </span>
        ) : undefined}
      </motion.div>

      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="px-5 pb-6 max-w-3xl mx-auto flex flex-col gap-5">
        {/* Account */}
        <SectionCard
          icon={<User className="size-4" />}
          title="Account"
          description="Update your personal information"
        >
          <div className="flex items-center gap-4 mb-5">
            <Avatar name={profile.name} size={56} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {profile.examName} · Target {profile.targetYear}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 @sm:grid-cols-2 gap-3">
            <Field
              label="Display name"
              value={draft.name}
              onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
            />
            <Field
              label="Goal / focus"
              value={draft.examName}
              onChange={(v) => setDraft((d) => ({ ...d, examName: v }))}
            />
            <Field
              label="Track"
              hint="What you are — drives the AI tutor persona"
              value={draft.track}
              onChange={(v) => setDraft((d) => ({ ...d, track: v }))}
            />
            <Field
              label="Target year"
              value={draft.targetYear}
              onChange={(v) => setDraft((d) => ({ ...d, targetYear: v }))}
            />
            <Field
              label="Batch"
              value={draft.batch}
              onChange={(v) => setDraft((d) => ({ ...d, batch: v }))}
            />
            <Field
              label="Location"
              value={draft.location}
              onChange={(v) => setDraft((d) => ({ ...d, location: v }))}
              className="@sm:col-span-2"
            />
            <Field
              label="Bio"
              textarea
              value={draft.bio}
              onChange={(v) => setDraft((d) => ({ ...d, bio: v }))}
              className="@sm:col-span-2"
            />
          </div>
          <div className="flex justify-end mt-4">
            <PrimaryButton onClick={saveAccount} disabled={!draftDirty}>
              <Check className="size-3.5" /> Save changes
            </PrimaryButton>
          </div>
        </SectionCard>

        {/* Study Goals */}
        <SectionCard
          icon={<Target className="size-4" />}
          title="Study Goals"
          description="Set your daily study target"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="daily-goal" className="text-sm">
                Daily study goal
              </label>
              <span className="text-sm tabular text-primary font-medium">
                {dailyGoalHours}h / day
              </span>
            </div>
            <input
              id="daily-goal"
              type="range"
              min={1}
              max={12}
              step={1}
              value={dailyGoalHours}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              onPointerUp={flash}
              className="w-full accent-primary cursor-pointer"
              aria-describedby="daily-goal-hint"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground tabular">
              <span>1h</span>
              <span>6h</span>
              <span>12h</span>
            </div>
            <p id="daily-goal-hint" className="text-[11px] text-muted-foreground">
              Powers your daily progress ring on the dashboard.
            </p>
          </div>
        </SectionCard>

        {/* Countdown */}
        <SectionCard
          icon={<Calendar className="size-4" />}
          title="Countdown"
          description="Track your most important date"
        >
          <div className="space-y-3">
            <Field
              label="Countdown label"
              value={labelDraft}
              hint="Shown on the countdown component (e.g. Exam Day, Final Test)"
              onChange={(v) => {
                setLabelDraft(v)
                setCountdown(v || 'Exam Day', customCountdownDate)
                flash()
              }}
            />
            <div>
              <span className="text-[11px] text-muted-foreground">Target date</span>
              <input
                type="date"
                defaultValue={customCountdownDate}
                onChange={(e) => { setCountdown(countdownLabel, e.target.value); flash() }}
                className="mt-1 w-full @sm:w-auto rounded-lg bg-white/5 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40 transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-primary/[0.06] border border-primary/15 p-3">
              <span className="grid place-items-center size-10 rounded-lg bg-primary/15 text-primary border border-primary/20 shrink-0">
                <Calendar className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {countdownLabel || 'Exam Day'}
                </p>
                <p className="text-lg font-light tabular">
                  <span className="text-primary font-medium">{daysRemaining}</span>
                  <span className="text-muted-foreground text-sm ml-1.5">days remaining</span>
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          icon={<Bell className="size-4" />}
          title="Notifications"
          description="Choose what to be reminded about"
        >
          <div className="divide-y divide-border/70">
            <NotifRow
              label="Live class reminders"
              hint="A nudge 10 minutes before a live class starts"
              checked={notifications.live}
              onChange={(v) => { setNotifications({ live: v }); flash() }}
            />
            <NotifRow
              label="Test deadlines"
              hint="A reminder 24 hours before any test expires"
              checked={notifications.tests}
              onChange={(v) => { setNotifications({ tests: v }); flash() }}
            />
            <NotifRow
              label="Streak alerts"
              hint="Don't break the chain — a daily study reminder"
              checked={notifications.streak}
              onChange={(v) => { setNotifications({ streak: v }); flash() }}
            />
            <NotifRow
              label="Weekly progress"
              hint="A Sunday digest of your week"
              checked={notifications.weekly}
              onChange={(v) => { setNotifications({ weekly: v }); flash() }}
            />
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard
          icon={<Palette className="size-4" />}
          title="Appearance"
          description="Accent color, density, glassmorphism & nav pages"
        >
          <div className="space-y-5">
            {/* Accent hue */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Accent color</span>
                <span
                  className="size-6 rounded-full border-2 border-white/20 transition-all"
                  style={{ background: `oklch(0.74 0.135 ${appearance.accentHue})` }}
                  aria-hidden
                />
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={appearance.accentHue}
                onChange={(e) => setAppearance({ accentHue: Number(e.target.value) })}
                className="w-full"
                style={{ accentColor: `oklch(0.74 0.135 ${appearance.accentHue})` }}
                aria-label="Accent color hue"
              />
              <div
                className="h-2 rounded-full mt-2"
                style={{ background: 'linear-gradient(to right, oklch(0.74 0.135 0), oklch(0.74 0.135 60), oklch(0.74 0.135 120), oklch(0.74 0.135 180), oklch(0.74 0.135 240), oklch(0.74 0.135 300), oklch(0.74 0.135 360))' }}
                aria-hidden
              />
              <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground/70 tabular">
                <span>0°</span><span>180°</span><span>360°</span>
              </div>
            </div>

            {/* Density */}
            <div>
              <span className="text-sm text-muted-foreground block mb-2">Layout density</span>
              <div className="grid grid-cols-2 gap-2">
                {(['comfortable', 'compact'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setAppearance({ density: d })}
                    className={cn(
                      'rounded-xl border py-2.5 px-3 text-sm font-medium transition-all capitalize',
                      appearance.density === d
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Glass strength */}
            <div>
              <span className="text-sm text-muted-foreground block mb-2">Glassmorphism</span>
              <div className="grid grid-cols-3 gap-2">
                {(['subtle', 'medium', 'strong'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setAppearance({ glass: g })}
                    className={cn(
                      'rounded-xl border py-2.5 px-3 text-sm font-medium transition-all capitalize',
                      appearance.glass === g
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Nav pages */}
            <div>
              <span className="text-sm text-muted-foreground block mb-2">Navigation pages</span>
              <div className="grid grid-cols-2 gap-2">
                {PAGE_OPTIONS.map((p) => {
                  const on = enabledTabs.includes(p.id)
                  const Icon = p.icon
                  const locked = p.locked
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (locked) return
                        setEnabledTabs(
                          on ? enabledTabs.filter((x) => x !== p.id) : [...enabledTabs, p.id]
                        )
                      }}
                      disabled={locked}
                      className={cn(
                        'rounded-xl border p-2.5 text-left transition-all flex items-center gap-2',
                        on
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-white/5 hover:bg-white/10 hover:border-white/15',
                        locked && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <Icon className="size-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium flex-1">{p.label}</span>
                      {locked ? (
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Always</span>
                      ) : on ? (
                        <Check className="size-3 text-primary" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {enabledTabs.length} of {PAGE_OPTIONS.length} pages enabled. Changes apply instantly.
              </p>
            </div>

            {/* Playground link */}
            <Row
              label="Customize dashboard"
              hint="Add components, drag, resize & arrange your home"
            >
              <GhostButton onClick={() => setTab('playground')}>
                <Sparkles className="size-3.5" /> Open Playground
              </GhostButton>
            </Row>
          </div>
        </SectionCard>

        {/* Danger Zone */}
        <SectionCard
          danger
          icon={<AlertTriangle className="size-4" />}
          title="Danger Zone"
          description="Irreversible actions — proceed with care"
        >
          <div className="space-y-3">
            <Row
              label="Reset component layout"
              hint="Restore the default home dashboard arrangement"
              dangerAction
            >
              {confirmReset ? (
                <div className="flex items-center gap-2">
                  <GhostButton onClick={() => setConfirmReset(false)}>Cancel</GhostButton>
                  <button
                    onClick={() => { resetComponents(); setConfirmReset(false); flash() }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 text-warning border border-warning/30 px-4 py-2 text-xs font-medium hover:bg-warning/25 transition-colors"
                  >
                    <RotateCcw className="size-3.5" /> Yes, reset
                  </button>
                </div>
              ) : (
                <GhostButton onClick={() => setConfirmReset(true)}>
                  <RotateCcw className="size-3.5" /> Reset
                </GhostButton>
              )}
            </Row>

            <Row
              label="Clear all local data"
              hint="Resets progress, notes, history and components on this device"
              dangerAction
            >
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <GhostButton onClick={() => setConfirmClear(false)}>Cancel</GhostButton>
                  <button
                    onClick={handleClearData}
                    className="inline-flex items-center gap-1.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 px-4 py-2 text-xs font-medium hover:bg-destructive/30 transition-colors"
                  >
                    <Trash2 className="size-3.5" /> Yes, clear everything
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30 px-4 py-2 text-xs font-medium hover:bg-destructive/25 transition-colors"
                >
                  <Trash2 className="size-3.5" /> Clear data
                </button>
              )}
            </Row>
          </div>
        </SectionCard>
      </motion.div>
      </motion.div>
    </ScaledPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionCard({
  icon, title, description, children, danger,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <GlassCard className={cn('p-5', danger && 'border-destructive/25')}>
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
        <span
          className={cn(
            'grid place-items-center size-8 rounded-lg border shrink-0',
            danger
              ? 'bg-destructive/10 text-destructive border-destructive/20'
              : 'bg-primary/10 text-primary border-primary/15'
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="text-[11px] text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>
      {children}
    </GlassCard>
  )
}

function Row({
  label, hint, children, dangerAction,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  dangerAction?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className={cn('text-sm', dangerAction && 'text-destructive')}>{label}</p>
        {hint && (
          <p className="text-[11px] text-muted-foreground mt-0.5 text-pretty">{hint}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function NotifRow({
  label, hint, checked, onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint && (
          <p className="text-[11px] text-muted-foreground mt-0.5 text-pretty">{hint}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

function Field({
  label, value, onChange, textarea, hint, className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  textarea?: boolean
  hint?: string
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none rounded-lg bg-white/5 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40 transition-colors scroll-thin"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg bg-white/5 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40 transition-colors"
        />
      )}
      {hint && (
        <span className="text-[10px] text-muted-foreground/70 mt-1 block">{hint}</span>
      )}
    </label>
  )
}
