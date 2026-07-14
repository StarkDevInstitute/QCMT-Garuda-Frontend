import { useEffect, useState } from 'react'
import { platform } from '@/lib/platform'
import { Loader2 } from 'lucide-react'

interface WaveformData {
  station_code: string
  network: string
  channel: string
  distance: number
  azimuth: number
  observed?: number[]
  synthetic?: number[]
  fit_quality?: number
  time_shift?: number
  weight?: number
}

interface JobWaveformPanelProps {
  jobId: string
}

export function JobWaveformPanel({ jobId }: JobWaveformPanelProps) {
  const [waveforms, setWaveforms] = useState<WaveformData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadWaveforms()
  }, [jobId])

  const loadWaveforms = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await platform.getJobWaveforms(jobId)
      setWaveforms(data as WaveformData[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load waveforms'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading waveforms...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-sm text-muted-foreground">
          <p className="text-destructive mb-1">Failed to load waveforms</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (waveforms.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-sm text-muted-foreground">
          <p>No waveform data available</p>
          <p className="text-xs mt-1">Complete waveform preparation stage first</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card border-b border-border">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="px-4 py-2">Station</th>
            <th className="px-4 py-2">Channel</th>
            <th className="px-4 py-2 text-right">Dist (km)</th>
            <th className="px-4 py-2 text-right">Az (°)</th>
            <th className="px-4 py-2 text-right">Fit (%)</th>
            <th className="px-4 py-2 text-right">Shift (s)</th>
            <th className="px-4 py-2 text-right">Weight</th>
            <th className="px-4 py-2">Waveform</th>
          </tr>
        </thead>
        <tbody>
          {waveforms.map((wf, idx) => {
            const stationId = `${wf.network}.${wf.station_code}.${wf.channel}`
            const hasData = wf.observed && wf.observed.length > 0
            
            return (
              <tr
                key={stationId + idx}
                className="border-b border-border hover:bg-muted/50"
              >
                <td className="px-4 py-2 font-mono font-medium">{wf.station_code}</td>
                <td className="px-4 py-2 font-mono text-muted-foreground">{wf.channel}</td>
                <td className="px-4 py-2 text-right tabular-nums">{wf.distance.toFixed(1)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{wf.azimuth.toFixed(0)}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {wf.fit_quality !== undefined ? (
                    <span
                      className={
                        wf.fit_quality > 80
                          ? 'text-green-500'
                          : wf.fit_quality > 60
                          ? 'text-yellow-500'
                          : 'text-red-500'
                      }
                    >
                      {wf.fit_quality.toFixed(1)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {wf.time_shift !== undefined ? wf.time_shift.toFixed(2) : '-'}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {wf.weight !== undefined ? wf.weight.toFixed(2) : '-'}
                </td>
                <td className="px-4 py-2">
                  {hasData ? (
                    <MiniWaveform
                      observed={wf.observed!}
                      synthetic={wf.synthetic}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No data</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Mini waveform preview using SVG
function MiniWaveform({
  observed,
  synthetic,
}: {
  observed: number[]
  synthetic?: number[]
}) {
  const width = 120
  const height = 40
  const midY = height / 2

  // Find max amplitude for scaling
  const allValues = [...observed, ...(synthetic || [])]
  const maxAmp = Math.max(...allValues.map(Math.abs), 0.001)
  const scale = (height / 2 - 2) / maxAmp

  const toPath = (data: number[]) => {
    return data
      .map((val, i) => {
        const x = (i / data.length) * width
        const y = midY - val * scale
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  return (
    <svg width={width} height={height} className="inline-block">
      {/* Observed waveform */}
      <path
        d={toPath(observed)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className="text-muted-foreground opacity-70"
      />
      {/* Synthetic waveform */}
      {synthetic && synthetic.length > 0 && (
        <path
          d={toPath(synthetic)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-primary"
        />
      )}
    </svg>
  )
}
