interface ProgressRingProps {
  size?: number
  percentage: number
  strokeWidth?: number
  color?: string
  className?: string
}

export function ProgressRing({
  size = 80,
  percentage,
  strokeWidth = 8,
  color = '#14b8a6',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e7e5e4"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
      />
      {/* Center text — rotated back */}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ transform: `rotate(90deg) translate(0px, -${size}px)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
        fontSize={size * 0.22}
        fontWeight="700"
        fill={color}
      >
        {Math.round(percentage)}%
      </text>
    </svg>
  )
}
