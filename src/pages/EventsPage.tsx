import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { EventTable } from '@/components/EventTable/EventTable'
import { FilterBar } from '@/components/FilterBar/FilterBar'
import { platform } from '@/lib/platform'
import { useEventStore } from '@/stores/eventStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { toEventSummary } from '@/lib/mock/events'
import { AlertCircle, Loader2 } from 'lucide-react'

export function EventsPage() {
  const navigate = useNavigate()
  const { filter } = useEventStore()
  const fdsnUrl = useSettingsStore((s) => s.settings.server.fdsnEventUrl)

  const { data: rawEvents = [], isFetching, isError, error, refetch } = useQuery({
    queryKey: ['events', filter, fdsnUrl],
    queryFn: () => platform.getEvents(filter),
    refetchInterval: 60_000,
    retry: 1,
    staleTime: 30_000,
  })

  const events = useMemo(() => rawEvents.map(toEventSummary), [rawEvents])

  const handleSelect = useCallback(
    (_id: string) => navigate('/'),
    [navigate]
  )

  const handleRead = useCallback(() => { refetch() }, [refetch])

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      {(isFetching || isError) && (
        <div className={`flex items-center gap-2 px-3 py-1 text-[11px] shrink-0 ${isError ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          {isFetching && !isError && <Loader2 size={11} className="animate-spin" />}
          {isError && <AlertCircle size={11} />}
          {isFetching && !isError && 'Fetching events from SeisComP…'}
          {isError && `Connection error: ${(error as Error)?.message ?? 'Unable to reach SeisComP FDSN'}`}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <EventTable events={events} onSelect={handleSelect} />
      </div>
      <FilterBar onRead={handleRead} />
    </div>
  )
}
