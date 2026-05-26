# SCMTV BMKG — SeisComP Moment Tensor Viewer
## Dokumen Perencanaan Proyek Strategis

> **Instansi**: Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)  
> **Tipe**: Aplikasi Web → Desktop (React + Electron)  
> **Status**: Perencanaan Awal — Phase 1 (Web Mode)  
> **Dev Environment**: Windows 10/11 (mode web, Vite + browser)  
> **Target Produksi**: Linux Ubuntu 20.04+ (Electron desktop)  
> **Versi Referensi**: SeisComP scmtv (GFZ Potsdam)

---

## Strategi Pengembangan

```
Phase 1 (Sekarang):  Web App di browser (Windows dev)
                     ↓
Phase 2 (Nanti):     Electron Desktop untuk Linux
```

Aplikasi dibangun sebagai **web app** terlebih dahulu agar tim dapat bergerak cepat tanpa overhead konfigurasi Electron. Arsitektur didesain dengan **platform abstraction layer** sehingga migrasi ke Electron hanya memerlukan penggantian satu layer tanpa menyentuh kode komponen.

---

## Daftar Dokumen

| File | Deskripsi |
|------|-----------|
| `README.md` | Dokumen ini — overview & navigasi |
| `01-PROJECT-OVERVIEW.md` | Latar belakang, tujuan, dan scope |
| `02-ARCHITECTURE.md` | Arsitektur teknis, web→Electron migration, theme system |
| `03-UI-COMPONENTS.md` | Breakdown komponen UI dari referensi scmtv |
| `04-DATA-MODELS.md` | Struktur data seismologi & format file |
| `05-MODULES.md` | Breakdown modul fungsional aplikasi |
| `06-PAGES-WIREFRAME.md` | Halaman, wireframe, dan theme toggle |
| `07-SEISMOLOGY-DOMAIN.md` | Panduan domain seismologi untuk developer |
| `08-DEVELOPMENT-ROADMAP.md` | Fase pengembangan (web→Electron), milestone |
| `09-API-INTEGRATION.md` | Integrasi data seismologi & protokol |
| `10-TESTING-STRATEGY.md` | Strategi pengujian & QA |

---

## Ringkasan Proyek

**SCMTV BMKG** adalah aplikasi untuk analisis **Moment Tensor** gempa bumi — alat vital bagi seismolog BMKG untuk memahami mekanisme sumber gempa (focal mechanism). Mereplikasi dan meningkatkan fungsionalitas `scmtv` SeisComP.

### Fungsi Utama
1. **Tampilan Event Gempa** — Daftar kejadian seismik dari katalog GFZ/BMKG
2. **Analisis Moment Tensor** — Komputasi dan visualisasi tensor momen
3. **Tampilan Waveform** — Perbandingan waveform sintetis vs observasi
4. **Peta Seismisitas** — Visualisasi geografis pusat gempa
5. **Beach Ball Plot** — Representasi focal mechanism 3D

### Fitur UI
- **Light & Dark Mode** — Toggle di header, default dark, persisted ke storage
- **Responsive Layout** — Split panel yang dapat di-resize
- **Keyboard Navigation** — Shortcut lengkap untuk efisiensi kerja

---

## Quick Start untuk Developer

```bash
# Clone project
git clone https://github.com/bmkg/scmtv-bmkg.git
cd scmtv-bmkg

# Install dependencies
npm install

# Jalankan dalam mode WEB (Phase 1 — development di Windows)
npm run dev
# Buka http://localhost:5173 di browser

# Build web
npm run build

# ─── Nanti (Phase 2) ───────────────────────────────────────
# Jalankan Electron desktop (dev)
npm run electron:dev

# Build untuk Linux (dari Windows via cross-compile)
npm run build:linux
```

---

## Tim & Kontak

- **Project Owner**: BMKG — Pusat Gempa Bumi dan Tsunami
- **Tech Lead**: [TBD]
- **Domain Expert**: Seismolog BMKG
