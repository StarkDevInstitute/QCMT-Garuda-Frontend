import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEventStore } from '@/stores/eventStore'
import { SplitPane } from '@/components/layout/SplitPane'
import { TensorPanel } from '@/components/TensorPanel/TensorPanel'
import { WaveformPanel } from '@/components/Waveform/WaveformPanel'
import { BeachBall2D } from '@/components/BeachBall/BeachBall2D'
import { Button } from '@/components/ui/button'
import { FileText, Radio, CheckCircle, ScrollText } from 'lucide-react'
import { platform } from '@/lib/platform'
import { useSettingsStore } from '@/stores/settingsStore'
import { getFocalDepthColor } from '@/lib/focal-mechanism-colors'

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center h-8 px-3 border-b border-border bg-card shrink-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
    </div>
  )
}

export function WaveformPage() {
  const navigate = useNavigate()
  const { selectedEventId, filter, setSelectedEvent } = useEventStore()
  const fdsnUrl = useSettingsStore((s) => s.settings.server.fdsnEventUrl)

  // Use the same events source/cache as MomentTensorPage to keep Tensor Details consistent.
  const { data: events = [] } = useQuery({
    queryKey: ['events', filter, fdsnUrl],
    queryFn: () => platform.getEvents(filter),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      const latest = events.reduce((a, b) => {
        const ta = a.origins[0]?.time.value.getTime() ?? 0
        const tb = b.origins[0]?.time.value.getTime() ?? 0
        return tb > ta ? b : a
      })
      setSelectedEvent(latest.id)
    }
  }, [events, selectedEventId, setSelectedEvent])

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  )

  const selectedFocal = useMemo(() => {
    if (!selectedEvent) return null
    return selectedEvent.focalMechanisms.find(
      (f) => f.id === selectedEvent.preferredFocalMechanismId
    ) ?? selectedEvent.focalMechanisms[0] ?? null
  }, [selectedEvent])

  const selectedOrigin = useMemo(() => {
    if (!selectedEvent) return null
    return selectedEvent.origins.find((o) => o.id === selectedEvent.preferredOriginId) ?? selectedEvent.origins[0] ?? null
  }, [selectedEvent])

  const focalColor = getFocalDepthColor(selectedOrigin?.depth?.value ?? 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0">
        <SplitPane
          left={
            <div className="h-full flex flex-col border-r border-border">
              <PanelHeader>Tensor Details</PanelHeader>
              {selectedFocal?.nodalPlanes && (
                <div className="border-b border-border px-2 py-2 flex items-center justify-center bg-card/40">
                  <BeachBall2D
                    nodalPlanes={selectedFocal.nodalPlanes}
                    size={96}
                    className="rounded-full"
                    compressionColor="#ffffff"
                    dilatationColor={focalColor}
                    strokeColor="#000000"
                    northLabelColor="#000000"
                  />
                </div>
              )}
              <div className="flex-1 min-h-0">
                <TensorPanel event={selectedEvent} />
              </div>
            </div>
          }
          right={
            <div className="h-full flex flex-col">
              <PanelHeader>
                {selectedEvent ? `Waveforms — ${selectedEvent.id}` : 'Waveforms'}
              </PanelHeader>
              <div className="flex-1 min-h-0">
                <WaveformPanel stations={[]} selectedEventId={selectedEventId} />
              </div>
            </div>
          }
          defaultSplit={25}
        />
      </div>

      {/* Footer buttons (match MomentTensor page) */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border bg-card shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-[11px] h-7"
        >
          <FileText size={12} /> Bulletin
        </Button>
        <Button variant="ghost" size="sm" className="text-[11px] h-7">
          <ScrollText size={12} /> Extended Log
        </Button>
        <Button variant="secondary" size="sm" className="text-[11px] h-7">
          <Radio size={12} /> Waveforms
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          disabled={!selectedEvent}
          onClick={() => {
            if (selectedEvent) {
              alert(`Commit event: ${selectedEvent.id}\n(Publishing not yet implemented)`)
            }
          }}
          className="text-[11px] h-7 bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-30 disabled:pointer-events-none"
        >
          <CheckCircle size={12} /> Commit
        </Button>
      </div>
    </div>
  )
}

