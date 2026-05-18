import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, UserX, Loader2 } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { adminAPI } from '../../lib/api'
import type { User } from '../../types/auth'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

const ROLES = ['employee', 'manager', 'admin']
const ROLE_COLORS: Record<string, string> = {
  employee: 'bg-blue-50 text-blue-700 border-blue-200',
  manager: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-violet-50 text-violet-700 border-violet-200',
}

export default function UserManagement() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', department: '', manager_id: '' })

  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => adminAPI.getUsers().then((r) => r.data) })

  const saveUser = useMutation({
    mutationFn: (data: unknown) => editUser ? adminAPI.updateUser(editUser.id, data) : adminAPI.createUser(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success(editUser ? 'User updated!' : 'User created!'); setModalOpen(false) },
    onError: () => toast.error('Failed to save user'),
  })

  const deactivateUser = useMutation({
    mutationFn: (id: string) => adminAPI.updateUser(id, { is_active: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deactivated') },
  })

  const openCreate = () => { setEditUser(null); setForm({ name: '', email: '', password: '', role: 'employee', department: '', manager_id: '' }); setModalOpen(true) }
  const openEdit = (user: User) => { setEditUser(user); setForm({ name: user.name, email: user.email, password: '', role: user.role, department: user.department || '', manager_id: user.manager_id || '' }); setModalOpen(true) }

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  const managers = users.filter((u) => u.role === 'manager')

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">User Management</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add User</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input placeholder="Search users..." className="input-base w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input-base w-40" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              {['User', 'Email', 'Role', 'Department', 'Manager', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-400">No users found</td></tr>
            ) : filtered.map((user) => (
              <tr key={user.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                      {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-neutral-800">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-neutral-600">{user.email}</td>
                <td className="px-4 py-4">
                  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize', ROLE_COLORS[user.role])}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-4 text-neutral-600">{user.department || '—'}</td>
                <td className="px-4 py-4 text-neutral-600">{managers.find((m) => m.id === user.manager_id)?.name || '—'}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg hover:bg-neutral-100"><Pencil className="w-4 h-4 text-neutral-500" /></button>
                    <button onClick={() => deactivateUser.mutate(user.id)} className="p-1.5 rounded-lg hover:bg-red-50"><UserX className="w-4 h-4 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-neutral-800">{editUser ? 'Edit' : 'Create'} User</h3>
            <div><label className="label-base">Name</label><input className="input-base" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="label-base">Email</label><input type="email" className="input-base" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            {!editUser && <div><label className="label-base">Password</label><input type="password" className="input-base" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>}
            <div><label className="label-base">Role</label>
              <select className="input-base" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </div>
            <div><label className="label-base">Department</label><input className="input-base" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></div>
            {form.role === 'employee' && (
              <div><label className="label-base">Manager</label>
                <select className="input-base" value={form.manager_id} onChange={(e) => setForm((f) => ({ ...f, manager_id: e.target.value }))}>
                  <option value="">No manager</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => saveUser.mutate(form)} disabled={saveUser.isPending} className="btn-primary flex items-center gap-2">
                {saveUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save User
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
