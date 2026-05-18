import { Link } from 'react-router-dom'
import { Target, Calendar, ArrowRight, Plus, Sparkles, AlertCircle } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { ProgressRing } from '../../components/shared/ProgressRing'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { ThrustAreaChip } from '../../components/shared/ThrustAreaChip'
import { UoMBadge } from '../../components/goals/UoMBadge'
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton'
import { EmptyState } from '../../components/shared/EmptyState'
import { useMyGoalSheet } from '../../hooks/useGoals'
import { useAuthStore } from '../../store/authStore'
import type { Goal } from '../../types/goal'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const CURRENT_CYCLE = 'FY 2025-26'

function getNextCheckinInfo() {
  const now = new Date()
  const month = now.getMonth() // 0-indexed
  if (month >= 6 && month < 9) return { quarter: 'Q1', month: 'July', days: Math.max(0, new Date(now.getFullYear(), 9, 1).getTime() - now.getTime()) }
  if (month >= 9 && month < 12) return { quarter: 'Q2', month: 'October', days: 30 }
  if (month >= 0 && month < 3) return { quarter: 'Q3', month: 'January', days: 45 }
  return { quarter: 'Q4', month: 'March', days: 60 }
}

const MOCK_ACTIVITIES = [
  { icon: '✅', text: 'Q1 Check-in saved successfully', time: '2 hours ago' },
  { icon: '📋', text: 'Goals submitted for manager approval', time: '3 days ago' },
  { icon: '🎯', text: 'New goal added: Increase revenue by 20%', time: '1 week ago' },
  { icon: '✔️', text: 'Goals approved by Manager', time: '2 weeks ago' },
]

export default function EmployeeDashboard() {
  const { data: sheet, isLoading, error } = useMyGoalSheet()
  const { user } = useAuthStore()
  const nextCheckin = getNextCheckinInfo()

  if (isLoading) return <PageWrapper><LoadingSkeleton count={3} /></PageWrapper>
  if (error) return (
    <PageWrapper>
      <EmptyState icon={AlertCircle} title="Failed to load dashboard" description="Try refreshing the page." />
    </PageWrapper>
  )

  const goals: Goal[] = sheet?.goals || []
  const status = sheet?.status || 'draft'
  const overallScore = goals.length > 0 ? Math.round(
    goals.reduce((s: number, g: Goal) => s + (g.weightage || 0), 0) * 0.75
  ) : 0
  const daysAway = Math.round(nextCheckin.days / (1000 * 60 * 60 * 24))

  return (
    <PageWrapper>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="page-title">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-neutral-500 mt-1">Here's an overview of your goal progress</p>
      </div>

      {/* Hero stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Cycle */}
        <div className="card">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Current Cycle</p>
          <p className="text-2xl font-bold text-neutral-800 mb-2">{CURRENT_CYCLE}</p>
          <StatusBadge status={status} />
        </div>

        {/* Overall Achievement */}
        <div className="card flex flex-col items-center text-center">
          <ProgressRing percentage={overallScore} size={96} />
          <p className="text-sm font-semibold text-neutral-600 mt-3">Overall Achievement</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">{overallScore}%</p>
        </div>

        {/* Next Check-in */}
        <div className="card">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Next Check-in</p>
          <p className="text-lg font-semibold text-neutral-800">{nextCheckin.quarter} · {nextCheckin.month}</p>
          <p className="mt-2">
            <span className="text-2xl font-bold text-amber-600">{isNaN(daysAway) ? '—' : daysAway}</span>
            <span className="text-sm text-neutral-500 ml-1">days away</span>
          </p>
        </div>
      </div>

      {/* Goals summary */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            My Goals
            <span className="bg-neutral-100 text-neutral-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {goals.length}
            </span>
          </h2>
          <Link to="/my-goals" className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals added yet"
            description="Click 'Add Goal' to start defining your performance goals."
            action={
              <Link to="/my-goals" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Goals
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {goals.slice(0, 4).map((goal: Goal) => (
              <div key={goal.id} className="bg-white border border-neutral-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:shadow-card-hover transition-all">
                <ThrustAreaChip area={goal.thrust_area} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 truncate">{goal.title}</p>
                  <UoMBadge type={goal.uom_type} className="mt-1" />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold text-neutral-600 bg-neutral-100 px-2 py-1 rounded">
                    {goal.weightage}%
                  </span>
                  {QUARTERS.map((q) => {
                    const s = goal.quarter_statuses?.[q] || 'not_started'
                    return (
                      <span key={q} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        s === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        s === 'on_track' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}>{q}</span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 card">
          <h2 className="section-title mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {MOCK_ACTIVITIES.map((activity, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-neutral-50 last:border-0">
                <span className="text-lg">{activity.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-neutral-700">{activity.text}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <h2 className="section-title mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/checkins"
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              <Calendar className="w-4 h-4" />
              Update Q{QUARTERS.indexOf(nextCheckin.quarter) + 1} Check-in
            </Link>
            <Link
              to="/my-goals"
              className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5"
            >
              <Plus className="w-4 h-4" /> Add a New Goal
            </Link>
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-teal-600 hover:opacity-90 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Analyze with AI
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
