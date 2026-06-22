'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Plus, Tag, Trash2, Save, StickyNote, X, FileText,
  Pencil, Clock, Sparkles,
} from 'lucide-react'
import {
  GlassCard, Pill, PrimaryButton, GhostButton, Badge,
} from '@/components/delta/ui'
import { ScaledPage } from '@/components/delta/scaled-page'
import { FilterBar, EmptyStateWrapper } from '@/components/delta/global'
import { useStore } from '@/lib/store'
import { type NoteItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'

const SUBJECT_FILTERS = ['All', 'Physics', 'Chemistry', 'Maths', 'Biology'] as const
const SUBJECT_OPTIONS = ['Physics', 'Chemistry', 'Maths', 'Biology', 'English'] as const

type Draft = { title: string; subject: string; content: string; tags: string }

export function NotesPage() {
  const notes = useStore((s) => s.notes)
  const addNote = useStore((s) => s.addNote)
  const updateNote = useStore((s) => s.updateNote)
  const deleteNote = useStore((s) => s.deleteNote)
  const quickScratch = useStore((s) => s.quickScratch)
  const setQuickScratch = useStore((s) => s.setQuickScratch)
  const reduce = useReducedMotion() ?? false

  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string>('All')
  const [tagFilter, setTagFilter] = useState<string>('All')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({
    title: '',
    subject: 'Physics',
    content: '',
    tags: '',
  })

  // All tags across notes (for tag filter)
  const allTags = useMemo(() => {
    const s = new Set<string>()
    notes.forEach((n) => n.tags.forEach((t) => s.add(t)))
    return ['All', ...Array.from(s).sort()]
  }, [notes])

  const filtered = useMemo(() => {
    let list = notes
    if (subjectFilter !== 'All') list = list.filter((n) => n.subject === subjectFilter)
    if (tagFilter !== 'All') list = list.filter((n) => n.tags.includes(tagFilter))
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.includes(q))
      )
    }
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [notes, subjectFilter, tagFilter, query])

  function openNew() {
    addNote({ title: 'Untitled note', subject: 'Physics', content: '', tags: [] })
    const newest = useStore.getState().notes[0]
    if (newest) openEditor(newest)
  }

  function openEditor(note: NoteItem) {
    setEditingId(note.id)
    setDraft({
      title: note.title,
      subject: note.subject,
      content: note.content,
      tags: note.tags.join(', '),
    })
  }

  function patchDraft(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  function saveDraft() {
    if (!editingId) return
    updateNote(editingId, {
      title: draft.title.trim() || 'Untitled note',
      subject: draft.subject,
      content: draft.content,
      tags: draft.tags
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    })
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function removeNote(id: string) {
    deleteNote(id)
  }

  function relTime(ts: number) {
    const d = Math.floor((Date.now() - ts) / 86400000)
    if (d === 0) return 'Today'
    if (d === 1) return 'Yesterday'
    return `${d}d ago`
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
        <PrimaryButton onClick={openNew}>
          <Plus className="size-3.5" /> New note
        </PrimaryButton>
      </motion.div>

      {/* Quick scratch pad — synced with store */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)}>
        <GlassCard className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Quick Scratch
          </span>
          <span className="text-[10px] text-muted-foreground">
            {quickScratch.length} chars · autosaved
          </span>
        </div>
        <textarea
          value={quickScratch}
          onChange={(e) => setQuickScratch(e.target.value)}
          placeholder="Jot a quick thought, formula, or doubt — synced across sessions…"
          className="w-full resize-none bg-white/[0.03] border border-border rounded-lg px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary/30 placeholder:text-muted-foreground scroll-thin"
          rows={2}
          aria-label="Quick scratch pad"
        />
      </GlassCard>
      </motion.div>

      {/* Filters */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex flex-col gap-2">
        <FilterBar
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search notes by title, content, or tag…"
          searchLabel="Search notes"
          pills={SUBJECT_FILTERS.map((s) => ({ key: s, label: s }))}
          activePill={subjectFilter}
          onPillChange={setSubjectFilter}
          pillLabel="Subject"
        />
        {allTags.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Tag</span>
            {allTags.map((t) => (
              <Pill key={t} active={tagFilter === t} onClick={() => setTagFilter(t)}>
                {t === 'All' ? 'All' : `#${t}`}
              </Pill>
            ))}
          </div>
        )}
      </motion.div>

      {/* Notes grid */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex-1 overflow-y-auto scroll-thin pr-1 min-h-0">
        <EmptyStateWrapper
          isEmpty={filtered.length === 0}
          emptyIcon={<StickyNote className="size-6" />}
          emptyTitle={notes.length === 0 ? 'No notes yet' : 'No notes match'}
          emptyHint={
            notes.length === 0
              ? 'Create your first note to start building your cheatsheet.'
              : 'Try a different filter or search term.'
          }
          emptyCta={
            notes.length === 0 ? (
              <PrimaryButton onClick={openNew}>
                <Plus className="size-3.5" /> Create note
              </PrimaryButton>
            ) : undefined
          }
        >
          <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-3 pb-1">
            {filtered.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                relTime={relTime(n.updatedAt)}
                onEdit={() => openEditor(n)}
                onDelete={() => removeNote(n.id)}
              />
            ))}
          </div>
        </EmptyStateWrapper>
      </motion.div>

      {/* Editor modal */}
      {editingId && (
        <EditorModal draft={draft} onChange={patchDraft} onSave={saveDraft} onCancel={cancelEdit} />
      )}
      </motion.div>
    </ScaledPage>
  )
}

/* ---------------- NOTE CARD ---------------- */
function NoteCard({
  note,
  relTime,
  onEdit,
  onDelete,
}: {
  note: NoteItem
  relTime: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <GlassCard className="p-4 flex flex-col gap-2.5 group relative transition-all duration-300 hover:elev-2 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <Badge tone="primary">{note.subject}</Badge>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="grid place-items-center size-7 rounded-full bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            aria-label="Edit note"
          >
            <Pencil className="size-3" />
          </button>
          <button
            onClick={onDelete}
            className="grid place-items-center size-7 rounded-full bg-white/5 border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Delete note"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
      <button onClick={onEdit} className="text-left flex-1 flex flex-col gap-1">
        <p className="text-sm font-medium leading-snug line-clamp-1">{note.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 min-h-[3rem]">
          {note.content || 'No content yet — click to start writing.'}
        </p>
      </button>
      <div className="flex items-center gap-1.5 flex-wrap min-h-[1.25rem]">
        {note.tags.length === 0 ? (
          <span className="text-[10px] text-muted-foreground/50">no tags</span>
        ) : (
          note.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[10px] rounded-full bg-white/5 text-muted-foreground px-2 py-0.5"
            >
              #{t}
            </span>
          ))
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/50">
        <span className="flex items-center gap-1">
          <Clock className="size-2.5" /> {relTime}
        </span>
        <span className="tabular">{note.content.length} chars</span>
      </div>
    </GlassCard>
  )
}

/* ---------------- EDITOR MODAL ---------------- */
function EditorModal({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft
  onChange: (p: Partial<Draft>) => void
  onSave: () => void
  onCancel: () => void
}) {
  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancel])

  const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0

  // Cmd/Ctrl+Enter to save
  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onSave()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] glass-strong rounded-2xl elev-3 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit note"
        onKeyDown={onKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid place-items-center size-8 rounded-lg bg-primary/12 text-primary border border-primary/15 shrink-0">
              <Pencil className="size-4" />
            </span>
            <span className="text-sm font-medium truncate">Edit note</span>
          </div>
          <button
            onClick={onCancel}
            className="grid place-items-center size-8 rounded-full bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            aria-label="Close editor"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scroll-thin p-5 flex flex-col gap-4">
          <input
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Note title"
            className="w-full bg-transparent text-lg font-medium outline-none border-b border-border pb-2 focus:border-primary/40 placeholder:text-muted-foreground transition-colors"
            autoFocus
            aria-label="Note title"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Subject</span>
              <select
                value={draft.subject}
                onChange={(e) => onChange({ subject: e.target.value })}
                className="rounded-lg bg-white/5 border border-border px-2.5 py-1.5 text-xs outline-none focus:border-primary/30 transition-colors"
                aria-label="Note subject"
              >
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-card">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
              <Tag className="size-3.5 text-muted-foreground shrink-0" />
              <input
                value={draft.tags}
                onChange={(e) => onChange({ tags: e.target.value })}
                placeholder="comma, separated, tags"
                className="flex-1 bg-white/5 border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary/30 placeholder:text-muted-foreground transition-colors"
                aria-label="Note tags"
              />
            </div>
          </div>
          <textarea
            value={draft.content}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder="Start writing your note… formulas, derivations, doubts, anything."
            className="w-full min-h-[260px] resize-y bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary/30 placeholder:text-muted-foreground scroll-thin transition-colors"
            aria-label="Note content"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border bg-white/[0.02]">
          <span className="text-[11px] text-muted-foreground tabular">
            {draft.content.length} chars · {wordCount} words · ⌘↵ to save
          </span>
          <div className="flex items-center gap-2">
            <GhostButton onClick={onCancel}>Cancel</GhostButton>
            <PrimaryButton onClick={onSave}>
              <Save className="size-3.5" /> Save note
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  )
}
