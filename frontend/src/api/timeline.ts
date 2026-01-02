import { apiClient } from "./client"

export interface TimelineEvent {
  id: string
  case_id: string
  event_date: string
  event_type: string
  title: string
  description?: string
  source_document_id?: string
  created_at: string
}

export const timelineApi = {
  // Get timeline for a case
  getByCaseId: (caseId: string) => 
    apiClient.get<TimelineEvent[]>(`/timeline/cases/${caseId}`),

  // Generate timeline for a case
  generate: (caseId: string) => 
    apiClient.post(`/timeline/cases/${caseId}/generate`),

  // Add manual event
  addEvent: (caseId: string, data: Partial<TimelineEvent>) =>
    apiClient.post<TimelineEvent>(`/timeline/cases/${caseId}/events`, data),
}
