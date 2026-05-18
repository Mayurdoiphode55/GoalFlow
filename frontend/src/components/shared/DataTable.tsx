import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  pageSize?: number
  className?: string
  emptyMessage?: string
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 10,
  className,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(data.length / pageSize)
  const paginated = data.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-neutral-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-4 text-neutral-700 border-b border-neutral-100">
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
          <p className="text-sm text-neutral-600">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.length)} of {data.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-neutral-600 px-2 py-1">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
