import { useEffect, useRef, useCallback } from 'react'
import {
  SSEClient,
  createTaskLogStream,
  createTaskProgressStream,
  type TaskLogEntry,
  type TaskProgressUpdate,
} from '@/lib/sse-client'
import { useJobStore } from '@/stores/jobStore'

/**
 * React hook for consuming task log SSE stream
 */
export function useTaskLogStream(
  streamUrl: string | null,
  jobId: string,
  enabled: boolean = true
) {
  const clientRef = useRef<SSEClient | null>(null)
  const addLog = useJobStore((state) => state.addLog)

  const handleLog = useCallback(
    (log: TaskLogEntry) => {
      // Map SSE log levels to bulletin log levels
      const level =
        log.level === 'warning'
          ? 'warn'
          : log.level === 'debug'
          ? 'info'
          : log.level === 'success'
          ? 'success'
          : log.level

      addLog(jobId, level, log.message, log.source)
    },
    [jobId, addLog]
  )

  const handleError = useCallback(
    (error: Event) => {
      console.error('[useTaskLogStream] Stream error:', error)
      addLog(jobId, 'error', 'Log stream connection error', 'sse')
    },
    [jobId, addLog]
  )

  useEffect(() => {
    if (!streamUrl || !enabled) {
      return
    }

    console.log('[useTaskLogStream] Connecting to:', streamUrl)
    clientRef.current = createTaskLogStream(streamUrl, handleLog, handleError)
    clientRef.current.connect()

    return () => {
      if (clientRef.current) {
        console.log('[useTaskLogStream] Disconnecting')
        clientRef.current.close()
        clientRef.current = null
      }
    }
  }, [streamUrl, enabled, handleLog, handleError])

  return {
    isConnected: clientRef.current?.isConnected() ?? false,
    disconnect: () => clientRef.current?.close(),
  }
}

/**
 * React hook for consuming task progress SSE stream
 */
export function useTaskProgressStream(
  streamUrl: string | null,
  jobId: string,
  stage: string,
  enabled: boolean = true
) {
  const clientRef = useRef<SSEClient | null>(null)
  const { updateStageProgress, addLog } = useJobStore()

  const handleProgress = useCallback(
    (progress: TaskProgressUpdate) => {
      console.log('[useTaskProgressStream] Progress update:', progress)

      // Update stage progress
      if (progress.progress !== undefined) {
        updateStageProgress(jobId, stage as any, {
          status: progress.status === 'completed' ? 'completed' : progress.status === 'failed' ? 'failed' : 'running',
          progress: progress.progress,
        })
      }

      // Add progress message to logs
      if (progress.message) {
        const level = progress.status === 'failed' ? 'error' : progress.status === 'completed' ? 'success' : 'info'
        addLog(jobId, level, progress.message, stage)
      }

      // Add error to logs
      if (progress.error) {
        addLog(jobId, 'error', progress.error, stage)
      }

      // Log completion
      if (progress.status === 'completed') {
        addLog(jobId, 'success', `${stage} completed successfully`, stage)
      }
    },
    [jobId, stage, updateStageProgress, addLog]
  )

  const handleError = useCallback(
    (error: Event) => {
      console.error('[useTaskProgressStream] Stream error:', error)
      addLog(jobId, 'error', 'Progress stream connection error', 'sse')
    },
    [jobId, addLog]
  )

  useEffect(() => {
    if (!streamUrl || !enabled) {
      return
    }

    console.log('[useTaskProgressStream] Connecting to:', streamUrl)
    clientRef.current = createTaskProgressStream(streamUrl, handleProgress, handleError)
    clientRef.current.connect()

    return () => {
      if (clientRef.current) {
        console.log('[useTaskProgressStream] Disconnecting')
        clientRef.current.close()
        clientRef.current = null
      }
    }
  }, [streamUrl, enabled, handleProgress, handleError])

  return {
    isConnected: clientRef.current?.isConnected() ?? false,
    disconnect: () => clientRef.current?.close(),
  }
}

/**
 * Combined hook for both log and progress streams
 */
export function useTaskStreams(
  taskId: string | null,
  jobId: string,
  stage: string,
  enabled: boolean = true
) {
  const { platform } = usePlatform()

  const logStreamUrl = taskId ? platform.getTaskLogStreamUrl(taskId) : null
  const progressStreamUrl = taskId ? platform.getTaskResultStreamUrl(taskId) : null

  const logStream = useTaskLogStream(logStreamUrl, jobId, enabled)
  const progressStream = useTaskProgressStream(progressStreamUrl, jobId, stage, enabled)

  return {
    isConnected: logStream.isConnected || progressStream.isConnected,
    disconnect: () => {
      logStream.disconnect()
      progressStream.disconnect()
    },
  }
}

// Helper hook to get platform
function usePlatform() {
  // Import platform dynamically to avoid circular dependencies
  const { platform } = require('@/lib/platform')
  return { platform }
}
