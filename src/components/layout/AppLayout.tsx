import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { TabBar } from './TabBar'
import { StatusBar } from './StatusBar'

export function AppLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader />
      <TabBar />
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <StatusBar />
    </div>
  )
}
