import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useJobStore } from '@/stores/jobStore'
import { platform } from '@/lib/platform'
import { BulletinPanel } from '@/components/BulletinPanel/BulletinPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Save,
  RotateCcw,
  History,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  LineChart,
} from 'lucide-react'
import type { ProcessingStage } from '@/lib/api/automt-client'
import { StationPrepStage } from '@/components/ProcessingStages/StationPrepStage'
import { WaveformPrepStage } from '@/components/ProcessingStages/WaveformPrepStage'
import { StationSelectionStage } from '@/components/ProcessingStages/StationSelectionStage'
import { InversionStage } from '@/components/ProcessingStages/InversionStage'
import { FinalizeStage } from '@/components/ProcessingStages/FinalizeStage'
import { WaveformViewerDialog } from '@/components/Waveform/WaveformViewerDialog'
import { CheckpointSaveDialog } from '@/components/ProcessingDialogs/CheckpointSaveDialog'
import { RestoreCheckpointDialog } from '@/components/ProcessingDialogs/RestoreCheckpointDialog'
import { PatchHistoryDialog } from '@/components/ProcessingDialogs/PatchHistoryDialog'

const STAGE_ORDER: ProcessingStage[] = [
  'station-prep',
  'waveform-prep',
  'station-selection',
  'inversion',
  'finalize',
]

const STAGE_LABELS: Record<ProcessingStage, string> = {
  'station-prep': 'Station Preparation',
  'waveform-prep': 'Waveform Preparation',
  'station-selection': 'Station Selection',
  'inversion': 'Moment Tensor Inversion',
  'finalize': 'Finalization & Results',
}

export function ProcessingPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { getJob, deleteJob } = useJobStore()
  const job = jobId ? getJob(jobId) : undefined

  const [selectedStage, setSelectedStage] = useState<ProcessingStage | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showWaveformViewer, setShowWaveformViewer] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (job && !selectedStage) {
      // Auto-select current stage or first pending stage
      const currentStage = job.currentStage ?? job.pendingStages[0] ?? STAGE_ORDER[0]
      setSelectedStage(currentStage)
    }
  }, [job, selectedStage])

  const handleDelete = async () => {
    if (!jobId) return

    setIsDeleting(true)
    try {
      // Delete from backend
      await platform.deleteJob(jobId)
      
      // Delete from store
      deleteJob(jobId)
      
      // Navigate back
      navigate('/events')
    } catch (error) {
      console.error('Failed to delete job:', error)
      alert('Failed to delete job. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!jobId || !job) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-destructive" size={48} />
          <h2 className="text-lg font-semibold text-foreground mb-2">Job Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The requested processing job could not be found.
          </p>
          <Button onClick={() => navigate('/events')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    )
  }

  const getStageStatus = (stage: ProcessingStage): 'completed' | 'running' | 'pending' | 'failed' => {
    const progress = job.stageProgress.find((sp) => sp.stage === stage)
    if (progress) {
      return progress.status === 'completed'
        ? 'completed'
        : progress.status === 'failed'
        ? 'failed'
        : progress.status === 'running'
        ? 'running'
        : 'pending'
    }
    
    if (job.currentStage === stage) {
      return 'running'
    }
    
    if (job.pendingStages.includes(stage)) {
      return 'pending'
    }
    
    const stageIndex = STAGE_ORDER.indexOf(stage)
    const currentIndex = job.currentStage ? STAGE_ORDER.indexOf(job.currentStage) : -1
    
    return stageIndex < currentIndex ? 'completed' : 'pending'
  }

  const StageIcon = ({ status }: { status: ReturnType<typeof getStageStatus> }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={20} className="text-green-500" />
      case 'running':
        return <Loader2 size={20} className="text-primary animate-spin" />
      case 'failed':
        return <AlertCircle size={20} className="text-destructive" />
      default:
        return <Circle size={20} className="text-muted-foreground" />
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Interactive Processing
            </h1>
            <p className="text-xs text-muted-foreground">
              Event: {job.eventId} • Job: {job.jobId.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowHistoryDialog(true)}
            className="flex items-center gap-2"
          >
            <History size={14} />
            History
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCheckpointDialog(true)}
            className="flex items-center gap-2"
          >
            <Save size={14} />
            Checkpoint
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowRestoreDialog(true)}
            className="flex items-center gap-2"
          >
            <RotateCcw size={14} />
            Restore
          </Button>
          {/* Show Waveform Viewer button only when waveform-prep is completed */}
          {job.stageProgress.find((s) => s.stage === 'waveform-prep')?.status === 'completed' && (
            <>
              <div className="h-6 w-px bg-border" />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowWaveformViewer(true)}
                className="flex items-center gap-2"
              >
                <LineChart size={14} />
                View Waveforms
              </Button>
            </>
          )}
          <div className="h-6 w-px bg-border" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-destructive mt-1" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Delete Processing Job?</h3>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete job {jobId?.slice(0, 8)} and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Job
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Stage Navigator Sidebar */}
        <div className="w-64 border-r border-border bg-card overflow-y-auto">
          <div className="p-4 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Processing Stages
            </h2>
            {STAGE_ORDER.map((stage, index) => {
              const status = getStageStatus(stage)
              const isSelected = selectedStage === stage
              
              return (
                <button
                  key={stage}
                  onClick={() => setSelectedStage(stage)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors text-left ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <StageIcon status={status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        Stage {index + 1}
                      </span>
                      {status === 'completed' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Done
                        </Badge>
                      )}
                      {status === 'running' && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          Running
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm font-medium mt-0.5 ${
                      isSelected ? 'text-foreground' : 'text-foreground/80'
                    }`}>
                      {STAGE_LABELS[stage]}
                    </p>
                    {status === 'completed' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {job.stageProgress.find((sp) => sp.stage === stage)?.duration_s
                          ? `${job.stageProgress.find((sp) => sp.stage === stage)!.duration_s!.toFixed(1)}s`
                          : 'Completed'
                        }
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Stage Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Stage Panel */}
          <div className="flex-1 overflow-hidden">
            {selectedStage === 'station-prep' && <StationPrepStage jobId={jobId} />}
            {selectedStage === 'waveform-prep' && <WaveformPrepStage jobId={jobId} />}
            {selectedStage === 'station-selection' && <StationSelectionStage jobId={jobId} />}
            {selectedStage === 'inversion' && <InversionStage jobId={jobId} />}
            {selectedStage === 'finalize' && <FinalizeStage jobId={jobId} />}
          </div>

          {/* Bulletin Panel */}
          <div className="border-t border-border bg-card h-64 flex-shrink-0">
            <BulletinPanel
              entries={job.logs.map((log) => ({
                timestamp: log.timestamp,
                level: log.level,
                message: log.message,
              }))}
            />
          </div>
        </div>
      </div>

      {/* Waveform Viewer Dialog */}
      {showWaveformViewer && (
        <WaveformViewerDialog
          jobId={jobId}
          onClose={() => setShowWaveformViewer(false)}
        />
      )}

      {/* Checkpoint Save Dialog */}
      {showCheckpointDialog && (
        <CheckpointSaveDialog
          jobId={jobId}
          onClose={() => setShowCheckpointDialog(false)}
        />
      )}

      {/* Restore Checkpoint Dialog */}
      {showRestoreDialog && (
        <RestoreCheckpointDialog
          jobId={jobId}
          onClose={() => setShowRestoreDialog(false)}
        />
      )}

      {/* Patch History Dialog */}
      {showHistoryDialog && (
        <PatchHistoryDialog
          jobId={jobId}
          onClose={() => setShowHistoryDialog(false)}
        />
      )}
    </div>
  )
}
