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
  latitude: number
  longitude: number
  depth: number                 // km
  evaluationMode: EvaluationMode
  evaluationStatus?: EvaluationStatus
  agency: string
  region: string
  hasMomentTensor: boolean
}
