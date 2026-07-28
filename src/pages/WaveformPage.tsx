import { useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useWaveformStore } from '@/stores/waveformStore'
import { WaveformLayout } from '@/components/Waveform/WaveformLayout'
import { WaveformLeftSidebar } from '@/components/Waveform/WaveformLeftSidebar'
import { WaveformCenterArea } from '@/components/Waveform/WaveformCenterArea'
import { WaveformRightSidebar } from '@/components/Waveform/WaveformRightSidebar'

export function WaveformPage() {
  const { eventId } = useParams<{ eventId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const {
    loadWaveforms,
    startProgressTracking,
    stopProgressTracking,
    context,
    isLoading,
    error,
    reset,
    isWaveformPrepReady,
    progressSnapshot,
  } = useWaveformStore()

  useEffect(() => {
    if (!eventId) {
      // No event ID in URL, redirect to events page
      navigate('/events')
      return
    }

    // Prefer jobId passed from interactive initialization flow.
    // Keep fallback for direct navigation and existing tests.
    const jobId = searchParams.get('jobId') || `job_${eventId}`
    void startProgressTracking(jobId)
    void loadWaveforms(jobId)

    // Cleanup on unmount
    return () => {
      stopProgressTracking()
      reset()
    }
  }, [eventId, loadWaveforms, navigate, reset, searchParams, startProgressTracking, stopProgressTracking])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium">Loading waveform data...</div>
          <div className="mt-2 text-xs text-muted-foreground">
            Fetching processing context and station waveforms
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <div className="text-sm font-medium text-red-900 dark:text-red-100">
            Failed to load waveform data
          </div>
          <div className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</div>
          <button
            onClick={() => navigate('/events')}
            className="mt-4 rounded bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
          >
            Back to Events
          </button>
        </div>
      </div>
    )
  }

  if (!context) {
    if (!isWaveformPrepReady) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6">
            <div className="text-sm font-semibold">Waiting for WAVEFORM_PREP to complete</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Stage: {progressSnapshot.stage || 'unknown'} | Status: {progressSnapshot.status || 'running'}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.max(0, Math.min(100, progressSnapshot.progress || 0))}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {progressSnapshot.message || 'Preparing waveforms. Please wait...'}
            </div>
            <button
              onClick={() => navigate('/events')}
              className="mt-4 rounded border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-accent"
            >
              Back to Events
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground">No waveform data available</div>
          <button
            onClick={() => navigate('/events')}
            className="mt-4 rounded border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-accent"
          >
            Back to Events
          </button>
        </div>
      </div>
    )
  }

  return (
    <WaveformLayout
      leftSidebar={<WaveformLeftSidebar />}
      centerArea={<WaveformCenterArea />}
      rightSidebar={<WaveformRightSidebar />}
    />
  )
}

