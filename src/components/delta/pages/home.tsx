'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { COMPONENT_REGISTRY } from './dashboard-components'
import { GlassCard, PrimaryButton, EmptyState } from '../ui'
import { Sparkles, LayoutGrid, Pencil } from 'lucide-react'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'
import { useCanvasFit } from '@/hooks/use-canvas-fit'
import { renderCustomComponent } from '../custom-component-renderers'

const CANVAS_WIDTH = 1448

export function HomePage() {
  const components = useStore((s) => s.components)
  const setTab = useStore((s) => s.setTab)
  const customComponents = useStore((s) => s.customComponents)
  const customComponentData = useStore((s) => s.customComponentData)
  const setCustomComponentData = useStore((s) => s.setCustomComponentData)
  const reduce = useReducedMotion() ?? false
  const canvasHeight = components.reduce((m, w) => Math.max(m, w.y + w.h), 0) + 56
  const { ref, scale } = useCanvasFit(CANVAS_WIDTH, canvasHeight, 32)

  return (
    <motion.div
      className="relative w-full h-[calc(100vh-64px)] flex flex-col"
      variants={staggerContainer(reduce)}
      initial="initial"
      animate="animate"
    >
      <style>{`
        @keyframes deltaWidgetIn {
          from { opacity: 0; transform: translateY(8px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .delta-component-enter { animation: deltaWidgetIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex-1 min-h-0">
        {components.length === 0 ? (
          <EmptyDashboard onOpen={() => setTab('playground')} />
        ) : (
          /*
           * Free-form absolute canvas — scaled to fit the viewport.
           *
           * The 1448px-wide canvas is transformed uniformly (scale) so it fits
           * both the available width AND height without overflowing. The
           * wrapper's height is set to the scaled canvas height so layout
           * reflects the true visual size (no dead space below). transform-origin
           * is top-center so the canvas stays centered as it scales down.
           */
          <div ref={ref} className="w-full h-full flex justify-center overflow-hidden">
            <div
              className="relative"
              style={{
                width: CANVAS_WIDTH,
                height: canvasHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                flexShrink: 0,
              }}
            >
              {components.map((w, i) => (
                <GlassCard
                  key={w.id}
                  className="absolute p-4 group delta-component-enter"
                  style={{
                    left: w.x,
                    top: w.y,
                    width: w.w,
                    height: w.h,
                    zIndex: w.z,
                    animationDelay: `${Math.min(i * 30, 300)}ms`,
                  }}
                >
                  <div className="h-full overflow-hidden">
                    {w.type === 'custom' && customComponents[w.id]
                      ? renderCustomComponent({
                          templateId: customComponents[w.id].templateId,
                          props: customComponents[w.id].props,
                          data: customComponentData[w.id],
                          setData: (d) => setCustomComponentData(w.id, d),
                        })
                      : COMPONENT_REGISTRY[w.type]?.render()}
                  </div>
                  <button
                    onClick={() => setTab('playground')}
                    aria-label="Edit layout in playground"
                    className="absolute right-2 top-2 z-10 size-6 grid place-items-center rounded-full bg-background/60 border border-border text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  >
                    <Pencil className="size-3" />
                  </button>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyDashboard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex-1 grid place-items-center p-5">
      <div className="max-w-md w-full">
        <EmptyState
          icon={<LayoutGrid className="size-6" />}
          title="Your dashboard is empty"
          hint="Head to the Playground to add components and arrange your personalized command center."
          cta={
            <PrimaryButton onClick={onOpen} className="mt-1">
              <Sparkles className="size-4" /> Open Playground
            </PrimaryButton>
          }
        />
      </div>
    </div>
  )
}
