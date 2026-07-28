import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { WaveformPage } from '@/pages/WaveformPage'
import { useWaveformStore } from '@/stores/waveformStore'
import { renderWithProviders } from '../test-utils'

// Mock the heavy waveform subcomponents
vi.mock('@/components/Waveform/WaveformLayout', () => ({
  WaveformLayout: ({ leftSidebar, centerArea, rightSidebar }: { leftSidebar: React.ReactNode; centerArea: React.ReactNode; rightSidebar: React.ReactNode }) => (
    <div data-testid="waveform-layout">
      <div data-testid="left-sidebar">{leftSidebar}</div>
      <div data-testid="center-area">{centerArea}</div>
      <div data-testid="right-sidebar">{rightSidebar}</div>
    </div>
  ),
}))

vi.mock('@/components/Waveform/WaveformLeftSidebar', () => ({
  WaveformLeftSidebar: () => <div data-testid="waveform-left-sidebar">Left Sidebar</div>,
}))

vi.mock('@/components/Waveform/WaveformCenterArea', () => ({
  WaveformCenterArea: () => <div data-testid="waveform-center-area">Center Area</div>,
}))

vi.mock('@/components/Waveform/WaveformRightSidebar', () => ({
  WaveformRightSidebar: () => <div data-testid="waveform-right-sidebar">Right Sidebar</div>,
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ eventId: 'gfz2024abcd' }),
  }
})

const mockLoadWaveforms = vi.fn()
const mockStartProgressTracking = vi.fn()
const mockStopProgressTracking = vi.fn()
const mockReset = vi.fn()

vi.mock('@/stores/waveformStore', () => ({
  useWaveformStore: vi.fn(),
}))

describe('WaveformPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state while fetching waveforms', () => {
    ;(useWaveformStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadWaveforms: mockLoadWaveforms,
      startProgressTracking: mockStartProgressTracking,
      stopProgressTracking: mockStopProgressTracking,
      context: null,
      isLoading: true,
      error: null,
      reset: mockReset,
      isWaveformPrepReady: false,
      progressSnapshot: { stage: null, status: null, progress: 0, message: null },
    })

    renderWithProviders(<WaveformPage />)

    expect(screen.getByText('Loading waveform data...')).toBeTruthy()
  })

  it('shows error state when loading fails', () => {
    ;(useWaveformStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadWaveforms: mockLoadWaveforms,
      startProgressTracking: mockStartProgressTracking,
      stopProgressTracking: mockStopProgressTracking,
      context: null,
      isLoading: false,
      error: 'Failed to fetch waveforms',
      reset: mockReset,
      isWaveformPrepReady: false,
      progressSnapshot: { stage: null, status: null, progress: 0, message: null },
    })

    renderWithProviders(<WaveformPage />)

    expect(screen.getByText('Failed to load waveform data')).toBeTruthy()
    expect(screen.getByText('Failed to fetch waveforms')).toBeTruthy()
  })

  it('shows empty state when no context available', () => {
    ;(useWaveformStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadWaveforms: mockLoadWaveforms,
      startProgressTracking: mockStartProgressTracking,
      stopProgressTracking: mockStopProgressTracking,
      context: null,
      isLoading: false,
      error: null,
      reset: mockReset,
      isWaveformPrepReady: true,
      progressSnapshot: { stage: null, status: null, progress: 0, message: null },
    })

    renderWithProviders(<WaveformPage />)

    expect(screen.getByText('No waveform data available')).toBeTruthy()
  })

  it('renders waveform layout when context is available', () => {
    ;(useWaveformStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadWaveforms: mockLoadWaveforms,
      startProgressTracking: mockStartProgressTracking,
      stopProgressTracking: mockStopProgressTracking,
      context: { jobId: 'job_gfz2024abcd', eventId: 'gfz2024abcd' },
      isLoading: false,
      error: null,
      reset: mockReset,
      isWaveformPrepReady: true,
      progressSnapshot: { stage: 'WAVEFORM_PREP', status: 'done', progress: 100, message: null },
    })

    renderWithProviders(<WaveformPage />)

    expect(screen.getByTestId('waveform-layout')).toBeTruthy()
    expect(screen.getByTestId('waveform-left-sidebar')).toBeTruthy()
    expect(screen.getByTestId('waveform-center-area')).toBeTruthy()
    expect(screen.getByTestId('waveform-right-sidebar')).toBeTruthy()
  })

  it('calls loadWaveforms with correct job ID on mount', () => {
    ;(useWaveformStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadWaveforms: mockLoadWaveforms,
      startProgressTracking: mockStartProgressTracking,
      stopProgressTracking: mockStopProgressTracking,
      context: null,
      isLoading: true,
      error: null,
      reset: mockReset,
      isWaveformPrepReady: false,
      progressSnapshot: { stage: null, status: null, progress: 0, message: null },
    })

    renderWithProviders(<WaveformPage />)

    expect(mockLoadWaveforms).toHaveBeenCalledWith('job_gfz2024abcd')
  })

  it('navigates to events page on back button click (error state)', () => {
    ;(useWaveformStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadWaveforms: mockLoadWaveforms,
      startProgressTracking: mockStartProgressTracking,
      stopProgressTracking: mockStopProgressTracking,
      context: null,
      isLoading: false,
      error: 'Some error',
      reset: mockReset,
      isWaveformPrepReady: false,
      progressSnapshot: { stage: null, status: null, progress: 0, message: null },
    })

    renderWithProviders(<WaveformPage />)

    const backButton = screen.getByText('Back to Events')
    fireEvent.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith('/events')
  })

  it('navigates to events page on back button click (empty state)', () => {
    ;(useWaveformStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadWaveforms: mockLoadWaveforms,
      startProgressTracking: mockStartProgressTracking,
      stopProgressTracking: mockStopProgressTracking,
      context: null,
      isLoading: false,
      error: null,
      reset: mockReset,
      isWaveformPrepReady: true,
      progressSnapshot: { stage: null, status: null, progress: 0, message: null },
    })

    renderWithProviders(<WaveformPage />)

    const backButton = screen.getByText('Back to Events')
    fireEvent.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith('/events')
  })

  it('shows waiting gate state before WAVEFORM_PREP is done', () => {
    ;(useWaveformStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadWaveforms: mockLoadWaveforms,
      startProgressTracking: mockStartProgressTracking,
      stopProgressTracking: mockStopProgressTracking,
      context: null,
      isLoading: false,
      error: null,
      reset: mockReset,
      isWaveformPrepReady: false,
      progressSnapshot: {
        stage: 'WAVEFORM_PREP',
        status: 'running',
        progress: 75,
        message: 'Preparing waveforms',
      },
    })

    renderWithProviders(<WaveformPage />)

    expect(screen.getByText('Waiting for WAVEFORM_PREP to complete')).toBeTruthy()
  })
})
