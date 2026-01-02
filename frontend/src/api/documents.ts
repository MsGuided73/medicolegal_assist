import { apiClient } from "./client"
import { UploadedDocument } from "@/types/document"

export const documentsApi = {
  // List documents for a case
  list: (caseId: string) => 
    apiClient.get<UploadedDocument[]>(`/documents?case_id=${caseId}`),

  // Create document entry
  create: (data: { case_id: string; filename: string; document_type?: string }) =>
    apiClient.post<UploadedDocument>("/documents", data),

  // Analyze document
  analyze: (caseId: string, documentId: string, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    
    // Explicitly add case and document context to the analyze endpoint
    return apiClient.post(`/document-intelligence/analyze?case_id=${caseId}&document_id=${documentId}`, formData)
  },
}
