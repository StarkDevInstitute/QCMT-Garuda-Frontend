import { useEffect, useRef } from 'react'
import { platform } from '@/lib/platform'
import { useJobStore } from '@/stores/jobStore'

export interface TaskPollOptions {
  interval?: number
  maxAttempts?: number
  onComplete?: () => void
  onError?: (error: string) => void
}

/**
 * Poll task status when SSE is not available
 * Falls back to periodic HTTP polling
 */
export function useTaskPolling(
  taskId: string | null,
  jobId: string,
  stage: string,
  enabled: boolean = true,
  options: TaskPollOptions = {}
) {
  const { updateStageProgress, addLog } = useJobStore()
  const pollIntervalRef = useRef<number | null>(null)
  const attemptCountRef = useRef(0)

  const {
    interval = 2000,
    maxAttempts = 300, // 10 minutes at 2s intervals
    onComplete,
    onError,
  } = options

  useEffect(() => {
    if (!taskId || !enabled) {
      return
    }

    attemptCountRef.current = 0

    const poll = async () => {
      try {
        attemptCountRef.current++

        if (attemptCountRef.current > maxAttempts) {
          addLog(jobId, 'error', 'Task polling timeout exceeded', stage)
          onError?.('Polling timeout')
          
          updateStageProgress(jobId, stage as any, {
            status: 'failed',
            progress: 0,
          })
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          return
        }

        const status = await platform.pollTaskStatus(taskId)

        if (status.status === 'completed') {
          addLog(jobId, 'success', `${stage} completed`, stage)
          
          updateStageProgress(jobId, stage as any, {
            status: 'completed',
            progress: 100,
          })
          
          onComplete?.()
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        } else if (status.status === 'failed') {
          const errorMsg = status.error || status.message || 'Task failed'
          addLog(jobId, 'error', errorMsg, stage)
          
          updateStageProgress(jobId, stage as any, {
            status: 'failed',
            progress: 0,
          })
          
          onError?.(errorMsg)
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        } else if (status.status === 'running') {
          // Update progress if available
          if (status.message) {
            addLog(jobId, 'info', status.message, stage)
          }
        }
      } catch (error) {
        console.error('[useTaskPolling] Poll error:', error)
        
        // Don't fail immediately on network errors, retry
        if (attemptCountRef.current % 5 === 0) {
          addLog(jobId, 'warn', 'Polling connection issues, retrying...', stage)
        }
      }
    }

    // Initial poll
    poll()

    // Set up interval
    pollIntervalRef.current = window.setInterval(poll, interval)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [taskId, enabled, jobId, stage, interval, maxAttempts, onComplete, onError, updateStageProgress, addLog])

  return {
    attemptCount: attemptCountRef.current,
    stop: () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    },
  }
}
