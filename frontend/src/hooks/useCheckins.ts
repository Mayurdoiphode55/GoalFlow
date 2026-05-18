import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { checkinsAPI } from '../lib/api'

export function useCheckins(quarter: string) {
  return useQuery({
    queryKey: ['checkins', quarter],
    queryFn: () => checkinsAPI.getForQuarter(quarter).then((r) => r.data),
    enabled: !!quarter,
  })
}

export function useTeamCheckins(quarter: string) {
  return useQuery({
    queryKey: ['checkins', 'team', quarter],
    queryFn: () => checkinsAPI.getTeamCheckins(quarter).then((r) => r.data),
    enabled: !!quarter,
  })
}

export function useUpsertCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => checkinsAPI.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins'] })
      toast.success('Check-in saved!')
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Failed to save check-in')
    },
  })
}

export function useAddManagerComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      checkinsAPI.addManagerComment(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins'] })
      toast.success('Comment saved!')
    },
    onError: () => toast.error('Failed to save comment'),
  })
}
