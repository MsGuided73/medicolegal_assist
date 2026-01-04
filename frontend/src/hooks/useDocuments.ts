import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { documentsApi } from "@/api/documents"
import { apiClient } from "@/api/client"
import { toast } from "react-hot-toast"

export function useDocuments(caseId: string) {
  return useQuery({
    queryKey: ["documents", caseId],
    queryFn: async () => {
      const res = await documentsApi.list(caseId)
      // normalize: old API returned array, new returns {documents: []}
      return (res as any).documents ?? res
    },
    enabled: !!caseId,
  })
}

export function useUploadAndAnalyze() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ caseId, file }: { caseId: string; file: File }) => {
      // Single-step: backend owns upload -> persist -> analyze.
      // The response includes the server-generated document_id.
      return await documentsApi.analyze(caseId, file)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", variables.caseId] })
      queryClient.invalidateQueries({ queryKey: ["timeline", variables.caseId] })
      queryClient.invalidateQueries({ queryKey: ["medical-entities", variables.caseId] })
      toast.success("Document uploaded and analysis started")
    },
    onError: (error: any) => {
      toast.error(`Upload failed: ${error.message}`)
    }
  })
}

export function useMedicalEntities(caseId: string) {
  return useQuery({
    queryKey: ["medical-entities", caseId],
    queryFn: () => apiClient.get<any[]>(`/medical-entities?case_id=${caseId}`),
    enabled: !!caseId,
  })
}
