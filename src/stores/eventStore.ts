import { create } from 'zustand'

export interface EventFilter {
  lastDays: number
  dateFrom?: Date
  dateTo?: Date
  page: number
  pageSize: number
  methodId: string
  focalMechanismQuality: string
  hideOtherFake: boolean
  showOnlyOwn: boolean
  showOnlyPreferred: boolean
  hideOutside: boolean
  region: string
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
  filter: {
    lastDays: 4,
    page: 1,
    pageSize: 50,
    methodId: '',
    focalMechanismQuality: 'ALL',
    hideOtherFake: true,
    showOnlyOwn: false,
    showOnlyPreferred: false,
    hideOutside: true,
    region: '- custom -',
  },
  sortColumn: 'time',
  sortDirection: 'desc',
  setSelectedEvent: (id) => set({ selectedEventId: id }),
  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),
  setSorting: (column, direction) =>
    set({ sortColumn: column, sortDirection: direction }),
}))
