import { useLocation, useNavigate } from 'react-router-dom'
import { NotificationBell } from '../shared/NotificationBell'
import { HamburgerButton } from './Sidebar'
import { useAuthStore } from '../../store/authStore'
import { authAPI } from '../../lib/api'
import { toast } from 'sonner'

const BREADCRUMBS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/my-goals': 'My Goals',
  '/checkins': 'Check-ins',
  '/manager/team': 'Team Goals',
  '/manager/approve': 'Approve Goals',
  '/manager/checkins': 'Check-in Review',
  '/manager/dashboard': 'Manager Dashboard',
  '/admin/completion': 'Completion Dashboard',
  '/admin/analytics': 'Analytics',
  '/admin/reports': 'Reports',
  '/admin/audit': 'Audit Logs',
  '/admin/escalation': 'Escalation Rules',
  '/admin/cycles': 'Cycle Management',
  '/admin/users': 'User Management',
  '/admin/dashboard': 'Admin Dashboard',
}

const DEMO_CREDENTIALS = {
  employee: { email: 'employee@goalflow.com', password: 'Employee@123' },
  manager: { email: 'manager@goalflow.com', password: 'Manager@123' },
  admin: { email: 'admin@goalflow.com', password: 'Admin@123' },
}

const ROLE_REDIRECTS = {
  employee: '/dashboard',
  manager: '/manager/dashboard',
  admin: '/admin/completion',
}

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, setAuth } = useAuthStore()
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  const breadcrumb = BREADCRUMBS[location.pathname] || 'GoalFlow'

  const switchRole = async (role: 'employee' | 'manager' | 'admin') => {
    try {
      const creds = DEMO_CREDENTIALS[role]
      const { data } = await authAPI.login(creds.email, creds.password)
      setAuth(data.user, data.access_token, data.refresh_token)
      navigate(ROLE_REDIRECTS[role])
      toast.success(`Switched to ${role} view`)
    } catch {
      toast.error('Could not switch role — backend may be offline')
    }
  }

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <HamburgerButton />
        <nav className="text-sm">
          <span className="text-neutral-500">GoalFlow</span>
          <span className="text-neutral-300 mx-2">›</span>
          <span className="text-neutral-800 font-semibold">{breadcrumb}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Demo role switcher */}
        {isDemoMode && (
          <div className="bg-neutral-100 rounded-full p-1 flex gap-1">
            {(['employee', 'manager', 'admin'] as const).map((role) => (
              <button
                key={role}
                onClick={() => switchRole(role)}
                className={
                  user?.role === role
                    ? 'bg-primary-500 text-white text-xs px-3 py-1 rounded-full font-medium transition-all'
                    : 'text-neutral-600 text-xs px-3 py-1 rounded-full hover:bg-neutral-200 transition-all'
                }
              >
                {role.charAt(0).toUpperCase() + role.slice(1, 3)}
              </button>
            ))}
          </div>
        )}

        <NotificationBell />

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-semibold cursor-pointer">
          {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
