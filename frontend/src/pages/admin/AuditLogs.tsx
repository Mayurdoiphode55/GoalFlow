import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSearch, ChevronDown, ChevronUp } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { DataTable } from '../../components/shared/DataTable'
import type { Column } from '../../components/shared/DataTable'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { adminAPI } from '../../lib/api'
import type { AuditLog } from '../../types/api'
import { formatDate } from '../../lib/utils'

export default function AuditLogs() {
  const [filters, setFilters] = useState({ from: '', to: '', entity_type: '', user_id: '' })
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['audit', filters],
    queryFn: () => adminAPI.getAuditLogs(filters).then((r) => r.data),
  })
  const logs = Array.isArray(logsData?.items) ? logsData.items : Array.isArray(logsData) ? logsData : []

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'created_at', header: 'Timestamp', render: (row) => <span className="text-xs text-neutral-500">{formatDate(String(row.created_at || ''))}</span> },
    { key: 'entity_type', header: 'Entity', render: (row) => <span className="bg-neutral-100 text-neutral-600 text-xs px-2 py-0.5 rounded">{String(row.entity_type || '')}</span> },
    { key: 'entity_name', header: 'Name', render: (row) => <span className="text-sm font-medium text-neutral-700">{String(row.entity_name || row.entity_id || '')}</span> },
    { key: 'action', header: 'Action', render: (row) => <StatusBadge status={String(row.action || 'draft') as 'approved' | 'submitted' | 'returned' | 'draft'} /> },
    { key: 'changed_by_name', header: 'Changed By', render: (row) => (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center">
          {String(row.changed_by_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </div>
        <span className="text-sm text-neutral-700">{String(row.changed_by_name || '')}</span>
      </div>
    )},
    { key: 'id', header: 'Changes', render: (row) => (
      <button onClick={(e) => { e.stopPropagation(); setExpandedRow(expandedRow === String(row.id) ? null : String(row.id)) }}
        className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1">
        View {expandedRow === String(row.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
    )},
  ]

  return (
    <PageWrapper>
      <h1 className="page-title mb-6">Audit Logs</h1>

      {/* Filters */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label-base">From</label>
          <input type="date" className="input-base" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label className="label-base">To</label>
          <input type="date" className="input-base" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
        </div>
        <div>
          <label className="label-base">Entity Type</label>
          <select className="input-base" value={filters.entity_type} onChange={(e) => setFilters((f) => ({ ...f, entity_type: e.target.value }))}>
            <option value="">All</option>
            <option value="Goal">Goal</option>
            <option value="GoalSheet">Goal Sheet</option>
            <option value="CheckIn">Check-in</option>
          </select>
        </div>
        <button onClick={() => setFilters({ from: '', to: '', entity_type: '', user_id: '' })} className="btn-secondary text-xs">Clear</button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-sm text-neutral-400">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <EmptyState icon={FileSearch} title="No audit logs" description="No logs match your current filters." />
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <DataTable data={logs as unknown as Record<string, unknown>[]} columns={columns} pageSize={15} />
        </div>
      )}
    </PageWrapper>
  )
}
