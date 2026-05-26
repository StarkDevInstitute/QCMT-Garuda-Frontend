# 05 — Breakdown Modul Fungsional

---

## Modul 1: Event Catalog Module

**Tanggung jawab**: Fetch, cache, filter, dan tampilkan daftar event seismik

### Files
```
src/
├── pages/EventsPage.tsx
├── components/EventTable/
│   ├── EventTable.tsx
│   ├── EventTableRow.tsx
│   ├── EventTableHeader.tsx
│   └── EventStatusBadge.tsx
├── components/FilterBar/
│   ├── FilterBar.tsx
│   ├── DateRangePicker.tsx
│   └── RegionFilter.tsx
├── hooks/
│   └── useEventList.ts
└── stores/
    └── eventStore.ts
```

### useEventList Hook
```typescript
function useEventList(filter: EventFilter) {
  // React Query untuk fetching + caching
  // Polling setiap 60 detik untuk event baru
  // Pagination / virtual scroll support
}
```

### State (Zustand eventStore)
```typescript
interface EventStore {
  selectedEventId: string | null;
  filter: EventFilter;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  
  setSelectedEvent: (id: string | null) => void;
  setFilter: (filter: Partial<EventFilter>) => void;
  setSorting: (column: string, direction: 'asc' | 'desc') => void;
}
```

---

## Modul 2: Moment Tensor Module

**Tanggung jawab**: Tampilkan dan edit parameter moment tensor untuk event terpilih

### Files
```
src/
├── pages/MomentTensorPage.tsx
├── components/TensorPanel/
│   ├── TensorPanel.tsx
│   ├── NodalPlanesTable.tsx
│   ├── PrincipalAxesTable.tsx
│   ├── OriginParameters.tsx
│   ├── TensorQualityMetrics.tsx
│   └── EventMetadata.tsx
├── components/BeachBall/
│   ├── BeachBall3D.tsx          (Three.js)
│   ├── BeachBall2D.tsx          (D3.js stereographic)
│   └── beachball-geometry.ts   (math utilities)
├── components/WorldMap/
│   ├── WorldMap.tsx
│   └── MapMarkers.tsx
├── hooks/
│   └── useMomentTensor.ts
└── stores/
    └── tensorStore.ts
```

---

## Modul 3: Waveform & Inversion Module

**Tanggung jawab**: Tampilkan waveform, jalankan inversion, kontrol parameter

### Files
```
src/
├── components/Waveform/
│   ├── WaveformPanel.tsx
│   ├── WaveformViewer.tsx       (D3 canvas renderer)
│   ├── StationRow.tsx
│   ├── TraceRenderer.tsx        (single trace D3)
│   └── WaveformHeader.tsx
├── components/InversionControls/
│   ├── InversionControls.tsx
│   ├── DepthIterationPanel.tsx
│   ├── InversionSettings.tsx
│   └── WaveSnippetsConfig.tsx
├── components/TensorMatrix/
│   └── TensorMatrix.tsx
├── lib/seismology/
│   ├── inversion.ts             (wrapper untuk inversion engine)
│   ├── synthetic.ts             (sintetis seismogram)
│   ├── tensor.ts                (tensor math)
│   └── greens-functions.ts      (Green's function)
└── hooks/
    ├── useWaveform.ts
    └── useInversion.ts
```

### Waveform Rendering Strategy
```typescript
// Gunakan Canvas API via D3 untuk performa
// SVG untuk traces < 10.000 sample
// Canvas untuk traces > 10.000 sample
// WebWorker untuk preprocessing data

class WaveformRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  render(traces: WaveformTrace[], options: RenderOptions): void;
  setZoom(xRange: [number, number]): void;
  setAmplitudeScale(scale: number): void;
  highlight(window: TimeWindow, color: string): void;
}
```

---

## Modul 4: Data Connectivity Module

**Tanggung jawab**: Koneksi ke sumber data (SeisComP, FDSN, file lokal)

### Files
```
electron/
├── services/
│   ├── seiscomp-client.ts       (SeisComP DB + SeedLink)
│   ├── fdsn-client.ts           (FDSN web services)
│   └── file-service.ts          (lokal QuakeML/MiniSEED)
├── ipc/
│   ├── events-ipc.ts            (event catalog IPC)
│   ├── waveform-ipc.ts          (waveform data IPC)
│   └── config-ipc.ts            (settings IPC)
└── protocols/
    ├── seedlink.ts               (SeedLink protocol)
    └── arclink.ts                (Arclink protocol)

src/lib/parsers/
├── quakeml.ts                   (QuakeML XML parser)
├── miniseed.ts                  (MiniSEED binary parser)
└── stationxml.ts                (StationXML parser)
```

### Data Sources Priority
```
1. SeisComP Server (MySQL) — data lokal BMKG
2. SeedLink Stream — real-time waveform
3. FDSN Web Services — data internasional
4. File Lokal — QuakeML / MiniSEED files
```

---

## Modul 5: Settings & Configuration Module

**Tanggung jawab**: Konfigurasi koneksi server, preferensi UI, dan parameter default

### Files
```
src/
├── pages/SettingsPage.tsx
├── components/Settings/
│   ├── ServerConfig.tsx
│   ├── DisplaySettings.tsx
│   ├── InversionDefaults.tsx
│   └── KeyboardShortcuts.tsx
└── stores/
    └── settingsStore.ts

electron/
└── config/
    └── config-manager.ts        (persist to electron-store)
```

### Persisted Settings
```typescript
interface AppSettings {
  server: ServerConfig;
  display: {
    theme: 'dark' | 'light';
    language: 'id' | 'en';
    mapStyle: string;
    waveformColors: {
      observed: string;
      synthetic: string;
      window: string;
    };
  };
  inversionDefaults: InversionConfig;
  shortcuts: Record<string, string>;
}
```

---

## Modul 6: Export & Report Module

**Tanggung jawab**: Export data dan generate laporan

### Fitur
```
- Export event list ke CSV
- Export moment tensor ke QuakeML
- Export waveform ke MiniSEED
- Generate PDF laporan focal mechanism
- Screenshot beach ball (PNG/SVG)
- Copy data ke clipboard
```

### Files
```
src/lib/export/
├── csv-exporter.ts
├── quakeml-writer.ts
├── pdf-reporter.ts
└── image-exporter.ts
```

---

## Modul 7: Bulletin Module

**Tanggung jawab**: Log dan bulletin output dari proses analisis

### Files
```
src/
├── components/BulletinPanel/
│   ├── BulletinPanel.tsx
│   └── BulletinEntry.tsx
└── stores/
    └── bulletinStore.ts
```

### Bulletin Format
```typescript
interface BulletinEntry {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'result';
  source: string;                // "inversion" | "data" | "system"
  message: string;
  data?: Record<string, unknown>;
}
```
