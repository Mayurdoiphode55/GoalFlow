import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Trash2, Lock } from 'lucide-react'
import type { Goal } from '../../types/goal'
import { ThrustAreaChip } from '../shared/ThrustAreaChip'
import { StatusBadge } from '../shared/StatusBadge'
import { UoMBadge } from './UoMBadge'
import { formatDate } from '../../lib/utils'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

interface GoalCardProps {
  goal: Goal
  locked?: boolean
  onEdit?: (goal: Goal) => void
  onDelete?: (id: string) => void
}

export function GoalCard({ goal, locked, onEdit, onDelete }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-3 hover:shadow-card-hover transition-all">
      {/* Top row */}
      <div className="flex items-center gap-2 mb-3">
        <ThrustAreaChip area={goal.thrust_area} />
        <div className="flex-1" />
        <span className="bg-primary-50 text-primary-700 border border-primary-200 text-sm font-bold px-3 py-1 rounded-full">
          {goal.weightage}%
        </span>
        {locked && <Lock className="w-4 h-4 text-neutral-400" />}
      </div>

      {/* Middle row */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-neutral-800 leading-snug">{goal.title}</h3>
          {goal.description && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-neutral-400 hover:text-neutral-600 flex-shrink-0 mt-0.5"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>

        {expanded && goal.description && (
          <p className="text-sm text-neutral-500 mt-2 leading-relaxed">{goal.description}</p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <UoMBadge type={goal.uom_type} />
          {goal.target_value != null && (
            <span className="text-sm text-neutral-500">Target: {goal.target_value}</span>
          )}
          {goal.target_date && (
            <span className="text-sm text-neutral-500">Due: {formatDate(goal.target_date)}</span>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center gap-2 flex-wrap">
        {QUARTERS.map((q) => {
          const status = goal.quarter_statuses?.[q] || 'not_started'
          return <StatusBadge key={q} status={status} className="text-[11px]" />
        })}
        <div className="flex-1" />
        {!locked && onEdit && (
          <button
            onClick={() => onEdit(goal)}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        {!locked && onDelete && (
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
