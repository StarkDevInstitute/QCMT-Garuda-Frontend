// ─── Waveform Page Layout (3-Column Grid) ────────────────────────────────────

interface WaveformLayoutProps {
  leftSidebar: React.ReactNode
  centerArea: React.ReactNode
  rightSidebar: React.ReactNode
}

export function WaveformLayout({ leftSidebar, centerArea, rightSidebar }: WaveformLayoutProps) {
  return (
    <div className="waveform-layout h-full min-h-0 w-full overflow-hidden bg-background">
      {/* 3-Column Grid: 260px | 1fr (min 620px) | 400px */}
      <div className="grid h-full min-h-0 w-full grid-cols-[260px_minmax(620px,1fr)_400px] gap-0">
        {/* Left Sidebar */}
        <div className="min-h-0 overflow-y-auto border-r border-slate-300 bg-[#f3f4f6] dark:border-slate-800 dark:bg-slate-950">
          {leftSidebar}
        </div>

        {/* Center Area */}
        <div className="flex min-h-0 flex-col bg-[#f7f8fa] dark:bg-slate-950">
          {centerArea}
        </div>

        {/* Right Sidebar */}
        <div className="min-h-0 overflow-hidden border-l border-slate-300 bg-[#f3f4f6] dark:border-slate-800 dark:bg-slate-950">
          {rightSidebar}
        </div>
      </div>
    </div>
  )
}
