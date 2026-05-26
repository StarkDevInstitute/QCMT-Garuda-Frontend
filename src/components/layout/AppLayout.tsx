import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { TabBar } from './TabBar'
import { StatusBar } from './StatusBar'

export function AppLayout() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader />
      <TabBar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <StatusBar />
    </div>
  )
}
