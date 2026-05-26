# 08 — Development Roadmap

> **Pendekatan Revisi**: Dimulai dengan **mode web** (browser-based) di Windows, kemudian dimigrasi ke **Electron desktop** untuk Linux di Phase berikutnya.

---

## Overview Timeline

```
Q1 2025         Q2 2025         Q3 2025         Q4 2025
│               │               │               │
├── Phase 0 ────┤               │               │
│  Setup &      │               │               │
│  Foundation   │               │               │
│  (Web Mode)   │               │               │
│               │               │               │
│   ├── Phase 1 ────────────────┤               │
│               │  Core Modules │               │
│               │  (Web Mode)   │               │
│               │               │               │
│               │    ├── Phase 2 ───────────────┤
│               │               │  Electron     │
│               │               │  Migration    │
│               │               │  (Linux)      │
│               │               │               │
│               │               │    ├─ Phase 3 ─
│               │               │               │
│               │               │    Production  │
│               │               │    Deploy      │
```

---

## Phase 0: Foundation Setup — Web Mode (2-3 Minggu)

> **Dev environment**: Windows 10/11, development di browser.

### Tujuan
Menyiapkan environment development web, project structure, tema light/dark, dan CI/CD pipeline.

### Tasks

**Minggu 1: Project Init**
- [ ] Inisialisasi project: `npm create vite@latest scmtv-bmkg -- --template react-ts`
- [ ] Setup ESLint, Prettier, Husky (pre-commit hooks)
- [ ] Konfigurasi Tailwind CSS + shadcn/ui
- [ ] Setup testing framework (Vitest + React Testing Library)
- [ ] Setup CI/CD pipeline (GitHub Actions)

**Minggu 2: Base Architecture**
- [ ] Implementasi React Router (tab-based navigation)
- [ ] Implementasi Zustand stores (skeleton)
- [ ] Setup React Query
- [ ] Implementasi platform abstraction layer (web.ts + electron.ts)
- [ ] Setup mock data untuk development offline

**Minggu 3: Design System & Theme**
- [ ] Implementasi CSS variables untuk light/dark theme
- [ ] Implementasi ThemeStore (Zustand + localStorage persistence)
- [ ] ThemeToggle component (🌑/☀️ button di header)
- [ ] Layout components: AppHeader, TabBar, StatusBar, SplitPane
- [ ] Dark mode sebagai default, light mode tersedia
- [ ] Verify tampilan di Chrome/Firefox Windows
- [ ] Create Storybook untuk component documentation

### Deliverables
- ✅ Web app berjalan di `http://localhost:5173`
- ✅ Dark mode default + Light mode toggle berfungsi
- ✅ Tab navigation berfungsi
- ✅ CI/CD pipeline aktif

---

## Phase 1: Core Modules — Web Mode (8-10 Minggu)

> Semua modul dikembangkan sebagai web app. Data dari FDSN Web Services atau mock data.

### Milestone 1.1: Event Catalog (Minggu 1-3)

**Sprint 1: Mock Data + Table**
- [ ] EventTable komponen dengan mock 50 events
- [ ] Sorting per kolom, status badge color coding
- [ ] Row selection & keyboard navigation (↑↓)
- [ ] Filter bar UI

**Sprint 2: Filter Logic**
- [ ] Filter logic (date range, magnitude, region)
- [ ] Checkbox filters
- [ ] Virtual scroll (react-virtual)

**Sprint 3: FDSN Integration (Web)**
- [ ] FDSN fdsnws-event client (`fetch` langsung dari browser)
- [ ] QuakeML parser
- [ ] React Query integration + auto-refresh

### Milestone 1.2: Moment Tensor View (Minggu 4-6)

**Sprint 4: Map + Layout**
- [ ] World Map dengan Leaflet
- [ ] SplitPane resizable layout
- [ ] Event/station markers

**Sprint 5: Detail Panel**
- [ ] Nodal Planes table, Principal Axes
- [ ] Origin parameters, Tensor quality metrics
- [ ] Bulletin panel

**Sprint 6: Beach Ball**
- [ ] Beach Ball 2D (stereographic, D3.js)
- [ ] Beach Ball 3D (Three.js WebGL)
- [ ] Export PNG/SVG

### Milestone 1.3: Waveform Viewer (Minggu 7-10)

**Sprint 7-10**: Waveform rendering, station management, inversion controls.
*(Detail sama dengan roadmap sebelumnya)*

### Milestone 1.4: Theme Polish

- [ ] Verifikasi semua komponen tampil baik di dark mode
- [ ] Verifikasi semua komponen tampil baik di light mode
- [ ] Waveform colors mengikuti CSS variables (--waveform-obs, --waveform-syn)
- [ ] Map tiles mendukung dark mode (dark tile layer)
- [ ] Transition animasi saat toggle theme

### Deliverables Phase 1
- ✅ Web app fully functional di browser Windows
- ✅ Light/Dark mode berfungsi di semua halaman
- ✅ Event list, Moment Tensor view, Waveform view, Settings berfungsi
- ✅ Data dari FDSN atau mock data

---

## Phase 2: Electron Migration — Linux Target (6-8 Minggu)

> Setelah web app stabil, tambahkan Electron shell untuk native desktop di Linux.

### Milestone 2.1: Electron Setup (Minggu 1-2)
- [ ] Tambah `electron-vite` ke project
- [ ] Implementasi main process (main.ts)
- [ ] Implementasi preload.ts + contextBridge
- [ ] Implementasi `electronPlatform` (electron.ts) yang replace `webPlatform`
- [ ] Test berjalan di Electron dev mode (Windows dulu)
- [ ] Cross-compile build untuk Linux dari Windows menggunakan `electron-builder`

### Milestone 2.2: Desktop Integration (Minggu 3-4)
- [ ] Native menu bar (File, Settings, View, Help)
- [ ] System tray icon
- [ ] Window state persistence (posisi, ukuran)
- [ ] Drag & drop file import (QuakeML, MiniSEED)
- [ ] Native file open/save dialogs

### Milestone 2.3: Server Connectivity (Minggu 5-6)
- [ ] SeisComP database connector (MySQL/MariaDB) via IPC
- [ ] SeedLink real-time stream
- [ ] Arclink waveform request
- [ ] Settings persistence via electron-store

### Milestone 2.4: Linux Packaging (Minggu 7-8)
- [ ] Build `.AppImage` untuk Linux
- [ ] Build `.deb` package untuk Ubuntu/Debian
- [ ] Test di Linux Ubuntu 20.04 VM
- [ ] Test di environment BMKG

---

## Phase 3: Advanced Features & Production (4-6 Minggu)

### Milestone 3.1: Analysis Tools
- [ ] Misfit map, Depth vs misfit plot
- [ ] Station weight editor
- [ ] Bandpass filter control
- [ ] Polarity check tool

### Milestone 3.2: Export & Report
- [ ] Export ke QuakeML, CSV
- [ ] PDF report generator
- [ ] Confirm & publish ke SeisComP database

### Milestone 3.3: Production Hardening
- [ ] Comprehensive error handling
- [ ] Offline mode graceful degradation
- [ ] Memory management
- [ ] Performance profiling

### Milestone 3.4: Testing & Deployment
- [ ] Unit tests (target 70% coverage)
- [ ] E2E tests dengan Playwright
- [ ] User acceptance testing dengan seismolog BMKG
- [ ] Installation documentation (Linux)
- [ ] User manual (Bahasa Indonesia)

---

## Team Structure (Rekomendasi)

| Role | Jumlah | Fokus |
|------|--------|-------|
| Tech Lead / Architect | 1 | Arsitektur, review, koordinasi |
| Frontend Developer | 2 | React components, UI/UX, theme system |
| Electron Developer | 1 | Desktop integration, IPC, Linux build |
| Seismology Domain Expert | 1 | Validasi domain, acceptance testing |
| QA Engineer | 1 | Testing, bug tracking |

---

## Risiko & Mitigasi

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|-------------|--------|---------|
| CORS di web mode (FDSN) | Tinggi | Medium | Gunakan proxy lokal atau mock data di dev |
| Inversion engine kompleks | Tinggi | Tinggi | Gunakan wrapper ke C++ existing; WASM di Phase 2 |
| Performa waveform | Medium | Tinggi | Canvas API + WebWorker + virtual windowing |
| Cross-compile Windows → Linux | Medium | Medium | Test di CI pipeline dengan Linux runner |
| Kualitas data BMKG | Medium | Medium | Mock data realistis dari awal |
| Timeline slip | Tinggi | Medium | Buffer 20%, prioritas MVP ketat |
