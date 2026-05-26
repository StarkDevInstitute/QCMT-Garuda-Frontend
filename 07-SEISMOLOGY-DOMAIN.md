# 07 — Panduan Domain Seismologi untuk Developer

> Dokumen ini menjelaskan konsep seismologi yang diperlukan developer untuk memahami dan mengimplementasikan fitur-fitur dalam SCMTV BMKG.

---

## 1. Konsep Dasar: Apa itu Moment Tensor?

Ketika terjadi gempa bumi, tanah bergerak akibat **pelepasan energi di sumber** (hiposenter). Cara ilmuwan merepresentasikan mekanisme fisik pelepasan energi ini disebut **Moment Tensor (MT)**.

Moment tensor adalah **matriks simetris 3×3** yang merepresentasikan gaya-gaya yang bekerja di sumber gempa:

```
     Mxx  Mxy  Mxz
M =  Mxy  Myy  Myz
     Mxz  Myz  Mzz
```

Atau dalam koordinat sferis (radial-tangensial-transversial):
```
     Mrr  Mrt  Mrp
M =  Mrt  Mtt  Mtp
     Mrp  Mtp  Mpp
```

Karena matriks simetris, hanya **6 komponen** yang perlu ditentukan.

---

## 2. Dekomposisi Moment Tensor

Moment tensor dapat didekomposisi menjadi tiga komponen:

### 2.1 Double Couple (DC)
- Representasi dua bidang sesar yang tegak lurus
- Mekanisme sesar "ideal"
- Direpresentasikan sebagai persentase: DC = 90.4% artinya gempa hampir murni berupa pergeseran sesar

### 2.2 CLVD (Compensated Linear Vector Dipole)
- Komponen non-double-couple
- Bisa terjadi akibat kompleksitas sumber atau proses volkanik
- CLVD = 9.6% dalam contoh screenshot

### 2.3 Isotropic (ISO)
- Komponen ekspansi/kontraksi isotropis
- Terkait dengan perubahan volume (eksplosif, runtuhan)
- Biasanya kecil untuk gempa tektonik

**Hubungan**: DC + CLVD + ISO = 100%

---

## 3. Focal Mechanism (Beach Ball)

### 3.1 Konsep
Focal mechanism adalah cara memvisualisasikan **orientasi bidang sesar** dan **arah pergerakan**. Visualisasinya disebut **"beach ball"** karena menyerupai bola pantai.

### 3.2 Parameter Nodal Plane
Setiap bidang sesar dijelaskan oleh tiga parameter:

| Parameter | Simbol | Range | Definisi |
|-----------|--------|-------|----------|
| Strike | φ | 0°-360° | Arah bidang sesar diukur searah jarum jam dari Utara. 0°=Utara, 90°=Timur, 180°=Selatan, 270°=Barat |
| Dip | δ | 0°-90° | Sudut kemiringan bidang sesar dari horizontal. 0°=horizontal, 90°=vertikal |
| Rake | λ | -180°-180° | Arah pergerakan hanging wall relatif terhadap foot wall. 0°=strike slip kiri, 90°=thrust, -90°=normal, 180°=strike slip kanan |

### 3.3 Tipe Sesar Berdasarkan Rake
```
Rake ≈ 0°    atau 180° → Strike-slip (geser mendatar)
Rake ≈ 90°              → Thrust/Reverse (sesar naik)
Rake ≈ -90°             → Normal (sesar turun)
```

### 3.4 Principal Axes
Dari dekomposisi eigenvalue tensor momen, kita dapatkan 3 sumbu utama:
- **P-axis** (Pressure) → arah kompresi maksimum
- **T-axis** (Tension) → arah tegangan maksimum  
- **N-axis** (Null) → tegak lurus P dan T

Pada beach ball, **hitam = area kompresional** (direkam sebagai kompresi oleh stasiun di area tersebut), **putih = dilatational**.

---

## 4. Waveform & Synthetic

### 4.1 Waveform Observasi
Rekaman gerakan tanah dari sensor seismometer di stasiun. Format standar: **MiniSEED**.

Komponen trace yang umum digunakan dalam MT inversion:
- **LHZ** → Vertical, periode panjang (Long period)
- **LHN, LHE** → Horizontal North/East
- Setelah rotasi: **LR** (Radial), **LT/LQ** (Transversial), **LZ/LP** (Vertikal)

### 4.2 Synthetic Seismogram
Waveform yang **dihitung dari model** sumber (moment tensor) dan model bumi (Earth model). Dibandingkan dengan waveform observasi untuk:
1. Mengukur kualitas solusi (misfit)
2. Memperbaiki solusi (inversion)

### 4.3 Green's Functions
Green's function adalah respon bumi terhadap satu unit gaya di sumber. Untuk setiap pasang (source-receiver), perlu dihitung 8-10 komponen Green's function.

Dalam scmtv, Green's function dihitung menggunakan model bumi seperti **gemini-prem** (Preliminary Reference Earth Model).

### 4.4 Misfit
Ukuran ketidakcocokan antara waveform observasi dan sintetis:
```
Misfit = (1 - VR) × 100%
```
di mana VR = Variance Reduction = seberapa besar solusi menjelaskan data.

**Misfit rendah = solusi baik** (misfit 12.3% = sangat baik)

---

## 5. Proses Inversion

### 5.1 Alur Dasar
```
1. Pilih event → load origin & waveform
2. Filter stasiun (jarak, azimuth gap, SNR)
3. Hitung Green's functions
4. Filter waveform (bandpass)
5. Linear inversion → dapat Mij (6 komponen tensor)
6. Dekomposisi → DC, CLVD, ISO, Mw
7. Hitung synthetic dari solusi
8. Evaluasi fit, ulang jika perlu
```

### 5.2 Depth Iteration
Karena kedalaman mempengaruhi Green's function, inversion diulang untuk berbagai kedalaman:
```
Grid coarse: 0 to 200 km, step 30 km
Grid fine:   ± 50 km sekitar minimum, step 10 km, lalu 5 km, lalu 1 km
```
Kedalaman dengan misfit minimum dipilih sebagai solusi.

### 5.3 Time Shift
Perbedaan waktu antara model dan observasi (error pada origin time). Diatasi dengan **global time shift** yang dicari secara iteratif.

---

## 6. Parameter Kualitas Solusi

| Parameter | Good | Acceptable | Poor |
|-----------|------|------------|------|
| Misfit | < 20% | 20-40% | > 40% |
| DC % | > 70% | 50-70% | < 50% |
| Az. Gap | < 180° | 180-240° | > 240° |
| Stations | ≥ 10 | 5-10 | < 5 |

### Azimuthal Gap
Celah terbesar dalam distribusi azimuth stasiun. Semakin kecil = distribusi stasiun semakin merata = solusi lebih terpercaya.
```
Az.Gap = 360° - (jumlah busur yang tertutup stasiun)
```

---

## 7. Format Data Standar

### QuakeML
Format XML standar IASPEI untuk data seismologi. Berisi:
- Event metadata
- Origin parameters
- Magnitude
- FocalMechanism & MomentTensor

```xml
<quakeml xmlns="http://quakeml.org/xmlns/quakeml/1.2">
  <eventParameters>
    <event publicID="quakeml:gfz.de/2014alwz">
      <origin publicID="...">
        <time><value>2014-01-07T12:06:09.000000Z</value></time>
        <latitude><value>-44.599</value></latitude>
        <longitude><value>-79.448</value></longitude>
        <depth><value>10000</value></depth>  <!-- meter! -->
      </origin>
      <magnitude>
        <mag><value>5.2</value></mag>
        <type>M</type>
      </magnitude>
      <focalMechanism>
        <momentTensor>
          <tensor>
            <Mrr><value>0.209e17</value></Mrr>
            ...
          </tensor>
        </momentTensor>
      </focalMechanism>
    </event>
  </eventParameters>
</quakeml>
```

**Penting**: Depth di QuakeML dalam **meter**, bukan kilometer!

### MiniSEED
Format binary untuk waveform data. Perlu library khusus (obspy, mseed-parser).

### StationXML
Metadata stasiun (koordinat, respon instrumen). Format XML standar FDSN.

---

## 8. Konvensi Koordinat

### Bumi
- Latitude: positif = Utara, negatif = Selatan
- Longitude: positif = Timur, negatif = Barat
- Kedalaman: positif ke bawah (km)

### Tensor Momen (Akshesh & Dziewonski, 1981)
- r = radial ke atas (positif = naik)
- t = Selatan (positif = ke Selatan)
- p = Timur (positif = ke Timur)

### Beachball Proyeksi
Digunakan **lower hemisphere equal-area projection** (Schmidt net) sebagai standar.

---

## 9. Konstanta Seismologi Penting

```typescript
// src/constants/seismology.ts

export const SEISMOLOGY_CONSTANTS = {
  // Earth radius
  EARTH_RADIUS_KM: 6371,
  
  // Moment magnitude formula: Mw = (2/3) * log10(M0) - 10.7
  // M0 dalam dyne·cm
  MW_CONSTANT: 10.7,
  MW_SCALE: 2/3,
  
  // Konversi N·m ke dyne·cm
  NM_TO_DYNECM: 1e7,
  
  // Kecepatan gelombang P rata-rata (km/s)
  VP_AVERAGE: 6.0,
  
  // Kecepatan gelombang S rata-rata (km/s)  
  VS_AVERAGE: 3.5,
  
  // Densitas rata-rata kerak (kg/m³)
  RHO_CRUST: 2800,
} as const;

// Mw dari Scalar Moment M0 (dalam N·m)
export function momentToMw(M0_Nm: number): number {
  const M0_dynecm = M0_Nm * SEISMOLOGY_CONSTANTS.NM_TO_DYNECM;
  return (SEISMOLOGY_CONSTANTS.MW_SCALE) * Math.log10(M0_dynecm) - SEISMOLOGY_CONSTANTS.MW_CONSTANT;
}

// M0 (N·m) dari Mw
export function mwToMoment(Mw: number): number {
  const M0_dynecm = Math.pow(10, (Mw + SEISMOLOGY_CONSTANTS.MW_CONSTANT) / SEISMOLOGY_CONSTANTS.MW_SCALE);
  return M0_dynecm / SEISMOLOGY_CONSTANTS.NM_TO_DYNECM;
}
```
