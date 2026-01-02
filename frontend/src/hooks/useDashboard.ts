import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { CaseStats, Case } from '@/types/case'

export function useCaseStats() {
  return useQuery({
    queryKey: ['case-stats'],
    queryFn: () => apiClient.get<CaseStats>('/cases/stats'),
  })
}

export function useRecentCases(limit = 10) {
  return useQuery({
    queryKey: ['recent-cases', limit],
    queryFn: () => apiClient.get<Case[]>(`/cases?limit=${limit}`),
  })
}
