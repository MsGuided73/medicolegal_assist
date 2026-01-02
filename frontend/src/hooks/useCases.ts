import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { casesApi } from '@/api/cases'
import type { Case } from '@/types/case'

export function useCases(params?: any) {
  return useQuery({
    queryKey: ['cases', params],
    queryFn: () => casesApi.list(params),
  })
}

export function useCase(id: string) {
  return useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.get(id),
    enabled: !!id,
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: casesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case-stats'] })
    },
  })
}

export function useUpdateCase(id: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<Case>) => casesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}
