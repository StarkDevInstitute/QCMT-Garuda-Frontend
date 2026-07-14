import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download, CheckCircle2, Save } from 'lucide-react'
import { useJobStore } from '@/stores/jobStore'
import { platform } from '@/lib/platform'

interface JobSolution {
  strike1: number
  dip1: number
  rake1: number
  strike2: number
  dip2: number
  rake2: number
  moment: number
  magnitude: number
  variance_reduction: number
  quality: string
}

interface FinalizeStageProps {
  jobId: string
}

export function FinalizeStage({ jobId }: FinalizeStageProps) {
  const { jobs, updateStageProgress, addLog } = useJobStore()
  const job = jobs.find((j) => j.jobId === jobId)
  const [loading, setLoading] = useState(false)
  const [solution, setSolution] = useState<JobSolution | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (job) {
      loadSolution()
    }
  }, [job])

  const loadSolution = async () => {
    setLoading(true)
    try {
      const solutions = await platform.getJobSolutions(jobId)
      if (solutions.length > 0) {
        // Get best solution (first one)
        setSolution(solutions[0] as JobSolution)
      }
    } catch (error) {
      addLog(jobId, 'error', `Failed to load solution: ${error}`, 'finalize')
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

  const stageProgress = job.stageProgress.find((s) => s.stage === 'finalize')
  const isCompleted = stageProgress?.status === 'completed'

  const handleFinalize = async () => {
    setSaving(true)
    addLog(jobId, 'info', 'Finalizing results and saving to database...', 'finalize')

    try {
      await platform.runFinalize(jobId)
      
      addLog(jobId, 'success', 'Results finalized and saved successfully', 'finalize')
      
      updateStageProgress(jobId, 'finalize', {
        status: 'completed',
        progress: 100,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addLog(jobId, 'error', `Failed to finalize: ${message}`, 'finalize')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (format: string) => {
    try {
      addLog(jobId, 'info', `Downloading results in ${format.toUpperCase()} format...`, 'finalize')
      await platform.downloadJobResultFile(jobId, format)
      addLog(jobId, 'success', `${format.toUpperCase()} file downloaded`, 'finalize')
    } catch (error) {
      addLog(jobId, 'error', `Download failed: ${error}`, 'finalize')
    }
  }

  const getQualityColor = (quality: string) => {
    switch (quality?.toUpperCase()) {
      case 'A':
      case 'A1':
      case 'A2':
        return 'bg-green-500/20 text-green-500 border-green-500/30'
      case 'B':
      case 'B1':
      case 'B2':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
      case 'C':
      case 'C1':
      case 'C2':
        return 'bg-orange-500/20 text-orange-500 border-orange-500/30'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Finalize & Export Results</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review solution and export results to catalog
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {loading && !solution ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Loading solution...
            </div>
          ) : !solution ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center space-y-2">
                <p>No solution available</p>
                <p className="text-sm">Complete inversion stage first</p>
              </div>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              {isCompleted && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle2 size={24} className="text-green-500 shrink-0" />
                  <div>
                    <p className="font-medium text-green-500">Results Finalized</p>
                    <p className="text-sm text-muted-foreground">
                      Solution saved to catalog successfully
                    </p>
                  </div>
                </div>
              )}

              {/* Solution Summary */}
              <div className="p-6 border border-border rounded-lg space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Best-Fit Solution</h3>
                  <Badge className={getQualityColor(solution.quality)}>
                    Quality: {solution.quality || 'N/A'}
                  </Badge>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Magnitude</p>
                    <p className="text-2xl font-bold tabular-nums">
                      Mw {solution.magnitude.toFixed(1)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Scalar Moment</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {solution.moment.toExponential(2)} Nm
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Variance Reduction</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {solution.variance_reduction.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Focal Mechanism Parameters */}
                <div className="border-t border-border pt-6">
                  <h4 className="text-sm font-medium mb-4">Nodal Planes</h4>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Plane 1 */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Nodal Plane 1</p>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Strike</p>
                          <p className="font-mono font-semibold tabular-nums">{solution.strike1.toFixed(0)}°</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Dip</p>
                          <p className="font-mono font-semibold tabular-nums">{solution.dip1.toFixed(0)}°</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rake</p>
                          <p className="font-mono font-semibold tabular-nums">{solution.rake1.toFixed(0)}°</p>
                        </div>
                      </div>
                    </div>

                    {/* Plane 2 */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Nodal Plane 2</p>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Strike</p>
                          <p className="font-mono font-semibold tabular-nums">{solution.strike2.toFixed(0)}°</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Dip</p>
                          <p className="font-mono font-semibold tabular-nums">{solution.dip2.toFixed(0)}°</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rake</p>
                          <p className="font-mono font-semibold tabular-nums">{solution.rake2.toFixed(0)}°</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Options */}
              <div className="p-6 border border-border rounded-lg space-y-4">
                <h3 className="text-lg font-semibold">Export Results</h3>
                <p className="text-sm text-muted-foreground">
                  Download moment tensor solution in various formats
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload('quakeml')}
                    className="justify-start"
                  >
                    <Download size={16} />
                    QuakeML
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload('gse2')}
                    className="justify-start"
                  >
                    <Download size={16} />
                    GSE 2.0
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload('sac')}
                    className="justify-start"
                  >
                    <Download size={16} />
                    SAC Polezero
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload('csv')}
                    className="justify-start"
                  >
                    <Download size={16} />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload('plots')}
                    className="justify-start col-span-2"
                  >
                    <Download size={16} />
                    All Plots (ZIP)
                  </Button>
                </div>
              </div>

              {/* Event Info */}
              <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-2">
                <h4 className="font-medium">Event Information</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Event ID:</span> {job.eventId}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Time:</span>{' '}
                    {job.eventSummary?.origin_time || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Location:</span>{' '}
                    {job.eventSummary?.latitude.toFixed(2)}°, {job.eventSummary?.longitude.toFixed(2)}°
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Depth:</span>{' '}
                    {job.eventSummary?.depth.toFixed(1)} km
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isCompleted ? (
            <>
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-green-500">Saved to catalog</span>
            </>
          ) : (
            <span>Review solution before finalizing</span>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadSolution}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            onClick={handleFinalize}
            disabled={saving || isCompleted || !solution}
            className="min-w-40"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle2 size={16} />
                Finalized
              </>
            ) : (
              <>
                <Save size={16} />
                Finalize & Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
