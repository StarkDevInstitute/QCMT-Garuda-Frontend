import { useEventStore } from '@/stores/eventStore'
import { mockEvents } from '@/lib/mock/events'
import { SplitPane } from '@/components/layout/SplitPane'
import { TensorPanel } from '@/components/TensorPanel/TensorPanel'
import { WaveformPanel } from '@/components/Waveform/WaveformPanel'

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
  const { selectedEventId } = useEventStore()
  const selectedEvent = mockEvents.find((e) => e.id === selectedEventId) ?? null

  return (
    <SplitPane
      left={
        <div className="h-full flex flex-col border-r border-border">
          <PanelHeader>Tensor Details</PanelHeader>
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
  )
}

