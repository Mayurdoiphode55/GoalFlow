import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '../lib/api'

export function useQoQAnalytics(params?: unknown) {
  return useQuery({
    queryKey: ['analytics', 'qoq', params],
    queryFn: () => analyticsAPI.getQoQ(params).then((r) => r.data),
  })
}

export function useCompletionHeatmap(cycleId?: string) {
  return useQuery({
    queryKey: ['analytics', 'heatmap', cycleId],
    queryFn: () => analyticsAPI.getHeatmap(cycleId).then((r) => r.data),
  })
}

export function useThrustDistribution(cycleId?: string) {
  return useQuery({
    queryKey: ['analytics', 'thrust', cycleId],
    queryFn: () => analyticsAPI.getThrustDistribution(cycleId).then((r) => r.data),
  })
}

export function useManagerEffectiveness(cycleId?: string) {
  return useQuery({
    queryKey: ['analytics', 'managers', cycleId],
    queryFn: () => analyticsAPI.getManagerEffectiveness(cycleId).then((r) => r.data),
  })
}
