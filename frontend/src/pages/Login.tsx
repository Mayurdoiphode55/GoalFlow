import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authAPI } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { cn } from '../lib/utils'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

const DEMO_CREDENTIALS = {
  employee: { email: 'employee@goalflow.com', password: 'Employee@123' },
  manager: { email: 'manager@goalflow.com', password: 'Manager@123' },
  admin: { email: 'admin@goalflow.com', password: 'Admin@123' },
}

const ROLE_REDIRECTS: Record<string, string> = {
  employee: '/dashboard',
  manager: '/manager/dashboard',
  admin: '/admin/completion',
}

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [apiError, setApiError] = useState('')
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setApiError('')
    try {
      const res = await authAPI.login(data.email, data.password)
      const { user, access_token, refresh_token } = res.data
      setAuth(user, access_token, refresh_token)
      navigate(ROLE_REDIRECTS[user.role] || '/dashboard', { replace: true })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setApiError(e.response?.data?.detail || 'Invalid email or password')
    }
  }

  const quickLogin = async (role: keyof typeof DEMO_CREDENTIALS) => {
    const { email, password } = DEMO_CREDENTIALS[role]
    setValue('email', email)
    setValue('password', password)
    setApiError('')
    try {
      const res = await authAPI.login(email, password)
      const { user, access_token, refresh_token } = res.data
      setAuth(user, access_token, refresh_token)
      navigate(ROLE_REDIRECTS[user.role] || '/dashboard', { replace: true })
    } catch {
      setApiError('Backend offline — demo unavailable')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-teal-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex gap-8 items-center">

        {/* Left decorative panel */}
        <div className="hidden lg:flex flex-col justify-between w-[55%] bg-neutral-900 rounded-3xl p-10 min-h-[560px] relative overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/15 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold text-lg">G</div>
              <span className="text-white font-bold text-xl">GoalFlow</span>
            </div>

            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Set Goals.<br />Track Progress.<br />Achieve More.
            </h1>
            <p className="text-neutral-400 text-lg mt-4 mb-10">
              Enterprise goal management designed for high-performance teams.
            </p>

            <div className="space-y-4">
              {[
                'Define goals with smart unit-of-measure tracking',
                'Real-time quarterly check-ins and score analytics',
                'AI-powered goal coaching and suggestions',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-300 text-sm leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <p className="text-neutral-600 text-xs">Trusted by enterprise teams worldwide</p>
          </div>
        </div>

        {/* Right login card */}
        <div className="flex-1 lg:w-[45%]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-auto">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold">G</div>
              <span className="text-neutral-800 font-bold text-xl">GoalFlow</span>
            </div>

            <h2 className="text-2xl font-bold text-neutral-800 mb-1">Welcome back</h2>
            <p className="text-sm text-neutral-500 mb-8">Sign in to your account</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <label className="label-base" htmlFor="email">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className={cn('input-base pl-10', errors.email && 'border-red-400 focus:ring-red-400')}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="label-base" htmlFor="password">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn('input-base pr-10', errors.password && 'border-red-400 focus:ring-red-400')}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.password.message}
                  </p>
                )}
              </div>

              {/* API Error */}
              {apiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {apiError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full h-11 text-base flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Demo quick-switch */}
            {isDemoMode && (
              <div className="border-t border-neutral-100 mt-6 pt-6">
                <p className="text-xs text-neutral-400 text-center mb-3 font-medium uppercase tracking-wider">
                  DEMO — Quick Login
                </p>
                <div className="flex gap-2">
                  {(['employee', 'manager', 'admin'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => quickLogin(role)}
                      className="flex-1 border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 text-neutral-600 hover:text-primary-700 text-xs px-3 py-2 rounded-lg transition-all capitalize"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
