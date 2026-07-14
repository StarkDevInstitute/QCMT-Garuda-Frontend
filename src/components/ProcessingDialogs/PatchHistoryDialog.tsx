import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, History, Loader2 } from 'lucide-react'
import { platform } from '@/lib/platform'
import type { PatchHistorySchema } from '@/lib/api/automt-client'

interface PatchHistoryDialogProps {
  jobId: string
  onClose: () => void
}

export function PatchHistoryDialog({ jobId, onClose }: PatchHistoryDialogProps) {
  const [history, setHistory] = useState<PatchHistorySchema[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [jobId])

  const loadHistory = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await platform.getPatchHistory(jobId)
      setHistory(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load patch history'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <History size={16} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Parameter Patch History</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-8">
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No parameter patches recorded yet.
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="space-y-3">
              {history.map((patch, idx) => (
                <div
                  key={idx}
                  className="border border-border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-medium text-foreground">
                      {patch.parameter_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(patch.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Previous Value</div>
                      <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {JSON.stringify(patch.old_value, null, 2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">New Value</div>
                      <div className="font-mono text-xs bg-primary/10 px-2 py-1 rounded">
                        {JSON.stringify(patch.new_value, null, 2)}
                      </div>
                    </div>
                  </div>

                  {patch.stage && (
                    <div className="text-xs text-muted-foreground">
                      Stage: <span className="font-medium">{patch.stage}</span>
                    </div>
                  )}

                  {patch.description && (
                    <div className="text-sm text-foreground mt-2">
                      {patch.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
