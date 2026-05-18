import { cn, getScoreColor, getScoreLabel } from '../../lib/utils'

interface ScorePillProps {
  score: number
  className?: string
  showLabel?: boolean
}

export function ScorePill({ score, className, showLabel = false }: ScorePillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        getScoreColor(score),
        className
      )}
    >
      {score.toFixed(0)}%
      {showLabel && <span className="opacity-75">· {getScoreLabel(score)}</span>}
    </span>
  )
}
