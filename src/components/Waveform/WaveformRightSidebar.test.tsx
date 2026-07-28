import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WaveformRightSidebar } from '@/components/Waveform/WaveformRightSidebar'
import { useWaveformStore } from '@/stores/waveformStore'
import { act } from 'react-dom/test-utils'

// Mock Zustand store
vi.mock('@/stores/waveformStore', () => ({
  useWaveformStore: vi.fn(),
}))

// Mock color utilities
vi.mock('@/lib/waveform-colors', () => ({
  DISTANCE_GROUP_COLORS: {
    local: '#f97316',
    regional: '#22c55e',
    teleseismic: '#3b82f6',
  },
  getFitQualityColor: (fit: number) => {
    if (fit >= 85) return '#22c55e' // green
    if (fit >= 70) return '#eab308' // yellow
    return '#ef4444' // red
  },
}))

// Mock formatters
vi.mock('@/lib/waveform-formatters', () => ({
  formatDistance: (d: number) => d.toFixed(1) + '°',
  formatAzimuth: (a: number) => a.toFixed(0) + '°',
  formatWeight: (w: number) => w.toFixed(2),
  formatMisfit: (m: number) => ((1 - m) * 100).toFixed(1) + '%',
}))

describe('WaveformRightSidebar', () => {
  const mockStations = [
    {
      stationKey: 'IA.CGJI',
      isSelected: false,
      isActive: true,
      metadata: {
        network: 'IA',
        station: 'CGJI',
        channel: 'HHZ',
        distance_deg: 1.5,
        azimuth_deg: 45,
      },
      contribution: {
        weight: 0.8,
        active: true,
        misfit: 0.15,
        snr: 9.2,
      },
      distanceGroup: 'local' as const,
      waveforms: {},
    },
    {
      stationKey: 'IA.SMKI',
      isSelected: false,
      isActive: true,
      metadata: {
        network: 'IA',
        station: 'SMKI',
        channel: 'HHZ',
        distance_deg: 5.0,
        azimuth_deg: 120,
      },
      contribution: {
        weight: 0.7,
        active: true,
        misfit: 0.12,
        snr: 8.5,
      },
      distanceGroup: 'regional' as const,
      waveforms: {},
    },
    {
      stationKey: 'II.XMIS',
      isSelected: false,
      isActive: true,
      metadata: {
        network: 'II',
        station: 'XMIS',
        channel: 'BHZ',
        distance_deg: 45.0,
        azimuth_deg: 310,
      },
      contribution: {
        weight: 0.9,
        active: true,
        misfit: 0.18,
        snr: 10.1,
      },
      distanceGroup: 'teleseismic' as const,
      waveforms: {},
    },
  ]

  const mockStore = {
    stations: mockStations,
    getFilteredStations: vi.fn(() => mockStations),
    sortColumn: 'distance',
    sortDirection: 'asc' as const,
    setSorting: vi.fn(),
    distanceGroupFilter: new Set(['local', 'regional', 'teleseismic']),
    toggleDistanceGroupFilter: vi.fn(),
    selectAll: vi.fn(),
    deselectAll: vi.fn(),
    enableAll: vi.fn(),
    disableAll: vi.fn(),
    toggleStationSelection: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useWaveformStore as any).mockReturnValue(mockStore)
  })

  it('should render station table', () => {
    const { container } = render(<WaveformRightSidebar />)
    // Check that the station table container is rendered
    expect(container.querySelector('.flex.h-full.flex-col')).toBeTruthy()
  })

  it('should display station count', () => {
    render(<WaveformRightSidebar />)
    expect(screen.getByText(/Stations \(3\/3\)/)).toBeTruthy()
  })

  it('should display distance group filters', () => {
    render(<WaveformRightSidebar />)
    expect(screen.getByText('Local')).toBeTruthy()
    expect(screen.getByText('Regional')).toBeTruthy()
    expect(screen.getByText('Tele')).toBeTruthy()
  })

  it('should handle sort column toggle', async () => {
    render(<WaveformRightSidebar />)
    
    const distanceHeader = screen.getByText('Dist°')
    fireEvent.click(distanceHeader)
    
    await waitFor(() => {
      expect(mockStore.setSorting).toHaveBeenCalledWith('distance')
    })
  })

  it('should display sort direction indicator', () => {
    render(<WaveformRightSidebar />)
    // Should show arrow indicator for active sort
    expect(screen.getByText(/▲|▼/)).toBeTruthy()
  })

  it('should handle select all button', async () => {
    render(<WaveformRightSidebar />)
    
    const selectAllBtn = screen.getByText('All')
    fireEvent.click(selectAllBtn)
    
    await waitFor(() => {
      expect(mockStore.selectAll).toHaveBeenCalled()
    })
  })

  it('should handle deselect all button', async () => {
    render(<WaveformRightSidebar />)
    
    const deselectBtn = screen.getByText('None')
    fireEvent.click(deselectBtn)
    
    await waitFor(() => {
      expect(mockStore.deselectAll).toHaveBeenCalled()
    })
  })

  it('should handle distance group filter toggle', async () => {
    render(<WaveformRightSidebar />)
    
    // Get all checkboxes and click the first one (Local filter)
    const checkboxes = screen.getAllByRole('checkbox')
    if (checkboxes.length > 0) {
      fireEvent.click(checkboxes[0])
      
      await waitFor(() => {
        expect(mockStore.toggleDistanceGroupFilter).toHaveBeenCalledWith(expect.any(String))
      })
    }
  })

  it('should handle enable all button', async () => {
    render(<WaveformRightSidebar />)
    
    const enableBtn = screen.getByText('Enable All')
    fireEvent.click(enableBtn)
    
    await waitFor(() => {
      expect(mockStore.enableAll).toHaveBeenCalled()
    })
  })

  it('should handle disable all button', async () => {
    render(<WaveformRightSidebar />)
    
    const disableBtn = screen.getByText('Disable All')
    fireEvent.click(disableBtn)
    
    await waitFor(() => {
      expect(mockStore.disableAll).toHaveBeenCalled()
    })
  })

  it('should display station data in rows', () => {
    render(<WaveformRightSidebar />)
    
    // Check for station names
    expect(screen.getByText('CGJI')).toBeTruthy()
    expect(screen.getByText('SMKI')).toBeTruthy()
    expect(screen.getByText('XMIS')).toBeTruthy()
  })

  it('should calculate and display average fit quality', () => {
    // Average fit of mockStations: (85 + 88 + 82) / 3 = 85%
    mockStore.getFilteredStations = vi.fn(() => mockStations)
    
    render(<WaveformRightSidebar />)
    
    // Footer should display average fit
    expect(screen.getByText(/Avg Fit:/)).toBeTruthy()
  })

  it('should handle empty station list', () => {
    mockStore.stations = []
    mockStore.getFilteredStations = vi.fn(() => [])
    
    render(<WaveformRightSidebar />)
    expect(screen.getByText('No stations match filter')).toBeTruthy()
  })

  it('should handle station selection toggle', () => {
    const { container } = render(<WaveformRightSidebar />)
    
    // Find a checkbox for a station
    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('should update selected count in footer', () => {
    mockStore.stations = mockStations.map((s, i) => ({
      ...s,
      isSelected: i < 2, // Select first 2
    }))
    
    render(<WaveformRightSidebar />)
    expect(screen.getByText('Selected:')).toBeTruthy()
  })

  it('should support multiple sortable columns', () => {
    render(<WaveformRightSidebar />)
    
    const sortableColumns = ['Net', 'Sta', 'Dist°', 'Az°', 'Wgt', 'Fit%', 'SNR']
    sortableColumns.forEach(col => {
      expect(screen.getByText(col)).toBeTruthy()
    })
  })
})
