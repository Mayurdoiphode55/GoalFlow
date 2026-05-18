import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'goal_submitted' | 'goal_approved' | 'goal_returned' | 'checkin_window' | 'escalation'
  text: string
  time: string
  read: boolean
}

interface UIState {
  sidebarOpen: boolean
  demoRole: 'employee' | 'manager' | 'admin' | null
  notifications: Notification[]
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setDemoRole: (role: 'employee' | 'manager' | 'admin') => void
  addNotification: (notification: Notification) => void
  markAllRead: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  demoRole: null,
  notifications: [],
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setDemoRole: (role) => set({ demoRole: role }),
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications].slice(0, 20) })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
}))
