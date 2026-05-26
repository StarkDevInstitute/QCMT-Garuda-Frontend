import type { SeismicEvent } from '@/types/seismology'
import type { EventFilter } from '@/stores/eventStore'
import { parseQuakeML } from '@/lib/parsers/quakeml'

// ─── Platform API interface ────────────────────────────────────────────────────

export interface PlatformAPI {
  getEvents: (filter: EventFilter) => Promise<SeismicEvent[]>
  getWaveform: (params: WaveformRequest) => Promise<ArrayBuffer>
  openFile: (options?: { accept?: string }) => Promise<string | null>
  saveFile: (data: Blob, filename: string) => Promise<boolean>
}

export interface WaveformRequest {
  network: string
  station: string
  location: string
  channel: string
  startTime: Date
  endTime: Date
}

// ─── Web implementation ───────────────────────────────────────────────────────

async function fetchEvents(filter: EventFilter): Promise<SeismicEvent[]> {
  const params = new URLSearchParams()
  const url = 'https://service.iris.edu/fdsnws/event/1/query'

  if (filter.dateFrom) {
    params.set('starttime', filter.dateFrom.toISOString())
  } else {
    const start = new Date(Date.now() - filter.lastDays * 86_400_000)
    params.set('starttime', start.toISOString())
  }
  if (filter.dateTo) {
    params.set('endtime', filter.dateTo.toISOString())
  }
  params.set('format', 'xml')
  params.set('includeallorigins', 'true')
  params.set('includeallmagnitudes', 'true')
  params.set('limit', '200')

  const response = await fetch(`${url}?${params}`)
  if (!response.ok) throw new Error(`FDSN error: ${response.status}`)
  const xml = await response.text()
  return parseQuakeML(xml)
}

async function fetchWaveform(params: WaveformRequest): Promise<ArrayBuffer> {
  const url = 'https://service.iris.edu/fdsnws/dataselect/1/query'
  const query = new URLSearchParams({
    net: params.network,
    sta: params.station,
    loc: params.location || '*',
    cha: params.channel,
    start: params.startTime.toISOString(),
    end: params.endTime.toISOString(),
  })
  const response = await fetch(`${url}?${query}`)
  if (!response.ok) throw new Error(`FDSN dataselect error: ${response.status}`)
  return response.arrayBuffer()
}

async function openFileWeb(options?: { accept?: string }): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (options?.accept) input.accept = options.accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string ?? null)
      reader.readAsText(file)
    }
    input.click()
  })
}

function saveFileWeb(data: Blob, filename: string): Promise<boolean> {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return Promise.resolve(true)
}

export const webPlatform: PlatformAPI = {
  getEvents: fetchEvents,
  getWaveform: fetchWaveform,
  openFile: openFileWeb,
  saveFile: saveFileWeb,
}

// ─── Electron implementation (stub — filled in Phase 2) ──────────────────────

declare global {
  interface Window {
    electronAPI?: {
      getEvents: (filter: EventFilter) => Promise<SeismicEvent[]>
      getWaveform: (params: WaveformRequest) => Promise<ArrayBuffer>
      openFile: (options?: { accept?: string }) => Promise<string | null>
      saveFile: (data: ArrayBuffer, filename: string) => Promise<boolean>
    }
  }
}

export const electronPlatform: PlatformAPI = {
  getEvents: (filter) => window.electronAPI!.getEvents(filter),
  getWaveform: (params) => window.electronAPI!.getWaveform(params),
  openFile: (opts) => window.electronAPI!.openFile(opts),
  saveFile: async (data, filename) => {
    const buf = await data.arrayBuffer()
    return window.electronAPI!.saveFile(buf, filename)
  },
}

// ─── Auto-detect & export ─────────────────────────────────────────────────────

export const platform: PlatformAPI =
  typeof window !== 'undefined' && window.electronAPI !== undefined
    ? electronPlatform
    : webPlatform
