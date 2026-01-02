import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { documentsApi } from "@/api/documents"
import { apiClient } from "@/api/client"
import { UploadedDocument } from "@/types/document"
import { toast } from "react-hot-toast"

export function useDocuments(caseId: string) {
  return useQuery({
    queryKey: ["documents", caseId],
    queryFn: () => documentsApi.list(caseId),
    enabled: !!caseId,
  })
}

export function useUploadAndAnalyze() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ caseId, file }: { caseId: string; file: File }) => {
      // 1. Create document entry
      const doc = await documentsApi.create({
        case_id: caseId,
        filename: file.name,
        document_type: "medical_records"
      })
      
      // 2. Start analysis
      return await documentsApi.analyze(caseId, doc.id, file)
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
