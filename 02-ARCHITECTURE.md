# 02 — Arsitektur Teknis

## 1. Tech Stack

### Frontend Framework
```
React 18+ dengan TypeScript
```
- Component-based architecture
- Strong typing untuk data seismologi yang kompleks
- Ekosistem library yang kaya

### Deployment Mode
```
Phase 1 (Current): Web-based (Vite dev server / static hosting)
Phase 2 (Target):  Electron 28+ desktop app — primary target Linux, dev di Windows
```

> **Catatan Development**: Pengembangan awal dilakukan di **Windows** dengan mode web. Target produksi adalah **Linux** (Ubuntu 20.04+) sebagai native Electron desktop app. Arsitektur didesain agar migrasi web → Electron semulus mungkin dengan abstraksi layer.

### Desktop Runtime (Phase 2)
```
Electron 28+
```
- Cross-platform: Linux (primary), Windows, macOS
- Akses filesystem lokal untuk data seismologi
- Native menu dan system tray
- Auto-update support
- **Target deploy**: Linux Ubuntu 20.04+ (server/workstation BMKG)
- **Dev environment**: Windows 10/11 (via Vite web mode)

### State Management
```
Zustand (global state ringan)
React Query / TanStack Query (server state & caching)
```
- Zustand untuk UI state (selected event, panel settings, theme)
- React Query untuk data fetching, caching, dan sync

### Visualisasi
```
D3.js v7          — Waveform rendering, custom charts
Leaflet / MapLibre GL — Peta seismisitas
Three.js          — Beach ball 3D rendering
Recharts          — Chart statistik umum
```

### UI Components
```
Tailwind CSS      — Utility-first styling
shadcn/ui         — Base component library
Radix UI          — Accessible primitives
```

### Theme System
```
CSS Variables     — Light/Dark mode via :root dan .dark class
next-themes / custom ThemeProvider — Toggle & persist preference
```
- Default: **Dark mode** (sesuai lingkungan kerja 24/7 monitoring)
- Tersedia: **Light mode** untuk penggunaan siang hari
- Persisted ke localStorage (web) / electron-store (desktop)

### Build Tools
```
Vite              — Fast build & HMR (digunakan di Phase 1 web mode)
electron-vite     — Electron + Vite integration (Phase 2)
```

---

## 2. Arsitektur Aplikasi

### Phase 1 — Web Mode (Current)

```
┌─────────────────────────────────────────────────────┐
│              BROWSER / WEB APP                       │
│  ┌──────────────────────────────────────────────┐   │
│  │           REACT APP (Vite)                    │   │
│  │                                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │ EventList│  │MomentTens│  │ Waveform │  │   │
│  │  │  Module  │  │or Module │  │  Module  │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  │   │
│  │                                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │   Map    │  │ BeachBall│  │Settings/ │  │   │
│  │  │  Module  │  │  Module  │  │  Config  │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
          │                          │
          ▼                          ▼
┌──────────────────┐      ┌──────────────────────┐
│  FDSN Web Serv.  │      │  Mock Data / File    │
│  (IRIS, BMKG)    │      │  (QuakeML lokal)     │
│  fdsnws-event    │      │  untuk dev & testing │
│  fdsnws-datasel  │      └──────────────────────┘
└──────────────────┘
```

### Phase 2 — Electron Desktop (Target)

```
┌─────────────────────────────────────────────────────┐
│                   ELECTRON SHELL                     │
│  ┌──────────────────────────────────────────────┐   │
│  │              MAIN PROCESS (Node.js)           │   │
│  │  - Window management                         │   │
│  │  - File system access                        │   │
│  │  - SeisComP connection (TCP/SeedLink)        │   │
│  │  - Native menu                               │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │ IPC Bridge                     │
│  ┌──────────────────▼───────────────────────────┐   │
│  │            RENDERER PROCESS (React)           │   │
│  │         (same codebase as Phase 1)            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
          │                          │
          ▼                          ▼
┌──────────────────┐      ┌──────────────────────┐
│  SeisComP Server │      │   FDSN Web Services  │
│  (MySQL/MariaDB) │      │  (IRIS, BMKG, etc.)  │
│  SeedLink Stream │      └──────────────────────┘
└──────────────────┘
```

---

## 3. Abstraksi Layer (Web ↔ Electron)

Agar kode renderer dapat berjalan di web maupun Electron tanpa modifikasi, gunakan **abstraction layer**:

```typescript
// src/lib/platform/index.ts

interface PlatformAPI {
  getEvents: (filter: EventFilter) => Promise<SeismicEvent[]>;
  getWaveform: (params: WaveformRequest) => Promise<WaveformTrace[]>;
  openFile: (options: OpenFileOptions) => Promise<string | null>;
  saveFile: (data: Blob, filename: string) => Promise<boolean>;
}

// Web implementation — gunakan fetch langsung ke FDSN
// src/lib/platform/web.ts
export const webPlatform: PlatformAPI = {
  getEvents: (filter) => fdsnClient.fetchEvents(filter),
  getWaveform: (params) => fdsnClient.fetchWaveform(params),
  openFile: () => showFilePicker(),
  saveFile: (data, filename) => downloadBlob(data, filename),
};

// Electron implementation — gunakan IPC
// src/lib/platform/electron.ts
export const electronPlatform: PlatformAPI = {
  getEvents: (filter) => window.electronAPI.getEvents(filter),
  getWaveform: (params) => window.electronAPI.getWaveform(params),
  openFile: (opts) => window.electronAPI.openFile(opts),
  saveFile: (data, path) => window.electronAPI.saveFile(data, path),
};

// Auto-detect platform
export const platform: PlatformAPI =
  typeof window.electronAPI !== 'undefined' ? electronPlatform : webPlatform;
```

---

## 4. Theme System

```typescript
// src/stores/themeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark', // default dark untuk monitoring environment
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'scmtv-theme' }
  )
);

// Apply theme ke DOM
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
```

### CSS Variables (Light/Dark)
```css
/* src/styles/themes.css */
:root {
  --bg-primary:     #ffffff;
  --bg-secondary:   #f5f5f5;
  --bg-panel:       #fafafa;
  --text-primary:   #1a1a1a;
  --text-secondary: #4a4a4a;
  --border:         #e0e0e0;
  --accent:         #0066cc;
  --accent-hover:   #0052a3;
  --status-ok:      #16a34a;
  --status-warn:    #d97706;
  --status-error:   #dc2626;
  --waveform-obs:   #1a1a1a;
  --waveform-syn:   #cc0000;
  --waveform-win:   rgba(255, 165, 0, 0.3);
}

.dark {
  --bg-primary:     #0d1117;
  --bg-secondary:   #161b22;
  --bg-panel:       #1c2128;
  --text-primary:   #e6edf3;
  --text-secondary: #8b949e;
  --border:         #30363d;
  --accent:         #58a6ff;
  --accent-hover:   #79b8ff;
  --status-ok:      #3fb950;
  --status-warn:    #d29922;
  --status-error:   #f85149;
  --waveform-obs:   #e6edf3;
  --waveform-syn:   #ff6b6b;
  --waveform-win:   rgba(255, 165, 0, 0.25);
}
```

---

## 5. Struktur Direktori

```
scmtv-bmkg/
├── src/                         # React renderer (shared: web & Electron)
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── components/
│   │   ├── ui/                  # Base UI (shadcn/ui)
│   │   ├── BeachBall/
│   │   ├── Waveform/
│   │   ├── SeismicMap/
│   │   ├── EventTable/
│   │   ├── TensorPanel/
│   │   └── ThemeToggle/         # Light/Dark toggle button
│   │
│   ├── pages/
│   │   ├── MomentTensorPage.tsx
│   │   ├── EventsPage.tsx
│   │   ├── WaveformPage.tsx
│   │   └── SettingsPage.tsx
│   │
│   ├── stores/
│   │   ├── eventStore.ts
│   │   ├── tensorStore.ts
│   │   ├── settingsStore.ts
│   │   └── themeStore.ts        # Theme state
│   │
│   ├── lib/
│   │   ├── platform/            # Web ↔ Electron abstraction
│   │   │   ├── index.ts
│   │   │   ├── web.ts
│   │   │   └── electron.ts
│   │   ├── seismology/
│   │   ├── parsers/
│   │   └── utils/
│   │
│   ├── styles/
│   │   ├── themes.css           # CSS variables light/dark
│   │   └── globals.css
│   │
│   └── types/
│
├── electron/                    # Electron main process (Phase 2)
│   ├── main.ts
│   ├── preload.ts
│   └── ...
│
├── public/
├── tests/
├── docs/
├── package.json
├── vite.config.ts               # Web mode config
├── electron-vite.config.ts      # Electron mode config (Phase 2)
└── tsconfig.json
```

---

## 6. Development Setup (Windows)

```bash
# Prerequisites (Windows)
# - Node.js 20+ (https://nodejs.org)
# - Git for Windows
# - VS Code (recommended)

# Clone & install
git clone https://github.com/bmkg/scmtv-bmkg.git
cd scmtv-bmkg
npm install

# Jalankan dalam mode WEB (Phase 1 — development di Windows)
npm run dev
# → Buka http://localhost:5173

# Build web untuk testing/staging
npm run build
npm run preview

# ─── Phase 2: Electron (nanti) ───────────────────────────────
# Jalankan Electron desktop (development)
npm run electron:dev

# Build Electron untuk Linux (cross-compile dari Windows)
npm run build:linux   # menghasilkan .AppImage dan .deb

# Build Electron untuk Windows
npm run build:win     # menghasilkan .exe installer
```

### package.json scripts
```json
{
  "scripts": {
    "dev":            "vite",
    "build":          "tsc && vite build",
    "preview":        "vite preview",
    "electron:dev":   "electron-vite dev",
    "build:linux":    "electron-vite build && electron-builder --linux",
    "build:win":      "electron-vite build && electron-builder --win",
    "test":           "vitest",
    "test:e2e":       "playwright test"
  }
}
```

---

## 7. Deployment Target

| Mode | Platform | Package | Status |
|------|----------|---------|--------|
| Web (Phase 1) | Browser (dev Windows) | Vite dev server | **Current** |
| Desktop (Phase 2) | Linux Ubuntu 20.04+ | `.AppImage`, `.deb` | Target |
| Desktop (Phase 2) | Windows 10/11 | `.exe` NSIS | Opsional |
| Desktop (Phase 2) | macOS 12+ | `.dmg` | Opsional |

### Requirements Hardware
- RAM: minimum 4GB, recommended 8GB
- CPU: minimum 4 core (untuk inversion)
- Storage: 10GB untuk data cache lokal
- Network: koneksi ke SeisComP server BMKG
