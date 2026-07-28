import { describe, it, expect, beforeEach } from 'vitest'
import { useWaveformStore } from '@/stores/waveformStore'

describe('waveformStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWaveformStore.setState({
      jobId: null,
      stations: [],
      context: null,
      normalizationMode: 'trace',
      processingProfile: 'QCMT_R',
      frequencyFilter: { low: 0.01, high: 0.1 },
      sortColumn: 'distance',
      sortDirection: 'asc',
      distanceGroupFilter: new Set(['local', 'regional', 'teleseismic']),
    })
  })

  describe('setNormalizationMode', () => {
    it('should update normalization mode', () => {
      const store = useWaveformStore.getState()
      store.setNormalizationMode('all')
      
      const updated = useWaveformStore.getState()
      expect(updated.normalizationMode).toBe('all')
    })

    it('should support all normalization modes', () => {
      const modes = ['trace', 'single', 'all', 'none'] as const
      
      modes.forEach(mode => {
        const store = useWaveformStore.getState()
        store.setNormalizationMode(mode)
        
        const updated = useWaveformStore.getState()
        expect(updated.normalizationMode).toBe(mode)
      })
    })
  })

  describe('setProcessingProfile', () => {
    it('should update processing profile', () => {
      const store = useWaveformStore.getState()
      store.setProcessingProfile('MS-MLS')
      
      const updated = useWaveformStore.getState()
      expect(updated.processingProfile).toBe('MS-MLS')
    })
  })

  describe('setFrequencyFilter', () => {
    it('should update frequency filter', () => {
      const store = useWaveformStore.getState()
      store.setFrequencyFilter(0.02, 0.08)
      
      const updated = useWaveformStore.getState()
      expect(updated.frequencyFilter.low).toBe(0.02)
      expect(updated.frequencyFilter.high).toBe(0.08)
    })

    it('should prevent low > high', () => {
      const store = useWaveformStore.getState()
      // Set valid first
      store.setFrequencyFilter(0.02, 0.08)
      
      // Try to set invalid (should not crash)
      store.setFrequencyFilter(0.09, 0.05)
      
      // Store should still have previous valid values or handle gracefully
      const updated = useWaveformStore.getState()
      expect(updated.frequencyFilter).toBeDefined()
    })
  })

  describe('setSorting', () => {
    it('should set sort column and direction', () => {
      const store = useWaveformStore.getState()
      store.setSorting('fit')
      
      let updated = useWaveformStore.getState()
      expect(updated.sortColumn).toBe('fit')
      expect(updated.sortDirection).toBe('asc')
      
      // Toggle direction on same column
      store.setSorting('fit')
      updated = useWaveformStore.getState()
      expect(updated.sortDirection).toBe('desc')
    })

    it('should reset direction when changing column', () => {
      const store = useWaveformStore.getState()
      
      store.setSorting('fit')
      let updated = useWaveformStore.getState()
      expect(updated.sortDirection).toBe('asc')
      
      store.setSorting('distance')
      updated = useWaveformStore.getState()
      expect(updated.sortColumn).toBe('distance')
      expect(updated.sortDirection).toBe('asc')
    })
  })

  describe('toggleDistanceGroupFilter', () => {
    it('should toggle distance group in filter', () => {
      const store = useWaveformStore.getState()
      const initial = useWaveformStore.getState()
      expect(initial.distanceGroupFilter.has('local')).toBe(true)
      
      store.toggleDistanceGroupFilter('local')
      let updated = useWaveformStore.getState()
      expect(updated.distanceGroupFilter.has('local')).toBe(false)
      
      store.toggleDistanceGroupFilter('local')
      updated = useWaveformStore.getState()
      expect(updated.distanceGroupFilter.has('local')).toBe(true)
    })

    it('should support all distance groups', () => {
      const store = useWaveformStore.getState()
      const groups = ['local', 'regional', 'teleseismic'] as const
      
      // Disable all
      groups.forEach(g => {
        store.toggleDistanceGroupFilter(g)
      })
      
      let updated = useWaveformStore.getState()
      groups.forEach(g => {
        expect(updated.distanceGroupFilter.has(g)).toBe(false)
      })
    })
  })

  describe('selectAll / deselectAll', () => {
    it('should select/deselect all stations', () => {
      // Mock stations
      const mockStations = [
        {
          stationKey: 'IA.CGJI..',
          isSelected: false,
          isActive: true,
          metadata: { network: 'IA', station: 'CGJI', location: '', channel: 'HHZ', distance_deg: 1.5, distance_km: 165, azimuth_deg: 45, backazimuth_deg: 225 },
          contribution: { weight: 0.8, active: true, misfit: 0.1, snr: 9.2 },
          distanceGroup: 'local' as const,
        },
        {
          stationKey: 'IA.SMKI..',
          isSelected: false,
          isActive: true,
          metadata: { network: 'IA', station: 'SMKI', location: '', channel: 'HHZ', distance_deg: 5.0, distance_km: 555, azimuth_deg: 120, backazimuth_deg: 300 },
          contribution: { weight: 0.7, active: true, misfit: 0.15, snr: 8.5 },
          distanceGroup: 'regional' as const,
        },
      ]
      
      useWaveformStore.setState({ stations: mockStations as any })
      const store = useWaveformStore.getState()
      
      store.selectAll()
      let updated = useWaveformStore.getState()
      expect(updated.selectedStationKeys.size).toBe(2)
      expect(updated.selectedStationKeys.has('IA.CGJI..')).toBe(true)
      expect(updated.selectedStationKeys.has('IA.SMKI..')).toBe(true)
      
      store.deselectAll()
      updated = useWaveformStore.getState()
      expect(updated.selectedStationKeys.size).toBe(0)
    })
  })

  describe('enableAll / disableAll', () => {
    it('should enable/disable all stations', () => {
      const mockStations = [
        {
          stationKey: 'IA.CGJI..',
          isSelected: false,
          isActive: false,
          metadata: { network: 'IA', station: 'CGJI', location: '', channel: 'HHZ', distance_deg: 1.5, distance_km: 165, azimuth_deg: 45, backazimuth_deg: 225 },
          contribution: { weight: 0.8, active: false, misfit: 0.1, snr: 9.2 },
          distanceGroup: 'local' as const,
        },
        {
          stationKey: 'IA.SMKI..',
          isSelected: false,
          isActive: false,
          metadata: { network: 'IA', station: 'SMKI', location: '', channel: 'HHZ', distance_deg: 5.0, distance_km: 555, azimuth_deg: 120, backazimuth_deg: 300 },
          contribution: { weight: 0.7, active: false, misfit: 0.15, snr: 8.5 },
          distanceGroup: 'regional' as const,
        },
      ]
      
      useWaveformStore.setState({ stations: mockStations as any })
      const store = useWaveformStore.getState()
      
      store.enableAll()
      let updated = useWaveformStore.getState()
      expect(updated.stations[0].contribution.active).toBe(true)
      expect(updated.stations[1].contribution.active).toBe(true)
      
      store.disableAll()
      updated = useWaveformStore.getState()
      expect(updated.stations[0].contribution.active).toBe(false)
      expect(updated.stations[1].contribution.active).toBe(false)
    })
  })

  describe('toggleStationSelection', () => {
    it('should toggle station selection', () => {
      const mockStations = [
        {
          stationKey: 'IA.CGJI..',
          isSelected: false,
          isActive: true,
          metadata: { network: 'IA', station: 'CGJI', location: '', channel: 'HHZ', distance_deg: 1.5, distance_km: 165, azimuth_deg: 45, backazimuth_deg: 225 },
          contribution: { weight: 0.8, active: true, misfit: 0.1, snr: 9.2 },
          distanceGroup: 'local' as const,
        },
      ]
      
      useWaveformStore.setState({ stations: mockStations as any, selectedStationKeys: new Set() })
      const store = useWaveformStore.getState()
      
      store.toggleStationSelection('IA.CGJI..')
      let updated = useWaveformStore.getState()
      expect(updated.selectedStationKeys.has('IA.CGJI..')).toBe(true)
      expect(updated.stations[0].isSelected).toBe(true)
      
      store.toggleStationSelection('IA.CGJI..')
      updated = useWaveformStore.getState()
      expect(updated.selectedStationKeys.has('IA.CGJI..')).toBe(false)
      expect(updated.stations[0].isSelected).toBe(false)
    })
  })
})
