import { Link } from 'react-router-dom'
import { Users, Clock, ClipboardCheck, CheckSquare } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { useTeamSheets } from '../../hooks/useGoals'
import { useCountUp } from '../../hooks/useCountUp'
import type { GoalSheet } from '../../types/goal'
import { timeAgo } from '../../lib/utils'

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ElementType }) {
  const count = useCountUp(value)
  return (
    <div className="card">
      <Icon className={`w-8 h-8 mb-3 ${color}`} />
      <p className={`text-3xl font-bold mb-1 ${color}`}>{count}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  )
}

export default function ManagerDashboard() {
  const { data: sheets = [] } = useTeamSheets()
  const pending = sheets.filter((s: GoalSheet) => s.status === 'submitted')
  const approved = sheets.filter((s: GoalSheet) => s.status === 'approved')

  return (
    <PageWrapper>
      <h1 className="page-title mb-6">Manager Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Team Size" value={sheets.length} color="text-neutral-800" icon={Users} />
        <StatCard label="Pending Approvals" value={pending.length} color="text-amber-600" icon={Clock} />
        <StatCard label="Check-ins Pending" value={0} color="text-primary-600" icon={ClipboardCheck} />
        <StatCard label="Goals Approved" value={approved.length} color="text-green-600" icon={CheckSquare} />
      </div>
      {pending.length > 0 && (
        <div className="card">
          <h2 className="section-title mb-4">Pending Approvals</h2>
          <div className="space-y-3">
            {pending.slice(0, 5).map((sheet: GoalSheet) => (
              <div key={sheet.id} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold text-xs flex items-center justify-center">
                  {sheet.employee?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-800">{sheet.employee?.name}</p>
                  {sheet.submitted_at && <p className="text-xs text-neutral-400">{timeAgo(sheet.submitted_at)}</p>}
                </div>
                <Link to={`/manager/approve/${sheet.id}`} className="text-xs text-primary-600 font-semibold hover:underline">
                  Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
