export type ReportType = "pre_exam" | "ime" | "addendum" | "supplemental"
export type ReportStatus = "draft" | "review" | "finalized" | "sent"

export interface ReportSection {
  id: string
  report_id: string
  section_type: string
  section_title: string
  content: string
  section_order: number
  is_auto_generated: boolean
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  case_id: string
  report_type: ReportType
  report_date?: string
  status: ReportStatus
  finalized_date?: string
  pdf_path?: string
  docx_path?: string
  created_at: string
  updated_at: string
  sections?: ReportSection[]
}
