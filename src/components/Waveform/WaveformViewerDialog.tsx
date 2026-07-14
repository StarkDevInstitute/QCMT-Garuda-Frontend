import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { JobWaveformPanel } from '@/components/Waveform/JobWaveformPanel'

interface WaveformViewerDialogProps {
  jobId: string
  onClose: () => void
}

export function WaveformViewerDialog({ jobId, onClose }: WaveformViewerDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Waveform Viewer</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Observed vs Synthetic Waveforms
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <JobWaveformPanel jobId={jobId} />
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
