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
      // Two-step to avoid race conditions:
      // 1) upload (persist + create documents row)
      // 2) analyze with explicit document_id

      const uploadRes = await documentsApi.upload(caseId, file)
      const documentId = (uploadRes?.id ?? uploadRes?.document_id) as string | undefined

      if (!documentId) {
        // Fallback: list and match by filename (best-effort)
        const docs = await documentsApi.list(caseId)
        const match = (docs || []).find((d: any) => d.filename === file.name)
        if (!match?.id) {
          throw new Error(
            `Upload succeeded but document_id was not returned and could not be inferred by listing documents. filename=${file.name}`
          )
        }
        return await documentsApi.analyze(caseId, file, match.id)
      }

      return await documentsApi.analyze(caseId, file, documentId)
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
