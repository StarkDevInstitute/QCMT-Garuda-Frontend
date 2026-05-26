# SCMTV BMKG — Agent Instructions

## Project Overview

**SCMTV BMKG** is a React + TypeScript web/desktop application for seismic Moment Tensor analysis, built for BMKG (Indonesian meteorological agency). It replicates and improves GFZ Potsdam's `scmtv` SeisComP tool.

Full documentation: [README.md](README.md)

---

## Development Commands

```bash
npm install            # Install dependencies
npm run dev            # Web mode (Phase 1 — current, opens at localhost:5173)
npm run build          # TypeScript compile + Vite build
npm run preview        # Preview production build
npm test               # Vitest unit tests
npm run test:e2e       # Playwright end-to-end tests

# Phase 2 (Electron — future)
npm run electron:dev   # Electron desktop dev mode
npm run build:linux    # Cross-compile .AppImage + .deb for Ubuntu 20.04+
npm run build:win      # Build .exe installer for Windows
```

> Development environment: **Windows 10/11** (web mode). Production target: **Linux Ubuntu 20.04+** (Electron desktop).

---

## Architecture

Two-phase deployment, one codebase:

- **Phase 1 (current)**: Vite web app, runs in browser on Windows
- **Phase 2 (target)**: Electron 28+ desktop app targeting Linux Ubuntu 20.04+

See [02-ARCHITECTURE.md](02-ARCHITECTURE.md) for full diagrams.

### Directory Structure

```
src/
├── components/
│   ├── ui/                  # shadcn/ui base components
│   ├── BeachBall/           # Three.js 3D focal mechanism
│   ├── Waveform/            # D3.js waveform traces
│   ├── SeismicMap/          # Leaflet/MapLibre GL map
│   ├── EventTable/          # Sortable event catalog table
│   ├── TensorPanel/         # Moment tensor display
│   └── ThemeToggle/         # Light/dark toggle
├── pages/                   # MomentTensorPage, EventsPage, WaveformPage, SettingsPage
├── stores/                  # Zustand: eventStore, tensorStore, settingsStore, themeStore
├── lib/
│   ├── platform/            # ⚠️ Web ↔ Electron abstraction (see below)
│   ├── seismology/          # Domain math: inversion, synthetic, tensor, greens-functions
│   └── parsers/             # QuakeML, MiniSEED, StationXML parsers
├── styles/
│   ├── themes.css           # CSS variables for light/dark mode
│   └── globals.css
└── types/
    └── seismology.ts        # All core TypeScript types

electron/                    # Electron main process (Phase 2 only)
├── services/                # seiscomp-client, fdsn-client, file-service
├── ipc/                     # IPC handlers
└── protocols/               # SeedLink, ArcLink
```

---

## Critical Conventions

### 1. Platform Abstraction Layer — ALWAYS use this

Never call `fetch` directly in components for seismic data. Always use the platform API:

```typescript
import { platform } from '@/lib/platform';

// ✅ Correct
const events = await platform.getEvents(filter);

// ❌ Wrong — breaks Electron compatibility
const events = await fetch('https://fdsn.example.com/...');
```

The platform auto-detects web vs Electron environment. See [02-ARCHITECTURE.md](02-ARCHITECTURE.md#3-abstraksi-layer-web--electron).

### 2. Theme System

- Default theme: **dark** (for 24/7 monitoring environment)
- Toggle via `useThemeStore` (Zustand + localStorage persistence)
- Apply by toggling `.dark` class on `<html>` element
- Use CSS variables from `src/styles/themes.css` — never hardcode colors

```typescript
import { useThemeStore } from '@/stores/themeStore';
const { theme, toggleTheme } = useThemeStore();
```

### 3. State Management Split

| Concern | Tool |
|---------|------|
| UI state (selected event, panel state, theme) | Zustand stores in `src/stores/` |
| Server data (events, waveforms) | React Query / TanStack Query |

### 4. Waveform Rendering Strategy

- **SVG** for traces with < 10,000 samples
- **Canvas API via D3** for traces with ≥ 10,000 samples (performance)
- Use **WebWorker** for preprocessing seismic data
- See `src/components/Waveform/WaveformViewer.tsx`

### 5. Data Source Priority

```
1. SeisComP Server (MySQL/MariaDB) — local BMKG data
2. SeedLink Stream — real-time waveform
3. FDSN Web Services (IRIS, BMKG) — international catalog
4. Local files (QuakeML / MiniSEED)
```

---

## Data Models

All core TypeScript types are in `src/types/seismology.ts`. Key types: `SeismicEvent`, `Origin`, `Magnitude`, `FocalMechanism`, `MomentTensor`, `Tensor`, `NodalPlanes`, `WaveformTrace`.

These follow the **QuakeML schema** — consult [04-DATA-MODELS.md](04-DATA-MODELS.md) before adding new types.

Domain terminology reference: [07-SEISMOLOGY-DOMAIN.md](07-SEISMOLOGY-DOMAIN.md)

---

## UI Components

See [03-UI-COMPONENTS.md](03-UI-COMPONENTS.md) for full component specs with props interfaces.

Key components:
- `<WorldMap />` — Leaflet map with seismic event markers
- `<BeachBall3D />` — Three.js interactive focal mechanism visualization
- `<WaveformPanel />` — D3 per-station synthetic vs observed trace comparison
- `<EventTable />` — Sortable catalog with status badge color coding (`M+`=green, `A+`=blue, `A`=gray)
- `<TensorMatrix />` — 3×3 moment tensor component display

---

## Modules

See [05-MODULES.md](05-MODULES.md) for the breakdown of all 6 functional modules and their file ownership.

---

## Testing

See [10-TESTING-STRATEGY.md](10-TESTING-STRATEGY.md) for the full testing strategy.

- Unit tests: **Vitest** (`npm test`)
- E2E tests: **Playwright** (`npm run test:e2e`)
- Test seismology math functions in `src/lib/seismology/` carefully — numerical precision matters

---

## API Integration

See [09-API-INTEGRATION.md](09-API-INTEGRATION.md) for FDSN endpoint details, QuakeML/MiniSEED parsing patterns, and SeisComP protocol specs.

---

## Development Roadmap

See [08-DEVELOPMENT-ROADMAP.md](08-DEVELOPMENT-ROADMAP.md) for current milestones and phase breakdown.
