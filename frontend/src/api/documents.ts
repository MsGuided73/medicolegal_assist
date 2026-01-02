import { getAccessToken } from '@/lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

export const documentsApi = {
  // Upload and analyze document
  analyze: async (file: File, caseId: string, documentId: string) => {
    const token = await getAccessToken()
    const formData = new FormData()
    formData.append('file', file)
    
    let url = `${API_URL}/document-intelligence/analyze`
    const params = new URLSearchParams()
    // Explicitly add required clinical context
    params.append('case_id', caseId)
    params.append('document_id', documentId)
    
    url += `?${params.toString()}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || 'Failed to analyze document')
    }

    return response.json()
  },
}
