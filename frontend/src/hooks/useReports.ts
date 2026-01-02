import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'

export function useReport(id: string) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id),
    enabled: !!id,
  })
}

export function useGeneratePreExamReport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (caseId: string) => reportsApi.generatePreExam(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
