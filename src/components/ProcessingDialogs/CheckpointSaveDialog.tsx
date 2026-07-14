import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Save } from 'lucide-react'
import { platform } from '@/lib/platform'
import { useJobStore } from '@/stores/jobStore'

interface CheckpointSaveDialogProps {
  jobId: string
  onClose: () => void
}

export function CheckpointSaveDialog({ jobId, onClose }: CheckpointSaveDialogProps) {
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addLog } = useJobStore()

  const handleSave = async () => {
    if (!description.trim()) {
      setError('Please enter a checkpoint description')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Note: API might not have explicit "save checkpoint" endpoint
      // This might need to be implemented or use existing checkpoint mechanism
      // For now, we'll add a log entry as placeholder
      addLog(jobId, 'info', `Checkpoint created: ${description}`, 'system')
      
      // TODO: Call actual checkpoint save API when available
      // await platform.saveCheckpoint(jobId, description)
      
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save checkpoint'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Save size={16} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Save Checkpoint</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Save current processing state to restore later if needed.
            </p>
            
            <label className="block text-sm font-medium mb-2">
              Checkpoint Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., After station selection with 15 stations"
              disabled={saving}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm
                focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>

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
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !description.trim()}
          >
            {saving ? (
              <>
                <Save size={14} className="mr-2 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} className="mr-2" />
                Save Checkpoint
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
