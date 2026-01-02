export interface User {
  id: string
  email: string
  role: 'physician' | 'admin' | 'medical_assistant'
  full_name?: string
  created_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  full_name: string
  role?: 'physician' | 'medical_assistant'
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
