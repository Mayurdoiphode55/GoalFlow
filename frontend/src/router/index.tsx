import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PrivateRoute } from './PrivateRoute'
import Login from '../pages/Login'
import EmployeeDashboard from '../pages/employee/Dashboard'
import MyGoals from '../pages/employee/MyGoals'
import CheckIn from '../pages/employee/CheckIn'
import TeamGoals from '../pages/manager/TeamGoals'
import ApproveGoals from '../pages/manager/ApproveGoals'
import CheckInReview from '../pages/manager/CheckInReview'
import ManagerDashboard from '../pages/manager/ManagerDashboard'
import AdminDashboard from '../pages/admin/AdminDashboard'
import CompletionDashboard from '../pages/admin/CompletionDashboard'
import Analytics from '../pages/admin/Analytics'
import Reports from '../pages/admin/Reports'
import AuditLogs from '../pages/admin/AuditLogs'
import EscalationRules from '../pages/admin/EscalationRules'
import CycleManagement from '../pages/admin/CycleManagement'
import UserManagement from '../pages/admin/UserManagement'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <PrivateRoute><AppLayout /></PrivateRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <PrivateRoute roles={['employee', 'manager', 'admin']}><EmployeeDashboard /></PrivateRoute> },
      { path: 'my-goals', element: <PrivateRoute roles={['employee', 'manager', 'admin']}><MyGoals /></PrivateRoute> },
      { path: 'checkins', element: <PrivateRoute roles={['employee', 'manager', 'admin']}><CheckIn /></PrivateRoute> },
      { path: 'manager/dashboard', element: <PrivateRoute roles={['manager', 'admin']}><ManagerDashboard /></PrivateRoute> },
      { path: 'manager/team', element: <PrivateRoute roles={['manager', 'admin']}><TeamGoals /></PrivateRoute> },
      { path: 'manager/approve/:sheetId', element: <PrivateRoute roles={['manager', 'admin']}><ApproveGoals /></PrivateRoute> },
      { path: 'manager/approve', element: <PrivateRoute roles={['manager', 'admin']}><TeamGoals /></PrivateRoute> },
      { path: 'manager/checkins', element: <PrivateRoute roles={['manager', 'admin']}><CheckInReview /></PrivateRoute> },
      { path: 'admin/dashboard', element: <PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute> },
      { path: 'admin/completion', element: <PrivateRoute roles={['admin']}><CompletionDashboard /></PrivateRoute> },
      { path: 'admin/analytics', element: <PrivateRoute roles={['admin']}><Analytics /></PrivateRoute> },
      { path: 'admin/reports', element: <PrivateRoute roles={['admin']}><Reports /></PrivateRoute> },
      { path: 'admin/audit', element: <PrivateRoute roles={['admin']}><AuditLogs /></PrivateRoute> },
      { path: 'admin/escalation', element: <PrivateRoute roles={['admin']}><EscalationRules /></PrivateRoute> },
      { path: 'admin/cycles', element: <PrivateRoute roles={['admin']}><CycleManagement /></PrivateRoute> },
      { path: 'admin/users', element: <PrivateRoute roles={['admin']}><UserManagement /></PrivateRoute> },
    ],
  },
])
