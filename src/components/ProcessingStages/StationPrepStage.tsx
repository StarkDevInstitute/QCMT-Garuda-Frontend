import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Play, CheckCircle2 } from 'lucide-react'
import { useJobStore } from '@/stores/jobStore'
import { platform } from '@/lib/platform'
import { useTaskProgressStream } from '@/hooks/useTaskStream'
import { useTaskPolling } from '@/hooks/useTaskPolling'

interface StationPrepStageProps {
  jobId: string
}

export function StationPrepStage({ jobId }: StationPrepStageProps) {
  const { jobs, updateStageProgress, addLog, addTask, updateTask } = useJobStore()
  const job = jobs.find((j) => j.jobId === jobId)
  const [running, setRunning] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

  // SSE streaming for real-time progress
  const streamUrl = currentTaskId ? platform.getTaskResultStreamUrl(currentTaskId) : null
  const { isConnected } = useTaskProgressStream(
    streamUrl,
    jobId,
    'station-prep',
    !!currentTaskId && running
  )

  // Fallback to polling if SSE not connected
  useTaskPolling(
    currentTaskId,
    jobId,
    'station-prep',
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

  const stageProgress = job.stageProgress.find((s) => s.stage === 'station-prep')
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
    addLog(jobId, 'info', 'Starting station preparation...', 'station-prep')

    try {
      const response = await platform.runStationPrep(jobId)
      const taskId = response.task_id
      
      setCurrentTaskId(taskId)
      
      addTask(jobId, {
        taskId,
        stage: 'station-prep',
        status: 'running',
        pollUrl: response.poll_url,
        streamUrl: platform.getTaskResultStreamUrl(taskId),
        startedAt: new Date(),
      })
      
      updateStageProgress(jobId, 'station-prep', {
        status: 'running',
        progress: 0,
      })

      addLog(jobId, 'info', `Station preparation task started: ${taskId}`, 'station-prep')
      addLog(jobId, 'info', isConnected ? 'Real-time streaming connected' : 'Using polling fallback', 'station-prep')

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      addLog(jobId, 'error', `Station preparation failed: ${message}`, 'station-prep')
      
      updateStageProgress(jobId, 'station-prep', {
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
        <h2 className="text-xl font-semibold text-foreground">Station Preparation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Load available stations and calculate theoretical arrival times
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-6">
          {/* Status Display */}
          {isCompleted && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 size={24} className="text-green-500 shrink-0" />
              <div>
                <p className="font-medium text-green-500">Completed</p>
                <p className="text-sm text-muted-foreground">
                  Stations prepared successfully
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
                  Station preparation encountered an error
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
                  <p className="font-medium">Station Preparation in Progress</p>
                  <p className="text-sm text-muted-foreground">
                    Loading stations and calculating arrivals...
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

          {/* Action Button */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleRun}
              disabled={running || isCompleted}
              className="w-full h-12 text-base"
            >
              {running ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Running...
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle2 size={18} />
                  Completed
                </>
              ) : (
                <>
                  <Play size={18} />
                  Run Station Preparation
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
                Re-run
              </Button>
            )}
          </div>

          {/* Description */}
          <div className="text-sm text-muted-foreground space-y-2 p-4 bg-muted/50 rounded-lg">
            <p className="font-medium text-foreground">What happens in this stage:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Load station metadata from FDSN/inventory</li>
              <li>Calculate theoretical P and S wave arrival times</li>
              <li>Filter stations based on distance range</li>
              <li>Prepare station list for waveform download</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
