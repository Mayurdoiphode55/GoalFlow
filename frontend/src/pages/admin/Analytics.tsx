import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { useQoQAnalytics, useCompletionHeatmap, useThrustDistribution, useManagerEffectiveness } from '../../hooks/useAnalytics'
import { ScorePill } from '../../components/shared/ScorePill'
import { cn } from '../../lib/utils'

const HEATMAP_COLOR = (pct: number) => {
  if (pct <= 30) return 'bg-red-100 text-red-700'
  if (pct <= 60) return 'bg-amber-100 text-amber-700'
  if (pct <= 80) return 'bg-blue-100 text-blue-700'
  return 'bg-green-100 text-green-700'
}

const PIE_COLORS = ['#14b8a6', '#f59e0b', '#6366f1', '#ec4899', '#10b981', '#f97316', '#ef4444', '#0ea5e9', '#8b5cf6']

const MOCK_QOQ = [
  { quarter: 'Q1', employee: 78, team_avg: 72, org_avg: 68 },
  { quarter: 'Q2', employee: 84, team_avg: 75, org_avg: 71 },
  { quarter: 'Q3', employee: 91, team_avg: 79, org_avg: 74 },
  { quarter: 'Q4', employee: 88, team_avg: 82, org_avg: 77 },
]
const MOCK_HEATMAP = [
  { department: 'Engineering', Q1: 85, Q2: 72, Q3: 90, Q4: 78 },
  { department: 'Sales', Q1: 62, Q2: 88, Q3: 71, Q4: 94 },
  { department: 'HR', Q1: 45, Q2: 55, Q3: 68, Q4: 80 },
  { department: 'Finance', Q1: 92, Q2: 87, Q3: 95, Q4: 89 },
]
const MOCK_THRUST = [
  { thrust_area: 'Revenue Growth', count: 45 },
  { thrust_area: 'Quality', count: 30 },
  { thrust_area: 'Innovation', count: 25 },
  { thrust_area: 'Cost Optimization', count: 20 },
  { thrust_area: 'People Development', count: 15 },
]
const MOCK_MANAGERS = [
  { manager_name: 'Alice Johnson', team_size: 8, checkin_completion_pct: 95, avg_approval_days: 1.2, avg_score: 87 },
  { manager_name: 'Bob Smith', team_size: 6, checkin_completion_pct: 82, avg_approval_days: 2.5, avg_score: 74 },
  { manager_name: 'Carol Davis', team_size: 10, checkin_completion_pct: 60, avg_approval_days: 4.8, avg_score: 58 },
]

export default function Analytics() {
  const { data: qoqData } = useQoQAnalytics()
  const { data: heatmapData } = useCompletionHeatmap()
  const { data: thrustData } = useThrustDistribution()
  const { data: managersData } = useManagerEffectiveness()

  const qoq = Array.isArray(qoqData?.data_points) ? qoqData.data_points : Array.isArray(qoqData) ? qoqData : MOCK_QOQ
  const heatmap = Array.isArray(heatmapData?.data) ? heatmapData.data : Array.isArray(heatmapData) ? heatmapData : MOCK_HEATMAP
  const thrust = Array.isArray(thrustData?.by_thrust_area) ? thrustData.by_thrust_area : Array.isArray(thrustData) ? thrustData : MOCK_THRUST
  const managers = Array.isArray(managersData?.managers) ? managersData.managers : Array.isArray(managersData) ? managersData : MOCK_MANAGERS

  return (
    <PageWrapper>
      <h1 className="page-title mb-8">Analytics</h1>

      {/* QoQ Trend */}
      <div className="card mb-6">
        <h2 className="section-title mb-4">Quarter-over-Quarter Achievement Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={qoq} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#e7e5e4" strokeDasharray="4 4" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#78716c' }} />
            <YAxis domain={[0, 120]} tick={{ fontSize: 12, fill: '#78716c' }} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '12px' }} />
            <Legend />
            <Line type="monotone" dataKey="employee" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6' }} name="Employee" />
            <Line type="monotone" dataKey="team_avg" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} name="Team Avg" />
            <Line type="monotone" dataKey="org_avg" stroke="#a8a29e" strokeWidth={2} dot={{ fill: '#a8a29e' }} name="Org Avg" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <div className="card mb-6">
        <h2 className="section-title mb-4">Completion Heatmap</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-500">Department</th>
                {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                  <th key={q} className="px-4 py-2 text-center text-xs font-semibold text-neutral-500">{q}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(heatmap as Record<string, unknown>[]).map((row) => (
                <tr key={String(row.department)}>
                  <td className="px-4 py-2 text-sm font-medium text-neutral-700">{String(row.department)}</td>
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
                    const pct = Number(row[q] || 0)
                    return (
                      <td key={q} className="px-2 py-1">
                        <div className={cn('w-full h-12 rounded-lg flex items-center justify-center text-sm font-semibold', HEATMAP_COLOR(pct))}>
                          {pct}%
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          {[{ color: 'bg-red-100 text-red-700', label: '0–30%' }, { color: 'bg-amber-100 text-amber-700', label: '31–60%' }, { color: 'bg-blue-100 text-blue-700', label: '61–80%' }, { color: 'bg-green-100 text-green-700', label: '81–100%' }].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <span className={cn('w-4 h-4 rounded', item.color)} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Thrust Distribution + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="section-title mb-4">Goals by Thrust Area</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={thrust as Record<string, unknown>[]} dataKey="count" nameKey="thrust_area" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {(thrust as Record<string, unknown>[]).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="section-title mb-4">Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[{ name: 'Q1', not_started: 5, on_track: 20, completed: 15 }, { name: 'Q2', not_started: 3, on_track: 22, completed: 18 }]} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="not_started" fill="#e7e5e4" name="Not Started" />
              <Bar dataKey="on_track" fill="#3b82f6" name="On Track" />
              <Bar dataKey="completed" fill="#22c55e" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Manager Effectiveness */}
      <div className="card">
        <h2 className="section-title mb-4">Manager Effectiveness</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              {['Manager', 'Team Size', 'Check-in %', 'Avg Approval Days', 'Score'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(managers as Record<string, unknown>[]).map((m, i) => (
              <tr key={String(m.manager_name)} className={cn('border-b border-neutral-100', i === 0 ? 'bg-green-50' : i === managers.length - 1 ? 'bg-red-50' : '')}>
                <td className="px-4 py-4 font-medium text-neutral-800">{String(m.manager_name || 'Unknown')}</td>
                <td className="px-4 py-4 text-neutral-600">{Number(m.team_size || 0)}</td>
                <td className="px-4 py-4 text-neutral-600">{Number(m.checkin_completion_pct || 0).toFixed(0)}%</td>
                <td className="px-4 py-4 text-neutral-600">{Number(m.avg_approval_days || 0).toFixed(1)} days</td>
                <td className="px-4 py-4"><ScorePill score={Number(m.avg_score || 0)} showLabel /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  )
}
