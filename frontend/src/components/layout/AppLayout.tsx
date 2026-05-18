import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AICoachFAB } from '../ai/AICoachFAB'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-[240px] overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <AICoachFAB />
    </div>
  )
}
