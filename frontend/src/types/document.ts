export type DocumentType = 'medical_records' | 'imaging' | 'lab_results' | 'other'
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface UploadedDocument {
  id: string
  case_id: string
  filename: string
  storage_path: string
  document_type?: DocumentType
  quality_score?: number
  ocr_status: AnalysisStatus
  created_at: string
  updated_at: string
}
