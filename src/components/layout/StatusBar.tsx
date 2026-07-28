import { useAppStatusStore } from '@/stores/appStatusStore'

interface StatusBarProps {
  connected?: boolean
  serverLabel?: string
  version?: string
  eventCount?: number
}

export function StatusBar({
  connected,
  serverLabel,
  version = 'v0.1.0',
  eventCount,
}: StatusBarProps) {
  const statusConnected = useAppStatusStore((s) => s.connected)
  const statusServerLabel = useAppStatusStore((s) => s.serverLabel)
  const statusListening = useAppStatusStore((s) => s.listening)
  const statusEventCount = useAppStatusStore((s) => s.eventCount)

  const effectiveConnected = connected ?? statusConnected
  const effectiveServerLabel = serverLabel ?? statusServerLabel
  const effectiveEventCount = eventCount ?? statusEventCount

  return (
    <footer className="flex items-center justify-between h-5 px-3 border-t border-border bg-card shrink-0 text-[10px] text-muted-foreground select-none">
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              effectiveConnected
                ? 'bg-emerald-400 shadow-[0_0_4px_theme(colors.emerald.400)]'
                : 'bg-slate-500'
            }`}
          />
          <span>
            {effectiveConnected
              ? `${effectiveServerLabel}`
              : 'Offline — mock data'}
          </span>
        </div>
        {statusListening && (
          <>
            <span className="text-border">|</span>
            <span>Listening new events from AutoMT API...</span>
          </>
        )}
        {effectiveEventCount != null && (
          <>
            <span className="text-border">|</span>
            <span>{effectiveEventCount} events</span>
          </>
        )}
      </div>
      <span className="font-mono">{version} · BMKG</span>
    </footer>
  )
}

