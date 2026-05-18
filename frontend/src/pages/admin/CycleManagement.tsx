import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, CheckCircle } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { adminAPI } from '../../lib/api'
import type { Cycle } from '../../types/api'
import { formatDate } from '../../lib/utils'
import { toast } from 'sonner'

export default function CycleManagement() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear(), goal_setting_open: '' })

  const { data: cycles = [] } = useQuery<Cycle[]>({ queryKey: ['cycles'], queryFn: () => adminAPI.getCycles().then((r) => r.data) })

  const createCycle = useMutation({
    mutationFn: (data: unknown) => adminAPI.createCycle(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cycles'] }); toast.success('Cycle created!'); setModalOpen(false) },
    onError: () => toast.error('Failed to create cycle'),
  })

  const activateCycle = useMutation({
    mutationFn: (id: string) => adminAPI.activateCycle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cycles'] }); toast.success('Cycle activated!') },
    onError: () => toast.error('Failed to activate cycle'),
  })

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Cycle Management</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Create New Cycle</button>
      </div>

      <div className="space-y-4">
        {cycles.length === 0 && !createCycle.isPending && (
          <div className="card text-center py-12">
            <p className="text-neutral-400 text-sm">No cycles created yet. Create your first cycle to get started.</p>
          </div>
        )}
        {cycles.map((cycle) => (
          <div key={cycle.id} className="bg-white border border-neutral-200 rounded-xl p-6 flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-semibold text-neutral-800">{cycle.name}</h3>
                {cycle.is_active
                  ? <span className="bg-green-50 text-green-700 border border-green-200 text-xs font-medium px-2.5 py-0.5 rounded-full">Active</span>
                  : <span className="bg-neutral-100 text-neutral-500 border border-neutral-200 text-xs font-medium px-2.5 py-0.5 rounded-full">Inactive</span>
                }
              </div>
              <p className="text-sm text-neutral-500">Year: {cycle.year}</p>
              {cycle.goal_setting_open && (
                <p className="text-xs text-neutral-400 mt-1">Goal Setting Opens: {formatDate(cycle.goal_setting_open)}</p>
              )}
            </div>
            <button
              onClick={() => !cycle.is_active && activateCycle.mutate(cycle.id)}
              disabled={cycle.is_active || activateCycle.isPending}
              className={cycle.is_active ? 'btn-secondary opacity-50 cursor-not-allowed flex items-center gap-2' : 'btn-primary flex items-center gap-2'}
            >
              <CheckCircle className="w-4 h-4" />
              {cycle.is_active ? 'Active' : 'Activate'}
            </button>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-base font-semibold text-neutral-800">Create New Cycle</h3>
            <div><label className="label-base">Cycle Name</label><input className="input-base" placeholder="e.g., FY 2026-27" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="label-base">Year</label><input type="number" className="input-base" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value) }))} /></div>
            <div><label className="label-base">Goal Setting Open Date</label><input type="date" className="input-base" value={form.goal_setting_open} onChange={(e) => setForm((f) => ({ ...f, goal_setting_open: e.target.value }))} /></div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => createCycle.mutate(form)} disabled={createCycle.isPending} className="btn-primary flex items-center gap-2">
                {createCycle.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Create Cycle
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
