import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Play, CheckCircle2, Wand2 } from 'lucide-react'
import { useJobStore } from '@/stores/jobStore'
import { platform } from '@/lib/platform'
import { useTaskProgressStream } from '@/hooks/useTaskStream'
import { useTaskPolling } from '@/hooks/useTaskPolling'

interface InversionStageProps {
  jobId: string
}

export function InversionStage({ jobId }: InversionStageProps) {
  const { jobs, updateStageProgress, addLog, addTask, updateTask } = useJobStore()
  const job = jobs.find((j) => j.jobId === jobId)
  const [running, setRunning] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  
  // Frequency band controls
  const [lowFreq, setLowFreq] = useState(0.01)
  const [highFreq, setHighFreq] = useState(0.05)

  // Get stream URL for current task
  const streamUrl = currentTaskId ? platform.getTaskResultStreamUrl(currentTaskId) : null
  
  // Connect to SSE stream for real-time progress
  const { isConnected } = useTaskProgressStream(
    streamUrl,
    jobId,
    'inversion',
    !!currentTaskId && running
  )

  // Fallback to polling if SSE is not connected
  useTaskPolling(
    currentTaskId,
    jobId,
    'inversion',
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

  const stageProgress = job.stageProgress.find((s) => s.stage === 'inversion')
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
    addLog(jobId, 'info', 'Starting moment tensor inversion...', 'inversion')

    try {
      // Update frequency bounds
      await platform.patchFrequency(jobId, lowFreq, highFreq)
      addLog(jobId, 'info', `Frequency range: ${lowFreq}-${highFreq} Hz`, 'inversion')

      // Start inversion task
      const response = await platform.runInversion(jobId)
      const taskId = response.task_id
      
      setCurrentTaskId(taskId)
      
      // Track task in job store
      addTask(jobId, {
        taskId,
        stage: 'inversion',
        status: 'running',
        pollUrl: response.poll_url,
        streamUrl: platform.getTaskResultStreamUrl(taskId),
        startedAt: new Date(),
      })
      
      updateStageProgress(jobId, 'inversion', {
        status: 'running',
        progress: 0,
      })

      addLog(jobId, 'info', `Inversion task started: ${taskId}`, 'inversion')
      addLog(jobId, 'info', isConnected ? 'Real-time streaming connected' : 'Using polling fallback', 'inversion')

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addLog(jobId, 'error', `Inversion failed: ${message}`, 'inversion')
      
      updateStageProgress(jobId, 'inversion', {
        status: 'failed',
        progress: 0,
      })
      setRunning(false)
      setCurrentTaskId(null)
    }
  }

  const handleCancel = async () => {
    try {
      if (currentTaskId) {
        await platform.cancelTask(currentTaskId)
        addLog(jobId, 'warn', 'Inversion cancelled by user', 'inversion')
        
        updateTask(jobId, currentTaskId, {
          status: 'failed',
          completedAt: new Date(),
          error: 'Cancelled by user',
        })
      }
      
      updateStageProgress(jobId, 'inversion', {
        status: 'failed',
        progress: stageProgress?.progress || 0,
      })
      setRunning(false)
    } catch (error) {
      addLog(jobId, 'error', `Failed to cancel: ${error}`, 'inversion')
    }
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-semibold text-foreground">Moment Tensor Inversion</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Compute best-fit moment tensor solution using selected waveforms
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <div className="max-w-3xl w-full space-y-6">
          {/* Status Display */}
          {isCompleted && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 size={24} className="text-green-500 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-green-500">Inversion Completed</p>
                <p className="text-sm text-muted-foreground">
                  Moment tensor solution computed successfully
                </p>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="text-destructive">⚠</div>
              <div>
                <p className="font-medium text-destructive">Inversion Failed</p>
                <p className="text-sm text-muted-foreground">
                  Check bulletin logs for error details
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
                  <p className="font-medium">Inversion in Progress</p>
                  <p className="text-sm text-muted-foreground">
                    Computing moment tensor solution...
                  </p>
                </div>
                <div className="flex items-center gap-2 mr-2">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="text-destructive hover:text-destructive"
                >
                  Cancel
                </Button>
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

          {/* Control Panel */}
          <div className="p-6 border border-border rounded-lg space-y-6">
            <div>
              <h3 className="font-medium text-foreground mb-1">Inversion Parameters</h3>
              <p className="text-sm text-muted-foreground">
                Configure frequency band and waveform filtering
              </p>
            </div>

            {/* Frequency Band Controls */}
            <div className="grid grid-cols-2 gap-6">
              {/* Low Frequency */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Low Frequency (Hz)</label>
                  <span className="text-sm text-muted-foreground font-mono">{lowFreq.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.1"
                  step="0.001"
                  value={lowFreq}
                  onChange={(e) => setLowFreq(Number(e.target.value))}
                  disabled={running || isCompleted}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.001</span>
                  <span>0.1</span>
                </div>
              </div>

              {/* High Frequency */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">High Frequency (Hz)</label>
                  <span className="text-sm text-muted-foreground font-mono">{highFreq.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="1.0"
                  step="0.01"
                  value={highFreq}
                  onChange={(e) => setHighFreq(Number(e.target.value))}
                  disabled={running || isCompleted}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.01</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>

            {/* Frequency Range Display */}
            <div className="p-3 bg-muted/50 rounded text-sm">
              <span className="text-muted-foreground">Pass-band filter: </span>
              <span className="font-medium font-mono">{lowFreq.toFixed(3)} - {highFreq.toFixed(3)} Hz</span>
              <span className="text-muted-foreground ml-3">
                (Period: {(1 / highFreq).toFixed(1)} - {(1 / lowFreq).toFixed(1)} s)
              </span>
            </div>

            {/* Validation */}
            {lowFreq >= highFreq && !isCompleted && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                ⚠ Low frequency must be less than high frequency
              </div>
            )}
          </div>

          {/* Method Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Wand2 size={16} />
              <span className="font-medium">Inversion Method: {job.config.targetMethod}</span>
            </div>
            <ul className="text-muted-foreground space-y-1 ml-6">
              <li>• {job.config.isDeviatoric ? 'Deviatoric constraint' : 'Full moment tensor'}</li>
              <li>• {job.config.centroidInversion ? 'Centroid time/location inversion enabled' : 'Fixed hypocenter'}</li>
              <li>• {job.config.autoGf ? 'Automatic Green\'s functions' : 'Pre-computed GF database'}</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleRun}
              disabled={running || isCompleted || lowFreq >= highFreq}
              className="w-full h-12 text-base"
            >
              {running ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Running Inversion...
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle2 size={18} />
                  Completed
                </>
              ) : (
                <>
                  <Play size={18} />
                  Run Moment Tensor Inversion
                </>
              )}
            </Button>

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
              <li>Filter waveforms to selected frequency band</li>
              <li>Compute synthetic seismograms from trial moment tensors</li>
              <li>Calculate waveform misfit and variance reduction</li>
              <li>Perform grid search or gradient descent optimization</li>
              <li>Determine best-fit focal mechanism and scalar moment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
