# 13 — Waveform Station Preparation Roadmap

> **Target Feature**: Ketika user klik button "Waveform" dari MomentTensorPage, sistem harus mempersiapkan stasiun-stasiun seismik dengan lengkap sebelum menampilkan waveform viewer.

> **📘 NEXT STEP**: Setelah station preparation selesai, lanjutkan ke **[14-WAVEFORM-PAGE-DEVELOPMENT.md](14-WAVEFORM-PAGE-DEVELOPMENT.md)** untuk implementasi detail UI/UX halaman Waveform interaktif yang identik dengan scmtv GFZ.

---

## 1. Overview — Workflow Station Preparation

### 1.1 User Journey

```
┌────────────────────────────────────────────────────────┐
│ MomentTensorPage (Event Detail View)                  │
│                                                        │
│  [Map + Beach Ball]    [Tensor Details]               │
│                                                        │
│  Selected Event: bmg2026abcd                           │
│  Magnitude: 5.1 Mw | Depth: 12 km                     │
│                                                        │
│  [ Waveforms ] [ Commit ] [ Bulletin ] [ Settings ]   │
│     ↑                                                  │
│     │ USER CLICKS                                      │
└─────┼──────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ Download Progress Dialog (Modal)                      │
│                                                        │
│  combined://slink/lts-data:18000;arclink/...          │
│  ┌──────────────────────────────────────────────┐     │
│  │ Completed 6/66 stations                      │     │
│  │ [████████░░░░░░░░░░░░░░░░] 9%                │     │
│  ├──────────────────────────────────────────────┤     │
│  │ Pending data streams:                        │     │
│  │ Net | Sta   | Loc | Cha | Progress | Status  │     │
│  │ IA  | BUBSI |     | SH  | 0%       | Pending │     │
│  │ IA  | BUMSI |     | SH  | 45%      | Download│     │
│  │ IA  | DOCM  | 00  | SH  | 100%     | ✓       │     │
│  └──────────────────────────────────────────────┘     │
│                                   [Cancel] [OK]       │
└────────────────────────────────────────────────────────┘
      │ (SSE streaming progress updates)
      ▼
┌────────────────────────────────────────────────────────┐
│ Station Preparation Phase (After Download Complete)   │
│                                                        │
│ Step 1: Load Job Context                              │
│   └─ GET /interactive-processor/jobs/{jobId}/context  │
│                                                        │
│ Step 2: Parse Station Metadata                        │
│   └─ Extract valid_waveforms, selected_stations       │
│                                                        │
│ Step 3: Group by Distance                             │
│   └─ Local (<3°) | Regional (3-10°) | Tele (>10°)    │
│                                                        │
│ Step 4: Load Waveform Data                            │
│   └─ GET /jobs/{jobId}/waveforms?kind=plot_obs        │
│   └─ GET /jobs/{jobId}/waveforms?kind=plot_syn        │
│                                                        │
│ Step 5: Compute Display Metrics                       │
│   └─ SNR, Fit%, TimeShift, Weight per component       │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ WaveformPage (Interactive Waveform Editor)            │
│                                                        │
│  ┌────────────────┬─────────────────────────────────┐ │
│  │ Beach Ball +   │  Waveform Traces (Obs vs Syn)   │ │
│  │ Tensor Matrix  │  - Station grouped by distance  │ │
│  │ + Controls     │  - Z/R/T components per station │ │
│  │                │  - Color-coded by fit quality   │ │
│  └────────────────┴─────────────────────────────────┘ │
│                                                        │
│  Station Table:                                        │
│  [☑] Net | Sta | Dist° | Az° | Wgt | Fit% | Ms(BB)  │
│  [☑] IA  | AAA | 1.2   | 45  | 1.0 | 93.3 | 5.0     │
│  [☑] IU  | CHTO| 8.7   | 312 | 0.9 | 87.5 | 4.8     │
│  [☐] G   | PPTF| 12.4  | 178 | 0.8 | 79.2 | 4.5     │
└────────────────────────────────────────────────────────┘
```

---

### 1.2 Data Flow Architecture

```
                    ┌──────────────────────┐
                    │   MomentTensorPage   │
                    │  (selectedEventId)   │
                    └──────────┬───────────┘
                               │
                               │ onClick Waveforms
                               ▼
                    ┌──────────────────────┐
                    │    EventStore        │
                    │  + JobStore lookup   │
                    └──────────┬───────────┘
                               │
                               │ Get active jobId for event
                               ▼
┌─────────────────────────────────────────────────────────┐
│             AutoMT API (Backend)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  GET /jobs/{jobId}/context                             │
│  ├─ Returns: ProcessingContext                         │
│  │   └─ event, params, valid_waveforms,                │
│  │      selected_stations, best_solution               │
│  │                                                      │
│  GET /jobs/{jobId}/waveforms?kind=plot_obs             │
│  ├─ Returns: { stations: [...] }                       │
│  │   └─ Array of StationWaveformData                   │
│  │                                                      │
│  GET /jobs/{jobId}/waveforms?kind=plot_syn             │
│  ├─ Returns: { stations: [...] }                       │
│  │   └─ Synthetic waveforms per station/component      │
│  │                                                      │
│  GET /jobs/{jobId}/station-contributions               │
│  └─ Returns: { contributions: [...] }                  │
│      └─ Per-station quality metrics (SNR, fit, weight) │
│                                                         │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ Transform to UI models
                        ▼
            ┌───────────────────────────┐
            │  WaveformStore (Zustand)  │
            │  ├─ stations: Station[]   │
            │  ├─ waveforms: Map<...>   │
            │  ├─ groupedByDistance     │
            │  └─ selectedStations      │
            └───────────┬───────────────┘
                        │
                        │ Render
                        ▼
            ┌───────────────────────────┐
            │    WaveformPage UI        │
            │  ├─ StationTable          │
            │  ├─ WaveformCanvas        │
            │  └─ InteractiveControls   │
            └───────────────────────────┘
```

---

## 2. API Requirements & Environment Setup

### 2.1 Backend API Endpoints (Must Be Ready)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/automt/v1/interactive-processor/jobs/{jobId}/context` | GET | Load full processing context | ✅ Documented |
| `/automt/v1/interactive-processor/jobs/{jobId}/waveforms` | GET | Fetch waveform data (obs/syn) | ✅ Documented |
| `/automt/v1/interactive-processor/jobs/{jobId}/waveforms/download` | POST | Trigger async waveform download from SeedLink/ArcLink | ⚠️ **NEW — Needs Implementation** |
| `/automt/v1/interactive-processor/jobs/{jobId}/waveforms/stream-progress` | SSE | Real-time download progress stream | ⚠️ **NEW — Needs Implementation** |
| `/automt/v1/interactive-processor/jobs/{jobId}/waveforms/cancel` | DELETE | Cancel ongoing waveform download | ⚠️ **NEW — Needs Implementation** |
| `/automt/v1/interactive-processor/jobs/{jobId}/station-contributions` | GET | Get per-station quality metrics | ⚠️ **Needs Verification** |
| `/automt/v1/interactive-processor/jobs/{jobId}/stations` | PATCH | Toggle station on/off, update weights | ⚠️ **Needs Verification** |

**⚠️ Action Required:**
1. **Implement** endpoint `/waveforms/download` (POST) — Trigger async download dari SeedLink/ArcLink
2. **Implement** endpoint `/waveforms/stream-progress` (SSE) — Stream real-time progress per station
3. **Implement** endpoint `/waveforms/cancel` (DELETE) — Cancel ongoing download
4. **Verify** bahwa endpoint `station-contributions` exists
5. **Test** bahwa `waveforms` endpoint mengembalikan data dalam format yang benar
6. **Confirm** bahwa PATCH endpoint untuk modify station weights sudah siap

---

### 2.2 Waveform Data Format (Expected Response)

#### Context Response Structure
```json
{
  "job_id": "bmg2026abcd_ab12cd34",
  "event_id": "bmg2026abcd",
  "current_stage": "INVERTED",
  "context": {
    "event": {
      "lat": -8.1,
      "lon": 110.2,
      "depth_km": 12.0,
      "mag": 5.1,
      "origin_time": "2026-07-14T12:34:56.789Z"
    },
    "params": {
      "inversion_method": "QCMT_R",
      "fmin": 0.02,
      "fmax": 0.08,
      "min_dist": 0.5,
      "max_dist": 7.5,
      "deviatoric": true,
      "use_gpu": false
    },
    "valid_waveforms": {
      "IA.AAA..BH": {
        "network": "IA",
        "station": "AAA",
        "location": "",
        "channel": "BH",
        "distance_deg": 1.2,
        "distance_km": 133.2,
        "azimuth_deg": 45.0,
        "backazimuth_deg": 225.0,
        "Z": { "snr": 12.5, "is_valid": true, "weight": 1.0 },
        "R": { "snr": 8.3, "is_valid": true, "weight": 0.25 },
        "T": { "snr": 3.2, "is_valid": false, "weight": 0.5 }
      },
      "IU.CHTO..BH": {
        "network": "IU",
        "station": "CHTO",
        "location": "",
        "channel": "BH",
        "distance_deg": 8.7,
        "distance_km": 966.3,
        "azimuth_deg": 312.1,
        "backazimuth_deg": 132.1,
        "Z": { "snr": 15.2, "is_valid": true, "weight": 1.0 },
        "R": { "snr": 10.1, "is_valid": true, "weight": 0.25 },
        "T": { "snr": 5.8, "is_valid": true, "weight": 0.5 }
      }
    },
    "selected_stations": ["IA.AAA..BH", "IU.CHTO..BH"],
    "best_solution": {
      "depth_km": 11.8,
      "variance_reduction": 0.68,
      "dc_perc": 85.3,
      "clvd_perc": 14.7,
      "iso_perc": 0.0,
      "scalar_moment": 1.23e17,
      "magnitude_mw": 5.1,
      "tensor": {
        "mrr": 1.2e17,
        "mtt": -0.5e17,
        "mpp": -0.7e17,
        "mrt": 0.3e17,
        "mrp": 0.8e17,
        "mtp": -0.4e17
      }
    }
  }
}
```

#### Waveform Response Structure (plot_obs / plot_syn)
```json
{
  "kind": "plot_obs",
  "stations": [
    {
      "station_id": "IA.AAA..BH",
      "components": [
        {
          "component": "Z",
          "sampling_rate": 20.0,
          "start_time": "2026-07-14T12:34:56.789Z",
          "data": [0.0, 0.1, 0.2, ..., 0.0],
          "unit": "m",
          "time_shift": -0.5,
          "weight": 1.0,
          "snr": 12.5,
          "fit_percent": 93.3
        },
        {
          "component": "R",
          "sampling_rate": 20.0,
          "start_time": "2026-07-14T12:34:56.789Z",
          "data": [0.0, -0.05, -0.1, ..., 0.0],
          "unit": "m",
          "time_shift": -0.3,
          "weight": 0.25,
          "snr": 8.3,
          "fit_percent": 87.2
        }
      ]
    }
  ]
}
```

---

### 2.3 Environment Checklist

#### Development Environment
- [ ] **Node.js** >= 18.x
- [ ] **npm** atau **pnpm** untuk dependency management
- [ ] **VS Code** dengan ESLint, TypeScript extensions
- [ ] **Chrome/Firefox** dengan React DevTools

#### Backend Dependencies
- [ ] **AutoMT API** running di `http://10.20.229.39:8111`
- [ ] **SeisComP** database accessible (untuk event catalog)
- [ ] **Waveform Archive** accessible (SDS structure atau SeisComP archive)
- [ ] **Green's Function Store** di `/home/eq/seiscomp/share/automt/gf_stores`

#### Network Access
- [ ] Frontend dev server dapat reach `http://10.20.229.39:8111` (production backend)
- [ ] CORS enabled di backend untuk development (jika frontend di localhost)
- [ ] SSE (Server-Sent Events) endpoint dapat diakses (untuk streaming progress)

#### Data Preparation
- [ ] Sample events dengan focal mechanism sudah tersedia (minimal 5-10 events)
- [ ] Waveform data sudah terproses minimal 1 kali (sehingga ada job context)
- [ ] Station metadata sudah terisi (distance, azimuth, SNR)

---

## 3. Implementation Roadmap (10-12 Hari)

### Milestone 3.1: API Integration Layer (2-3 Hari)

#### Sprint 1: Extend AutoMTAPIClient
**File**: `src/lib/api/automt-client.ts`

**Tasks:**
1. ✅ Add method `getJobContext(jobId: string): Promise<ProcessingContext>`
2. ✅ Add method `getWaveforms(jobId: string, kind: WaveformKind): Promise<WaveformResponse>`
3. ⚠️ Add method `getStationContributions(jobId: string): Promise<StationContribution[]>`
4. ⚠️ Add method `updateStationWeights(jobId: string, updates: StationUpdate[]): Promise<void>`

**Mock Data Preparation:**
```typescript
// src/lib/mock/waveform-mock.ts
export function mockProcessingContext(eventId: string): ProcessingContext {
  return {
    job_id: `${eventId}_mock123`,
    event_id: eventId,
    current_stage: 'INVERTED',
    context: {
      event: { lat: -8.1, lon: 110.2, depth_km: 12.0, mag: 5.1 },
      valid_waveforms: {
        'IA.AAA..BH': {
          distance_deg: 1.2,
          azimuth_deg: 45.0,
          Z: { snr: 12.5, is_valid: true, weight: 1.0 },
          R: { snr: 8.3, is_valid: true, weight: 0.25 },
          T: { snr: 3.2, is_valid: false, weight: 0.5 }
        },
        'IU.CHTO..BH': {
          distance_deg: 8.7,
          azimuth_deg: 312.1,
          Z: { snr: 15.2, is_valid: true, weight: 1.0 },
          R: { snr: 10.1, is_valid: true, weight: 0.25 },
          T: { snr: 5.8, is_valid: true, weight: 0.5 }
        }
      },
      selected_stations: ['IA.AAA..BH', 'IU.CHTO..BH'],
      best_solution: { /* ... */ }
    }
  }
}

export function mockWaveformData(stationId: string, component: string): ComponentWaveform {
  const length = 2048
  const data = new Float32Array(length)
  const freq = 2.5 + Math.random()
  
  for (let i = 0; i < length; i++) {
    const t = i / length
    data[i] = Math.exp(-t * 4) * Math.sin(2 * Math.PI * freq * t + Math.random() * Math.PI)
  }
  
  return {
    component,
    sampling_rate: 20.0,
    start_time: new Date().toISOString(),
    data: Array.from(data),
    unit: 'm',
    time_shift: -0.5 + Math.random() * 1.0,
    weight: 0.5 + Math.random() * 0.5,
    snr: 5 + Math.random() * 15,
    fit_percent: 60 + Math.random() * 35
  }
}
```

**Deliverable**: API client dengan mock fallback berfungsi

---

### Milestone 3.2: TypeScript Types & Models (1 Hari)

#### Sprint 2: Define Waveform Types
**File**: `src/types/seismology.ts`

**New Types:**
```typescript
// ─── Waveform Data Types ──────────────────────────────────────────────────

export interface ComponentWaveform {
  component: 'Z' | 'R' | 'T'
  sampling_rate: number          // Hz
  start_time: string             // ISO 8601
  data: number[]                 // Amplitude values
  unit: string                   // 'm', 'm/s', 'm/s²'
  time_shift?: number            // seconds
  weight?: number                // 0-1
  snr?: number                   // Signal-to-noise ratio
  fit_percent?: number           // Waveform fit quality 0-100
}

export interface StationWaveformData {
  station_id: string             // "IA.AAA..BH"
  network: string
  station: string
  location: string
  channel: string
  distance_deg: number
  distance_km: number
  azimuth_deg: number
  backazimuth_deg: number
  latitude?: number
  longitude?: number
  elevation_m?: number
  is_selected: boolean           // Used in inversion
  is_enabled: boolean            // User can toggle
  components: ComponentWaveform[]
}

export interface WaveformResponse {
  kind: 'plot_obs' | 'plot_syn' | 'normal' | 'cholesky'
  stations: StationWaveformData[]
}

export interface ProcessingContext {
  job_id: string
  event_id: string
  current_stage: ProcessingStage
  context: {
    event: {
      lat: number
      lon: number
      depth_km: number
      mag: number
      origin_time: string
    }
    params: {
      inversion_method: string
      fmin: number
      fmax: number
      min_dist: number
      max_dist: number
      deviatoric: boolean
      use_gpu: boolean
    }
    valid_waveforms: Record<string, StationMetadata>
    selected_stations: string[]
    best_solution: MomentTensorSolution | null
  }
}

export interface StationMetadata {
  network: string
  station: string
  location: string
  channel: string
  distance_deg: number
  distance_km: number
  azimuth_deg: number
  backazimuth_deg: number
  Z?: ComponentMetadata
  R?: ComponentMetadata
  T?: ComponentMetadata
}

export interface ComponentMetadata {
  snr: number
  is_valid: boolean
  weight: number
}

export interface MomentTensorSolution {
  depth_km: number
  variance_reduction: number
  dc_perc: number
  clvd_perc: number
  iso_perc: number
  scalar_moment: number
  magnitude_mw: number
  tensor: {
    mrr: number
    mtt: number
    mpp: number
    mrt: number
    mrp: number
    mtp: number
  }
}

// ─── Distance-based Grouping ──────────────────────────────────────────────

export type DistanceGroup = 'local' | 'regional' | 'teleseismic'

export interface StationGroup {
  group: DistanceGroup
  stations: StationWaveformData[]
  color: string                  // Orange, Green, Blue
}

export const DISTANCE_GROUPS = {
  local: { min: 0, max: 3, color: '#ff8c42' },      // Orange
  regional: { min: 3, max: 10, color: '#4ade80' },  // Green
  teleseismic: { min: 10, max: 180, color: '#60a5fa' } // Blue
} as const

export function getDistanceGroup(distance_deg: number): DistanceGroup {
  if (distance_deg < 3) return 'local'
  if (distance_deg < 10) return 'regional'
  return 'teleseismic'
}
```

**Deliverable**: Type definitions lengkap di seismology.ts

---

### Milestone 3.3: Waveform Store (Zustand) (1-2 Hari)

#### Sprint 3: Create WaveformStore
**File**: `src/stores/waveformStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StationWaveformData, DistanceGroup, ProcessingContext } from '@/types/seismology'
import { getDistanceGroup } from '@/types/seismology'

interface WaveformState {
  // Data
  jobId: string | null
  context: ProcessingContext | null
  observedWaveforms: Map<string, StationWaveformData>
  syntheticWaveforms: Map<string, StationWaveformData>
  
  // UI State
  selectedStations: Set<string>
  expandedStations: Set<string>
  distanceFilter: DistanceGroup[]
  
  // Loading
  isLoading: boolean
  error: string | null
  
  // Actions
  setJobId: (jobId: string) => void
  loadWaveforms: (jobId: string) => Promise<void>
  toggleStation: (stationId: string, enabled: boolean) => void
  toggleExpanded: (stationId: string) => void
  setDistanceFilter: (groups: DistanceGroup[]) => void
  updateStationWeight: (stationId: string, component: string, weight: number) => void
  reset: () => void
}

export const useWaveformStore = create<WaveformState>()(
  persist(
    (set, get) => ({
      // Initial state
      jobId: null,
      context: null,
      observedWaveforms: new Map(),
      syntheticWaveforms: new Map(),
      selectedStations: new Set(),
      expandedStations: new Set(),
      distanceFilter: ['local', 'regional', 'teleseismic'],
      isLoading: false,
      error: null,
      
      // Actions
      setJobId: (jobId) => set({ jobId }),
      
      loadWaveforms: async (jobId: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const { platform } = await import('@/lib/platform')
          
          // Parallel fetch: context, obs waveforms, syn waveforms
          const [context, obsResponse, synResponse] = await Promise.all([
            platform.getJobContext(jobId),
            platform.getWaveforms(jobId, 'plot_obs'),
            platform.getWaveforms(jobId, 'plot_syn')
          ])
          
          const obsMap = new Map(obsResponse.stations.map(s => [s.station_id, s]))
          const synMap = new Map(synResponse.stations.map(s => [s.station_id, s]))
          
          const selectedSet = new Set(context.context.selected_stations)
          
          set({
            jobId,
            context,
            observedWaveforms: obsMap,
            syntheticWaveforms: synMap,
            selectedStations: selectedSet,
            isLoading: false
          })
        } catch (err) {
          set({ 
            error: err instanceof Error ? err.message : 'Failed to load waveforms',
            isLoading: false 
          })
        }
      },
      
      toggleStation: (stationId, enabled) => {
        const { selectedStations } = get()
        const newSet = new Set(selectedStations)
        
        if (enabled) {
          newSet.add(stationId)
        } else {
          newSet.delete(stationId)
        }
        
        set({ selectedStations: newSet })
      },
      
      toggleExpanded: (stationId) => {
        const { expandedStations } = get()
        const newSet = new Set(expandedStations)
        
        if (newSet.has(stationId)) {
          newSet.delete(stationId)
        } else {
          newSet.add(stationId)
        }
        
        set({ expandedStations: newSet })
      },
      
      setDistanceFilter: (groups) => set({ distanceFilter: groups }),
      
      updateStationWeight: async (stationId, component, weight) => {
        const { jobId, observedWaveforms } = get()
        if (!jobId) return
        
        // Update local state immediately
        const station = observedWaveforms.get(stationId)
        if (station) {
          const comp = station.components.find(c => c.component === component)
          if (comp) {
            comp.weight = weight
            set({ observedWaveforms: new Map(observedWaveforms) })
          }
        }
        
        // Send to backend
        try {
          const { platform } = await import('@/lib/platform')
          await platform.patchStationWeights(jobId, [
            { station_id: stationId, component, weight }
          ])
        } catch (err) {
          console.error('Failed to update weight:', err)
        }
      },
      
      reset: () => set({
        jobId: null,
        context: null,
        observedWaveforms: new Map(),
        syntheticWaveforms: new Map(),
        selectedStations: new Set(),
        expandedStations: new Set(),
        error: null
      })
    }),
    {
      name: 'waveform-store',
      partialize: (state) => ({
        // Only persist UI state, not data
        expandedStations: Array.from(state.expandedStations),
        distanceFilter: state.distanceFilter
      })
    }
  )
)

// Selectors
export const selectStationsByGroup = (state: WaveformState) => {
  const groups = new Map<DistanceGroup, StationWaveformData[]>()
  
  state.observedWaveforms.forEach((station) => {
    const group = getDistanceGroup(station.distance_deg)
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(station)
  })
  
  return groups
}

export const selectFilteredStations = (state: WaveformState) => {
  const { observedWaveforms, distanceFilter } = state
  return Array.from(observedWaveforms.values()).filter(station => {
    const group = getDistanceGroup(station.distance_deg)
    return distanceFilter.includes(group)
  })
}
```

**Deliverable**: Zustand store untuk waveform data management

---

### Milestone 3.4: Station Table Component (2 Hari)

#### Sprint 4: Build StationTable UI
**File**: `src/components/Waveform/StationTable.tsx`

**Features:**
- Checkbox untuk enable/disable station
- Sortable columns (distance, azimuth, fit, SNR)
- Color coding berdasarkan fit quality
- Expandable rows untuk show per-component details
- Distance group badges (Local/Regional/Teleseismic)

**Component Structure:**
```typescript
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react'
import { useWaveformStore, selectFilteredStations } from '@/stores/waveformStore'
import { getDistanceGroup, DISTANCE_GROUPS } from '@/types/seismology'
import type { StationWaveformData } from '@/types/seismology'

type SortKey = 'distance' | 'azimuth' | 'fit' | 'weight'
type SortOrder = 'asc' | 'desc'

export function StationTable() {
  const stations = useWaveformStore(selectFilteredStations)
  const selectedStations = useWaveformStore(s => s.selectedStations)
  const expandedStations = useWaveformStore(s => s.expandedStations)
  const toggleStation = useWaveformStore(s => s.toggleStation)
  const toggleExpanded = useWaveformStore(s => s.toggleExpanded)
  
  const [sortKey, setSortKey] = useState<SortKey>('distance')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  
  const sortedStations = useMemo(() => {
    const sorted = [...stations]
    sorted.sort((a, b) => {
      let aVal = 0, bVal = 0
      
      switch (sortKey) {
        case 'distance':
          aVal = a.distance_deg
          bVal = b.distance_deg
          break
        case 'azimuth':
          aVal = a.azimuth_deg
          bVal = b.azimuth_deg
          break
        case 'fit':
          aVal = avgFit(a)
          bVal = avgFit(b)
          break
        case 'weight':
          aVal = avgWeight(a)
          bVal = avgWeight(b)
          break
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })
    return sorted
  }, [stations, sortKey, sortOrder])
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2rem_3rem_4rem_4rem_4rem_4rem_4rem_1fr] gap-2 border-b border-border bg-card px-2 py-1 sticky top-0 z-10">
        <div className="text-[10px] font-medium text-muted-foreground">Use</div>
        <div className="text-[10px] font-medium text-muted-foreground">Net</div>
        <SortableHeader label="Sta" sortKey="distance" currentKey={sortKey} order={sortOrder} onSort={handleSort} />
        <SortableHeader label="Dist°" sortKey="distance" currentKey={sortKey} order={sortOrder} onSort={handleSort} />
        <SortableHeader label="Az°" sortKey="azimuth" currentKey={sortKey} order={sortOrder} onSort={handleSort} />
        <SortableHeader label="Wgt" sortKey="weight" currentKey={sortKey} order={sortOrder} onSort={handleSort} />
        <SortableHeader label="Fit%" sortKey="fit" currentKey={sortKey} order={sortOrder} onSort={handleSort} />
        <div className="text-[10px] font-medium text-muted-foreground">Group</div>
      </div>
      
      {/* Body */}
      <div className="flex-1 overflow-auto">
        {sortedStations.map(station => (
          <StationRow
            key={station.station_id}
            station={station}
            isSelected={selectedStations.has(station.station_id)}
            isExpanded={expandedStations.has(station.station_id)}
            onToggle={() => toggleStation(station.station_id, !selectedStations.has(station.station_id))}
            onExpand={() => toggleExpanded(station.station_id)}
          />
        ))}
      </div>
    </div>
  )
}

function SortableHeader({ 
  label, 
  sortKey, 
  currentKey, 
  order, 
  onSort 
}: { 
  label: string
  sortKey: SortKey
  currentKey: SortKey
  order: SortOrder
  onSort: (key: SortKey) => void
}) {
  const isActive = currentKey === sortKey
  return (
    <button
      className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && <span className="text-[8px]">{order === 'asc' ? '↑' : '↓'}</span>}
    </button>
  )
}

function StationRow({ 
  station, 
  isSelected, 
  isExpanded, 
  onToggle, 
  onExpand 
}: {
  station: StationWaveformData
  isSelected: boolean
  isExpanded: boolean
  onToggle: () => void
  onExpand: () => void
}) {
  const group = getDistanceGroup(station.distance_deg)
  const groupColor = DISTANCE_GROUPS[group].color
  const avgFitVal = avgFit(station)
  const fitColor = getFitColor(avgFitVal)
  
  return (
    <>
      <div 
        className={`
          grid grid-cols-[2rem_3rem_4rem_4rem_4rem_4rem_4rem_1fr] gap-2 
          items-center border-b border-border/50 px-2 py-1 hover:bg-accent/10 cursor-pointer
          ${!isSelected ? 'opacity-50' : ''}
        `}
        onClick={onExpand}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4"
        />
        <span className="text-xs font-mono">{station.network}</span>
        <span className="text-xs font-mono font-semibold">{station.station}</span>
        <span className="text-xs font-mono">{station.distance_deg.toFixed(1)}</span>
        <span className="text-xs font-mono">{station.azimuth_deg.toFixed(0)}</span>
        <span className="text-xs font-mono">{avgWeight(station).toFixed(2)}</span>
        <span className="text-xs font-mono font-semibold" style={{ color: fitColor }}>
          {avgFitVal.toFixed(1)}%
        </span>
        <span 
          className="text-[10px] font-semibold uppercase px-1 py-0.5 rounded"
          style={{ backgroundColor: groupColor + '30', color: groupColor }}
        >
          {group}
        </span>
      </div>
      
      {/* Expanded component details */}
      {isExpanded && (
        <div className="bg-card/50 border-b border-border/30 px-8 py-2 grid grid-cols-3 gap-2">
          {station.components.map(comp => (
            <ComponentBadge key={comp.component} component={comp} />
          ))}
        </div>
      )}
    </>
  )
}

function ComponentBadge({ component }: { component: ComponentWaveform }) {
  return (
    <div className="text-[10px] font-mono bg-background/50 rounded px-2 py-1">
      <span className="font-bold">{component.component}</span>
      <span className="ml-2">SNR: {component.snr?.toFixed(1) ?? 'N/A'}</span>
      <span className="ml-2">Fit: {component.fit_percent?.toFixed(1) ?? 'N/A'}%</span>
      <span className="ml-2">Wgt: {component.weight?.toFixed(2) ?? '1.0'}</span>
    </div>
  )
}

// Helper functions
function avgFit(station: StationWaveformData): number {
  const fits = station.components.filter(c => c.fit_percent != null).map(c => c.fit_percent!)
  return fits.length > 0 ? fits.reduce((a, b) => a + b, 0) / fits.length : 0
}

function avgWeight(station: StationWaveformData): number {
  const weights = station.components.filter(c => c.weight != null).map(c => c.weight!)
  return weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 1.0
}

function getFitColor(fit: number): string {
  if (fit >= 80) return '#4ade80' // Green
  if (fit >= 60) return '#fbbf24' // Yellow
  return '#f87171' // Red
}
```

**Deliverable**: Interactive station table dengan sorting, filtering, dan expand

---

### Milestone 3.5: Waveform Canvas (D3.js) (2-3 Hari)

#### Sprint 5: Build WaveformCanvas Component
**File**: `src/components/Waveform/WaveformCanvas.tsx`

**Features:**
- D3.js untuk render waveform traces
- Observed (black) vs Synthetic (red) overlay
- Time axis dengan pick markers
- Zoom/pan interaction
- Component selector (Z/R/T toggle)

```typescript
import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { ComponentWaveform } from '@/types/seismology'

interface WaveformCanvasProps {
  observed: ComponentWaveform
  synthetic: ComponentWaveform
  width: number
  height: number
  showGrid?: boolean
}

export function WaveformCanvas({ 
  observed, 
  synthetic, 
  width, 
  height,
  showGrid = true 
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  
  useEffect(() => {
    if (!canvasRef.current || !svgRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    
    // Clear
    ctx.clearRect(0, 0, width, height)
    
    // Define scales
    const obsData = observed.data
    const synData = synthetic.data
    const maxLength = Math.max(obsData.length, synData.length)
    
    const xScale = d3.scaleLinear()
      .domain([0, maxLength])
      .range([40, width - 10])
    
    const maxAmp = Math.max(
      ...obsData.map(Math.abs),
      ...synData.map(Math.abs),
      0.001
    )
    
    const yScale = d3.scaleLinear()
      .domain([-maxAmp, maxAmp])
      .range([height - 20, 10])
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 0.5
      ctx.setLineDash([2, 2])
      
      // Horizontal center line
      ctx.beginPath()
      ctx.moveTo(40, height / 2)
      ctx.lineTo(width - 10, height / 2)
      ctx.stroke()
      
      ctx.setLineDash([])
    }
    
    // Draw waveforms
    const drawTrace = (data: number[], color: string, lineWidth: number) => {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      
      data.forEach((y, i) => {
        const x = xScale(i)
        const yPos = yScale(y)
        i === 0 ? ctx.moveTo(x, yPos) : ctx.lineTo(x, yPos)
      })
      
      ctx.stroke()
    }
    
    // Observed (black, thin)
    drawTrace(obsData, '#e5e5e5', 1.5)
    
    // Synthetic (red, thicker)
    drawTrace(synData, '#ef4444', 2)
    
    // Draw axes using SVG (overlay)
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(i => `${(Number(i) / observed.sampling_rate).toFixed(1)}s`)
    
    svg.append('g')
      .attr('transform', `translate(0, ${height - 20})`)
      .call(xAxis)
      .attr('color', '#888')
      .attr('font-size', '10px')
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(4)
      .tickFormat(d => d3.format('.2e')(Number(d)))
    
    svg.append('g')
      .attr('transform', 'translate(40, 0)')
      .call(yAxis)
      .attr('color', '#888')
      .attr('font-size', '10px')
    
  }, [observed, synthetic, width, height, showGrid])
  
  return (
    <div className="relative" style={{ width, height }}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <svg ref={svgRef} width={width} height={height} className="absolute inset-0 pointer-events-none" />
    </div>
  )
}
```

**Deliverable**: Canvas component untuk render waveform traces

---

### Milestone 3.6: Download Progress Dialog (1-2 Hari)

#### Sprint 6A: Build Download Progress Modal
**File**: `src/components/Waveform/WaveformDownloadDialog.tsx`

**Features** (berdasarkan screenshot SCMTV):
- Modal dialog dengan progress tracking "Completed X/Y stations"
- Real-time table dengan kolom: Net, Sta, Loc, Cha, Progress%, Status
- Protocol info header (SeedLink + ArcLink URLs)
- Cancel button untuk abort download
- Auto-close ketika selesai atau error handling

**Component Structure:**
```typescript
import { useState, useEffect } from 'react'
import { X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWaveformStore } from '@/stores/waveformStore'

interface StationDownloadStatus {
  network: string
  station: string
  location: string
  channel: string
  progress: number          // 0-100
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  error?: string
}

interface WaveformDownloadDialogProps {
  jobId: string
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function WaveformDownloadDialog({
  jobId,
  isOpen,
  onClose,
  onComplete
}: WaveformDownloadDialogProps) {
  const [stations, setStations] = useState<StationDownloadStatus[]>([])
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [protocols, setProtocols] = useState<string>('')
  const loadWaveforms = useWaveformStore(s => s.loadWaveforms)
  
  useEffect(() => {
    if (!isOpen) return
    
    // Initialize download process
    startDownload()
  }, [isOpen, jobId])
  
  const startDownload = async () => {
    setIsDownloading(true)
    
    try {
      const { platform } = await import('@/lib/platform')
      
      // Get job context to know which stations to download
      const context = await platform.getJobContext(jobId)
      const stationIds = context.context.selected_stations
      
      // Initialize status for all stations
      const initialStatuses: StationDownloadStatus[] = stationIds.map(id => {
        const [network, station, location, channel] = id.split('.')
        return {
          network,
          station,
          location: location || '',
          channel: channel || 'SH',
          progress: 0,
          status: 'pending'
        }
      })
      
      setStations(initialStatuses)
      setTotal(stationIds.length)
      setProtocols('combined://slink/lts-data:18000;arclink/lts-data:18001')
      
      // Start streaming download progress via SSE
      const streamUrl = platform.getWaveformDownloadStreamUrl(jobId)
      const eventSource = new EventSource(streamUrl)
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'station_progress') {
          updateStationProgress(data.station_id, data.progress, data.status)
        } else if (data.type === 'completed') {
          setIsDownloading(false)
          eventSource.close()
          
          // Auto-close after 2 seconds if all succeeded
          if (data.failed_count === 0) {
            setTimeout(() => {
              onComplete()
              onClose()
            }, 2000)
          }
        }
      }
      
      eventSource.onerror = () => {
        console.error('SSE connection error')
        eventSource.close()
        setIsDownloading(false)
      }
      
      // Trigger backend download
      await platform.downloadWaveforms(jobId)
      
    } catch (err) {
      console.error('Download failed:', err)
      setIsDownloading(false)
    }
  }
  
  const updateStationProgress = (
    stationId: string,
    progress: number,
    status: StationDownloadStatus['status']
  ) => {
    setStations(prev => {
      const updated = prev.map(s => {
        const id = `${s.network}.${s.station}.${s.location}.${s.channel}`
        if (id === stationId) {
          return { ...s, progress, status }
        }
        return s
      })
      
      const completedCount = updated.filter(s => s.status === 'completed').length
      setCompleted(completedCount)
      
      return updated
    })
  }
  
  const handleCancel = () => {
    if (isDownloading) {
      // Send cancel request to backend
      const { platform } = require('@/lib/platform')
      platform.cancelWaveformDownload(jobId)
    }
    onClose()
  }
  
  if (!isOpen) return null
  
  const pendingStations = stations.filter(s => s.status !== 'completed')
  const failedStations = stations.filter(s => s.status === 'failed')
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-[800px] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex-1">
            <p className="text-sm font-mono text-muted-foreground">{protocols}</p>
          </div>
          <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress Summary */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold">
                Completed {completed}/{total} stations
              </p>
              {failedStations.length > 0 && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {failedStations.length} failed
                </p>
              )}
            </div>
            {isDownloading && (
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            )}
            {!isDownloading && completed === total && failedStations.length === 0 && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
          
          {/* Overall progress bar */}
          <div className="mt-2 w-full bg-muted rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Pending Data Streams Table */}
        {pendingStations.length > 0 && (
          <>
            <div className="px-4 py-2 bg-muted/30">
              <p className="text-sm font-medium">Pending data streams:</p>
            </div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Net</th>
                    <th className="text-left px-4 py-2 font-medium">Sta</th>
                    <th className="text-left px-4 py-2 font-medium">Loc</th>
                    <th className="text-left px-4 py-2 font-medium">Cha</th>
                    <th className="text-left px-4 py-2 font-medium">Progress</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStations.map((station, idx) => (
                    <tr 
                      key={idx}
                      className={`border-b border-border/50 ${
                        station.status === 'failed' ? 'bg-red-500/10' : ''
                      }`}
                    >
                      <td className="px-4 py-2 font-mono">{station.network}</td>
                      <td className="px-4 py-2 font-mono font-semibold">{station.station}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">
                        {station.location || ''}
                      </td>
                      <td className="px-4 py-2 font-mono">{station.channel}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-1.5 w-20">
                            <div 
                              className={`h-1.5 rounded-full transition-all ${
                                station.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${station.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono w-10 text-right">
                            {station.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {station.status === 'downloading' && (
                          <span className="text-blue-500 text-xs">Downloading...</span>
                        )}
                        {station.status === 'failed' && (
                          <span className="text-red-500 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                        {station.status === 'pending' && (
                          <span className="text-muted-foreground text-xs">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {/* Completed Summary (if all done) */}
        {pendingStations.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-semibold">All stations completed!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {completed} stations successfully downloaded
              </p>
            </div>
          </div>
        )}
        
        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={!isDownloading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onComplete()
              onClose()
            }}
            disabled={isDownloading}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Backend API Requirements** (NEW):
```typescript
// Additional endpoints needed for download progress

interface WaveformDownloadRequest {
  job_id: string
  protocols: ('seedlink' | 'arclink')[]
  timeout_seconds?: number
}

// POST /automt/v1/interactive-processor/jobs/{jobId}/waveforms/download
// Triggers async waveform download, returns task_id

// SSE /automt/v1/interactive-processor/jobs/{jobId}/waveforms/stream-progress
// Streams real-time progress:
// { type: 'station_progress', station_id: 'IA.BUBSI..SH', progress: 45, status: 'downloading' }
// { type: 'completed', total: 66, completed: 66, failed: 0 }

// DELETE /automt/v1/interactive-processor/jobs/{jobId}/waveforms/cancel
// Cancel ongoing download
```

**Deliverable**: Modal dialog dengan real-time download progress tracking

---

### Milestone 3.7: WaveformPage Integration (1 Hari)

#### Sprint 7: Connect Components to WaveformPage
**File**: `src/pages/WaveformPage.tsx`

**Modifications:**
1. Add `WaveformDownloadDialog` integration
2. Replace demo data dengan `useWaveformStore`
3. Add loading state dengan skeleton
4. Add error boundary
5. Add distance filter controls
6. Add "Reload Waveforms" button yang trigger download dialog

```typescript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEventStore } from '@/stores/eventStore'
import { useJobStore } from '@/stores/jobStore'
import { useWaveformStore } from '@/stores/waveformStore'
import { SplitPane } from '@/components/layout/SplitPane'
import { TensorPanel } from '@/components/TensorPanel/TensorPanel'
import { StationTable } from '@/components/Waveform/StationTable'
import { WaveformDownloadDialog } from '@/components/Waveform/WaveformDownloadDialog'
import { BeachBall2D } from '@/components/BeachBall/BeachBall2D'
import { Button } from '@/components/ui/button'
import { RefreshCw, Filter, Download } from 'lucide-react'

export function WaveformPage() {
  const navigate = useNavigate()
  const selectedEventId = useEventStore(s => s.selectedEventId)
  const jobs = useJobStore(s => s.jobs)
  const loadWaveforms = useWaveformStore(s => s.loadWaveforms)
  const isLoading = useWaveformStore(s => s.isLoading)
  const error = useWaveformStore(s => s.error)
  const context = useWaveformStore(s => s.context)
  
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  
  // Find active job for selected event
  const activeJob = jobs.find(j => 
    j.eventId === selectedEventId && 
    j.currentStage === 'INVERTED'
  )
  
  useEffect(() => {
    if (!selectedEventId) {
      navigate('/events')
      return
    }
    
    // Check if waveforms need to be downloaded
    if (activeJob && !context) {
      // Show download dialog instead of auto-loading
      setShowDownloadDialog(true)
    }
  }, [selectedEventId, activeJob, context, navigate])
  
  const handleDownloadComplete = async () => {
    // After download completes, load waveforms into store
    if (activeJob) {
      await loadWaveforms(activeJob.jobId)
    }
  }
  
  if (!selectedEventId) return null
  
  if (!activeJob) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">No processing job found for this event.</p>
        <Button onClick={() => navigate('/processing')}>
          Start Processing
        </Button>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading waveforms...</span>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={() => loadWaveforms(activeJob.jobId)}>
          Retry
        </Button>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {selectedEventId} — Job: {activeJob.jobId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDownloadDialog(true)}
          >
            <Download className="w-4 h-4 mr-1" />
            Re-download
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadWaveforms(activeJob.jobId)}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Reload
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-1" />
            Filter
          </Button>
        </div>
      </div>
      
      {/* Download Progress Dialog */}
      <WaveformDownloadDialog
        jobId={activeJob.jobId}
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onComplete={handleDownloadComplete}
      />
      
      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <SplitPane
          left={
            <div className="h-full flex flex-col border-r border-border">
              <div className="flex items-center h-8 px-3 border-b border-border bg-card shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Tensor Details
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <TensorPanel event={null} />
              </div>
            </div>
          }
          right={
            <div className="h-full flex flex-col">
              <div className="flex items-center h-8 px-3 border-b border-border bg-card shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Station Waveforms
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <StationTable />
              </div>
            </div>
          }
          defaultLeftWidth="25%"
        />
      </div>
    </div>
  )
}
```

**Deliverable**: Fully integrated WaveformPage dengan station management

---

## 4. Testing Strategy

### 4.1 Unit Tests
```typescript
// src/stores/waveformStore.test.ts
describe('WaveformStore', () => {
  it('should load waveforms from API', async () => {
    const store = useWaveformStore.getState()
    await store.loadWaveforms('test-job-123')
    expect(store.observedWaveforms.size).toBeGreaterThan(0)
  })
  
  it('should toggle station selection', () => {
    const store = useWaveformStore.getState()
    store.toggleStation('IA.AAA..BH', true)
    expect(store.selectedStations.has('IA.AAA..BH')).toBe(true)
  })
  
  it('should filter by distance group', () => {
    const store = useWaveformStore.getState()
    store.setDistanceFilter(['local'])
    const filtered = selectFilteredStations(store)
    expect(filtered.every(s => s.distance_deg < 3)).toBe(true)
  })
})
```

### 4.2 Integration Tests
```typescript
// src/pages/WaveformPage.test.tsx
describe('WaveformPage', () => {
  it('should load waveforms when event selected', async () => {
    render(<WaveformPage />)
    await waitFor(() => {
      expect(screen.getByText(/IA.AAA/)).toBeInTheDocument()
    })
  })
  
  it('should show error when API fails', async () => {
    // Mock API error
    vi.spyOn(platform, 'getJobContext').mockRejectedValue(new Error('API Error'))
    render(<WaveformPage />)
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })
  })
})
```

### 4.3 E2E Tests (Playwright)
```typescript
// e2e/waveform-workflow.spec.ts
test('waveform preparation workflow', async ({ page }) => {
  await page.goto('/events')
  
  // Select event
  await page.click('tr:first-child')
  
  // Navigate to MT page
  await page.click('text=Moment Tensor')
  
  // Click Waveforms button
  await page.click('button:has-text("Waveforms")')
  
  // Wait for station table
  await page.waitForSelector('[data-testid="station-table"]')
  
  // Verify stations loaded
  const rows = await page.$$('tr[data-station-id]')
  expect(rows.length).toBeGreaterThan(0)
  
  // Toggle station
  await page.click('input[type="checkbox"]:first-child')
  
  // Verify update sent to backend
  await page.waitForResponse(resp => 
    resp.url().includes('/stations') && resp.request().method() === 'PATCH'
  )
})
```

---

## 5. API Feedback & Requirements

### 5.1 Critical Endpoints (Must Verify)

#### ✅ Already Documented & Likely Ready
1. `GET /jobs/{jobId}/context` — Returns full processing context
2. `GET /jobs/{jobId}/waveforms?kind=plot_obs` — Observed waveforms
3. `GET /jobs/{jobId}/waveforms?kind=plot_syn` — Synthetic waveforms

#### ⚠️ Needs Verification (Check with Backend Team)
4. **Station Contributions Endpoint**
   - Expected: `GET /jobs/{jobId}/station-contributions`
   - Returns: Per-station quality metrics (SNR, fit, weight) per component
   - **Question**: Apakah endpoint ini sudah ada atau masih perlu dibuat?

5. **Station Weight Update Endpoint**
   - Expected: `PATCH /jobs/{jobId}/stations`
   - Request Body:
     ```json
     {
       "updates": [
         {
           "station_id": "IA.AAA..BH",
           "component": "Z",
           "weight": 0.8,
           "is_enabled": true
         }
       ]
     }
     ```
   - **Question**: Apakah perubahan weight langsung trigger re-inversion atau hanya update state?

---

### 5.2 Data Format Validation Checklist

| Field | Type | Example | Status |
|-------|------|---------|--------|
| `station_id` | string | `"IA.AAA..BH"` | ✅ |
| `distance_deg` | number | `1.2` | ✅ |
| `azimuth_deg` | number | `45.0` | ✅ |
| `component` | enum | `"Z"`, `"R"`, `"T"` | ✅ |
| `data` | number[] | `[0.0, 0.1, ...]` | ⚠️ Verify length & sampling rate |
| `sampling_rate` | number | `20.0` (Hz) | ⚠️ Verify units |
| `start_time` | ISO8601 | `"2026-07-14T12:34:56.789Z"` | ✅ |
| `snr` | number | `12.5` | ⚠️ Verify calculation method |
| `fit_percent` | number | `93.3` (0-100) | ⚠️ Verify scale (0-100 vs 0-1) |
| `weight` | number | `1.0` (0-1) | ✅ |
| `time_shift` | number | `-0.5` (seconds) | ⚠️ Verify sign convention |

**Action Items:**
1. **Test dengan sample event** — Request waveform data dari backend, verify structure
2. **Validate SNR calculation** — Pastikan SNR computed dengan window yang konsisten
3. **Check fit_percent scale** — Apakah 0-100 atau 0-1? (perlu normalisasi di frontend jika 0-1)
4. **Verify time_shift convention** — Positive = synthetic late, negative = synthetic early?

---

### 5.3 Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| **Large waveform data** (>100 stations × 2048 samples) | Use streaming/chunked response, compress with gzip |
| **Slow API response** (>5s for waveforms) | Add loading skeleton, implement caching |
| **Real-time updates** (station weight changes) | Use debounce (500ms), batch multiple updates |
| **Memory usage** (storing obs + syn waveforms) | Use Float32Array, lazy load expanded stations only |

---

## 6. Timeline & Milestones Summary

```
Week 1 (Day 1-3):
  ├─ API Integration Layer (AutoMTAPIClient extensions)
  ├─ TypeScript Types (seismology.ts additions)
  └─ Mock Data Preparation

Week 2 (Day 4-7):
  ├─ WaveformStore (Zustand)
  ├─ StationTable Component
  ├─ Download Progress Dialog (NEW)
  └─ Basic UI Integration

Week 3 (Day 8-12):
  ├─ WaveformCanvas (D3.js rendering)
  ├─ WaveformPage Integration
  ├─ SSE Progress Streaming
  ├─ Testing & Bug Fixes
  └─ Documentation
```

**Total Effort**: 10-12 hari kerja (1 developer full-time)

**New Component Added**: WaveformDownloadDialog dengan real-time progress tracking via SSE

---

## 7. Acceptance Criteria

### Definition of Done
- [ ] User dapat klik "Waveforms" button dari MomentTensorPage
- [ ] **Download progress dialog muncul** dengan real-time tracking per station
- [ ] Progress bar dan percentage update sesuai jumlah station completed
- [ ] User dapat cancel download yang sedang berjalan
- [ ] Station table muncul dengan data real dari API (setelah download selesai)
- [ ] Station dapat di-toggle on/off
- [ ] Sorting by distance/azimuth/fit berfungsi
- [ ] Distance grouping (Local/Regional/Teleseismic) terlihat jelas
- [ ] Waveform canvas menampilkan observed vs synthetic traces
- [ ] Per-component details expandable
- [ ] Error handling untuk API failures & download errors
- [ ] Loading states untuk async operations
- [ ] Unit tests coverage >80%
- [ ] Integration test untuk full workflow (button click → download → display)

---

## 8. Dependencies & Blockers

### Must Have Before Starting
1. ✅ Backend AutoMT API running di `http://10.20.229.39:8111`
2. ⚠️ **Backend implementation** untuk `/waveforms/download` endpoint (NEW)
3. ⚠️ **SSE streaming** endpoint `/waveforms/stream-progress` (NEW)
4. ⚠️ At least 1 completed processing job dengan waveform data
5. ⚠️ Station contributions endpoint verified
6. ✅ CORS enabled untuk development (localhost:5173)
7. ⚠️ **SeedLink server** accessible (port 18000)
8. ⚠️ **ArcLink server** accessible (port 18001)

### Nice to Have
1. Sample waveform files untuk offline development
2. Postman/OpenAPI collection untuk manual testing
3. Backend developer contact untuk quick questions
4. Staging environment untuk testing before production
5. **Mock SSE server** untuk testing download progress tanpa real SeedLink/ArcLink

---

## 9. Next Steps (Action Plan)

### Immediate Actions (This Week)
1. **Backend Verification Call** (30 minutes)
   - Konfirmasi endpoint `station-contributions` exists
   - **Diskusi implementasi `/waveforms/download` endpoint** (NEW)
   - **Confirm SSE streaming architecture** untuk progress tracking (NEW)
   - Verify waveform data format dengan sample request
   - Discuss weight update mechanism (real-time vs batch)
   - **Test SeedLink/ArcLink server accessibility**

2. **Setup Mock Data** (1 day)
   - Create realistic mock waveforms
   - Mock processing context with 10-15 stations
   - **Mock SSE stream untuk download progress** (NEW)
   - Prepare fallback untuk offline development

3. **Start Implementation** (Week 1)
   - Milestone 3.1: API Integration Layer
   - Milestone 3.2: TypeScript Types

### Mid-term (Week 2-3)
4. **Build UI Components**
   - StationTable with sorting/filtering
   - **WaveformDownloadDialog dengan SSE integration** (NEW)
   - WaveformCanvas with D3.js
   - Integration testing

5. **Polish & Test**
   - Add animations for better UX
   - Error boundaries
   - Loading states
   - **SSE reconnection logic** (NEW)
   - E2E tests including download flow

### Long-term (After Initial Release)
6. **Performance Optimization**
   - Virtual scrolling for >100 stations
   - WebWorkers untuk waveform preprocessing
   - Lazy loading untuk expanded rows

7. **Advanced Features**
   - Phase picking UI
   - Manual time shift adjustment (drag handles)
   - Waveform zoom/pan with mouse
   - Export waveforms to MiniSEED

---

## 10. Contact & Resources

### Key Stakeholders
- **Frontend Lead**: [Your Name]
- **Backend API**: [Backend Developer Name]
- **Seismology Domain Expert**: [Seismologist Name]
- **Project Manager**: [PM Name]

### Documentation Links
- AutoMT API Spec: `http://10.20.229.39:8111/docs`
- SCMTV Reference: https://docs.gempa.de/mt/current/apps/scmtv.html
- Project Roadmap: [08-DEVELOPMENT-ROADMAP.md](./08-DEVELOPMENT-ROADMAP.md)
- API Reference: [12-AUTOMT-API-REFERENCE.md](./12-AUTOMT-API-REFERENCE.md)

### Support Channels
- Slack: `#garuda-scmtv-dev`
- Email: `garuda-dev@bmkg.go.id`
- Weekly Sync: Every Thursday 10:00 WIB

---

**Document Version**: 1.0  
**Last Updated**: 2026-07-15  
**Author**: AI Assistant + BMKG Dev Team  
**Status**: 🟡 Draft — Awaiting Backend Verification
