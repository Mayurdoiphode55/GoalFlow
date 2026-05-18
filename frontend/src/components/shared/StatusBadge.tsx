import { cn } from '../../lib/utils'

type Status = 'draft' | 'submitted' | 'returned' | 'approved' | 'locked' | 'not_started' | 'on_track' | 'completed' | 'sent' | 'resolved'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  returned: 'bg-red-50 text-red-700 border-red-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  locked: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  not_started: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  on_track: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  sent: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  returned: 'Returned',
  approved: 'Approved',
  locked: 'Locked',
  not_started: 'Not Started',
  on_track: 'On Track',
  completed: 'Completed',
  sent: 'Sent',
  resolved: 'Resolved',
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        STATUS_STYLES[status] || 'bg-neutral-100 text-neutral-600 border-neutral-200',
        className
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}
