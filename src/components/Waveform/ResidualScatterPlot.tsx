// ─── Residual Scatter Plot ───────────────────────────────────────────────────
//
// Visualizes time shift residuals vs epicentral distance
// X-axis: Distance (0-90°)
// Y-axis: Time shift residual (-2 to +2 seconds)
// Points colored by distance group (Local=orange, Regional=green, Tele=blue)
//
// Usage:
//   <ResidualScatterPlot stations={filteredStations} width={320} height={240} />
//

import { useEffect, useRef, useState } from 'react'
import type { StationWaveformData, DistanceGroup } from '@/types/waveform'
import { DISTANCE_GROUP_COLORS } from '@/lib/waveform-colors'
import { useThemeStore } from '@/stores/themeStore'

interface ResidualScatterPlotProps {
  stations: StationWaveformData[]
  width?: number
  height?: number
}

interface PlotPoint {
  x: number          // distance in degrees
  y: number          // residual in seconds
  station: string    // station name
  group: DistanceGroup
}

export function ResidualScatterPlot({
  stations,
  width = 320,
  height = 240,
}: ResidualScatterPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<PlotPoint | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const { theme } = useThemeStore()

  // Extract plot points from stations
  const points: PlotPoint[] = stations
    .filter(s => s.contribution.timeShift !== undefined)
    .map(s => ({
      x: s.metadata.distance_deg,
      y: s.contribution.timeShift!,
      station: `${s.metadata.network}.${s.metadata.station}`,
      group: s.distanceGroup,
    }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // High-DPI scaling
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Margins
    const margin = { top: 20, right: 20, bottom: 40, left: 50 }
    const plotWidth = width - margin.left - margin.right
    const plotHeight = height - margin.top - margin.bottom

    // Scales
    const maxDistance = Math.max(90, ...points.map(p => p.x))
    const xScale = (x: number) => margin.left + (x / maxDistance) * plotWidth
    const yScale = (y: number) => margin.top + ((1 - (y + 2) / 4) * plotHeight) // -2 to +2 range

    // Background
    const isDark = theme === 'dark'
    ctx.fillStyle = isDark ? '#1a1a1a' : '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Draw axes
    ctx.strokeStyle = isDark ? '#444' : '#ccc'
    ctx.lineWidth = 1

    // Y-axis
    ctx.beginPath()
    ctx.moveTo(margin.left, margin.top)
    ctx.lineTo(margin.left, height - margin.bottom)
    ctx.stroke()

    // X-axis
    ctx.beginPath()
    ctx.moveTo(margin.left, height - margin.bottom)
    ctx.lineTo(width - margin.right, height - margin.bottom)
    ctx.stroke()

    // Zero residual line (horizontal at y=0)
    ctx.strokeStyle = isDark ? '#666' : '#999'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    const zeroY = yScale(0)
    ctx.moveTo(margin.left, zeroY)
    ctx.lineTo(width - margin.right, zeroY)
    ctx.stroke()
    ctx.setLineDash([])

    // Grid lines (horizontal)
    ctx.strokeStyle = isDark ? '#333' : '#eee'
    ctx.lineWidth = 0.5
    for (let residual of [-2, -1, 1, 2]) {
      ctx.beginPath()
      const y = yScale(residual)
      ctx.moveTo(margin.left, y)
      ctx.lineTo(width - margin.right, y)
      ctx.stroke()
    }

    // Grid lines (vertical) - every 10°
    for (let dist = 10; dist <= maxDistance; dist += 10) {
      ctx.beginPath()
      const x = xScale(dist)
      ctx.moveTo(x, margin.top)
      ctx.lineTo(x, height - margin.bottom)
      ctx.stroke()
    }

    // Axis labels
    ctx.fillStyle = isDark ? '#aaa' : '#666'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'

    // X-axis labels
    for (let dist = 0; dist <= maxDistance; dist += 20) {
      const x = xScale(dist)
      ctx.fillText(`${dist}°`, x, height - margin.bottom + 20)
    }

    // Y-axis labels
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let residual of [-2, -1, 0, 1, 2]) {
      const y = yScale(residual)
      ctx.fillText(`${residual}s`, margin.left - 10, y)
    }

    // Axis titles
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Distance (deg)', width / 2, height - 5)

    ctx.save()
    ctx.translate(12, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Residual (s)', 0, 0)
    ctx.restore()

    // Plot points
    points.forEach(point => {
      const x = xScale(point.x)
      const y = yScale(point.y)
      const color = DISTANCE_GROUP_COLORS[point.group]

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()

      // Outline for visibility
      ctx.strokeStyle = isDark ? '#000' : '#fff'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Highlight hovered point
    if (hoveredPoint) {
      const x = xScale(hoveredPoint.x)
      const y = yScale(hoveredPoint.y)
      ctx.strokeStyle = isDark ? '#fff' : '#000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.stroke()
    }
  }, [points, width, height, theme, hoveredPoint])

  // Mouse interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setMousePos({ x: e.clientX, y: e.clientY })

    // Find closest point
    const margin = { top: 20, right: 20, bottom: 40, left: 50 }
    const plotWidth = width - margin.left - margin.right
    const plotHeight = height - margin.top - margin.bottom
    const maxDistance = Math.max(90, ...points.map(p => p.x))
    const xScale = (x: number) => margin.left + (x / maxDistance) * plotWidth
    const yScale = (y: number) => margin.top + ((1 - (y + 2) / 4) * plotHeight)

    let closest: PlotPoint | null = null
    let minDist = Infinity

    points.forEach(point => {
      const px = xScale(point.x)
      const py = yScale(point.y)
      const dist = Math.sqrt((px - mouseX) ** 2 + (py - mouseY) ** 2)
      if (dist < 10 && dist < minDist) {
        minDist = dist
        closest = point
      }
    })

    setHoveredPoint(closest)
  }

  const handleMouseLeave = () => {
    setHoveredPoint(null)
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
      />
      {hoveredPoint && (
        <div
          className="absolute z-10 rounded border border-border bg-background px-2 py-1 text-xs shadow-lg pointer-events-none"
          style={{
            left: mousePos.x - (canvasRef.current?.getBoundingClientRect().left || 0) + 10,
            top: mousePos.y - (canvasRef.current?.getBoundingClientRect().top || 0) - 30,
          }}
        >
          <div className="font-semibold">{hoveredPoint.station}</div>
          <div>
            Distance: {hoveredPoint.x.toFixed(2)}°
          </div>
          <div>
            Residual: {hoveredPoint.y >= 0 ? '+' : ''}{hoveredPoint.y.toFixed(3)}s
          </div>
        </div>
      )}
    </div>
  )
}
