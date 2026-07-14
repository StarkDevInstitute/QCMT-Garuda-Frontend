import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, Radio } from 'lucide-react'
import { useJobStore } from '@/stores/jobStore'
import { platform } from '@/lib/platform'

interface JobStation {
  net: string
  sta: string
  cha: string
  distance: number
  azimuth: number
  used: boolean
}

interface StationSelectionStageProps {
  jobId: string
}

export function StationSelectionStage({ jobId }: StationSelectionStageProps) {
  const { jobs, updateStageProgress, addLog } = useJobStore()
  const job = jobs.find((j) => j.jobId === jobId)
  const [loading, setLoading] = useState(false)
  const [stations, setStations] = useState<JobStation[]>([])
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (job) {
      loadStations()
    }
  }, [job])

  const loadStations = async () => {
    setLoading(true)
    try {
      const stationData = await platform.getJobStations(jobId)
      setStations(stationData)
      
      // Pre-select stations that are marked as used
      const used = new Set(
        stationData.filter((s) => s.used).map((s) => `${s.net}.${s.sta}.${s.cha}`)
      )
      setSelectedStations(used)
    } catch (error) {
      addLog(jobId, 'error', `Failed to load stations: ${error}`, 'station-selection')
    } finally {
      setLoading(false)
    }
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Job not found
      </div>
    )
  }

  const stageProgress = job.stageProgress.find((s) => s.stage === 'station-selection')
  const isCompleted = stageProgress?.status === 'completed'

  const toggleStation = (station: JobStation) => {
    const key = `${station.net}.${station.sta}.${station.cha}`
    const newSelection = new Set(selectedStations)
    
    if (newSelection.has(key)) {
      newSelection.delete(key)
    } else {
      newSelection.add(key)
    }
    
    setSelectedStations(newSelection)
  }

  const toggleAll = () => {
    if (selectedStations.size === stations.length) {
      setSelectedStations(new Set())
    } else {
      setSelectedStations(new Set(stations.map((s) => `${s.net}.${s.sta}.${s.cha}`)))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    addLog(jobId, 'info', `Saving station selection (${selectedStations.size} stations)...`, 'station-selection')

    try {
      // Save selection to backend using patchStations
      const selectedList = Array.from(selectedStations)
      await platform.patchStations(jobId, {
        selected_station_ids: selectedList,
      })

      addLog(jobId, 'success', `Station selection saved: ${selectedStations.size} stations selected`, 'station-selection')
      
      updateStageProgress(jobId, 'station-selection', {
        status: 'completed',
        progress: 100,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addLog(jobId, 'error', `Failed to save station selection: ${message}`, 'station-selection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Station Selection</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select stations to use for moment tensor inversion
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {loading && stations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            Loading stations...
          </div>
        ) : stations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Radio size={48} className="mx-auto opacity-20" />
              <p>No stations available</p>
              <p className="text-sm">Complete previous stages first</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedStations.size} of {stations.length} stations selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                className="text-xs h-7"
              >
                {selectedStations.size === stations.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {/* Station Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="w-12 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedStations.size === stations.length}
                        onChange={toggleAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-2">Network</th>
                    <th className="px-4 py-2">Station</th>
                    <th className="px-4 py-2">Channel</th>
                    <th className="px-4 py-2 text-right">Distance (km)</th>
                    <th className="px-4 py-2 text-right">Azimuth (°)</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((station) => {
                    const key = `${station.net}.${station.sta}.${station.cha}`
                    const isSelected = selectedStations.has(key)
                    
                    return (
                      <tr
                        key={key}
                        onClick={() => toggleStation(station)}
                        className={`cursor-pointer hover:bg-muted/50 border-b border-border ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2 font-mono">{station.net}</td>
                        <td className="px-4 py-2 font-mono font-medium">{station.sta}</td>
                        <td className="px-4 py-2 font-mono text-muted-foreground">{station.cha}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {station.distance.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {station.azimuth.toFixed(1)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isCompleted && (
            <>
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-green-500">Selection saved</span>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadStations}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || selectedStations.size === 0}
            className="min-w-32"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Save Selection
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
