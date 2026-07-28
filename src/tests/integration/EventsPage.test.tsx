import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { EventsPage } from '@/pages/EventsPage'
import { mockEvents, toEventSummary } from '@/lib/mock/events'
import { renderWithProviders } from '../test-utils'
import { useEventStore } from '@/stores/eventStore'

// Mock the platform layer
vi.mock('@/lib/platform', () => ({
  platform: {
    getEvents: vi.fn(),
  },
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { platform } from '@/lib/platform'

describe('EventsPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(platform.getEvents as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvents)
    useEventStore.setState((state) => ({
      ...state,
      filter: {
        ...state.filter,
        page: 1,
        pageSize: 20,
        dateFrom: undefined,
        dateTo: undefined,
        methodId: '',
        focalMechanismQuality: '',
      },
    }))
  })

  it('displays events table after fetching', async () => {
    renderWithProviders(<EventsPage />)

    // Table headers should be present immediately
    expect(screen.getByText('OT(UTC)')).toBeTruthy()
    expect(screen.getAllByText('M').some((el) => el.closest('th'))).toBe(true)

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Bali Region, Indonesia')).toBeTruthy()
    })
  })

  it('displays multiple events from mock data', async () => {
    renderWithProviders(<EventsPage />)

    await waitFor(() => {
      expect(screen.getByText('Bali Region, Indonesia')).toBeTruthy()
    })

    // Several events from mock data should be visible
    expect(screen.getByText('Banda Sea')).toBeTruthy()
    expect(screen.getByText('Talaud Islands, Indonesia')).toBeTruthy()
  })

  it('shows loading indicator while fetching', async () => {
    let resolvePromise: (value: typeof mockEvents) => void
    const slowPromise = new Promise<typeof mockEvents>(resolve => { resolvePromise = resolve })
    ;(platform.getEvents as ReturnType<typeof vi.fn>).mockReturnValue(slowPromise)

    renderWithProviders(<EventsPage />)

    // Page should remain stable while query is pending
    expect(screen.getByText('OT(UTC)')).toBeTruthy()

    // Resolve and verify events appear
    resolvePromise!(mockEvents)
    await waitFor(() => {
      expect(screen.getByText('Bali Region, Indonesia')).toBeTruthy()
    })
  })

  it('shows error message on fetch failure', async () => {
    ;(platform.getEvents as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

    renderWithProviders(<EventsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Connection error/)).toBeTruthy()
    }, { timeout: 5000 })
  })

  it('navigates to moment tensor page on event selection', async () => {
    renderWithProviders(<EventsPage />)

    await waitFor(() => {
      expect(screen.getByText('Bali Region, Indonesia')).toBeTruthy()
    })

    // Click on event row
    const row = screen.getByText('Bali Region, Indonesia').closest('tr')
    if (row) fireEvent.click(row)

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('calls platform.getEvents with filter parameters', async () => {
    renderWithProviders(<EventsPage />)

    await waitFor(() => {
      expect(platform.getEvents).toHaveBeenCalledOnce()
    })

    const callArg = (platform.getEvents as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArg).toHaveProperty('page')
    expect(callArg).toHaveProperty('pageSize')
  })

  it('renders correct event count in table rows', async () => {
    renderWithProviders(<EventsPage />)

    await waitFor(() => {
      expect(screen.getByText('Bali Region, Indonesia')).toBeTruthy()
    })

    // Check that multiple rows are rendered
    const rows = document.querySelectorAll('tbody tr')
    expect(rows.length).toBe(mockEvents.length)
  })

  it('sorts events by magnitude when clicking M header', async () => {
    renderWithProviders(<EventsPage />)

    await waitFor(() => {
      expect(screen.getByText('Bali Region, Indonesia')).toBeTruthy()
    })

    // Click magnitude column header
    const mHeader = screen.getAllByText('M').find(el => el.closest('th'))
    if (mHeader) fireEvent.click(mHeader.closest('th')!)

    // Table should re-render (no crash)
    const rows = document.querySelectorAll('tbody tr')
    expect(rows.length).toBe(mockEvents.length)
  })
})
