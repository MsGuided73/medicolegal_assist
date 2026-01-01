import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

interface User {
  id: string
  email: string
  full_name: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User, token: string) => void
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  
  login: async (email, password) => {
    // Note: In real setup, login would be to Supabase or your backend
    const response = await apiClient.post('/auth/login', { email, password })
    const { user, access_token } = response.data
    
    localStorage.setItem('token', access_token)
    set({ user, token: access_token })
  },
  
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
  
  setUser: (user, token) => {
    set({ user, token })
  }
}))
