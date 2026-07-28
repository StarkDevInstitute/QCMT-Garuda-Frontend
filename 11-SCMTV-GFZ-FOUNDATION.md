# SCMTV GFZ Potsdam — Foundation & Implementation Guide

**Referensi**: https://docs.gempa.de/mt/current/apps/scmtv.html

Dokumen ini menjelaskan dasar-dasar SCMTV dari GFZ Potsdam yang menjadi fondasi implementasi **Garuda SCMTV BMKG**. Setiap komponen, fitur, dan workflow di aplikasi web/desktop kami dirancang untuk mereplikasi dan meningkatkan tool desktop SCMTV original.

---

## 1. Ringkasan Umum SCMTV

### Definisi
**SCMTV** adalah *interactive tool* untuk:
- Generate moment tensor solutions
- Revise/review moment tensor dari katalog
- Menginvert deviatoric (5-component) atau full (6-component) moment tensors
- Menentukan centroid depth dengan optimization

### Metodologi Inversion
- Basis publikasi: Minson & Dreger (seismic waveform inversion)
- Engine otomatis: **scautomt** (automatic moment tensor)
- Tool interaktif: **scmtv** (manual refinement + parameter tuning)

### Target Users
- Seismic analysts (BMKG, research institutes)
- Shift operators (24/7 monitoring)
- Researchers yang perlu kontrol penuh atas parameters

---

## 2. Arsitektur GUI SCMTV

### 2.1 Dua Perspektif Utama

#### **Perspektif 1: Main View (Moment Tensor Tab)**
```
┌─────────────────────────────────────────┐
│  Main View - Moment Tensor Analysis     │
├────────────────┬────────────────────────┤
│                │                        │
│  Map + Beach   │  Information Matrix    │
│  Ball (MT)     │  - Tensor components   │
│  + Epicenter   │  - Magnitudes          │
│                │  - Focal mechanism     │
├────────────────┴────────────────────────┤
│  Component List (Station contributions) │
├────────────────────────────────────────┤
│  [Waveforms] [Commit] [Bulletin] [...]  │
└────────────────────────────────────────┘
```

**Actions:**
1. Load event dari Events tab → lihat parameters
2. Press "Waveforms" → buka Waveform Editor untuk edit
3. Press "Commit" → send results ke SeisComP messaging (persist)
4. Press "Bulletin" → generate reports via custom scripts

**F-Keys:**
- `F1`: Open SeisComP documentation
- `F2`: Adjust messaging & DB connection
- `F3`: Runtime settings (data source, distance, time windows)
- `F8`: Toggle event summary view
- `F10`: Show Events tab
- `Shift+F1`: Open scmtv documentation

---

#### **Perspektif 2: Waveform Editor (Interactive Analysis)**
```
┌──────────────────────────────────────────────────┐
│         Waveform Editor - Phase Analysis        │
├─────────┬────────────────┬──────────┬────────────┤
│ Beach   │  Observed &    │ Synthetic│ Depth      │
│ Ball    │  Synthetic     │ waveforms│ Search &   │
│ (color) │  Comparison    │ (centered│ Control    │
│ + MT    │  per station   │ overlay) │ Parameters │
│ Matrix  │  per component │          │            │
│ + Nodal │  (Z/R/T)       │          │            │
│ Planes  │  with metrics  │          │            │
├─────────┴────────────────┴──────────┴────────────┤
│  Station Values:                                │
│  [Use] [Net] [Sta] [Loc.Cha] [Dist] [Az] [Weight] [Fit] [Ms(BB)]  │
│                                                │
│  Trace Values per component:                  │
│  [Timespan] [SNR] [Fit%] [TimeShift] [Weight] │
└──────────────────────────────────────────────────┘
```

**Layout Details:**

| Section | Content |
|---------|---------|
| **Left** | Beach ball (color=fit: red=bad, green=good), MT matrix, Greens func selection, nodal planes, derived values |
| **Center** | Observed filtered waveforms (black) vs Synthetic (red) per station/component. Time windows color-coded by phase |
| **Right** | Wave type snippets with per-trace metrics |
| **Top Controls** | Profile selection, magnitude-dependent filter, phase settings editor |
| **Right Panel** | Depth search control, inversion parameters, component management |

---

### 2.2 Komponen Visualisasi

#### **Beach Ball Visualization**
- **Color representation**: Fit quality
  - 🟢 Green = Good fit (>80%)
  - 🟡 Yellow = Medium fit (40-80%)
  - 🔴 Red = Poor fit (<40%)
- **Double couple (DC)** vs **Full moment tensor** selectable
- **Focal mechanism**: Nodal planes, P-axis, T-axis
- **Small squares** next to beach ball: Azimuth distribution with per-station color coding

#### **Waveform Traces**
- **Observed** (black line): Actual seismic data (filtered)
- **Synthetic** (red line): Green's function matched to data
- **Components**: Z (vertical), R (radial), T (tangential)
- **Time windows**: Color-coded by wave type:
  - 🟠 Orange: Body waves (P, S)
  - 🟢 Green: Surface waves (Rayleigh, Love)
  - 🔵 Blue: Mantle waves
  - 🟣 Purple: W-phase

#### **Azimuth Station Grid**
- Circular grid menunjukkan station distribution
- Per-station fit color (green=good, red=bad)
- Interactive selection untuk edit per station

---

## 3. Waveform Metrics & Parameters

### 3.1 Trace Metrics (Per Component/Phase)

| Metric | Unit | Definition |
|--------|------|-----------|
| **Timespan** | seconds | Length of waveform signal used for inversion (defined by `signalBegin`/`signalEnd`) |
| **SNR** | dB/ratio | Signal-to-noise ratio (noise window vs signal window) |
| **Fit** | % | Misfit percentage between observed & synthetic (lower=better fit) |
| **Time shift** | seconds | Per-trace time correction after correlation with Green's function |
| **Weight** | dimensionless | Trace importance weight = min(global_weight, noise_RMS_weight) |

**Display Behavior:**
- Hover over metric → tooltip dengan explanation
- Visual badges dengan color coding untuk fit

---

### 3.2 Station Metrics (Per Station/Network)

| Parameter | Definition |
|-----------|-----------|
| **Use** | ✓ (used) / ✗ (excluded) from inversion |
| **Net** | Network code (e.g., GR, IU) |
| **Sta** | Station code (e.g., BFO, KBS) |
| **Loc.Cha** | Location code & channel group (e.g., 00.BH) |
| **Dist** | Epicentral distance in degree or km |
| **Az** | Azimuth dari source (0-360°) |
| **Weight** | Station-level weight untuk inversion |
| **Fit** | Weighted average fit dari trace snippets di station ini |
| **Ms(BB)** | Surface wave magnitude (mb, mb(BB)) |

---

### 3.3 Derived Values (Post-Inversion)

| Parameter | Definition |
|-----------|-----------|
| **Scalar moment (M₀)** | Tensor norm `sqrt(sum(Mij²)/2)` |
| **Mw** | Moment magnitude `2/3 × (log10(M₀) - 10.7)` |
| **Stations used** | Count stations dengan ≥1 trace snippet |
| **Azimuthal gap** | Largest azimuth gap between neighboring stations |
| **DC %** | Double-couple percentage dari MT decomposition |
| **CLVD %** | Compensated-Linear-Vector-Dipole percentage |
| **ISO %** | Isotropic component (full tensor inversion only) |
| **Condition number** | Inversion matrix stability (lower=better) |
| **Solution quality** | Product(Fit × relative_station_count) |

---

## 4. Depth Search Strategy

### 4.1 Centroid Depth Search (1D)

**Konsep**: Find optimal depth untuk moment tensor inversion

**Workflow:**
1. Set depth range: `minDepth` ↔ `maxDepth`
2. Define grid: `depthSearchGrid` (initial intervals)
3. Refinement: `depthFineSearchIncrements` (nested refinement)
4. For each depth: Invert MT, compute Fit & Quality
5. Best solution: Max Quality = Max(Fit × relative_station_count)

**Default Grid** (km):
```
0-100 km   : 20 km spacing
100-200 km : 30 km spacing
200-400 km : 50 km spacing
>400 km    : 100 km spacing (extrapolate to max GF depth)
```

**Refinement Steps** (km):
```
1st pass:   50 km (coarse)
2nd pass:   10 km (medium)
3rd pass:    5 km (fine)
4th pass:    1 km (very fine)
```

**Output Table (Data Tab):**
| Column | Value |
|--------|-------|
| Depth | Tested depth (km) |
| Mw | Moment magnitude |
| Fit | Waveform misfit (%) |
| DC | Double-couple % |
| CLVD | CLVD % |
| ISO | Isotropic % (if 6-comp) |
| Quality | Fit × relative_station_count |
| Stations | Number of stations at this depth |

**Plot Tab:** X-axis=Depth, Y-axis=selectable metrics (Mw, Fit, DC, etc.)

---

### 4.2 Centroid Search in 3D

**Konsep**: Find optimal location (latitude, longitude, depth) + MT

**Workflow:**
1. Define 3D search grid starting point (coarse grid)
2. Evaluate Quality at each grid cell
3. Refine grid around best-quality cell
4. Repeat with finer cell size until convergence

**Visualization:**
- Top-down view dengan grid cells color-coded by relative fit
- Depth slider: Navigate through z-levels
- Transparency: View overlapping depths
- Black rectangle: Best quality cell di current refinement step

**Use Case**: When hypocenter location ambiguous atau uncertain

---

## 5. Parameter Profiles & Wave Types

### 5.1 Magnitude-Dependent Profiles

**Konsep**: Different inversion parameters untuk different magnitude ranges

**Example Configuration:**
```
Profile "small" (Magnitude 3.5-4.5):
- Filter: 20-50 second periods
- Max distance: 30°
- Min SNR: body=3, surface=2

Profile "medium" (Magnitude 4.5-5.5):
- Filter: 15-40 second periods
- Max distance: 60°
- Min SNR: body=2.5, surface=1.5

Profile "large" (Magnitude 5.5-INF):
- Filter: 10-30 second periods
- Max distance: 90°
- Min SNR: body=2, surface=1
```

**Selection Logic**: Auto-selected berdasarkan preliminary magnitude, manual override possible

---

### 5.2 Wave Type Classification

| Wave Type | Components | Typical Periods | Distance Range | Color |
|-----------|-----------|-----------------|-----------------|-------|
| **P (body)** | Z, R, T | 5-20 s | 0-90° | 🟠 Orange |
| **S (body)** | R, T | 5-20 s | 0-90° | 🟠 Orange |
| **Rayleigh (surface)** | Z, R | 20-60 s | 10-150° | 🟢 Green |
| **Love (surface)** | T | 20-60 s | 10-150° | 🟢 Green |
| **RM (mantle Rayleigh)** | Z, R | 30-100 s | >60° | 🔵 Blue |
| **LM (mantle Love)** | T | 30-100 s | >60° | 🔵 Blue |
| **W-phase** | Z, R | 0.5-2 s | Global | 🟣 Purple |

**Per-Wave-Type Controls:**
- **Period range**: Band-pass filter (signalBegin-signalEnd)
- **Max time shift**: Allowable lag correction per phase
- **Component weights**: wZ (vertical), wR (radial), wT (tangential)
- **Min SNR**: Minimum signal-to-noise threshold
- **Normalization**: Auto-weight based on noise RMS

---

### 5.3 Component Weighting Strategy

**Goal**: Emphasize high-quality traces, de-emphasize noisy/poorly-fitting ones

**Default Weights:**
| Component | Weight | Reasoning |
|-----------|--------|-----------|
| **Z (Vertical)** | 1.0 | Most stable, least affected by azimuth |
| **R (Radial)** | 0.25 | Azimuth-dependent, less constraining |
| **T (Tangential)** | 0.5 | Intermediate sensitivity |

**Normalization:**
```
final_weight = base_weight / sqrt(noise_RMS × 1000)
```
→ Traces dengan tinggi SNR mendapat weight lebih tinggi

**Adaptive Weighting Options:**
- `automt.IWT = "rms**2"` (default): Overweight dapat terjadi di close stations
- `automt.IWT = "rms"`: Less sensitive to large amplitudes

---

## 6. Inversion Control & Options

### 6.1 Deviatoric vs Full Moment Tensor

#### **Deviatoric (5-component)**
- 5 independent components: Mxx, Mxy, Mxz, Myy, Myz (Mzz=-(Mxx+Myy))
- Requires: 8 Green's function components
- Properties: No net force, no net moment
- **Default**: Faster, better-constrained

#### **Full (6-component)**
- All 6 components: Mxx, Mxy, Mxz, Myy, Myz, Mzz
- Requires: 10 Green's function components
- Allows: Isotropic component (explosion/implosion)
- **Trade-off**: More parameters, less stable

**Selection**: Options menu di Waveform Editor atau config `automt.invertFor6Components`

---

### 6.2 MT Decomposition Methods

#### **Method 1: Silver & Jordan (1982)** [Default]
```
MT = DC + CLVD + ISO
where:
DC   = Double-couple (shear rupture)
CLVD = Compensated-Linear-Vector-Dipole (compensated mechanism)
ISO  = Isotropic component (volume change)
```
Percentages: P = 100%, Q = CLVD%, R = DC%

#### **Method 2: Knopoff & Randall (1970)** (MTDecomp100)
```
100% = |ISO| + |DC| + |CLVD|
```
Alternative interpretation, stricter normalization

**Selection**: Config `automt.MTDecomp100` atau interactive toggle

---

### 6.3 Auto-Inversion & Manual Fitting

#### **Auto-Fit** (Keyboard `B`)
```
For each selected trace:
  1. Compute cross-correlation vs synthetic
  2. Find lag maksimum correlation
  3. Apply time shift
  4. Re-invert MT
  5. Update fit metrics
```

#### **Manual Fitting** (Mouse Drag)
```
User dapat click & drag synthetic waveform:
  - Horizontal drag → adjust time shift
  - Re-compute fit after each adjustment
  - Real-time MT update (if autoInvert=true)
```

#### **Best Solution** (Keyboard `S`)
```
Full minimization pada current dataset:
  1. Try all combinations of:
     - Component inclusion/exclusion
     - Time shifts (±maxShift)
     - Weights
  2. Find global minimum misfit
  3. Return best MT
```

---

### 6.4 Component Management

**Disable/Enable Components:**
- Manual: Double-click station/trace → toggle
- Automatic: Press `B` (auto-fit) → includes best components
- Threshold: `minItemFit` parameter (default 30%) → exclude traces dibawah threshold

**Rationale**: Noisy atau poorly-fitting traces dapat membuat inversion less stable

---

## 7. Solution Validation & Statistics

### 7.1 Monte-Carlo Uncertainty Analysis

**Konsep**: Perturb station subset secara random → invert multiple times → assess solution stability

**Procedure:**
1. Sample subsets dari stations: n ∈ [4, max_stations]
2. For each subset: Invert MT independently
3. Plot hasil: P-axis & T-axis dari semua subsets
4. Metric: Clustering tightness → solution quality indicator

**Interpretation:**
- 🟢 Tight cluster → Stable, high-confidence solution
- 🟡 Moderate spread → Reasonable solution, some uncertainty
- 🔴 Loose scatter → Unstable, low confidence

---

### 7.2 Single-Station Inversions

**Procedure:**
1. For each station: Invert MT using traces dari station ini saja
2. Compute P-axis, T-axis, moment tensor
3. Plot all single-station solutions

**Use**: Identify stations providing inconsistent constraints (outliers)

---

## 8. Waveform Data & Green's Functions

### 8.1 Waveform Processing

**Sampling & Windowing:**
- Default sampling: 1 Hz (recommend resampling untuk faster processing)
- Record streams: File (miniSEED), SeedLink, FDSN web service
- Data restitution: Response removal (convert to displacement/velocity)

**Time Windows** (distance-dependent):
```
Default table (distance:window_length_seconds):
0 km     : 80 s
1.8 km   : 100 s
18.4 km  : 832.5 s
36.4 km  : 1617 s
54.49 km : 2392.5 s
72.4 km  : 3164 s
90.4 km  : 3953 s
108.4 km : 4720 s
126.4 km : 5506.5 s
144.4 km : 6234.5 s
162.4 km : 7011 s
184.5 km : 8000 s
```
Linear interpolation between points

**Noise Margin:**
- `leftNoiseLength = 600 s`: Data sebelum signal (stabilize deconvolution)
- `rightNoiseLength = 0 s`: Data setelah signal
- `safetyMargin = 120 s`: Buffer untuk filter artifacts & travel-time uncertainties

---

### 8.2 Green's Functions

**Pre-computation Required:**
- 1D velocity model (atau 3D)
- Depth sampling: Typical 1 km increment
- Epicentral distance sampling: Typical 0.5° increment
- Components:
  - **8-component**: `Mxx, Mxy, Mxz, Myy, Myz` + isotropic
  - **10-component**: Full 6-component + isotropic variants

**Formats:**
- `sc3gf1d://`: SeisComP 3 format (recommended)
- `helmberger://`: Alternative format

**URL Configuration:**
```
gfaUrls = sc3gf1d:///home/data/greensfunctions
```

---

## 9. Custom Scripts & Reporting

### 9.1 Extended Logging

**Enable:**
```
mtv.extendedLog.enable = true
mtv.extendedLog.path = @LOGDIR@/MT/ext
mtv.extendedLog.script = /path/to/script.py
```

**Output per solution:**
- Subdirectory: Named after focal mechanism publicID
- Contents:
  - Observed waveforms (miniSEED)
  - Synthetic waveforms (miniSEED)
  - Depth search results (HDF5/text)
  - Event XML (QuakeML)
  - Inversion logs

---

### 9.2 Default Report Script

**Python Script**: `mtv-plot-extended-log.py`
- Input: Extended log directory
- Generates: PNG images (waveforms, beach balls, depth plot)
- Generates: LaTeX file (from template)
- Compiles: LaTeX → PDF report

**LaTeX Template**: `mtv-plot-extended-log.tex`
- Customizable untuk branding BMKG
- Include: Header, focal mechanism, waveform plots, statistics

**Trigger**: Press "Bulletin" button di Main View → script runs

---

### 9.3 Custom Script Integration

**Script Arguments:**
```python
python script.py <extendedLogDir> <originID> <eventID>
```

**Example Uses:**
- Generate EMSC-format bulletin
- Send automatic email alerts
- Upload ke central database
- Create HTML report untuk archival

---

## 10. Interactive Workflow & Hotkeys

### 10.1 Main View Hotkeys

| Hotkey | Action |
|--------|--------|
| `F1` | Open SeisComP documentation |
| `F2` | Open messaging/DB connection dialog |
| `F3` | Open runtime settings (data source, distance, time windows) |
| `F8` | Toggle event summary panel |
| `F10` | Switch to Events tab |
| `Shift+F1` | Open scmtv documentation |

---

### 10.2 Waveform Editor Hotkeys

| Hotkey | Action |
|--------|--------|
| `ESC` | Deselect all stations/traces |
| `A` | Activate selected phases (mark as use=✓) |
| `X` | Deactivate selected phases (mark as use=✗) |
| `Del` | Delete selected stations from dataset (permanent) |
| `B` | Best local fit untuk selected phases (auto-fit) |
| `C` | Cross-correlate untuk selected phases |
| `F` | Toggle filtered/raw waveform display |
| `P` | Align traces by pick time (onset alignment) |
| `R` | Reset time correction (zcorr) untuk selected phases |
| `S` | Find best solution untuk current dataset (global minimize) |
| `Ctrl+A` | Select all stations |
| `Ctrl+D` | Switch to displacement representation |
| `Ctrl+I` | Invert phase selection (toggle all selected) |
| `Ctrl+Q` | Close waveform editor window |
| `Ctrl+←` | Increase time scale (zoom out) |
| `Ctrl+→` | Decrease time scale (zoom in) |
| `Ctrl+↑` | Increase row height (trace height) |
| `Ctrl+↓` | Decrease row height |
| `Ctrl+Shift+D` | Toggle depth search control window |
| `Ctrl+Shift+T` | Toggle inversion control window |
| `Ctrl+Shift+S` | Toggle centroid search (3D) control window |
| `Ctrl+Shift+W` | Toggle wave snippets control window |

---

### 10.3 Mouse Interactions

| Action | Effect |
|--------|--------|
| **Hover over metric** | Tooltip dengan explanation |
| **Drag synthetic waveform** | Manual time shift adjustment |
| **Double-click trace/station** | Toggle include/exclude dari inversion |
| **Right-click on trace** | Context menu: Export miniSEED, delete, etc. |
| **Click station grid cell** | Select/deselect station |
| **Click beach ball** | View focal mechanism detail |

---

## 11. Runtime Configuration (F3 Dialog)

**Adjustable Settings:**
- Data source (record stream URL, offline file)
- Maximum station distance (epicentral degrees)
- Time window pre/post signal
- Extended logging enable/path
- Verbosity level

**Default Sources (Priority):**
1. SeisComP Server (MySQL/MariaDB local)
2. SeedLink stream (real-time)
3. FDSN web services (IRIS, BMKG)
4. Local files (QuakeML, miniSEED)

---

## 12. SeisComP Integration Points

### 12.1 Messaging System

**Purpose**: Communicate results dengan other SeisComP modules

**Operations:**
- **Load event**: Subscribe ke PICK, MAGNITUDE messages
- **Commit result**: Publish FOCAL_MECHANISM, MOMENT_TENSOR messages
- **Real-time updates**: Monitor incoming events, auto-load if configured

**F2 Dialog**: Configure messaging connection (host, port, user, password)

---

### 12.2 Database Access

**Purpose**: Persist solutions, retrieve event history

**Operations:**
- **Read**: Event catalog, picks, magnitudes, previous MT solutions
- **Write**: New focal mechanisms, moment tensors
- **Query**: Event statistics, solution history per station

**Configuration**: `--database` command-line option atau `~/.seiscomp/global.cfg`

---

## 13. Implementation Checklist for Garuda SCMTV BMKG

### Core Features (Phase 1 - Web)
- [ ] Main View dengan interactive map + beach ball visualization
- [ ] Waveform Editor dengan observed/synthetic comparison
- [ ] Station/trace metrics display dengan tooltips
- [ ] Depth search (1D table + optional plot)
- [ ] Magnitude-dependent profile selector
- [ ] Wave type filtering (P/S/Rayleigh/Love/W-phase)
- [ ] Component weighting controls (wZ, wR, wT)
- [ ] Manual trace fitting (mouse drag time shift)
- [ ] Auto-fit button (keyboard `B`)
- [ ] Best solution finder (keyboard `S`)
- [ ] Station selection/deselection
- [ ] Export results (Commit to backend)

### Advanced Features (Phase 1 - Optional)
- [ ] 3D centroid search visualization
- [ ] Monte-Carlo uncertainty analysis
- [ ] Single-station inversion plots
- [ ] Extended logging (save waveforms/results)
- [ ] Custom script trigger (Bulletin button)

### Phase 2 Features (Electron Desktop)
- [ ] Real-time SeedLink streaming
- [ ] SeisComP messaging integration
- [ ] Database persistence layer
- [ ] Offline mode dengan local file access
- [ ] Advanced depth search + 3D visualization

---

## 14. UI/UX Design Patterns

### 14.1 Compact Header Strategy
- Minimize header → Maximize content area (critical for analysis)
- Breadcrumb: `Events > 2026-07-14 23:45:32 > Waveforms`
- Toolbar buttons: Only essential (Commit, Waveforms, Bulletin)

### 14.2 Color Coding System
- **Fit quality**: 🟢 Green (good) → 🟡 Yellow (medium) → 🔴 Red (poor)
- **Wave types**: 🟠 Orange (body) → 🟢 Green (surface) → 🔵 Blue (mantle) → 🟣 Purple (W-phase)
- **Station distance**: 🟠 Orange (local <3°) → 🟢 Green (regional 3-10°) → 🔵 Blue (teleseismic >10°)
- **Phase type**: 🟠 Orange (P), 🟦 Cyan (S), 🟢 Green (Rayleigh), 🟩 Lime (Love)

### 14.3 Information Hierarchy
1. **Main focus**: Beach ball + waveform comparison (visual primary)
2. **Secondary**: Station/trace metrics (numeric secondary)
3. **Tertiary**: Parameter controls (hidden in collapsible panels)
4. **Tooltip hover**: Full metric explanation on demand

### 14.4 Responsive Breakpoints
- **Desktop (>1400px)**: 3-column layout (beach ball | waveforms | depth search)
- **Tablet (800-1400px)**: 2-column layout (beach ball/waveforms | controls)
- **Mobile (monitor preview only)**: Single column (scroll layout)

---

## 15. Performance Optimization Considerations

### Waveform Rendering
- **< 10,000 samples**: Render as SVG (sharp, memory-efficient)
- **≥ 10,000 samples**: Use Canvas API via D3 (hardware acceleration)
- **Optimize**: Use WebWorker untuk preprocessing (FFT, decimation)

### State Management
- **UI state**: Zustand (selected event, panel state, profile)
- **Server data**: TanStack Query (waveforms, depth search results)
- **Caching**: Depth search results dalam-memory (1 session only)

### Data Transfer
- MiniSEED compression (if large datasets)
- Request batching (depth search across multiple depths)
- Progressive waveform loading (first 5 stations, then rest)

---

## 16. Data Types & Schema (QuakeML/SeisComP)

### Core Types (from `src/types/seismology.ts`)
```typescript
interface SeismicEvent {
  publicID: string;
  description?: string;
  origins: Origin[];
  magnitudes: Magnitude[];
  picks: Pick[];
  focalMechanisms: FocalMechanism[];
  stationMagnitudes?: StationMagnitude[];
}

interface Origin {
  publicID: string;
  time: string; // ISO 8601
  latitude: number;
  longitude: number;
  depth: number; // km
  depthType?: string;
  quality?: OriginQuality;
}

interface FocalMechanism {
  publicID: string;
  originID: string;
  momentTensor?: MomentTensor;
  nodalPlanes?: NodalPlanes;
  principalAxes?: PrincipalAxes;
}

interface MomentTensor {
  publicID: string;
  scalar_moment: number;
  tensor: Tensor;
  method_id?: string;
  inversion_type?: 'deviatoric' | 'full';
  decomposition?: {
    dc_percent: number;
    clvd_percent: number;
    iso_percent?: number;
  };
}

interface Tensor {
  Mxx: number;
  Mxy: number;
  Mxz: number;
  Myy: number;
  Myz: number;
  Mzz: number;
}

interface StationContribution {
  station_code: string;
  network_code: string;
  distance_deg: number;
  azimuth_deg: number;
  phases: PhaseData[];
  station_magnitude?: number;
  weight?: number;
  fit_percent?: number;
}

interface PhaseData {
  phase_type: 'P' | 'S' | 'Rayleigh' | 'Love' | 'W-phase' | string;
  channel: 'Z' | 'R' | 'T';
  observed_timeshift: number; // seconds
  synthetic_timeshift: number;
  snr: number;
  fit_percent: number;
  weight: number;
  on_set_time?: string;
}
```

---

## 17. Reference Documentation

- **GFZ SCMTV Official**: https://docs.gempa.de/mt/current/apps/scmtv.html
- **Minson & Dreger (2008)**: Seismic waveform inversion algorithm (citation)
- **QuakeML Standard**: https://quake.ethz.ch/quakeml/
- **SeisComP Documentation**: https://www.seiscomp.de/

---

## 18. Glossary

| Term | Definition |
|------|-----------|
| **MT** | Moment Tensor (6-component stress representation) |
| **DC** | Double-couple (shear rupture mechanism) |
| **CLVD** | Compensated-Linear-Vector-Dipole |
| **ISO** | Isotropic component (volume change) |
| **FM** | Focal mechanism (nodal planes, P/T axes) |
| **SNR** | Signal-to-noise ratio |
| **GF** | Green's function (synthetic seismogram library) |
| **Mw** | Moment magnitude |
| **Fit** | Misfit between observed & synthetic (%) |
| **Deviatoric** | 5-component MT (no net force) |
| **Full** | 6-component MT (allows isotropic) |
| **Phase** | Wave type (P, S, Rayleigh, Love, W-phase) |
| **Trace** | Single channel waveform |
| **Snippet** | Windowed trace for inversion |
| **Inversion** | Mathematical fit of MT to waveforms |
| **Centroid** | Best-fit hypocenter depth/location |
| **Azimuthal gap** | Largest azimuth gap between stations |
| **Quality** | Product(Fit × relative_station_count) |

---

**Dokumen ini adalah referensi teknis untuk implementasi Garuda SCMTV BMKG. Update bila ada perubahan metodologi atau fitur baru.**

*Last updated: 2026-07-14*
