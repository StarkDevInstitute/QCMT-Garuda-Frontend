// ─── Center Area: Toolbar + Waveform Canvas + Action Bar ────────────────────

import { useWaveformStore } from '@/stores/waveformStore'
import type { NormalizationMode } from '@/types/waveform'
import { WaveformViewer } from './WaveformViewer'
import { DepthSearchModal } from './DepthSearchModal'
import { useState, useRef, useCallback } from 'react'
import { platform } from '@/lib/platform'
import { useNavigate } from 'react-router-dom'
import type { MomentTensorSolution } from '@/types/waveform'
import { debounce } from '@/lib/debounce'

export function WaveformCenterArea() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [showDepthSearch, setShowDepthSearch] = useState(false)
  const [isLogCollapsed, setIsLogCollapsed] = useState(true)
  const navigate = useNavigate()
  const {
    jobId,
    stations,
    context,
    updateContext,
    isWaveformPrepReady,
    progressSnapshot,
    progressLogs,
    progressConnection,
    clearProgressLogs,
  } = useWaveformStore()

  // Handler: Depth Search
  const handleDepthSearch = () => {
    if (!isWaveformPrepReady) return
    setShowDepthSearch(true)
  }

  // Handler: Optimize Inversion
  const handleOptimize = async () => {
    if (!jobId || !isWaveformPrepReady) return
    
    setIsOptimizing(true)
    try {
      const newSolution = await platform.optimizeInversion(jobId)
      // Update context with new solution
      if (context) {
        updateContext({ ...context, best_solution: newSolution })
      }
      alert('Optimization complete! Variance reduction: ' + (newSolution.variance_reduction * 100).toFixed(1) + '%')
    } catch (error) {
      console.error('Optimize failed:', error)
      alert('Optimization failed: ' + (error as Error).message)
    } finally {
      setIsOptimizing(false)
    }
  }

  // Handler: Commit Solution
  const handleCommit = async () => {
    if (!jobId || !context || !isWaveformPrepReady) return

    // Validation
    const activeStations = stations.filter(s => s.isActive)
    if (activeStations.length < 3) {
      alert('Need at least 3 active stations to commit solution')
      return
    }

    const avgFit = context.best_solution?.variance_reduction || 0
    if (avgFit < 0.5) {
      const proceed = confirm(`Fit quality is low (${(avgFit * 100).toFixed(1)}%). Proceed anyway?`)
      if (!proceed) return
    }

    setIsCommitting(true)
    try {
      await platform.commitSolution(jobId)
      alert('Solution committed successfully!')
      navigate('/')  // Return to Moment Tensor page
    } catch (error) {
      console.error('Commit failed:', error)
      alert('Commit failed: ' + (error as Error).message)
    } finally {
      setIsCommitting(false)
    }
  }

  // Handler: Depth Search Complete
  const handleDepthSearchComplete = (newDepth: number, newSolution: MomentTensorSolution) => {
    if (context) {
      // Update context with new depth and solution
      updateContext({
        ...context,
        event: { ...context.event, depth_km: newDepth },
        best_solution: newSolution,
      })
    }
    alert(`Depth search complete! Best depth: ${newDepth.toFixed(1)} km (VR: ${(newSolution.variance_reduction * 100).toFixed(1)}%)`)
  }

  return (
    <div className="flex h-full flex-col bg-[#f4f6f8] text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Toolbar */}
      <WaveformToolbar 
        onDepthSearch={handleDepthSearch} 
        onOptimize={handleOptimize}
        isOptimizing={isOptimizing}
        isWaveformPrepReady={isWaveformPrepReady}
      />

      {/* Station Values Mini Header */}
      <div className="border-b border-slate-300 bg-[#eef1f4] px-3 py-1 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="grid grid-cols-[120px_80px_80px_90px_90px_90px_90px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <div>Loc.Cha</div>
          <div className="text-right">Dist</div>
          <div className="text-right">Az</div>
          <div className="text-right">Weight</div>
          <div className="text-right">Fit (%)</div>
          <div className="text-right">Ms(BB)</div>
          <div className="text-right">Status</div>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="flex-1 overflow-y-auto bg-[#f7f8fa] dark:bg-slate-950">
        {isWaveformPrepReady ? (
          <WaveformViewer />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-lg border border-slate-300 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-900">
              <div className="text-sm font-medium">Waveform viewer is locked</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Waiting until stage WAVEFORM_PREP is done.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Console */}
      <div className="border-t border-slate-300 bg-[#eef1f4] dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide">Process Log</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Stage: {progressSnapshot.stage || 'unknown'} | Status: {progressSnapshot.status || 'running'} | Link: {progressConnection}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              onClick={clearProgressLogs}
            >
              Clear
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              onClick={() => setIsLogCollapsed((v) => !v)}
            >
              {isLogCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
        </div>
        <div className="px-4 pb-2">
          <div className="h-1.5 overflow-hidden rounded bg-slate-300/70 dark:bg-slate-700">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.max(0, Math.min(100, progressSnapshot.progress || 0))}%` }}
            />
          </div>
        </div>
        {!isLogCollapsed && (
          <div className="max-h-36 overflow-y-auto border-t border-slate-300 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
            {progressLogs.length === 0 ? (
              <div className="text-[11px] text-muted-foreground">No logs yet</div>
            ) : (
              <div className="space-y-1">
                {progressLogs.map((entry, index) => (
                  <div key={`${entry.timestamp}-${index}`} className="text-[11px]">
                    <span className="text-muted-foreground">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{' '}
                    <span className={
                      entry.level === 'error'
                        ? 'text-red-500'
                        : entry.level === 'warn'
                          ? 'text-amber-500'
                          : 'text-foreground'
                    }>
                      {entry.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <WaveformActionBar 
        onCommit={handleCommit}
        isCommitting={isCommitting}
        isWaveformPrepReady={isWaveformPrepReady}
      />

      {/* Depth Search Modal */}
      {jobId && context && (
        <DepthSearchModal
          isOpen={showDepthSearch}
          onClose={() => setShowDepthSearch(false)}
          jobId={jobId}
          currentDepth={context.event.depth_km}
          onComplete={handleDepthSearchComplete}
        />
      )}
    </div>
  )
}

// ─── Toolbar (48px height) ────────────────────────────────────────────────────

interface WaveformToolbarProps {
  onDepthSearch: () => void
  onOptimize: () => void
  isOptimizing: boolean
  isWaveformPrepReady: boolean
}

function WaveformToolbar({ onDepthSearch, onOptimize, isOptimizing, isWaveformPrepReady }: WaveformToolbarProps) {
  const { 
    normalizationMode, 
    setNormalizationMode,
    processingProfile,
    setProcessingProfile,
    frequencyFilter,
    setFrequencyFilter,
    jobId,
  } = useWaveformStore()

  // Create debounced frequency filter handlers (500ms debounce)
  const debouncedSetLowFreqRef = useRef(
    debounce((value: number) => {
      setFrequencyFilter(value, frequencyFilter.high)
    }, 500)
  )

  const debouncedSetHighFreqRef = useRef(
    debounce((value: number) => {
      setFrequencyFilter(frequencyFilter.low, value)
    }, 500)
  )

  const handleLowFreqChange = useCallback((value: number) => {
    debouncedSetLowFreqRef.current(value)
  }, [])

  const handleHighFreqChange = useCallback((value: number) => {
    debouncedSetHighFreqRef.current(value)
  }, [frequencyFilter.low, frequencyFilter.high])

  return (
    <div className="flex h-11 items-center gap-3 border-b border-slate-300 bg-[#e9edf1] px-3 overflow-x-auto dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[10px] dark:border-slate-700 dark:bg-slate-900">
        <span className="font-semibold">Norm.</span>
        <button
          onClick={() => setNormalizationMode('trace')}
          className={`rounded px-1.5 py-0.5 ${normalizationMode === 'trace' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          trace
        </button>
        <button
          onClick={() => setNormalizationMode('single')}
          className={`rounded px-1.5 py-0.5 ${normalizationMode === 'single' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          single
        </button>
        <button
          onClick={() => setNormalizationMode('all')}
          className={`rounded px-1.5 py-0.5 ${normalizationMode === 'all' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          all
        </button>
      </div>

      {/* Processing Profile */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-foreground">Processing:</label>
        <select
          value={processingProfile}
          onChange={(e) => setProcessingProfile(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="QCMT_R">QCMT Regional</option>
          <option value="MS-MLS">MS-MLS</option>
          <option value="Surface_R">Surface Wave</option>
          <option value="WPHASE_R">W-Phase</option>
        </select>
      </div>

      {/* Frequency Filter */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-foreground">Filter:</label>
        <div className="flex items-center gap-1">
          <input
            type="range"
            min="0.01"
            max="0.1"
            step="0.005"
            value={frequencyFilter.low}
            onChange={(e) => handleLowFreqChange(parseFloat(e.target.value))}
            className="w-16"
          />
          <span className="text-[10px] text-muted-foreground w-10">{frequencyFilter.low.toFixed(3)}</span>
        </div>
        <span className="text-xs text-muted-foreground">-</span>
        <div className="flex items-center gap-1">
          <input
            type="range"
            min="0.02"
            max="0.2"
            step="0.005"
            value={frequencyFilter.high}
            onChange={(e) => handleHighFreqChange(parseFloat(e.target.value))}
            className="w-16"
          />
          <span className="text-[10px] text-muted-foreground w-10">{frequencyFilter.high.toFixed(3)}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">Hz</span>
      </div>

      {/* Normalization Mode */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-foreground">Add/hide:</label>
        <select
          value={normalizationMode}
          onChange={(e) => setNormalizationMode(e.target.value as NormalizationMode)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="trace">Per Trace</option>
          <option value="single">Single</option>
          <option value="all">All</option>
          <option value="none">None</option>
        </select>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex gap-2">
        <button 
          className="rounded bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          disabled={!jobId || !isWaveformPrepReady}
          onClick={onDepthSearch}
        >
          Run depth search
        </button>
        <button 
          className="rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          disabled={!jobId || isOptimizing || !isWaveformPrepReady}
          onClick={onOptimize}
        >
          {isOptimizing ? 'Optimizing...' : 'Apply solution'}
        </button>
      </div>
    </div>
  )
}

// ─── Action Bar (56px height) ─────────────────────────────────────────────────

interface WaveformActionBarProps {
  onCommit: () => void
  isCommitting: boolean
  isWaveformPrepReady: boolean
}

function WaveformActionBar({ onCommit, isCommitting, isWaveformPrepReady }: WaveformActionBarProps) {
  return (
    <div className="flex h-12 items-center justify-between border-t border-slate-300 bg-[#e9edf1] px-3 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex gap-2">
        <button className="rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
          Optimize result
        </button>
        <button className="rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
          Add/remove by fit
        </button>
      </div>

      <div className="flex gap-2">
        <button className="rounded border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button 
          className="rounded bg-emerald-600 px-4 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          onClick={onCommit}
          disabled={isCommitting || !isWaveformPrepReady}
        >
          {isCommitting ? 'Committing...' : 'Commit Solution'}
        </button>
      </div>
    </div>
  )
}
