// ─── Right Sidebar: Station Table ────────────────────────────────────────────

import { useState, useRef } from 'react'
import { useWaveformStore } from '@/stores/waveformStore'
import { DISTANCE_GROUP_COLORS, getFitQualityColor } from '@/lib/waveform-colors'
import { formatDistance, formatAzimuth, formatWeight, formatMisfit } from '@/lib/waveform-formatters'
import type { StationWaveformData, SortColumn, DistanceGroup } from '@/types/waveform'
import { debounce } from '@/lib/debounce'

export function WaveformRightSidebar() {
  const { 
    stations,
    getFilteredStations,
    sortColumn,
    sortDirection,
    setSorting,
    distanceGroupFilter,
    toggleDistanceGroupFilter,
    selectAll,
    deselectAll,
    enableAll,
    disableAll,
    toggleStationSelection,
  } = useWaveformStore()

  const filteredStations = getFilteredStations()
  const selectedCount = stations.filter(s => s.isSelected).length
  const totalCount = stations.length
  const averageFit = stations.length > 0
    ? stations.reduce((sum, s) => sum + ((s.contribution.misfit ? (1 - s.contribution.misfit) * 100 : 0)), 0) / stations.length
    : 0

  return (
    <div className="flex h-full flex-col bg-[#f3f4f6] dark:bg-slate-950">
      <div className="border-b border-slate-300 bg-[#eceff3] px-3 py-2 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Depth Search</div>
        <div className="space-y-1 rounded border border-slate-300 bg-white p-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Grid:</span>
            <input defaultValue="20, 200, 30, 400, 50" className="w-40 rounded border border-slate-300 px-1 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Fine search:</span>
            <input defaultValue="50, 10, 5, 1" className="w-40 rounded border border-slate-300 px-1 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Min depth:</span>
            <input defaultValue="2" className="w-16 rounded border border-slate-300 px-1 py-0.5 text-right text-[10px] dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <button className="mt-1 w-full rounded border border-slate-300 bg-slate-100 py-1 text-[11px] font-medium hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
            Run depth search
          </button>
        </div>
      </div>

      {/* Station Values Toolbar */}
      <div className="border-b border-slate-300 bg-[#eceff3] px-3 py-2 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Station Values ({filteredStations.length}/{totalCount})</h3>
          <div className="flex gap-1">
            <button
              onClick={selectAll}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              title="Select All"
            >
              All
            </button>
            <button
              onClick={deselectAll}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              title="Deselect All"
            >
              None
            </button>
          </div>
        </div>

        {/* Distance Group Filters */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-muted-foreground">Filter:</span>
          <label className="flex cursor-pointer items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={distanceGroupFilter.has('local')}
              onChange={() => toggleDistanceGroupFilter('local')}
              className="h-3 w-3"
            />
            <span
              className="rounded px-1.5 py-0.5 text-[10px]"
              style={{ backgroundColor: DISTANCE_GROUP_COLORS.local + '30' }}
            >
              Local
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={distanceGroupFilter.has('regional')}
              onChange={() => toggleDistanceGroupFilter('regional')}
              className="h-3 w-3"
            />
            <span
              className="rounded px-1.5 py-0.5 text-[10px]"
              style={{ backgroundColor: DISTANCE_GROUP_COLORS.regional + '30' }}
            >
              Regional
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={distanceGroupFilter.has('teleseismic')}
              onChange={() => toggleDistanceGroupFilter('teleseismic')}
              className="h-3 w-3"
            />
            <span
              className="rounded px-1.5 py-0.5 text-[10px]"
              style={{ backgroundColor: DISTANCE_GROUP_COLORS.teleseismic + '30' }}
            >
              Tele
            </span>
          </label>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-1">
          <button
            onClick={enableAll}
            className="flex-1 rounded border border-green-600/50 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300"
          >
            Enable All
          </button>
          <button
            onClick={disableAll}
            className="flex-1 rounded border border-red-600/50 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* Sortable Table Header */}
      <div className="sticky top-0 z-10 border-b border-slate-300 bg-[#e8ecf0] text-xs font-medium dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-[28px_36px_42px_48px_46px_44px_44px_42px_42px_46px] gap-1 px-2 py-1">
          <div className="text-center">☑</div>
          <div className="text-left">Use</div>
          
          <SortableHeader column="network" label="Net" align="left" />
          <SortableHeader column="station" label="Sta" align="left" />
          
          <div className="text-left">Ch</div>
          
          <SortableHeader column="distance" label="Dist°" align="right" />
          <SortableHeader column="azimuth" label="Az°" align="right" />
          <SortableHeader column="weight" label="Wgt" align="right" />
          <SortableHeader column="fit" label="Fit%" align="right" />
          <SortableHeader column="snr" label="SNR" align="right" />
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950">
        {filteredStations.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No stations match filter
          </div>
        )}
        {filteredStations.map((station) => (
          <StationRow
            key={station.stationKey}
            station={station}
            onToggle={() => toggleStationSelection(station.stationKey)}
          />
        ))}
      </div>

      {/* Enhanced Footer */}
      <div className="border-t border-slate-300 bg-[#eceff3] px-3 py-2 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-medium">Selected:</span>{' '}
            <span className="font-mono">{selectedCount} / {totalCount}</span>
          </div>
          <div>
            <span className="font-medium">Avg Fit:</span>{' '}
            <span
              className="font-mono font-semibold"
              style={{ color: getFitQualityColor(averageFit) }}
            >
              {averageFit.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sortable Header Component ────────────────────────────────────────────────

interface SortableHeaderProps {
  column: SortColumn
  label: string
  align: 'left' | 'right' | 'center'
}

function SortableHeader({ column, label, align }: SortableHeaderProps) {
  const { sortColumn, sortDirection, setSorting } = useWaveformStore()
  const isActive = sortColumn === column
  
  return (
    <div
      className={`flex cursor-pointer items-center gap-1 hover:text-foreground ${
        align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
      } ${isActive ? 'text-primary' : ''}`}
      onClick={() => setSorting(column)}
    >
      <span>{label}</span>
      {isActive && (
        <span className="text-[10px]">
          {sortDirection === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </div>
  )
}

// ─── Station Row Component ────────────────────────────────────────────────────

interface StationRowProps {
  station: StationWaveformData
  onToggle: () => void
}

function StationRow({ station, onToggle }: StationRowProps) {
  const { metadata, contribution, isSelected, distanceGroup } = station
  const { updateStationWeight } = useWaveformStore()
  const [isEditingWeight, setIsEditingWeight] = useState(false)
  const [editedWeight, setEditedWeight] = useState(contribution.weight?.toString() || '0.8')

  const fit = contribution.misfit ? (1 - contribution.misfit) * 100 : 0
  const groupColor = DISTANCE_GROUP_COLORS[distanceGroup]

  // Create debounced weight update handler (1s debounce)
  const debouncedUpdateWeightRef = useRef(
    debounce((stationKey: string, weight: number) => {
      updateStationWeight(stationKey, weight)
    }, 1000)
  )

  const handleWeightSave = () => {
    const weight = parseFloat(editedWeight)
    if (!isNaN(weight) && weight >= 0 && weight <= 1) {
      // Use debounced update
      debouncedUpdateWeightRef.current(station.stationKey, weight)
    } else {
      // Reset to original if invalid
      setEditedWeight(contribution.weight?.toString() || '0.8')
    }
    setIsEditingWeight(false)
  }

  const handleWeightKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleWeightSave()
    } else if (e.key === 'Escape') {
      setEditedWeight(contribution.weight?.toString() || '0.8')
      setIsEditingWeight(false)
    }
  }

  return (
    <div
      className={`
        grid grid-cols-[28px_36px_42px_48px_46px_44px_44px_42px_42px_46px] gap-1 px-2 py-1 text-[11px]
        border-b border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors dark:border-slate-800 dark:hover:bg-slate-900
        ${isSelected ? 'bg-accent/20' : ''}
        ${!contribution.active ? 'opacity-50' : ''}
      `}
      onClick={onToggle}
      style={{ borderLeftColor: groupColor, borderLeftWidth: 3 }}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="h-3 w-3"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Used */}
      <div className="flex items-center text-left">
        {contribution.active ? (
          <span className="text-green-600 font-bold">✓</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      {/* Network */}
      <div className="flex items-center text-left font-mono">{metadata.network}</div>

      {/* Station */}
      <div className="flex items-center text-left font-mono font-semibold">{metadata.station}</div>

      {/* Channel */}
      <div className="flex items-center text-left font-mono text-muted-foreground">{metadata.channel}</div>

      {/* Distance */}
      <div className="flex items-center justify-end font-mono">{formatDistance(metadata.distance_deg)}</div>

      {/* Azimuth */}
      <div className="flex items-center justify-end font-mono">{formatAzimuth(metadata.azimuth_deg)}</div>

      {/* Weight - Editable */}
      <div
        className="flex items-center justify-end font-mono"
        onDoubleClick={(e) => {
          e.stopPropagation()
          setIsEditingWeight(true)
        }}
      >
        {isEditingWeight ? (
          <input
            type="text"
            value={editedWeight}
            onChange={(e) => setEditedWeight(e.target.value)}
            onBlur={handleWeightSave}
            onKeyDown={handleWeightKeyDown}
            className="w-full rounded border border-primary bg-background px-1 text-right text-xs"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="hover:underline" title="Double-click to edit">
            {formatWeight(contribution.weight || 0)}
          </span>
        )}
      </div>

      {/* Fit */}
      <div
        className={`flex items-center justify-end font-mono font-semibold ${
          fit >= 80 ? 'text-green-600' : fit >= 40 ? 'text-yellow-600' : 'text-red-600'
        }`}
      >
        {formatMisfit(contribution.misfit || 0)}
      </div>

      {/* SNR */}
      <div className="flex items-center justify-end font-mono">{contribution.snr?.toFixed(1) || 'N/A'}</div>
    </div>
  )
}
