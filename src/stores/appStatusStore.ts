import { create } from 'zustand'

interface AppStatusState {
  connected: boolean
  serverLabel: string
  listening: boolean
  eventCount: number
  setConnection: (connected: boolean, serverLabel?: string) => void
  setListening: (listening: boolean) => void
  setEventCount: (eventCount: number) => void
}

export const useAppStatusStore = create<AppStatusState>((set) => ({
  connected: false,
  serverLabel: 'AutoMT API',
  listening: false,
  eventCount: 0,
  setConnection: (connected, serverLabel) =>
    set((state) => ({
      connected,
      serverLabel: serverLabel ?? state.serverLabel,
    })),
  setListening: (listening) => set({ listening }),
  setEventCount: (eventCount) => set({ eventCount }),
}))
