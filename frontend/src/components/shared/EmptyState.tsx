import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center py-16', className)}>
      <Icon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
      <h3 className="text-base font-semibold text-neutral-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mb-6 max-w-xs">{description}</p>}
      {action && action}
    </div>
  )
}
