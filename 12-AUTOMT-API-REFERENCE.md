# AutoMT API Reference — Backend Integration Guide

**Base URL**: `http://10.20.229.39:8111`  
**API Version**: `2.5.0`  
**OpenAPI Spec**: `http://10.20.229.39:8111/openapi.json`

Dokumen ini merangkum **AutoMT API** yang dikembangkan tim BMKG sebagai backend untuk **Garuda SCMTV**. API ini menyediakan dua mode operasi utama: **Auto-Processor** (batch processing) dan **Interactive-Processor** (step-by-step interactive analysis).

---

## 1. API Architecture Overview

### 1.1 Three Main Modules

```
┌─────────────────────────────────────────────┐
│           AutoMT API v2.5.0                 │
├─────────────────────────────────────────────┤
│                                             │
│  1. Events Module                           │
│     └─ Read-only SeisComP event catalog    │
│        + AutoMT focal mechanism results     │
│                                             │
│  2. Auto-Processor Module                   │
│     └─ Submit batch jobs                   │
│        (automt-gui-processor.py runner)     │
│                                             │
│  3. Interactive-Processor Module            │
│     └─ Step-by-step interactive analysis   │
│        (QCMT InteractiveAnalysisService)    │
│                                             │
└─────────────────────────────────────────────┘
```

### 1.2 Workflow Comparison

| Feature | Auto-Processor | Interactive-Processor |
|---------|----------------|----------------------|
| **Use Case** | Batch/automatic processing | Manual analysis & refinement |
| **Control** | Submit once, wait for result | Step-by-step control via API |
| **Duration** | 15-60 minutes | Variable (operator-controlled) |
| **Interaction** | Poll status endpoint | Multiple stage endpoints |
| **Output** | Final focal mechanism + plots | Real-time context + waveforms |
| **Target User** | Automated systems, background jobs | Interactive GUI (Garuda SCMTV) |

---

## 2. Events Module (Read-Only Catalog)

### 2.1 List Events

```http
GET /automt/v1/events
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-based) |
| `page_size` | integer | 20 | Items per page (max 100) |
| `method_id` | string | null | Filter by inversion method ID |
| `focal_mechanism_quality` | string | null | Filter by quality class (e.g., "B1") |

**Response:** `PaginatedEvents`
```json
{
  "items": [
    {
      "event_id": "bmg2026abcd",
      "origin_time": "2026-07-14T12:34:56.789Z",
      "latitude": -8.1,
      "longitude": 110.2,
      "depth_km": 12.0,
      "magnitude": 5.1,
      "magnitude_type": "Mw",
      "phases": 42,
      "rms": 0.35,
      "evaluation_status": "confirmed",
      "focal_mechanism_count": 1,
      "focal_mechanism_quality": "B1",
      "agency_id": "BMKG",
      "region": "Java Sea"
    }
  ],
  "total_count": 1542,
  "page": 1,
  "page_size": 20
}
```

---

### 2.2 Get Preferred AutoMT Result

```http
GET /automt/v1/events/{event_id}
```

**Response:** `AutoMTResultSchema`
```json
{
  "result_id": "FocalMechanism#20260714123456",
  "centroid": {
    "latitude": -8.105,
    "longitude": 110.195,
    "depth_km": 11.8,
    "time": "2026-07-14T12:34:58.500Z",
    "method_id": "QCMT_R",
    "quality_class": "B1",
    "associated_station_count": 18,
    "used_station_count": 15,
    "azimuthal_gap": 78.5
  },
  "magnitude": {
    "magnitude": 5.1,
    "type": "Mw",
    "method_id": "QCMT_R"
  },
  "focal_mechanism": {
    "nodal_planes": [
      {
        "strike": 125.0,
        "dip": 45.0,
        "rake": 90.0
      },
      {
        "strike": 305.0,
        "dip": 45.0,
        "rake": 90.0
      }
    ],
    "misfit": 0.32,
    "method_id": "QCMT_R",
    "evaluation_status": "reviewed",
    "comments": ["Manual review completed"]
  },
  "moment_tensor": {
    "scalar_moment": 1.23e17,
    "variance_reduction": 0.68,
    "dc_perc": 85.3,
    "clvd_perc": 14.7,
    "iso_perc": 0.0,
    "tensor": {
      "mrr": 1.2e17,
      "mtt": -0.5e17,
      "mpp": -0.7e17,
      "mrt": 0.3e17,
      "mrp": 0.8e17,
      "mtp": -0.4e17
    },
    "method_id": "QCMT_R",
    "greens_function_id": "INDO_MEAN_R"
  },
  "station_contributions": [
    {
      "station_id": "IA.AAA..BH",
      "is_active": true,
      "weight": 1.0,
      "components": [
        {
          "component": "Z",
          "is_active": true,
          "weight": 1.0,
          "snr": 12.5,
          "time_shift": -0.5
        },
        {
          "component": "R",
          "is_active": true,
          "weight": 0.25,
          "snr": 8.3,
          "time_shift": -0.3
        },
        {
          "component": "T",
          "is_active": false,
          "weight": 0.5,
          "snr": 3.2,
          "time_shift": 0.0
        }
      ]
    }
  ]
}
```

---

### 2.3 List All Results for Event

```http
GET /automt/v1/events/{event_id}/results
```

**Purpose**: Retrieve all inversion attempts (different methods, iterations)

**Response:** `PaginatedAutoMTResults` (same schema as 2.2, but paginated list)

---

### 2.4 Get Specific Result by ID

```http
GET /automt/v1/events/{event_id}/results/{result_id}
```

**Purpose**: Fetch one historical focal mechanism result

---

## 3. Auto-Processor Module (Batch Processing)

### 3.1 Get Processor Configuration

```http
GET /automt/v1/auto-processor/config
```

**Response:** `ProcessorConfig`
```json
{
  "data_paths": {
    "greens_dir": "/home/eq/seiscomp/share/automt/gf_stores",
    "waveforms_dir": "/home/eq/seiscomp/var/lib/archive",
    "inventory_path": "/home/eq/seiscomp/etc/inventory/fsdn",
    "catalogs_file": "data/catalog.txt",
    "stations_file": "data/stations.dat",
    "velocity_models_file": "data/velmod_poin.txt"
  },
  "global_config": {
    "agency": "BMKG",
    "centroid_inversion": false,
    "cpu_threads": 64,
    "dc_interest_eq": true,
    "decompose_grid": true,
    "deviatoric": true,
    "use_gpu": false,
    "gpu_batch_size": 4000
  },
  "methods": [
    {
      "method": "QCMT_R",
      "mag_range": [3.5, 5.5],
      "freq_range": [],
      "dist_range": [0.5, 7.5],
      "use_covariance": true,
      "use_qcmt_optimizer": true,
      "time_window": {
        "strategy": "velocity",
        "start_reference": "p_arrival",
        "start_offset_s": -20.0,
        "min_duration_s": 180.0,
        "v_min": 2000.0
      }
    },
    {
      "method": "Surface_R",
      "mag_range": [5.0, 6.0],
      "freq_range": [0.02, 0.05],
      "dist_range": [5.0, 50.0],
      "use_covariance": false,
      "use_qcmt_optimizer": false,
      "time_window": {
        "strategy": "velocity",
        "start_reference": "p_arrival",
        "start_offset_s": -20.0,
        "min_duration_s": 0.0,
        "v_min": 2000.0
      }
    },
    {
      "method": "WPHASE_R",
      "mag_range": [6.0, 9.9],
      "freq_range": [0.008, 0.02],
      "dist_range": [5.0, 12.0],
      "use_covariance": true,
      "use_qcmt_optimizer": true,
      "time_window": {
        "strategy": "wphase",
        "start_reference": "p_arrival",
        "start_offset_s": -25.0,
        "min_duration_s": 0.0,
        "delta_multiplier": 15.0
      }
    }
  ],
  "base_frequency_config": {
    "freq_max": "auto",
    "freq_min": "auto"
  },
  "grid_config": {
    "grid_uncertainty_H": 10000.0,
    "grid_uncertainty_Z": 15000.0,
    "grid_uncertainty_T": "auto",
    "grid_step_x": 1000,
    "grid_step_z": 1000,
    "circle_shape": true
  },
  "station_selection_config": {
    "min_comp": 6,
    "min_sta": 3,
    "ppsd_min": 70,
    "snr_min": "auto",
    "auto_ppsd": false,
    "stn_max_dist": "auto",
    "stn_min_dist": "auto",
    "sector_num": 8,
    "sector_numsta": 2,
    "msbb_outlier_threshold": 1.5,
    "vr_threshold": -998,
    "dist_mag_score": {
      "mag_breaks": [3.0, 4.0, 5.0, 6.5],
      "dist_breaks": [50.0, 100.0, 200.0, 350.0, 500.0],
      "scores": [
        [2.0, 1.7, 1.4, 1.1, 0.8, 0.3],
        [1.4, 1.7, 2.0, 1.7, 1.1, 0.5],
        [1.1, 1.4, 1.7, 2.0, 1.8, 1.6],
        [0.5, 0.8, 1.4, 1.7, 2.0, 1.8],
        [0.3, 0.5, 0.8, 1.4, 1.7, 2.0]
      ]
    }
  },
  "fitting_config": {
    "stf_type": "Triangle",
    "stf_duration": "auto",
    "stf_min_mag": 6.5,
    "gf_stores": ["INDO_MEAN"],
    "fitting_data": "DISP",
    "fitting_cova": true,
    "components_order": "ZRT",
    "stn_specs_tshift": "auto",
    "last_wave_velocity": 2500,
    "taper_perc": 20,
    "ppsd_weight": false,
    "use_qcmt_optimizer": "auto"
  },
  "bayesian_config": {
    "use_cov_noise": "auto",
    "use_cov_residual": true,
    "cross_covariance": false,
    "correlation": true,
    "noise_toeplitz": false,
    "residual_toeplitz": true
  },
  "output_config": {
    "merge2seiscomp": false,
    "save_sens_file": false,
    "plot_qc": false,
    "plot_sts": true,
    "plot_cov": true,
    "plot_unc": true,
    "plot_grid": true,
    "plot_fitting": true,
    "plot_quality": true,
    "plot_ext": ".png",
    "plot_dpi": 200,
    "plot_summary": true,
    "inc_dir": "/home/eq/q_repo/q_cmt/inc"
  }
}
```

---

### 3.2 Update Processor Configuration

```http
PUT /automt/v1/auto-processor/config
```

**Request Body:** `ProcessorConfig` (partial updates allowed — merge semantics)

**Example (Update Frequency & Grid):**
```json
{
  "base_frequency_config": {
    "freq_min": 0.02,
    "freq_max": 0.08
  },
  "grid_config": {
    "grid_step_x": 2000,
    "grid_step_z": 2000
  }
}
```

**Response:** Updated `ProcessorConfig`

---

### 3.3 Submit Processing Job

```http
POST /automt/v1/auto-processor/jobs
```

**Request Body:** `ProcessorJobRequest`
```json
{
  "event_id": "bmg2026abcd",
  "lat": -8.1,
  "lon": 110.2,
  "mag": 5.1,
  "depth": 12.0,
  "time": "2026-07-14T12:34:56.789Z",
  "workdir": "/home/eq/q_repo/q_cmt/jobs/bmg2026abcd",
  "processor_timeout": 1800,
  "db_url": "mysql://user:pass@localhost/seiscomp"
}
```

**Response (202 Accepted):** `ProcessorJobStatus`
```json
{
  "job_id": "bmg2026abcd_automt_1721123456",
  "event_id": "bmg2026abcd",
  "status": "pending",
  "submitted_at": "2026-07-14T12:35:00.000Z",
  "started_at": null,
  "finished_at": null,
  "exit_code": null,
  "log": null,
  "log_size": 0
}
```

---

### 3.4 Get Job Status

```http
GET /automt/v1/auto-processor/jobs/{job_id}
```

**Poll Strategy**: Every 10 seconds until `status` ∈ `{completed, failed, cancelled, timeout}`

**Response:** `ProcessorJobStatus`
```json
{
  "job_id": "bmg2026abcd_automt_1721123456",
  "event_id": "bmg2026abcd",
  "status": "running",
  "submitted_at": "2026-07-14T12:35:00.000Z",
  "started_at": "2026-07-14T12:35:05.000Z",
  "finished_at": null,
  "exit_code": null,
  "log": "[2026-07-14 12:35:05] Starting automt-gui-processor.py\n[2026-07-14 12:35:10] Loading waveforms...\n",
  "log_size": 512
}
```

**Status Values:**
- `pending`: Queued, not started
- `running`: Processing in progress
- `cancelling`: Cancellation requested
- `cancelled`: Successfully cancelled
- `completed`: Finished successfully (exit_code=0)
- `failed`: Finished with error (exit_code≠0)
- `timeout`: Exceeded processor_timeout

---

### 3.5 Stream Job Logs (SSE)

```http
GET /automt/v1/auto-processor/jobs/{job_id}/streamlogs?offset=0
```

**Protocol**: Server-Sent Events (SSE)

**Event Types:**
```
event: log
data: {"text": "[2026-07-14 12:35:15] Station selection...\n", "offset": 1024}

event: status
data: {"status": "completed", "exit_code": 0}
```

---

### 3.6 Cancel Job

```http
DELETE /automt/v1/auto-processor/jobs/{job_id}
```

**Response (200 OK):**
```json
{
  "message": "Job cancellation requested"
}
```

---

### 3.7 List Jobs

```http
GET /automt/v1/auto-processor/jobs?page=1&page_size=20&status=completed&event_id=bmg2026abcd
```

**Query Filters:**
- `status`: Filter by job status
- `event_id`: Filter by event ID

**Response:** `PaginatedJobs`

---

## 4. Interactive-Processor Module (Step-by-Step Analysis)

### 4.1 Interactive Job Lifecycle

```
┌─────────────────────────────────────────────────┐
│         Interactive Job Stages                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Stage 0: CREATED (job initialization)          │
│           POST /jobs (init request)             │
│                 ↓                               │
│  Stage 1: STATION_PREP_DONE                     │
│           POST /jobs/{job_id}/station-prep      │
│                 ↓                               │
│  Stage 2: WAVEFORM_PREP_DONE                    │
│           POST /jobs/{job_id}/waveform-prep     │
│                 ↓                               │
│  Stage 3: STATION_SELECTION_DONE                │
│           POST /jobs/{job_id}/station-selection │
│                 ↓                               │
│  Stage 4: INVERTED (moment tensor computed)     │
│           POST /jobs/{job_id}/inversion         │
│                 ↓                               │
│  Stage 5: FINALIZED (plots + results saved)     │
│           POST /jobs/{job_id}/finalize          │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Stage Status Values:**
- `CREATED`
- `STATION_PREP_DONE`
- `WAVEFORM_PREP_DONE`
- `STATION_SELECTION_DONE`
- `INVERTED`
- `FINALIZED`

---

### 4.2 Initialize Interactive Job

```http
POST /automt/v1/interactive-processor/jobs?callback_url=&debug=false
```

**Request Body:** `InteractiveJobInitRequest`
```json
{
  "event_id": "bmg2026abcd",
  "lat": -8.1,
  "lon": 110.2,
  "mag": 5.1,
  "depth": 12.0,
  "time": "2026-07-14T12:34:56.789Z",
  "waveform_source_type": "seiscomp",
  "auto_gf": true,
  "is_deviatoric": true,
  "data_is_corrected": false,
  "target_method": "QCMT_R",
  "override_fband": [0.02, 0.08],
  "centroid_inversion": false
}
```

**Response (202 Accepted):** `AsyncStepResponse`
```json
{
  "job_id": "bmg2026abcd_ab12cd34",
  "task_id": "5f8b9c24-1234-5678-abcd-ef0123456789",
  "stage": "CREATED",
  "status": "running",
  "poll_url": "/automt/v1/interactive-processor/tasks/5f8b9c24-1234-5678-abcd-ef0123456789",
  "stream_url": "/automt/v1/interactive-processor/tasks/5f8b9c24-1234-5678-abcd-ef0123456789/streamlogs",
  "result_stream_url": "/automt/v1/interactive-processor/tasks/5f8b9c24-1234-5678-abcd-ef0123456789/streamresults"
}
```

**Resume Existing Job**: Submit same `event_id` → API returns existing `job_id` if not finalized

---

### 4.3 Stage 1: Station Preparation

```http
POST /automt/v1/interactive-processor/jobs/{job_id}/station-prep?dry_run=false&callback_url=&debug=false
```

**Purpose**: 
- Load station metadata
- Compute epicentral distances
- Filter stations by distance bounds

**Response (202 Accepted):** `AsyncStepResponse`

---

### 4.4 Stage 2: Waveform Preparation

```http
POST /automt/v1/interactive-processor/jobs/{job_id}/waveform-prep?dry_run=false&callback_url=&debug=false
```

**Purpose**:
- Fetch waveforms from archive/SeisComP
- Apply instrument response correction (if `data_is_corrected=false`)
- Filter by frequency band
- Compute SNR per component

**Response (202 Accepted):** `AsyncStepResponse`

---

### 4.5 Stage 3: Station Selection

```http
POST /automt/v1/interactive-processor/jobs/{job_id}/station-selection?dry_run=false&callback_url=&debug=false
```

**Request Body:** `StationSelectionRequest`
```json
{
  "use_all_stations": false,
  "num_sector": 12,
  "num_station_per_sector": 2
}
```

**Purpose**:
- Automatic station selection based on:
  - SNR thresholds
  - Azimuthal coverage (sector-based)
  - Distance-magnitude scoring
  - PPSD quality (if enabled)

**Response (202 Accepted):** `AsyncStepResponse`

---

### 4.6 Stage 4: Inversion

```http
POST /automt/v1/interactive-processor/jobs/{job_id}/inversion?dry_run=false&callback_url=&debug=false
```

**Request Body:** `InversionRequest`
```json
{
  "is_automatic": false,
  "est_uncertainty": true,
  "use_optimization": false,
  "force_optimization": false,
  "NS_ranges_km": [[-6.0, 6.0, 2.0], [-3.0, 3.0, 1.0]],
  "EW_ranges_km": [[-1.0, 1.0, 1.0]],
  "Dep_ranges_km": [[-20.0, 20.0, 5.0], [-6.0, 6.0, 1.0]],
  "centroid_inv": false,
  "lock_depth_ref": false,
  "callback_url": "https://example.com/automt/inversion-complete"
}
```

**Inversion Modes:**

| Mode | `is_automatic` | `Dep_ranges_km` | `centroid_inv` | Description |
|------|---------------|-----------------|----------------|-------------|
| **Initial** | `false` | `null` | `false` | Single-point inversion at hypocenter |
| **Depth Search** | `false` | `[[-20, 20, 5], [-6, 6, 1]]` | `false` | 1D depth search with nested refinement |
| **3D Centroid** | `false` | `[[-2, 2, 1]]` | `true` | 3D spatial grid search (NS, EW, Dep) |
| **Locked Depth** | `false` | `[[-5, 5, 1]]` | `true` | Centroid search with fixed depth reference |
| **Automatic** | `true` | (ignored) | (auto) | QCMT auto-selects strategy |

**Response (202 Accepted):** `AsyncStepResponse`

---

### 4.7 Stage 5: Finalize

```http
POST /automt/v1/interactive-processor/jobs/{job_id}/finalize?dry_run=false&callback_url=&debug=false
```

**Purpose**:
- Generate plots (beach ball, waveform fits, depth search, grid)
- Save final focal mechanism to job directory
- Mark job as `FINALIZED`

**Response (202 Accepted):** `AsyncStepResponse`

---

### 4.8 Get Job Context

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/context
```

**Response**: Full `ProcessingContext` from QCMT
```json
{
  "job_id": "bmg2026abcd_ab12cd34",
  "event_id": "bmg2026abcd",
  "current_stage": "INVERTED",
  "context": {
    "event": { "lat": -8.1, "lon": 110.2, "depth": 12.0, "mag": 5.1 },
    "params": {
      "inversion_method": "QCMT_R",
      "fmin": 0.02,
      "fmax": 0.08,
      "min_dist": 0.5,
      "max_dist": 7.5,
      "use_gpu": false
    },
    "valid_waveforms": {
      "IA.AAA..BH": {
        "distance_deg": 1.2,
        "azimuth_deg": 45.0,
        "Z": { "snr": 12.5, "is_valid": true },
        "R": { "snr": 8.3, "is_valid": true },
        "T": { "snr": 3.2, "is_valid": false }
      }
    },
    "selected_stations": ["IA.AAA..BH", "IA.BBB..BH"],
    "best_solution": {
      "depth_km": 11.8,
      "variance_reduction": 0.68,
      "dc_perc": 85.3,
      "clvd_perc": 14.7,
      "iso_perc": 0.0,
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

---

### 4.9 Get Waveforms (GUI Data)

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/waveforms?kind=cholesky&station_id=IA.AAA..BH&include_time=true
```

**Query Parameters:**
| Parameter | Values | Description |
|-----------|--------|-------------|
| `kind` | `normal`, `cholesky`, `plot_obs`, `plot_syn`, `plot_obs_c`, `plot_syn_c` | Waveform array type |
| `station_id` | string | Filter by station ID (omit for all) |
| `include_time` | boolean | Include time array (`plot_t`) |

**Response:** `GuiWaveformDataResponse`
```json
{
  "job_id": "bmg2026abcd_ab12cd34",
  "kind": "cholesky",
  "station_id": null,
  "include_time": true,
  "count": 15,
  "data": {
    "IA.AAA..BH": {
      "plot_t": [0.0, 0.01, 0.02, ..., 60.0],
      "plot_obs_c": {
        "Z": [0.01, 0.03, 0.05, ...],
        "R": [0.00, 0.02, 0.04, ...],
        "T": [0.00, 0.01, 0.02, ...]
      },
      "plot_syn_c": {
        "Z": [0.01, 0.03, 0.04, ...],
        "R": [0.00, 0.02, 0.03, ...],
        "T": [0.00, 0.01, 0.02, ...]
      }
    }
  }
}
```

**Array Types:**
- `normal`: Non-decorrelated waveforms (`plot_obs`, `plot_syn`)
- `cholesky`: Decorrelated waveforms (`plot_obs_c`, `plot_syn_c`) — **recommended for GUI**

---

### 4.10 Get Solutions (Depth Search Results)

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/solutions
```

**Response**: JSON-safe `CentroidSolution` objects per depth
```json
{
  "job_id": "bmg2026abcd_ab12cd34",
  "solutions": [
    {
      "stage": "Stage_1",
      "depth_km": 5.0,
      "variance_reduction": 0.52,
      "dc_perc": 78.2,
      "clvd_perc": 21.8,
      "iso_perc": 0.0,
      "quality": 0.48,
      "stations_used": 12
    },
    {
      "stage": "Stage_2",
      "depth_km": 11.0,
      "variance_reduction": 0.65,
      "dc_perc": 83.1,
      "clvd_perc": 16.9,
      "iso_perc": 0.0,
      "quality": 0.62,
      "stations_used": 14
    },
    {
      "stage": "final_stage",
      "depth_km": 11.8,
      "variance_reduction": 0.68,
      "dc_perc": 85.3,
      "clvd_perc": 14.7,
      "iso_perc": 0.0,
      "quality": 0.65,
      "stations_used": 15
    }
  ]
}
```

---

### 4.11 Get Solution Data Arrays

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/solutions/data/{data_kind}?stage=final_stage&max_samples=10
```

**Path Parameters:**
| `data_kind` | Description |
|-------------|-------------|
| `a_vector` | Moment tensor vector [Mxx, Mxy, Mxz, Myy, Myz, Mzz] |
| `eigvals` | Eigenvalues [λ1, λ2, λ3] |
| `eigvecs` | Eigenvectors (3×3 matrix) |
| `p` | P-axis (trend, plunge) |
| `t` | T-axis (trend, plunge) |
| `n` | Null-axis (trend, plunge) |

**Query Parameters:**
- `stage`: Filter by stage name (`Stage_1`, `Stage_2`, `final_stage`, or `all`)
- `max_samples`: Limit number of samples returned

**Response:**
```json
{
  "data_kind": "a_vector",
  "stage": "final_stage",
  "data": {
    "final_stage": [
      [1.2e17, 0.3e17, 0.8e17, -0.5e17, -0.4e17, -0.7e17]
    ]
  }
}
```

---

## 5. Interactive Patching & Manual Control

### 5.1 Patch Frequency

```http
PATCH /automt/v1/interactive-processor/jobs/{job_id}/frequency?dry_run=false
```

**Request Body:** `PatchFrequencyRequest`
```json
{
  "fmin": 0.01,
  "fmax": 0.04
}
```

**Effect**: Updates frequency bounds → invalidates stages ≥ WAVEFORM_PREP

---

### 5.2 Patch Distance Bounds

```http
PATCH /automt/v1/interactive-processor/jobs/{job_id}/distance-bounds?dry_run=false
```

**Request Body:** `PatchDistanceBoundsRequest`
```json
{
  "min_dist": 1.0,
  "max_dist": 8.0,
  "reload_data": false,
  "data_is_corrected": false
}
```

**Effect**: 
- `reload_data=false`: Filters in-memory waveforms
- `reload_data=true`: Re-runs waveform preparation from scratch

---

### 5.3 Patch Station Selection

```http
PATCH /automt/v1/interactive-processor/jobs/{job_id}/stations?dry_run=false
```

**Request Body:** `PatchStationsRequest`
```json
{
  "selected_station_ids": ["IA.AAA..BH", "IA.BBB..BH", "IA.CCC..BH"],
  "default_weights": {
    "Z": 1.0,
    "R": 0.5,
    "T": 0.5
  }
}
```

**Effect**: Replaces manual station selection, merges component weights

---

### 5.4 Toggle Station Selection

```http
PATCH /automt/v1/interactive-processor/jobs/{job_id}/stations/{station_id}/selection?is_selected=true&dry_run=false
```

**Purpose**: Add/remove single station from inversion

**Parameters:**
- `is_selected=true`: Add station
- `is_selected=false`: Remove station

---

### 5.5 Patch Station Time Shift

```http
PATCH /automt/v1/interactive-processor/jobs/{job_id}/stations/{station_id}/time-shift?dry_run=false
```

**Request Body:** `ManualTimeShiftRequest`
```json
{
  "time_shift_s": -1.5
}
```

**Purpose**: Apply manual waveform time shift (equivalent to mouse drag in SCMTV)

---

### 5.6 Update Green's Functions

```http
PUT /automt/v1/interactive-processor/jobs/{job_id}/green-functions?dry_run=false
```

**Request Body:** `UpdateGreenFunctionsRequest`
```json
{
  "selected_gf": "INDO_MEAN_R",
  "fallback_gfs": ["MODEL_A_R", "MODEL_B_R"]
}
```

**Effect**: Changes GF store for subsequent inversions

---

### 5.7 Change Inversion Method

```http
PUT /automt/v1/interactive-processor/jobs/{job_id}/methods?dry_run=false
```

**Request Body:** `PatchMethodRequest`
```json
{
  "target_method": "Surface_R"
}
```

**Effect**: Switches method (QCMT_R → Surface_R → WPHASE_R, etc.)

---

### 5.8 Update Compute Settings

```http
PATCH /automt/v1/interactive-processor/jobs/{job_id}/compute-settings?dry_run=false
```

**Request Body:** `PatchComputeSettingsRequest`
```json
{
  "use_gpu": false
}
```

**Effect**: Toggle CPU/GPU mode for inversion

---

### 5.9 Get Stations Info

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/stations?station_id=IA.AAA..BH
```

**Response**: Array of `StationInfo`
```json
[
  {
    "station_id": "IA.AAA..BH",
    "network": "IA",
    "code": "AAA",
    "location_code": "",
    "band_code": "BH",
    "weights": {
      "Z": 1.0,
      "R": 0.25,
      "T": 0.5
    },
    "geometry": {
      "distance_deg": 1.2,
      "distance_km": 133.2,
      "azimuth_deg": 45.0,
      "backazimuth_deg": 225.0
    },
    "has_valid_waveform": true,
    "status": "selected"
  }
]
```

**Status Values:**
- `selected`: In manual/auto selection
- `available`: Valid waveform, not selected
- `invalid`: No valid waveform or SNR < threshold

---

## 6. Advanced Features

### 6.1 STF (Source Time Function) Optimization

```http
POST /automt/v1/interactive-processor/jobs/{job_id}/stf-optimization?dry_run=false&callback_url=&debug=false
```

**Request Body:** `StfOptimizationRequest`
```json
{
  "test_durations_s": [10.0, 20.0, 40.0],
  "test_multipliers": null,
  "callback_url": ""
}
```

**OR (multiplier mode):**
```json
{
  "test_durations_s": null,
  "test_multipliers": [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
  "callback_url": ""
}
```

**Purpose**: Test different STF durations against current inversion baseline

---

### 6.2 List Inversion Methods

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/methods
```

**Response**: Array of configured methods
```json
[
  {
    "method": "QCMT_R",
    "mag_range": [3.5, 5.5],
    "freq_range": [],
    "dist_range": [0.5, 7.5],
    "is_selected": true
  },
  {
    "method": "Surface_R",
    "mag_range": [5.0, 6.0],
    "freq_range": [0.02, 0.05],
    "dist_range": [5.0, 50.0],
    "is_selected": false
  }
]
```

---

### 6.3 Get Method Details

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/methods/{method_name}
```

**Response**: Full method configuration with defaults

---

### 6.4 Get Green's Functions

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/green-functions?target_method=QCMT_R&top_n=10&primary_model=INDO_MEAN
```

**Response**: Nearest GF stores ranked by distance
```json
{
  "selected": "INDO_MEAN_R",
  "fallbacks": [
    {
      "store_id": "INDO_MEAN_R",
      "model": "INDO_MEAN",
      "method_suffix": "_R",
      "distance_km": 0.0,
      "is_selected": true
    },
    {
      "store_id": "CC_4_R",
      "model": "CC_4",
      "method_suffix": "_R",
      "distance_km": 85.3,
      "is_selected": false
    }
  ]
}
```

---

### 6.5 Checkpoints (Save/Restore Context)

**List Checkpoints:**
```http
GET /automt/v1/interactive-processor/jobs/{job_id}/checkpoints
```

**Restore Checkpoint:**
```http
POST /automt/v1/interactive-processor/jobs/{job_id}/checkpoints/{checkpoint_id}/restore
```

**Purpose**: Rollback to previous stage (undo changes)

---

### 6.6 Patch History

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/patch-history
```

**Response:** `PatchHistoryResponse`
```json
{
  "job_id": "bmg2026abcd_ab12cd34",
  "history": [
    {
      "timestamp": "2026-07-14T12:40:15.123Z",
      "patch_type": "frequency",
      "payload": {
        "fmin": 0.01,
        "fmax": 0.04
      },
      "invalidated_stages": ["WAVEFORM_PREP_DONE", "STATION_SELECTION_DONE", "INVERTED"]
    },
    {
      "timestamp": "2026-07-14T12:42:30.456Z",
      "patch_type": "stations",
      "payload": {
        "selected_station_ids": ["IA.AAA..BH", "IA.BBB..BH"]
      },
      "invalidated_stages": ["INVERTED"]
    }
  ]
}
```

---

## 7. Async Task Management

### 7.1 Poll Task Status

```http
GET /automt/v1/interactive-processor/tasks/{task_id}?include_logs=false
```

**Response:**
```json
{
  "task_id": "5f8b9c24-1234-5678-abcd-ef0123456789",
  "job_id": "bmg2026abcd_ab12cd34",
  "stage": "WAVEFORM_PREP",
  "status": "running",
  "started_at": "2026-07-14T12:40:00.000Z",
  "finished_at": null,
  "progress_pct": 45.0,
  "message": "Processing station 12/18",
  "logs": []
}
```

**Status Values:**
- `pending`: Queued
- `running`: Executing
- `success`: Completed successfully
- `failed`: Error occurred
- `cancelled`: User-cancelled

---

### 7.2 Cancel Task

```http
DELETE /automt/v1/interactive-processor/tasks/{task_id}
```

---

### 7.3 Stream Task Logs (SSE)

```http
GET /automt/v1/interactive-processor/tasks/{task_id}/streamlogs
```

**Event Types:**
```
event: log
data: {"timestamp": "2026-07-14T12:40:05.123Z", "level": "INFO", "message": "Loading waveforms..."}

event: progress
data: {"progress_pct": 25.0, "message": "Station 5/18"}

event: complete
data: {"status": "success"}
```

---

### 7.4 Stream Task Results (SSE)

```http
GET /automt/v1/interactive-processor/tasks/{task_id}/streamresults
```

**Purpose**: Structured progress callbacks from QCMT inversion

**Event Types:**
```
event: depth_solution
data: {"depth_km": 10.0, "variance_reduction": 0.55, "dc_perc": 80.1}

event: grid_cell
data: {"ns_km": 2.0, "ew_km": 0.0, "depth_km": 11.0, "quality": 0.58}

event: inversion_complete
data: {"best_depth_km": 11.8, "variance_reduction": 0.68}
```

**Note**: Only populated when `use_gpu=false` (CPU solver emits progress)

---

## 8. Job Results & Downloads

### 8.1 Get Job Results

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/results
```

**Response:** `JobResultResponse`
```json
{
  "job_id": "bmg2026abcd_ab12cd34",
  "final_stage": "FINALIZED",
  "final_solution": {
    "depth_km": 11.8,
    "variance_reduction": 0.68,
    "dc_perc": 85.3,
    "clvd_perc": 14.7,
    "iso_perc": 0.0,
    "tensor": { "mrr": 1.2e17, "mtt": -0.5e17, "mpp": -0.7e17, "mrt": 0.3e17, "mrp": 0.8e17, "mtp": -0.4e17 }
  },
  "plots": [
    "focal_mechanism_plot.png",
    "waveform_fits.png",
    "depth_search.png",
    "grid_search.png",
    "quality_plot.png"
  ],
  "download_url": "/automt/v1/interactive-processor/jobs/bmg2026abcd_ab12cd34/results/"
}
```

---

### 8.2 Download Result File

```http
GET /automt/v1/interactive-processor/jobs/{job_id}/results/{filename}
```

**Example:**
```
GET /automt/v1/interactive-processor/jobs/bmg2026abcd_ab12cd34/results/focal_mechanism_plot.png
```

**Response**: Binary file (PNG, PDF, etc.)

---

## 9. Health & Version

### 9.1 Health Check

```http
GET /
```

**Response:** `HealthResponse`
```json
{
  "status": "healthy",
  "api_version": "2.5.0",
  "automt_version": "1.2.3",
  "environment": "production",
  "seiscomp_db_status": "connected",
  "redis_status": "connected",
  "components": {
    "qcmt_backend": "running",
    "waveform_archive": "accessible",
    "green_functions": "loaded"
  },
  "runtime": {
    "uptime_seconds": 86400,
    "total_jobs": 1542,
    "active_jobs": 3
  },
  "timestamp": "2026-07-14T12:45:00.000Z"
}
```

---

## 10. Frontend Integration Patterns

### 10.1 Events Page (Read-Only Catalog)

**Workflow:**
```typescript
// Fetch events with pagination
const fetchEvents = async (page: number, filters?: EventFilters) => {
  const response = await fetch(
    `${API_BASE}/automt/v1/events?page=${page}&page_size=20&method_id=${filters?.method_id}`
  );
  return await response.json(); // PaginatedEvents
};

// Get preferred result for selected event
const fetchEventResult = async (eventId: string) => {
  const response = await fetch(`${API_BASE}/automt/v1/events/${eventId}`);
  return await response.json(); // AutoMTResultSchema
};
```

**Use Case**: Display event catalog + preview focal mechanisms

---

### 10.2 Moment Tensor Page (Interactive Analysis)

**Initialization:**
```typescript
const initializeJob = async (event: Event) => {
  const response = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        lat: event.latitude,
        lon: event.longitude,
        mag: event.magnitude,
        depth: event.depth,
        time: event.time,
        waveform_source_type: 'seiscomp',
        auto_gf: true,
        is_deviatoric: true,
        data_is_corrected: false,
        target_method: 'QCMT_R',
        centroid_inversion: false
      })
    }
  );
  const { job_id, task_id, poll_url } = await response.json();
  
  // Poll task until complete
  await pollTaskUntilComplete(task_id);
  
  return job_id;
};
```

**Run Stage:**
```typescript
const runStage = async (jobId: string, stage: Stage) => {
  const endpoints = {
    station_prep: `/jobs/${jobId}/station-prep`,
    waveform_prep: `/jobs/${jobId}/waveform-prep`,
    station_selection: `/jobs/${jobId}/station-selection`,
    inversion: `/jobs/${jobId}/inversion`,
    finalize: `/jobs/${jobId}/finalize`
  };
  
  const response = await fetch(
    `${API_BASE}/automt/v1/interactive-processor${endpoints[stage]}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  );
  
  const { task_id } = await response.json();
  return await pollTaskUntilComplete(task_id);
};
```

**Fetch Waveforms:**
```typescript
const fetchWaveforms = async (jobId: string, stationId?: string) => {
  const params = new URLSearchParams({
    kind: 'cholesky',
    include_time: 'true',
    ...(stationId && { station_id: stationId })
  });
  
  const response = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${jobId}/waveforms?${params}`
  );
  
  return await response.json(); // GuiWaveformDataResponse
};
```

**Patch Controls:**
```typescript
// Update frequency
const updateFrequency = async (jobId: string, fmin: number, fmax: number) => {
  await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${jobId}/frequency`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmin, fmax })
    }
  );
};

// Toggle station
const toggleStation = async (jobId: string, stationId: string, isSelected: boolean) => {
  await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${jobId}/stations/${stationId}/selection?is_selected=${isSelected}`,
    { method: 'PATCH' }
  );
};

// Apply time shift
const applyTimeShift = async (jobId: string, stationId: string, timeShiftS: number) => {
  await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${jobId}/stations/${stationId}/time-shift`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_shift_s: timeShiftS })
    }
  );
};
```

---

### 10.3 Polling vs SSE Strategy

**Polling (Simple):**
```typescript
const pollTaskUntilComplete = async (taskId: string): Promise<TaskResult> => {
  while (true) {
    const response = await fetch(
      `${API_BASE}/automt/v1/interactive-processor/tasks/${taskId}`
    );
    const task = await response.json();
    
    if (task.status === 'success') return task;
    if (task.status === 'failed') throw new Error(task.message);
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s
  }
};
```

**SSE (Real-time):**
```typescript
const streamTaskLogs = (taskId: string, onLog: (log: string) => void) => {
  const eventSource = new EventSource(
    `${API_BASE}/automt/v1/interactive-processor/tasks/${taskId}/streamlogs`
  );
  
  eventSource.addEventListener('log', (e) => {
    const { message } = JSON.parse(e.data);
    onLog(message);
  });
  
  eventSource.addEventListener('complete', (e) => {
    const { status } = JSON.parse(e.data);
    eventSource.close();
    if (status === 'success') {
      console.log('Task completed successfully');
    }
  });
  
  return eventSource;
};
```

---

### 10.4 State Management Pattern

```typescript
// Zustand store for interactive job
interface InteractiveJobStore {
  jobId: string | null;
  currentStage: Stage;
  context: ProcessingContext | null;
  waveforms: WaveformData | null;
  solutions: CentroidSolution[];
  
  // Actions
  initJob: (event: Event) => Promise<void>;
  runStage: (stage: Stage) => Promise<void>;
  fetchContext: () => Promise<void>;
  fetchWaveforms: (stationId?: string) => Promise<void>;
  fetchSolutions: () => Promise<void>;
  
  // Patch actions
  updateFrequency: (fmin: number, fmax: number) => Promise<void>;
  toggleStation: (stationId: string, isSelected: boolean) => Promise<void>;
  applyTimeShift: (stationId: string, timeShiftS: number) => Promise<void>;
}

const useInteractiveJobStore = create<InteractiveJobStore>((set, get) => ({
  jobId: null,
  currentStage: 'CREATED',
  context: null,
  waveforms: null,
  solutions: [],
  
  initJob: async (event) => {
    const jobId = await initializeJob(event);
    set({ jobId, currentStage: 'CREATED' });
    await get().fetchContext();
  },
  
  runStage: async (stage) => {
    const { jobId } = get();
    if (!jobId) throw new Error('No active job');
    
    await runStage(jobId, stage);
    set({ currentStage: stage });
    await get().fetchContext();
  },
  
  // ... other actions
}));
```

---

## 11. Error Handling

### 11.1 HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Success | Process response |
| `202` | Accepted (async) | Poll `task_id` or listen to SSE |
| `404` | Not Found | Resource doesn't exist (job, event, task) |
| `422` | Validation Error | Check request body schema |
| `500` | Internal Server Error | Retry or contact admin |

### 11.2 Validation Error Schema

```json
{
  "detail": [
    {
      "loc": ["body", "fmin"],
      "msg": "value is not a valid float",
      "type": "type_error.float",
      "input": "abc"
    }
  ]
}
```

---

## 12. Best Practices

### 12.1 Job Resumption

- Always check if job exists before creating new one
- Use same `event_id` → API returns existing `job_id`
- Useful for page refresh / reconnect scenarios

### 12.2 Stage Invalidation

- Patching frequency → invalidates stages ≥ WAVEFORM_PREP
- Patching stations → invalidates INVERTED stage
- Use `dry_run=true` to preview effects without committing

### 12.3 Dry Run Mode

```http
PATCH /jobs/{job_id}/frequency?dry_run=true
```

**Purpose**: Validate request, compute invalidation, but don't persist changes

### 12.4 Callback URLs

```http
POST /jobs/{job_id}/inversion?callback_url=https://example.com/webhook
```

**Purpose**: Webhook notification when async task completes

---

## 13. TypeScript Schema Definitions

```typescript
// Core event schema
interface EventSummary {
  event_id: string;
  origin_time: string;
  latitude: number;
  longitude: number;
  depth_km: number;
  magnitude?: number;
  magnitude_type?: string;
  phases?: number;
  rms?: number;
  evaluation_status?: string;
  focal_mechanism_count?: number;
  focal_mechanism_quality?: string;
  agency_id?: string;
  region?: string;
}

// AutoMT result
interface AutoMTResult {
  result_id: string;
  centroid: CentroidOrigin;
  magnitude: Magnitude;
  focal_mechanism: FocalMechanism;
  moment_tensor: MomentTensor;
  station_contributions: StationContribution[];
}

// Station contribution
interface StationContribution {
  station_id: string;
  is_active: boolean;
  weight: number;
  components: ComponentContribution[];
}

interface ComponentContribution {
  component: 'Z' | 'R' | 'T';
  is_active: boolean;
  weight: number;
  snr: number;
  time_shift: number;
}

// Interactive job
interface InteractiveJobResponse {
  job_id: string;
  event_id: string;
  fingerprint: string;
  is_new: boolean;
  current_stage: Stage;
  pending_stages: Stage[];
  stage_completed_at?: string;
  duration_s?: number;
  job_dir: string;
}

type Stage = 
  | 'CREATED'
  | 'STATION_PREP_DONE'
  | 'WAVEFORM_PREP_DONE'
  | 'STATION_SELECTION_DONE'
  | 'INVERTED'
  | 'FINALIZED';

// Async task
interface AsyncStepResponse {
  job_id: string;
  task_id: string;
  stage: string;
  status: TaskStatus;
  poll_url: string;
  stream_url: string;
  result_stream_url?: string;
}

type TaskStatus = 
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled';

// Waveform data
interface GuiWaveformDataResponse {
  job_id: string;
  kind: 'normal' | 'cholesky' | 'plot_obs' | 'plot_syn' | 'plot_obs_c' | 'plot_syn_c';
  station_id?: string;
  include_time: boolean;
  count: number;
  data: {
    [stationId: string]: {
      plot_t?: number[];
      plot_obs?: { Z: number[], R: number[], T: number[] };
      plot_syn?: { Z: number[], R: number[], T: number[] };
      plot_obs_c?: { Z: number[], R: number[], T: number[] };
      plot_syn_c?: { Z: number[], R: number[], T: number[] };
    };
  };
}

// Solutions (depth search)
interface CentroidSolution {
  stage: string;
  depth_km: number;
  variance_reduction: number;
  dc_perc: number;
  clvd_perc: number;
  iso_perc: number;
  quality: number;
  stations_used: number;
}

// Station info
interface StationInfo {
  station_id: string;
  network: string;
  code: string;
  location_code: string;
  band_code: string;
  weights: { Z: number, R: number, T: number };
  geometry: {
    distance_deg: number;
    distance_km: number;
    azimuth_deg: number;
    backazimuth_deg: number;
  };
  has_valid_waveform: boolean;
  status: 'selected' | 'available' | 'invalid';
}
```

---

## 14. Example: Complete Interactive Workflow

```typescript
async function completeInteractiveWorkflow(event: Event) {
  // Step 1: Initialize job
  console.log('Initializing job...');
  const initResponse = await fetch(`${API_BASE}/automt/v1/interactive-processor/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: event.id,
      lat: event.latitude,
      lon: event.longitude,
      mag: event.magnitude,
      depth: event.depth,
      time: event.time,
      waveform_source_type: 'seiscomp',
      auto_gf: true,
      is_deviatoric: true,
      target_method: 'QCMT_R'
    })
  });
  const { job_id, task_id } = await initResponse.json();
  await pollTaskUntilComplete(task_id);
  
  // Step 2: Station prep
  console.log('Preparing stations...');
  const stationPrepResponse = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${job_id}/station-prep`,
    { method: 'POST' }
  );
  await pollTaskUntilComplete((await stationPrepResponse.json()).task_id);
  
  // Step 3: Waveform prep
  console.log('Preparing waveforms...');
  const waveformPrepResponse = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${job_id}/waveform-prep`,
    { method: 'POST' }
  );
  await pollTaskUntilComplete((await waveformPrepResponse.json()).task_id);
  
  // Step 4: Station selection
  console.log('Selecting stations...');
  const selectionResponse = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${job_id}/station-selection`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        use_all_stations: false,
        num_sector: 12,
        num_station_per_sector: 2
      })
    }
  );
  await pollTaskUntilComplete((await selectionResponse.json()).task_id);
  
  // Step 5: Initial inversion (single point)
  console.log('Running initial inversion...');
  const initialInversionResponse = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${job_id}/inversion`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_automatic: false,
        est_uncertainty: false,
        centroid_inv: false
      })
    }
  );
  await pollTaskUntilComplete((await initialInversionResponse.json()).task_id);
  
  // Step 6: Depth search
  console.log('Running depth search...');
  const depthSearchResponse = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${job_id}/inversion`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_automatic: false,
        est_uncertainty: true,
        Dep_ranges_km: [[-20, 20, 5], [-6, 6, 1]],
        centroid_inv: false
      })
    }
  );
  await pollTaskUntilComplete((await depthSearchResponse.json()).task_id);
  
  // Step 7: Fetch solutions
  console.log('Fetching solutions...');
  const solutionsResponse = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${job_id}/solutions`
  );
  const solutions = await solutionsResponse.json();
  console.log('Best solution:', solutions.solutions.find(s => s.stage === 'final_stage'));
  
  // Step 8: Fetch waveforms
  console.log('Fetching waveforms...');
  const waveformsResponse = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${job_id}/waveforms?kind=cholesky&include_time=true`
  );
  const waveforms = await waveformsResponse.json();
  console.log(`Loaded waveforms for ${waveforms.count} stations`);
  
  // Step 9: Finalize
  console.log('Finalizing job...');
  const finalizeResponse = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${job_id}/finalize`,
    { method: 'POST' }
  );
  await pollTaskUntilComplete((await finalizeResponse.json()).task_id);
  
  // Step 10: Get results
  console.log('Fetching final results...');
  const resultsResponse = await fetch(
    `${API_BASE}/automt/v1/interactive-processor/jobs/${job_id}/results`
  );
  const results = await resultsResponse.json();
  console.log('Final solution:', results.final_solution);
  console.log('Available plots:', results.plots);
  
  return { job_id, solutions, waveforms, results };
}
```

---

## 15. Changelog & Version History

### v2.5.0 (Current)
- Added `centroid_inversion` parameter to job init
- Enhanced patch history tracking
- Improved SSE progress streaming for CPU inversion
- Added `dry_run` mode for all PATCH endpoints

### v2.4.0
- Interactive-Processor module stabilized
- Added STF optimization endpoint
- Green's functions management endpoints

### v2.3.0
- Auto-Processor configuration API
- Job cancellation support

---

**Dokumen ini adalah referensi lengkap untuk integrasi frontend Garuda SCMTV ke AutoMT API backend BMKG.**

*Last updated: 2026-07-14*  
*API Base URL: http://10.20.229.39:8111*
