import { useQuery } from '@tanstack/react-query'
import { Users, FileCheck, CheckCircle, ClipboardCheck, Activity } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useCountUp } from '../../hooks/useCountUp'
import { adminAPI } from '../../lib/api'
import type { CompletionStats, DepartmentStat } from '../../types/analytics'
import { timeAgo } from '../../lib/utils'
import { cn } from '../../lib/utils'

function StatCard({ label, value, icon: Icon, bg, iconColor }: { label: string; value: number; icon: React.ElementType; bg: string; iconColor: string }) {
  const count = useCountUp(value)
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-3', bg)}>
        <Icon className={cn('w-6 h-6', iconColor)} />
      </div>
      <p className="text-3xl font-bold text-neutral-800">{count}</p>
      <p className="text-sm text-neutral-500 mt-1">{label}</p>
    </div>
  )
}

export default function CompletionDashboard() {
  const { data: stats, isLoading } = useQuery<CompletionStats>({
    queryKey: ['admin', 'completion'],
    queryFn: () => adminAPI.getCompletionDashboard().then((r) => r.data),
  })
  const { events, isConnected } = useWebSocket('/ws/dashboard')

  const s = stats || { total_employees: 0, sheets_submitted: 0, goals_approved: 0, checkins_completed: 0, departments: [] }
  const departments = Array.isArray(s.departments) ? s.departments : []

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Completion Dashboard</h1>
        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
          <span className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-green-500 animate-pulse' : 'bg-neutral-400')} />
          {isConnected ? 'Live' : 'Reconnecting...'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Employees" value={s.total_employees} icon={Users} bg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Sheets Submitted" value={s.sheets_submitted} icon={FileCheck} bg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard label="Goals Approved" value={s.goals_approved} icon={CheckCircle} bg="bg-green-50" iconColor="text-green-600" />
        <StatCard label="Check-ins Done" value={s.checkins_completed} icon={ClipboardCheck} bg="bg-primary-50" iconColor="text-primary-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department table */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="section-title">Department Completion</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  {['Department', 'Employees', 'Submitted', 'Approved', 'Q1', 'Q2', 'Q3', 'Q4'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-400">Loading...</td></tr>
                ) : departments.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-400">No department data</td></tr>
                ) : (
                  departments.map((dept: DepartmentStat) => (
                    <tr key={dept.department} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-4 font-medium text-neutral-800">{dept.department}</td>
                      <td className="px-4 py-4 text-neutral-600">{dept.employee_count}</td>
                      {[
                        { v: dept.submitted, t: dept.employee_count },
                        { v: dept.approved, t: dept.employee_count },
                        { v: dept.q1_done, t: dept.employee_count },
                        { v: dept.q2_done, t: dept.employee_count },
                        { v: dept.q3_done, t: dept.employee_count },
                        { v: dept.q4_done, t: dept.employee_count },
                      ].map((cell, i) => {
                        const pct = cell.t > 0 ? Math.round((cell.v / cell.t) * 100) : 0
                        return (
                          <td key={i} className="px-4 py-4">
                            <span className="text-neutral-700">{cell.v}</span>
                            <div className="h-1.5 rounded-full bg-neutral-200 w-full mt-1">
                              <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live feed */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 h-[420px] flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary-500" />
            <h2 className="section-title text-base">Live Activity</h2>
            <span className={cn('w-2 h-2 rounded-full ml-auto', isConnected ? 'bg-green-500 animate-pulse' : 'bg-neutral-300')} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-0">
            {events.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-neutral-400">
                {isConnected ? 'Waiting for events...' : 'Connecting...'}
              </div>
            ) : (
              events.map((event, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-neutral-100 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-3.5 h-3.5 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      {String((event.payload as Record<string, unknown>)?.message || event.type)}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{timeAgo(event.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
