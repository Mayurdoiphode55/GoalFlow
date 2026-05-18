import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Target, ClipboardCheck, Users, CheckSquare,
  ListChecks, Activity, BarChart2, Download, FileSearch, Zap,
  RefreshCw, UserCog, LogOut, Menu, X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  badge?: number
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

function getNavGroups(role: string): NavGroup[] {
  const employeeGroup: NavGroup = {
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'My Goals', path: '/my-goals', icon: Target },
      { label: 'Check-ins', path: '/checkins', icon: ClipboardCheck },
    ],
  }

  if (role === 'employee') return [employeeGroup]

  const managerGroup: NavGroup = {
    label: 'TEAM',
    items: [
      { label: 'Team Goals', path: '/manager/team', icon: Users },
      { label: 'Approve Goals', path: '/manager/approve', icon: CheckSquare },
      { label: 'Check-in Review', path: '/manager/checkins', icon: ListChecks },
    ],
  }

  if (role === 'manager') return [employeeGroup, managerGroup]

  const adminGroup: NavGroup = {
    label: 'ADMINISTRATION',
    items: [
      { label: 'Completion', path: '/admin/completion', icon: Activity },
      { label: 'Analytics', path: '/admin/analytics', icon: BarChart2 },
      { label: 'Reports', path: '/admin/reports', icon: Download },
      { label: 'Audit Logs', path: '/admin/audit', icon: FileSearch },
      { label: 'Escalation', path: '/admin/escalation', icon: Zap },
      { label: 'Cycles', path: '/admin/cycles', icon: RefreshCw },
      { label: 'Users', path: '/admin/users', icon: UserCog },
    ],
  }

  return [employeeGroup, managerGroup, adminGroup]
}

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const navigate = useNavigate()

  const groups = getNavGroups(user?.role || 'employee')
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-50 flex flex-col bg-neutral-900 transition-all duration-300',
          sidebarOpen ? 'w-[240px]' : 'w-0 lg:w-[240px]',
          'lg:translate-x-0',
          !sidebarOpen && '-translate-x-full lg:translate-x-0'
        )}
        style={{ width: '240px' }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-neutral-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white text-sm font-bold mr-2.5">
            G
          </div>
          <span className="text-white font-bold text-lg">GoalFlow</span>
          <span className="text-[10px] font-semibold text-primary-400 bg-primary-900/50 px-1.5 py-0.5 rounded ml-2">
            BETA
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider px-3 mb-1 mt-5">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-all duration-150 mb-0.5',
                      isActive
                        ? 'bg-primary-500 text-white'
                        : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/5'
                    )
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-neutral-800 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-200 truncate">{user?.name}</p>
              <p className="text-xs text-neutral-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

// Mobile hamburger button
export function HamburgerButton() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  return (
    <button
      onClick={toggleSidebar}
      className="p-2 rounded-lg hover:bg-neutral-100 lg:hidden"
    >
      {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  )
}
