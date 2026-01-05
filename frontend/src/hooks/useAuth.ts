import { create } from 'zustand'
import { apiClient } from '@/api/client'

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

interface LoginResponse {
  user: User
  access_token: string
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  
  login: async (email, password) => {
    // Note: In real setup, login would be to Supabase or your backend
    // Our `apiClient.post<T>()` returns the parsed JSON body directly (not an AxiosResponse)
    const { user, access_token } = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    })
    
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
