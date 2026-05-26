import { useRef, useEffect } from 'react'
import type { StationWaveform } from '@/types/seismology'

interface WaveformPanelProps {
  stations: StationWaveform[]
  selectedEventId: string | null
}

// Demo synthetic waveform generator (creates a simple damped sinusoid)
function generateDemoTrace(length: number, freq: number, phase: number): Float32Array {
  const data = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const t = i / length
    data[i] = Math.exp(-t * 4) * Math.sin(2 * Math.PI * freq * t + phase) * (0.8 + 0.2 * Math.random())
  }
  return data
}

function TraceCanvas({ synth, obs }: { synth: Float32Array; obs: Float32Array }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    if (!W || !H) return
    canvas.width = W * window.devicePixelRatio
    canvas.height = H * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    ctx.clearRect(0, 0, W, H)
    const midY = H / 2
    const maxAmp = Math.max(...Array.from(synth).map(Math.abs), ...Array.from(obs).map(Math.abs), 0.001)
    const scale = (H / 2 - 4) / maxAmp

    const drawTrace = (data: Float32Array, color: string) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      for (let i = 0; i < data.length; i++) {
        const x = (i / data.length) * W
        const y = midY - data[i] * scale
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    drawTrace(obs, getComputedStyle(document.documentElement).getPropertyValue('--waveform-obs').trim() || '#ccc')
    drawTrace(synth, getComputedStyle(document.documentElement).getPropertyValue('--waveform-syn').trim() || '#ff6b6b')
  }, [synth, obs])

  return <canvas ref={canvasRef} className="w-full h-10" />
}

export function WaveformPanel({ stations, selectedEventId }: WaveformPanelProps) {
  if (!selectedEventId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select an event to view waveforms
      </div>
    )
  }

  // Generate demo waveforms for display
  const demoStations = stations.length > 0 ? stations : [
    { network: 'IU', station: 'MAJO', distance: 4.1, azimuth: 265.6, weight: 1.0, fit: 93.3, amplitude: 4.2, components: [], isUsed: true },
    { network: 'IU', station: 'CHTO', distance: 8.7, azimuth: 312.1, weight: 0.9, fit: 87.5, amplitude: 2.8, components: [], isUsed: true },
    { network: 'G', station: 'PPTF', distance: 12.4, azimuth: 178.3, weight: 0.8, fit: 79.2, amplitude: 1.9, components: [], isUsed: true },
    { network: 'IU', station: 'CASY', distance: 22.1, azimuth: 205.7, weight: 0.5, fit: 62.1, amplitude: 0.8, components: [], isUsed: false },
  ]

  const headerCls = 'px-2 py-0.5 text-xs font-medium text-muted-foreground'

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="grid grid-cols-[3rem_4rem_4rem_4rem_4rem_4rem_1fr] border-b border-border bg-card sticky top-0">
        {['Net', 'Sta', 'Dist', 'Az', 'Wgt', 'Fit', 'Waveform (obs / syn)'].map((h) => (
          <div key={h} className={headerCls}>{h}</div>
        ))}
      </div>

      {/* Station rows */}
      {demoStations.map((sta) => {
        const synthData = generateDemoTrace(512, 2.5 + Math.random(), Math.random() * Math.PI)
        const obsData = synthData.map((v, i) => v * (0.9 + 0.2 * Math.random()) + (Math.random() - 0.5) * 0.05) as unknown as Float32Array
        return (
          <div
            key={`${sta.network}.${sta.station}`}
            className={`grid grid-cols-[3rem_4rem_4rem_4rem_4rem_4rem_1fr] items-center border-b border-border/50 ${sta.isUsed ? '' : 'opacity-50'}`}
          >
            <div className="px-2 py-1 text-xs font-mono">{sta.network}</div>
            <div className="px-2 py-1 text-xs font-mono font-semibold">{sta.station}</div>
            <div className="px-2 py-1 text-xs font-mono">{sta.distance.toFixed(1)}</div>
            <div className="px-2 py-1 text-xs font-mono">{sta.azimuth.toFixed(1)}</div>
            <div className="px-2 py-1 text-xs font-mono">{sta.weight.toFixed(2)}</div>
            <div className="px-2 py-1 text-xs font-mono">{sta.fit.toFixed(1)}%</div>
            <div className="px-1 py-0.5">
              <TraceCanvas synth={synthData} obs={new Float32Array(obsData)} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
