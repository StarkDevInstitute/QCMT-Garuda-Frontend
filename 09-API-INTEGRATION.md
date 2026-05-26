# 09 — API & Data Integration

---

## 1. FDSN Web Services (Prioritas Utama)

FDSN (International Federation of Digital Seismograph Networks) menyediakan standar web service untuk data seismologi.

### 1.1 fdsnws-event — Event Catalog

```typescript
// Endpoint: https://service.iris.edu/fdsnws/event/1/query
// Atau: https://bmkg.go.id/fdsnws/event/1/query (jika tersedia)

interface FDSNEventQuery {
  starttime?: string;       // ISO8601: "2014-01-03T13:19:31"
  endtime?: string;
  minmagnitude?: number;
  maxmagnitude?: number;
  minlatitude?: number;
  maxlatitude?: number;
  minlongitude?: number;
  maxlongitude?: number;
  mindepth?: number;
  maxdepth?: number;
  orderby?: 'time' | 'time-asc' | 'magnitude' | 'magnitude-asc';
  limit?: number;
  offset?: number;
  format?: 'xml' | 'text' | 'geojson';
  includeallmagnitudes?: boolean;
  includeallorigins?: boolean;
  includearrivals?: boolean;
}

// Contoh fetch
async function fetchEvents(filter: EventFilter): Promise<SeismicEvent[]> {
  const params = new URLSearchParams();
  
  if (filter.dateFrom) params.set('starttime', filter.dateFrom.toISOString());
  if (filter.dateTo) params.set('endtime', filter.dateTo.toISOString());
  if (filter.lastDays && !filter.dateFrom) {
    const starttime = new Date(Date.now() - filter.lastDays * 86400000);
    params.set('starttime', starttime.toISOString());
  }
  
  params.set('format', 'xml');
  params.set('includeallorigins', 'true');
  
  const response = await fetch(
    `https://service.iris.edu/fdsnws/event/1/query?${params}`
  );
  
  const xmlText = await response.text();
  return parseQuakeML(xmlText);
}
```

### 1.2 fdsnws-dataselect — Waveform Data

```typescript
// Endpoint: https://service.iris.edu/fdsnws/dataselect/1/query

interface FDSNWaveformQuery {
  network: string;          // "IU"
  station: string;          // "MAJO"
  location?: string;        // "00" or "*"
  channel: string;          // "LH*"
  starttime: string;        // ISO8601
  endtime: string;          // ISO8601
  format?: 'miniseed';
}

async function fetchWaveform(params: FDSNWaveformQuery): Promise<ArrayBuffer> {
  const query = new URLSearchParams({
    net: params.network,
    sta: params.station,
    loc: params.location ?? '*',
    cha: params.channel,
    start: params.starttime,
    end: params.endtime,
  });
  
  const response = await fetch(
    `https://service.iris.edu/fdsnws/dataselect/1/query?${query}`
  );
  
  return response.arrayBuffer(); // MiniSEED binary
}
```

### 1.3 fdsnws-station — Station Metadata

```typescript
// Endpoint: https://service.iris.edu/fdsnws/station/1/query

interface FDSNStationQuery {
  network?: string;
  station?: string;
  starttime?: string;
  endtime?: string;
  level?: 'network' | 'station' | 'channel' | 'response';
  format?: 'xml' | 'text';
  latitude?: number;
  longitude?: number;
  maxradius?: number;       // degrees dari center
}
```

---

## 2. SeisComP Integration

### 2.1 Database Connection (via Electron Main)

SeisComP menggunakan MySQL/MariaDB. Koneksi hanya dari Electron main process (tidak dari renderer).

```typescript
// electron/services/seiscomp-client.ts
import mysql from 'mysql2/promise';

class SeisCompClient {
  private pool: mysql.Pool;
  
  constructor(config: DatabaseConfig) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.name,
      user: config.user,
      password: config.password,
    });
  }
  
  async queryEvents(filter: EventFilter): Promise<SeismicEvent[]> {
    const conn = await this.pool.getConnection();
    try {
      // SeisComP database schema (seiscomp3)
      const [rows] = await conn.execute(`
        SELECT 
          e.publicID as eventId,
          o.time_value as originTime,
          o.latitude_value as lat,
          o.longitude_value as lon,
          o.depth_value as depth,
          m.magnitude_value as magnitude,
          m.type as magnitudeType,
          o.quality_usedPhaseCount as phases,
          e.evaluationStatus,
          e.evaluationMode,
          ci.agencyID as agency
        FROM Event e
        JOIN Origin o ON e.preferredOriginID = o.publicID
        LEFT JOIN Magnitude m ON e.preferredMagnitudeID = m.publicID
        LEFT JOIN CreationInfo ci ON e.creationInfo_agencyID = ci.agencyID
        WHERE o.time_value >= ?
        AND o.time_value <= ?
        ORDER BY o.time_value DESC
        LIMIT ?
      `, [filter.dateFrom, filter.dateTo, 1000]);
      
      return this.mapRowsToEvents(rows as any[]);
    } finally {
      conn.release();
    }
  }
  
  async queryMomentTensor(eventId: string): Promise<FocalMechanism | null> {
    // Query FocalMechanism + MomentTensor dari SeisComP DB
    const conn = await this.pool.getConnection();
    try {
      const [rows] = await conn.execute(`
        SELECT 
          fm.publicID,
          fm.nodalPlanes_nodalPlane1_strike_value as np1_strike,
          fm.nodalPlanes_nodalPlane1_dip_value as np1_dip,
          fm.nodalPlanes_nodalPlane1_rake_value as np1_rake,
          fm.nodalPlanes_nodalPlane2_strike_value as np2_strike,
          fm.nodalPlanes_nodalPlane2_dip_value as np2_dip,
          fm.nodalPlanes_nodalPlane2_rake_value as np2_rake,
          mt.scalarMoment_value as scalarMoment,
          mt.doubleCouple as dc,
          mt.clvd,
          mt.varianceReduction,
          mt.tensor_Mrr_value as Mrr,
          mt.tensor_Mtt_value as Mtt,
          mt.tensor_Mpp_value as Mpp,
          mt.tensor_Mrt_value as Mrt,
          mt.tensor_Mrp_value as Mrp,
          mt.tensor_Mtp_value as Mtp
        FROM Event e
        JOIN FocalMechanism fm ON fm._parent_oid = e._oid
        JOIN MomentTensor mt ON mt._parent_oid = fm._oid
        WHERE e.publicID = ?
        ORDER BY fm._oid DESC
        LIMIT 1
      `, [eventId]);
      
      if (!rows || (rows as any[]).length === 0) return null;
      return this.mapRowToFocalMechanism((rows as any[])[0]);
    } finally {
      conn.release();
    }
  }
}
```

### 2.2 SeedLink Protocol

SeedLink adalah protokol streaming real-time SeisComP untuk waveform.

```typescript
// electron/protocols/seedlink.ts

class SeedLinkClient extends EventEmitter {
  private socket: net.Socket;
  private host: string;
  private port: number;
  
  async connect(host: string, port: number = 18000): Promise<void> {
    this.socket = new net.Socket();
    await new Promise<void>((resolve, reject) => {
      this.socket.connect(port, host, resolve);
      this.socket.on('error', reject);
    });
    
    // SeedLink handshake
    await this.send('HELLO');
    // Select streams
    // ...
  }
  
  async selectStation(network: string, station: string, selectors: string): Promise<void> {
    await this.send(`SELECT ${network}_${station} ${selectors}`);
  }
  
  async startStreaming(startTime?: Date): Promise<void> {
    if (startTime) {
      const timeStr = startTime.toISOString().replace(/[-:T]/g, '').slice(0, 14);
      await this.send(`TIME ${timeStr}`);
    }
    await this.send('DATA');
    // Read MiniSEED records
    this.readLoop();
  }
  
  private readLoop(): void {
    this.socket.on('data', (buffer) => {
      // Parse SeedLink header + MiniSEED record
      const slHeader = buffer.slice(0, 8);
      const miniseed = buffer.slice(8, 520);
      
      if (slHeader.slice(0, 2).toString() === 'SL') {
        const trace = parseMiniSEED(miniseed);
        this.emit('trace', trace);
      }
    });
  }
}
```

---

## 3. IPC Bridge (Electron)

### 3.1 Preload Script

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Events
  getEvents: (filter: EventFilter) => 
    ipcRenderer.invoke('events:get', filter),
  
  getMomentTensor: (eventId: string) => 
    ipcRenderer.invoke('tensor:get', eventId),
  
  // Waveforms
  getWaveform: (params: WaveformRequest) => 
    ipcRenderer.invoke('waveform:get', params),
  
  // Inversion
  runInversion: (config: InversionConfig) => 
    ipcRenderer.invoke('inversion:run', config),
  
  onInversionProgress: (callback: (progress: InversionProgress) => void) => {
    ipcRenderer.on('inversion:progress', (_, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('inversion:progress');
  },
  
  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config: Partial<AppSettings>) => 
    ipcRenderer.invoke('config:set', config),
  
  // File operations
  openFile: (options: OpenDialogOptions) => 
    ipcRenderer.invoke('file:open', options),
  
  saveFile: (data: ArrayBuffer, defaultPath: string) => 
    ipcRenderer.invoke('file:save', { data, defaultPath }),
});
```

### 3.2 TypeScript Declarations

```typescript
// src/types/electron.d.ts
declare global {
  interface Window {
    electronAPI: {
      getEvents: (filter: EventFilter) => Promise<SeismicEvent[]>;
      getMomentTensor: (eventId: string) => Promise<FocalMechanism | null>;
      getWaveform: (params: WaveformRequest) => Promise<WaveformTrace[]>;
      runInversion: (config: InversionConfig) => Promise<InversionResult>;
      onInversionProgress: (cb: (p: InversionProgress) => void) => () => void;
      getConfig: () => Promise<AppSettings>;
      setConfig: (config: Partial<AppSettings>) => Promise<void>;
      openFile: (options: OpenDialogOptions) => Promise<string | null>;
      saveFile: (data: ArrayBuffer, path: string) => Promise<boolean>;
    };
  }
}
```

---

## 4. Inversion Engine Integration

### Opsi A: WASM (Recommended untuk Phase 2)
Compile KIWI/ISOLA inversion code ke WebAssembly untuk berjalan di renderer process.

### Opsi B: Child Process (Phase 1 MVP)
Spawn external binary dari Electron main process:

```typescript
// electron/services/inversion-service.ts
import { spawn } from 'child_process';
import path from 'path';

class InversionService {
  private binaryPath: string;
  
  constructor() {
    // Bundle binary dengan aplikasi
    this.binaryPath = path.join(process.resourcesPath, 'bin', 'inversion');
  }
  
  async run(config: InversionConfig, onProgress: (p: InversionProgress) => void): Promise<InversionResult> {
    return new Promise((resolve, reject) => {
      const configJson = JSON.stringify(config);
      const proc = spawn(this.binaryPath, ['--config', '-'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      proc.stdin.write(configJson);
      proc.stdin.end();
      
      let output = '';
      proc.stdout.on('data', (data: Buffer) => {
        const line = data.toString();
        output += line;
        
        // Parse progress lines
        const progressMatch = line.match(/PROGRESS: (\d+)\/(\d+)/);
        if (progressMatch) {
          onProgress({
            current: parseInt(progressMatch[1]),
            total: parseInt(progressMatch[2]),
          });
        }
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(JSON.parse(output));
        } else {
          reject(new Error(`Inversion failed with code ${code}`));
        }
      });
    });
  }
}
```

---

## 5. Error Handling & Offline Mode

```typescript
// src/lib/api-client.ts

class APIError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK' | 'TIMEOUT' | 'NOT_FOUND' | 'SERVER_ERROR',
    public statusCode?: number,
  ) {
    super(message);
  }
}

// Retry with exponential backoff
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
  throw new Error('Max retries exceeded');
}
```
