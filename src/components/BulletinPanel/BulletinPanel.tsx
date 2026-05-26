import { useEffect, useRef } from 'react'

interface BulletinEntry {
  time: Date
  message: string
  level?: 'info' | 'warn' | 'error'
}

interface BulletinPanelProps {
  entries: BulletinEntry[]
}

export function BulletinPanel({ entries }: BulletinPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div className="h-full overflow-auto bg-card border-t border-border px-3 py-2 font-mono">
      {entries.length === 0 && (
        <div className="text-[11px] text-muted-foreground">No log entries.</div>
      )}
      {entries.map((e, i) => (
        <div
          key={i}
          className={`flex items-baseline gap-2 text-[11px] leading-5 ${
            e.level === 'error' ? 'text-red-400' :
            e.level === 'warn'  ? 'text-yellow-400' :
            'text-muted-foreground'
          }`}
        >
          <span className="text-muted-foreground/50 shrink-0">[{e.time.toISOString().replace('T', ' ').slice(0, 19)}]</span>
          <span>{e.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

export type { BulletinEntry }
