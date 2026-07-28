# 14 — Waveform Page Development Roadmap

> **Target**: Implementasi halaman Waveform interaktif yang identik dengan scmtv GFZ, untuk analisis dan editing waveform traces dalam proses inversi moment tensor.

---

## 📋 Table of Contents

1. [Overview & Reference](#1-overview--reference)
2. [Layout Architecture](#2-layout-architecture)
3. [Component Breakdown](#3-component-breakdown)
4. [Development Timeline](#4-development-timeline)
5. [Implementation Details](#5-implementation-details)
6. [Testing Strategy](#6-testing-strategy)

---

## 1. Overview & Reference

### 1.0 UI-First Update (2026-07-28)

Fokus implementasi saat ini diprioritaskan ke **kesesuaian tampilan SCMTV GFZ** sebelum finalisasi integrasi data penuh. Screenshot referensi terbaru dipakai sebagai baseline visual untuk:

- Left sidebar: tensor + beach ball + nodal planes + derived values
- Center area: compact processing toolbar + waveform workstation look
- Right sidebar: station values table + depth search controls block
- Bottom controls: apply/optimize/commit workflow style

Catatan: beberapa kontrol pada pass ini masih UI scaffold (dummy visual) dan belum terhubung ke behavior backend final. Integrasi data dilanjutkan setelah visual parity cukup stabil.

### 1.1 SCMTV GFZ Reference Screenshots

**Screenshot 1**: Main waveform viewer dengan station table
- Beach ball (kiri atas)
- Tensor matrix + controls (kiri tengah)
- Waveform traces dengan color-coded station rows (kanan)
- Station table dengan kolom: Used, Net, Sta, Cha, Dist, Az, Weight, Fit, Amp
- Residual scatter plot (bawah)
- Processing profile controls (atas)

**Screenshot 2**: Detail waveform traces
- Signal time windows (colored boxes)
- Green's functions visualization
- Station diagrams
- Nodal planes panel
- Derived values section
- Interactive controls: frequency, depth, time shift

### 1.2 Key Features Replication Target

| Feature | SCMTV GFZ | Our Implementation | Priority |
|---------|-----------|-------------------|----------|
| **Waveform Display** | | | |
| Observed vs Synthetic overlay | ✅ | 🎯 To Implement | **P0** |
| Color-coded station groups (Local/Regional/Tele) | ✅ | 🎯 To Implement | **P0** |
| Z/R/T component per station | ✅ | 🎯 To Implement | **P0** |
| Expandable station rows | ✅ | 🎯 To Implement | **P1** |
| Signal time windows (colored boxes) | ✅ | 🎯 To Implement | **P1** |
| Green's functions overlay | ✅ | 🎯 To Implement | **P2** |
| **Station Table** | | | |
| Sortable columns | ✅ | 🎯 To Implement | **P0** |
| Toggle station on/off | ✅ | 🎯 To Implement | **P0** |
| Editable weight/fit values | ✅ | 🎯 To Implement | **P1** |
| Color-coded by distance group | ✅ | 🎯 To Implement | **P1** |
| **Interactive Controls** | | | |
| Frequency slider (fmin/fmax) | ✅ | 🎯 To Implement | **P0** |
| Depth search slider | ✅ | 🎯 To Implement | **P1** |
| Time shift adjustment | ✅ | 🎯 To Implement | **P1** |
| Processing profile dropdown | ✅ | 🎯 To Implement | **P2** |
| **Visualization Panels** | | | |
| Beach ball 3D (already implemented) | ✅ | ✅ Reuse | **P0** |
| Tensor matrix display | ✅ | 🎯 To Implement | **P0** |
| Residual scatter plot | ✅ | 🎯 To Implement | **P1** |
| Nodal planes table | ✅ | 🎯 To Implement | **P1** |
| Derived values panel | ✅ | 🎯 To Implement | **P2** |
| **Workflow Actions** | | | |
| Run depth search | ✅ | 🎯 To Implement | **P1** |
| Optimize result | ✅ | 🎯 To Implement | **P1** |
| Commit solution | ✅ | 🎯 To Implement | **P0** |
| Export bulletin | ✅ | 🎯 To Implement | **P2** |

---

## 2. Layout Architecture

### 2.1 Page Structure (Berdasarkan Screenshot SCMTV GFZ)

**Layout: 3-Column Grid (Left Sidebar | Center Area | Right Sidebar)**

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ WaveformPage — Main Container (Full Viewport, 100vh)                                                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                              │
│  ┌────────────────┬──────────────────────────────────────────────────────────┬───────────────────────────┐  │
│  │ Left Sidebar   │ Center Area — Main Content                               │ Right Sidebar             │  │
│  │ (280px fixed)  │ (Flexible, min 600px)                                    │ (380px fixed)             │  │
│  │                │                                                          │                           │  │
│  │                ├──────────────────────────────────────────────────────────┤                           │  │
│  │                │ Top Toolbar (height: 48px, spans center area only)       │                           │  │
│  │ ╔═══════════╗  ├──────────────────────────────────────────────────────────┤ ┌─────────────────────┐  │  │
│  │ ║  Beach    ║  │ [Deviatorik ☑] [Double eig ☑] [Norm. trace] [Norm.     │ │ Station Table       │  │  │
│  │ ║  Ball 3D  ║  │ single] [All]                                            │ │ (Full height)       │  │  │
│  │ ║   ⚫→⚫   ║  │ Processing: [MS-MLS ▾] [Filter🔍] [70 deg] [Add/hide]   │ │                     │  │  │
│  │ ║  Focal    ║  │ Station values: [0.02] Depth: [Grid] [<20,200,400,50>] │ │ ┌─────────────────┐ │  │  │
│  │ ║  Sphere   ║  │ [☑] Shift traces [☑] Run after each inversion           │ │ │ Filter Toolbar  │ │  │  │
│  │ ╚═══════════╝  ├──────────────────────────────────────────────────────────┤ │ ├─────────────────┤ │  │  │
│  │ 180×180px      │ Waveform Canvas (Scrollable, ~55% of center area)        │ │ │ [Distance:     │ │  │  │
│  │                │ ┌────────────────────────────────────────────────────────┐│ │ │  ☑ Local      │ │  │  │
│  │ ───────────    │ │ SHZ │ Dist: 0.92° │ Az: 354° │ Sta: BUBSI │ Fit: 44.2%││ │ │  ☑ Regional   │ │  │  │
│  │ Tensor         │ ├────────────────────────────────────────────────────────┤│ │ │  ☑ Teleseis.] │ │  │  │
│  │ ┌───┬───┬───┐  │ │ │█████│ Time Window (P-wave - orange box)            ││ │ │ [Select All]  │ │  │  │
│  │ │Mrr│Mtt│Mpp│  │ │ │     │ ▁▂▃▅▆█▆▅▃▂▁  ← Observed (black, bold)      ││ │ └─────────────────┘ │  │  │
│  │ ├───┼───┼───┤  │ │ │     │ ▁▂▄▅▇▉▇▅▄▂▁  ← Synthetic (red, lighter)   ││ │                     │  │  │
│  │ │214│143│-71│  │ └────────┴────────────────────────────────────────────────┘│ │ ┌─────────────────┐ │  │  │
│  │ └───┴───┴───┘  │                                                          │ │ │ Table Header    │ │  │  │
│  │ ┌───┬───┬───┐  │ │ SHZ │ Dist: 1.35° │ Az: 20° │ Sta: BUMSI │ Fit: 14.0%││ │ ├─────────────────┤ │  │  │
│  │ │Mrt│Mrp│Mtp│  │ ├────────────────────────────────────────────────────────┤│ │ │[☑]│Used│Net│Sta││ │  │  │
│  │ ├───┼───┼───┤  │ │ │██│  │                                               ││ │ │Loc│Cha│Dist│Az ││ │  │  │
│  │ │113│119│-73│  │ │ │  │  │ ▁▃▄▆▅▃▂▁  (Observed)                        ││ │ │Wgt│Fit│Amp│Ms ││ │  │  │
│  │ └───┴───┴───┘  │ │ │  │  │ ▁▃▅▇▆▄▂▁  (Synthetic)                       ││ │ ├───┼────┼───┼───┤│ │  │  │
│  │ (×1E+16 Nm)    │ └────────┴────────────────────────────────────────────────┘│ │[☑]│ ✓ │IA │BUBS││ │  │  │
│  │                │                                                          │ │[☑]│ ✓ │IA │BUMS││ │  │  │
│  │ ───────────    │ │ SHZ │ Dist: 1.33° │ Az: 147° │ Sta: DOCM │ Fit: 14.1%││ │[☑]│ ✓ │IA │DOCM││ │  │  │
│  │ Synthetics     │ ├────────────────────────────────────────────────────────┤│ │[☑]│ ✓ │IA │KCSI││ │  │  │
│  │ Archive:       │ │ │█│   │                                               ││ │[☑]│ ✓ │IU │CHTO││ │  │  │
│  │ [s-3gf-td...]  │ │ │ │   │ ▂▃▅▆▄▃▁  (Observed)                         ││ │[☐]│   │G  │PPTF││ │  │  │
│  │ Model:         │ │ │ │   │ ▂▃▅▇▅▃▁  (Synthetic)                        ││ │[☑]│ ✓ │IA │TNTI││ │  │  │
│  │ [gemma-usgs]   │ └────────┴────────────────────────────────────────────────┘│ │    │...│(scroll)││ │  │  │
│  │                │                                                          │ │    │...│       ││ │  │  │
│  │ ───────────    │ [... More stations scrollable ...]                       │ │    │ 66 stations ││ │  │  │
│  │ Depth (km)     │                                                          │ │                     │  │  │
│  │ ┌──────────┐   │ Total: 66 stations (6 local|42 regional|18 teleseismic) │ │ ├─────────────────┤ │  │  │
│  │ │░░░░█░░░░░│   ├──────────────────────────────────────────────────────────┤ │ │ Table Footer    │ │  │  │
│  │ │  2 km ↕  │   │ Residual Scatter Plot (~20% of center area)              │ │ ├─────────────────┤ │  │  │
│  │ └──────────┘   │ ┌────────────────────────────────────────────────────────┐│ │ │ Selected: 42/66 │ │  │  │
│  │ Range: 0-200   │ │ Y: Residual (sec)    Distance vs Time Shift           ││ │ │ Avg Fit: 67.3%  │ │  │  │
│  │                │ │  2.0┤                                                  ││ │ │ VR: 68.0%       │ │  │  │
│  │ Latitude       │ │  1.5┤              • (teleseismic - blue)             ││ │ └─────────────────┘ │  │  │
│  │ [38.11°]       │ │  1.0┤      •  •  • (regional - green)                 ││ │                     │  │  │
│  │ Longitude      │ │  0.5┤  •                                              ││ └─────────────────────┘  │  │
│  │ [125.05°]      │ │  0.0┼───•──•───•───•───•───•─── (zero line - dashed) ││                           │  │
│  │                │ │ -0.5┤ • (local - orange)                              ││                           │  │
│  │ ───────────    │ │ -1.0┤   •    •                                        ││                           │  │
│  │ Nodal Planes   │ │ -1.5┤                                                 ││                           │  │
│  │ ┌──────────┐   │ │ -2.0┤                                                 ││                           │  │
│  │ │ NP1:     │   │ │     └──┬───┬───┬───┬───┬───┬───┬───┬───              ││                           │  │
│  │ │Strike190°│   │ │        0   4   8  12  16  20  24  28 (Distance°)     ││                           │  │
│  │ │ Dip  55° │   │ └────────────────────────────────────────────────────────┘│                           │  │
│  │ │ Rake 90° │   │                                                          │                           │  │
│  │ │          │   ├──────────────────────────────────────────────────────────┤                           │  │
│  │ │ NP2:     │   │ Bottom Action Bar (height: 56px, spans center area)      │                           │  │
│  │ │Strike 65°│   │ ┌────────────────────────────────────────────────────────┐│                           │  │
│  │ │ Dip  55° │   │ │ [Apply Solution] [Run Depth Search] [Optimize Result] ││                           │  │
│  │ │ Rake-90° │   │ │ [Commit] | Last update: 2026-07-15 14:23:45 | VR: 68%││                           │  │
│  │ └──────────┘   │ │ RMS: 0.52 | DC: 85.3% | CLVD: 14.7%                   ││                           │  │
│  │                │ └────────────────────────────────────────────────────────┘│                           │  │
│  │ ───────────    │                                                          │                           │  │
│  │ Derived Values │                                                          │                           │  │
│  │ ┌──────────┐   │                                                          │                           │  │
│  │ │ Mw: 4.8  │   │                                                          │                           │  │
│  │ │ Exponent │   │                                                          │                           │  │
│  │ │ 1E       │   │                                                          │                           │  │
│  │ │ DC: 85.3%│   │                                                          │                           │  │
│  │ │CLVD:14.7%│   │                                                          │                           │  │
│  │ │ ISO: 0.0%│   │                                                          │                           │  │
│  │ │ VR: 67.8%│   │                                                          │                           │  │
│  │ └──────────┘   │                                                          │                           │  │
│  │                │                                                          │                           │  │
│  └────────────────┴──────────────────────────────────────────────────────────┴───────────────────────────┘  │
│                                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Layout Breakdown — 3-Column Grid System

```css
/* ─────────────────────────────────────────────────────────────────
   Main Page Grid: 3 Columns Layout
   ───────────────────────────────────────────────────────────────── */
.waveform-page {
  display: grid;
  grid-template-columns: 280px 1fr 380px;  /* Left (fixed) | Center (flex) | Right (fixed) */
  grid-template-rows: 100vh;
  height: 100vh;
  overflow: hidden;
  gap: 0;
}

/* ─────────────────────────────────────────────────────────────────
   LEFT SIDEBAR: Beach Ball, Tensor, Controls
   ───────────────────────────────────────────────────────────────── */
.left-sidebar {
  grid-column: 1;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  overflow-y: auto;                      /* Scrollable for many controls */
  overflow-x: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ─────────────────────────────────────────────────────────────────
   CENTER AREA: Toolbar, Waveforms, Residual Plot, Action Bar
   ───────────────────────────────────────────────────────────────── */
.center-content {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
}

.top-toolbar {
  height: 48px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--border);
  padding: 8px 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  overflow-x: auto;                      /* Horizontal scroll if too many controls */
}

.waveform-canvas {
  flex: 5.5;                             /* 55% of available height */
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  background: var(--bg-canvas);
}

.residual-plot {
  flex: 2;                               /* 20% of available height */
  border-top: 1px solid var(--border);
  padding: 16px;
  background: var(--bg-primary);
  min-height: 180px;
}

.action-bar {
  height: 56px;
  background: var(--toolbar-bg);
  border-top: 1px solid var(--border);
  padding: 12px 24px;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;                        /* Prevent shrinking */
}

/* ─────────────────────────────────────────────────────────────────
   RIGHT SIDEBAR: Station Table (Full Height)
   ───────────────────────────────────────────────────────────────── */
.right-sidebar {
  grid-column: 3;
  background: var(--sidebar-bg);
  border-left: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.station-table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.station-table-toolbar {
  height: 48px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--border);
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.station-table-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;                      /* Horizontal scroll for wide columns */
}

.station-table-footer {
  height: 48px;
  background: var(--toolbar-bg);
  border-top: 1px solid var(--border);
  padding: 8px 12px;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-shrink: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
```

### 2.3 Responsive Layout Strategy

#### Desktop (≥ 1440px) — Full 3-Column Layout
```
┌──────────┬────────────────────────────┬──────────┐
│          │  Toolbar                   │          │
│          ├────────────────────────────┤          │
│ Left     │  Waveforms (55%)           │  Right   │
│ Sidebar  ├────────────────────────────┤ Sidebar  │
│ (280px)  │  Residual Plot (20%)       │ (380px)  │
│          ├────────────────────────────┤          │
│ Beach    │  Action Bar                │ Station  │
│ Ball +   │                            │ Table    │
│ Tensor + │                            │ (Full    │
│ Controls │                            │ Height)  │
└──────────┴────────────────────────────┴──────────┘
```

**Grid:** `280px | 1fr (min 600px) | 380px`

---

#### Laptop (1024px - 1439px) — Narrower Sidebars
```
┌────────┬──────────────────────────────┬────────┐
│        │  Toolbar (compact)           │        │
│        ├──────────────────────────────┤        │
│ Left   │  Waveforms (60%)             │ Right  │
│ (220px)│  - Smaller station labels    │ (320px)│
│        ├──────────────────────────────┤        │
│ Smaller│  Residual Plot (15%)         │ Fewer  │
│ Beach  │  - Smaller dots              │ Columns│
│ Ball + ├──────────────────────────────┤ (hide  │
│ Compact│  Action Bar (compact btns)   │ PR,    │
│ Tensor │                              │ Amp)   │
└────────┴──────────────────────────────┴────────┘
```

**Grid:** `220px | 1fr (min 500px) | 320px`

**Changes:**
- Left sidebar width: 280px → 220px
- Right sidebar width: 380px → 320px
- Hide less critical columns (PR, Amp)
- Smaller beach ball (140×140px)
- Compact button text

---

#### Tablet (768px - 1023px) — Collapsible Left Sidebar
```
┌─────────────────────────────────────────┬────────┐
│ [☰] Toolbar (hamburger toggles left)    │        │
├─────────────────────────────────────────┤        │
│ Waveforms (65%)                         │ Right  │
│ - Left sidebar hidden by default        │ (280px)│
│ - Click [☰] to show overlay sidebar     │        │
├─────────────────────────────────────────┤ Station│
│ Residual Plot (15%)                     │ Table  │
│ - Smaller plot, fewer ticks             │ (scroll│
├─────────────────────────────────────────┤ horiz.)│
│ Action Bar (icon buttons + text)        │        │
└─────────────────────────────────────────┴────────┘
```

**Grid:** `1fr (min 400px) | 280px`

**Changes:**
- Left sidebar becomes overlay (position: fixed, z-index: 100)
- Triggered by hamburger menu in toolbar
- Right sidebar fixed 280px with horizontal scroll
- Hide Loc, PR, Amp columns

---

#### Mobile (< 768px) — Tabbed Interface
```
┌─────────────────────────────────────────┐
│ Tabs: [Waveforms][Table][Controls][Info]│
├─────────────────────────────────────────┤
│                                         │
│  Active Tab Content (Full Screen)      │
│                                         │
│  Tab 1: Waveform traces                │
│    - Stacked vertically                │
│    - Full width per station            │
│                                         │
│  Tab 2: Station table                  │
│    - Full width, horizontal scroll     │
│    - Essential columns only            │
│    - Tap row for details               │
│                                         │
│  Tab 3: Controls                       │
│    - Beach ball (full width)           │
│    - Sliders stacked                   │
│    - Big touch targets                 │
│                                         │
│  Tab 4: Info                           │
│    - Tensor matrix                     │
│    - Nodal planes                      │
│    - Derived values                    │
│                                         │
├─────────────────────────────────────────┤
│ [Apply] [Optimize] [Commit]             │
└─────────────────────────────────────────┘
```

**Layout:** Single column, tab navigation

**Changes:**
- NO sidebars, everything in tabs
- Waveforms: 1 station per viewport
- Table: Essential columns (Net, Sta, Dist, Fit)
- Touch-friendly controls (min 44px tap target)

---

### 2.4 Breakpoint Utilities (Tailwind CSS)

```typescript
// tailwind.config.ts - Custom breakpoints
export default {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1440px',
      '3xl': '1920px',
      // Custom breakpoints for waveform page
      'waveform-tablet': '768px',
      'waveform-laptop': '1024px',
      'waveform-desktop': '1440px',
    }
  }
}
```

**Responsive CSS Classes:**

```css
/* Desktop: Full 3-column */
@media (min-width: 1440px) {
  .waveform-page {
    grid-template-columns: 280px 1fr 380px;
  }
  .left-sidebar { display: flex; }
  .right-sidebar { display: flex; }
}

/* Laptop: Narrower sidebars */
@media (min-width: 1024px) and (max-width: 1439px) {
  .waveform-page {
    grid-template-columns: 220px 1fr 320px;
  }
  .beach-ball { width: 140px; height: 140px; }
  .station-table th.optional { display: none; }  /* Hide PR, Amp */
}

/* Tablet: Left overlay + Right sidebar */
@media (min-width: 768px) and (max-width: 1023px) {
  .waveform-page {
    grid-template-columns: 1fr 280px;
  }
  .left-sidebar {
    position: fixed;
    left: -280px;
    transition: left 0.3s ease;
    z-index: 100;
  }
  .left-sidebar.open {
    left: 0;
  }
}

/* Mobile: Tabs only */
@media (max-width: 767px) {
  .waveform-page {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
  .left-sidebar { display: none; }
  .right-sidebar { display: none; }
  .tab-navigation { display: flex; }
}
```

### 2.5 Component Dimensions (Reference dari Screenshot)

| Component | Desktop Width | Desktop Height | Position | Notes |
|-----------|---------------|----------------|----------|-------|
| **Page Grid** | 100vw | 100vh | - | 3-column layout |
| **Left Sidebar** | 280px fixed | 100vh | Column 1 | Scrollable overflow-y |
| **Center Area** | Flexible (1fr) | 100vh | Column 2 | Min 600px width |
| **Right Sidebar** | 380px fixed | 100vh | Column 3 | Station table container |
| | | | | |
| **Left Sidebar Components:** | | | | |
| Beach Ball | 180×180px | Fixed aspect | Top of sidebar | Interactive 3D sphere |
| Tensor Matrix | 240px | Auto (~120px) | Below beach ball | 2×3 grid layout |
| Synthetics Info | 240px | Auto (~60px) | Mid sidebar | Archive + Model |
| Source Parameters | 240px | Auto (~180px) | Mid sidebar | Depth/Lat/Lon sliders |
| Nodal Planes | 240px | Auto (~140px) | Mid sidebar | NP1/NP2 display |
| Derived Values | 240px | Auto (~160px) | Bottom sidebar | Mw, DC%, CLVD%, VR |
| | | | | |
| **Center Area Components:** | | | | |
| Top Toolbar | 100% | 48px | Top of center | Fixed height, flex wrap |
| Waveform Canvas | 100% | ~55% center area | Below toolbar | Virtual scroll container |
| — Station Row | 100% | 80-120px | In canvas | Dynamic height |
| — Station Header | 100% | 28px | Row top | Name, dist, fit% |
| — Trace Area | 100% | 60px per comp | Row body | Z/R/T components |
| Residual Plot | 100% | ~20% center area | Below waveforms | Minimum 180px |
| Action Bar | 100% | 56px | Bottom of center | Fixed bottom |
| | | | | |
| **Right Sidebar Components:** | | | | |
| Table Toolbar | 380px | 48px | Top of sidebar | Filter controls |
| Station Table | 380px | Flex (fill) | Middle | Scrollable tbody |
| — Table Header | 380px | 36px | Table top | Sortable columns |
| — Table Row | 380px | 32px | In tbody | Fixed row height |
| Table Footer | 380px | 48px | Bottom of sidebar | Summary stats |
| | | | | |
| **Column Widths (Station Table):** | | | | |
| Checkbox [☑] | 40px | - | - | Toggle selection |
| Used | 50px | - | - | Checkmark ✓ |
| Net | 50px | - | - | Network code |
| Sta | 80px | - | - | Station name |
| Loc | 40px | - | - | Location code |
| Cha | 50px | - | - | Channel code |
| Dist° | 60px | - | - | Distance (decimal) |
| Az° | 60px | - | - | Azimuth |
| Wgt | 50px | - | - | Weight (editable) |
| Fit% | 60px | - | - | Fit percentage |
| Amp | 70px | - | - | Amplitude |
| Ms(BB) | 60px | - | - | Magnitude |
| PR | 40px | - | - | Polarity residual |

### 2.6 Z-Index Layering

```typescript
export const Z_INDEX = {
  base: 1,
  leftSidebar: 10,
  rightSidebar: 10,
  centerContent: 5,
  toolbar: 20,
  stationRow: 3,
  waveformTrace: 3,
  signalWindow: 2,         // Behind traces
  tooltip: 100,
  modal: 1000,             // Depth search dialog
  overlayMenu: 50,         // Dropdown menus
  hamburgerMenu: 150,      // Mobile/tablet left sidebar overlay
  loadingOverlay: 999,
  toast: 1100              // Success/error notifications
} as const
```

---

## 3. Component Breakdown

### 3.1 Component Tree (3-Column Layout Structure)

```
WaveformPage/
├── WaveformPageLayout.tsx               # Main layout container (3-column grid)
│
├── LeftSidebar/                         # Column 1: Left sidebar (280px fixed)
│   ├── LeftSidebarContainer.tsx        # Sidebar wrapper with scroll
│   ├── BeachBall3DPanel.tsx            # Reuse from MomentTensorPage
│   ├── TensorMatrixPanel.tsx           # 3×3 moment tensor display
│   ├── SyntheticsInfoPanel.tsx         # Archive + Model info
│   ├── SourceParametersPanel.tsx       # Depth/Lat/Lon sliders
│   ├── NodalPlanesPanel.tsx            # NP1/NP2 strike/dip/rake
│   └── DerivedValuesPanel.tsx          # Magnitude, exponent, etc.
│
├── CenterContent/                       # Column 2: Center area (flexible width)
│   ├── TopToolbar/
│   │   ├── WaveformToolbar.tsx         # Main toolbar container
│   │   ├── NormalizationControls.tsx   # [Norm. trace] [Norm. single] [All]
│   │   ├── ProcessingProfileSelect.tsx # [MS-MLS ▾] dropdown
│   │   ├── FrequencyFilterControl.tsx  # [Filter 🔍] button + modal
│   │   ├── DepthSearchControl.tsx      # [Grid] [<20,200,400,50>] inputs
│   │   └── ToolbarCheckboxes.tsx       # [☑] Shift traces, etc.
│   │
│   ├── WaveformCanvas/
│   │   ├── WaveformViewer.tsx          # Main waveform container
│   │   ├── VirtualWaveformViewer.tsx   # Performance: virtual scrolling
│   │   ├── StationRow/
│   │   │   ├── StationRow.tsx          # Per-station row wrapper
│   │   │   ├── StationHeader.tsx       # Station name, distance, fit%
│   │   │   ├── ComponentTraceGroup.tsx # Z/R/T component group
│   │   │   ├── ComponentTrace.tsx      # Single component wrapper
│   │   │   │   ├── SignalWindow.tsx    # Colored time window box (P/S/Rayleigh/Love)
│   │   │   │   ├── ObservedTrace.tsx   # Black line (SVG/Canvas)
│   │   │   │   ├── SyntheticTrace.tsx  # Red line (SVG/Canvas)
│   │   │   │   └── CanvasTrace.tsx     # Canvas renderer (>5000 samples)
│   │   │   └── TraceControls.tsx       # Mini weight/shift controls
│   │   └── WaveformLegend.tsx          # Obs/Syn color legend
│   │
│   ├── ResidualScatterPlot/
│   │   ├── ResidualPlot.tsx            # Distance vs Residual plot
│   │   ├── PlotAxes.tsx                # X/Y axes rendering
│   │   ├── PlotPoints.tsx              # Station dots (color-coded)
│   │   └── PlotTooltip.tsx             # Hover tooltip
│   │
│   └── ActionBar/
│       ├── ActionBarContainer.tsx      # Bottom action bar wrapper
│       ├── ApplyButton.tsx             # Apply current settings
│       ├── DepthSearchButton.tsx       # Run depth search modal
│       ├── OptimizeButton.tsx          # Re-run inversion
│       ├── CommitButton.tsx            # Save & commit solution
│       └── StatusInfo.tsx              # Last update, VR, RMS info
│
└── RightSidebar/                        # Column 3: Right sidebar (380px fixed)
    ├── RightSidebarContainer.tsx       # Sidebar wrapper
    ├── StationTable/
    │   ├── StationTableToolbar.tsx     # Filter controls (distance groups)
    │   ├── StationTable.tsx            # Main table component
    │   ├── StationTableHeader.tsx      # Sortable column headers
    │   ├── StationTableBody.tsx        # Tbody wrapper (virtual scroll)
    │   ├── StationTableRow.tsx         # Per-station data row
    │   ├── EditableCell.tsx            # Double-click to edit weight
    │   ├── StationTableFooter.tsx      # Summary stats (selected/total)
    │   └── sorting.ts                  # Sorting logic utility
    └── BulkActions.tsx                 # Select All / Deselect All buttons
```

### 3.2 Component Hierarchy Visualization

```
┌────────────────────────────────────────────────────────┐
│ WaveformPageLayout                                     │
│ ┌──────────┬──────────────────────────┬──────────────┐│
│ │ Left     │ Center                   │ Right        ││
│ │ Sidebar  │ Content                  │ Sidebar      ││
│ │          │                          │              ││
│ │ Beach    │ ┌──────────────────────┐ │ Table        ││
│ │ Ball     │ │ TopToolbar           │ │ Toolbar      ││
│ │          │ └──────────────────────┘ │              ││
│ │ Tensor   │ ┌──────────────────────┐ │ ┌──────────┐ ││
│ │ Matrix   │ │ WaveformCanvas       │ │ │ Table    │ ││
│ │          │ │ ├─ StationRow        │ │ │ Header   │ ││
│ │ Controls │ │ ├─ StationRow        │ │ ├──────────┤ ││
│ │          │ │ └─ StationRow        │ │ │ Rows     │ ││
│ │ Source   │ └──────────────────────┘ │ │ (scroll) │ ││
│ │ Params   │ ┌──────────────────────┐ │ ├──────────┤ ││
│ │          │ │ ResidualPlot         │ │ │ Footer   │ ││
│ │ Nodal    │ └──────────────────────┘ │ └──────────┘ ││
│ │ Planes   │ ┌──────────────────────┐ │              ││
│ │          │ │ ActionBar            │ │              ││
│ │ Derived  │ └──────────────────────┘ │              ││
│ │ Values   │                          │              ││
│ └──────────┴──────────────────────────┴──────────────┘│
└────────────────────────────────────────────────────────┘
```

---

## 4. Development Timeline

### **Phase 1: Foundation Setup** (3-4 hari)

#### Day 1-2: Data Layer & Store
- [ ] **Task 1.1**: Define TypeScript types di `seismology.ts`
  - `ComponentWaveform`, `StationWaveformData`, `WaveformResponse`
  - `ProcessingContext`, `StationMetadata`, `MomentTensorSolution`
  - Distance group types (`local`, `regional`, `teleseismic`)
- [ ] **Task 1.2**: Create `waveformStore.ts` (Zustand)
  - State: `jobId`, `context`, `observedWaveforms`, `syntheticWaveforms`
  - Actions: `loadWaveforms`, `toggleStation`, `updateWeight`
- [ ] **Task 1.3**: Extend platform API (`src/lib/platform/index.ts`)
  - `platform.getJobContext(jobId)`
  - `platform.getWaveforms(jobId, kind)`
  - `platform.updateStationWeights(jobId, updates)`
- [ ] **Task 1.4**: Create mock data generators
  - `mockProcessingContext()` in `src/lib/mock/waveform-mock.ts`
  - `mockWaveformData()` with realistic synthetic waveforms

**Deliverable**: State management + API layer ready, tested with mock data

---

#### Day 3-4: Layout & Routing
- [ ] **Task 2.1**: Setup routing di `App.tsx`
  - Route: `/waveform/:eventId`
  - Protected route check (require valid jobId)
- [ ] **Task 2.2**: Create `WaveformPageLayout.tsx`
  - **3-column responsive grid** (Tailwind CSS)
  - Left sidebar (280px fixed), Center area (flexible), Right sidebar (380px fixed)
  - Grid template: `grid-template-columns: 280px 1fr 380px`
- [ ] **Task 2.3**: Create sidebar skeleton components
  - `LeftSidebarContainer.tsx` — Empty placeholders untuk BeachBall, Tensor, Controls
  - `RightSidebarContainer.tsx` — Empty placeholder untuk Station Table
- [ ] **Task 2.4**: Navigation flow dari `MomentTensorPage`
  - Button "Waveforms" mengarah ke `/waveform/:eventId`
  - Trigger `waveformStore.loadWaveforms(jobId)` saat mount

**Deliverable**: 3-column page layout tersusun, navigasi berfungsi, store terisi data mock

---

### **Phase 2: Waveform Viewer Core** (3-4 hari)

#### Day 5-6: Waveform Canvas — Basic Rendering
- [ ] **Task 3.1**: `WaveformViewer.tsx` — Container
  - Scroll container untuk multiple station rows
  - Virtual scrolling setup (jika > 50 stations)
- [ ] **Task 3.2**: `StationRow.tsx` — Row layout
  - Header: Station name, distance, azimuth, fit%
  - Body: Z/R/T component traces (horizontal layout)
  - Color-coded border (orange/green/blue by distance group)
- [ ] **Task 3.3**: `ComponentTrace.tsx` — SVG trace rendering
  - **ObservedTrace**: Black line, lineWidth 1.5px
  - **SyntheticTrace**: Red line, lineWidth 1px, opacity 0.8
  - X-axis: Time (0-600s typical), Y-axis: Amplitude (auto-scaled)
  - Grid lines: Every 100s vertical, 0 horizontal
- [ ] **Task 3.4**: Waveform normalization
  - Per-station max amplitude normalization
  - Toggle "Norm. trace" vs "Norm. single" (toolbar)

**Deliverable**: Waveform traces visible, observed vs synthetic overlay works

---

#### Day 7-8: Waveform Canvas — Interactivity
- [ ] **Task 4.1**: `WaveformToolbar.tsx`
  - Normalization toggle buttons
  - Processing profile dropdown (MS-MLS, QCMT_R, etc.)
  - Filter frequency controls (fmin/fmax sliders)
  - "Add/hide" stations dropdown
  - "Apply solution" button
- [ ] **Task 4.2**: Signal time windows (colored boxes)
  - Parse time window data dari backend
  - Render colored rectangles di belakang traces
  - Color coding: Orange (P), Cyan (S), Green (Rayleigh), Lime (Love)
- [ ] **Task 4.3**: Expandable station rows
  - Click station header to expand/collapse
  - Expanded view: Show individual Z/R/T traces side-by-side
  - Collapsed view: Show combined trace or Z only
- [ ] **Task 4.4**: Hover tooltip
  - Show exact amplitude value + time on hover
  - Station info (distance, azimuth, SNR)

**Deliverable**: Interactive waveform viewer dengan signal windows + expand/collapse

---

### **Phase 3: Station Table & Controls** (2-3 hari)

#### Day 9-10: Station Table
- [ ] **Task 5.1**: `StationTable.tsx` — Table component
  - Columns: [☑] Used | Net | Sta | Cha | Dist° | Az° | Wgt | Fit% | Amp | Ms(BB)
  - Sortable columns (click header to sort)
  - Row selection (toggle checkbox)
- [ ] **Task 5.2**: Color-coded rows
  - Background color by distance group (subtle orange/green/blue tint)
  - Bold text for selected stations
  - Strikethrough for disabled stations
- [ ] **Task 5.3**: Editable cells
  - Double-click Weight column to edit (0.0-1.0)
  - Inline editing dengan validation
  - Auto-save to store + backend API call
- [ ] **Task 5.4**: Table toolbar
  - Filter by distance group checkboxes
  - "Select All" / "Deselect All" bulk actions
  - "Enable All" / "Disable All" actions
- [ ] **Task 5.5**: Table footer
  - Summary: "Selected 12/45 stations"
  - Total fit: "Average Fit: 67.3%"

**Deliverable**: Functional station table dengan sort, filter, edit

---

#### Day 11: Left Panel — Controls & Visualization
- [ ] **Task 6.1**: Reuse `BeachBall3D` component
  - Import from `src/components/BeachBall/BeachBall2D.tsx`
  - Pass current moment tensor dari `waveformStore.context.best_solution`
- [ ] **Task 6.2**: `TensorMatrixPanel.tsx`
  - Display 3×3 moment tensor values
  - Format: Scientific notation (1.23E+17)
  - Labels: Mrr, Mtt, Mpp, Mrt, Mrp, Mtp
- [ ] **Task 6.3**: `SourceParametersPanel.tsx`
  - Depth slider (0-200 km)
  - Latitude input (decimal degrees)
  - Longitude input (decimal degrees)
  - Auto-update on slider change (debounced)
- [ ] **Task 6.4**: `NodalPlanesPanel.tsx`
  - Display NP1: Strike/Dip/Rake
  - Display NP2: Strike/Dip/Rake
  - Calculate from moment tensor (use lib/seismology functions)
- [ ] **Task 6.5**: `DerivedValuesPanel.tsx`
  - Magnitude Mw
  - Scalar moment exponent (1E)
  - Variance reduction %
  - DC%, CLVD%, ISO%

**Deliverable**: Left panel lengkap dengan controls + info panels

---

### **Phase 4: Advanced Features** (2-3 hari)

#### Day 12-13: Residual Plot & Advanced Controls
- [ ] **Task 7.1**: `ResidualScatterPlot.tsx`
  - X-axis: Distance (0-24°)
  - Y-axis: Residual (-2 to +2 seconds)
  - Plot points per station (colored by distance group)
  - Horizontal line at y=0 (zero residual)
  - Hover tooltip: Station name + exact residual value
- [ ] **Task 7.2**: Frequency filter controls
  - Fmin slider (0.01 - 0.1 Hz)
  - Fmax slider (0.05 - 0.2 Hz)
  - Live preview (re-fetch waveforms on change)
  - Preset buttons: "Teleseismic", "Regional", "Local"
- [ ] **Task 7.3**: Time shift adjustment
  - Per-station time shift slider (-5s to +5s)
  - Visual indicator: Shift synthetic trace left/right
  - Auto-optimize button: Find best time shift automatically
- [ ] **Task 7.4**: Processing profile dropdown
  - Options: MS-MLS, QCMT_R, QCMT_S, AUTO
  - Change inversion method + re-run
  - Show loading indicator during re-processing

**Deliverable**: Advanced controls berfungsi, residual plot visible

---

#### Day 14: Depth Search & Optimization
- [ ] **Task 8.1**: `DepthSearchButton.tsx`
  - Modal dialog: Depth range (min/max km), step size
  - Trigger backend API: `POST /jobs/{jobId}/depth-search`
  - Progress bar: Show current depth being tested
  - Result: Display variance reduction curve (depth vs VR)
  - Auto-select best depth
- [ ] **Task 8.2**: `OptimizeButton.tsx`
  - Trigger backend API: `POST /jobs/{jobId}/optimize`
  - Re-run inversion dengan current station selection
  - Update waveformStore dengan new solution
  - Show success toast notification
- [ ] **Task 8.3**: `CommitButton.tsx`
  - Validate: Minimal station count (3+), fit > 50%
  - Trigger backend API: `POST /jobs/{jobId}/commit`
  - Navigate back to EventsPage atau MomentTensorPage
  - Show success notification

**Deliverable**: Workflow actions (depth search, optimize, commit) berfungsi

---

### **Phase 5: Polish & Testing** (2 hari)

#### Day 15: Performance Optimization
- [ ] **Task 9.1**: Virtual scrolling untuk waveform viewer
  - Render hanya 10-20 visible rows (react-window atau react-virtual)
  - Lazy load waveform data saat scroll
- [ ] **Task 9.2**: Canvas optimization
  - Switch SVG → Canvas untuk traces > 5000 samples
  - WebWorker untuk waveform preprocessing (downsampling)
- [ ] **Task 9.3**: Debounce expensive operations
  - Frequency slider change (500ms debounce)
  - Time shift slider (300ms debounce)
  - Station weight edit (1s debounce)

**Deliverable**: Smooth performance dengan 50+ stations

---

#### Day 16: Testing & Bug Fixes
- [ ] **Task 10.1**: Unit tests
  - `waveformStore.test.ts`: Test store actions
  - `ComponentTrace.test.tsx`: Test trace rendering logic
  - `StationTable.test.tsx`: Test sorting/filtering
- [ ] **Task 10.2**: Integration tests
  - Full workflow: Load page → Edit weight → Optimize → Commit
  - Test dengan mock API responses
- [ ] **Task 10.3**: Visual regression tests
  - Screenshot tests dengan Playwright
  - Compare waveform rendering consistency
- [ ] **Task 10.4**: Accessibility (A11y)
  - Keyboard navigation: Tab through station table
  - ARIA labels untuk interactive controls
  - Screen reader testing

**Deliverable**: Test coverage > 70%, zero critical bugs

---

## 5. Implementation Details

### 5.1 Waveform Rendering Strategy

#### SVG vs Canvas Decision Tree
```typescript
function selectRenderer(sampleCount: number): 'svg' | 'canvas' {
  if (sampleCount < 5000) return 'svg'
  return 'canvas'
}
```

#### Canvas Implementation Pattern
```typescript
// src/components/Waveform/CanvasTrace.tsx
import { useEffect, useRef } from 'react'

interface CanvasTraceProps {
  data: number[]
  color: string
  width: number
  height: number
}

export function CanvasTrace({ data, color, width, height }: CanvasTraceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Find amplitude range
    const max = Math.max(...data.map(Math.abs))
    
    // Draw trace
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    
    data.forEach((amp, i) => {
      const x = (i / data.length) * width
      const y = height / 2 - (amp / max) * (height * 0.4)
      
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    
    ctx.stroke()
  }, [data, color, width, height])
  
  return <canvas ref={canvasRef} width={width} height={height} />
}
```

---

### 5.2 Color Coding System

#### Distance Group Colors (Match SCMTV)
```typescript
export const DISTANCE_COLORS = {
  local: {
    primary: '#ff8c42',      // Orange
    light: '#ffb380',
    dark: '#e67a2e',
    bg: '#fff3e6'            // Subtle background
  },
  regional: {
    primary: '#4ade80',      // Green
    light: '#86efac',
    dark: '#22c55e',
    bg: '#f0fdf4'
  },
  teleseismic: {
    primary: '#60a5fa',      // Blue
    light: '#93c5fd',
    dark: '#3b82f6',
    bg: '#eff6ff'
  }
} as const
```

#### Phase Color Coding (Signal Windows)
```typescript
export const PHASE_COLORS = {
  P: '#ff8c42',       // Orange
  S: '#00bcd4',       // Cyan
  Rayleigh: '#4ade80', // Green
  Love: '#c0ff3e'     // Lime
} as const
```

#### Component Color Coding (Z/R/T)
```typescript
export const COMPONENT_COLORS = {
  Z: '#1f2937',       // Dark gray (vertical)
  R: '#dc2626',       // Red (radial)
  T: '#2563eb'        // Blue (transverse)
} as const
```

---

### 5.3 Station Table Sorting Logic

```typescript
// src/components/StationTable/sorting.ts
import type { StationWaveformData } from '@/types/seismology'

export type SortColumn = 'distance' | 'azimuth' | 'weight' | 'fit' | 'network' | 'station'
export type SortDirection = 'asc' | 'desc'

export function sortStations(
  stations: StationWaveformData[],
  column: SortColumn,
  direction: SortDirection
): StationWaveformData[] {
  const sorted = [...stations].sort((a, b) => {
    let compare = 0
    
    switch (column) {
      case 'distance':
        compare = a.distance_deg - b.distance_deg
        break
      case 'azimuth':
        compare = a.azimuth_deg - b.azimuth_deg
        break
      case 'weight':
        const weightA = a.components[0]?.weight ?? 0
        const weightB = b.components[0]?.weight ?? 0
        compare = weightA - weightB
        break
      case 'fit':
        const fitA = a.components[0]?.fit_percent ?? 0
        const fitB = b.components[0]?.fit_percent ?? 0
        compare = fitA - fitB
        break
      case 'network':
        compare = a.network.localeCompare(b.network)
        break
      case 'station':
        compare = a.station.localeCompare(b.station)
        break
    }
    
    return direction === 'asc' ? compare : -compare
  })
  
  return sorted
}
```

---

### 5.4 Waveform Normalization

#### Per-Station Normalization (Default)
```typescript
function normalizePerStation(data: number[]): number[] {
  const max = Math.max(...data.map(Math.abs))
  return data.map(amp => amp / max)
}
```

#### Global Normalization (All Stations)
```typescript
function normalizeGlobal(allData: number[][]): number[][] {
  const globalMax = Math.max(...allData.flat().map(Math.abs))
  return allData.map(data => data.map(amp => amp / globalMax))
}
```

#### Component-wise Normalization (Z/R/T separate)
```typescript
function normalizeByComponent(
  components: Map<'Z' | 'R' | 'T', number[]>
): Map<'Z' | 'R' | 'T', number[]> {
  const normalized = new Map()
  
  for (const [comp, data] of components) {
    const max = Math.max(...data.map(Math.abs))
    normalized.set(comp, data.map(amp => amp / max))
  }
  
  return normalized
}
```

---

### 5.5 Virtual Scrolling Implementation

```typescript
// src/components/Waveform/VirtualWaveformViewer.tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function VirtualWaveformViewer({ stations }: { stations: StationWaveformData[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: stations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated row height in pixels
    overscan: 5              // Render 5 rows above/below viewport
  })
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const station = stations[virtualRow.index]
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <StationRow station={station} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests (Vitest)

```typescript
// waveformStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWaveformStore } from '@/stores/waveformStore'

describe('WaveformStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { reset } = useWaveformStore.getState()
    reset()
  })
  
  it('should load waveforms successfully', async () => {
    const { result } = renderHook(() => useWaveformStore())
    
    await act(async () => {
      await result.current.loadWaveforms('test_job_123')
    })
    
    expect(result.current.jobId).toBe('test_job_123')
    expect(result.current.observedWaveforms.size).toBeGreaterThan(0)
  })
  
  it('should toggle station selection', () => {
    const { result } = renderHook(() => useWaveformStore())
    
    act(() => {
      result.current.toggleStation('IA.AAA..BH', true)
    })
    
    expect(result.current.selectedStations.has('IA.AAA..BH')).toBe(true)
  })
})
```

### 6.2 Component Tests (React Testing Library)

```typescript
// StationTable.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StationTable } from '@/components/StationTable/StationTable'
import { mockStations } from '@/lib/mock/waveform-mock'

describe('StationTable', () => {
  it('should render all stations', () => {
    render(<StationTable stations={mockStations} />)
    
    expect(screen.getByText('IA')).toBeInTheDocument()
    expect(screen.getByText('AAA')).toBeInTheDocument()
  })
  
  it('should sort by distance when column clicked', () => {
    render(<StationTable stations={mockStations} />)
    
    const distColumn = screen.getByText('Dist°')
    fireEvent.click(distColumn)
    
    const rows = screen.getAllByRole('row')
    // First data row should have smallest distance
    expect(rows[1]).toHaveTextContent('0.9')
  })
})
```

### 6.3 E2E Tests (Playwright)

```typescript
// waveform-page.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Waveform Page', () => {
  test('should load waveform page and display traces', async ({ page }) => {
    await page.goto('/waveform/bmg2026abcd')
    
    // Wait for waveforms to load
    await expect(page.locator('.waveform-canvas')).toBeVisible()
    
    // Check that station rows are visible
    const stationRows = page.locator('.station-row')
    await expect(stationRows).toHaveCount(12)
  })
  
  test('should toggle station on/off in table', async ({ page }) => {
    await page.goto('/waveform/bmg2026abcd')
    
    // Click checkbox in first row
    const checkbox = page.locator('table tbody tr:first-child input[type="checkbox"]')
    await checkbox.click()
    
    // Station should be deselected
    await expect(checkbox).not.toBeChecked()
  })
  
  test('should commit solution successfully', async ({ page }) => {
    await page.goto('/waveform/bmg2026abcd')
    
    // Click Commit button
    await page.click('button:has-text("Commit")')
    
    // Should navigate back to events page
    await expect(page).toHaveURL('/events')
    
    // Success toast should appear
    await expect(page.locator('.toast-success')).toBeVisible()
  })
})
```

---

## 7. File Checklist

### Files to Create (62 total)

#### Types & Models (3 files)
- [ ] `src/types/seismology.ts` — Add waveform types
- [ ] `src/types/waveform.ts` — Waveform-specific types
- [ ] `src/lib/mock/waveform-mock.ts` — Mock data generators

#### Store & API (3 files)
- [ ] `src/stores/waveformStore.ts` — Zustand store
- [ ] `src/lib/platform/index.ts` — Extend platform API
- [ ] `src/lib/api/automt-client.ts` — Extend API client

#### Page (1 file)
- [ ] `src/pages/WaveformPage.tsx` — Main page component

#### Layout (1 file)
- [ ] `src/components/Waveform/WaveformPageLayout.tsx` — 3-column grid layout

#### Left Sidebar Components (7 files)
- [ ] `src/components/Waveform/LeftSidebar/LeftSidebarContainer.tsx`
- [ ] `src/components/Waveform/LeftSidebar/BeachBall3DPanel.tsx`
- [ ] `src/components/Waveform/LeftSidebar/TensorMatrixPanel.tsx`
- [ ] `src/components/Waveform/LeftSidebar/SyntheticsInfoPanel.tsx`
- [ ] `src/components/Waveform/LeftSidebar/SourceParametersPanel.tsx`
- [ ] `src/components/Waveform/LeftSidebar/NodalPlanesPanel.tsx`
- [ ] `src/components/Waveform/LeftSidebar/DerivedValuesPanel.tsx`

#### Top Toolbar Components (6 files)
- [ ] `src/components/Waveform/TopToolbar/WaveformToolbar.tsx`
- [ ] `src/components/Waveform/TopToolbar/NormalizationControls.tsx`
- [ ] `src/components/Waveform/TopToolbar/ProcessingProfileSelect.tsx`
- [ ] `src/components/Waveform/TopToolbar/FrequencyFilterControl.tsx`
- [ ] `src/components/Waveform/TopToolbar/DepthSearchControl.tsx`
- [ ] `src/components/Waveform/TopToolbar/ToolbarCheckboxes.tsx`

#### Waveform Canvas Components (14 files)
- [ ] `src/components/Waveform/WaveformCanvas/WaveformViewer.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/VirtualWaveformViewer.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/StationRow/StationRow.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/StationRow/StationHeader.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/StationRow/ComponentTraceGroup.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/StationRow/ComponentTrace.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/StationRow/SignalWindow.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/StationRow/ObservedTrace.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/StationRow/SyntheticTrace.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/StationRow/CanvasTrace.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/StationRow/TraceControls.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/WaveformLegend.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/EmptyState.tsx`
- [ ] `src/components/Waveform/WaveformCanvas/LoadingSpinner.tsx`

#### Residual Plot Components (4 files)
- [ ] `src/components/Waveform/ResidualPlot/ResidualPlot.tsx`
- [ ] `src/components/Waveform/ResidualPlot/PlotAxes.tsx`
- [ ] `src/components/Waveform/ResidualPlot/PlotPoints.tsx`
- [ ] `src/components/Waveform/ResidualPlot/PlotTooltip.tsx`

#### Right Sidebar - Station Table Components (9 files)
- [ ] `src/components/Waveform/RightSidebar/RightSidebarContainer.tsx`
- [ ] `src/components/Waveform/RightSidebar/StationTable/StationTableToolbar.tsx`
- [ ] `src/components/Waveform/RightSidebar/StationTable/StationTable.tsx`
- [ ] `src/components/Waveform/RightSidebar/StationTable/StationTableHeader.tsx`
- [ ] `src/components/Waveform/RightSidebar/StationTable/StationTableBody.tsx`
- [ ] `src/components/Waveform/RightSidebar/StationTable/StationTableRow.tsx`
- [ ] `src/components/Waveform/RightSidebar/StationTable/EditableCell.tsx`
- [ ] `src/components/Waveform/RightSidebar/StationTable/StationTableFooter.tsx`
- [ ] `src/components/Waveform/RightSidebar/StationTable/sorting.ts` — Sorting logic

#### Action Bar Components (5 files)
- [ ] `src/components/Waveform/ActionBar/ActionBarContainer.tsx`
- [ ] `src/components/Waveform/ActionBar/ApplyButton.tsx`
- [ ] `src/components/Waveform/ActionBar/DepthSearchButton.tsx`
- [ ] `src/components/Waveform/ActionBar/OptimizeButton.tsx`
- [ ] `src/components/Waveform/ActionBar/CommitButton.tsx`

#### Utilities (4 files)
- [ ] `src/lib/waveform/normalization.ts` — Normalization functions
- [ ] `src/lib/waveform/colors.ts` — Color coding constants
- [ ] `src/lib/waveform/calculations.ts` — Residual, fit%, etc.
- [ ] `src/lib/waveform/formatters.ts` — Number formatting helpers

#### Tests (10 files)
- [ ] `src/stores/waveformStore.test.ts`
- [ ] `src/components/Waveform/WaveformCanvas/ComponentTrace.test.tsx`
- [ ] `src/components/Waveform/RightSidebar/StationTable/StationTable.test.tsx`
- [ ] `src/lib/waveform/normalization.test.ts`
- [ ] `src/lib/waveform/calculations.test.ts`
- [ ] `e2e/waveform-page.spec.ts`
- [ ] `e2e/waveform-page-interactions.spec.ts`
- [ ] `e2e/waveform-page-visual.spec.ts`
- [ ] `e2e/waveform-page-a11y.spec.ts`
- [ ] `e2e/waveform-page-responsive.spec.ts`

#### Styles (2 files)
- [ ] `src/components/Waveform/waveform.css` — Custom CSS for canvas
- [ ] `src/components/Waveform/waveform-responsive.css` — Responsive breakpoints

---

### File Organization Summary

```
src/
├── components/
│   └── Waveform/
│       ├── WaveformPageLayout.tsx              # Main 3-column grid
│       ├── waveform.css                        # Custom styles
│       ├── waveform-responsive.css             # Breakpoints
│       │
│       ├── LeftSidebar/                        # 7 files
│       │   ├── LeftSidebarContainer.tsx
│       │   ├── BeachBall3DPanel.tsx
│       │   ├── TensorMatrixPanel.tsx
│       │   ├── SyntheticsInfoPanel.tsx
│       │   ├── SourceParametersPanel.tsx
│       │   ├── NodalPlanesPanel.tsx
│       │   └── DerivedValuesPanel.tsx
│       │
│       ├── TopToolbar/                         # 6 files
│       │   ├── WaveformToolbar.tsx
│       │   ├── NormalizationControls.tsx
│       │   ├── ProcessingProfileSelect.tsx
│       │   ├── FrequencyFilterControl.tsx
│       │   ├── DepthSearchControl.tsx
│       │   └── ToolbarCheckboxes.tsx
│       │
│       ├── WaveformCanvas/                     # 14 files
│       │   ├── WaveformViewer.tsx
│       │   ├── VirtualWaveformViewer.tsx
│       │   ├── WaveformLegend.tsx
│       │   ├── EmptyState.tsx
│       │   ├── LoadingSpinner.tsx
│       │   └── StationRow/
│       │       ├── StationRow.tsx
│       │       ├── StationHeader.tsx
│       │       ├── ComponentTraceGroup.tsx
│       │       ├── ComponentTrace.tsx
│       │       ├── SignalWindow.tsx
│       │       ├── ObservedTrace.tsx
│       │       ├── SyntheticTrace.tsx
│       │       ├── CanvasTrace.tsx
│       │       └── TraceControls.tsx
│       │
│       ├── ResidualPlot/                       # 4 files
│       │   ├── ResidualPlot.tsx
│       │   ├── PlotAxes.tsx
│       │   ├── PlotPoints.tsx
│       │   └── PlotTooltip.tsx
│       │
│       ├── RightSidebar/                       # 9 files
│       │   ├── RightSidebarContainer.tsx
│       │   └── StationTable/
│       │       ├── StationTableToolbar.tsx
│       │       ├── StationTable.tsx
│       │       ├── StationTableHeader.tsx
│       │       ├── StationTableBody.tsx
│       │       ├── StationTableRow.tsx
│       │       ├── EditableCell.tsx
│       │       ├── StationTableFooter.tsx
│       │       └── sorting.ts
│       │
│       └── ActionBar/                          # 5 files
│           ├── ActionBarContainer.tsx
│           ├── ApplyButton.tsx
│           ├── DepthSearchButton.tsx
│           ├── OptimizeButton.tsx
│           └── CommitButton.tsx
│
├── lib/
│   ├── mock/
│   │   └── waveform-mock.ts                    # Mock data generators
│   └── waveform/                               # 4 utility files
│       ├── normalization.ts
│       ├── colors.ts
│       ├── calculations.ts
│       └── formatters.ts
│
├── pages/
│   └── WaveformPage.tsx                        # Main page entry
│
├── stores/
│   └── waveformStore.ts                        # Zustand state
│
└── types/
    ├── seismology.ts                           # Extended types
    └── waveform.ts                             # Waveform-specific types
```

---

## 8. Dependencies

### Additional npm Packages Required

```bash
npm install @tanstack/react-virtual   # Virtual scrolling
npm install d3-scale d3-axis          # Residual plot axes (optional)
npm install react-hook-form           # Form management (editable cells)
npm install zod                       # Validation schemas
```

### Already Installed (Reuse)
- `zustand` — State management ✅
- `@tanstack/react-query` — Server state (future) ✅
- `tailwindcss` — Styling ✅
- `vitest` — Unit testing ✅
- `@playwright/test` — E2E testing ✅

---

## 9. Next Steps After Phase 5

### Future Enhancements (Post-MVP)

1. **Green's Functions Visualization**
   - Overlay Green's functions traces di bawah synthetic
   - Toggle visibility per GF component

2. **Waveform Export**
   - Export to SAC format
   - Export to MiniSEED format
   - Export PNG screenshots

3. **Advanced Filtering**
   - Butterworth filter controls
   - Bandpass/Highpass/Lowpass presets
   - Real-time filter preview

4. **Collaborative Editing**
   - WebSocket sync for multi-user editing
   - Show who's editing which station (presence indicators)

5. **Machine Learning Integration**
   - Auto-detect signal windows using CNN
   - Suggest optimal frequency bands per station
   - Anomaly detection (bad waveform quality alerts)

---

## 10. Success Metrics

### Definition of Done (DoD)

- [ ] User dapat navigate dari MomentTensorPage → WaveformPage
- [ ] Waveform traces (observed vs synthetic) ter-render dengan benar
- [ ] Station table sortable, filterable, dan editable
- [ ] Toggle station on/off updates waveform viewer real-time
- [ ] Residual scatter plot displays correct data
- [ ] Frequency filter controls update waveforms (via API)
- [ ] Depth search modal berfungsi, menampilkan hasil
- [ ] Commit button menyimpan solution ke backend
- [ ] Performance: Render 50+ stations < 2 detik
- [ ] Test coverage ≥ 70%
- [ ] Zero critical accessibility (a11y) violations
- [ ] Visual consistency dengan scmtv GFZ (≥ 90% match)

---

## 11. References

- **SCMTV GFZ Documentation**: https://www.gfz-potsdam.de/seiscomp/doc/apps/scmtv.html
- **QuakeML Schema**: https://quake.ethz.ch/quakeml/
- **MiniSEED Format**: https://ds.iris.edu/ds/nodes/dmc/data/formats/miniseed/
- **React Virtual**: https://tanstack.com/virtual/v3
- **Three.js Beach Ball**: (Already implemented in `src/components/BeachBall/BeachBall2D.tsx`)

---

**Last Updated**: 2026-07-15  
**Status**: 🟡 Ready for Implementation  
**Estimated Completion**: 16 working days (3-4 weeks)
