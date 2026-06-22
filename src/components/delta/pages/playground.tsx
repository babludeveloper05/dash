'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  GripVertical, X, Plus, RotateCcw, Check, Trash2, Move,
  Search, LayoutGrid, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { useStore, type ComponentState } from '@/lib/store'
import { COMPONENT_REGISTRY } from './dashboard-components'
import { TEMPLATES, getDefaultProps, getTemplate, type TemplateId } from '@/lib/custom-templates'
import { renderCustomComponent } from '../custom-component-renderers'
import {
  GlassCard, GhostButton, PrimaryButton, EmptyState,
} from '../ui'
import { ScaledPage } from '@/components/delta/scaled-page'
import { cn } from '@/lib/utils'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'

const MIN_W = 180
const MIN_H = 96
const CANVAS_BASE_W = 1448
const NUDGE = 8

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const HANDLE_CLASS: Record<ResizeDir, string> = {
  n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize w-6 h-2',
  s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize w-6 h-2',
  e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize h-6 w-2',
  w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize h-6 w-2',
  ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize size-3',
  nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize size-3',
  se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize size-3',
  sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize size-3',
}

const PALETTE_ICON: LucideIcon = LayoutGrid

/** Returns true if the event target is an interactive element that should NOT start a drag. */
function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'A') {
    return true
  }
  if (target.isContentEditable) return true
  if (target.closest('[data-no-drag]')) return true
  return false
}

export function PlaygroundPage() {
  const components = useStore((s) => s.components)
  const gridMode = useStore((s) => s.gridMode)
  const setGridMode = useStore((s) => s.setGridMode)
  const updateComponent = useStore((s) => s.updateComponent)
  const bringToFront = useStore((s) => s.bringToFront)
  const removeComponent = useStore((s) => s.removeComponent)
  const addComponent = useStore((s) => s.addComponent)
  const addCustomComponent = useStore((s) => s.addCustomComponent)
  const customComponents = useStore((s) => s.customComponents)
  const customComponentData = useStore((s) => s.customComponentData)
  const setCustomComponentData = useStore((s) => s.setCustomComponentData)

  /** Add a custom component: creates both a canvas position (type='custom')
   *  and a config entry (templateId + props) in the store. */
  const addCustom = (templateId: TemplateId) => {
    const template = getTemplate(templateId)
    if (!template) return
    const id = `custom-${Date.now()}`
    addComponent('custom') // creates a canvas position with a generated id
    // The addComponent generates its own id; we need to find it and rename.
    // Instead, we'll add the canvas position manually by calling the store.
    useStore.setState((s) => {
      const last = s.components[s.components.length - 1]
      if (last && last.type === 'custom') {
        // Rename the last component's id to our custom id
        const newComponents = s.components.map((c, i) =>
          i === s.components.length - 1
            ? { ...c, id, w: template.defaultSize.w, h: template.defaultSize.h }
            : c
        )
        return { components: newComponents }
      }
      return {}
    })
    addCustomComponent(id, templateId, getDefaultProps(template))
  }
  const resetComponents = useStore((s) => s.resetComponents)
  const setTab = useStore((s) => s.setTab)

  const canvasRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const reduce = useReducedMotion() ?? false

  const canvasWidth = Math.max(
    CANVAS_BASE_W,
    ...components.map((w) => w.x + w.w + 48),
  )
  const canvasHeight = Math.max(
    600,
    ...components.map((w) => w.y + w.h + 48),
  )

  const startDrag = useCallback(
    (e: React.PointerEvent, w: ComponentState) => {
      e.preventDefault()
      e.stopPropagation()
      bringToFront(w.id)
      setSelectedId(w.id)
      setDragId(w.id)
      const startX = e.clientX
      const startY = e.clientY
      const ox = w.x
      const oy = w.y
      const cw = canvasRef.current?.clientWidth ?? CANVAS_BASE_W
      const ch = canvasRef.current?.scrollHeight ?? canvasHeight

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        const nx = Math.max(0, Math.min(cw - w.w, ox + dx))
        const ny = Math.max(0, Math.min(ch - w.h, oy + dy))
        updateComponent(w.id, { x: nx, y: ny })
      }
      const up = () => {
        setDragId(null)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [bringToFront, updateComponent, canvasHeight],
  )

  const startResize = useCallback(
    (e: React.PointerEvent, w: ComponentState, dir: ResizeDir) => {
      e.preventDefault()
      e.stopPropagation()
      bringToFront(w.id)
      setSelectedId(w.id)
      const startX = e.clientX
      const startY = e.clientY
      const { x, y, w: ow, h: oh } = w
      const cw = canvasRef.current?.clientWidth ?? CANVAS_BASE_W

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        let nx = x
        let ny = y
        let nw = ow
        let nh = oh

        if (dir.includes('e')) {
          nw = Math.max(MIN_W, Math.min(cw - x, ow + dx))
        }
        if (dir.includes('s')) {
          nh = Math.max(MIN_H, oh + dy)
        }
        if (dir.includes('w')) {
          nw = Math.max(MIN_W, ow - dx)
          nx = x + (ow - nw)
          if (nx < 0) {
            nw += nx
            nx = 0
          }
        }
        if (dir.includes('n')) {
          nh = Math.max(MIN_H, oh - dy)
          ny = y + (oh - nh)
          if (ny < 0) {
            nh += ny
            ny = 0
          }
        }
        updateComponent(w.id, { x: nx, y: ny, w: nw, h: nh })
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [bringToFront, updateComponent],
  )

  const nudge = useCallback(
    (id: string, dx: number, dy: number) => {
      const w = components.find((x) => x.id === id)
      if (!w) return
      const cw = canvasRef.current?.clientWidth ?? CANVAS_BASE_W
      const nx = Math.max(0, Math.min(cw - w.w, w.x + dx))
      const ny = Math.max(0, w.y + dy)
      updateComponent(id, { x: nx, y: ny })
    },
    [components, updateComponent],
  )

  // Keyboard: Esc closes picker / deselects; Delete removes selected component.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pickerOpen) {
        if (e.key === 'Escape') setPickerOpen(false)
        return
      }
      if (e.key === 'Escape' && selectedId) {
        setSelectedId(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const el = document.activeElement
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)) {
          return
        }
        removeComponent(selectedId)
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pickerOpen, selectedId, removeComponent])

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null)
    }
  }

  const filteredTypes = Object.entries(COMPONENT_REGISTRY).filter(
    ([type, def]) =>
      type.toLowerCase().includes(paletteQuery.toLowerCase()) ||
      def.title.toLowerCase().includes(paletteQuery.toLowerCase())
  )

  return (
    <ScaledPage>
      <motion.div
        className="flex flex-col"
        variants={staggerContainer(reduce)}
        initial="initial"
        animate="animate"
      >
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex items-center justify-end gap-2 px-5 pt-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGridMode(!gridMode)}
            aria-pressed={gridMode}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition-colors',
              gridMode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white/5 hover:bg-white/10'
            )}
          >
            {gridMode ? <LayoutGrid className="size-3.5" /> : <Move className="size-3.5" />}
            {gridMode ? 'Grid' : 'Free'}
          </button>
          <GhostButton onClick={resetComponents}>
            <RotateCcw className="size-3.5" /> Reset
          </GhostButton>
          <GhostButton onClick={() => setPickerOpen(true)}>
            <Plus className="size-3.5" /> Add component
          </GhostButton>
          <PrimaryButton onClick={() => setTab('home')}>
            <Check className="size-3.5" /> Done
          </PrimaryButton>
        </div>
      </motion.div>

      {components.length === 0 ? (
        <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex-1 grid place-items-center p-5">
          <EmptyState
            icon={<LayoutGrid className="size-6" />}
            title="No components yet"
            hint="Add your first component to start building your dashboard. Drag, resize, and arrange freely on the canvas."
            cta={
              <PrimaryButton onClick={() => setPickerOpen(true)}>
                <Plus className="size-3.5" /> Add your first component
              </PrimaryButton>
            }
          />
        </motion.div>
      ) : gridMode ? (
        <motion.div
          variants={staggerItem(reduce)}
          transition={itemTransition(reduce)}
          className="p-5 grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {components.map((w) => (
            <GlassCard
              key={w.id}
              className="group relative p-5"
              style={{ minHeight: w.type === 'greeting' ? 96 : 200 }}
            >
              <RemoveBtn onClick={() => removeComponent(w.id)} />
              <div className="h-full">
                {w.type === 'custom' && customComponents[w.id]
                  ? renderCustomComponent({
                      templateId: customComponents[w.id].templateId,
                      props: customComponents[w.id].props,
                      data: customComponentData[w.id],
                      setData: (d) => setCustomComponentData(w.id, d),
                    })
                  : COMPONENT_REGISTRY[w.type]?.render()}
              </div>
            </GlassCard>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex-1 overflow-auto scroll-thin ambient">
          <div
            ref={canvasRef}
            className="relative dot-grid mx-auto"
            style={{ width: canvasWidth, minHeight: canvasHeight }}
            onPointerDown={onCanvasPointerDown}
          >
            {/* Desktop hint */}
            <p className="absolute top-3 right-4 z-10 text-[10px] text-muted-foreground/60 hidden @lg:block pointer-events-none">
              Drag any component · resize from edges · Esc to deselect
            </p>

            {components.map((w) => {
              const isSelected = selectedId === w.id
              const def = COMPONENT_REGISTRY[w.type]
              return (
                <GlassCard
                  key={w.id}
                  className={cn(
                    'group absolute p-4 select-none transition-shadow',
                    isSelected ? 'ring-2 ring-primary/60 elev-3' : 'hover:elev-2',
                    dragId === w.id ? 'cursor-grabbing' : 'cursor-grab'
                  )}
                  style={{
                    left: w.x,
                    top: w.y,
                    width: w.w,
                    height: w.h,
                    zIndex: w.z,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    bringToFront(w.id)
                    setSelectedId(w.id)
                    if (!isInteractive(e.target)) {
                      startDrag(e, w)
                    }
                  }}
                >
                  {/* Top-left drag affordance */}
                  <span
                    aria-hidden
                    className="absolute top-1.5 left-1.5 z-10 grid place-items-center size-6 rounded-md bg-white/[0.04] border border-border text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  >
                    <GripVertical className="size-3.5" />
                  </span>

                  {/* Floating toolbar (when selected) */}
                  {isSelected && (
                    <div
                      data-no-drag
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        'absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 rounded-full glass-strong border border-border px-1.5 py-1 elev-2',
                        w.y >= 48 ? '-top-10' : 'top-full mt-2'
                      )}
                    >
                      <ToolbarBtn
                        label="Delete component"
                        onClick={() => { removeComponent(w.id); setSelectedId(null) }}
                        danger
                      >
                        <Trash2 className="size-3.5" />
                      </ToolbarBtn>
                      <span className="w-px h-4 bg-border mx-0.5" aria-hidden />
                      <ToolbarBtn
                        label="Bring to front"
                        onClick={() => bringToFront(w.id)}
                      >
                        <Move className="size-3.5" />
                      </ToolbarBtn>
                      <span className="w-px h-4 bg-border mx-0.5" aria-hidden />
                      <ToolbarBtn label="Nudge left" onClick={() => nudge(w.id, -NUDGE, 0)}>
                        <ChevronLeft className="size-3.5" />
                      </ToolbarBtn>
                      <ToolbarBtn label="Nudge up" onClick={() => nudge(w.id, 0, -NUDGE)}>
                        <ChevronUp className="size-3.5" />
                      </ToolbarBtn>
                      <ToolbarBtn label="Nudge down" onClick={() => nudge(w.id, 0, NUDGE)}>
                        <ChevronDown className="size-3.5" />
                      </ToolbarBtn>
                      <ToolbarBtn label="Nudge right" onClick={() => nudge(w.id, NUDGE, 0)}>
                        <ChevronRight className="size-3.5" />
                      </ToolbarBtn>
                    </div>
                  )}

                  {/* Component body */}
                  <div className="h-full pt-1.5 overflow-hidden">
                    {def?.render()}
                  </div>

                  {/* Resize handles */}
                  {(Object.keys(HANDLE_CLASS) as ResizeDir[]).map((d) => (
                    <span
                      key={d}
                      onPointerDown={(e) => startResize(e, w, d)}
                      aria-label={`Resize from ${d}`}
                      className={cn(
                        'absolute z-20 opacity-0 group-hover:opacity-100 transition-opacity',
                        HANDLE_CLASS[d],
                        d.length === 2 && 'bg-primary border border-background rounded-sm'
                      )}
                    />
                  ))}
                </GlassCard>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Component picker modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setPickerOpen(false)}
        >
          <GlassCard
            strong
            className="w-[min(560px,92vw)] p-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Add a component</p>
                <p className="text-[11px] text-muted-foreground">
                  Pick a component to drop onto your canvas
                </p>
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
                className="grid place-items-center size-7 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Search components…"
                className="w-full rounded-lg bg-white/5 border border-border pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/40 transition-colors"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 overflow-y-auto scroll-thin pr-1">
              {filteredTypes.length === 0 ? (
                <p className="col-span-2 text-center text-xs text-muted-foreground py-8">
                  No components match your search.
                </p>
              ) : (
                filteredTypes.map(([type, def]) => (
                  <button
                    key={type}
                    onClick={() => {
                      addComponent(type)
                      setPickerOpen(false)
                      setPaletteQuery('')
                    }}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-white/[0.02] p-3 text-left hover:bg-white/[0.06] hover:border-primary/40 transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="grid place-items-center size-9 rounded-lg bg-primary/10 text-primary border border-primary/15 shrink-0">
                      <PALETTE_ICON className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium truncate">
                        {def.title}
                      </span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        Click to add
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Custom templates section */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Custom components</p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      addCustom(tmpl.id)
                      setPickerOpen(false)
                      setPaletteQuery('')
                    }}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-white/[0.02] p-3 text-left hover:bg-white/[0.06] hover:border-primary/40 transition-colors"
                  >
                    <span className="grid place-items-center size-9 rounded-lg bg-primary/10 text-primary border border-primary/15 shrink-0">
                      <Plus className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium truncate">{tmpl.name}</span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{tmpl.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
      </motion.div>
    </ScaledPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-1.5 right-1.5 z-10 grid place-items-center size-6 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-opacity"
      aria-label="Remove component"
    >
      <X className="size-3.5" />
    </button>
  )
}

function ToolbarBtn({
  children, label, onClick, danger,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid place-items-center size-7 rounded-full text-muted-foreground transition-colors',
        danger
          ? 'hover:bg-destructive/15 hover:text-destructive'
          : 'hover:bg-white/10 hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
