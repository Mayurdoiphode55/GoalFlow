import { useState } from 'react'
import { Plus, Target, Lock, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { GoalCard } from '../../components/goals/GoalCard'
import { GoalFormDrawer } from '../../components/goals/GoalFormDrawer'
import { WeightageBar } from '../../components/shared/WeightageBar'
import { EmptyState } from '../../components/shared/EmptyState'
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { useMyGoalSheet, useCreateGoal, useUpdateGoal, useDeleteGoal, useSubmitSheet } from '../../hooks/useGoals'
import type { Goal, GoalFormData } from '../../types/goal'
import { cn } from '../../lib/utils'

const STATUS_BANNERS = {
  draft: {
    bg: 'bg-amber-50 border-amber-200',
    icon: Info,
    iconColor: 'text-amber-500',
    text: 'Your goals are in draft. Add goals and submit for manager approval.',
  },
  submitted: {
    bg: 'bg-blue-50 border-blue-200',
    icon: CheckCircle,
    iconColor: 'text-blue-500',
    text: 'Submitted for approval. Waiting for manager review.',
  },
  returned: {
    bg: 'bg-red-50 border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
    text: '',
  },
  approved: {
    bg: 'bg-green-50 border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-500',
    text: 'Goals approved and locked. Start tracking your progress!',
  },
  locked: {
    bg: 'bg-neutral-100 border-neutral-200',
    icon: Lock,
    iconColor: 'text-neutral-500',
    text: 'Goals are locked for this cycle.',
  },
}

export default function MyGoals() {
  const { data: sheet, isLoading, error } = useMyGoalSheet()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const submitSheet = useSubmitSheet()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  if (isLoading) return <PageWrapper><LoadingSkeleton count={3} /></PageWrapper>
  if (error) return (
    <PageWrapper>
      <EmptyState icon={AlertCircle} title="Failed to load goals" description="Check your connection and try again." />
    </PageWrapper>
  )

  const goals = sheet?.goals || []
  const status = sheet?.status || 'draft'
  const totalWeightage = goals.reduce((s: number, g: Goal) => s + g.weightage, 0)
  const isLocked = status === 'approved' || status === 'locked'
  const canSubmit = totalWeightage === 100 && status === 'draft'
  const remaining = 100 - totalWeightage

  const handleSave = async (data: GoalFormData) => {
    if (editingGoal) {
      await updateGoal.mutateAsync({ id: editingGoal.id, data })
    } else {
      await createGoal.mutateAsync({ ...data, sheet_id: sheet?.id })
    }
    setDrawerOpen(false)
    setEditingGoal(null)
  }

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setDrawerOpen(true)
  }

  const handleDelete = (id: string) => setDeleteTarget(id)

  const bannerConfig = STATUS_BANNERS[status as keyof typeof STATUS_BANNERS]
  const BannerIcon = bannerConfig?.icon

  return (
    <PageWrapper>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">My Goals</h1>
        {!isLocked && goals.length < 8 && (
          <button
            onClick={() => { setEditingGoal(null); setDrawerOpen(true) }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Goal
          </button>
        )}
      </div>

      {/* Status Banner */}
      {bannerConfig && (
        <div className={cn('border rounded-xl px-5 py-3 flex items-center gap-3 mb-4', bannerConfig.bg)}>
          <BannerIcon className={cn('w-5 h-5 flex-shrink-0', bannerConfig.iconColor)} />
          <span className="text-sm text-neutral-700">
            {status === 'returned'
              ? <>Returned by manager. {sheet?.return_reason && <span className="font-medium">Reason: {sheet.return_reason}</span>}</>
              : bannerConfig.text
            }
          </span>
        </div>
      )}

      {/* Weightage section */}
      <div className="bg-white border border-neutral-200 rounded-xl px-6 py-4 mb-6">
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-700 mb-2">Weightage Allocation</p>
            <WeightageBar used={totalWeightage} />
          </div>
          {!isLocked && (
            <button
              onClick={() => sheet && submitSheet.mutateAsync(sheet.id)}
              disabled={!canSubmit || submitSheet.isPending}
              className={cn(
                'btn-primary px-6 flex-shrink-0',
                !canSubmit && 'opacity-50 cursor-not-allowed'
              )}
              title={!canSubmit ? 'Allocate exactly 100% to submit' : 'Submit goals for approval'}
            >
              {submitSheet.isPending ? 'Submitting...' : 'Submit Goals'}
            </button>
          )}
        </div>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Start by adding your first goal to begin tracking your performance."
          action={
            !isLocked && (
              <button
                onClick={() => { setEditingGoal(null); setDrawerOpen(true) }}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 inline mr-2" /> Add Your First Goal
              </button>
            )
          }
        />
      ) : (
        <div>
          {goals.map((goal: Goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              locked={isLocked}
              onEdit={isLocked ? undefined : handleEdit}
              onDelete={isLocked ? undefined : handleDelete}
            />
          ))}
        </div>
      )}

      {/* Goal Form Drawer */}
      <GoalFormDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingGoal(null) }}
        onSave={handleSave}
        goal={editingGoal}
        remainingWeightage={remaining + (editingGoal?.weightage || 0)}
        isLoading={createGoal.isPending || updateGoal.isPending}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteGoal.mutateAsync(deleteTarget)}
        title="Delete Goal"
        description="Are you sure you want to delete this goal? This action cannot be undone."
        confirmLabel="Delete Goal"
      />
    </PageWrapper>
  )
}
