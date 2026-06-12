import { useEffect, useRef } from 'react'
import type { NodalPlanes } from '@/types/seismology'
import { faultNormal, slipVector, radiationSign, plotToNED } from './beachball-geometry'

interface BeachBall2DProps {
  nodalPlanes: NodalPlanes
  size?: number
  className?: string
  compressionColor?: string
  dilatationColor?: string
  strokeColor?: string
  northLabelColor?: string
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return [30, 30, 30]
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ]
}

export function BeachBall2D({
  nodalPlanes,
  size = 120,
  className,
  compressionColor = '#ffffff',
  dilatationColor = '#1e1e1e',
  strokeColor = '#888888',
  northLabelColor = '#888888',
}: BeachBall2DProps) {
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
    const pixelSize = Math.max(1, Math.round(size * dpr))
    canvas.width = pixelSize
    canvas.height = pixelSize
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, pixelSize, pixelSize)

    const cx = pixelSize / 2
    const cy = pixelSize / 2
    // Keep an ultra-thin margin so focal fill appears nearly full to the border circle.
    const radius = pixelSize / 2 - Math.max(0.5, dpr * 0.5)

    const n1 = faultNormal(np1.strike.value, np1.dip.value)
    const l1 = slipVector(np1.strike.value, np1.dip.value, np1.rake.value)
    // If np2 given, verify; otherwise use np1 only (double-couple is symmetric)
    const n2 = np2 ? faultNormal(np2.strike.value, np2.dip.value) : null
    const l2 = np2 ? slipVector(np2.strike.value, np2.dip.value, np2.rake.value) : null
    const [cr, cg, cb] = hexToRgb(compressionColor)
    const [dr, dg, db] = hexToRgb(dilatationColor)

    // Draw pixel-by-pixel using radiation pattern
    const imgData = ctx.createImageData(pixelSize, pixelSize)

    for (let py = 0; py < pixelSize; py++) {
      for (let pxs = 0; pxs < pixelSize; pxs++) {
        const nx = (pxs - cx) / radius    // east component, +1 = edge E
        const ny = -(py - cy) / radius    // north component (screen y is flipped), +1 = edge N
        const gamma = plotToNED(nx, ny)
        if (!gamma) continue

        // Use whichever nodal plane gives the larger absolute radiation
        const a1 = radiationSign(n1, l1, gamma)
        const a2 = n2 && l2 ? radiationSign(n2, l2, gamma) : a1
        // Prefer the larger absolute value (more decisive)
        const a = Math.abs(a1) >= Math.abs(a2) ? a1 : a2
        const absA = Math.abs(a)

        const idx = (py * pixelSize + pxs) * 4
        if (absA < 0.03) {
          imgData.data[idx]     = 0
          imgData.data[idx + 1] = 0
          imgData.data[idx + 2] = 0
          imgData.data[idx + 3] = 255
        } else if (a >= 0) {
          imgData.data[idx]     = cr
          imgData.data[idx + 1] = cg
          imgData.data[idx + 2] = cb
          imgData.data[idx + 3] = 255
        } else {
          imgData.data[idx]     = dr
          imgData.data[idx + 1] = dg
          imgData.data[idx + 2] = db
          imgData.data[idx + 3] = 255
        }
      }
    }
    ctx.putImageData(imgData, 0, 0)

    // Draw circle outline
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = Math.max(1, dpr * 1.1)
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
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = Math.max(1, dpr * 1.1)
    ctx.stroke()

  }, [nodalPlanes, size, compressionColor, dilatationColor, strokeColor, northLabelColor])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={className}
    />
  )
}
