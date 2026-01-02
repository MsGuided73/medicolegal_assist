export type CaseStatus = 'open' | 'in_progress' | 'review' | 'completed' | 'archived'
export type CasePriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Case {
  id: string
  case_number: string
  patient_first_name: string
  patient_last_name: string
  patient_dob?: string
  injury_date?: string
  injury_mechanism?: string
  injury_body_region?: string[]
  status: CaseStatus
  priority: CasePriority
  exam_date?: string
  report_due_date?: string
  assigned_physician_id?: string
  created_at: string
  updated_at: string
}

export interface CaseStats {
  total: number
  by_status: Record<CaseStatus, number>
  by_priority: Record<CasePriority, number>
  upcoming_exams: number
  overdue_reports: number
}
