import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

export function useDocumentIntelligence() {
  const analyzeDocument = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiClient.post(
        '/document-intelligence/analyze',
        formData
      )
      return response
    }
  })

  const startAnalysis = useMutation({
    mutationFn: async ({ caseId, documentId }: { caseId: string; documentId: string }) => {
      // Use query params for case_id and document_id as per backend API
      const response = await apiClient.post(
        `/document-intelligence/analyze?case_id=${caseId}&document_id=${documentId}&background_processing=true`
      )
      return response
    }
  })

  return {
    analyzeDocument: analyzeDocument.mutateAsync,
    startAnalysis: startAnalysis.mutateAsync,
    isAnalyzing: analyzeDocument.isPending || startAnalysis.isPending,
    error: analyzeDocument.error || startAnalysis.error
  }
}

export function useDocumentStatus(documentId: string | null, enabled: boolean = false) {
  return useQuery({
    queryKey: ['document-status', documentId],
    queryFn: async () => {
      if (!documentId) return null
      return apiClient.get<any>(`/document-intelligence/${documentId}/status`)
    },
    enabled: !!documentId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.ocr_status
      // Stop polling if completed or failed
      if (status === 'completed' || status === 'failed') {
        return false
      }
      return 1000 // Poll every 1s
    }
  })
}
