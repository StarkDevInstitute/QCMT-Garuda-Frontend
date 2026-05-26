interface StatusBarProps {
  connected?: boolean
  serverLabel?: string
  version?: string
  eventCount?: number
}

export function StatusBar({
  connected = false,
  serverLabel,
  version = 'v0.1.0',
  eventCount,
}: StatusBarProps) {
  return (
    <footer className="flex items-center justify-between h-5 px-3 border-t border-border bg-card shrink-0 text-[10px] text-muted-foreground select-none">
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              connected
                ? 'bg-emerald-400 shadow-[0_0_4px_theme(colors.emerald.400)]'
                : 'bg-slate-500'
            }`}
          />
          <span>
            {connected
              ? `${serverLabel ?? 'bmkg-seiscomp.bmkg.go.id'}`
              : 'Offline — mock data'}
          </span>
        </div>
        {eventCount != null && (
          <>
            <span className="text-border">|</span>
            <span>{eventCount} events</span>
          </>
        )}
      </div>
      <span className="font-mono">{version} · BMKG</span>
    </footer>
  )
}

