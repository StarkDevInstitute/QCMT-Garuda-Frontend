import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { Activity, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

function LiveClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const iso = time.toISOString().replace('T', ' ').slice(0, 19)
  return (
    <span className="font-mono text-[11px] tabular-nums text-muted-foreground select-none">
      {iso}
      <span className="text-accent ml-1 text-[10px]">UTC</span>
    </span>
  )
}

export function AppHeader() {
  return (
    <header className="flex items-center justify-between h-10 px-4 border-b border-border bg-card shrink-0">
      {/* Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-accent" />
          <span className="font-bold text-[13px] tracking-[0.2em] text-foreground uppercase">QCMT Garuda</span>
          <span className="text-[11px] text-muted-foreground font-semibold tracking-wide">BMKG</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-[11px] text-muted-foreground hidden sm:block">
          Seismic Moment Tensor Viewer
        </span>
      </div>
      {/* Right: clock + settings + toggle */}
      <div className="flex items-center gap-2">
        <LiveClock />
        <div className="h-4 w-px bg-border mx-1" />
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) =>
            cn(
              'flex items-center justify-center w-7 h-7 rounded transition-colors',
              isActive
                ? 'text-sky-400 bg-sky-400/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )
          }
        >
          <Settings size={15} />
        </NavLink>
        <ThemeToggle />
      </div>
    </header>
  )
}
