import { apiClient } from './client'
import type { Case, CaseStats } from '@/types/case'

export const casesApi = {
  // Get all cases
  list: (params?: {
    status?: string
    assigned_to?: string
    priority?: string
    limit?: number
    offset?: number
  }) => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, value.toString())
        }
      })
    }
    return apiClient.get<Case[]>(`/cases?${query.toString()}`)
  },

  // Get single case
  get: (id: string) => apiClient.get<Case>(`/cases/${id}`),

  // Create case
  create: (data: Partial<Case>) => apiClient.post<Case>('/cases', data),

  // Update case
  update: (id: string, data: Partial<Case>) => 
    apiClient.put<Case>(`/cases/${id}`, data),

  // Get stats
  stats: () => apiClient.get<CaseStats>('/cases/stats'),

  // Search
  search: (query: string, limit = 50) =>
    apiClient.get<Case[]>(`/cases/search?q=${query}&limit=${limit}`),

  // Assign case
  assign: (id: string, userId: string, role: string) =>
    apiClient.post(`/cases/${id}/assign`, { user_id: userId, role }),

  // Change status
  changeStatus: (id: string, status: string, notes?: string) =>
    apiClient.post(`/cases/${id}/status`, { new_status: status, notes }),
}
