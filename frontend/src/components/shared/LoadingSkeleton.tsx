import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse bg-neutral-200 rounded', className)} />
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6">
      <Skeleton className="w-12 h-12 rounded-xl mb-3" />
      <Skeleton className="h-8 w-20 mb-1" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
