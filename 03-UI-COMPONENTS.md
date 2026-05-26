# 03 — Breakdown Komponen UI

> Dokumen ini menguraikan setiap komponen UI berdasarkan analisis screenshot referensi scmtv SeisComP.

---

## Halaman 1: Moment Tensor View (Tab Utama)

### Layout Keseluruhan
```
┌─────────────────────────────────────────────────────────┐
│  Menu Bar: File | Settings | View | Help                │
├─────────────────────────────────────────────────────────┤
│  Tab Bar: [Moment tensor] [Events]                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │   WORLD MAP     │  │   EVENT DETAIL PANEL          │  │
│  │   (Leaflet)     │  │                              │  │
│  │                 │  │  Type: Strike  Dip  Rake     │  │
│  │  Markers gempa  │  │  NP1:  -       -    -        │  │
│  │  Distribusi     │  │  NP2:  -       -    -        │  │
│  │  stasiun        │  │                              │  │
│  │                 │  │  R: -  T: -  P: -            │  │
│  │                 │  │                              │  │
│  └─────────────────┘  │  Time:     -                 │  │
│                       │  Depth:    - km               │  │
│                       │  Lat/Lon:  - / -              │  │
│                       │  Stations: - / -              │  │
│                       │  Az. Gap:  -                  │  │
│                       │  Min.Dist: -                  │  │
│                       │                              │  │
│                       │  Mw: -    Az.Gap: -           │  │
│                       │  Moment: -   Misfit: -        │  │
│                       │  Method: -                   │  │
│                       │                              │  │
│                       │  EventID:  -                 │  │
│                       │  Agency:   GFZ Potsdam        │  │
│                       │  Author:   -                 │  │
│                       └──────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  BULLETIN / LOG PANEL (scrollable)                  ││
│  │  Text output dari proses inversion                  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Footer: [Bulletin] [WaveForms] [Confirm]               │
└─────────────────────────────────────────────────────────┘
```

---

## Komponen A: `<WorldMap />`

**Fungsi**: Peta dunia interaktif menampilkan lokasi gempa dan stasiun

**Props:**
```typescript
interface WorldMapProps {
  events: SeismicEvent[];
  selectedEventId?: string;
  stations?: Station[];
  onEventClick?: (eventId: string) => void;
}
```

**Fitur:**
- World map dengan graticule (grid garis lintang/bujur)
- Marker berbentuk kotak kuning untuk stasiun
- Marker gempa (bisa diganti dengan beach ball kecil)
- Zoom dan pan interaktif
- Highlight event yang dipilih
- Label kota besar sebagai referensi geografis

**Library**: Leaflet.js dengan custom tile layer atau MapLibre GL

---

## Komponen B: `<EventDetailPanel />`

**Fungsi**: Menampilkan detail parameter event dan hasil moment tensor

**Sub-panel:**

### B.1 Nodal Planes Table
```typescript
interface NodalPlane {
  strike: number | null;
  dip: number | null;
  rake: number | null;
}
interface NodalPlanesData {
  np1: NodalPlane;
  np2: NodalPlane;
  principalAxes: {
    R: { strike: number; dip: number; value: number } | null;
    T: { strike: number; dip: number; value: number } | null;
    P: { strike: number; dip: number; value: number } | null;
  };
}
```

### B.2 Origin Parameters
```typescript
interface OriginParams {
  time: Date | null;
  depth: number | null;         // km
  lat: number | null;           // degrees
  lon: number | null;           // degrees
  stations: { used: number; total: number } | null;
  azimuthalGap: number | null;  // degrees
  minDistance: number | null;   // degrees
}
```

### B.3 Tensor Quality Metrics
```typescript
interface TensorMetrics {
  mw: number | null;
  azimuthalGap: number | null;
  moment: number | null;        // Nm
  misfit: number | null;        // 0-1
  method: string | null;
}
```

### B.4 Metadata
```typescript
interface EventMetadata {
  eventId: string;
  evaluation: { status: string; mode: string } | null;
  agency: string;
  author: string;
  updatedAt: Date | null;
}
```

---

## Komponen C: `<BulletinPanel />`

**Fungsi**: Panel log teks output proses inversion, diagnostik, dan bulletin

**Fitur:**
- Scrollable text area
- Syntax highlighting untuk output terstruktur
- Copy-to-clipboard
- Export ke file .txt

---

## Halaman 2: Events List View

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  Menu Bar | Tab: [Moment tensor] [Events]               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  EVENT TABLE (sortable, scrollable)                 ││
│  ├──────┬───┬──┬───────┬────┬────┬─────┬──────┬───────┤│
│  │OT GMT│ M │TP│Phases │Lat │Lon │Depth│Agency│Region ││
│  ├──────┴───┴──┴───────┴────┴────┴─────┴──────┴───────┤│
│  │  Row per event, color-coded by magnitude class      ││
│  │  M+ badge hijau, A badge abu, A+ badge biru dll    ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  FILTER BAR                                         ││
│  │  [Clear] Last days: [4] [Read]   From: [...] To: [.]││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  CHECKBOX FILTERS                                   ││
│  │  ☑ Hide other/fake events  ☐ Show only own events  ││
│  │  ☐ Show only latest/preferred origin per agency    ││
│  │  ☑ Hide events outside: [- custom -] [..] region  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## Komponen D: `<EventTable />`

**Kolom:**
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| OT (GMT) | DateTime | Origin Time dalam UTC |
| M | Float | Magnitude |
| TP | String | Tipe magnitude (M, Mw, Mb, dll) |
| Phases | Int | Jumlah fase yang digunakan |
| Lat | Float | Lintang (°N/S) |
| Lon | Float | Bujur (°E/W) |
| Depth | Float | Kedalaman (km) |
| Stat | Badge | Status: M+, A+, A, dll |
| Agency | String | Lembaga pelapor |
| Region | String | Nama wilayah |
| ID | String | Event ID |

**Status Badge Color Coding:**
```
M+  → Hijau (Manual, Preferred)
M   → Hijau muda (Manual)
A+  → Biru (Automatic, Preferred)
A   → Abu (Automatic)
```

**Fitur:**
- Sort per kolom (click header)
- Row selection → load ke Moment Tensor view
- Double-click → buka di Waveform viewer
- Right-click context menu
- Keyboard navigation (↑↓ arrows)
- Infinite scroll / virtual list untuk performa

---

## Komponen E: `<FilterBar />`

```typescript
interface FilterBarProps {
  lastDays: number;
  dateFrom: Date;
  dateTo: Date;
  onClear: () => void;
  onRead: (params: FilterParams) => void;
  filters: {
    hideOtherFake: boolean;
    showOnlyOwn: boolean;
    showOnlyPreferred: boolean;
    hideOutside: boolean;
    region: string;
  };
}
```

---

## Halaman 3: Waveform & Inversion View

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  Title: MT: Origin#[ID]                                 │
├──────────────┬──────────────────────────────────────────┤
│  LEFT PANEL  │  TOOLBAR: Norm.window | All | M5-M6.5   │
│              │           [icons] Depth search Auto inv. │
│  Beach Ball  ├──────────────────────────────────────────┤
│  3D View     │  WAVEFORM PANEL (per stasiun)            │
│              │  ┌──────────────────────────────────────┐│
│  Tensor      │  │ Net  Sta  Dist  Az  Weight  Fit  Amp ││
│  Matrix      │  │ IU   MAJO 4.1  265.6 1.00  93.3  4.2 ││
│              │  │ [synthetic] [observed] waveform traces││
│  Nodal       │  │ LP  LQ  LR components               ││
│  Planes      │  └──────────────────────────────────────┘│
│              │  [next station...]                       │
│  Derived     ├──────────────────────────────────────────┤
│  Values      │  DEPTH ITERATION PANEL (kanan)           │
│              │  Grid: 200:30, 400:50, 100              │
│  Synthetics  │  Fine search: 50,10,5,1 km              │
│  Settings    │  Min/Max depth: [  ] [  ]               │
│              │  ☐ Keep dataset  ☑ Shift traces         │
│  Apply btn   │  ☐ Optimize result                      │
└──────────────┴──────────────────────────────────────────┘
│  [Amplitude] [Fit] [Polar]   Footer buttons             │
└─────────────────────────────────────────────────────────┘
```

---

## Komponen F: `<BeachBall3D />`

**Fungsi**: Visualisasi focal mechanism sebagai bola 3D

**Spesifikasi:**
- Render dengan Three.js / WebGL
- Mode: Full (semua komponen) atau Double Couple saja
- Warna: hitam (compressional) / putih (dilatational)
- Interaktif: rotate dengan mouse drag
- Tampil juga versi 2D (stereografik) sebagai alternatif

**Props:**
```typescript
interface BeachBallProps {
  nodalPlanes: NodalPlanes;
  principalAxes?: PrincipalAxes;
  mode: 'full' | 'double_couple';
  size: number;
  interactive: boolean;
}
```

---

## Komponen G: `<WaveformPanel />`

**Fungsi**: Perbandingan waveform sintetis vs observasi per stasiun

**Per row stasiun:**
```typescript
interface StationWaveformRow {
  network: string;        // IU, G, JP
  station: string;        // MAJO, INU, JNU
  distance: number;       // derajat
  azimuth: number;        // derajat
  weight: number;         // 0-1
  fit: number;            // persentase (0-100)
  amplitude: number;
  components: WaveformTrace[];  // LP, LQ, LR
  isUsed: boolean;
  isHighlighted: boolean;
}
```

**Rendering:**
- D3.js untuk trace rendering (SVG atau Canvas)
- Warna merah = sintetis, hitam = observasi
- Highlight orange = jendela analisis yang digunakan
- Highlight hijau = jendela yang tidak digunakan / ditandai
- Header biru untuk stasiun aktif

---

## Komponen H: `<TensorMatrix />`

**Fungsi**: Tampilkan komponen tensor dalam tabel 3x3

```
     Mx    My    Mz
Mx [ 0.209 -0.408  0.085 ]
My [-0.408  1.315 -0.462 ]
Mz [ 0.085 -0.462 -1.524 ]

Exponent: 1E17
```

---

## Komponen I: `<InversionControls />`

### Depth Iteration Settings
```typescript
interface DepthIterationConfig {
  grid: string;           // e.g., "200:30, 400:50, 100"
  fineSearch: string;     // e.g., "50, 10, 5, 1"
  minDepth?: number;
  maxDepth?: number;
  keepCurrentDataset: boolean;
  shiftTraces: boolean;
  optimizeResult: boolean;
}
```

### Inversion Settings
```typescript
interface InversionConfig {
  globalTimeShift: number;
  maxBestShiftIterations: number;
}
```

### Wave Snippets
```typescript
interface WaveSnippetsConfig {
  minFit: number;   // 60
  maxFit: number;   // 40
}
```

---

## Komponen Shared / Reusable

### `<StatusBadge />`
Badge status event dengan color coding

### `<MagnitudeDisplay />`
Tampilan magnitude dengan formatting yang proper

### `<CoordinateDisplay />`
Lat/Lon dengan format DMS atau decimal

### `<DateTimeDisplay />`
DateTime dalam UTC dengan formatting seismologi standar

### `<DataTable />`
Generic sortable table yang dapat dikonfigurasi

### `<SplitPane />`
Resizable split panel untuk layout fleksibel

### `<LoadingOverlay />`
Overlay loading untuk operasi inversion yang lama

### `<ConnectionStatus />`
Indikator status koneksi ke SeisComP server
