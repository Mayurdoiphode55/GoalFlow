import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface PrivateRouteProps {
  children: React.ReactNode
  roles?: string[]
}

export function PrivateRoute({ children, roles }: PrivateRouteProps) {
  const { user, accessToken } = useAuthStore()

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to appropriate dashboard
    const redirects: Record<string, string> = {
      employee: '/dashboard',
      manager: '/manager/dashboard',
      admin: '/admin/completion',
    }
    return <Navigate to={redirects[user.role] || '/dashboard'} replace />
  }

  return <>{children}</>
}
