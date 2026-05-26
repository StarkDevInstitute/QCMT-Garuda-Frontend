# 01 — Project Overview

## 1. Latar Belakang

BMKG sebagai otoritas nasional gempa bumi dan tsunami membutuhkan alat analisis seismologi kelas dunia. SeisComP `scmtv` adalah standar industri untuk analisis moment tensor, namun memiliki keterbatasan:
- Antarmuka GTK yang ketinggalan zaman
- Tidak terintegrasi dengan sistem BMKG
- Konfigurasi kompleks dan tidak user-friendly
- Tidak mendukung branding dan standar BMKG

**SCMTV BMKG** dibangun dari awal dengan teknologi modern sebagai proyek strategis untuk meningkatkan kapabilitas operasional analisis gempa bumi nasional.

---

## 2. Tujuan Proyek

### Tujuan Utama
- Membangun aplikasi desktop analisis moment tensor modern untuk BMKG
- Mereplikasi seluruh fungsionalitas inti scmtv SeisComP
- Meningkatkan UX/UI untuk efisiensi kerja seismolog
- Mengintegrasikan dengan infrastruktur data BMKG

### Tujuan Strategis
- Kemandirian teknologi — tidak bergantung pada vendor asing
- Pelatihan SDM dalam pengembangan software seismologi
- Fondasi untuk pengembangan tools seismologi BMKG berikutnya
- Potensi open-source untuk komunitas seismologi ASEAN

---

## 3. Scope Proyek

### Dalam Scope (MVP)
- ✅ Tampilan daftar event gempa (Events List)
- ✅ Detail event & parameter origin
- ✅ Analisis moment tensor (inversion)
- ✅ Tampilan waveform sintetis vs observasi
- ✅ Beach ball / focal mechanism plot
- ✅ Peta distribusi stasiun dan gempa
- ✅ Import/Export data (QuakeML, FDSN)
- ✅ Koneksi ke SeisComP database / seedlink

### Dalam Scope (Phase 2)
- 🔄 Dashboard real-time monitoring
- 🔄 Integrasi langsung dengan BMKG server
- 🔄 Report generator PDF otomatis
- 🔄 Multi-user collaboration
- 🔄 Historical analysis tools

### Luar Scope
- ❌ Picking fase gelombang (ada di scmtv lain)
- ❌ Locating hypocenter (ada di scanloc)
- ❌ Sistem peringatan dini (terpisah)

---

## 4. Pengguna Target

### Primary Users
**Seismolog Analisis** — Staff BMKG yang bertugas menganalisis dan mempublikasikan parameter gempa bumi termasuk mekanisme sumber.

**Kebutuhan utama:**
- Akses cepat ke event terbaru
- Tools analisis yang presisi
- Workflow yang efisien (keyboard shortcuts)
- Output yang siap publikasi

### Secondary Users
**Operator Monitoring** — Staff yang memantau aktivitas seismik 24/7.

**Kebutuhan utama:**
- Overview cepat event terbaru
- Alert untuk event signifikan
- Minimal konfigurasi

---

## 5. Referensi Sistem

Aplikasi ini mengacu pada:
- **scmtv** — SeisComP Moment Tensor Viewer (GFZ Potsdam)
- **KIWI Tools** — Kinhematic Waveform Inversion
- **ISOLA** — Iterative Deconvolution & Seismic Source Inversion
- **FDSN Web Services** — Standar data seismologi internasional

---

## 6. Definisi Istilah

| Istilah | Definisi |
|---------|----------|
| Moment Tensor | Representasi matematis mekanisme sumber gempa (6 komponen) |
| Focal Mechanism | Orientasi bidang sesar yang menyebabkan gempa |
| Beach Ball | Visualisasi focal mechanism berbentuk bola |
| Waveform | Rekaman gerakan tanah vs waktu |
| Synthetic | Waveform yang dihitung dari model |
| Inversion | Proses matematis mencari parameter sumber terbaik |
| NP1/NP2 | Nodal Plane 1 dan 2 — dua bidang sesar yang mungkin |
| Strike | Arah bidang sesar (0-360°) |
| Dip | Kemiringan bidang sesar (0-90°) |
| Rake | Arah slip pada bidang sesar (-180° hingga 180°) |
| Mw | Moment Magnitude |
| CLVD | Compensated Linear Vector Dipole — komponen non-DC |
| DC | Double Couple — komponen force couple |
| Misfit | Ukuran ketidakcocokan waveform sintetis vs observasi |
| Az. Gap | Azimuthal Gap — celah azimuth antar stasiun |
