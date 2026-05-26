# 04 — Data Models & TypeScript Types

> Semua tipe data inti yang digunakan dalam aplikasi SCMTV BMKG.

---

## 1. Core Seismic Event Types

```typescript
// src/types/seismology.ts

/** Event seismik utama */
export interface SeismicEvent {
  id: string;                      // e.g., "gfz2014alwz"
  publicId: string;                // QuakeML public ID
  type: EventType;
  typeCertainty?: 'known' | 'suspected';
  preferredOriginId?: string;
  preferredMagnitudeId?: string;
  preferredFocalMechanismId?: string;
  origins: Origin[];
  magnitudes: Magnitude[];
  focalMechanisms: FocalMechanism[];
  creationInfo?: CreationInfo;
}

export type EventType =
  | 'earthquake'
  | 'explosion'
  | 'quarry blast'
  | 'nuclear explosion'
  | 'not existing'
  | 'not reported'
  | 'other event';

/** Paramter hypocenter / origin */
export interface Origin {
  id: string;
  time: TimeQuantity;
  latitude: RealQuantity;          // degrees
  longitude: RealQuantity;         // degrees
  depth?: RealQuantity;            // km
  depthType?: DepthType;
  methodId?: string;
  earthModelId?: string;
  quality?: OriginQuality;
  evaluationMode: EvaluationMode;
  evaluationStatus?: EvaluationStatus;
  creationInfo?: CreationInfo;
  arrivals?: Arrival[];
}

export type EvaluationMode = 'manual' | 'automatic';
export type EvaluationStatus = 'preliminary' | 'confirmed' | 'reviewed' | 'final' | 'rejected';

export type DepthType =
  | 'from location'
  | 'from moment tensor inversion'
  | 'from modeling of broad-band P waveforms'
  | 'constrained by depth phases'
  | 'constrained by direct phases'
  | 'constrained by depth and direct phases'
  | 'operator assigned'
  | 'other';

export interface OriginQuality {
  associatedPhaseCount?: number;
  usedPhaseCount?: number;
  associatedStationCount?: number;
  usedStationCount?: number;
  depthPhaseCount?: number;
  standardError?: number;
  azimuthalGap?: number;           // degrees
  secondaryAzimuthalGap?: number;
  groundTruthLevel?: string;
  minimumDistance?: number;        // degrees
  maximumDistance?: number;        // degrees
  medianDistance?: number;         // degrees
}

/** Magnitude */
export interface Magnitude {
  id: string;
  mag: RealQuantity;
  type: MagnitudeType;
  originId?: string;
  methodId?: string;
  stationCount?: number;
  azimuthalGap?: number;
  evaluationMode?: EvaluationMode;
  evaluationStatus?: EvaluationStatus;
  creationInfo?: CreationInfo;
}

export type MagnitudeType = 'Mw' | 'ML' | 'mb' | 'MS' | 'mB' | 'Mwp' | 'M' | string;
```

---

## 2. Moment Tensor Types

```typescript
/** Focal Mechanism & Moment Tensor */
export interface FocalMechanism {
  id: string;
  triggeringOriginId?: string;
  nodalPlanes?: NodalPlanes;
  principalAxes?: PrincipalAxes;
  azimuthalGap?: number;
  stationDistributionRatio?: number;
  momentTensor?: MomentTensor;
  evaluationMode?: EvaluationMode;
  evaluationStatus?: EvaluationStatus;
  creationInfo?: CreationInfo;
}

export interface NodalPlanes {
  nodalPlane1?: NodalPlane;
  nodalPlane2?: NodalPlane;
  preferredPlane?: 1 | 2;
}

export interface NodalPlane {
  strike: RealQuantity;            // 0-360 degrees
  dip: RealQuantity;               // 0-90 degrees
  rake: RealQuantity;              // -180 to 180 degrees
}

export interface PrincipalAxes {
  tAxis: Axis;                     // Tension axis
  pAxis: Axis;                     // Pressure axis
  nAxis?: Axis;                    // Null axis
}

export interface Axis {
  azimuth: RealQuantity;           // degrees
  plunge: RealQuantity;            // degrees
  length: RealQuantity;            // eigenvalue
}

export interface MomentTensor {
  id: string;
  derivedOriginId?: string;
  momentMagnitudeId?: string;
  scalarMoment?: RealQuantity;     // N·m
  tensor?: Tensor;
  variance?: number;
  varianceReduction?: number;      // % variance reduction (= fit quality)
  doubleCouple?: number;           // 0-1 (fraction DC component)
  clvd?: number;                   // 0-1 (fraction CLVD component)
  iso?: number;                    // 0-1 (fraction isotropic component)
  sourceTimeFunction?: SourceTimeFunction;
  dataUsed?: DataUsed[];
  methodId?: string;
  category?: 'regional' | 'teleseismic' | 'local';
  inversionType?: 'general' | 'zero trace' | 'double couple';
  creationInfo?: CreationInfo;
}

/** 6 komponen tensor momen (symmetric 3x3 matrix) */
export interface Tensor {
  Mrr: RealQuantity;
  Mtt: RealQuantity;
  Mpp: RealQuantity;
  Mrt: RealQuantity;
  Mrp: RealQuantity;
  Mtp: RealQuantity;
}

/** Dalam Cartesian: Mxx, Mxy, Mxz, Myy, Myz, Mzz */
export interface TensorCartesian {
  Mxx: number;
  Mxy: number;
  Mxz: number;
  Myy: number;
  Myz: number;
  Mzz: number;
  exponent: number;               // e.g., 17 (= 1E17 N·m)
}

export interface SourceTimeFunction {
  type: 'box car' | 'triangle' | 'trapezoid' | 'unknown';
  duration: number;               // seconds
  riseTime?: number;              // seconds
  decayTime?: number;             // seconds
}

export interface DataUsed {
  waveType: 'P waves' | 'body waves' | 'surface waves' | 'mantle waves' | 'combined' | 'unknown';
  stationCount?: number;
  componentCount?: number;
  shortestPeriod?: number;        // seconds
  longestPeriod?: number;         // seconds
}
```

---

## 3. Waveform Types

```typescript
/** Rekaman seismogram */
export interface WaveformTrace {
  network: string;                 // e.g., "IU"
  station: string;                 // e.g., "MAJO"
  location: string;                // e.g., "00"
  channel: string;                 // e.g., "LHZ"
  startTime: Date;
  sampleRate: number;              // Hz
  samples: Float32Array;           // amplitudo
  unit: string;                    // "m/s", "m", "counts"
}

/** Stasiun seismik */
export interface Station {
  network: string;
  code: string;
  latitude: number;
  longitude: number;
  elevation: number;               // meter
  description?: string;
  channels?: Channel[];
}

export interface Channel {
  code: string;                    // e.g., "LHZ"
  locationCode: string;
  azimuth: number;
  dip: number;
  sampleRate: number;
}

/** Data untuk satu baris stasiun di WaveformPanel */
export interface StationWaveformData {
  network: string;
  station: string;
  distance: number;                // degrees
  azimuth: number;                 // degrees
  weight: number;                  // 0-1
  fit: number;                     // 0-100 persen
  amplitude: number;
  isUsed: boolean;
  components: {
    name: string;                  // "LP", "LQ", "LR"
    observed: WaveformTrace;
    synthetic: WaveformTrace;
    analysisWindow: TimeWindow;
  }[];
}

export interface TimeWindow {
  start: Date;
  end: Date;
}
```

---

## 4. Utility Types

```typescript
/** Nilai dengan uncertainty (mengikuti QuakeML spec) */
export interface RealQuantity {
  value: number;
  uncertainty?: number;
  lowerUncertainty?: number;
  upperUncertainty?: number;
  confidenceLevel?: number;        // persen
}

export interface TimeQuantity {
  value: Date;
  uncertainty?: number;            // detik
}

/** Metadata kreasi/modifikasi */
export interface CreationInfo {
  agencyId?: string;               // e.g., "GFZ"
  agencyURI?: string;
  author?: string;
  authorURI?: string;
  creationTime?: Date;
  version?: string;
}

/** Arrival — fase seismik yang diasosiasikan */
export interface Arrival {
  pickId: string;
  phase: string;                   // "P", "S", "Lg", dll
  azimuth?: number;                // degrees
  distance?: number;               // degrees
  timeResidual?: number;           // detik
  timeWeight?: number;
  timeUsed?: boolean;
}
```

---

## 5. Application State Types

```typescript
/** State untuk filter event list */
export interface EventFilter {
  lastDays?: number;
  dateFrom?: Date;
  dateTo?: Date;
  hideOtherFakeEvents: boolean;
  showOnlyOwnEvents: boolean;
  showOnlyPreferred: boolean;
  hideOutsideRegion: boolean;
  region?: BoundingBox;
  minMagnitude?: number;
  maxMagnitude?: number;
  agencies?: string[];
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** Konfigurasi inversion */
export interface InversionConfig {
  depthGrid: DepthGridConfig;
  fineSearch: number[];            // [50, 10, 5, 1]
  minDepth?: number;
  maxDepth?: number;
  keepCurrentDataset: boolean;
  shiftTraces: boolean;
  optimizeResult: boolean;
  globalTimeShift: number;         // detik
  maxBestShiftIterations: number;
  minFitWaveSnippet: number;       // %
  maxFitWaveSnippet: number;       // %
  magnitudeFilter: string;         // e.g., "M5-M6.5"
  normWindow: string;              // e.g., "All"
}

export interface DepthGridConfig {
  coarseStart: number;
  coarseEnd: number;
  coarseStep: number;
  fineStep: number;
}

/** Settings koneksi server */
export interface ServerConfig {
  host: string;
  port: number;
  database?: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  seedlink?: {
    host: string;
    port: number;
  };
  fdsn?: {
    baseUrl: string;
  };
}
```

---

## 6. Display / UI-Specific Types

```typescript
/** Computed event summary untuk tampilan tabel */
export interface EventSummaryRow {
  id: string;
  originTime: Date;               // UTC
  magnitude?: number;
  magnitudeType?: MagnitudeType;
  usedPhases?: number;
  latitude?: number;
  longitude?: number;
  depth?: number;                 // km
  evaluationStatus: EvaluationDisplayStatus;
  agency?: string;
  region?: string;
}

export type EvaluationDisplayStatus = 'M+' | 'M' | 'A+' | 'A' | '-';

/** Parameter untuk beach ball rendering */
export interface BeachBallRenderParams {
  nodalPlane1: { strike: number; dip: number; rake: number };
  nodalPlane2?: { strike: number; dip: number; rake: number };
  principalAxes?: PrincipalAxes;
  size: number;                   // px
  mode: 'full' | 'double_couple';
  showAxes?: boolean;
  backgroundColor?: string;
  compressionColor?: string;      // default: black
  dilatationColor?: string;       // default: white
}
```
