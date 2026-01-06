import { getAccessToken } from '@/lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

class ApiClient {
  private async getHeaders(contentType?: string): Promise<HeadersInit> {
    const token = await getAccessToken()
    
    return {
      ...(contentType && { 'Content-Type': contentType }),
      ...(token && { 'Authorization': `Bearer ${token}` }),
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`API ${response.status}: ${response.statusText}${body ? ` - ${body}` : ''}`)
    }

    return response.json()
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const isFormData = data instanceof FormData
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: await this.getHeaders(isFormData ? undefined : 'application/json'),
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`API ${response.status}: ${response.statusText}${body ? ` - ${body}` : ''}`)
    }

    return response.json()
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`API ${response.status}: ${response.statusText}${body ? ` - ${body}` : ''}`)
    }

    return response.json()
  }

  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`API ${response.status}: ${response.statusText}${body ? ` - ${body}` : ''}`)
    }
  }
}

export const apiClient = new ApiClient()
