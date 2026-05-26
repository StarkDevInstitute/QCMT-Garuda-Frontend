import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventTable } from '@/components/EventTable/EventTable'
import { FilterBar } from '@/components/FilterBar/FilterBar'
import { mockEventSummaries } from '@/lib/mock/events'

export function EventsPage() {
  const navigate = useNavigate()

  const handleSelect = useCallback(
    (_id: string) => navigate('/'),
    [navigate]
  )

  const handleRead = useCallback(() => {
    // In Phase 1 this will call platform.getEvents(filter)
    // For now mock data is always shown
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <EventTable events={mockEventSummaries} onSelect={handleSelect} />
      </div>
      <FilterBar onRead={handleRead} />
    </div>
  )
}
