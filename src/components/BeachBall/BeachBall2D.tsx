import { useEffect, useRef } from 'react'
import type { NodalPlanes } from '@/types/seismology'
import { faultNormal, slipVector, radiationSign, plotToNED } from './beachball-geometry'

interface BeachBall2DProps {
  nodalPlanes: NodalPlanes
  size?: number
  className?: string
}

export function BeachBall2D({ nodalPlanes, size = 120, className }: BeachBall2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const np1 = nodalPlanes.nodalPlane1
    const np2 = nodalPlanes.nodalPlane2
    if (!np1) return

    const dpr = window.devicePixelRatio || 1
    const px = size * dpr
    canvas.width = px
    canvas.height = px
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 2

    const n1 = faultNormal(np1.strike.value, np1.dip.value)
    const l1 = slipVector(np1.strike.value, np1.dip.value, np1.rake.value)
    // If np2 given, verify; otherwise use np1 only (double-couple is symmetric)
    const n2 = np2 ? faultNormal(np2.strike.value, np2.dip.value) : null
    const l2 = np2 ? slipVector(np2.strike.value, np2.dip.value, np2.rake.value) : null

    // Draw pixel-by-pixel using radiation pattern
    const imgData = ctx.createImageData(size, size)

    for (let py = 0; py < size; py++) {
      for (let pxs = 0; pxs < size; pxs++) {
        const nx = (pxs - cx) / radius    // east component, +1 = edge E
        const ny = -(py - cy) / radius    // north component (screen y is flipped), +1 = edge N
        const gamma = plotToNED(nx, ny)
        if (!gamma) continue

        // Use whichever nodal plane gives the larger absolute radiation
        const a1 = radiationSign(n1, l1, gamma)
        const a2 = n2 && l2 ? radiationSign(n2, l2, gamma) : a1
        // Prefer the larger absolute value (more decisive)
        const a = Math.abs(a1) >= Math.abs(a2) ? a1 : a2

        const idx = (py * size + pxs) * 4
        if (a >= 0) {
          // Compression → dark (black for dark theme, dark gray for light)
          imgData.data[idx]     = 30
          imgData.data[idx + 1] = 30
          imgData.data[idx + 2] = 30
          imgData.data[idx + 3] = 255
        } else {
          // Dilatation → white / light
          imgData.data[idx]     = 230
          imgData.data[idx + 1] = 230
          imgData.data[idx + 2] = 230
          imgData.data[idx + 3] = 255
        }
      }
    }
    ctx.putImageData(imgData, 0, 0)

    // Draw circle outline
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Clip everything outside circle
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    // Draw outline again on top
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // N indicator
    ctx.fillStyle = '#888'
    ctx.font = `bold ${size * 0.09}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText('N', cx, 10)
  }, [nodalPlanes, size])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={className}
    />
  )
}
