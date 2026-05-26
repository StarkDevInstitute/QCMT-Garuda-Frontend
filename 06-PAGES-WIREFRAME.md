# 06 — Pages & Wireframe Deskripsi

> **Update**: Aplikasi dikembangkan dalam **mode web** terlebih dahulu (Vite + React di browser), dengan arsitektur yang memudahkan migrasi ke Electron desktop di Phase 2. Target desktop adalah **Linux** (Ubuntu 20.04+). Development dilakukan di **Windows**.

---

## Halaman 1: Main Layout

Aplikasi menggunakan **single-page layout** dengan tab navigation. Di mode web, title bar adalah browser tab. Di mode Electron, menggunakan native window dengan custom title bar.

### Window Structure
```
┌────────────────────────────────────────────────────────────┐
│  [🌑/☀] SCMTV BMKG — Seismic Moment Tensor Viewer  [mode]│ ← Header / Title bar
├────────────────────────────────────────────────────────────┤
│  File ▾   Settings ▾   View ▾   Help ▾                    │ ← Menu bar
├────────────────────────────────────────────────────────────┤
│  [Moment Tensor]  [Events]  [Waveforms]  [Settings]       │ ← Tab bar
├────────────────────────────────────────────────────────────┤
│                                                            │
│  TAB CONTENT AREA                                         │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  ● Connected: bmkg-seiscomp.bmkg.go.id    v2.1.0 BMKG    │ ← Status bar
└────────────────────────────────────────────────────────────┘
```

### Header — Theme Toggle
Di pojok kanan atas terdapat tombol toggle Light/Dark mode:
- 🌑 icon → saat ini **Dark mode** (klik untuk beralih ke Light)
- ☀️ icon → saat ini **Light mode** (klik untuk beralih ke Dark)
- Preferensi disimpan di localStorage (web) / electron-store (desktop)
- Default: **Dark mode**

---

## Halaman 2: Moment Tensor Tab

Tab default yang terbuka saat aplikasi dimulai.

### Layout (Split Panel)
```
┌────────────────────────────────────────────────────────────┐
│  [Moment Tensor]* [Events] [Waveforms] [Settings]         │
├─────────────────────┬──────────────────────────────────────┤
│                     │                                      │
│   WORLD MAP         │   EVENT DETAIL                       │
│   (resizable)       │   (resizable)                        │
│                     │                                      │
│  ┌───────────────┐  │  ┌─────────────────────────────┐   │
│  │               │  │  │ Type:         Strike Dip Rake│   │
│  │  Leaflet Map  │  │  │ NP1:    -      -     -    - │   │
│  │  World view   │  │  │ NP2:    -      -     -    - │   │
│  │               │  │  │                             │   │
│  │  □ = stasiun  │  │  │         R    T    P         │   │
│  │  ● = event    │  │  │ R:      -    -    -         │   │
│  │               │  │  │ T:      -    -    -         │   │
│  │  Graticule    │  │  │ P:      -    -    -         │   │
│  │  visible      │  │  │                             │   │
│  └───────────────┘  │  │ Time:       2014-01-07...  │   │
│                     │  │ Depth:      10.0 km        │   │
│                     │  │ Lat:        -5.234°S       │   │
│                     │  │ Lon:        132.456°E      │   │
│                     │  │ Stations:   48 / 93        │   │
│                     │  │ Az. Gap:    165°           │   │
│                     │  │ Min. Dist:  3.4°           │   │
│                     │  │                            │   │
│                     │  │ ─── Tensor Results ───     │   │
│                     │  │ Mw:      5.2               │   │
│                     │  │ Az.Gap:  165°              │   │
│                     │  │ Moment:  3.5E17 N·m        │   │
│                     │  │ Misfit:  12.3%             │   │
│                     │  │ Method:  waveform inversion│   │
│                     │  │                            │   │
│                     │  │ ─── Metadata ───           │   │
│                     │  │ EventID: gfz2014alwz       │   │
│                     │  │ Eval:    confirmed (manual) │   │
│                     │  │ Agency:  GFZ Potsdam       │   │
│                     │  │ Author:  seismologist@gfz  │   │
│                     │  │ Updated: 2014-01-07 15:32  │   │
│                     │  └─────────────────────────────┘   │
├─────────────────────┴──────────────────────────────────────┤
│  BULLETIN / LOG PANEL                           ↕ resize  │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  [12:34:56] Inversion started for event gfz2014alwz │ │
│  │  [12:34:57] Loading waveforms from 48 stations...   │ │
│  │  [12:34:58] Computing Green's functions...          │ │
│  │  [12:35:02] Inversion converged. Misfit: 12.3%      │ │
│  │  [12:35:02] Mw: 5.2, DC: 90.4%, CLVD: 9.6%        │ │
│  └──────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│        [📄 Bulletin]    [〜 WaveForms]    [✓ Confirm]      │
└────────────────────────────────────────────────────────────┘
```

### Interaksi
- **Klik event di peta** → load detail ke panel kanan
- **Bulletin button** → toggle bulletin panel visibility
- **WaveForms button** → pindah ke tab Waveforms
- **Confirm button** → konfirmasi dan publish hasil moment tensor
- **Theme toggle** (header) → switch light/dark mode

---

## Halaman 3: Events Tab

Katalog event seismik yang dapat difilter dan diurutkan.

```
┌────────────────────────────────────────────────────────────┐
│  [Moment Tensor] [Events]* [Waveforms] [Settings]         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ OT(GMT)          M  TP Phases Lat      Lon   Depth   │ │
│  │                     Stat Agency  Region         ID   │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │▶ 2014-01-07 12:06 5.2 M  48  -44.6S  79.4W  10km   │ │
│  │  [M+] GFZ  Off Coast of Southern Chile  gfz2014alwz │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  2014-01-07 11:37 4.8 M  93  36.5N   70.4W 207km   │ │
│  │  [M+] GFZ  Hindu Kush Region, Afghanistan gfz2014alwa│ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  2014-01-07 11:33 4.4 M  103  0.3N  123.5E 143km   │ │
│  │  [A+] GFZ  Minahasa Peninsula, Sulawesi  gfz2014alif │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  (more rows...)                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  FILTER BAR                                               │
│  [Clear]  Last days: [4 ▲▼]  [Read]                      │
│  From: [2014/01/03 13:19] To: [2014/01/07 13:19] [Read]  │
├────────────────────────────────────────────────────────────┤
│  ☑ Hide other/fake events  ☐ Show only own events        │
│  ☐ Show only latest/preferred origin per agency          │
│  ☑ Hide events outside: [- custom -] [···] region        │
└────────────────────────────────────────────────────────────┘
```

### Interaksi
- **Click row** → select event, highlight di peta pada tab Moment Tensor
- **Double-click row** → buka Waveform viewer untuk event ini
- **Column header click** → sort ascending/descending
- **Right-click row** → context menu (Open, Copy ID, Copy QuakeML, dll)
- **Read button** → fetch events dengan filter saat ini
- **Clear button** → reset filter ke default

---

## Halaman 4: Waveform & Inversion Tab

Tab terpisah (bukan popup window) untuk waveform analysis.

```
┌────────────────────────────────────────────────────────────────┐
│  [Moment Tensor] [Events] [Waveforms]* [Settings]              │
├────────────────────────────────────────────────────────────────┤
│  MT: Origin#20140104124955.962716.183213                       │
├────────────────────────────────────────────────────────────────┤
│  [↶] [↷] [🏠] [▶] [⏹] [♻]  [Norm.window ▾] [All ▾] [M5-M6.5▾]│
│  [🔍] [⚙] [70] [↻] [🔴] [Depth search] [Auto invert] [✓]     │
├──────────────────┬─────────────────────────────────┬───────────┤
│  LEFT PANEL      │  WAVEFORM PANEL                 │ RIGHT     │
│                  │                                 │ PANEL     │
│  ┌────────────┐  │  Header: Used Net Sta  Dist Az  │           │
│  │            │  │          Weight Fit Amp          │ Depth     │
│  │  Beach     │  ├─────────────────────────────────┤ Iteration │
│  │  Ball      │  │ ○ IU  MAJO  4.1°  265.6°       │           │
│  │  3D View   │  │   1.00  93.3%   4.2             │ Grid:     │
│  │            │  │ ┌──────────────────────────────┐ │ 200:30,  │
│  └────────────┘  │ │ LP ~~synthetic  obs~~~~~~~~~~~│ │ 400:50,  │
│  [Full] [DC]     │ │ LQ ~~~~~~~~~~~~~~~~~~~~~~~~~~│ │ 100 km   │
│                  │ │ LR ~~~~~~~~~~~~~~~~~~~~~~~~~~~│ │           │
│  ┌────────────┐  │ └──────────────────────────────┘ │ Fine:    │
│  │  Tensor    │  ├─────────────────────────────────┤ 50,10,5,1│
│  │  Matrix    │  │ ○ G   INU   5.3°  234.2°       │           │
│  │  Mx My Mz  │  │   1.00  93.7%   4.0             │ Min/Max  │
│  └────────────┘  │ ┌──────────────────────────────┐ │ depth:  │
│                  │ │ LP ~~~~~~~~~~~~~~~~~~~~~~~~~~~ │ │ [  ][  ]│
│  Nodal Planes:   │ └──────────────────────────────┘ │           │
│  NP1: 196/54/-93 ├─────────────────────────────────┤ ☐ Keep  │
│  NP2:  20/36/-87 │ ○ JP  JNU  10.9°  253.0°       │ ☑ Shift  │
│                  │   1.00  92.4%   4.5             │ ☐ Optim  │
│  Derived:        │ ┌──────────────────────────────┐ │           │
│  Mw:    6.40     │ │ LP ~~~~~~~~~~~~~~~~~~~~~~~~~~~ │ │ Inversn:│
│  Fit:   84.9%    │ │ LQ ← green window box        │ │ Global  │
│  DC:    90.4%    │ │ LR ~~~~~~~~~~~~~~~~~~~~~~~~~~~ │ │ shift:6 │
│  CLVD:   9.6%    │ └──────────────────────────────┘ │ Max its:│
│                  │                                 │ 10      │
│  Archive: saul:/ │  Timeline: 120  240  360 sec   │           │
│  Model: gemini   │                                 │ Snippets│
│  Depth: 11.0 km  │                                 │ Min: 60 │
│                  │                                 │ Max: 40 │
│  [Apply]         │                                 │           │
├──────────────────┴─────────────────────────────────┴───────────┤
│            [Amplitude]        [Fit]        [Polar]              │
└────────────────────────────────────────────────────────────────┘
```

---

## Halaman 5: Settings Tab

```
┌────────────────────────────────────────────────────────────┐
│  [Moment Tensor] [Events] [Waveforms] [Settings]*         │
├──────────────┬─────────────────────────────────────────────┤
│  SIDEBAR     │  SETTINGS CONTENT                           │
│              │                                             │
│  ● Server    │  ╔═══════════════════════════════════════╗  │
│    Connection│  ║  SERVER CONNECTION                    ║  │
│              │  ╠═══════════════════════════════════════╣  │
│  ○ Display   │  ║  SeisComP Host: [bmkg-seiscomp....  ] ║  │
│    & Theme   │  ║  Port:          [18180              ] ║  │
│              │  ╚═══════════════════════════════════════╝  │
│  ○ Inversion │                                             │
│    Defaults  │  ╔═══════════════════════════════════════╗  │
│              │  ║  DISPLAY & THEME                      ║  │
│  ○ Keyboard  │  ║  Theme: ◉ Dark  ○ Light               ║  │
│    Shortcuts │  ║  Language: ◉ ID  ○ EN                 ║  │
│              │  ║  Waveform Colors:                     ║  │
│  ○ About     │  ║    Observed:  [■ #1a1a1a]             ║  │
│              │  ║    Synthetic: [■ #cc0000]             ║  │
│              │  ║    Window:    [■ #ffa500]             ║  │
│              │  ╚═══════════════════════════════════════╝  │
│              │                                             │
│              │       [Save Settings]   [Reset Defaults]    │
└──────────────┴─────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts (Global)

| Shortcut | Aksi |
|----------|------|
| `Ctrl+R` | Refresh event list |
| `Ctrl+W` | Pindah ke tab WaveForms |
| `↑ / ↓` | Navigasi event list |
| `Enter` | Select event / load detail |
| `Space` | Toggle play/pause waveform |
| `Ctrl+I` | Jalankan inversion |
| `Ctrl+S` | Simpan/export hasil |
| `Ctrl+,` | Buka Settings |
| `F5` | Reload data |
| `Esc` | Tutup dialog / deselect |
| `+` / `-` | Zoom in/out waveform |
| `Ctrl+A` | Select all stations |
| `Ctrl+D` | Deselect all stations |
| `Ctrl+L` | Toggle Light/Dark mode |
