// ─── Mock Waveform Data for Development & Testing ────────────────────────────

import type {
  ProcessingContext,
  StationMetadata,
  StationWaveformData,
  ComponentQuality,
  MomentTensorSolution,
} from '@/types/waveform'
import type { WaveformTraceData, SignalWindow, StationMTContribution } from '@/types/seismology'
import { getDistanceGroup, PHASE_COLORS } from '@/lib/waveform-colors'

// ─── Mock Processing Context ─────────────────────────────────────────────────

export const mockProcessingContext: ProcessingContext = {
  job_id: 'job_20250124_001234',
  event_id: '20250124001234',
  current_stage: 'OPTIMIZED',
  event: {
    lat: -6.5,
    lon: 106.8,
    depth_km: 15.0,
    mag: 5.4,
    origin_time: '2025-01-24T00:12:34.560Z',
  },
  params: {
    inversion_method: 'QCMT_R',
    fmin: 0.02,
    fmax: 0.08,
    min_dist: 0.5,
    max_dist: 90.0,
    deviatoric: true,
    use_gpu: true,
    centroid_inversion: true,
    dc_interest_eq: false,
  },
  valid_waveforms: {}, // Will be populated by mockStations
  selected_stations: [], // Will be populated below
  best_solution: {
    depth_km: 15.2,
    variance_reduction: 0.68,
    dc_perc: 88.5,
    clvd_perc: 11.5,
    iso_perc: 0.0,
    scalar_moment: 1.23e17,
    magnitude_mw: 5.4,
    tensor: {
      mrr: 0.523,
      mtt: -0.421,
      mpp: -0.102,
      mrt: 0.234,
      mrp: -0.123,
      mtp: 0.087,
    },
  },
}

// ─── Mock Station Metadata (66 Indonesian Stations) ──────────────────────────

export const mockStations: StationMetadata[] = [
  // Local Stations (<3°) - 6 stations
  { network: 'IA', station: 'CGJI', location: '', channel: 'BHZ', distance_deg: 0.85, distance_km: 95, azimuth_deg: 45, backazimuth_deg: 225, Z: { snr: 12.5, is_valid: true, weight: 1.0 }, R: { snr: 10.2, is_valid: true, weight: 0.9 }, T: { snr: 8.7, is_valid: true, weight: 0.8 } },
  { network: 'IA', station: 'SMKI', location: '', channel: 'BHZ', distance_deg: 1.2, distance_km: 133, azimuth_deg: 120, backazimuth_deg: 300, Z: { snr: 15.3, is_valid: true, weight: 1.0 }, R: { snr: 13.1, is_valid: true, weight: 0.95 }, T: { snr: 11.8, is_valid: true, weight: 0.9 } },
  { network: 'IA', station: 'KASI', location: '', channel: 'BHZ', distance_deg: 1.8, distance_km: 200, azimuth_deg: 280, backazimuth_deg: 100, Z: { snr: 9.8, is_valid: true, weight: 0.85 }, R: { snr: 8.5, is_valid: true, weight: 0.8 }, T: { snr: 7.2, is_valid: true, weight: 0.7 } },
  { network: 'IA', station: 'BNDI', location: '', channel: 'BHZ', distance_deg: 2.1, distance_km: 233, azimuth_deg: 180, backazimuth_deg: 0, Z: { snr: 11.2, is_valid: true, weight: 0.9 }, R: { snr: 9.7, is_valid: true, weight: 0.85 }, T: { snr: 8.3, is_valid: true, weight: 0.75 } },
  { network: 'IA', station: 'CISI', location: '', channel: 'BHZ', distance_deg: 2.5, distance_km: 278, azimuth_deg: 90, backazimuth_deg: 270, Z: { snr: 13.7, is_valid: true, weight: 0.95 }, R: { snr: 12.2, is_valid: true, weight: 0.9 }, T: { snr: 10.5, is_valid: true, weight: 0.85 } },
  { network: 'IA', station: 'TISI', location: '', channel: 'BHZ', distance_deg: 2.9, distance_km: 322, azimuth_deg: 315, backazimuth_deg: 135, Z: { snr: 10.5, is_valid: true, weight: 0.88 }, R: { snr: 9.2, is_valid: true, weight: 0.82 }, T: { snr: 7.8, is_valid: true, weight: 0.72 } },

  // Regional Stations (3-10°) - 42 stations
  { network: 'IA', station: 'SMRI', location: '', channel: 'BHZ', distance_deg: 3.2, distance_km: 356, azimuth_deg: 35, backazimuth_deg: 215, Z: { snr: 18.5, is_valid: true, weight: 1.0 }, R: { snr: 16.3, is_valid: true, weight: 0.95 }, T: { snr: 14.2, is_valid: true, weight: 0.9 } },
  { network: 'IA', station: 'PLAI', location: '', channel: 'BHZ', distance_deg: 3.8, distance_km: 422, azimuth_deg: 95, backazimuth_deg: 275, Z: { snr: 16.2, is_valid: true, weight: 0.98 }, R: { snr: 14.5, is_valid: true, weight: 0.92 }, T: { snr: 12.8, is_valid: true, weight: 0.87 } },
  { network: 'IA', station: 'LHMI', location: '', channel: 'BHZ', distance_deg: 4.5, distance_km: 500, azimuth_deg: 225, backazimuth_deg: 45, Z: { snr: 14.8, is_valid: true, weight: 0.93 }, R: { snr: 13.2, is_valid: true, weight: 0.88 }, T: { snr: 11.5, is_valid: true, weight: 0.83 } },
  { network: 'IA', station: 'MNAI', location: '', channel: 'BHZ', distance_deg: 5.1, distance_km: 567, azimuth_deg: 155, backazimuth_deg: 335, Z: { snr: 17.3, is_valid: true, weight: 0.96 }, R: { snr: 15.7, is_valid: true, weight: 0.91 }, T: { snr: 13.9, is_valid: true, weight: 0.86 } },
  { network: 'IA', station: 'BBJI', location: '', channel: 'BHZ', distance_deg: 5.7, distance_km: 633, azimuth_deg: 285, backazimuth_deg: 105, Z: { snr: 15.5, is_valid: true, weight: 0.94 }, R: { snr: 13.8, is_valid: true, weight: 0.89 }, T: { snr: 12.1, is_valid: true, weight: 0.84 } },
  { network: 'IA', station: 'DPPI', location: '', channel: 'BHZ', distance_deg: 6.3, distance_km: 700, azimuth_deg: 10, backazimuth_deg: 190, Z: { snr: 19.2, is_valid: true, weight: 0.99 }, R: { snr: 17.5, is_valid: true, weight: 0.94 }, T: { snr: 15.6, is_valid: true, weight: 0.89 } },
  { network: 'IA', station: 'MWSI', location: '', channel: 'BHZ', distance_deg: 6.9, distance_km: 767, azimuth_deg: 135, backazimuth_deg: 315, Z: { snr: 16.8, is_valid: true, weight: 0.95 }, R: { snr: 15.1, is_valid: true, weight: 0.9 }, T: { snr: 13.4, is_valid: true, weight: 0.85 } },
  { network: 'IA', station: 'TNTI', location: '', channel: 'BHZ', distance_deg: 7.5, distance_km: 833, azimuth_deg: 255, backazimuth_deg: 75, Z: { snr: 14.3, is_valid: true, weight: 0.92 }, R: { snr: 12.7, is_valid: true, weight: 0.87 }, T: { snr: 11.0, is_valid: true, weight: 0.82 } },
  { network: 'IA', station: 'SLWI', location: '', channel: 'BHZ', distance_deg: 8.1, distance_km: 900, azimuth_deg: 65, backazimuth_deg: 245, Z: { snr: 18.7, is_valid: true, weight: 0.97 }, R: { snr: 16.9, is_valid: true, weight: 0.92 }, T: { snr: 15.1, is_valid: true, weight: 0.87 } },
  { network: 'IA', station: 'KRAI', location: '', channel: 'BHZ', distance_deg: 8.7, distance_km: 967, azimuth_deg: 195, backazimuth_deg: 15, Z: { snr: 15.9, is_valid: true, weight: 0.94 }, R: { snr: 14.2, is_valid: true, weight: 0.89 }, T: { snr: 12.5, is_valid: true, weight: 0.84 } },
  { network: 'IA', station: 'OBMI', location: '', channel: 'BHZ', distance_deg: 9.3, distance_km: 1033, azimuth_deg: 325, backazimuth_deg: 145, Z: { snr: 17.6, is_valid: true, weight: 0.96 }, R: { snr: 15.8, is_valid: true, weight: 0.91 }, T: { snr: 14.0, is_valid: true, weight: 0.86 } },
  { network: 'GE', station: 'GSI', location: '', channel: 'BHZ', distance_deg: 9.9, distance_km: 1100, azimuth_deg: 105, backazimuth_deg: 285, Z: { snr: 16.1, is_valid: true, weight: 0.95 }, R: { snr: 14.4, is_valid: true, weight: 0.9 }, T: { snr: 12.7, is_valid: true, weight: 0.85 } },

  // Additional regional stations (30 more to reach 42 total)
  { network: 'IA', station: 'JMBI', location: '', channel: 'BHZ', distance_deg: 4.2, distance_km: 467, azimuth_deg: 172, backazimuth_deg: 352, Z: { snr: 13.5, is_valid: true, weight: 0.91 }, R: { snr: 12.0, is_valid: true, weight: 0.86 }, T: { snr: 10.3, is_valid: true, weight: 0.81 } },
  { network: 'IA', station: 'LUWI', location: '', channel: 'BHZ', distance_deg: 4.8, distance_km: 533, azimuth_deg: 248, backazimuth_deg: 68, Z: { snr: 15.2, is_valid: true, weight: 0.93 }, R: { snr: 13.6, is_valid: true, weight: 0.88 }, T: { snr: 11.9, is_valid: true, weight: 0.83 } },
  { network: 'IA', station: 'PKSI', location: '', channel: 'BHZ', distance_deg: 5.4, distance_km: 600, azimuth_deg: 78, backazimuth_deg: 258, Z: { snr: 14.7, is_valid: true, weight: 0.92 }, R: { snr: 13.1, is_valid: true, weight: 0.87 }, T: { snr: 11.4, is_valid: true, weight: 0.82 } },
  { network: 'IA', station: 'SANI', location: '', channel: 'BHZ', distance_deg: 6.0, distance_km: 667, azimuth_deg: 202, backazimuth_deg: 22, Z: { snr: 16.4, is_valid: true, weight: 0.95 }, R: { snr: 14.7, is_valid: true, weight: 0.9 }, T: { snr: 12.9, is_valid: true, weight: 0.85 } },
  { network: 'IA', station: 'TOLI', location: '', channel: 'BHZ', distance_deg: 6.6, distance_km: 733, azimuth_deg: 312, backazimuth_deg: 132, Z: { snr: 15.1, is_valid: true, weight: 0.93 }, R: { snr: 13.5, is_valid: true, weight: 0.88 }, T: { snr: 11.8, is_valid: true, weight: 0.83 } },
  { network: 'IA', station: 'TWSI', location: '', channel: 'BHZ', distance_deg: 7.2, distance_km: 800, azimuth_deg: 42, backazimuth_deg: 222, Z: { snr: 17.9, is_valid: true, weight: 0.97 }, R: { snr: 16.2, is_valid: true, weight: 0.92 }, T: { snr: 14.4, is_valid: true, weight: 0.87 } },
  { network: 'IA', station: 'UWRI', location: '', channel: 'BHZ', distance_deg: 7.8, distance_km: 867, azimuth_deg: 158, backazimuth_deg: 338, Z: { snr: 14.6, is_valid: true, weight: 0.92 }, R: { snr: 13.0, is_valid: true, weight: 0.87 }, T: { snr: 11.3, is_valid: true, weight: 0.82 } },
  { network: 'IA', station: 'VLSI', location: '', channel: 'BHZ', distance_deg: 8.4, distance_km: 933, azimuth_deg: 268, backazimuth_deg: 88, Z: { snr: 16.7, is_valid: true, weight: 0.95 }, R: { snr: 15.0, is_valid: true, weight: 0.9 }, T: { snr: 13.2, is_valid: true, weight: 0.85 } },
  { network: 'IA', station: 'YOGI', location: '', channel: 'BHZ', distance_deg: 9.0, distance_km: 1000, azimuth_deg: 88, backazimuth_deg: 268, Z: { snr: 15.4, is_valid: true, weight: 0.94 }, R: { snr: 13.8, is_valid: true, weight: 0.89 }, T: { snr: 12.1, is_valid: true, weight: 0.84 } },
  { network: 'IA', station: 'ABMI', location: '', channel: 'BHZ', distance_deg: 3.5, distance_km: 389, azimuth_deg: 142, backazimuth_deg: 322, Z: { snr: 12.8, is_valid: true, weight: 0.9 }, R: { snr: 11.3, is_valid: true, weight: 0.85 }, T: { snr: 9.8, is_valid: true, weight: 0.8 } },
  { network: 'IA', station: 'BKSI', location: '', channel: 'BHZ', distance_deg: 4.1, distance_km: 456, azimuth_deg: 218, backazimuth_deg: 38, Z: { snr: 14.1, is_valid: true, weight: 0.92 }, R: { snr: 12.6, is_valid: true, weight: 0.87 }, T: { snr: 10.9, is_valid: true, weight: 0.82 } },
  { network: 'IA', station: 'CLSI', location: '', channel: 'BHZ', distance_deg: 4.7, distance_km: 522, azimuth_deg: 295, backazimuth_deg: 115, Z: { snr: 13.3, is_valid: true, weight: 0.91 }, R: { snr: 11.9, is_valid: true, weight: 0.86 }, T: { snr: 10.2, is_valid: true, weight: 0.81 } },
  { network: 'IA', station: 'DNPI', location: '', channel: 'BHZ', distance_deg: 5.3, distance_km: 589, azimuth_deg: 52, backazimuth_deg: 232, Z: { snr: 15.6, is_valid: true, weight: 0.94 }, R: { snr: 14.0, is_valid: true, weight: 0.89 }, T: { snr: 12.3, is_valid: true, weight: 0.84 } },
  { network: 'IA', station: 'EASI', location: '', channel: 'BHZ', distance_deg: 5.9, distance_km: 656, azimuth_deg: 168, backazimuth_deg: 348, Z: { snr: 14.9, is_valid: true, weight: 0.93 }, R: { snr: 13.3, is_valid: true, weight: 0.88 }, T: { snr: 11.6, is_valid: true, weight: 0.83 } },
  { network: 'IA', station: 'FAKI', location: '', channel: 'BHZ', distance_deg: 6.5, distance_km: 722, azimuth_deg: 242, backazimuth_deg: 62, Z: { snr: 16.2, is_valid: true, weight: 0.95 }, R: { snr: 14.6, is_valid: true, weight: 0.9 }, T: { snr: 12.8, is_valid: true, weight: 0.85 } },
  { network: 'IA', station: 'GBMI', location: '', channel: 'BHZ', distance_deg: 7.1, distance_km: 789, azimuth_deg: 318, backazimuth_deg: 138, Z: { snr: 15.0, is_valid: true, weight: 0.93 }, R: { snr: 13.4, is_valid: true, weight: 0.88 }, T: { snr: 11.7, is_valid: true, weight: 0.83 } },
  { network: 'IA', station: 'HARI', location: '', channel: 'BHZ', distance_deg: 7.7, distance_km: 856, azimuth_deg: 28, backazimuth_deg: 208, Z: { snr: 17.4, is_valid: true, weight: 0.96 }, R: { snr: 15.8, is_valid: true, weight: 0.91 }, T: { snr: 13.9, is_valid: true, weight: 0.86 } },
  { network: 'IA', station: 'IBTI', location: '', channel: 'BHZ', distance_deg: 8.3, distance_km: 922, azimuth_deg: 142, backazimuth_deg: 322, Z: { snr: 14.4, is_valid: true, weight: 0.92 }, R: { snr: 12.9, is_valid: true, weight: 0.87 }, T: { snr: 11.2, is_valid: true, weight: 0.82 } },
  { network: 'IA', station: 'JKTI', location: '', channel: 'BHZ', distance_deg: 8.9, distance_km: 989, azimuth_deg: 252, backazimuth_deg: 72, Z: { snr: 16.5, is_valid: true, weight: 0.95 }, R: { snr: 14.8, is_valid: true, weight: 0.9 }, T: { snr: 13.0, is_valid: true, weight: 0.85 } },
  { network: 'IA', station: 'KBMI', location: '', channel: 'BHZ', distance_deg: 9.5, distance_km: 1056, azimuth_deg: 72, backazimuth_deg: 252, Z: { snr: 15.3, is_valid: true, weight: 0.94 }, R: { snr: 13.7, is_valid: true, weight: 0.89 }, T: { snr: 12.0, is_valid: true, weight: 0.84 } },
  { network: 'IA', station: 'LBMI', location: '', channel: 'BHZ', distance_deg: 3.6, distance_km: 400, azimuth_deg: 188, backazimuth_deg: 8, Z: { snr: 13.1, is_valid: true, weight: 0.91 }, R: { snr: 11.7, is_valid: true, weight: 0.86 }, T: { snr: 10.1, is_valid: true, weight: 0.81 } },
  { network: 'IA', station: 'MBSI', location: '', channel: 'BHZ', distance_deg: 4.3, distance_km: 478, azimuth_deg: 262, backazimuth_deg: 82, Z: { snr: 14.5, is_valid: true, weight: 0.92 }, R: { snr: 13.0, is_valid: true, weight: 0.87 }, T: { snr: 11.3, is_valid: true, weight: 0.82 } },
  { network: 'IA', station: 'NCSI', location: '', channel: 'BHZ', distance_deg: 4.9, distance_km: 544, azimuth_deg: 112, backazimuth_deg: 292, Z: { snr: 13.7, is_valid: true, weight: 0.91 }, R: { snr: 12.3, is_valid: true, weight: 0.86 }, T: { snr: 10.6, is_valid: true, weight: 0.81 } },
  { network: 'IA', station: 'ODSI', location: '', channel: 'BHZ', distance_deg: 5.5, distance_km: 611, azimuth_deg: 38, backazimuth_deg: 218, Z: { snr: 15.8, is_valid: true, weight: 0.94 }, R: { snr: 14.2, is_valid: true, weight: 0.89 }, T: { snr: 12.5, is_valid: true, weight: 0.84 } },
  { network: 'IA', station: 'PBSI', location: '', channel: 'BHZ', distance_deg: 6.1, distance_km: 678, azimuth_deg: 152, backazimuth_deg: 332, Z: { snr: 14.3, is_valid: true, weight: 0.92 }, R: { snr: 12.8, is_valid: true, weight: 0.87 }, T: { snr: 11.1, is_valid: true, weight: 0.82 } },
  { network: 'IA', station: 'QBSI', location: '', channel: 'BHZ', distance_deg: 6.7, distance_km: 744, azimuth_deg: 228, backazimuth_deg: 48, Z: { snr: 16.0, is_valid: true, weight: 0.95 }, R: { snr: 14.4, is_valid: true, weight: 0.9 }, T: { snr: 12.6, is_valid: true, weight: 0.85 } },
  { network: 'IA', station: 'RBSI', location: '', channel: 'BHZ', distance_deg: 7.3, distance_km: 811, azimuth_deg: 302, backazimuth_deg: 122, Z: { snr: 14.8, is_valid: true, weight: 0.93 }, R: { snr: 13.2, is_valid: true, weight: 0.88 }, T: { snr: 11.5, is_valid: true, weight: 0.83 } },
  { network: 'IA', station: 'SBSI', location: '', channel: 'BHZ', distance_deg: 7.9, distance_km: 878, azimuth_deg: 12, backazimuth_deg: 192, Z: { snr: 17.2, is_valid: true, weight: 0.96 }, R: { snr: 15.6, is_valid: true, weight: 0.91 }, T: { snr: 13.8, is_valid: true, weight: 0.86 } },
  { network: 'IA', station: 'TBSI', location: '', channel: 'BHZ', distance_deg: 8.5, distance_km: 944, azimuth_deg: 128, backazimuth_deg: 308, Z: { snr: 14.2, is_valid: true, weight: 0.92 }, R: { snr: 12.7, is_valid: true, weight: 0.87 }, T: { snr: 11.0, is_valid: true, weight: 0.82 } },
  { network: 'IA', station: 'UBSI', location: '', channel: 'BHZ', distance_deg: 9.1, distance_km: 1011, azimuth_deg: 238, backazimuth_deg: 58, Z: { snr: 16.3, is_valid: true, weight: 0.95 }, R: { snr: 14.7, is_valid: true, weight: 0.9 }, T: { snr: 12.9, is_valid: true, weight: 0.85 } },

  // Teleseismic Stations (>10°) - 18 stations
  { network: 'AU', station: 'ARMA', location: '', channel: 'BHZ', distance_deg: 45.2, distance_km: 5022, azimuth_deg: 135, backazimuth_deg: 315, Z: { snr: 8.5, is_valid: true, weight: 0.75 }, R: { snr: 7.2, is_valid: true, weight: 0.68 }, T: { snr: 6.1, is_valid: true, weight: 0.6 } },
  { network: 'II', station: 'KAPI', location: '00', channel: 'BHZ', distance_deg: 52.8, distance_km: 5866, azimuth_deg: 80, backazimuth_deg: 260, Z: { snr: 9.3, is_valid: true, weight: 0.78 }, R: { snr: 8.1, is_valid: true, weight: 0.72 }, T: { snr: 6.9, is_valid: true, weight: 0.65 } },
  { network: 'IU', station: 'CTAO', location: '00', channel: 'BHZ', distance_deg: 38.5, distance_km: 4278, azimuth_deg: 148, backazimuth_deg: 328, Z: { snr: 7.8, is_valid: true, weight: 0.72 }, R: { snr: 6.7, is_valid: true, weight: 0.65 }, T: { snr: 5.6, is_valid: true, weight: 0.58 } },
  { network: 'MY', station: 'KUM', location: '', channel: 'BHZ', distance_deg: 15.3, distance_km: 1700, azimuth_deg: 25, backazimuth_deg: 205, Z: { snr: 11.2, is_valid: true, weight: 0.85 }, R: { snr: 9.8, is_valid: true, weight: 0.78 }, T: { snr: 8.5, is_valid: true, weight: 0.7 } },
  { network: 'G', station: 'DGAR', location: '', channel: 'BHZ', distance_deg: 32.1, distance_km: 3567, azimuth_deg: 295, backazimuth_deg: 115, Z: { snr: 7.1, is_valid: true, weight: 0.68 }, R: { snr: 6.1, is_valid: true, weight: 0.61 }, T: { snr: 5.2, is_valid: true, weight: 0.54 } },
  { network: 'II', station: 'PALK', location: '00', channel: 'BHZ', distance_deg: 28.7, distance_km: 3189, azimuth_deg: 312, backazimuth_deg: 132, Z: { snr: 6.8, is_valid: true, weight: 0.66 }, R: { snr: 5.9, is_valid: true, weight: 0.59 }, T: { snr: 5.0, is_valid: true, weight: 0.52 } },
  { network: 'IU', station: 'CHTO', location: '00', channel: 'BHZ', distance_deg: 22.4, distance_km: 2489, azimuth_deg: 350, backazimuth_deg: 170, Z: { snr: 10.5, is_valid: true, weight: 0.82 }, R: { snr: 9.2, is_valid: true, weight: 0.75 }, T: { snr: 7.9, is_valid: true, weight: 0.68 } },
  { network: 'IU', station: 'NWAO', location: '10', channel: 'BHZ', distance_deg: 41.8, distance_km: 4644, azimuth_deg: 172, backazimuth_deg: 352, Z: { snr: 8.9, is_valid: true, weight: 0.76 }, R: { snr: 7.7, is_valid: true, weight: 0.69 }, T: { snr: 6.6, is_valid: true, weight: 0.62 } },
  { network: 'PS', station: 'PSI', location: '', channel: 'BHZ', distance_deg: 18.6, distance_km: 2067, azimuth_deg: 55, backazimuth_deg: 235, Z: { snr: 10.8, is_valid: true, weight: 0.83 }, R: { snr: 9.5, is_valid: true, weight: 0.76 }, T: { snr: 8.2, is_valid: true, weight: 0.69 } },
  { network: 'II', station: 'WRAB', location: '00', channel: 'BHZ', distance_deg: 35.2, distance_km: 3911, azimuth_deg: 122, backazimuth_deg: 302, Z: { snr: 7.5, is_valid: true, weight: 0.71 }, R: { snr: 6.5, is_valid: true, weight: 0.64 }, T: { snr: 5.5, is_valid: true, weight: 0.57 } },
  { network: 'GE', station: 'SANI', location: '', channel: 'BHZ', distance_deg: 48.3, distance_km: 5367, azimuth_deg: 92, backazimuth_deg: 272, Z: { snr: 9.1, is_valid: true, weight: 0.77 }, R: { snr: 7.9, is_valid: true, weight: 0.71 }, T: { snr: 6.8, is_valid: true, weight: 0.64 } },
  { network: 'TH', station: 'CMEI', location: '', channel: 'BHZ', distance_deg: 25.5, distance_km: 2833, azimuth_deg: 15, backazimuth_deg: 195, Z: { snr: 10.2, is_valid: true, weight: 0.81 }, R: { snr: 8.9, is_valid: true, weight: 0.74 }, T: { snr: 7.6, is_valid: true, weight: 0.67 } },
  { network: 'II', station: 'COCO', location: '00', channel: 'BHZ', distance_deg: 12.8, distance_km: 1422, azimuth_deg: 275, backazimuth_deg: 95, Z: { snr: 11.8, is_valid: true, weight: 0.87 }, R: { snr: 10.4, is_valid: true, weight: 0.8 }, T: { snr: 9.1, is_valid: true, weight: 0.73 } },
  { network: 'MY', station: 'IPM', location: '', channel: 'BHZ', distance_deg: 14.1, distance_km: 1567, azimuth_deg: 335, backazimuth_deg: 155, Z: { snr: 11.5, is_valid: true, weight: 0.86 }, R: { snr: 10.1, is_valid: true, weight: 0.79 }, T: { snr: 8.8, is_valid: true, weight: 0.72 } },
  { network: 'G', station: 'SANVU', location: '', channel: 'BHZ', distance_deg: 55.7, distance_km: 6189, azimuth_deg: 105, backazimuth_deg: 285, Z: { snr: 9.6, is_valid: true, weight: 0.79 }, R: { snr: 8.4, is_valid: true, weight: 0.73 }, T: { snr: 7.2, is_valid: true, weight: 0.66 } },
  { network: 'II', station: 'XMIS', location: '10', channel: 'BHZ', distance_deg: 62.3, distance_km: 6922, azimuth_deg: 88, backazimuth_deg: 268, Z: { snr: 10.1, is_valid: true, weight: 0.8 }, R: { snr: 8.8, is_valid: true, weight: 0.74 }, T: { snr: 7.6, is_valid: true, weight: 0.67 } },
  { network: 'IU', station: 'PMG', location: '00', channel: 'BHZ', distance_deg: 43.6, distance_km: 4844, azimuth_deg: 68, backazimuth_deg: 248, Z: { snr: 8.7, is_valid: true, weight: 0.76 }, R: { snr: 7.6, is_valid: true, weight: 0.69 }, T: { snr: 6.5, is_valid: true, weight: 0.62 } },
  { network: 'G', station: 'UNM', location: '', channel: 'BHZ', distance_deg: 71.8, distance_km: 7978, azimuth_deg: 45, backazimuth_deg: 225, Z: { snr: 10.5, is_valid: true, weight: 0.81 }, R: { snr: 9.2, is_valid: true, weight: 0.75 }, T: { snr: 8.0, is_valid: true, weight: 0.68 } },
]

// Populate context with mock stations
mockProcessingContext.valid_waveforms = Object.fromEntries(
  mockStations.map(s => [`${s.network}.${s.station}.${s.location}.${s.channel}`, s])
)

// Select first 50 stations (all local, all regional, some teleseismic)
mockProcessingContext.selected_stations = mockStations
  .slice(0, 50)
  .map(s => `${s.network}.${s.station}.${s.location}.${s.channel}`)

// ─── Waveform Trace Generators ───────────────────────────────────────────────

export function generateSyntheticTrace(
  distance_deg: number,
  component: 'Z' | 'R' | 'T',
  sampleRate: number = 20,
  duration: number = 500
): Float32Array {
  const numSamples = Math.floor(sampleRate * duration) // 10,000 samples
  const trace = new Float32Array(numSamples)
  
  // Time array
  const t = Array.from({ length: numSamples }, (_, i) => i / sampleRate)
  
  // P-wave arrival time (simple 1D model: ~8 km/s)
  const pArrival = distance_deg * 111.2 / 8.0
  
  // S-wave arrival time (~4.5 km/s)
  const sArrival = distance_deg * 111.2 / 4.5
  
  // Surface wave arrival (~3.5 km/s for Rayleigh)
  const surfaceArrival = distance_deg * 111.2 / 3.5
  
  for (let i = 0; i < numSamples; i++) {
    const time = t[i]
    let amplitude = 0
    
    // Background noise (low amplitude)
    amplitude += (Math.random() - 0.5) * 0.05
    
    // P-wave (body wave)
    if (time > pArrival) {
      const pPhase = Math.exp(-0.5 * Math.pow((time - pArrival) / 15, 2))
      amplitude += pPhase * Math.sin(2 * Math.PI * 0.8 * (time - pArrival)) * (component === 'Z' ? 0.8 : 0.3)
    }
    
    // S-wave (body wave)
    if (time > sArrival) {
      const sPhase = Math.exp(-0.5 * Math.pow((time - sArrival) / 20, 2))
      amplitude += sPhase * Math.sin(2 * Math.PI * 0.5 * (time - sArrival)) * (component !== 'Z' ? 1.2 : 0.4)
    }
    
    // Surface waves (dominant for regional/teleseismic)
    if (time > surfaceArrival && distance_deg > 3) {
      const surfacePhase = Math.exp(-0.01 * (time - surfaceArrival))
      amplitude += surfacePhase * Math.sin(2 * Math.PI * 0.04 * (time - surfaceArrival)) * 2.0
    }
    
    // Distance attenuation
    amplitude *= 1.0 / Math.sqrt(Math.max(1, distance_deg))
    
    trace[i] = amplitude
  }
  
  return trace
}

export function generateObservedTrace(
  syntheticTrace: Float32Array,
  misfit: number = 0.2
): Float32Array {
  const observed = new Float32Array(syntheticTrace.length)
  
  for (let i = 0; i < syntheticTrace.length; i++) {
    // Add random noise and phase shift
    const noise = (Math.random() - 0.5) * 0.1
    const phaseShift = Math.sin(0.01 * i) * 0.15 * misfit
    observed[i] = syntheticTrace[i] + noise + phaseShift
  }
  
  return observed
}

export function generateSignalWindow(
  phase: 'P' | 'S' | 'Rayleigh' | 'Love',
  distance_deg: number
): SignalWindow {
  // Calculate arrival time based on phase velocity
  const velocities = { P: 8.0, S: 4.5, Rayleigh: 3.5, Love: 3.7 }
  const velocity = velocities[phase]
  const arrivalTime = (distance_deg * 111.2) / velocity
  
  // Window duration based on distance
  const duration = phase === 'P' || phase === 'S' ? 40 : 120
  
  return {
    phase,
    startTime: Math.max(0, arrivalTime - 10),
    endTime: arrivalTime + duration,
    strategy: 'velocity',
    startReference: phase === 'P' ? 'p_arrival' : phase === 'S' ? 's_arrival' : 'origin_time',
    color: PHASE_COLORS[phase],
  }
}

// ─── Mock Station Waveform Data ───────────────────────────────────────────────

export function mockStationWaveforms(): StationWaveformData[] {
  return mockStations.map((metadata) => {
    const stationKey = `${metadata.network}.${metadata.station}.${metadata.location}.${metadata.channel}`
    const distanceGroup = getDistanceGroup(metadata.distance_deg)
    const isSelected = mockProcessingContext.selected_stations.includes(stationKey)
    
    // Generate waveforms for each component
    const waveforms: StationMTContribution['waveforms'] = {}
    const components: ('Z' | 'R' | 'T')[] = ['Z', 'R', 'T']
    
    components.forEach(comp => {
      if (metadata[comp]?.is_valid) {
        const synthetic = generateSyntheticTrace(metadata.distance_deg, comp)
        const observed = generateObservedTrace(synthetic, 0.15)
        
        waveforms[comp] = {
          synthetic: {
            samples: Array.from(synthetic),
            sampleRate: 20,
            startTime: new Date('2025-01-24T00:12:34.560Z'),
            duration: 500,
            component: comp,
            kind: 'synthetic',
          },
          observed: {
            samples: Array.from(observed),
            sampleRate: 20,
            startTime: new Date('2025-01-24T00:12:34.560Z'),
            duration: 500,
            component: comp,
            kind: 'observed',
          },
          window: generateSignalWindow(distanceGroup === 'local' ? 'P' : 'Rayleigh', metadata.distance_deg),
        }
      }
    })
    
    // Create contribution
    const contribution: StationMTContribution = {
      waveformId: {
        networkCode: metadata.network,
        stationCode: metadata.station,
        locationCode: metadata.location,
        channelCode: metadata.channel,
      },
      component: distanceGroup === 'local' ? 'P' : 'R',
      active: isSelected,
      weight: metadata.Z?.weight || 0.8,
      timeShift: (Math.random() - 0.5) * 2, // Random time shift ±1s
      misfit: Math.random() * 0.3, // Random misfit 0-30%
      snr: metadata.Z?.snr || 10,
      waveforms,
    }
    
    return {
      stationKey,
      metadata,
      contribution,
      distanceGroup,
      isSelected,
      isActive: isSelected,
    }
  })
}
