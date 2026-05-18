import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken })
        useAuthStore.getState().setAccessToken(data.access_token)
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        return api(originalRequest)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
}

export const goalsAPI = {
  getMySheet: () => api.get('/goals/sheets/mine'),
  getTeamSheets: () => api.get('/goals/sheets/team'),
  getSheet: (id: string) => api.get(`/goals/sheets/${id}`),
  createGoal: (data: unknown) => api.post('/goals', data),
  updateGoal: (id: string, data: unknown) => api.put(`/goals/${id}`, data),
  deleteGoal: (id: string) => api.delete(`/goals/${id}`),
  submitSheet: (id: string) => api.post(`/goals/sheets/${id}/submit`),
  approveSheet: (id: string) => api.post(`/goals/sheets/${id}/approve`),
  returnSheet: (id: string, reason: string) =>
    api.post(`/goals/sheets/${id}/return`, { return_reason: reason }),
  unlockSheet: (id: string) => api.post(`/goals/sheets/${id}/unlock`),
}

export const checkinsAPI = {
  getForQuarter: (quarter: string) => api.get(`/checkins/quarter/${quarter}`),
  getForGoal: (goalId: string) => api.get(`/checkins/goal/${goalId}`),
  upsert: (data: unknown) => api.post('/checkins', data),
  addManagerComment: (id: string, comment: string) =>
    api.post(`/checkins/${id}/manager-comment`, { comment }),
  getTeamCheckins: (quarter: string) => api.get(`/checkins/team/${quarter}`),
}

export const analyticsAPI = {
  getQoQ: (params?: unknown) => api.get('/analytics/qoq', { params }),
  getHeatmap: (cycleId?: string) => api.get('/analytics/completion-heatmap', { params: { cycle_id: cycleId } }),
  getThrustDistribution: (cycleId?: string) => api.get('/analytics/thrust-distribution', { params: { cycle_id: cycleId } }),
  getManagerEffectiveness: (cycleId?: string) => api.get('/analytics/manager-effectiveness', { params: { cycle_id: cycleId } }),
}

export const reportsAPI = {
  downloadAchievement: (cycleId: string, format: 'csv' | 'excel') =>
    api.get('/reports/achievement', { params: { cycle_id: cycleId, format }, responseType: 'blob' }),
  downloadCompletion: (cycleId: string, quarter?: string) =>
    api.get('/reports/completion', { params: { cycle_id: cycleId, quarter }, responseType: 'blob' }),
}

export const aiAPI = {
  suggestGoals: (thrustArea: string, role: string, department: string) =>
    api.post('/ai/suggest-goal', { thrust_area: thrustArea, employee_role: role, department }),
  suggestWeightage: (goals: unknown[]) =>
    api.post('/ai/suggest-weightage', { goals }),
  coachCheckin: (data: unknown) => api.post('/ai/coach-checkin', data),
  analyzeGoals: (goals: unknown[]) => api.post('/ai/analyze-goals', { goals }),
}

export const adminAPI = {
  getUsers: () => api.get('/users'),
  createUser: (data: unknown) => api.post('/users', data),
  updateUser: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  getCycles: () => api.get('/cycles'),
  createCycle: (data: unknown) => api.post('/cycles', data),
  activateCycle: (id: string) => api.post(`/cycles/${id}/activate`),
  getAuditLogs: (params?: unknown) => api.get('/audit', { params }),
  getEscalationRules: () => api.get('/escalation/rules'),
  createEscalationRule: (data: unknown) => api.post('/escalation/rules', data),
  updateEscalationRule: (id: string, data: unknown) => api.put(`/escalation/rules/${id}`, data),
  getEscalationLogs: () => api.get('/escalation/logs'),
  getCompletionDashboard: () => api.get('/admin/completion'),
}
