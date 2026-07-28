import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ServerConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  fdsnEventUrl: string
  fdsnDataselectUrl: string
  fdsnStationUrl: string
  autoMtUrl: string  // AutoMT Interactive-Processor API base URL
}

export interface AppSettings {
  server: ServerConfig
  display: {
    language: 'id' | 'en'
    mapStyle: 'dark' | 'light' | 'satellite'
    showGraticule: boolean
    waveformColors: {
      observed: string
      synthetic: string
      window: string
    }
  }
}

interface SettingsStore {
  settings: AppSettings
  updateServer: (server: Partial<ServerConfig>) => void
  updateDisplay: (display: Partial<AppSettings['display']>) => void
}

const defaultSettings: AppSettings = {
  server: {
    host: 'localhost',
    port: 3306,
    database: 'seiscomp',
    user: 'scuser',
    password: '',
    fdsnEventUrl: '/autoqcmt/v1/events',
    fdsnDataselectUrl: '/fdsnws/dataselect/1/query',
    fdsnStationUrl: '/fdsnws/station/1/query',
    autoMtUrl: 'http://100.93.147.122:8111/autoqcmt/v1/',
  },
  display: {
    language: 'en',
    mapStyle: 'dark',
    showGraticule: true,
    waveformColors: {
      observed: 'var(--waveform-obs)',
      synthetic: 'var(--waveform-syn)',
      window: 'var(--waveform-win)',
    },
  },
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateServer: (server) =>
        set((state) => ({
          settings: {
            ...state.settings,
            server: { ...state.settings.server, ...server },
          },
        })),
      updateDisplay: (display) =>
        set((state) => ({
          settings: {
            ...state.settings,
            display: { ...state.settings.display, ...display },
          },
        })),
    }),
    { name: 'scmtv-settings' }
  )
)
