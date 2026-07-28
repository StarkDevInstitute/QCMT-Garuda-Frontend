// ─── Waveform Trace Canvas Renderer ──────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type { SignalWindow } from '@/types/seismology'
import { TRACE_COLORS, PHASE_COLORS_ALPHA, GRID_COLORS } from '@/lib/waveform-colors'
import { useThemeStore } from '@/stores/themeStore'

interface WaveformTraceProps {
  observed: number[]
  synthetic: number[]
  sampleRate: number          // Hz (e.g., 20)
  maxAmplitude: number         // For normalization
  signalWindow?: SignalWindow
  timeShift?: number          // Time shift in seconds (applied to synthetic)
  width?: number
  height?: number
}

export function WaveformTrace({
  observed,
  synthetic,
  sampleRate,
  maxAmplitude,
  signalWindow,
  timeShift = 0,
  width = 800,
  height = 80,
}: WaveformTraceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useThemeStore()
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // High DPI support
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Calculate time range
    const numSamples = Math.max(observed.length, synthetic.length)
    const duration = numSamples / sampleRate
    const timePerPixel = duration / width

    // Vertical center
    const centerY = height / 2

    // Colors
    const isDark = theme === 'dark'
    const observedColor = isDark ? TRACE_COLORS.observedDark : TRACE_COLORS.observedLight
    const syntheticColor = TRACE_COLORS.synthetic
    const gridMajorColor = isDark ? GRID_COLORS.majorDark : GRID_COLORS.major
    const gridMinorColor = isDark ? GRID_COLORS.minorDark : GRID_COLORS.minor

    // ─── Draw Signal Window (behind traces) ───────────────────────────────────
    if (signalWindow) {
      const startX = (signalWindow.startTime / duration) * width
      const endX = (signalWindow.endTime / duration) * width
      
      ctx.fillStyle = PHASE_COLORS_ALPHA[signalWindow.phase] || '#00000010'
      ctx.fillRect(startX, 0, endX - startX, height)
    }

    // ─── Draw Grid Lines ──────────────────────────────────────────────────────
    
    // Horizontal center line (zero amplitude)
    ctx.strokeStyle = gridMajorColor
    ctx.lineWidth = 1
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(width, centerY)
    ctx.stroke()

    // Vertical time grid (every 100 seconds)
    ctx.strokeStyle = gridMinorColor
    ctx.lineWidth = 0.5
    const gridInterval = 100 // seconds
    for (let t = 0; t <= duration; t += gridInterval) {
      const x = (t / duration) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // ─── Draw Waveform Traces ─────────────────────────────────────────────────

    // Function to draw trace with optional time shift
    const drawTrace = (samples: number[], color: string, lineWidth: number, opacity: number = 1.0, shiftSeconds: number = 0) => {
      if (samples.length === 0) return

      // Calculate shift in pixels
      const shiftInSamples = shiftSeconds * sampleRate
      const shiftInPixels = (shiftInSamples / samples.length) * width

      ctx.strokeStyle = color
      ctx.globalAlpha = opacity
      ctx.lineWidth = lineWidth
      ctx.setLineDash([])
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      
      for (let i = 0; i < samples.length; i++) {
        const x = (i / samples.length) * width + shiftInPixels
        const normalizedAmp = samples[i] / (maxAmplitude || 1)
        const y = centerY - (normalizedAmp * (height * 0.4)) // 40% of height for max amplitude
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      ctx.stroke()
      ctx.globalAlpha = 1.0
    }

    // Draw synthetic first (background) with time shift applied
    if (synthetic.length > 0) {
      drawTrace(synthetic, syntheticColor, 1, 0.8, timeShift)
    }

    // Draw observed on top (no time shift)
    if (observed.length > 0) {
      drawTrace(observed, observedColor, 1.5, 1.0, 0)
    }

  }, [observed, synthetic, sampleRate, maxAmplitude, signalWindow, width, height, theme, timeShift])

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const numSamples = observed.length
    const duration = numSamples / sampleRate
    const sampleIndex = Math.floor((x / width) * numSamples)

    if (sampleIndex >= 0 && sampleIndex < numSamples) {
      const time = sampleIndex / sampleRate
      const obsValue = observed[sampleIndex] || 0
      const synValue = synthetic[sampleIndex] || 0

      setTooltip({
        x: e.clientX,
        y: e.clientY,
        text: `Time: ${time.toFixed(2)}s | Obs: ${obsValue.toExponential(2)} | Syn: ${synValue.toExponential(2)}`
      })
    }
  }

  const handleMouseLeave = () => {
    setTooltip(null)
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-slate-700"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 30,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
