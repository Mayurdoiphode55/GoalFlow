import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { adminAPI } from '../../lib/api'
import type { EscalationRule, EscalationLog } from '../../types/api'
import { formatDate } from '../../lib/utils'
import { toast } from 'sonner'

export default function EscalationRules() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editRule, setEditRule] = useState<EscalationRule | null>(null)
  const [form, setForm] = useState({ name: '', trigger_type: '', days_threshold: 7, escalate_to: '' })

  const { data: rulesData } = useQuery({ queryKey: ['escalation', 'rules'], queryFn: () => adminAPI.getEscalationRules().then((r) => r.data) })
  const { data: logsData } = useQuery({ queryKey: ['escalation', 'logs'], queryFn: () => adminAPI.getEscalationLogs().then((r) => r.data) })
  
  const rules = Array.isArray(rulesData?.items) ? rulesData.items : Array.isArray(rulesData) ? rulesData : []
  const logs = Array.isArray(logsData?.items) ? logsData.items : Array.isArray(logsData) ? logsData : []

  const createRule = useMutation({
    mutationFn: (data: unknown) => editRule ? adminAPI.updateEscalationRule(editRule.id, data) : adminAPI.createEscalationRule(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escalation'] }); toast.success(editRule ? 'Rule updated!' : 'Rule created!'); setModalOpen(false) },
    onError: () => toast.error('Failed to save rule'),
  })

  const openCreate = () => { setEditRule(null); setForm({ name: '', trigger_type: '', days_threshold: 7, escalate_to: '' }); setModalOpen(true) }
  const openEdit = (rule: EscalationRule) => { setEditRule(rule); setForm({ name: rule.name, trigger_type: rule.trigger_type, days_threshold: rule.days_threshold, escalate_to: rule.escalate_to }); setModalOpen(true) }

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Escalation Rules</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Rule</button>
      </div>

      {/* Rules */}
      <div className="space-y-3 mb-8">
        {rules.length === 0 ? (
          <EmptyState icon={Zap} title="No rules configured" description="Create escalation rules to automate follow-ups." />
        ) : rules.map((rule) => (
          <div key={rule.id} className="bg-white border border-neutral-200 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-800">{rule.name}</p>
              <p className="text-xs text-neutral-500">If {rule.trigger_type} in {rule.days_threshold} days → Escalate to {rule.escalate_to}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={rule.is_active} className="sr-only peer" />
                <div className="w-9 h-5 bg-neutral-200 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
              <button onClick={() => openEdit(rule)} className="p-1.5 rounded-lg hover:bg-neutral-100"><Pencil className="w-4 h-4 text-neutral-500" /></button>
              <button className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Logs */}
      <h2 className="section-title mb-4">Escalation Log</h2>
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              {['Employee', 'Rule', 'Escalated To', 'Date', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-400">No escalation logs</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-4 font-medium text-neutral-800">{log.employee_name}</td>
                <td className="px-4 py-4 text-neutral-600">{log.rule_name}</td>
                <td className="px-4 py-4 text-neutral-600">{log.escalated_to}</td>
                <td className="px-4 py-4 text-neutral-500 text-xs">{formatDate(log.created_at)}</td>
                <td className="px-4 py-4"><StatusBadge status={log.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-base font-semibold text-neutral-800">{editRule ? 'Edit' : 'Create'} Escalation Rule</h3>
            <div><label className="label-base">Rule Name</label><input className="input-base" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="label-base">Trigger Type</label>
              <select className="input-base" value={form.trigger_type} onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))}>
                <option value="">Select...</option>
                <option value="Goal not submitted">Goal not submitted</option>
                <option value="Goal not approved">Goal not approved</option>
                <option value="Check-in not done">Check-in not done</option>
              </select>
            </div>
            <div><label className="label-base">Days Threshold</label><input type="number" min={1} className="input-base" value={form.days_threshold} onChange={(e) => setForm((f) => ({ ...f, days_threshold: parseInt(e.target.value) || 7 }))} /></div>
            <div><label className="label-base">Escalate To</label>
              <select className="input-base" value={form.escalate_to} onChange={(e) => setForm((f) => ({ ...f, escalate_to: e.target.value }))}>
                <option value="">Select...</option>
                <option value="Manager">Manager</option>
                <option value="Skip Level">Skip Level</option>
                <option value="HR">HR</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => createRule.mutate(form)} disabled={createRule.isPending} className="btn-primary flex items-center gap-2">
                {createRule.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
