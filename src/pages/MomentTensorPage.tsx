import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { WorldMap } from '@/components/WorldMap/WorldMap'
import { TensorPanel } from '@/components/TensorPanel/TensorPanel'
import { BulletinPanel, type BulletinEntry } from '@/components/BulletinPanel/BulletinPanel'
import { SplitPane } from '@/components/layout/SplitPane'
import { useEventStore } from '@/stores/eventStore'
import { mockEvents } from '@/lib/mock/events'
import { Button } from '@/components/ui/button'
import { FileText, Radio, CheckCircle, ScrollText } from 'lucide-react'
import type { SeismicEvent } from '@/types/seismology'
import { formatUTC, formatLat, formatLon, formatDepth, cn } from '@/lib/utils'
import { BeachBall2D } from '@/components/BeachBall/BeachBall2D'

// ─── Utilities ────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (diffDays > 0) return `${diffDays}d and ${diffHours}h ago`
  return `${diffHours}h ago`
}

// ─── Left Event Sidebar ───────────────────────────────────────────────────────

const MAG_ORDER: Array<{ type: string; label: string }> = [
  { type: 'M',     label: 'M'     },
  { type: 'ML',    label: 'ML'    },
  { type: 'MLv',   label: 'MLv'   },
  { type: 'MLc',   label: 'MLc'   },
  { type: 'mb',    label: 'mb'    },
  { type: 'mB',    label: 'mB'    },
  { type: 'Mwp',   label: 'Mwp'   },
  { type: 'Mjma',  label: 'Mjma'  },
  { type: 'Ms_20', label: 'Ms_20' },
  { type: 'MS',    label: 'Ms(BB)'},
]

function EventSidebar({ event }: { event: SeismicEvent | null }) {
  if (!event) {
    return (
      <div className="w-full h-full border-r border-border bg-card/40 flex items-center justify-center text-[10px] text-muted-foreground select-none">
        No event
      </div>
    )
  }

  const origin = event.origins.find(o => o.id === event.preferredOriginId) ?? event.origins[0]
  const primaryMag = event.magnitudes.find(m => m.id === event.preferredMagnitudeId) ?? event.magnitudes[0]
  const fm = event.focalMechanisms.find(f => f.id === event.preferredFocalMechanismId) ?? event.focalMechanisms[0]
  const magByType = new Map(event.magnitudes.map(m => [m.type, m]))

  return (
    <div className="w-full h-full border-r border-border bg-card/40 overflow-y-auto flex flex-col select-none text-xs">
      {/* Time */}
      <div className="px-2 py-2 border-b border-border/60">
        <p className="font-mono text-[10px] text-foreground/90 leading-tight">
          {origin ? formatUTC(origin.time.value) : '—'}
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5">
          {origin ? relativeTime(origin.time.value) : ''}
        </p>
      </div>

      {/* Primary magnitude + location */}
      <div className="px-2 py-2 border-b border-border/60">
        <p className="text-base font-bold font-mono text-foreground leading-none">
          M {primaryMag?.mag.value.toFixed(1) ?? '—'}
        </p>
        <p className="text-[10px] text-foreground/80 mt-1 leading-snug">
          {origin?.region ?? 'Unknown region'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Depth {origin?.depth ? formatDepth(origin.depth.value) : '—'}
        </p>
        <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">
          {origin ? formatLat(origin.latitude.value) : ''}
        </p>
        <p className="font-mono text-[9px] text-muted-foreground leading-tight">
          {origin ? formatLon(origin.longitude.value) : ''}
        </p>
      </div>

      {/* Beach ball */}
      {fm?.nodalPlanes && (
        <div className="px-2 py-2 border-b border-border/60 flex justify-center">
          <BeachBall2D nodalPlanes={fm.nodalPlanes} size={64} className="rounded-full" />
        </div>
      )}

      {/* Magnitude list */}
      <div className="px-2 py-1.5 border-b border-border/60">
        {MAG_ORDER.map(({ type, label }) => {
          const m = magByType.get(type)
          return (
            <div key={type} className="flex items-baseline justify-between gap-1 py-[1px]">
              <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>
              <span className="font-mono text-[10px] text-foreground/80 truncate">
                {m ? m.mag.value.toFixed(1) + (m.stationCount ? ` (${m.stationCount})` : '') : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Phase stats */}
      <div className="px-2 py-1.5 border-b border-border/60">
        <div className="flex justify-between">
          <span className="text-[10px] text-muted-foreground">Phases</span>
          <span className="font-mono text-[10px]">{origin?.quality?.usedPhaseCount ?? '—'}</span>
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-muted-foreground">RMS Res.</span>
          <span className="font-mono text-[10px]">{origin?.quality?.standardError?.toFixed(1) ?? '—'}</span>
        </div>
      </div>

      {/* Event metadata */}
      <div className="px-2 py-2 text-[9px]">
        <p className="text-muted-foreground">Event ID</p>
        <p className="font-mono text-foreground/80 truncate mt-0.5" title={event.id}>{event.id}</p>
        <p className="text-muted-foreground mt-1.5">Agency ID</p>
        <p className="font-mono text-foreground/80 mt-0.5">{event.creationInfo?.agencyId ?? '—'}</p>
        <p className="text-muted-foreground/70 mt-1.5 capitalize">
          {origin?.evaluationStatus ?? ''} {origin?.evaluationMode ?? ''}
        </p>
      </div>
    </div>
  )
}

// ─── Trace Values Table ───────────────────────────────────────────────────────

type PhaseType = 'P' | 'R' | 'S' | 'L'

interface TraceRow {
  used: boolean
  phase: PhaseType
  net: string
  station: string
  channel: string
  dist: number
  az: number
  weight: number
  shift: number
  fit: number
  snr: number
}

const PHASE_BADGE: Record<PhaseType, string> = {
  P: 'bg-orange-500 text-white',
  R: 'bg-amber-700 text-white',
  S: 'bg-green-600 text-white',
  L: 'bg-lime-700 text-white',
}

const MOCK_TRACES: TraceRow[] = [
  { used: true,  phase: 'P', net: 'IU', station: 'CHTO', channel: '00.BH', dist: 1774.7, az: 122.6, weight: 1.000, shift: 27.8, fit: 54.1, snr: 49.3 },
  { used: true,  phase: 'R', net: 'IU', station: 'CHTO', channel: '00.BH', dist: 1774.7, az: 122.6, weight: 1.000, shift: 32.8, fit: 74.4, snr:  7.6 },
  { used: true,  phase: 'S', net: 'IU', station: 'CHTO', channel: '00.BH', dist: 1774.7, az: 122.6, weight: 0.019, shift: 31.8, fit: 81.4, snr:  5.5 },
  { used: false, phase: 'R', net: 'IU', station: 'CHTO', channel: '00.BH', dist: 1774.7, az: 122.6, weight: 0.250, shift:  0.0, fit:  0.1, snr:  4.8 },
  { used: false, phase: 'S', net: 'IU', station: 'CHTO', channel: '00.BH', dist: 1774.7, az: 122.6, weight: 0.091, shift:  0.0, fit: 21.4, snr: 74.4 },
  { used: false, phase: 'L', net: 'IU', station: 'CHTO', channel: '00.BH', dist: 1774.7, az: 122.6, weight: 0.500, shift:  0.0, fit: 72.4, snr: 35.1 },
  { used: true,  phase: 'P', net: 'II', station: 'AAK',  channel: '00.BH', dist: 1861.2, az: 332.9, weight: 1.000, shift: 47.8, fit: 83.9, snr: 62.3 },
  { used: true,  phase: 'R', net: 'II', station: 'AAK',  channel: '00.BH', dist: 1861.2, az: 332.9, weight: 1.000, shift: 41.8, fit: 93.4, snr:  5.7 },
  { used: true,  phase: 'S', net: 'II', station: 'AAK',  channel: '00.BH', dist: 1861.2, az: 332.9, weight: 0.010, shift: 47.8, fit: 76.4, snr:  5.7 },
  { used: false, phase: 'R', net: 'II', station: 'AAK',  channel: '00.BH', dist: 1861.2, az: 332.9, weight: 0.250, shift: 41.8, fit: 86.8, snr:  5.7 },
  { used: false, phase: 'S', net: 'II', station: 'AAK',  channel: '00.BH', dist: 1861.2, az: 332.9, weight: 0.053, shift: 47.8, fit: 78.6, snr:  5.7 },
  { used: false, phase: 'L', net: 'II', station: 'AAK',  channel: '00.BH', dist: 1861.2, az: 332.9, weight: 0.500, shift: 56.8, fit: 76.4, snr:  5.7 },
  { used: true,  phase: 'P', net: 'IU', station: 'MAKZ', channel: '00.BH', dist: 2092.9, az: 354.1, weight: 1.000, shift: 43.8, fit: 83.9, snr: 14.0 },
  { used: true,  phase: 'R', net: 'IU', station: 'MAKZ', channel: '00.BH', dist: 2092.9, az: 354.1, weight: 1.000, shift: 35.8, fit: 83.9, snr:  6.0 },
]

function TraceTable({ event }: { event: SeismicEvent | null }) {
  const thCls = 'px-2 py-1 text-left text-[10px] font-medium text-muted-foreground whitespace-nowrap select-none border-r border-border/40 last:border-r-0'
  const tdCls = 'px-2 py-[3px] text-[10px] font-mono border-r border-border/30 last:border-r-0'

  return (
    <div className="h-full overflow-auto bg-background">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border">
            <th className={thCls}>Used</th>
            <th className={thCls}>Phase</th>
            <th className={thCls}>Net</th>
            <th className={thCls}>Station</th>
            <th className={thCls}>Channel</th>
            <th className={cn(thCls, 'text-right')}>Dist (km)</th>
            <th className={cn(thCls, 'text-right')}>Az (deg)</th>
            <th className={cn(thCls, 'text-right')}>Weight</th>
            <th className={cn(thCls, 'text-right')}>Shift (s)</th>
            <th className={cn(thCls, 'text-right')}>Fit (%)</th>
            <th className={cn(thCls, 'text-right')}>SNR</th>
          </tr>
        </thead>
        <tbody>
          {event
            ? MOCK_TRACES.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-border/30 hover:bg-muted/20',
                    !row.used && 'opacity-55'
                  )}
                >
                  <td className={tdCls}>
                    {row.used && (
                      <span className="inline-flex items-center justify-center w-6 h-4 border border-border/60 rounded-sm bg-card text-[9px] cursor-pointer hover:bg-muted/40 select-none">
                        ···
                      </span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <span className={cn('inline-flex items-center justify-center w-5 h-4 rounded text-[10px] font-bold', PHASE_BADGE[row.phase])}>
                      {row.phase}
                    </span>
                  </td>
                  <td className={tdCls}>{row.net}</td>
                  <td className={tdCls}>{row.station}</td>
                  <td className={tdCls}>{row.channel}</td>
                  <td className={cn(tdCls, 'text-right')}>{row.dist.toFixed(1)}</td>
                  <td className={cn(tdCls, 'text-right')}>{row.az.toFixed(1)}</td>
                  <td className={cn(tdCls, 'text-right')}>{row.weight.toFixed(3)}</td>
                  <td className={cn(tdCls, 'text-right')}>{row.shift.toFixed(1)}</td>
                  <td className={cn(tdCls, 'text-right')}>{row.fit.toFixed(1)}</td>
                  <td className={cn(tdCls, 'text-right')}>{row.snr.toFixed(1)}</td>
                </tr>
              ))
            : (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                  Select an event to view trace values
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MomentTensorPage() {
  const { selectedEventId } = useEventStore()
  const navigate = useNavigate()
  const [showBulletin, setShowBulletin] = useState(false)

  const selectedEvent = mockEvents.find((e) => e.id === selectedEventId) ?? null

  const [bulletin] = useState<BulletinEntry[]>([
    { time: new Date(), message: 'SCMTV BMKG initialized — Phase 1 (Web Mode)', level: 'info' },
    { time: new Date(), message: 'Loading mock event catalog (12 events)', level: 'info' },
    { time: new Date(), message: 'Select an event from the Events tab or the map to begin analysis.', level: 'info' },
  ])

  const handleWaveforms = useCallback(() => navigate('/waveforms'), [navigate])

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Resizable: top area (sidebar|map|info) / bottom table ── */}
      <div className="flex-1 min-h-0">
        <SplitPane
          direction="vertical"
          defaultSplit={65}
          minFirst={150}
          minSecond={80}
          storageKey="mt-vertical"
          top={
            /* ── Resizable: sidebar | map | info panel ── */
            <SplitPane
              storageKey="mt-sidebar"
              left={<EventSidebar event={selectedEvent} />}
              right={
                <SplitPane
                  storageKey="mt-map-tensor"
                  left={<WorldMap events={mockEvents} />}
                  right={
                    <div className="h-full overflow-y-auto">
                      <TensorPanel event={selectedEvent} />
                    </div>
                  }
                  defaultSplit={60}
                  minFirst={200}
                  minSecond={260}
                />
              }
              defaultSplit={11}
              minFirst={80}
              minSecond={460}
            />
          }
          bottom={
            showBulletin
              ? <BulletinPanel entries={bulletin} />
              : <TraceTable event={selectedEvent} />
          }
        />
      </div>

      {/* ── Footer buttons ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border bg-card shrink-0">
        <Button
          variant={showBulletin ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setShowBulletin(!showBulletin)}
          className="text-[11px] h-7"
        >
          <FileText size={12} /> Bulletin
        </Button>
        <Button variant="ghost" size="sm" className="text-[11px] h-7">
          <ScrollText size={12} /> Extended Log
        </Button>
        <Button variant="ghost" size="sm" onClick={handleWaveforms} className="text-[11px] h-7">
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
