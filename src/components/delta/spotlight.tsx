'use client'

import { useStore, type TabId } from '@/lib/store'
import { useContent } from '@/hooks/use-content'
import { useEffect, useMemo, useState } from 'react'
import { Search, Hash, Play, FileText, BarChart3, CornerDownLeft, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

type Result = { id: string; label: string; sub: string; tab: TabId; icon: React.ReactNode; group: string }

export function Spotlight() {
  const { spotlightOpen, setSpotlight, setTab, openTheater, notes } = useStore()
  const content = useContent()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)

  useEffect(() => {
    if (spotlightOpen) {
      setQ('')
      setSel(0)
    }
  }, [spotlightOpen])

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase()
    const pages: Result[] = (
      ['home', 'library', 'tests', 'notes', 'live', 'analytics', 'leaderboard', 'achievements', 'profile', 'settings', 'syllabus', 'doubts'] as TabId[]
    ).map((t) => ({
      id: `page-${t}`,
      label: t[0].toUpperCase() + t.slice(1),
      sub: 'Page',
      tab: t,
      icon: <Hash className="size-4" />,
      group: 'Navigate',
    }))

    if (!query) return pages.slice(0, 6)

    const vidR: Result[] = (content.videos || [])
      .filter((v) => v.title.toLowerCase().includes(query))
      .slice(0, 5)
      .map((v) => ({
        id: v.id,
        label: v.title,
        sub: `Video · ${content.subjects.find((s) => s.id === v.subjectId)?.name}`,
        tab: 'library',
        icon: <Play className="size-4" />,
        group: 'Videos',
      }))
    const testR: Result[] = content.tests
      .filter((t) => t.name.toLowerCase().includes(query))
      .slice(0, 4)
      .map((t) => ({
        id: t.id,
        label: t.name,
        sub: `Test · ${t.type}`,
        tab: 'tests',
        icon: <BarChart3 className="size-4" />,
        group: 'Tests',
      }))
    const noteR: Result[] = notes
      .filter((n) => n.title.toLowerCase().includes(query))
      .slice(0, 3)
      .map((n) => ({
        id: n.id,
        label: n.title,
        sub: `Note · ${n.subject}`,
        tab: 'notes',
        icon: <FileText className="size-4" />,
        group: 'Notes',
      }))
    const pageR = pages.filter((p) => p.label.toLowerCase().includes(query))

    return [...pageR, ...vidR, ...testR, ...noteR].slice(0, 12)
  }, [q, notes])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSpotlight(!spotlightOpen)
      }
      if (!spotlightOpen) return
      if (e.key === 'Escape') setSpotlight(false)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSel((s) => Math.min(results.length - 1, s + 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSel((s) => Math.max(0, s - 1))
      }
      if (e.key === 'Enter') {
        const r = results[sel]
        if (r) choose(r)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [spotlightOpen, results, sel])

  function choose(r: Result) {
    setTab(r.tab)
    if (r.tab === 'library' && r.id.includes('-v')) openTheater(r.id)
    setSpotlight(false)
  }

  if (!spotlightOpen) return null

  // group consecutive results by group label
  const grouped: { group: string; items: Result[] }[] = []
  results.forEach((r) => {
    const last = grouped[grouped.length - 1]
    if (last && last.group === r.group) last.items.push(r)
    else grouped.push({ group: r.group, items: [r] })
  })
  let runningIndex = 0

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-md animate-[fadeIn_0.15s_ease]"
      onClick={() => setSpotlight(false)}
    >
      <div
        className="w-[min(640px,92vw)] glass-strong rounded-2xl elev-3 overflow-hidden animate-[popIn_0.18s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setSel(0)
            }}
            placeholder="Search videos, tests, notes, pages…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
          />
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">ESC</kbd>
        </div>
        <div className="max-h-[56vh] overflow-y-auto scroll-thin p-2">
          {results.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="grid place-items-center size-10 rounded-xl bg-white/5 text-muted-foreground">
                <Compass className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">No results for “{q}”</p>
            </div>
          )}
          {grouped.map((g) => (
            <div key={g.group} className="mb-1">
              <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                {g.group}
              </p>
              {g.items.map((r) => {
                const i = runningIndex++
                return (
                  <button
                    key={r.id}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => choose(r)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      sel === i ? 'bg-white/10' : 'hover:bg-white/5'
                    )}
                  >
                    <span className="grid place-items-center size-8 rounded-lg bg-white/5 text-muted-foreground shrink-0">
                      {r.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm truncate">{r.label}</span>
                      <span className="block text-xs text-muted-foreground truncate">{r.sub}</span>
                    </span>
                    {sel === i && <CornerDownLeft className="size-3.5 text-muted-foreground shrink-0" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 h-10 border-t border-border text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="rounded bg-white/10 px-1 py-0.5">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded bg-white/10 px-1 py-0.5">↵</kbd> open</span>
          </div>
          <span>Project Delta</span>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes popIn{from{opacity:0;transform:translateY(-8px) scale(0.98)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}
