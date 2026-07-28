// ─── Depth Search Modal Dialog ───────────────────────────────────────────────
//
// Interactive depth search optimization
// - User inputs: min/max depth (km), step size (km)
// - Progress bar during processing
// - Variance reduction curve plot
// - Auto-select best depth
//
// Usage:
//   <DepthSearchModal 
//     isOpen={showModal} 
//     onClose={() => setShowModal(false)}
//     jobId="job_123"
//     currentDepth={15.0}
//     onComplete={(newDepth, newSolution) => { ... }}
//   />
//

import { useState } from 'react'
import { platform } from '@/lib/platform'
import type { MomentTensorSolution } from '@/types/waveform'

interface DepthSearchModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  currentDepth: number
  onComplete: (newDepth: number, newSolution: MomentTensorSolution) => void
}

interface DepthResult {
  depth: number
  varianceReduction: number
}

export function DepthSearchModal({
  isOpen,
  onClose,
  jobId,
  currentDepth,
  onComplete,
}: DepthSearchModalProps) {
  const [minDepth, setMinDepth] = useState(5)
  const [maxDepth, setMaxDepth] = useState(35)
  const [stepSize, setStepSize] = useState(2)
  const [isSearching, setIsSearching] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<DepthResult[]>([])
  const [currentTestDepth, setCurrentTestDepth] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleStartSearch = async () => {
    // Validation
    if (minDepth >= maxDepth) {
      setError('Min depth must be less than max depth')
      return
    }
    if (stepSize <= 0 || stepSize > (maxDepth - minDepth)) {
      setError('Invalid step size')
      return
    }

    setIsSearching(true)
    setError(null)
    setResults([])
    setProgress(0)

    try {
      // Calculate depths to test
      const depths: number[] = []
      for (let d = minDepth; d <= maxDepth; d += stepSize) {
        depths.push(d)
      }

      const depthResults: DepthResult[] = []

      // Test each depth
      for (let i = 0; i < depths.length; i++) {
        const depth = depths[i]
        setCurrentTestDepth(depth)
        setProgress(((i + 1) / depths.length) * 100)

        // Call backend API for depth search
        // Note: This is a simplified simulation - real implementation would be:
        // const solution = await platform.testDepth(jobId, depth)
        
        // Simulate API call with mock variance reduction
        await new Promise(resolve => setTimeout(resolve, 500))
        const vr = 0.5 + Math.random() * 0.3 - Math.abs(depth - currentDepth) * 0.01
        
        depthResults.push({
          depth,
          varianceReduction: Math.max(0.3, Math.min(0.95, vr)),
        })

        setResults([...depthResults])
      }

      // Find best depth
      const bestResult = depthResults.reduce((best, current) =>
        current.varianceReduction > best.varianceReduction ? current : best
      )

      // Create mock solution with best depth
      const bestSolution: MomentTensorSolution = {
        depth_km: bestResult.depth,
        variance_reduction: bestResult.varianceReduction,
        dc_perc: 65.0,
        clvd_perc: 25.0,
        iso_perc: 10.0,
        scalar_moment: 1.5e18,
        magnitude_mw: 6.2,
        tensor: {
          mrr: 0.523,
          mtt: 0.234,
          mpp: -0.123,
          mrt: -0.421,
          mrp: 0.087,
          mtp: -0.102,
        },
      }

      // Auto-select best depth
      setTimeout(() => {
        onComplete(bestResult.depth, bestSolution)
        onClose()
      }, 1000)

    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSearching(false)
      setCurrentTestDepth(null)
    }
  }

  const handleCancel = () => {
    if (!isSearching) {
      onClose()
    }
  }

  // Find best result for visualization
  const bestResult = results.length > 0
    ? results.reduce((best, current) =>
        current.varianceReduction > best.varianceReduction ? current : best
      )
    : null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="w-[600px] rounded-lg border border-border bg-background p-6 shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Depth Search</h2>
          <button
            onClick={handleCancel}
            disabled={isSearching}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Input Form */}
        {!isSearching && results.length === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Current Depth: {currentDepth.toFixed(1)} km
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Min Depth (km)</label>
                <input
                  type="number"
                  value={minDepth}
                  onChange={(e) => setMinDepth(Number(e.target.value))}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  min={1}
                  max={50}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Max Depth (km)</label>
                <input
                  type="number"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  min={1}
                  max={50}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Step Size (km)</label>
                <input
                  type="number"
                  value={stepSize}
                  onChange={(e) => setStepSize(Number(e.target.value))}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  min={0.5}
                  max={10}
                  step={0.5}
                />
              </div>
            </div>

            {error && (
              <div className="rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Will test {Math.floor((maxDepth - minDepth) / stepSize) + 1} depths from{' '}
              {minDepth} km to {maxDepth} km
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isSearching && (
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Testing depth: {currentTestDepth?.toFixed(1)} km</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Variance Reduction Curve (live update) */}
            {results.length > 0 && (
              <div className="rounded border border-border p-4">
                <div className="mb-2 text-sm font-medium">Variance Reduction Curve</div>
                <VarianceReductionCurve results={results} bestDepth={bestResult?.depth} />
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {!isSearching && results.length > 0 && bestResult && (
          <div className="space-y-4">
            <div className="rounded border border-green-500 bg-green-50 p-4 dark:bg-green-950">
              <div className="text-sm font-medium text-green-800 dark:text-green-200">
                Search Complete!
              </div>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                Best depth: <span className="font-semibold">{bestResult.depth.toFixed(1)} km</span>
                {' '}with variance reduction:{' '}
                <span className="font-semibold">
                  {(bestResult.varianceReduction * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="rounded border border-border p-4">
              <div className="mb-2 text-sm font-medium">Variance Reduction Curve</div>
              <VarianceReductionCurve results={results} bestDepth={bestResult.depth} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          {!isSearching && results.length === 0 && (
            <>
              <button
                onClick={handleCancel}
                className="rounded border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSearch}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Start Search
              </button>
            </>
          )}
          {!isSearching && results.length > 0 && (
            <button
              onClick={handleCancel}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Variance Reduction Curve Component ──────────────────────────────────────

interface VarianceReductionCurveProps {
  results: DepthResult[]
  bestDepth?: number
}

function VarianceReductionCurve({ results, bestDepth }: VarianceReductionCurveProps) {
  if (results.length === 0) return null

  const width = 520
  const height = 180
  const margin = { top: 10, right: 10, bottom: 30, left: 50 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom

  const minDepth = Math.min(...results.map(r => r.depth))
  const maxDepth = Math.max(...results.map(r => r.depth))
  const minVR = Math.min(...results.map(r => r.varianceReduction))
  const maxVR = Math.max(...results.map(r => r.varianceReduction))

  // Guard against division by zero
  const depthRange = maxDepth - minDepth || 1
  const vrRange = maxVR - minVR || 1

  const xScale = (depth: number) =>
    margin.left + ((depth - minDepth) / depthRange) * plotWidth
  const yScale = (vr: number) =>
    margin.top + ((maxVR - vr) / vrRange) * plotHeight

  // Generate path for line chart
  const pathData = results
    .map((r, i) => {
      const x = xScale(r.depth)
      const y = yScale(r.varianceReduction)
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="text-foreground">
      {/* Axes */}
      <line
        x1={margin.left}
        y1={height - margin.bottom}
        x2={width - margin.right}
        y2={height - margin.bottom}
        stroke="currentColor"
        strokeWidth={1}
      />
      <line
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={height - margin.bottom}
        stroke="currentColor"
        strokeWidth={1}
      />

      {/* Axis labels */}
      <text
        x={width / 2}
        y={height - 5}
        textAnchor="middle"
        fontSize={11}
        fill="currentColor"
      >
        Depth (km)
      </text>
      <text
        x={10}
        y={height / 2}
        textAnchor="middle"
        fontSize={11}
        fill="currentColor"
        transform={`rotate(-90, 10, ${height / 2})`}
      >
        Variance Reduction
      </text>

      {/* Line plot */}
      <path
        d={pathData}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
      />

      {/* Data points */}
      {results.map((r, i) => (
        <circle
          key={i}
          cx={xScale(r.depth)}
          cy={yScale(r.varianceReduction)}
          r={bestDepth === r.depth ? 5 : 3}
          fill={bestDepth === r.depth ? 'hsl(142, 76%, 36%)' : 'hsl(var(--primary))'}
          stroke="white"
          strokeWidth={1}
        />
      ))}

      {/* Tick marks */}
      {results.map((r, i) => {
        if (i % Math.max(1, Math.floor(results.length / 5)) === 0) {
          return (
            <text
              key={i}
              x={xScale(r.depth)}
              y={height - margin.bottom + 15}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
            >
              {r.depth.toFixed(0)}
            </text>
          )
        }
        return null
      })}
    </svg>
  )
}
