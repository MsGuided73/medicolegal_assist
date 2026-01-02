export interface MedicalEntity {
  id: string
  type: 'diagnosis' | 'medication' | 'procedure' | 'symptom'
  text: string
  icd10_code?: string
  confidence: number
  page: number
  position: { x: number; y: number }
  manual_review_required: boolean
  edited_by?: string
  edited_at?: string
  original_text?: string
  review_status: 'pending' | 'approved' | 'rejected'
}

export interface ClinicalDate {
  id: string
  date: string
  event_type: 'injury_date' | 'first_treatment' | 'surgery' | 'mri' | 'followup'
  description: string
  confidence: number
  original_date?: string
  edited_by?: string
  edited_at?: string
  review_status: 'pending' | 'approved' | 'rejected'
}
