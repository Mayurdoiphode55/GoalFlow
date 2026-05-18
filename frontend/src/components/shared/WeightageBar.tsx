import { cn } from '../../lib/utils'

interface WeightageBarProps {
  used: number
  className?: string
}

export function WeightageBar({ used, className }: WeightageBarProps) {
  const pct = Math.min(used, 100)
  const barColor =
    used < 100
      ? 'bg-primary-500'
      : used === 100
      ? 'bg-green-500'
      : 'bg-red-500'

  const textColor =
    used < 100
      ? 'text-neutral-600'
      : used === 100
      ? 'text-green-600'
      : 'text-red-600'

  return (
    <div className={cn('w-full', className)}>
      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn('text-xs mt-1', textColor)}>
        {used}% of 100% allocated
        {used > 100 && <span className="text-red-600 font-medium ml-1">— Exceeds by {used - 100}%</span>}
      </p>
    </div>
  )
}
