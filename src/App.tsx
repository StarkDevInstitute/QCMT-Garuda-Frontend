import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { MomentTensorPage } from '@/pages/MomentTensorPage'
import { EventsPage } from '@/pages/EventsPage'
import { WaveformPage } from '@/pages/WaveformPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ProcessingPage } from '@/pages/ProcessingPage'
import { useThemeStore, applyTheme } from '@/stores/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,  // 1 min
      retry: 2,
    },
  },
})

function ThemeSync() {
  const { theme } = useThemeStore()
  useEffect(() => {
    applyTheme(theme)
  }, [theme])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<MomentTensorPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="waveforms" element={<WaveformPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="processing/:jobId" element={<ProcessingPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
