import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { platform } from '@/lib/platform'
import { useJobStore } from '@/stores/jobStore'
import type { SeismicEvent } from '@/types/seismology'
import { X, Play, Settings } from 'lucide-react'
import { formatUTC, formatLat, formatLon, formatDepth } from '@/lib/utils'

interface JobInitDialogProps {
  event: SeismicEvent
  onClose: () => void
}

export function JobInitDialog({ event, onClose }: JobInitDialogProps) {
  const navigate = useNavigate()
  const createJob = useJobStore((state) => state.createJob)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Extract event details
  const origin = event.origins.find((o) => o.id === event.preferredOriginId) ?? event.origins[0]
  const magnitude = event.magnitudes.find((m) => m.id === event.preferredMagnitudeId) ?? event.magnitudes[0]

  if (!origin || !magnitude) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md">
          <p className="text-destructive">Invalid event: missing origin or magnitude</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </div>
    )
  }

  // Form state
  const [waveformSource, setWaveformSource] = useState<'fdsn' | 'arclink' | 'seedlink' | 'file'>('fdsn')
  const [targetMethod, setTargetMethod] = useState<string>('QCMT_R')
  const [autoGf, setAutoGf] = useState(true)
  const [isDeviatoric, setIsDeviatoric] = useState(true)
  const [centroidInversion, setCentroidInversion] = useState(true)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      const jobRequest = {
        event_id: event.id,
        lat: origin.latitude.value,
        lon: origin.longitude.value,
        mag: magnitude.mag.value,
        depth: origin.depth?.value ?? 10,
        time: origin.time.value.toISOString(),
        waveform_source_type: waveformSource,
        auto_gf: autoGf,
        is_deviatoric: isDeviatoric,
        target_method: targetMethod,
        centroid_inversion: centroidInversion,
      }

      const response = await platform.createInteractiveJob(jobRequest)

      // Get job details
      const jobDetails = await platform.getJob(response.job_id)

      // Create job in store
      createJob(jobDetails, {
        waveformSourceType: waveformSource,
        targetMethod,
        autoGf,
        isDeviatoric,
        centroidInversion,
      })

      // Navigate to processing page
      navigate(`/processing/${response.job_id}`)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Start Interactive Processing</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Initialize moment tensor inversion workflow
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Event Summary */}
          <div className="bg-muted/30 rounded-md p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Event Details</span>
              <Badge variant="outline" className="font-mono text-xs">
                {event.id}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-muted-foreground">Time:</div>
              <div className="font-mono text-foreground">{formatUTC(origin.time.value)}</div>
              
              <div className="text-muted-foreground">Location:</div>
              <div className="font-mono text-foreground">
                {formatLat(origin.latitude.value)}, {formatLon(origin.longitude.value)}
              </div>
              
              <div className="text-muted-foreground">Depth:</div>
              <div className="font-mono text-foreground">{formatDepth(origin.depth?.value ?? 0)}</div>
              
              <div className="text-muted-foreground">Magnitude:</div>
              <div className="font-mono text-foreground">
                {magnitude.type} {magnitude.mag.value.toFixed(1)}
              </div>
              
              {origin.region && (
                <>
                  <div className="text-muted-foreground">Region:</div>
                  <div className="text-foreground">{origin.region}</div>
                </>
              )}
            </div>
          </div>

          {/* Basic Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Configuration</h3>
            
            {/* Waveform Source */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Waveform Source</label>
              <div className="grid grid-cols-4 gap-2">
                {(['fdsn', 'arclink', 'seedlink', 'file'] as const).map((source) => (
                  <button
                    key={source}
                    onClick={() => setWaveformSource(source)}
                    className={`px-3 py-2 text-sm rounded border transition-colors ${
                      waveformSource === source
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:border-primary/50'
                    }`}
                    disabled={loading}
                  >
                    {source.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Inversion Method */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Inversion Method</label>
              <select
                value={targetMethod}
                onChange={(e) => setTargetMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background text-foreground border border-border rounded hover:border-primary/50 focus:border-primary focus:outline-none transition-colors"
                disabled={loading}
              >
                <option value="QCMT_R">QCMT Regional</option>
                <option value="QCMT_T">QCMT Teleseismic</option>
                <option value="WPHASE_R">W-Phase Regional</option>
                <option value="WPHASE_T">W-Phase Teleseismic</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Auto Green's Functions
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoGf}
                    onChange={(e) => setAutoGf(e.target.checked)}
                    disabled={loading}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Deviatoric Constraint
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isDeviatoric}
                    onChange={(e) => setIsDeviatoric(e.target.checked)}
                    disabled={loading}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Centroid Inversion
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={centroidInversion}
                    onChange={(e) => setCentroidInversion(e.target.checked)}
                    disabled={loading}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
              </label>
            </div>
          </div>

          {/* Advanced Settings (collapsible) */}
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              <Settings size={16} />
              <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Settings</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-muted/20 rounded-md text-sm text-muted-foreground">
                <p>Advanced frequency bounds, grid parameters, and quality thresholds can be adjusted during the inversion stage.</p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Start Processing</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
