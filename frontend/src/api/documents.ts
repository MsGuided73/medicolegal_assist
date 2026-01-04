import { apiClient } from "./client"
import { UploadedDocument } from "@/types/document"

export const documentsApi = {
  // List documents for a case
  // Prefer the storage-backed list endpoint. This returns { documents: [...] }
  // and includes download support via signed URLs.
  list: (caseId: string) =>
    apiClient.get<{ documents: UploadedDocument[] }>(`/document-intelligence/documents/${caseId}`),

  // Analyze document (single-step: upload -> persist -> analyze)
  analyze: (caseId: string, file: File, documentId?: string) => {
    const formData = new FormData()
    formData.append("file", file)
    
    // Explicitly add case and document context to the analyze endpoint
    const docParam = documentId ? `&document_id=${documentId}` : ""
    return apiClient.post(`/document-intelligence/analyze?case_id=${caseId}${docParam}`, formData)
  },

  // Get signed URL for download
  getDownloadUrl: (documentId: string) =>
    apiClient.get<{ download_url: string }>(`/document-intelligence/documents/${documentId}/download`),
}
