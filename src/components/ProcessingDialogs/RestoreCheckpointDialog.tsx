import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, RotateCcw, Loader2 } from 'lucide-react'
import { platform } from '@/lib/platform'
import { useJobStore } from '@/stores/jobStore'
import type { CheckpointSchema } from '@/lib/api/automt-client'

interface RestoreCheckpointDialogProps {
  jobId: string
  onClose: () => void
}

export function RestoreCheckpointDialog({ jobId, onClose }: RestoreCheckpointDialogProps) {
  const [checkpoints, setCheckpoints] = useState<CheckpointSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { addLog } = useJobStore()

  useEffect(() => {
    loadCheckpoints()
  }, [jobId])

  const loadCheckpoints = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await platform.listCheckpoints(jobId)
      setCheckpoints(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load checkpoints'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedCheckpoint) return

    setRestoring(true)
    setError(null)

    try {
      await platform.restoreCheckpoint(jobId, selectedCheckpoint)
      addLog(jobId, 'success', `Checkpoint restored: ${selectedCheckpoint}`, 'system')
      onClose()
      
      // Refresh page to reload job state
      window.location.reload()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore checkpoint'
      setError(message)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <RotateCcw size={16} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Restore Checkpoint</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={restoring}
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a checkpoint to restore the processing state.
          </p>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && checkpoints.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No checkpoints available for this job.
            </div>
          )}

          {!loading && checkpoints.length > 0 && (
            <div className="space-y-2">
              {checkpoints.map((cp) => (
                <label
                  key={cp.checkpoint_id}
                  className={`
                    flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedCheckpoint === cp.checkpoint_id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="checkpoint"
                    value={cp.checkpoint_id}
                    checked={selectedCheckpoint === cp.checkpoint_id}
                    onChange={(e) => setSelectedCheckpoint(e.target.value)}
                    disabled={restoring}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-medium">
                      {cp.checkpoint_id}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Stage: <span className="font-medium">{cp.stage}</span>
                      {' • '}
                      {new Date(cp.created_at).toLocaleString()}
                    </div>
                    {cp.description && (
                      <div className="text-sm text-foreground mt-1">
                        {cp.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded p-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={restoring}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleRestore}
            disabled={restoring || !selectedCheckpoint}
          >
            {restoring ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw size={14} className="mr-2" />
                Restore
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
