// ─── Station Row Component ────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react'
import type { StationWaveformData, NormalizationMode, ComponentType } from '@/types/waveform'
import { DISTANCE_GROUP_COLORS, getFitQualityColor } from '@/lib/waveform-colors'
import { formatDistance, formatAzimuth, formatMisfit } from '@/lib/waveform-formatters'
import { WaveformTrace } from './WaveformTrace'
import { useWaveformStore } from '@/stores/waveformStore'
import { debounce } from '@/lib/debounce'

interface StationRowProps {
  station: StationWaveformData
  index: number
  normalizationMode: NormalizationMode
  globalMaxAmplitude: number
}

export function StationRow({ station, index, normalizationMode, globalMaxAmplitude }: StationRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { updateStationTimeShift } = useWaveformStore()
  
  const { metadata, contribution, distanceGroup, stationKey } = station
  const fit = contribution.misfit ? (1 - contribution.misfit) * 100 : 0
  const groupColor = DISTANCE_GROUP_COLORS[distanceGroup]
  const fitColor = getFitQualityColor(fit)
  
  // Time shift state - use contribution.timeShift as initial value
  const currentTimeShift = contribution.timeShift || 0

  // Create debounced handler for time shift (300ms debounce)
  const debouncedUpdateTimeShiftRef = useRef(
    debounce((station: string, shift: number) => {
      updateStationTimeShift(station, shift)
    }, 300)
  )

  const handleTimeShiftChange = useCallback((value: number) => {
    debouncedUpdateTimeShiftRef.current(stationKey, value)
  }, [stationKey])

  // Available components
  const availableComponents: ComponentType[] = (['Z', 'R', 'T'] as ComponentType[]).filter(
    comp => contribution.waveforms?.[comp]?.observed?.samples
  ) as ComponentType[]

  // Calculate max amplitude for this station (for "trace" mode)
  const stationMaxAmplitude = normalizationMode === 'trace'
    ? Math.max(
        ...Object.values(contribution.waveforms || {}).flatMap(comp =>
          [
            ...(comp.observed?.samples || []),
            ...(comp.synthetic?.samples || [])
          ]
        ).map(v => Math.abs(v))
      )
    : 1

  return (
    <div
      className={`
        border-b border-border/30 hover:bg-accent/20 transition-colors
        ${index % 2 === 0 ? 'bg-card/10' : 'bg-background'}
        ${!contribution.active ? 'opacity-50' : ''}
      `}
      style={{ borderLeftColor: groupColor, borderLeftWidth: 4 }}
    >
      {/* Station Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Station Name */}
          <div className="font-mono text-sm font-semibold">
            {metadata.network}.{metadata.station}
          </div>

          {/* Distance & Azimuth */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDistance(metadata.distance_deg)}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{formatAzimuth(metadata.azimuth_deg)}</span>
          </div>

          {/* Components badges */}
          <div className="flex gap-1">
            {availableComponents.map(comp => (
              <span
                key={comp}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
              >
                {comp}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Time Shift */}
          {currentTimeShift !== 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Shift:</span>
              <span className="text-xs font-mono text-primary">
                {currentTimeShift >= 0 ? '+' : ''}{currentTimeShift.toFixed(2)}s
              </span>
            </div>
          )}

          {/* Fit % */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Fit:</span>
            <span
              className="text-sm font-semibold"
              style={{ color: fitColor }}
            >
              {formatMisfit(contribution.misfit || 0)}
            </span>
          </div>

          {/* SNR */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">SNR:</span>
            <span className="text-sm font-mono">
              {contribution.snr?.toFixed(1) || 'N/A'}
            </span>
          </div>

          {/* Expand/Collapse Icon */}
          <div className="text-muted-foreground">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {/* Waveform Traces */}
      {isExpanded && (
        <div className="px-3 pb-3">
          {/* Time Shift Control */}
          <div className="mb-3 flex items-center gap-4 rounded border border-border/50 bg-muted/20 px-3 py-2">
            <label className="text-xs font-medium text-foreground">Time Shift:</label>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={currentTimeShift}
              onChange={(e) => {
                const newShift = parseFloat(e.target.value)
                handleTimeShiftChange(newShift)
              }}
              className="flex-1 cursor-pointer"
            />
            <span className="w-16 text-right text-xs font-mono">
              {currentTimeShift >= 0 ? '+' : ''}{currentTimeShift.toFixed(2)}s
            </span>
            {currentTimeShift !== 0 && (
              <button
                onClick={() => updateStationTimeShift(stationKey, 0)}
                className="rounded border border-border bg-background px-2 py-0.5 text-xs hover:bg-accent"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-2">
            {availableComponents.map(comp => {
              const waveformData = contribution.waveforms?.[comp]
              if (!waveformData) return null

              const { observed, synthetic, window } = waveformData

              // Calculate max for this component (for "single" mode)
              const componentMax = normalizationMode === 'single'
                ? Math.max(
                    ...[
                      ...(observed?.samples || []),
                      ...(synthetic?.samples || [])
                    ].map(v => Math.abs(v))
                  )
                : normalizationMode === 'all'
                ? globalMaxAmplitude
                : stationMaxAmplitude

              return (
                <div key={comp} className="rounded border border-border bg-card/50 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      Component {comp}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Max: {componentMax.toExponential(2)}
                    </span>
                  </div>
                  
                  <WaveformTrace
                    observed={observed?.samples || []}
                    synthetic={synthetic?.samples || []}
                    sampleRate={observed?.sampleRate || 20}
                    maxAmplitude={componentMax}
                    signalWindow={window}
                    timeShift={currentTimeShift}
                    width={800}
                    height={80}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Collapsed view - show only combined trace */}
      {!isExpanded && (
        <div className="px-3 pb-2">
          <WaveformTrace
            observed={contribution.waveforms?.Z?.observed?.samples || []}
            synthetic={contribution.waveforms?.Z?.synthetic?.samples || []}
            sampleRate={contribution.waveforms?.Z?.observed?.sampleRate || 20}
            maxAmplitude={normalizationMode === 'all' ? globalMaxAmplitude : stationMaxAmplitude}
            signalWindow={contribution.waveforms?.Z?.window}
            timeShift={currentTimeShift}
            width={800}
            height={60}
          />
        </div>
      )}
    </div>
  )
}
