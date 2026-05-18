import { useState } from 'react'
import { CheckCircle, Lock, Loader2, Sparkles, AlertCircle, Save } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { ThrustAreaChip } from '../../components/shared/ThrustAreaChip'
import { UoMBadge } from '../../components/goals/UoMBadge'
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton'
import { EmptyState } from '../../components/shared/EmptyState'
import { useMyGoalSheet } from '../../hooks/useGoals'
import { useUpsertCheckin } from '../../hooks/useCheckins'
import type { Goal } from '../../types/goal'
import type { CheckInFormData } from '../../types/checkin'
import { computeScore, getScoreColor, getScoreLabel, formatDate } from '../../lib/utils'
import { aiAPI } from '../../lib/api'
import { cn } from '../../lib/utils'

const QUARTERS = [
  { key: 'Q1', label: 'Q1 · July', open: true },
  { key: 'Q2', label: 'Q2 · October', open: false },
  { key: 'Q3', label: 'Q3 · January', open: false },
  { key: 'Q4', label: 'Q4 · March', open: false },
]

type CheckInStatus = 'not_started' | 'on_track' | 'completed'

interface GoalCheckinState {
  status: CheckInStatus
  actualValue?: number
  actualDate?: string
  notes?: string
  aiCoaching?: string
  aiLoading?: boolean
}

export default function CheckIn() {
  const [activeQuarter, setActiveQuarter] = useState('Q1')
  const [checkinStates, setCheckinStates] = useState<Record<string, GoalCheckinState>>({})
  const { data: sheet, isLoading } = useMyGoalSheet()
  const upsertCheckin = useUpsertCheckin()

  const goals: Goal[] = sheet?.goals || []
  const isWindowOpen = QUARTERS.find((q) => q.key === activeQuarter)?.open ?? false

  const updateState = (goalId: string, update: Partial<GoalCheckinState>) => {
    setCheckinStates((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], ...update },
    }))
  }

  const getCheckinState = (goalId: string): GoalCheckinState =>
    checkinStates[goalId] || { status: 'not_started' }

  const getScore = (goal: Goal, state: GoalCheckinState): number => {
    if (goal.uom_type === 'zero_based') return state.actualValue === 0 ? 100 : 0
    if (goal.uom_type === 'timeline') {
      return computeScore(goal.uom_type, 0, 0, goal.target_date, state.actualDate)
    }
    return computeScore(goal.uom_type, goal.target_value || 100, state.actualValue || 0)
  }

  const getAICoaching = async (goal: Goal, goalId: string) => {
    updateState(goalId, { aiLoading: true })
    try {
      const state = getCheckinState(goalId)
      const res = await aiAPI.coachCheckin({
        goal_title: goal.title,
        target: goal.target_value,
        actual: state.actualValue,
        quarter: activeQuarter,
      })
      updateState(goalId, { aiCoaching: res.data.coaching || res.data.message, aiLoading: false })
    } catch {
      updateState(goalId, {
        aiCoaching: `Great effort on tracking "${goal.title}"! Focus on maintaining momentum this quarter. Consider breaking down your target into weekly milestones to stay on track. Remember: consistent progress beats last-minute sprints!`,
        aiLoading: false,
      })
    }
  }

  const handleSaveAll = async () => {
    const updates: CheckInFormData[] = goals.map((goal) => {
      const state = getCheckinState(goal.id)
      return {
        goal_id: goal.id,
        quarter: activeQuarter,
        status: state.status,
        actual_value: state.actualValue,
        actual_date: state.actualDate,
        employee_notes: state.notes,
      }
    })
    for (const update of updates) {
      await upsertCheckin.mutateAsync(update)
    }
  }

  if (isLoading) return <PageWrapper><LoadingSkeleton count={3} /></PageWrapper>

  return (
    <PageWrapper>
      <h1 className="page-title mb-6">Check-ins</h1>

      {/* Quarter tabs */}
      <div className="bg-white border border-neutral-200 rounded-xl mb-6 flex overflow-hidden">
        {QUARTERS.map((q) => (
          <button
            key={q.key}
            onClick={() => setActiveQuarter(q.key)}
            className={cn(
              'flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-all',
              activeQuarter === q.key
                ? 'border-b-2 border-primary-500 text-primary-600 font-semibold bg-primary-50/50'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
            )}
          >
            {q.label}
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', q.open ? 'bg-green-500' : 'bg-neutral-300')} />
          </button>
        ))}
      </div>

      {/* Window Status Banner */}
      <div className={cn(
        'rounded-xl px-5 py-3 flex items-center gap-2 mb-6 border',
        isWindowOpen
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-neutral-100 border-neutral-200 text-neutral-600'
      )}>
        {isWindowOpen ? <CheckCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        <span className="text-sm">
          {isWindowOpen
            ? `${activeQuarter} check-in window is open — update your progress by ${QUARTERS.find((q) => q.key === activeQuarter)?.label.split('·')[1]?.trim()} 31`
            : `${activeQuarter} window is closed. Contact your admin to enable updates.`
          }
        </span>
      </div>

      {/* Goal check-in cards */}
      {goals.length === 0 ? (
        <EmptyState icon={AlertCircle} title="No goals to check in" description="Add goals in My Goals to start tracking progress." />
      ) : (
        goals.map((goal) => {
          const state = getCheckinState(goal.id)
          const score = getScore(goal, state)
          const scoreColor = getScoreColor(score)

          return (
            <div key={goal.id} className="bg-white border border-neutral-200 rounded-xl p-6 mb-4">
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <ThrustAreaChip area={goal.thrust_area} />
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-neutral-800">{goal.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <UoMBadge type={goal.uom_type} />
                    {goal.target_value != null && <span className="text-sm text-neutral-500">Target: {goal.target_value}</span>}
                    {goal.target_date && <span className="text-sm text-neutral-500">Due: {formatDate(goal.target_date)}</span>}
                  </div>
                </div>
              </div>

              {/* Status toggle */}
              <div className="mb-4">
                <label className="label-base">Progress Status</label>
                <div className="flex rounded-lg overflow-hidden border border-neutral-200 w-fit">
                  {(['not_started', 'on_track', 'completed'] as CheckInStatus[]).map((s) => (
                    <button
                      key={s}
                      disabled={!isWindowOpen}
                      onClick={() => updateState(goal.id, { status: s })}
                      className={cn(
                        'px-4 py-2 text-sm font-medium transition-all border-r last:border-r-0 border-neutral-200 disabled:cursor-not-allowed disabled:opacity-60',
                        state.status === s
                          ? s === 'not_started'
                            ? 'bg-neutral-100 text-neutral-700'
                            : s === 'on_track'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      {s === 'not_started' ? 'Not Started' : s === 'on_track' ? 'On Track' : 'Completed'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actual value */}
              {goal.uom_type !== 'zero_based' && (
                <div className="mb-4">
                  <label className="label-base">
                    {goal.uom_type === 'timeline' ? 'Actual Completion Date' : 'Actual Value'}
                  </label>
                  {goal.uom_type === 'timeline' ? (
                    <input
                      type="date"
                      disabled={!isWindowOpen}
                      className="input-base w-48"
                      value={state.actualDate || ''}
                      onChange={(e) => updateState(goal.id, { actualDate: e.target.value })}
                    />
                  ) : (
                    <input
                      type="number"
                      disabled={!isWindowOpen}
                      placeholder="Enter actual value..."
                      className="input-base w-48"
                      value={state.actualValue ?? ''}
                      onChange={(e) => updateState(goal.id, { actualValue: parseFloat(e.target.value) || 0 })}
                    />
                  )}
                </div>
              )}

              {/* Score preview */}
              <div className="bg-neutral-50 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
                <span className="text-xs text-neutral-500">Projected Score:</span>
                <span className={cn('text-2xl font-bold', scoreColor.split(' ')[0])}>{score.toFixed(0)}%</span>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', scoreColor)}>
                  {getScoreLabel(score)}
                </span>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="label-base">Notes (optional)</label>
                <textarea
                  disabled={!isWindowOpen}
                  placeholder="Add notes about your progress..."
                  className="input-base h-20 resize-none"
                  value={state.notes || ''}
                  onChange={(e) => updateState(goal.id, { notes: e.target.value })}
                />
              </div>

              {/* AI Coach */}
              <div>
                <button
                  onClick={() => getAICoaching(goal, goal.id)}
                  disabled={state.aiLoading}
                  className="bg-gradient-to-r from-primary-500 to-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-60"
                >
                  {state.aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Get AI Coaching
                </button>

                {state.aiCoaching && (
                  <div className="bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-200 rounded-lg p-4 mt-3">
                    <p className="text-sm text-neutral-700 italic leading-relaxed">{state.aiCoaching}</p>
                    <p className="text-[11px] text-neutral-400 mt-2">Powered by Groq + LLaMA</p>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Sticky save bar */}
      {goals.length > 0 && (
        <div className="fixed bottom-0 right-0 left-0 lg:left-[240px] bg-white border-t border-neutral-200 px-6 py-4 flex items-center justify-between z-30">
          <span className="text-sm text-neutral-600">{goals.length} goals to update</span>
          <button
            onClick={handleSaveAll}
            disabled={!isWindowOpen || upsertCheckin.isPending}
            className="btn-primary px-8 flex items-center gap-2 disabled:opacity-50"
          >
            {upsertCheckin.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save All Check-ins</>
            )}
          </button>
        </div>
      )}
    </PageWrapper>
  )
}
