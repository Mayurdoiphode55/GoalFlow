import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { ThrustAreaChip } from '../../components/shared/ThrustAreaChip'
import { UoMBadge } from '../../components/goals/UoMBadge'
import { WeightageBar } from '../../components/shared/WeightageBar'
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton'
import { useGoalSheet, useApproveSheet, useReturnSheet } from '../../hooks/useGoals'
import type { Goal } from '../../types/goal'
import { timeAgo, cn } from '../../lib/utils'

export default function ApproveGoals() {
  const { sheetId } = useParams<{ sheetId: string }>()
  const navigate = useNavigate()
  const { data: sheet, isLoading } = useGoalSheet(sheetId || '')
  const approveSheet = useApproveSheet()
  const returnSheet = useReturnSheet()

  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [editedGoals, setEditedGoals] = useState<Record<string, Partial<Goal>>>({})

  const goals: Goal[] = sheet?.goals || []
  const totalWeightage = goals.reduce((s: number, g: Goal) => {
    const edited = editedGoals[g.id]
    return s + (edited?.weightage ?? g.weightage)
  }, 0)

  const handleApprove = useCallback(async () => {
    if (!sheetId) return
    await approveSheet.mutateAsync(sheetId)
    navigate('/manager/team')
  }, [sheetId, approveSheet, navigate])

  // Ctrl+Enter shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') handleApprove()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleApprove])

  if (isLoading) return <PageWrapper><LoadingSkeleton count={4} /></PageWrapper>

  return (
    <PageWrapper>
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Team Goals
      </button>

      {/* Employee info bar */}
      <div className="bg-white border border-neutral-200 rounded-xl px-6 py-4 flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center">
          {sheet?.employee?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold text-neutral-800">{sheet?.employee?.name}</p>
          <p className="text-sm text-neutral-500">{sheet?.employee?.department} · {sheet?.submitted_at ? `Submitted ${timeAgo(sheet.submitted_at)}` : ''}</p>
        </div>
      </div>

      <h2 className="section-title mb-4">Goals Review</h2>

      {/* Goals table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                {['Thrust Area', 'Goal Title', 'UoM', 'Target', 'Weightage %', 'Manager Notes'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => {
                return (
                  <tr key={goal.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-4">
                      <ThrustAreaChip area={goal.thrust_area} />
                    </td>
                    <td className="px-4 py-4 max-w-[200px]">
                      <p className="text-sm font-semibold text-neutral-800">{goal.title}</p>
                      {goal.description && (
                        <p className="text-xs text-neutral-500 mt-1 truncate">{goal.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4"><UoMBadge type={goal.uom_type} /></td>
                    <td className="px-4 py-4">
                      <input
                        type={goal.uom_type === 'timeline' ? 'date' : 'number'}
                        defaultValue={goal.target_value ?? goal.target_date ?? ''}
                        className="input-base w-28"
                        onChange={(e) => setEditedGoals((prev) => ({
                          ...prev,
                          [goal.id]: { ...prev[goal.id], target_value: parseFloat(e.target.value) }
                        }))}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        defaultValue={goal.weightage}
                        min={10} max={90}
                        className="input-base w-20"
                        onChange={(e) => setEditedGoals((prev) => ({
                          ...prev,
                          [goal.id]: { ...prev[goal.id], weightage: parseInt(e.target.value) || 0 }
                        }))}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        placeholder="Notes..."
                        defaultValue={goal.manager_notes || ''}
                        className="input-base w-36 text-xs"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weightage bar */}
      <div className="mb-24">
        <WeightageBar used={totalWeightage} />
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-[240px] bg-white border-t border-neutral-200 px-6 py-4 flex items-center gap-3 justify-end z-30">
        <span className="text-xs text-neutral-400 mr-auto">Ctrl+Enter to approve</span>
        <button
          onClick={() => setReturnModalOpen(true)}
          className="btn-danger text-sm"
        >
          Return for Rework
        </button>
        <button
          onClick={handleApprove}
          disabled={approveSheet.isPending || totalWeightage !== 100}
          className={cn(
            'px-8 py-2.5 rounded-lg font-semibold text-sm text-white flex items-center gap-2 transition-all',
            totalWeightage === 100
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-neutral-300 cursor-not-allowed'
          )}
        >
          {approveSheet.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Approve Goals
        </button>
      </div>

      {/* Return modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setReturnModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-neutral-800 mb-4">Return Goals for Rework</h3>
            <label className="label-base">Return Reason *</label>
            <textarea
              placeholder="Explain what needs to be changed..."
              className="input-base h-28 resize-none mb-4"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setReturnModalOpen(false)} className="btn-secondary">Cancel</button>
              <button
                disabled={!returnReason.trim() || returnSheet.isPending}
                onClick={async () => {
                  if (sheetId) {
                    await returnSheet.mutateAsync({ id: sheetId, reason: returnReason })
                    navigate('/manager/team')
                  }
                }}
                className="btn-danger flex items-center gap-2"
              >
                {returnSheet.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Return with Reason
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
