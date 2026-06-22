'use client'

import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  MessageCircleQuestion, Plus, ArrowBigUp, MessageSquare, CheckCircle2,
  Send, X, Clock, ChevronDown, CircleDot, Sparkles, AlertCircle,
  RotateCcw, Bot,
} from 'lucide-react'
import {
  GlassCard, Pill, Avatar, EmptyState,
  PrimaryButton, GhostButton, Badge,
} from '@/components/delta/ui'
import { ScaledPage } from '@/components/delta/scaled-page'
import { FilterBar } from '@/components/delta/global'
import { useStore, type DoubtItem } from '@/lib/store'
import { timeAgo } from '@/lib/format'
import { subjectTone } from '@/lib/subjects'
import { cn } from '@/lib/utils'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'

type FilterKey = 'all' | 'mine' | 'resolved' | 'open'
type SortKey = 'recent' | 'top'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'My Doubts' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'open', label: 'Open' },
]

const FALLBACK_SUBJECTS = ['Physics', 'Chemistry', 'Maths'] as const

export function DoubtsPage() {
  const doubts = useStore((s) => s.doubts)
  const addDoubt = useStore((s) => s.addDoubt)
  const addDoubtAnswer = useStore((s) => s.addDoubtAnswer)
  const markDoubtAnswerError = useStore((s) => s.markDoubtAnswerError)
  const voteDoubt = useStore((s) => s.voteDoubt)
  const profileName = useStore((s) => s.profile.name)
  const profileSubjects = useStore((s) => s.profile.subjects)
  const profileTrack = useStore((s) => s.profile.track)
  // Subjects come from the user's profile (set during onboarding) — so the
  // doubt subject picker adapts to whatever the user is studying: JEE, dev,
  // design, languages, anything. Falls back to a sensible default.
  const subjectOptions = profileSubjects.length > 0 ? profileSubjects : [...FALLBACK_SUBJECTS]

  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [query, setQuery] = useState('')
  const [composing, setComposing] = useState(false)
  const [autoExpand, setAutoExpand] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState<{ text: string; subject: string }>({
    text: '',
    subject: subjectOptions[0] ?? 'General',
  })
  const [posting, setPosting] = useState(false)
  const reduce = useReducedMotion() ?? false

  const openCount = doubts.filter((d) => !d.resolved).length
  const resolvedCount = doubts.length - openCount

  const list = useMemo(() => {
    let l = doubts
    if (filter === 'open') l = l.filter((d) => !d.resolved)
    if (filter === 'resolved') l = l.filter((d) => d.resolved)
    if (filter === 'mine') l = l.filter((d) => d.mine)
    if (query.trim()) {
      const q = query.toLowerCase()
      l = l.filter((d) => d.text.toLowerCase().includes(q))
    }
    l = [...l].sort((a, b) =>
      sort === 'recent' ? a.hoursAgo - b.hoursAgo : b.upvotes - a.upvotes
    )
    return l
  }, [doubts, filter, query, sort])

  /**
   * Post a doubt: optimistically add it to the feed, insert a pending
   * "AI Tutor is thinking…" answer, then call the backend. On success the
   * pending placeholder is replaced with the real answer; on failure it's
   * flagged for a retry.
   */
  async function postDoubt() {
    const text = draft.text.trim()
    if (!text || posting) return

    const subject = draft.subject
    const asker = profileName || 'You'

    // 1. Optimistic insert — doubt appears instantly with a pending AI answer.
    const doubtId = addDoubt({ text, subject, asker })
    const pendingAnswerId = `ans-pending-${doubtId}`
    addDoubtAnswer(doubtId, {
      author: 'Delta AI Tutor',
      role: 'AI Tutor',
      text: '',
      helpful: 0,
      pending: true,
    })
    // The store assigns its own id; we don't need to track pendingAnswerId.

    setPosting(true)
    setDraft({ text: '', subject: subjectOptions[0] ?? 'General' })
    setComposing(false)
    setAutoExpand((e) => ({ ...e, [doubtId]: true }))

    // 2. Call the backend AI tutor (z-ai-web-dev-sdk lives server-side).
    try {
      const res = await fetch('/api/doubts/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, subject, track: profileTrack, subjects: profileSubjects }),
      })
      const data = await res.json()
      if (!res.ok || !data.answer) {
        throw new Error(data?.error || 'Failed to get an answer')
      }
      // 3a. Replace the pending placeholder with the real answer. The store's
      // addDoubtAnswer flattens any pending entries first, so the pending
      // bubble is swapped out rather than duplicated.
      addDoubtAnswer(doubtId, {
        author: 'Delta AI Tutor',
        role: 'AI Tutor',
        text: data.answer,
        helpful: 0,
      })
    } catch {
      // 3b. Flag the pending answer as errored so the UI offers a retry.
      markDoubtAnswerError(doubtId, pendingAnswerId)
    } finally {
      setPosting(false)
    }
  }

  /** Retry an errored AI answer for a doubt. */
  async function retryAnswer(doubt: DoubtItem) {
    const errored = doubt.answers.find((a) => a.error)
    if (errored) {
      // Clear the error flag by re-adding a fresh pending answer.
      addDoubtAnswer(doubt.id, {
        author: 'Delta AI Tutor',
        role: 'AI Tutor',
        text: '',
        helpful: 0,
        pending: true,
      })
    }
    try {
      const res = await fetch('/api/doubts/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: doubt.text, subject: doubt.subject, track: profileTrack, subjects: profileSubjects }),
      })
      const data = await res.json()
      if (!res.ok || !data.answer) throw new Error(data?.error || 'retry failed')
      addDoubtAnswer(doubt.id, {
        author: 'Delta AI Tutor',
        role: 'AI Tutor',
        text: data.answer,
        helpful: 0,
      })
    } catch {
      /* leave the existing error state in place */
    }
  }

  return (
    <ScaledPage>
      <motion.div
        className="flex flex-col gap-4"
        variants={staggerContainer(reduce)}
        initial="initial"
        animate="animate"
      >
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex items-center justify-end gap-2 px-5 pt-5">
        <PrimaryButton
          onClick={() => setComposing(true)}
          className="px-4 py-2 text-sm"
        >
          <Plus className="size-4" /> Ask a Doubt
        </PrimaryButton>
      </motion.div>

      {/* AI banner */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="px-5">
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/[0.06] to-transparent border border-primary/15 p-3">
          <span className="grid place-items-center size-10 rounded-xl bg-primary/15 text-primary border border-primary/25 shrink-0">
            <Bot className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium flex items-center gap-2">
              Delta AI Tutor
              <Badge tone="primary">
                <Sparkles className="size-3" /> New
              </Badge>
            </p>
            <p className="text-[11px] text-muted-foreground text-pretty">
              Post any doubt and get a step-by-step worked solution in seconds. Powered by GLM-4.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick stats */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="px-5 grid grid-cols-3 gap-3">
        <GlassCard className="p-3 flex items-center gap-3">
          <span className="grid place-items-center size-9 rounded-xl bg-primary/15 text-primary border border-primary/20 shrink-0">
            <MessageCircleQuestion className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="text-base font-light tabular leading-tight">{doubts.length}</p>
          </div>
        </GlassCard>
        <GlassCard className="p-3 flex items-center gap-3">
          <span className="grid place-items-center size-9 rounded-xl bg-warning/15 text-warning border border-warning/20 shrink-0">
            <AlertCircle className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Open</p>
            <p className="text-base font-light tabular leading-tight">{openCount}</p>
          </div>
        </GlassCard>
        <GlassCard className="p-3 flex items-center gap-3">
          <span className="grid place-items-center size-9 rounded-xl bg-success/15 text-success border border-success/20 shrink-0">
            <CheckCircle2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Resolved</p>
            <p className="text-base font-light tabular leading-tight">{resolvedCount}</p>
          </div>
        </GlassCard>
      </motion.div>

      {/* Search + sort */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="px-5">
        <FilterBar
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search doubts..."
          searchLabel="Search doubts"
          segmentedOptions={[
            { value: 'recent', label: 'Recent' },
            { value: 'top', label: 'Top voted' },
          ]}
          segmentedValue={sort}
          onSegmentedChange={(v) => setSort(v as SortKey)}
        />
      </motion.div>

      {/* Filter pills */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="px-5 flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <Pill key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Pill>
        ))}
      </motion.div>

      {/* List */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex-1 min-h-0 overflow-y-auto scroll-thin px-5 pb-5">
        {list.length === 0 ? (
          <GlassCard className="p-6 min-h-[220px] flex items-center justify-center">
            <EmptyState
              icon={<MessageCircleQuestion className="size-6" />}
              title="No doubts match"
              hint="Try a different filter, or be the first to ask a question."
              cta={
                <PrimaryButton
                  onClick={() => setComposing(true)}
                  className="mt-2"
                >
                  <Plus className="size-4" /> Ask a Doubt
                </PrimaryButton>
              }
            />
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-2.5">
            {list.map((d) => {
              const isVoted = useStore.getState().hasVotedDoubt(d.id)
              const isExpanded = !!autoExpand[d.id] || d.answers.some((a) => a.pending || a.error)
              const isMine = d.mine
              const tone = subjectTone(d.subject)
              const answerCount = d.answers.length
              return (
                <GlassCard
                  key={d.id}
                  className={cn(
                    'overflow-hidden transition-all',
                    isMine && 'ring-1 ring-primary/30'
                  )}
                >
                  <div className="p-4 flex gap-4">
                    {/* Vote */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button
                        onClick={() => voteDoubt(d.id)}
                        aria-label={isVoted ? 'Remove upvote' : 'Upvote doubt'}
                        aria-pressed={isVoted}
                        className={cn(
                          'grid place-items-center size-9 rounded-lg border transition-all',
                          isVoted
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : 'bg-white/5 border-border text-muted-foreground hover:text-foreground hover:bg-white/10'
                        )}
                      >
                        <ArrowBigUp className={cn('size-5', isVoted && 'fill-current')} />
                      </button>
                      <span className="text-xs tabular font-medium">{d.upvotes}</span>
                    </div>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            background: `color-mix(in oklch, ${tone} 14%, transparent)`,
                            borderColor: `color-mix(in oklch, ${tone} 28%, transparent)`,
                            color: tone,
                          }}
                        >
                          <CircleDot className="size-2.5" />
                          {d.subject}
                        </span>
                        {d.resolved ? (
                          <Badge tone="success">
                            <CheckCircle2 className="size-3" /> Resolved
                          </Badge>
                        ) : (
                          <Badge tone="warning">Open</Badge>
                        )}
                        {isMine && (
                          <Badge tone="primary">
                            <Sparkles className="size-3" /> Mine
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm leading-relaxed text-pretty">{d.text}</p>

                      <div className="flex items-center gap-3 mt-3 flex-wrap text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Avatar name={d.asker} size={20} />
                          <span className="font-medium text-foreground/80">{d.asker}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" /> {timeAgo(d.hoursAgo)}
                        </span>
                        <button
                          onClick={() =>
                            setAutoExpand((e) => ({ ...e, [d.id]: !e[d.id] }))
                          }
                          aria-expanded={isExpanded}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <MessageSquare className="size-3" />
                          {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
                          <ChevronDown
                            className={cn(
                              'size-3 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable answers */}
                  {isExpanded && (
                    <div className="border-t border-border bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
                        {answerCount > 0
                          ? `${answerCount} ${answerCount === 1 ? 'Answer' : 'Answers'}`
                          : 'No answers yet — ask the AI Tutor'}
                      </p>
                      {answerCount > 0 && (
                        <div className="flex flex-col gap-3">
                          {d.answers.map((a) => (
                            <AnswerBubble
                              key={a.id}
                              answer={a}
                              onRetry={() => retryAnswer(d)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </GlassCard>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Compose modal */}
      {composing && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease]"
          onClick={() => !posting && setComposing(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ask a doubt"
        >
          <GlassCard
            strong
            className="w-full max-w-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center size-8 rounded-lg bg-primary/15 text-primary border border-primary/20">
                  <MessageCircleQuestion className="size-4" />
                </span>
                <p className="text-base font-medium">Ask a Doubt</p>
              </div>
              <button
                onClick={() => !posting && setComposing(false)}
                disabled={posting}
                aria-label="Close compose dialog"
                className="grid place-items-center size-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Subject
              </span>
              {subjectOptions.map((s) => (
                <Pill
                  key={s}
                  active={draft.subject === s}
                  onClick={() => setDraft((d) => ({ ...d, subject: s }))}
                >
                  {s}
                </Pill>
              ))}
            </div>

            <textarea
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              autoFocus
              placeholder="Describe your doubt clearly. Mention the chapter and what you've tried…"
              aria-label="Doubt text"
              className="w-full h-32 resize-none rounded-xl bg-white/5 border border-border p-3 text-sm outline-none focus:border-white/25 scroll-thin placeholder:text-muted-foreground"
            />

            <div className="flex items-center justify-between gap-2 mt-4">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" />
                Delta AI Tutor will answer in seconds
              </span>
              <div className="flex items-center gap-2">
                <GhostButton onClick={() => setComposing(false)} disabled={posting}>
                  Cancel
                </GhostButton>
                <PrimaryButton
                  onClick={postDoubt}
                  disabled={!draft.text.trim() || posting}
                >
                  <Send className="size-4" /> Post &amp; Solve
                </PrimaryButton>
              </div>
            </div>
          </GlassCard>

          <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
        </div>
      )}
      </motion.div>
    </ScaledPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Answer bubble — renders AI / faculty / student answers, plus the   */
/*  pending "thinking" state and the errored retry affordance.         */
/* ------------------------------------------------------------------ */

function AnswerBubble({
  answer,
  onRetry,
}: {
  answer: {
    author: string
    role: string
    text: string
    hoursAgo: number
    helpful: number
    pending?: boolean
    error?: boolean
  }
  onRetry: () => void
}) {
  const isAi = answer.role === 'AI Tutor'

  // Pending state — animated "thinking" bubble.
  if (answer.pending) {
    return (
      <div className="flex gap-3">
        <span className="grid place-items-center size-9 rounded-full bg-primary/15 text-primary border border-primary/25 shrink-0">
          <Bot className="size-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium">Delta AI Tutor</span>
            <span className="text-[10px] rounded-full bg-primary/15 border border-primary/25 px-1.5 py-0.5 text-primary flex items-center gap-1">
              <Sparkles className="size-2.5" /> AI
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              thinking…
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.2s]" />
            <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.1s]" />
            <span className="size-1.5 rounded-full bg-primary/60 animate-bounce" />
            <span className="text-[11px] text-muted-foreground ml-1">
              Solving your doubt
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Error state — retry affordance.
  if (answer.error) {
    return (
      <div className="flex gap-3">
        <span className="grid place-items-center size-9 rounded-full bg-destructive/15 text-destructive border border-destructive/25 shrink-0">
          <AlertCircle className="size-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium">Delta AI Tutor</span>
            <span className="text-[10px] rounded-full bg-destructive/15 border border-destructive/25 px-1.5 py-0.5 text-destructive">
              Failed
            </span>
          </div>
          <p className="text-[13px] mt-1.5 text-muted-foreground">
            Couldn't reach the tutor. Want to try again?
          </p>
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-border px-3 py-1.5 text-[11px] font-medium hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="size-3" /> Retry
          </button>
        </div>
      </div>
    )
  }

  // Normal answer.
  return (
    <div className="flex gap-3">
      {isAi ? (
        <span className="grid place-items-center size-9 rounded-full bg-primary/15 text-primary border border-primary/25 shrink-0">
          <Bot className="size-4" />
        </span>
      ) : (
        <Avatar name={answer.author} size={36} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium">{answer.author}</span>
          <span
            className={cn(
              'text-[10px] rounded-full border px-1.5 py-0.5',
              isAi
                ? 'bg-primary/15 border-primary/25 text-primary flex items-center gap-1'
                : 'bg-white/5 border-border text-muted-foreground'
            )}
          >
            {isAi && <Sparkles className="size-2.5" />}
            {answer.role}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="size-2.5" /> {timeAgo(answer.hoursAgo)}
          </span>
        </div>
        <p className="text-[13px] mt-1.5 leading-relaxed text-pretty whitespace-pre-wrap">
          {answer.text}
        </p>
      </div>
    </div>
  )
}
