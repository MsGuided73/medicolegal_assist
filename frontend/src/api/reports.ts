import { apiClient } from './client'
import { Report } from "@/types/report"

export const reportsApi = {
  // Generate pre-exam report
  generatePreExam: (caseId: string) =>
    apiClient.post<Report>(`/reports/pre-exam/${caseId}`),

  // Get report
  get: (report_id: string) => apiClient.get<Report>(`/reports/${report_id}`),

  // List reports
  list: (_params: any = {}) => apiClient.get<Report[]>('/reports'),

  // Create report
  create: (data: { case_id: string; report_type: string }) =>
    apiClient.post<Report>('/reports', data),

  // Add section
  addSection: (report_id: string, section: any) => {
    // Ensure ID is set in payload if needed by service
    return apiClient.post(`/reports/${report_id}/sections`, { ...section, report_id })
  },

  // Auto-generate sections
  autoGenerate: (report_id: string, case_id: string) =>
    apiClient.post(`/reports/${report_id}/auto-generate?case_id=${case_id}`),

  // Finalize
  finalize: (report_id: string, reviewed_by?: string) =>
    apiClient.post(`/reports/${report_id}/finalize`, { reviewed_by_id: reviewed_by }),
}
