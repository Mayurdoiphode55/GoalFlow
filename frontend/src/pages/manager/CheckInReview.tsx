import { useState } from 'react'
import { ChevronDown, ChevronUp, Users, CheckSquare, Loader2 } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { ScorePill } from '../../components/shared/ScorePill'
import { EmptyState } from '../../components/shared/EmptyState'
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton'
import { useTeamCheckins, useAddManagerComment } from '../../hooks/useCheckins'
import { cn } from '../../lib/utils'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export default function CheckInReview() {
  const [activeQuarter, setActiveQuarter] = useState('Q1')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const { data: teamCheckins = [], isLoading } = useTeamCheckins(activeQuarter)
  const addComment = useAddManagerComment()

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  if (isLoading) return <PageWrapper><LoadingSkeleton count={3} /></PageWrapper>

  return (
    <PageWrapper>
      <h1 className="page-title mb-6">Check-in Review</h1>
      <div className="flex border-b border-neutral-200 mb-6">
        {QUARTERS.map((q) => (
          <button key={q} onClick={() => setActiveQuarter(q)}
            className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all',
              activeQuarter === q ? 'border-primary-500 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700')}>
            {q}
          </button>
        ))}
      </div>
      {teamCheckins.length === 0 ? (
        <EmptyState icon={Users} title="No check-in data" description="No team members submitted check-ins for this quarter." />
      ) : (
        (teamCheckins as Record<string, unknown>[]).map((member) => {
          const memberId = String(member.employee_id || member.id || '')
          const checkins = (member.checkins as Record<string, unknown>[]) || []
          const avgScore = checkins.length > 0 ? checkins.reduce((s, c) => s + ((c.score as number) || 0), 0) / checkins.length : 0
          return (
            <div key={memberId} className="bg-white border border-neutral-200 rounded-xl mb-3 overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-neutral-50" onClick={() => toggle(memberId)}>
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center">
                  {String(member.employee_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-800">{String(member.employee_name || '')}</p>
                  <p className="text-xs text-neutral-500">{String(member.department || '')}</p>
                </div>
                <StatusBadge status={checkins.length > 0 ? 'completed' : 'not_started'} />
                {avgScore > 0 && <ScorePill score={avgScore} showLabel />}
                {expanded[memberId] ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
              </div>
              {expanded[memberId] && (
                <div className="border-t border-neutral-100">
                  {checkins.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-neutral-400">No check-ins submitted</div>
                  ) : (
                    <>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-100">
                            {['Goal', 'Target', 'Actual', 'Score', 'Status'].map((h) => (
                              <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {checkins.map((ci) => (
                            <tr key={String(ci.id)} className="border-b border-neutral-50">
                              <td className="px-4 py-3 text-sm font-medium text-neutral-800">{String(ci.goal_title || '')}</td>
                              <td className="px-4 py-3 text-sm text-neutral-600">{String(ci.target_value || '—')}</td>
                              <td className="px-4 py-3 text-sm text-neutral-600">{String(ci.actual_value || '—')}</td>
                              <td className="px-4 py-3">{ci.score ? <ScorePill score={Number(ci.score)} showLabel /> : '—'}</td>
                              <td className="px-4 py-3"><StatusBadge status={(ci.status as 'not_started' | 'on_track' | 'completed')} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="border-t border-neutral-100 p-4">
                        <label className="label-base">Check-in Comment</label>
                        <textarea placeholder="Add a comment..." className="input-base h-20 resize-none mb-2"
                          value={comments[memberId] || String(checkins[0]?.manager_comment || '')}
                          onChange={(e) => setComments((prev) => ({ ...prev, [memberId]: e.target.value }))} />
                        <button
                          onClick={() => { const ci = checkins[0]; if (ci?.id && comments[memberId]) addComment.mutateAsync({ id: String(ci.id), comment: comments[memberId] }) }}
                          disabled={addComment.isPending} className="btn-primary text-sm flex items-center gap-2">
                          {addComment.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />} Save Comment
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </PageWrapper>
  )
}
