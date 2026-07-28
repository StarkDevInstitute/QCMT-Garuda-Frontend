import { create } from 'zustand'

export interface EventFilter {
  page: number
  pageSize: number
  dateFrom?: Date
  dateTo?: Date
  methodId: string
  focalMechanismQuality: string
}

function getTodayStartUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
}

export function createDefaultEventFilter(): EventFilter {
  return {
    page: 1,
    pageSize: 20,
    dateFrom: getTodayStartUtc(),
    dateTo: new Date(),
    methodId: '',
    focalMechanismQuality: '',
  }
}

interface EventStore {
  selectedEventId: string | null
  filter: EventFilter
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  setSelectedEvent: (id: string | null) => void
  setFilter: (filter: Partial<EventFilter>) => void
  setSorting: (column: string, direction: 'asc' | 'desc') => void
}

export const useEventStore = create<EventStore>((set) => ({
  selectedEventId: null,
  filter: createDefaultEventFilter(),
  sortColumn: 'time',
  sortDirection: 'desc',
  setSelectedEvent: (id) => set({ selectedEventId: id }),
  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),
  setSorting: (column, direction) =>
    set({ sortColumn: column, sortDirection: direction }),
}))
