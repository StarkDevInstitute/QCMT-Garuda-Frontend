// ─── Primitive quantities (with uncertainty) ──────────────────────────────────

export interface RealQuantity {
  value: number
  uncertainty?: number
  lowerUncertainty?: number
  upperUncertainty?: number
}

export interface TimeQuantity {
  value: Date
  uncertainty?: number
}

// ─── Enumerations ─────────────────────────────────────────────────────────────

export type EvaluationMode = 'manual' | 'automatic'
export type EvaluationStatus =
  | 'preliminary'
  | 'confirmed'
  | 'reviewed'
  | 'final'
  | 'rejected'

export type EventType =
  | 'earthquake'
  | 'explosion'
  | 'quarry blast'
  | 'nuclear explosion'
  | 'not existing'
  | 'not reported'
  | 'other event'

export type MagnitudeType = 'Mw' | 'ML' | 'mb' | 'MS' | 'mB' | 'Mwp' | 'M' | string

export type DepthType =
  | 'from location'
  | 'from moment tensor inversion'
  | 'constrained by depth phases'
  | 'constrained by direct phases'
  | 'operator assigned'
  | 'other'

export type OriginType =
  | 'hypocenter'
  | 'centroid'
  | 'amplitude'
  | 'macroseismic'
  | 'rupture start'
  | 'rupture end'

// ─── Creation info ─────────────────────────────────────────────────────────────

export interface CreationInfo {
  agencyId?: string
  agencyURI?: string
  author?: string
  creationTime?: Date
  version?: string
}

// ─── Origin ────────────────────────────────────────────────────────────────────

export interface OriginQuality {
  associatedPhaseCount?: number
  usedPhaseCount?: number
  associatedStationCount?: number
  usedStationCount?: number
  azimuthalGap?: number        // degrees
  minimumDistance?: number     // degrees
  maximumDistance?: number     // degrees
  standardError?: number
}

export interface Origin {
  id: string
  time: TimeQuantity
  latitude: RealQuantity        // degrees
  longitude: RealQuantity       // degrees
  depth?: RealQuantity          // km
  depthType?: DepthType
  originType?: OriginType
  methodId?: string
  earthModelId?: string
  quality?: OriginQuality
  evaluationMode: EvaluationMode
  evaluationStatus?: EvaluationStatus
  creationInfo?: CreationInfo
  region?: string
}

// ─── Magnitude ─────────────────────────────────────────────────────────────────

export interface Magnitude {
  id: string
  mag: RealQuantity
  type: MagnitudeType
  originId?: string
  stationCount?: number
  azimuthalGap?: number
  evaluationMode?: EvaluationMode
  evaluationStatus?: EvaluationStatus
  creationInfo?: CreationInfo
}

// ─── Focal Mechanism & Moment Tensor ──────────────────────────────────────────

export interface NodalPlane {
  strike: RealQuantity          // 0–360 degrees
  dip: RealQuantity             // 0–90 degrees
  rake: RealQuantity            // −180 to 180 degrees
}

export interface NodalPlanes {
  nodalPlane1?: NodalPlane
  nodalPlane2?: NodalPlane
  preferredPlane?: 1 | 2
}

export interface Axis {
  azimuth: RealQuantity         // degrees
  plunge: RealQuantity          // degrees
  length: RealQuantity          // eigenvalue (N·m)
}

export interface PrincipalAxes {
  tAxis: Axis                   // Tension axis
  pAxis: Axis                   // Pressure axis
  nAxis?: Axis                  // Null axis
}

/** 6 independent components of the moment tensor in spherical coordinates (r,t,p) */
export interface Tensor {
  Mrr: RealQuantity
  Mtt: RealQuantity
  Mpp: RealQuantity
  Mrt: RealQuantity
  Mrp: RealQuantity
  Mtp: RealQuantity
}

export interface StationMTContribution {
  waveformId: {
    networkCode: string
    stationCode: string
    locationCode?: string
    channelCode: string
  }
  component?: string    // display phase: P | R | S | L
  active?: boolean
  weight?: number
  timeShift?: number    // seconds
  misfit?: number       // 0–1 (0 = perfect fit)
  snr?: number
  waveforms?: {
    Z?: { observed?: WaveformTraceData; synthetic?: WaveformTraceData; window?: SignalWindow }
    R?: { observed?: WaveformTraceData; synthetic?: WaveformTraceData; window?: SignalWindow }
    T?: { observed?: WaveformTraceData; synthetic?: WaveformTraceData; window?: SignalWindow }
  }
}

export interface MomentTensor {
  id: string
  derivedOriginId?: string
  momentMagnitudeId?: string
  scalarMoment?: RealQuantity   // N·m
  tensor?: Tensor
  variance?: number
  varianceReduction?: number    // % (fit quality)
  doubleCouple?: number         // 0–1 fraction DC component
  clvd?: number                 // 0–1 fraction CLVD
  iso?: number                  // 0–1 fraction isotropic
  methodId?: string
  category?: 'regional' | 'teleseismic' | 'local'
  inversionType?: 'general' | 'zero trace' | 'double couple'
  creationInfo?: CreationInfo
  stationContributions?: StationMTContribution[]
}

export interface FocalMechanism {
  id: string
  triggeringOriginId?: string
  nodalPlanes?: NodalPlanes
  principalAxes?: PrincipalAxes
  azimuthalGap?: number
  momentTensor?: MomentTensor
  evaluationMode?: EvaluationMode
  evaluationStatus?: EvaluationStatus
  creationInfo?: CreationInfo
}

// ─── Seismic Event ─────────────────────────────────────────────────────────────

export interface SeismicEvent {
  id: string
  publicId: string
  type: EventType
  preferredOriginId?: string
  preferredMagnitudeId?: string
  preferredFocalMechanismId?: string
  origins: Origin[]
  magnitudes: Magnitude[]
  focalMechanisms: FocalMechanism[]
  creationInfo?: CreationInfo
}

// ─── Waveform ──────────────────────────────────────────────────────────────────

export interface WaveformTrace {
  network: string
  station: string
  location: string
  channel: string
  startTime: Date
  sampleRate: number            // Hz
  data: Float32Array
}

export interface StationWaveform {
  network: string
  station: string
  distance: number              // degrees
  azimuth: number               // degrees
  weight: number                // 0–1
  fit: number                   // percentage 0–100
  amplitude: number
  components: WaveformTrace[]
  isUsed: boolean
}

// ─── Station ──────────────────────────────────────────────────────────────────

export interface Station {
  network: string
  station: string
  latitude: number
  longitude: number
  elevation: number             // meters
  name?: string
}

// ─── Derived / display helpers ────────────────────────────────────────────────

/** Flat summary used for EventTable rows */
export interface EventSummary {
  id: string
  time: Date
  magnitude: number
  magnitudeType: MagnitudeType
  usedPhases: number
  rms?: number
  latitude: number
  longitude: number
  depth: number                 // km
  evaluationMode: EvaluationMode
  evaluationStatus?: EvaluationStatus
  agency: string
  region: string
  hasMomentTensor: boolean
}

// ─── Waveform Analysis (for Interactive MT Inversion) ─────────────────────────

export interface SignalWindow {
  phase: 'P' | 'S' | 'Rayleigh' | 'Love'
  startTime: number        // Relative to trace start (seconds)
  endTime: number          // Relative to trace start (seconds)
  strategy: 'velocity' | 'fixed' | 'relative'
  startReference: 'p_arrival' | 's_arrival' | 'origin_time'
  color: string            // CSS color for rendering
}

export interface ProcessingParams {
  inversion_method: string      // e.g., 'QCMT_R', 'MS-MLS'
  fmin: number                  // Min frequency (Hz)
  fmax: number                  // Max frequency (Hz)
  min_dist: number              // Min epicentral distance (degrees)
  max_dist: number              // Max epicentral distance (degrees)
  deviatoric: boolean           // 5-comp vs 6-comp inversion
  use_gpu: boolean
  centroid_inversion: boolean
  dc_interest_eq: boolean       // Double-couple constraint
}

export interface WaveformTraceData {
  samples: number[]        // Amplitude values
  sampleRate: number       // Hz (typically 20-100 Hz)
  startTime: Date          // Absolute start time
  duration: number         // Total duration in seconds
  component: 'Z' | 'R' | 'T'
  kind: 'observed' | 'synthetic'
}
