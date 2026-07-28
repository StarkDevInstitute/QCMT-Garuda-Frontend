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
| `11-SCMTV-GFZ-FOUNDATION.md` | Analisis mendalam tool scmtv GFZ (referensi) |
| `12-AUTOMT-API-REFERENCE.md` | Dokumentasi API Backend AutoMT |
| `13-WAVEFORM-STATION-PREPARATION.md` | Persiapan stasiun seismik sebelum waveform viewer |
| `14-WAVEFORM-PAGE-DEVELOPMENT.md` | **Roadmap lengkap implementasi halaman Waveform interaktif** |

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

## Deployment Selalu Online (PM2)

Mode ini menjaga aplikasi tetap hidup 24/7 dan otomatis start lagi setelah reboot server.

```bash
# 1) Install dependency (sekali saja)
npm install

# 2) Jalankan mode development (port 5173, untuk update cepat saat coding)
npm run pm2:start:dev

# 3) Jalankan mode production (build terbaru lalu serve di port 5174)
npm run deploy:prod

# 4) Simpan daftar proses PM2
npm run pm2:save
```

### Saat ada update kode

```bash
# Development: tidak perlu restart manual untuk perubahan biasa (HMR aktif)
# Jika perlu restart proses dev:
npm run pm2:restart:dev

# Production: deploy versi terbaru
npm run deploy:prod
```

### Aktifkan auto-start PM2 saat reboot server

Jalankan perintah berikut di server (butuh sudo):

```bash
sudo env PATH=$PATH:/usr/bin /home/bmkg/gui/qcmt-garuda-dev/node_modules/pm2/bin/pm2 startup systemd -u bmkg --hp /home/bmkg
npm run pm2:save
```

### Monitoring cepat

```bash
npx pm2 status
npm run pm2:logs:dev
npm run pm2:logs:prod
```

---

## Tim & Kontak

- **Project Owner**: BMKG — Pusat Gempa Bumi dan Tsunami
- **Tech Lead**: [TBD]
- **Domain Expert**: Seismolog BMKG
