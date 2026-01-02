import { apiClient } from "./client"
import { UploadedDocument } from "@/types/document"

export const documentsApi = {
  // List documents for a case
  // Prefer the storage-backed list endpoint. This returns { documents: [...] }
  // and includes download support via signed URLs.
  list: (caseId: string) =>
    apiClient.get<{ documents: UploadedDocument[] }>(`/document-intelligence/documents/${caseId}`),

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

  // Get signed URL for download
  getDownloadUrl: (documentId: string) =>
    apiClient.get<{ download_url: string }>(`/document-intelligence/documents/${documentId}/download`),
}
