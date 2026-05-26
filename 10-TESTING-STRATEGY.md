# 10 — Testing Strategy

---

## 1. Testing Pyramid

```
         ┌─────────────┐
         │   E2E Tests  │  10%  (Playwright)
         │  (slow, UI)  │
         └──────┬───────┘
                │
         ┌──────┴───────┐
         │ Integration   │  30%  (Vitest + React Testing Library)
         │    Tests      │
         └──────┬───────┘
                │
         ┌──────┴───────┐
         │  Unit Tests   │  60%  (Vitest)
         │ (fast, logic) │
         └─────────────┘
```

---

## 2. Unit Tests

### 2.1 Seismologi Calculations

```typescript
// tests/lib/seismology/tensor.test.ts
import { describe, it, expect } from 'vitest';
import { momentToMw, mwToMoment, decomposeTensor } from '@/lib/seismology/tensor';

describe('Moment Tensor Calculations', () => {
  it('converts scalar moment to Mw correctly', () => {
    // M0 = 1.56E17 N·m → Mw 6.40
    const M0 = 1.56e17;
    const Mw = momentToMw(M0);
    expect(Mw).toBeCloseTo(6.40, 1);
  });

  it('converts Mw to scalar moment correctly', () => {
    const Mw = 6.40;
    const M0 = mwToMoment(Mw);
    expect(M0).toBeCloseTo(1.56e17, -15); // ± 1e15
  });
  
  it('decomposes tensor into DC + CLVD + ISO', () => {
    const tensor = {
      Mrr: 0.209e17, Mtt: 1.315e17, Mpp: -1.524e17,
      Mrt: -0.408e17, Mrp: 0.085e17, Mtp: -0.462e17,
    };
    
    const { dc, clvd, iso, mw } = decomposeTensor(tensor);
    
    expect(dc + clvd + iso).toBeCloseTo(100, 0);
    expect(dc).toBeGreaterThan(80);  // seharusnya ~90%
    expect(mw).toBeCloseTo(6.40, 1);
  });
  
  it('computes nodal planes from tensor', () => {
    // Test data dari screenshot: NP1: 196/54/-93, NP2: 20/36/-87
    const tensor = { /* ... */ };
    const { np1, np2 } = computeNodalPlanes(tensor);
    
    expect(np1.strike).toBeCloseTo(196, 0);
    expect(np1.dip).toBeCloseTo(54, 0);
    expect(np1.rake).toBeCloseTo(-93, 0);
  });
});
```

### 2.2 BeachBall Geometry

```typescript
// tests/lib/seismology/beachball.test.ts
describe('BeachBall Geometry', () => {
  it('computes correct polygon for thrust fault', () => {
    // Strike-slip: rake ≈ 0
    const points = computeBeachBallPolygon({
      strike: 45, dip: 80, rake: 0
    });
    
    expect(points).toBeDefined();
    expect(points.length).toBeGreaterThan(10);
  });
  
  it('produces symmetric pattern for pure DC mechanism', () => {
    const { compressional, dilatational } = splitBeachBallZones({
      strike: 45, dip: 90, rake: 0
    });
    
    // Dua zona yang sama besar untuk pure strike-slip vertical
    const compArea = computePolygonArea(compressional);
    const dilArea = computePolygonArea(dilatational);
    expect(compArea).toBeCloseTo(dilArea, -2);
  });
});
```

### 2.3 QuakeML Parser

```typescript
// tests/lib/parsers/quakeml.test.ts
import { parseQuakeML } from '@/lib/parsers/quakeml';
import { readFileSync } from 'fs';

describe('QuakeML Parser', () => {
  it('parses a valid QuakeML file', () => {
    const xml = readFileSync('./tests/fixtures/sample-event.xml', 'utf-8');
    const events = parseQuakeML(xml);
    
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('gfz2014alwz');
    expect(events[0].origins[0].latitude.value).toBeCloseTo(-44.599, 2);
    expect(events[0].origins[0].longitude.value).toBeCloseTo(-79.448, 2);
  });
  
  it('handles depth in meters (converts to km)', () => {
    const xml = readFileSync('./tests/fixtures/sample-event.xml', 'utf-8');
    const events = parseQuakeML(xml);
    
    // QuakeML stores depth in meters, we convert to km
    expect(events[0].origins[0].depth?.value).toBeCloseTo(10.0, 0); // km
  });
  
  it('parses moment tensor components', () => {
    const xml = readFileSync('./tests/fixtures/sample-mt.xml', 'utf-8');
    const events = parseQuakeML(xml);
    
    const mt = events[0].focalMechanisms[0].momentTensor;
    expect(mt?.tensor?.Mrr.value).toBeCloseTo(0.209e17, -14);
  });
  
  it('handles missing optional fields gracefully', () => {
    const minimalXml = `<?xml version="1.0"?>
      <quakeml xmlns="http://quakeml.org/xmlns/quakeml/1.2">
        <eventParameters>
          <event publicID="quakeml:test/1">
            <origin publicID="quakeml:test/o1">
              <time><value>2024-01-01T00:00:00.000000Z</value></time>
              <latitude><value>0</value></latitude>
              <longitude><value>0</value></longitude>
            </origin>
          </event>
        </eventParameters>
      </quakeml>`;
    
    expect(() => parseQuakeML(minimalXml)).not.toThrow();
  });
});
```

### 2.4 Zustand Stores

```typescript
// tests/stores/eventStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useEventStore } from '@/stores/eventStore';
import { renderHook, act } from '@testing-library/react';

describe('Event Store', () => {
  beforeEach(() => {
    useEventStore.setState({ selectedEventId: null });
  });
  
  it('selects an event', () => {
    const { result } = renderHook(() => useEventStore());
    
    act(() => {
      result.current.setSelectedEvent('gfz2014alwz');
    });
    
    expect(result.current.selectedEventId).toBe('gfz2014alwz');
  });
  
  it('clears selection', () => {
    const { result } = renderHook(() => useEventStore());
    
    act(() => result.current.setSelectedEvent('gfz2014alwz'));
    act(() => result.current.setSelectedEvent(null));
    
    expect(result.current.selectedEventId).toBeNull();
  });
});
```

---

## 3. Integration Tests

```typescript
// tests/integration/event-pipeline.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../test-utils';
import { EventsPage } from '@/pages/EventsPage';
import { mockEvents } from '../fixtures/mock-events';

describe('Event Pipeline Integration', () => {
  it('displays events after fetching', async () => {
    // Mock FDSN response
    vi.mock('@/hooks/useEventList', () => ({
      useEventList: () => ({
        data: mockEvents,
        isLoading: false,
        error: null,
      }),
    }));
    
    const { findByText } = renderWithProviders(<EventsPage />);
    
    // Expects rows for each mock event
    expect(await findByText('Off Coast of Southern Chile')).toBeInTheDocument();
    expect(await findByText('gfz2014alwz')).toBeInTheDocument();
  });
  
  it('filters events by date range', async () => {
    // ...
  });
  
  it('loads moment tensor on event selection', async () => {
    // ...
  });
});
```

---

## 4. E2E Tests

```typescript
// tests/e2e/main-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { ElectronApplication, _electron as electron } from 'playwright';

let app: ElectronApplication;

test.beforeAll(async () => {
  app = await electron.launch({ args: ['.'] });
});

test.afterAll(async () => {
  await app.close();
});

test('loads and displays event list', async () => {
  const window = await app.firstWindow();
  
  await window.click('text=Events');
  await window.waitForSelector('[data-testid="event-table"]');
  
  const rows = await window.$$('[data-testid="event-row"]');
  expect(rows.length).toBeGreaterThan(0);
});

test('selects event and shows moment tensor', async () => {
  const window = await app.firstWindow();
  
  await window.click('text=Events');
  await window.click('[data-testid="event-row"]:first-child');
  await window.click('text=Moment tensor');
  
  // Expect detail panel to be populated
  await expect(window.locator('[data-testid="event-detail-panel"]')).toBeVisible();
});
```

---

## 5. Test Fixtures

```typescript
// tests/fixtures/mock-events.ts
import { SeismicEvent } from '@/types/seismology';

export const mockEvents: SeismicEvent[] = [
  {
    id: 'gfz2014alwz',
    publicId: 'quakeml:gfz.de/gfz2014alwz',
    type: 'earthquake',
    preferredOriginId: 'quakeml:gfz.de/gfz2014alwz/origin/1',
    preferredMagnitudeId: 'quakeml:gfz.de/gfz2014alwz/magnitude/1',
    origins: [{
      id: 'quakeml:gfz.de/gfz2014alwz/origin/1',
      time: { value: new Date('2014-01-07T12:06:09Z') },
      latitude: { value: -44.599 },
      longitude: { value: -79.448 },
      depth: { value: 10.0 },
      evaluationMode: 'manual',
      evaluationStatus: 'confirmed',
      quality: {
        usedPhaseCount: 48,
        azimuthalGap: 165,
        minimumDistance: 3.4,
      },
      creationInfo: { agencyId: 'GFZ' },
    }],
    magnitudes: [{
      id: 'quakeml:gfz.de/gfz2014alwz/magnitude/1',
      mag: { value: 5.2 },
      type: 'M',
      evaluationMode: 'manual',
    }],
    focalMechanisms: [],
  },
];
```

---

## 6. Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
      exclude: [
        'tests/**',
        'electron/**',
        '**/*.d.ts',
        'src/main.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Electron APIs
Object.defineProperty(window, 'electronAPI', {
  value: {
    getEvents: vi.fn().mockResolvedValue([]),
    getMomentTensor: vi.fn().mockResolvedValue(null),
    getWaveform: vi.fn().mockResolvedValue([]),
    getConfig: vi.fn().mockResolvedValue({ server: { host: 'localhost' } }),
    setConfig: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock ResizeObserver (tidak ada di jsdom)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```
