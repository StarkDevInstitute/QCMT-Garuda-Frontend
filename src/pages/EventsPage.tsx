import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { EventTable } from '@/components/EventTable/EventTable'
import { FilterBar } from '@/components/FilterBar/FilterBar'
import { platform } from '@/lib/platform'
import { useEventStore } from '@/stores/eventStore'
import type { EventFilter } from '@/stores/eventStore'
import { useAppStatusStore } from '@/stores/appStatusStore'
import { toEventSummary } from '@/lib/mock/events'
import { AlertCircle } from 'lucide-react'

function cloneFilter(filter: EventFilter): EventFilter {
  return {
    ...filter,
    dateFrom: filter.dateFrom ? new Date(filter.dateFrom) : undefined,
    dateTo: filter.dateTo ? new Date(filter.dateTo) : undefined,
  }
}

export function EventsPage() {
  const navigate = useNavigate()
  const { filter } = useEventStore()
  const [appliedFilter, setAppliedFilter] = useState<EventFilter>(() => cloneFilter(filter))
  const [isApplying, setIsApplying] = useState(false)
  const setConnection = useAppStatusStore((s) => s.setConnection)
  const setListening = useAppStatusStore((s) => s.setListening)
  const setEventCount = useAppStatusStore((s) => s.setEventCount)

  const { data: rawEvents = [], isFetching, isError, isSuccess, error } = useQuery({
    queryKey: ['events', appliedFilter],
    queryFn: () => platform.getEvents(appliedFilter),
    refetchInterval: 2_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
    retry: 1,
    staleTime: 1_000,
  })

  const events = useMemo(() => {
    const fromMs = appliedFilter.dateFrom?.getTime()
    const toMs = appliedFilter.dateTo?.getTime()

    return rawEvents
      .filter((ev) => {
        const origin = ev.origins.find((o) => o.id === ev.preferredOriginId) ?? ev.origins[0]
        if (!origin) return false

        const eventMs = origin.time.value.getTime()
        if (fromMs !== undefined && eventMs < fromMs) return false
        if (toMs !== undefined && eventMs > toMs) return false
        return true
      })
      .map(toEventSummary)
  }, [appliedFilter.dateFrom, appliedFilter.dateTo, rawEvents])

  useEffect(() => {
    setListening(isFetching)
  }, [isFetching, setListening])

  useEffect(() => {
    if (isError) {
      setConnection(false, 'AutoMT API')
      return
    }
    if (isSuccess) {
      setConnection(true, 'AutoMT API')
    }
  }, [isError, isSuccess, setConnection])

  useEffect(() => {
    setEventCount(events.length)
  }, [events.length, setEventCount])

  useEffect(() => {
    if (isApplying && !isFetching) {
      setIsApplying(false)
    }
  }, [isApplying, isFetching])

  const handleSelect = useCallback(
    (_id: string) => navigate('/'),
    [navigate]
  )

  const handleRead = useCallback((override?: Partial<EventFilter>) => {
    const nextFilter: EventFilter = {
      ...filter,
      ...override,
    }
    setIsApplying(true)
    setAppliedFilter(cloneFilter(nextFilter))
  }, [filter])

  return (
    <div className="flex flex-col h-full">
      {isError && (
        <div className={`flex items-center gap-2 px-3 py-1 text-[11px] shrink-0 ${isError ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          {isError && <AlertCircle size={11} />}
          {isError && `Connection error: ${(error as Error)?.message ?? 'Unable to reach AutoMT API'}`}
        </div>
      )}

      <div className="flex-1 min-h-0 relative">
        <EventTable events={events} onSelect={handleSelect} />
        {isApplying && isFetching && (
          <div className="absolute inset-0 bg-background/45 backdrop-blur-[1px] flex items-center justify-center z-20">
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground shadow-sm">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
              Loading events...
            </div>
          </div>
        )}
      </div>
      <FilterBar onRead={handleRead} />
    </div>
  )
}
