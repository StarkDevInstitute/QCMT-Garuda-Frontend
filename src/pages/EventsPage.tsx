import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { EventTable } from '@/components/EventTable/EventTable'
import { FilterBar } from '@/components/FilterBar/FilterBar'
import { JobInitDialog } from '@/components/JobPanel/JobInitDialog'
import { platform } from '@/lib/platform'
import { useEventStore } from '@/stores/eventStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { toEventSummary } from '@/lib/seismology/event-summary'
import { Button } from '@/components/ui/button'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react'
import type { SeismicEvent } from '@/types/seismology'

const EVENTS_REFRESH_INTERVAL_MS = 5_000

export function EventsPage() {
  const navigate = useNavigate()
  const { filter, setFilter, selectedEventId, setSelectedEvent } = useEventStore()
  const fdsnUrl = useSettingsStore((s) => s.settings.server.fdsnEventUrl)
  const [showJobDialog, setShowJobDialog] = useState(false)
  const [selectedEventForJob, setSelectedEventForJob] = useState<SeismicEvent | null>(null)

  const { data, isFetching, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['events', filter, fdsnUrl],
    queryFn: () => platform.getEvents(filter),
    placeholderData: (previousData) => previousData,
    refetchInterval: EVENTS_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 0,
  })

  const pagedData = data ?? {
    events: [],
    page: filter.page,
    pageSize: filter.pageSize,
    totalCount: undefined,
    hasPrevPage: filter.page > 1,
    hasNextPage: false,
  }

  const events = useMemo(() => pagedData.events.map(toEventSummary), [pagedData.events])
  const showInitialLoading = isLoading && !data

  const showingStart = events.length > 0
    ? (pagedData.page - 1) * pagedData.pageSize + 1
    : 0
  const showingEnd = events.length > 0
    ? showingStart + events.length - 1
    : 0
  const totalEntries = pagedData.totalCount ?? events.length
  const pageLabel = `Page ${pagedData.page} • Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedEvent(id)
      navigate('/')
    },
    [navigate, setSelectedEvent]
  )

  const handleStartProcessing = useCallback(() => {
    // Use pagedData.events (full SeismicEvent) instead of events (EventSummary)
    const selectedEvent = pagedData.events.find((e) => e.id === selectedEventId)
    if (selectedEvent) {
      setSelectedEventForJob(selectedEvent)
      setShowJobDialog(true)
    }
  }, [pagedData.events, selectedEventId])

  const handleRead = useCallback(() => { refetch() }, [refetch])

  const goPrevPage = useCallback(() => {
    if (!pagedData.hasPrevPage) return
    setFilter({ page: Math.max(1, filter.page - 1) })
  }, [pagedData.hasPrevPage, setFilter, filter.page])

  const goNextPage = useCallback(() => {
    if (!pagedData.hasNextPage) return
    setFilter({ page: filter.page + 1 })
  }, [pagedData.hasNextPage, setFilter, filter.page])

  return (
    <div className="flex flex-col h-full">
      {/* Job Init Dialog */}
      {showJobDialog && selectedEventForJob && (
        <JobInitDialog
          event={selectedEventForJob}
          onClose={() => {
            setShowJobDialog(false)
            setSelectedEventForJob(null)
          }}
        />
      )}

      {/* Status bar */}
      {isError && (
        <div className={`flex items-center gap-2 px-3 py-1 text-[11px] shrink-0 ${isError ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          {isError && <AlertCircle size={11} />}
          {isError && `Connection error: ${(error as Error)?.message ?? 'Unable to reach AutoMT endpoint'}`}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {showInitialLoading ? (
          <div className="h-full w-full flex items-center justify-center text-[12px] text-muted-foreground gap-2">
            <Loader2 size={14} className="animate-spin" /> Loading events...
          </div>
        ) : (
          <EventTable events={events} onSelect={handleSelect} />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-1 border-t border-border bg-card text-[11px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span>{pageLabel}</span>
          {isFetching && !showInitialLoading && (
            <Loader2 size={11} className="animate-spin text-muted-foreground/50" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {selectedEventId && (
            <>
              <div className="h-3 w-px bg-border" />
              <Button
                variant="default"
                size="sm"
                className="h-6 px-2 text-[11px] flex items-center gap-1"
                onClick={handleStartProcessing}
              >
                <Play size={12} />
                Start Processing
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={goPrevPage}
            disabled={!pagedData.hasPrevPage}
          >
            <ChevronLeft size={12} /> Prev
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={goNextPage}
            disabled={!pagedData.hasNextPage}
          >
            Next <ChevronRight size={12} />
          </Button>
        </div>
      </div>

      <FilterBar onRead={handleRead} />
    </div>
  )
}
