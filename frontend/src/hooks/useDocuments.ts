import { useMutation } from '@tanstack/react-query'
import { documentsApi } from '@/api/documents'

export function useAnalyzeDocument() {
  return useMutation({
    mutationFn: ({ 
      file, 
      caseId, 
      documentId 
    }: { 
      file: File
      caseId: string
      documentId: string
    }) => documentsApi.analyze(file, caseId, documentId),
  })
}
