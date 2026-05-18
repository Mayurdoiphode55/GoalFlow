import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { goalsAPI } from '../lib/api'

export function useMyGoalSheet() {
  return useQuery({
    queryKey: ['goal-sheet', 'mine'],
    queryFn: () => goalsAPI.getMySheet().then((r) => r.data),
  })
}

export function useTeamSheets() {
  return useQuery({
    queryKey: ['goal-sheet', 'team'],
    queryFn: () => goalsAPI.getTeamSheets().then((r) => r.data),
  })
}

export function useGoalSheet(id: string) {
  return useQuery({
    queryKey: ['goal-sheet', id],
    queryFn: () => goalsAPI.getSheet(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => goalsAPI.createGoal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal-sheet'] })
      toast.success('Goal added!')
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Failed to save goal')
    },
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => goalsAPI.updateGoal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal-sheet'] })
      toast.success('Goal updated!')
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Failed to update goal')
    },
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => goalsAPI.deleteGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal-sheet'] })
      toast.success('Goal deleted')
    },
    onError: () => toast.error('Failed to delete goal'),
  })
}

export function useSubmitSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => goalsAPI.submitSheet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal-sheet'] })
      toast.success('Goals submitted for approval!')
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Failed to submit goals')
    },
  })
}

export function useApproveSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => goalsAPI.approveSheet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal-sheet'] })
      toast.success('Goals approved!')
    },
    onError: () => toast.error('Failed to approve goals'),
  })
}

export function useReturnSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => goalsAPI.returnSheet(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal-sheet'] })
      toast.success('Goals returned for rework')
    },
    onError: () => toast.error('Failed to return goals'),
  })
}
