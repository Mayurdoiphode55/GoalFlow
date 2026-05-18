import { PageWrapper } from '../../components/layout/PageWrapper'
import { useCountUp } from '../../hooks/useCountUp'
import { useTeamSheets } from '../../hooks/useGoals'
import { Users, FileCheck, CheckCircle, Activity } from 'lucide-react'

function StatCard({ label, value, icon: Icon, bg, iconColor }: { label: string; value: number; icon: React.ElementType; bg: string; iconColor: string }) {
  const count = useCountUp(value)
  return (
    <div className="card">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <p className="text-3xl font-bold text-neutral-800">{count}</p>
      <p className="text-sm text-neutral-500 mt-1">{label}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: sheets = [] } = useTeamSheets()
  return (
    <PageWrapper>
      <h1 className="page-title mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Sheets" value={sheets.length} icon={FileCheck} bg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Approved" value={sheets.filter((s: Record<string, unknown>) => s.status === 'approved').length} icon={CheckCircle} bg="bg-green-50" iconColor="text-green-600" />
        <StatCard label="Pending" value={sheets.filter((s: Record<string, unknown>) => s.status === 'submitted').length} icon={Activity} bg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard label="Employees" value={sheets.length} icon={Users} bg="bg-primary-50" iconColor="text-primary-600" />
      </div>
    </PageWrapper>
  )
}
