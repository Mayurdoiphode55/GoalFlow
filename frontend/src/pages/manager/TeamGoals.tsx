import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, CheckSquare, Clock, FileCheck, AlertCircle } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton'
import { EmptyState } from '../../components/shared/EmptyState'
import { useTeamSheets } from '../../hooks/useGoals'
import type { GoalSheet } from '../../types/goal'
import { timeAgo } from '../../lib/utils'
import { cn } from '../../lib/utils'

type Tab = 'pending' | 'approved' | 'all'

export default function TeamGoals() {
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const { data: sheets = [], isLoading } = useTeamSheets()

  const filtered = sheets.filter((s: GoalSheet) => {
    const matchSearch = !search || s.employee?.name?.toLowerCase().includes(search.toLowerCase())
    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && s.status === 'submitted') ||
      (activeTab === 'approved' && s.status === 'approved')
    return matchSearch && matchTab
  })

  const pendingCount = sheets.filter((s: GoalSheet) => s.status === 'submitted').length
  const approvedCount = sheets.filter((s: GoalSheet) => s.status === 'approved').length

  if (isLoading) return <PageWrapper><LoadingSkeleton count={4} /></PageWrapper>

  return (
    <PageWrapper>
      <h1 className="page-title mb-6">Team Goals</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Approval', value: pendingCount, color: 'text-amber-600', icon: Clock },
          { label: 'Approved', value: approvedCount, color: 'text-green-600', icon: CheckSquare },
          { label: 'Team Size', value: sheets.length, color: 'text-neutral-800', icon: Users },
        ].map((stat) => (
          <div key={stat.label} className="card text-center">
            <p className={cn('text-3xl font-bold mb-1', stat.color)}>{stat.value}</p>
            <p className="text-sm text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + search */}
      <div className="flex items-center gap-3 mb-4">
        <input
          placeholder="Search employee..."
          className="input-base w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 mb-4">
        {([
          ['pending', `Pending Approval (${pendingCount})`],
          ['approved', 'Approved'],
          ['all', 'All'],
        ] as [Tab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all',
              activeTab === tab
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sheet cards */}
      {filtered.length === 0 ? (
        <EmptyState icon={FileCheck} title="No goal sheets found" description="No sheets match your current filter." />
      ) : (
        filtered.map((sheet: GoalSheet) => (
          <div key={sheet.id} className="bg-white border border-neutral-200 rounded-xl p-5 mb-3 flex items-center gap-4 hover:shadow-card-hover transition-all">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">
              {sheet.employee?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-800">{sheet.employee?.name}</p>
              <p className="text-xs text-neutral-500">{sheet.employee?.department || 'No department'}</p>
              {sheet.submitted_at && (
                <p className="text-xs text-neutral-400 mt-0.5">Submitted {timeAgo(sheet.submitted_at)}</p>
              )}
            </div>

            {/* Goals count */}
            <span className="text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded flex-shrink-0">
              {sheet.goals?.length || 0} goals
            </span>

            {/* Weightage check */}
            {(sheet.total_weightage || 0) === 100
              ? <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            }

            {/* Status */}
            <StatusBadge status={sheet.status} />

            {/* Action */}
            <Link
              to={`/manager/approve/${sheet.id}`}
              className="btn-primary text-xs px-4 py-2 flex-shrink-0"
            >
              Review &amp; Approve →
            </Link>
          </div>
        ))
      )}
    </PageWrapper>
  )
}
