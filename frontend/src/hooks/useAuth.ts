import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { user, accessToken, setAuth, logout } = useAuthStore()
  return {
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    setAuth,
    logout,
  }
}
