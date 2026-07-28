// ─── Waveform Viewer Container ────────────────────────────────────────────────

import { useWaveformStore } from '@/stores/waveformStore'
import { StationRow } from './StationRow'
import { useMemo, useState, useCallback, useEffect } from 'react'

export function WaveformViewer() {
  const { stations, normalizationMode } = useWaveformStore()
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })

  if (stations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground">No waveform data</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Select an event from the events page to load waveforms
          </div>
        </div>
      </div>
    )
  }

  // Calculate global max amplitude for "all" normalization mode
  const globalMax = useMemo(() => {
    if (normalizationMode !== 'all') return 1
    
    return Math.max(
      1, // Fallback to 1 if no data
      ...stations.flatMap(s => 
        Object.values(s.contribution.waveforms || {}).flatMap(comp =>
          [
            ...(comp.observed?.samples || []),
            ...(comp.synthetic?.samples || [])
          ]
        )
      ).map(v => Math.abs(v))
    )
  }, [stations, normalizationMode])

  // Handle scroll to update visible range (for future lazy loading optimization)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollPosition = target.scrollTop
    const containerHeight = target.clientHeight
    
    // Estimate visible rows (assuming ~100px per row average)
    const rowHeight = 100
    const startIndex = Math.max(0, Math.floor(scrollPosition / rowHeight) - 2)
    const endIndex = Math.min(stations.length, Math.ceil((scrollPosition + containerHeight) / rowHeight) + 2)
    
    setVisibleRange({ start: startIndex, end: endIndex })
  }, [stations.length])

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-slate-900" onScroll={handleScroll}>
      <div className="min-h-full">
        {stations.map((station, index) => (
          <StationRow
            key={station.stationKey}
            station={station}
            index={index}
            normalizationMode={normalizationMode}
            globalMaxAmplitude={globalMax}
          />
        ))}
      </div>
    </div>
  )
}
