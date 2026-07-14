import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Play, CheckCircle2 } from 'lucide-react'
import { useJobStore } from '@/stores/jobStore'
import { platform } from '@/lib/platform'
import { useTaskProgressStream } from '@/hooks/useTaskStream'
import { useTaskPolling } from '@/hooks/useTaskPolling'

interface WaveformPrepStageProps {
  jobId: string
}

export function WaveformPrepStage({ jobId }: WaveformPrepStageProps) {
  const { jobs, updateStageProgress, addLog, addTask, updateTask } = useJobStore()
  const job = jobs.find((j) => j.jobId === jobId)
  const [running, setRunning] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [minDistance, setMinDistance] = useState(0)
  const [maxDistance, setMaxDistance] = useState(2000)

  // SSE streaming
  const streamUrl = currentTaskId ? platform.getTaskResultStreamUrl(currentTaskId) : null
  const { isConnected } = useTaskProgressStream(
    streamUrl,
    jobId,
    'waveform-prep',
    !!currentTaskId && running
  )

  // Polling fallback
  useTaskPolling(
    currentTaskId,
    jobId,
    'waveform-prep',
    !!currentTaskId && running && !isConnected,
    {
      interval: 2000,
      onComplete: () => {
        setRunning(false)
        setCurrentTaskId(null)
      },
      onError: () => {
        setRunning(false)
        setCurrentTaskId(null)
      },
    }
  )

  if (!job) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Job not found
      </div>
    )
  }

  const stageProgress = job.stageProgress.find((s) => s.stage === 'waveform-prep')
  const isCompleted = stageProgress?.status === 'completed'
  const isFailed = stageProgress?.status === 'failed'
  const isRunning = stageProgress?.status === 'running'

  // Auto-stop running state when stage completes
  useEffect(() => {
    if (isCompleted || isFailed) {
      setRunning(false)
      setCurrentTaskId(null)
    }
  }, [isCompleted, isFailed])

  const handleRun = async () => {
    setRunning(true)
    addLog(jobId, 'info', `Starting waveform preparation (distance: ${minDistance}-${maxDistance} km)...`, 'waveform-prep')

    try {
      // Update distance bounds first
      await platform.patchDistanceBounds(jobId, minDistance, maxDistance)
      addLog(jobId, 'info', `Distance bounds set: ${minDistance}-${maxDistance} km`, 'waveform-prep')

      // Run waveform preparation
      const response = await platform.runWaveformPrep(jobId)
      const taskId = response.task_id
      
      setCurrentTaskId(taskId)
      
      addTask(jobId, {
        taskId,
        stage: 'waveform-prep',
        status: 'running',
        pollUrl: response.poll_url,
        streamUrl: platform.getTaskResultStreamUrl(taskId),
        startedAt: new Date(),
      })
      
      updateStageProgress(jobId, 'waveform-prep', {
        status: 'running',
        progress: 0,
      })

      addLog(jobId, 'info', `Waveform preparation task started: ${taskId}`, 'waveform-prep')
      addLog(jobId, 'info', isConnected ? 'Real-time streaming connected' : 'Using polling fallback', 'waveform-prep')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addLog(jobId, 'error', `Waveform preparation failed: ${message}`, 'waveform-prep')
      
      updateStageProgress(jobId, 'waveform-prep', {
        status: 'failed',
        progress: 0,
      })
      setRunning(false)
      setCurrentTaskId(null)
    }
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-semibold text-foreground">Waveform Preparation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Download and prepare seismic waveforms from selected data source
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl w-full space-y-6">
          {/* Status Display */}
          {isCompleted && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 size={24} className="text-green-500 shrink-0" />
              <div>
                <p className="font-medium text-green-500">Completed</p>
                <p className="text-sm text-muted-foreground">
                  Waveforms downloaded and prepared successfully
                </p>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="text-destructive">⚠</div>
              <div>
                <p className="font-medium text-destructive">Failed</p>
                <p className="text-sm text-muted-foreground">
                  Waveform preparation encountered an error
                </p>
              </div>
            </div>
          )}

          {/* Progress Display */}
          {isRunning && stageProgress && (
            <div className="p-6 border border-primary/30 bg-primary/5 rounded-lg space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Waveform Preparation in Progress</p>
                  <p className="text-sm text-muted-foreground">
                    Downloading and processing waveforms...
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Live</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-xs text-muted-foreground">Polling</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{stageProgress.progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${stageProgress.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Distance Bounds Controls */}
          <div className="p-6 border border-border rounded-lg space-y-6">
            <div>
              <h3 className="font-medium text-foreground mb-4">Distance Bounds</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Set epicentral distance range for station selection
              </p>
            </div>

            {/* Min Distance Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Minimum Distance</label>
                <span className="text-sm text-muted-foreground">{minDistance} km</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={minDistance}
                onChange={(e) => setMinDistance(Number(e.target.value))}
                disabled={running || isCompleted}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              />
            </div>

            {/* Max Distance Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Maximum Distance</label>
                <span className="text-sm text-muted-foreground">{maxDistance} km</span>
              </div>
              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                disabled={running || isCompleted}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              />
            </div>

            {/* Range Display */}
            <div className="p-3 bg-muted/50 rounded text-sm">
              <span className="text-muted-foreground">Selected range: </span>
              <span className="font-medium">{minDistance} - {maxDistance} km</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleRun}
              disabled={running || isCompleted || minDistance >= maxDistance}
              className="w-full h-12 text-base"
            >
              {running ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Downloading Waveforms...
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle2 size={18} />
                  Completed
                </>
              ) : (
                <>
                  <Play size={18} />
                  Run Waveform Preparation
                </>
              )}
            </Button>

            {minDistance >= maxDistance && !isCompleted && (
              <p className="text-sm text-destructive text-center">
                Minimum distance must be less than maximum distance
              </p>
            )}

            {isCompleted && (
              <Button
                variant="outline"
                onClick={handleRun}
                disabled={running}
                className="w-full"
              >
                Re-run with Different Parameters
              </Button>
            )}
          </div>

          {/* Description */}
          <div className="text-sm text-muted-foreground space-y-2 p-4 bg-muted/50 rounded-lg">
            <p className="font-medium text-foreground">What happens in this stage:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Download raw waveforms from configured data source (FDSN/ArcLink/etc)</li>
              <li>Apply instrument response correction</li>
              <li>Resample to uniform sampling rate</li>
              <li>Cut waveforms to processing time windows</li>
              <li>Calculate signal-to-noise ratios</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
