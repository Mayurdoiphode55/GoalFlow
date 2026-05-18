import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy')
}

export function timeAgo(date: string | Date | undefined | null) {
  if (!date) return 'Just now'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'Just now'
  return formatDistanceToNow(d, { addSuffix: true })
}

export function computeScore(
  uomType: string, target: number, actual: number,
  targetDate?: string, actualDate?: string
): number {
  if (!actual && actual !== 0) return 0
  switch (uomType) {
    case 'numeric_min':
    case 'percentage_min':
      return Math.min((actual / target) * 100, 150)
    case 'numeric_max':
    case 'percentage_max':
      if (actual === 0) return 150
      return Math.min((target / actual) * 100, 150)
    case 'zero_based':
      return actual === 0 ? 100 : 0
    case 'timeline': {
      if (!targetDate || !actualDate) return 0
      const tDate = new Date(targetDate).getTime()
      const aDate = new Date(actualDate).getTime()
      const diffDays = (tDate - aDate) / (1000 * 60 * 60 * 24)
      if (diffDays >= 0) return Math.min(100 + diffDays * 0.5, 120)
      return Math.max(100 + diffDays * 2, 0)
    }
    default:
      return 0
  }
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 bg-green-50'
  if (score >= 70) return 'text-blue-600 bg-blue-50'
  if (score >= 50) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'On Track'
  if (score >= 50) return 'At Risk'
  return 'Behind'
}

export const THRUST_AREA_COLORS: Record<string, string> = {
  'Revenue Growth': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Customer Satisfaction': 'bg-blue-50 text-blue-700 border-blue-200',
  'Cost Optimization': 'bg-amber-50 text-amber-700 border-amber-200',
  'Quality': 'bg-violet-50 text-violet-700 border-violet-200',
  'Innovation': 'bg-pink-50 text-pink-700 border-pink-200',
  'People Development': 'bg-teal-50 text-teal-700 border-teal-200',
  'Safety': 'bg-red-50 text-red-700 border-red-200',
  'Compliance': 'bg-orange-50 text-orange-700 border-orange-200',
  'Digital Transformation': 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

export function getThrustAreaColor(area: string): string {
  return THRUST_AREA_COLORS[area] || 'bg-neutral-100 text-neutral-600 border-neutral-200'
}

export const QUARTER_MONTHS: Record<string, string> = {
  Q1: 'July', Q2: 'October', Q3: 'January', Q4: 'March–April'
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}
