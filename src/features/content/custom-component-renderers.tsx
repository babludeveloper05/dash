'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ListTodo, Hash, Calculator, Timer as TimerIcon, StickyNote, Link as LinkIcon,
  TrendingUp, BarChart3, Flame, Trophy, Target, Zap, Star, Heart, Plus, X,
  Check, Play, Pause, RotateCcw, ChevronUp, ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Inline header — matches the dashboard Header style but doesn't depend on
 *  the dashboard-components module (which doesn't export Header). */
function Header({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/90">
        <span className="text-primary">{icon}</span>
        <span className="truncate">{title}</span>
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Registry — maps template IDs to render functions                   */
/* ------------------------------------------------------------------ */

export interface CustomComponentRendererProps {
  templateId: string
  props: Record<string, unknown>
  data: unknown
  setData: (data: unknown) => void
}

const ICONS: Record<string, LucideIcon> = {
  Flame, Trophy, Target, Zap, Star, Heart,
}

export function renderCustomComponent({ templateId, props, data, setData }: CustomComponentRendererProps) {
  switch (templateId) {
    case 'list': return <ListRenderer props={props} data={data} setData={setData} />
    case 'stat': return <StatRenderer props={props} />
    case 'counter': return <CounterRenderer props={props} data={data} setData={setData} />
    case 'timer': return <TimerRenderer props={props} />
    case 'note': return <NoteRenderer props={props} data={data} setData={setData} />
    case 'links': return <LinksRenderer props={props} data={data} setData={setData} />
    case 'progress': return <ProgressRenderer props={props} />
    case 'chart': return <ChartRenderer props={props} data={data} setData={setData} />
    default: return <div className="text-xs text-muted-foreground p-4">Unknown template: {templateId}</div>
  }
}

/* ------------------------------------------------------------------ */
/*  List — TODO list / checklist                                       */
/* ------------------------------------------------------------------ */

interface ListItem { id: string; text: string; done: boolean }

function ListRenderer({ props, data, setData }: { props: Record<string, unknown>; data: unknown; setData: (d: unknown) => void }) {
  const title = (props.title as string) || 'TODO'
  const checkable = props.checkable !== false
  const allowAdd = props.allowable !== false
  const allowRemove = props.allowRemove !== false
  const items = (data as ListItem[]) || []

  function update(newItems: ListItem[]) { setData(newItems) }
  function add(text: string) {
    if (!text.trim()) return
    update([...items, { id: `item-${Date.now()}`, text: text.trim(), done: false }])
  }
  function toggle(id: string) {
    update(items.map((i) => i.id === id ? { ...i, done: !i.done } : i))
  }
  function remove(id: string) {
    update(items.filter((i) => i.id !== id))
  }

  return (
    <div className="flex flex-col h-full">
      <Header icon={<ListTodo className="size-3.5" />} title={title} />
      <div className="flex-1 overflow-y-auto scroll-thin -mx-1 px-1 space-y-0.5 mt-1">
        {items.length === 0 && (
          <p className="text-[11px] text-muted-foreground/60 py-2 text-center">No items yet</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.04] transition-colors group">
            {checkable && (
              <button
                onClick={() => toggle(item.id)}
                className={cn(
                  'size-4 rounded border shrink-0 transition-all',
                  item.done ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary/40'
                )}
              >
                {item.done && <Check className="size-3" />}
              </button>
            )}
            <span className={cn('flex-1 text-xs text-pretty', item.done && 'line-through text-muted-foreground')}>
              {item.text}
            </span>
            {allowRemove && (
              <button
                onClick={() => remove(item.id)}
                aria-label="Remove item"
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      {allowAdd && <AddItemRow onAdd={add} />}
    </div>
  )
}

function AddItemRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <div className="flex items-center gap-1.5 mt-2 -mx-1">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(text); setText('') } }}
        placeholder="Add item…"
        className="flex-1 rounded-lg bg-white/5 border border-border px-2.5 py-1.5 text-xs outline-none focus:border-primary/40 placeholder:text-muted-foreground/60"
      />
      <button
        onClick={() => { onAdd(text); setText('') }}
        disabled={!text.trim()}
        aria-label="Add item"
        className="grid place-items-center size-7 rounded-lg bg-primary/15 border border-primary/25 text-primary hover:bg-primary/25 transition-colors disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat — number + label                                              */
/* ------------------------------------------------------------------ */

function StatRenderer({ props }: { props: Record<string, unknown> }) {
  const label = (props.label as string) || 'Stat'
  const value = (props.value as string) || '0'
  const sub = (props.sub as string) || ''
  const iconName = (props.icon as string) || 'Flame'
  const Icon = ICONS[iconName] ?? Flame

  return (
    <div className="flex flex-col h-full">
      <Header icon={<Icon className="size-3.5" />} title={label} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl font-light tabular text-gradient-warm">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Counter — increment/decrement                                      */
/* ------------------------------------------------------------------ */

function CounterRenderer({ props, data, setData }: { props: Record<string, unknown>; data: unknown; setData: (d: unknown) => void }) {
  const label = (props.label as string) || 'Counter'
  const step = (props.step as number) || 1
  const start = (props.start as number) || 0
  const value = typeof data === 'number' ? data : start

  return (
    <div className="flex flex-col h-full">
      <Header icon={<Calculator className="size-3.5" />} title={label} />
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-4xl font-light tabular">{value}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setData(value - step)}
            aria-label="Decrement"
            className="grid place-items-center size-9 rounded-lg bg-white/5 border border-border hover:bg-white/10 transition-colors"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            onClick={() => setData(start)}
            aria-label="Reset"
            className="grid place-items-center size-9 rounded-lg bg-white/5 border border-border hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            onClick={() => setData(value + step)}
            aria-label="Increment"
            className="grid place-items-center size-9 rounded-lg bg-primary/15 border border-primary/25 text-primary hover:bg-primary/25 transition-colors"
          >
            <ChevronUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Timer — countdown                                                  */
/* ------------------------------------------------------------------ */

function TimerRenderer({ props }: { props: Record<string, unknown> }) {
  const label = (props.label as string) || 'Focus'
  const minutes = (props.minutes as number) || 25
  const [remaining, setRemaining] = useState(minutes * 60)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false)
            return 0
          }
          return r - 1
        })
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60

  return (
    <div className="flex flex-col h-full">
      <Header icon={<TimerIcon className="size-3.5" />} title={label} />
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-4xl font-light tabular">
          {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRunning(!running)}
            aria-label={running ? 'Pause' : 'Start'}
            className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all"
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          </button>
          <button
            onClick={() => { setRunning(false); setRemaining(minutes * 60) }}
            aria-label="Reset"
            className="grid place-items-center size-9 rounded-lg bg-white/5 border border-border hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Note — sticky note / scratch pad                                   */
/* ------------------------------------------------------------------ */

function NoteRenderer({ props, data, setData }: { props: Record<string, unknown>; data: unknown; setData: (d: unknown) => void }) {
  const title = (props.title as string) || 'Note'
  const placeholder = (props.placeholder as string) || 'Write something…'
  const text = (data as string) || ''

  return (
    <div className="flex flex-col h-full">
      <Header icon={<StickyNote className="size-3.5" />} title={title} />
      <textarea
        value={text}
        onChange={(e) => setData(e.target.value)}
        placeholder={placeholder}
        className="flex-1 w-full resize-none bg-transparent outline-none text-xs leading-relaxed placeholder:text-muted-foreground/60 scroll-thin mt-1"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Links — bookmark list                                              */
/* ------------------------------------------------------------------ */

interface LinkItem { id: string; label: string; url: string }

function LinksRenderer({ props, data, setData }: { props: Record<string, unknown>; data: unknown; setData: (d: unknown) => void }) {
  const title = (props.title as string) || 'Bookmarks'
  const links = (data as LinkItem[]) || []
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newUrl, setNewUrl] = useState('')

  function add() {
    if (!newLabel.trim() || !newUrl.trim()) return
    setData([...links, { id: `link-${Date.now()}`, label: newLabel.trim(), url: newUrl.trim() }])
    setNewLabel(''); setNewUrl(''); setAdding(false)
  }
  function remove(id: string) { setData(links.filter((l) => l.id !== id)) }

  return (
    <div className="flex flex-col h-full">
      <Header icon={<LinkIcon className="size-3.5" />} title={title} />
      <div className="flex-1 overflow-y-auto scroll-thin -mx-1 px-1 space-y-0.5 mt-1">
        {links.length === 0 && <p className="text-[11px] text-muted-foreground/60 py-2 text-center">No links yet</p>}
        {links.map((link) => (
          <div key={link.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.04] transition-colors group">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-xs text-primary hover:underline truncate"
            >
              {link.label}
            </a>
            <button
              onClick={() => remove(link.id)}
              aria-label="Remove link"
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="flex flex-col gap-1.5 mt-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label"
            className="rounded-lg bg-white/5 border border-border px-2.5 py-1.5 text-xs outline-none focus:border-primary/40"
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://…"
            className="rounded-lg bg-white/5 border border-border px-2.5 py-1.5 text-xs outline-none focus:border-primary/40"
          />
          <div className="flex gap-1.5">
            <button onClick={add} className="flex-1 rounded-lg bg-primary/15 border border-primary/25 text-primary px-2 py-1.5 text-xs font-medium hover:bg-primary/25">Add</button>
            <button onClick={() => setAdding(false)} className="rounded-lg bg-white/5 border border-border px-2 py-1.5 text-xs hover:bg-white/10">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="size-3" /> Add link
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Progress — progress bar toward a goal                              */
/* ------------------------------------------------------------------ */

function ProgressRenderer({ props }: { props: Record<string, unknown> }) {
  const label = (props.label as string) || 'Progress'
  const current = (props.current as number) || 0
  const target = (props.target as number) || 1
  const unit = (props.unit as string) || ''
  const pct = Math.min(100, Math.round((current / target) * 100))

  return (
    <div className="flex flex-col h-full">
      <Header icon={<TrendingUp className="size-3.5" />} title={label} />
      <div className="flex-1 flex flex-col justify-center gap-2">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-light tabular">{current}<span className="text-sm text-muted-foreground">/{target}</span></span>
          <span className="text-xs text-muted-foreground tabular">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%`, boxShadow: '0 0 12px oklch(0.74 0.135 62 / 0.4)' }}
          />
        </div>
        {unit && <p className="text-[11px] text-muted-foreground">{unit}</p>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Chart — simple bar chart (habit tracking)                          */
/* ------------------------------------------------------------------ */

function ChartRenderer({ props, data, setData }: { props: Record<string, unknown>; data: unknown; setData: (d: unknown) => void }) {
  const label = (props.label as string) || 'This week'
  const days = (props.days as number) || 7
  const values = (data as number[]) || Array.from({ length: days }, () => 0)
  const max = Math.max(1, ...values)
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  function toggle(idx: number) {
    const newValues = [...values]
    newValues[idx] = newValues[idx] > 0 ? 0 : Math.ceil(max * 0.8)
    setData(newValues)
  }

  return (
    <div className="flex flex-col h-full">
      <Header icon={<BarChart3 className="size-3.5" />} title={label} />
      <div className="flex-1 flex items-end justify-around gap-1.5 mt-2 pb-1">
        {values.slice(0, days).map((v, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className="flex flex-col items-center gap-1 flex-1 group"
            aria-label={`Toggle day ${i + 1}`}
          >
            <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
              <div
                className={cn(
                  'w-full max-w-[24px] rounded-t-md transition-all',
                  v > 0 ? 'bg-primary' : 'bg-white/8 group-hover:bg-white/15'
                )}
                style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{dayLabels[i % 7]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
