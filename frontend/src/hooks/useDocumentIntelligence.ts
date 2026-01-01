import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useDocumentIntelligence() {
  const analyzeDocument = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiClient.post(
        '/document-intelligence/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      
      return response.data
    }
  })

  return {
    analyzeDocument: analyzeDocument.mutateAsync,
    isAnalyzing: analyzeDocument.isPending,
    error: analyzeDocument.error
  }
}
