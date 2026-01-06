import { apiClient } from "./client"
import { UploadedDocument } from "@/types/document"

export const documentsApi = {
  // Upload document (persist to storage + create DB row)
  upload: (caseId: string, file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    // Debug logging (minimal but useful)
    console.debug("[documentsApi.upload] POST /documents", {
      caseId,
      filename: file.name,
      size: file.size,
      type: file.type,
    })

    return apiClient.post<any>(`/documents?case_id=${caseId}`, formData)
  },

  // List documents for a case
  // Prefer the storage-backed list endpoint. This returns { documents: [...] }
  // and includes download support via signed URLs.
  list: (caseId: string) =>
    apiClient.get<UploadedDocument[]>(`/documents/cases/${caseId}`),

  // Analyze a document.
  // IMPORTANT: call with document_id to avoid filename-inference and race conditions.
  analyze: (caseId: string, file: File, documentId: string) => {
    const formData = new FormData()
    formData.append("file", file)
    
    console.debug("[documentsApi.analyze] POST /document-intelligence/analyze", {
      caseId,
      documentId,
      filename: file.name,
    })

    return apiClient.post(
      `/document-intelligence/analyze?case_id=${caseId}&document_id=${documentId}`,
      formData
    )
  },

  // Get signed URL for download
  getDownloadUrl: (documentId: string) =>
    // NOTE: backend download endpoint not implemented yet in this codebase.
    // Keeping this method for future use.
    apiClient.get<{ download_url: string }>(`/documents/${documentId}/download`),
}
