import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { Report } from "@/types/report"

export function useReport(id: string) {
  return useQuery<Report>({
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

export function useReports(filters: any = {}, sortBy: string = 'recent') {
  return useQuery<Report[]>({
    queryKey: ['reports', filters, sortBy],
    queryFn: () => reportsApi.list(filters), 
  })
}
