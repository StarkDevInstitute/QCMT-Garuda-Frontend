import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { WorldMap } from '@/components/WorldMap/WorldMap'
import { TensorPanel } from '@/components/TensorPanel/TensorPanel'
import { BulletinPanel, type BulletinEntry } from '@/components/BulletinPanel/BulletinPanel'
import { SplitPane } from '@/components/layout/SplitPane'
import { useEventStore } from '@/stores/eventStore'
import { platform, isWaveformPrepDone } from '@/lib/platform'
import { useSettingsStore } from '@/stores/settingsStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Radio, CheckCircle, ScrollText } from 'lucide-react'
import type { SeismicEvent } from '@/types/seismology'
import { formatUTC, formatLat, formatLon, formatDepth, cn } from '@/lib/utils'
import { BeachBall2D } from '@/components/BeachBall/BeachBall2D'
import { getFocalDepthColor } from '@/lib/focal-mechanism-colors'

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
      <div className="w-full h-full border-r border-border bg-card/40 flex items-center justify-center text-[11px] text-muted-foreground select-none">
        No event
      </div>
    )
  }

  const origin = event.origins.find(o => o.id === event.preferredOriginId) ?? event.origins[0]
  const primaryMag = event.magnitudes.find(m => m.id === event.preferredMagnitudeId) ?? event.magnitudes[0]
  const fm = event.focalMechanisms.find(f => f.id === event.preferredFocalMechanismId) ?? event.focalMechanisms[0]
  const magByType = new Map(event.magnitudes.map(m => [m.type, m]))
  const depthKm = origin?.depth?.value ?? 0
  const focalColor = getFocalDepthColor(depthKm)

  return (
    <div className="w-full h-full border-r border-border bg-card/40 overflow-y-auto flex flex-col select-none text-xs">
      {/* Time */}
      <div className="px-2 py-2 border-b border-border/60">
        <p className="font-mono text-[11px] text-foreground/90 leading-tight">
          {origin ? formatUTC(origin.time.value) : '—'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {origin ? relativeTime(origin.time.value) : ''}
        </p>
      </div>

      {/* Primary magnitude + location */}
      <div className="px-2 py-2 border-b border-border/60">
        <p className="text-base font-bold font-mono text-foreground leading-none">
          M {primaryMag?.mag.value.toFixed(1) ?? '—'}
        </p>
        <p className="text-[11px] text-foreground/80 mt-1 leading-snug">
          {origin?.region ?? 'Unknown region'}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Depth {origin?.depth ? formatDepth(origin.depth.value) : '—'}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground mt-0.5 leading-tight">
          {origin ? formatLat(origin.latitude.value) : ''}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground leading-tight">
          {origin ? formatLon(origin.longitude.value) : ''}
        </p>
      </div>

      {/* Beach ball */}
      {fm?.nodalPlanes && (
        <div className="px-2 py-2 border-b border-border/60 flex justify-center">
          <BeachBall2D
            nodalPlanes={fm.nodalPlanes}
            size={92}
            className="rounded-full"
            compressionColor="#ffffff"
            dilatationColor={focalColor}
            strokeColor="#000000"
            northLabelColor="#000000"
          />
        </div>
      )}

      {/* Magnitude list */}
      <div className="px-2 py-1.5 border-b border-border/60">
        {MAG_ORDER.map(({ type, label }) => {
          const m = magByType.get(type)
          return (
            <div key={type} className="flex items-baseline justify-between gap-1 py-[1px]">
              <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
              <span className="font-mono text-[11px] text-foreground/80 truncate">
                {m ? m.mag.value.toFixed(1) + (m.stationCount ? ` (${m.stationCount})` : '') : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Phase stats */}
      <div className="px-2 py-1.5 border-b border-border/60">
        <div className="flex justify-between">
          <span className="text-[11px] text-muted-foreground">Phases</span>
          <span className="font-mono text-[11px]">{origin?.quality?.usedPhaseCount ?? '—'}</span>
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[11px] text-muted-foreground">RMS Res.</span>
          <span className="font-mono text-[11px]">{origin?.quality?.standardError?.toFixed(1) ?? '—'}</span>
        </div>
      </div>

      {/* Event metadata */}
      <div className="px-2 py-2 text-[10px]">
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
  weight: number
  shift: number
  fit: number
  snr: number
}

interface StationPrepProgress {
  stationKey: string
  net: string
  sta: string
  loc: string
  cha: string
  progress: number
  status: string
  lastMessage: string
}

const PREP_PROGRESS_END = 80
const INVERSION_PROGRESS_START = 82

interface PipelineStageSegment {
  key: string
  label: string
  start: number
  end: number
}

const PIPELINE_STAGE_SEGMENTS: PipelineStageSegment[] = [
  { key: 'job-init', label: 'Init Job', start: 0, end: 28 },
  { key: 'station-prep', label: 'Station Prep', start: 30, end: 56 },
  { key: 'waveform-prep', label: 'Waveform Prep', start: 58, end: 76 },
  { key: 'verify-prep', label: 'Verify Prep', start: 76, end: 78 },
  { key: 'station-select', label: 'Station Select', start: 79, end: PREP_PROGRESS_END },
  { key: 'inversion', label: 'Inversion', start: INVERSION_PROGRESS_START, end: 100 },
]

const PHASE_BADGE: Record<PhaseType, string> = {
  P: 'bg-orange-500 text-white',
  R: 'bg-amber-700 text-white',
  S: 'bg-green-600 text-white',
  L: 'bg-lime-700 text-white',
}

function stationContribsToTraceRows(event: SeismicEvent): TraceRow[] {
  const fm = event.focalMechanisms.find(
    (f) => f.id === event.preferredFocalMechanismId
  ) ?? event.focalMechanisms[0]
  const contribs = fm?.momentTensor?.stationContributions ?? []
  return contribs.map((c) => {
    const rawPhase = c.component ?? 'P'
    const phase = (['P', 'R', 'S', 'L'].includes(rawPhase) ? rawPhase : 'P') as PhaseType
    const loc = c.waveformId.locationCode ?? ''
    const channel = loc ? `${loc}.${c.waveformId.channelCode}` : c.waveformId.channelCode
    return {
      used: c.active !== false,
      phase,
      net: c.waveformId.networkCode,
      station: c.waveformId.stationCode,
      channel,
      weight: c.weight ?? 0,
      shift: c.timeShift ?? 0,
      fit: c.misfit != null ? (1 - c.misfit) * 100 : 0,
      snr: c.snr ?? 0,
    }
  })
}

function TraceTable({ event }: { event: SeismicEvent | null }) {
  const thCls = 'px-2 py-1 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap select-none border-r border-border/40 last:border-r-0'
  const tdCls = 'px-2 py-[3px] text-[11px] font-mono border-r border-border/30 last:border-r-0'

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
            ? stationContribsToTraceRows(event).map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-border/30 hover:bg-muted/20',
                    !row.used && 'opacity-55'
                  )}
                >
                  <td className={tdCls}>
                    {row.used && (
                      <span className="inline-flex items-center justify-center w-6 h-4 border border-border/60 rounded-sm bg-card text-[10px] cursor-pointer hover:bg-muted/40 select-none">
                        ···
                      </span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <span className={cn('inline-flex items-center justify-center w-6 h-5 rounded text-[11px] font-bold', PHASE_BADGE[row.phase])}>
                      {row.phase}
                    </span>
                  </td>
                  <td className={tdCls}>{row.net}</td>
                  <td className={tdCls}>{row.station}</td>
                  <td className={tdCls}>{row.channel}</td>
                  <td className={cn(tdCls, 'text-right')}>—</td>
                  <td className={cn(tdCls, 'text-right')}>—</td>
                  <td className={cn(tdCls, 'text-right')}>{row.weight.toFixed(3)}</td>
                  <td className={cn(tdCls, 'text-right')}>{row.shift.toFixed(1)}</td>
                  <td className={cn(tdCls, 'text-right')}>{row.fit.toFixed(1)}</td>
                  <td className={cn(tdCls, 'text-right')}>{row.snr.toFixed(1)}</td>
                </tr>
              ))
            : (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-[12px] text-muted-foreground">
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
  const { selectedEventId, filter, setSelectedEvent } = useEventStore()
  const navigate = useNavigate()
  const [showExtendedLog, setShowExtendedLog] = useState(false)
  const [isPreparingWaveforms, setIsPreparingWaveforms] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressLabel, setProgressLabel] = useState('Preparing waveform job...')
  const [progressValue, setProgressValue] = useState(0)
  const [progressLines, setProgressLines] = useState<string[]>([])
  const [showRawLogs, setShowRawLogs] = useState(false)
  const [isOpeningWaveform, setIsOpeningWaveform] = useState(false)
  const [stationPrepProgress, setStationPrepProgress] = useState<Record<string, StationPrepProgress>>({})
  const [readyWaveformTarget, setReadyWaveformTarget] = useState<{ eventId: string; jobId: string } | null>(null)
  const fdsnUrl = useSettingsStore((s) => s.settings.server.fdsnEventUrl)

  // Re-use the same cache key as EventsPage — no duplicate network request
  const { data: events = [] } = useQuery({
    queryKey: ['events', filter, fdsnUrl],
    queryFn: () => platform.getEvents(filter),
    staleTime: 30_000,
  })

  // Auto-select the most recent event when data first loads and nothing is selected
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

  const { data: selectedEventDetail } = useQuery({
    queryKey: ['event-detail', selectedEventId],
    queryFn: () => platform.getEventById(selectedEventId as string),
    enabled: Boolean(selectedEventId),
    staleTime: 10_000,
  })

  const activeEvent = selectedEventDetail ?? selectedEvent

  const [bulletin, setBulletin] = useState<BulletinEntry[]>([
    { time: new Date(), message: 'SCMTV BMKG initialized — Phase 1 (Web Mode)', level: 'info' },
    { time: new Date(), message: 'Select an event from the Events tab or the map to begin analysis.', level: 'info' },
  ])

  const prevSelectedRef = useRef<string | null>(null)
  useEffect(() => {
    if (activeEvent && selectedEventId !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedEventId
      setBulletin((prev) => [
        ...prev,
        { time: new Date(), message: `Event selected: ${activeEvent.id} — ${activeEvent.origins[0]?.region ?? 'unknown region'}`, level: 'info' },
      ])
    }
  }, [activeEvent, selectedEventId])

  const appendProgressLine = useCallback((line: string) => {
    const msg = line.trim()
    if (!msg) return
    setProgressLines((prev) => [...prev, msg].slice(-120))
  }, [])

  const parseLogLine = useCallback((raw: string): string => {
    const msg = raw.trim()
    if (!msg) return ''

    try {
      const parsed = JSON.parse(msg) as { text?: string; message?: string }
      return (parsed.text || parsed.message || msg).trim()
    } catch {
      return msg
    }
  }, [])

  const updateProgressFromLog = useCallback((line: string, progressStart: number, progressEnd: number) => {
    const completedMatch = line.match(/completed\s*(\d+)\s*\/\s*(\d+)/i)
    if (completedMatch) {
      const completed = Number(completedMatch[1])
      const total = Number(completedMatch[2])
      if (total > 0) {
        const ratio = Math.min(1, Math.max(0, completed / total))
        const mapped = progressStart + ratio * (progressEnd - progressStart)
        setProgressValue((prev) => Math.max(prev, mapped))
      }
      return
    }

    const percentMatch = line.match(/(\d{1,3}(?:\.\d+)?)%/)
    if (percentMatch) {
      const pct = Math.min(100, Math.max(0, Number(percentMatch[1])))
      const mapped = progressStart + (pct / 100) * (progressEnd - progressStart)
      setProgressValue((prev) => Math.max(prev, mapped))
    }
  }, [])

  const updateStationProgressFromLog = useCallback((line: string) => {
    const stationMatch =
      line.match(/\[([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+)\]/) ??
      line.match(/\b([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+)\b/)
    if (!stationMatch) return

    const stationKey = stationMatch[1]
    const [net = '', sta = '', loc = '', cha = ''] = stationKey.split('.')
    const lower = line.toLowerCase()
    const pctMatch = line.match(/(\d{1,3}(?:\.\d+)?)%/)
    const pct = pctMatch ? Math.min(100, Math.max(0, Number(pctMatch[1]))) : null

    let status = 'Pending'
    let progress = 0

    if (lower.includes('failed') || lower.includes('error') || lower.includes('exception')) {
      status = 'Failed'
      progress = 100
    } else if (lower.includes('passed all qc and processing stages') || lower.includes('completed')) {
      status = 'Completed'
      progress = 100
    } else if (lower.includes('processing')) {
      status = 'Processing'
      progress = 75
    } else if (lower.includes('qc')) {
      status = 'QC'
      progress = 50
    } else if (lower.includes('download') || lower.includes('fetch') || lower.includes('stream')) {
      status = 'Downloading'
      progress = 25
    } else if (lower.includes('queued') || lower.includes('pending') || lower.includes('waiting')) {
      status = 'Pending'
      progress = 0
    }

    if (pct !== null) {
      progress = pct
      if (pct >= 100 && status !== 'Failed') status = 'Completed'
      else if (pct > 0 && status === 'Pending') status = 'Downloading'
    }

    setStationPrepProgress((prev) => {
      const existing = prev[stationKey]
      const nextProgress = Math.max(existing?.progress ?? 0, progress)
      const nextStatus = existing?.status === 'Failed'
        ? 'Failed'
        : (nextProgress >= 100 ? (status === 'Failed' ? 'Failed' : 'Completed') : status)

      return {
        ...prev,
        [stationKey]: {
          stationKey,
          net,
          sta,
          loc,
          cha,
          progress: nextProgress,
          status: nextStatus,
          lastMessage: line,
        },
      }
    })
  }, [])

  const stationRows = useMemo(
    () => Object.values(stationPrepProgress).sort((a, b) => a.stationKey.localeCompare(b.stationKey)),
    [stationPrepProgress]
  )

  const completedStations = useMemo(
    () => stationRows.filter((row) => row.status === 'Completed').length,
    [stationRows]
  )

  const stageProgressBadges = useMemo(() => {
    return PIPELINE_STAGE_SEGMENTS
      .map((stage) => {
        const ratio = (progressValue - stage.start) / (stage.end - stage.start)
        const stageProgress = Math.round(Math.max(0, Math.min(100, ratio * 100)))
        const isCompleted = progressValue >= stage.end
        const isActive = progressValue >= stage.start && progressValue < stage.end
        const isReached = progressValue > stage.start || isActive || isCompleted

        return {
          ...stage,
          stageProgress,
          isActive,
          isCompleted,
          isReached,
        }
      })
      .filter((stage) => stage.isReached)
  }, [progressValue])

  const runInteractiveTask = useCallback(async (
    taskId: string,
    label: string,
    progressStart: number,
    progressEnd: number
  ) => {
    setProgressLabel(label)
    setProgressValue(progressStart)

    const resolvedStreamUrl = platform.getInteractiveTaskStreamLogsUrl(taskId)
    const eventSource = new EventSource(resolvedStreamUrl)

    const onLogData = (raw: string) => {
      const line = parseLogLine(raw)
      if (!line) return
      appendProgressLine(line)
      updateProgressFromLog(line, progressStart, progressEnd)
      updateStationProgressFromLog(line)
    }

    eventSource.onmessage = (event) => {
      onLogData(event.data)
    }

    eventSource.addEventListener('log', (event: MessageEvent) => {
      onLogData(event.data)
    })

    eventSource.onerror = () => {
      eventSource.close()
    }

    try {
      while (true) {
        const status = await platform.getInteractiveTaskStatus(taskId)

        if (status.status === 'completed') {
          setProgressValue(progressEnd)
          return
        }
        if (status.status === 'failed' || status.status === 'cancelled' || status.status === 'timeout') {
          throw new Error(status.error || status.detail || `${label} ended with status ${status.status}`)
        }

        setProgressValue((prev) => Math.min(progressEnd - 2, Math.max(prev, progressStart + 2)))
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } finally {
      eventSource.close()
    }
  }, [appendProgressLine, parseLogLine, updateProgressFromLog, updateStationProgressFromLog])

  const openPreparedWaveform = useCallback(async () => {
    if (!readyWaveformTarget || isOpeningWaveform) return

    setIsOpeningWaveform(true)
    setProgressLabel('Running default inversion before opening waveform...')
    setProgressValue(INVERSION_PROGRESS_START)
    appendProgressLine('Starting default inversion: is_automatic=true, est_uncertainty=false, use_optimization=false, force_optimization=false')

    try {
      const inversion = await platform.startInversion(readyWaveformTarget.jobId)
      if (!inversion.task_id) {
        throw new Error('Inversion started but task_id is missing')
      }

      await runInteractiveTask(inversion.task_id, 'Running default inversion...', INVERSION_PROGRESS_START, 100)
      setProgressLabel('Fetching inversion solutions...')
      appendProgressLine('Default inversion completed. Fetching /solutions payload...')

      try {
        const solutionsResponse = await platform.getJobSolutions(readyWaveformTarget.jobId)
        const preferredSolution =
          solutionsResponse.solutions.find((solution) => solution.stage?.toLowerCase() === 'final_stage') ??
          solutionsResponse.solutions[solutionsResponse.solutions.length - 1]

        if (preferredSolution) {
          const vrPct = preferredSolution.variance_reduction != null
            ? (preferredSolution.variance_reduction * 100).toFixed(1)
            : null
          appendProgressLine(
            `Solutions loaded (${solutionsResponse.solutions.length} entries). ` +
            `Selected stage=${preferredSolution.stage ?? 'unknown'}, depth=${preferredSolution.depth_km ?? '-'} km, ` +
            `VR=${vrPct ?? '-'}%, DC=${preferredSolution.dc_perc ?? '-'}%`
          )
        } else {
          appendProgressLine('Solutions endpoint returned empty list; continue opening waveform page.')
        }
      } catch (solutionsError) {
        const solutionsMessage = solutionsError instanceof Error ? solutionsError.message : 'Failed to fetch solutions'
        appendProgressLine(`Warning: ${solutionsMessage}`)
      }

      appendProgressLine('Default inversion completed. Opening waveform page...')
      navigate(`/waveform/${encodeURIComponent(readyWaveformTarget.eventId)}?jobId=${encodeURIComponent(readyWaveformTarget.jobId)}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run default inversion'
      setProgressLabel('Default inversion failed')
      appendProgressLine(message)
      setBulletin((prev) => [
        ...prev,
        { time: new Date(), message: `Default inversion failed: ${message}`, level: 'error' },
      ])
    } finally {
      setIsOpeningWaveform(false)
    }
  }, [appendProgressLine, isOpeningWaveform, navigate, readyWaveformTarget, runInteractiveTask])

  const waitForWaveformPrepReady = useCallback(async (jobId: string) => {
    // Prefer explicit progress endpoint for readiness check and keep a context fallback.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const progress = await platform.getJobProgress(jobId)
        if (isWaveformPrepDone(progress.stage, progress.status)) {
          return
        }

        if (progress.status && ['failed', 'cancelled', 'timeout'].includes(progress.status.toLowerCase())) {
          throw new Error(progress.message || `waveform-prep ended with status ${progress.status}`)
        }
      } catch {
        const context = await platform.getJobContext(jobId)
        const stage = context.current_stage?.toUpperCase()
        if (stage === 'WAVEFORM_PREP_DONE' || stage === 'STATION_SELECTION_DONE' || stage === 'INVERTED' || stage === 'FINALIZED') {
          return
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    throw new Error('WAVEFORM_PREP stage is not ready yet')
  }, [])

  const handleWaveforms = useCallback(async () => {
    if (!activeEvent || isPreparingWaveforms) return

    const origin = activeEvent.origins.find(o => o.id === activeEvent.preferredOriginId) ?? activeEvent.origins[0]
    const magnitude = activeEvent.magnitudes.find(m => m.id === activeEvent.preferredMagnitudeId) ?? activeEvent.magnitudes[0]
    if (!origin || !magnitude) {
      setBulletin((prev) => [
        ...prev,
        { time: new Date(), message: `Waveform init aborted: event ${activeEvent.id} is missing origin or magnitude`, level: 'warn' },
      ])
      return
    }

    setIsPreparingWaveforms(true)
    setProgressOpen(true)
    setProgressValue(5)
    setProgressLabel('Initializing interactive job...')
    setProgressLines([])
    setShowRawLogs(false)
    setStationPrepProgress({})
    setReadyWaveformTarget(null)
    try {
      const initResponse = await platform.initializeInteractiveJob({
        event_id: activeEvent.id,
        lat: origin.latitude.value,
        lon: origin.longitude.value,
        mag: magnitude.mag.value,
        depth: origin.depth?.value ?? 0,
        time: origin.time.value.toISOString(),
        waveform_source_type: 'seiscomp',
        auto_gf: true,
        is_deviatoric: true,
        data_is_corrected: false,
        centroid_inversion: false,
      })

      if (initResponse.task_id) {
        await runInteractiveTask(initResponse.task_id, 'Initializing job context...', 10, 28)
      } else {
        setProgressValue(28)
      }

      setProgressLabel('Preparing stations...')
      const stationPrep = await platform.startStationPreparation(initResponse.job_id)
      if (!stationPrep.task_id) {
        throw new Error('Station preparation started but task_id is missing')
      }
      await runInteractiveTask(stationPrep.task_id, 'Preparing stations...', 30, 56)

      setProgressLabel('Preparing waveforms...')
      const waveformPrep = await platform.startWaveformPreparation(initResponse.job_id)
      if (!waveformPrep.task_id) {
        throw new Error('Waveform preparation started but task_id is missing')
      }
      await runInteractiveTask(waveformPrep.task_id, 'Preparing waveform data...', 58, 76)

      setProgressLabel('Verifying WAVEFORM_PREP readiness...')
      await waitForWaveformPrepReady(initResponse.job_id)
      setProgressValue(78)

      setProgressLabel('Running station selection (default)...')
      appendProgressLine('Starting default station selection: use_all_stations=false, num_sector=12, num_station_per_sector=2')
      const stationSelection = await platform.startStationSelection(initResponse.job_id)
      if (!stationSelection.task_id) {
        throw new Error('Station selection started but task_id is missing')
      }
      await runInteractiveTask(stationSelection.task_id, 'Selecting stations...', 79, PREP_PROGRESS_END)

      // Fallback: if stream logs don't contain per-station lines, seed table from context.
      try {
        const context = await platform.getJobContext(initResponse.job_id)
        setStationPrepProgress((prev) => {
          const next = { ...prev }
          for (const [stationKey, meta] of Object.entries(context.valid_waveforms || {})) {
            if (next[stationKey]) continue
            const [net = '', sta = '', loc = '', cha = ''] = stationKey.split('.')
            const isSelected = context.selected_stations?.includes(stationKey) ?? false
            next[stationKey] = {
              stationKey,
              net: meta.network || net,
              sta: meta.station || sta,
              loc: meta.location || loc,
              cha: meta.channel || cha,
              progress: isSelected ? 100 : 0,
              status: isSelected ? 'Completed' : 'Pending',
              lastMessage: 'Loaded from job context',
            }
          }
          return next
        })
      } catch {
        // Keep stream-derived rows only if context fetch fails.
      }

      setProgressValue(PREP_PROGRESS_END)

      setBulletin((prev) => [
        ...prev,
        { time: new Date(), message: `Waveform stages ready (WAVEFORM_PREP + STATION_SELECTION done): ${initResponse.job_id} (${activeEvent.id})`, level: 'info' },
      ])

      setProgressLabel('Preparation completed. Open Waveform will run inversion stage next.')
      setReadyWaveformTarget({ eventId: activeEvent.id, jobId: initResponse.job_id })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error'
      setBulletin((prev) => [
        ...prev,
        { time: new Date(), message: `Waveform init failed: ${message}`, level: 'error' },
      ])
      setProgressLabel('Preparation failed')
      appendProgressLine(message)
      setReadyWaveformTarget(null)
    } finally {
      setIsPreparingWaveforms(false)
    }
  }, [activeEvent, appendProgressLine, isPreparingWaveforms, runInteractiveTask, waitForWaveformPrepReady])

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
              left={<EventSidebar event={activeEvent} />}
              right={
                <SplitPane
                  storageKey="mt-map-tensor"
                  left={<WorldMap events={events} selectedEventOverride={activeEvent} />}
                  right={
                    <div className="h-full overflow-y-auto">
                      <TensorPanel event={activeEvent} />
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
            showExtendedLog
              ? <BulletinPanel entries={bulletin} />
              : <TraceTable event={activeEvent} />
          }
        />
      </div>

      {/* ── Footer buttons ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border bg-card shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-[11px] h-7"
        >
          <FileText size={12} /> Bulletin
        </Button>
        <Button
          variant={showExtendedLog ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setShowExtendedLog(!showExtendedLog)}
          className="text-[11px] h-7"
        >
          <ScrollText size={12} /> Extended Log
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleWaveforms}
          disabled={!activeEvent || isPreparingWaveforms}
          className="text-[11px] h-7"
        >
          <Radio size={12} /> Waveforms
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          disabled={!activeEvent}
          onClick={() => {
            if (activeEvent) {
              alert(`Commit event: ${activeEvent.id}\n(Publishing not yet implemented)`)
            }
          }}
          className="text-[11px] h-7 bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-30 disabled:pointer-events-none"
        >
          <CheckCircle size={12} /> Commit
        </Button>
      </div>

      {progressOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
          <div className="w-[900px] max-w-[96vw] rounded-lg border border-border bg-background p-5 shadow-xl">
            {(() => {
              const isPrepActive = isPreparingWaveforms
              const isPrepDone = Boolean(readyWaveformTarget) || isOpeningWaveform
              const isInversionActive = isOpeningWaveform
              return (
                <>
            <div className="mb-3 text-sm font-semibold">Waveform Preparation Pipeline</div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{progressLabel}</span>
              <span>{progressValue.toFixed(0)}%</span>
            </div>
            <div className="mb-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <div className="mb-4 relative h-5 text-[10px] text-muted-foreground">
              <div
                className="absolute top-0 h-5 w-px bg-border"
                style={{ left: `${PREP_PROGRESS_END}%` }}
              />
              <div className="absolute left-0 top-0 flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${isPrepDone ? 'bg-emerald-500' : isPrepActive ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                <span>Preparation (0-{PREP_PROGRESS_END}%)</span>
              </div>
              <div className="absolute right-0 top-0 flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${progressValue >= 100 ? 'bg-emerald-500' : isInversionActive ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                <span>Inversion ({INVERSION_PROGRESS_START}-100%)</span>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {stageProgressBadges.map((stage) => (
                <Badge
                  key={stage.key}
                  variant="outline"
                  className={cn(
                    'border-border/70 text-[10px] font-medium',
                    stage.isCompleted && 'border-emerald-500/70 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                    stage.isActive && 'border-primary/70 bg-primary/15 text-primary'
                  )}
                >
                  {stage.label}: {stage.stageProgress}%
                </Badge>
              ))}
            </div>

            <div className="mb-3 rounded border border-border/70 bg-card/40">
              <div className="flex items-center justify-between border-b border-border/70 px-3 py-2 text-[11px]">
                <span className="font-medium">Completed {completedStations}/{stationRows.length} stations</span>
                <span className="text-muted-foreground">Pending data streams:</span>
              </div>

              <div className="max-h-56 overflow-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border/70 text-left text-muted-foreground">
                      <th className="px-2 py-1">Net</th>
                      <th className="px-2 py-1">Sta</th>
                      <th className="px-2 py-1">Loc</th>
                      <th className="px-2 py-1">Cha</th>
                      <th className="px-2 py-1">Progress</th>
                      <th className="px-2 py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stationRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-2 py-3 text-muted-foreground">No station logs detected yet.</td>
                      </tr>
                    )}
                    {stationRows.map((row) => (
                      <tr key={row.stationKey} className="border-b border-border/50">
                        <td className="px-2 py-1 font-mono">{row.net}</td>
                        <td className="px-2 py-1 font-mono">{row.sta}</td>
                        <td className="px-2 py-1 font-mono">{row.loc || ' '}</td>
                        <td className="px-2 py-1 font-mono">{row.cha}</td>
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-2 rounded-full',
                                  row.status === 'Failed' ? 'bg-red-500' : 'bg-primary'
                                )}
                                style={{ width: `${row.progress}%` }}
                              />
                            </div>
                            <span className="font-mono">{Math.round(row.progress)}%</span>
                          </div>
                        </td>
                        <td className="px-2 py-1">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowRawLogs((prev) => !prev)}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                {showRawLogs ? 'Hide Log' : 'Log'}
              </button>
            </div>

            {showRawLogs && (
              <div className="h-56 overflow-auto rounded border border-border/70 bg-card/50 p-2 font-mono text-[11px]">
                {progressLines.length === 0 ? (
                  <div className="text-muted-foreground">Waiting for task stream logs...</div>
                ) : (
                  progressLines.map((line, index) => (
                    <div key={index} className="leading-5 text-foreground/85">{line}</div>
                  ))
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">
                {readyWaveformTarget
                  ? 'Preparation selesai. Klik Open Waveform untuk menjalankan inversion stage.'
                  : 'Log tetap tampil selama proses berjalan.'}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => { void openPreparedWaveform() }}
                  disabled={!readyWaveformTarget || isOpeningWaveform}
                  className="text-[11px] h-7"
                >
                  {isOpeningWaveform ? 'Running Inversion...' : 'Open Waveform'}
                </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProgressOpen(false)}
                className="text-[11px] h-7"
              >
                Close
              </Button>
              </div>
            </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
