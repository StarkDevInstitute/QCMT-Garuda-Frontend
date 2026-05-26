import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SplitPaneProps {
  /** Horizontal panels */
  left?: ReactNode
  right?: ReactNode
  /** Vertical panels */
  top?: ReactNode
  bottom?: ReactNode
  /** Override direction (auto-detected from top/bottom vs left/right) */
  direction?: 'horizontal' | 'vertical'
  /** Initial size of the first panel as % of total (default 50) */
  defaultSplit?: number
  /** Min px for first panel */
  minFirst?: number
  /** Min px for second panel */
  minSecond?: number
  /** Backward-compat aliases */
  minLeft?: number
  minRight?: number
  /** localStorage key — if provided, split position is persisted across reloads */
  storageKey?: string
  className?: string
}

function readStorage(key: string | undefined, fallback: number): number {
  if (!key) return fallback
  try {
    const v = localStorage.getItem(`splitpane:${key}`)
    if (v !== null) {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0 && n < 100) return n
    }
  } catch { /* ignore */ }
  return fallback
}

export function SplitPane({
  left, right, top, bottom,
  direction,
  defaultSplit = 50,
  minFirst, minSecond, minLeft, minRight,
  storageKey,
  className,
}: SplitPaneProps) {
  const isVertical =
    direction === 'vertical' || (direction !== 'horizontal' && (top !== undefined || bottom !== undefined))

  const first  = isVertical ? top    : left
  const second = isVertical ? bottom : right
  const minA = minFirst  ?? (isVertical ? 80 : (minLeft  ?? 200))
  const minB = minSecond ?? (isVertical ? 80 : (minRight ?? 200))

  const containerRef = useRef<HTMLDivElement>(null)
  const [split, setSplit] = useState(() => readStorage(storageKey, defaultSplit))
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
  }, [isVertical])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      if (isVertical) {
        const total = rect.height
        const pos = e.clientY - rect.top
        const clamped = Math.max(minA, Math.min(pos, total - minB))
        const pct = (clamped / total) * 100
        setSplit(pct)
        if (storageKey) {
          try { localStorage.setItem(`splitpane:${storageKey}`, String(pct)) } catch { /* ignore */ }
        }
      } else {
        const total = rect.width
        const pos = e.clientX - rect.left
        const clamped = Math.max(minA, Math.min(pos, total - minB))
        const pct = (clamped / total) * 100
        setSplit(pct)
        if (storageKey) {
          try { localStorage.setItem(`splitpane:${storageKey}`, String(pct)) } catch { /* ignore */ }
        }
      }
    }
    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isVertical, minA, minB])

  return (
    <div
      ref={containerRef}
      className={cn(
        isVertical ? 'flex flex-col' : 'flex flex-row',
        'overflow-hidden h-full',
        className
      )}
    >
      {/* First panel */}
      <div
        style={isVertical ? { height: `${split}%` } : { width: `${split}%` }}
        className="overflow-hidden shrink-0"
      >
        {first}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className={cn(
          'shrink-0 transition-colors group relative',
          isVertical
            ? 'h-[3px] cursor-row-resize bg-border hover:bg-primary/50 active:bg-primary'
            : 'w-[3px] cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary'
        )}
      >
        {/* Wider invisible hit area */}
        <div className={cn(
          'absolute inset-0',
          isVertical ? '-top-1 -bottom-1' : '-left-1 -right-1'
        )} />
      </div>

      {/* Second panel */}
      <div className="flex-1 overflow-hidden min-w-0 min-h-0">
        {second}
      </div>
    </div>
  )
}
