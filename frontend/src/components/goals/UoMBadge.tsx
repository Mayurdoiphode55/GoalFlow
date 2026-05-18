import type { UomType } from '../../types/goal'
import { cn } from '../../lib/utils'

const UOM_CONFIG: Record<UomType, { label: string; bg: string; text: string; border: string }> = {
  numeric_min:    { label: '↑ Numeric',   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  numeric_max:    { label: '↓ Numeric',   bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  percentage_min: { label: '↑ %',         bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  percentage_max: { label: '↓ %',         bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  timeline:       { label: '📅 Timeline', bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  zero_based:     { label: '◎ Zero',      bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
}

interface UoMBadgeProps {
  type: UomType
  className?: string
}

export function UoMBadge({ type, className }: UoMBadgeProps) {
  const config = UOM_CONFIG[type] || { label: type, bg: 'bg-neutral-100', text: 'text-neutral-600', border: 'border-neutral-200' }
  return (
    <span
      className={cn(
        'text-xs font-medium px-2.5 py-0.5 rounded-full border',
        config.bg, config.text, config.border,
        className
      )}
    >
      {config.label}
    </span>
  )
}
