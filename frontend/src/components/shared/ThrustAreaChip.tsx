import { cn, getThrustAreaColor } from '../../lib/utils'

interface ThrustAreaChipProps {
  area: string
  className?: string
}

export function ThrustAreaChip({ area, className }: ThrustAreaChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getThrustAreaColor(area),
        className
      )}
    >
      {area}
    </span>
  )
}
