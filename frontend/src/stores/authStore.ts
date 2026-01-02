import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, AuthState } from '@/types/auth'

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    if (data.user) {
      set({
        user: {
          id: data.user.id,
          email: data.user.email!,
          role: data.user.user_metadata?.role || 'physician',
          full_name: data.user.user_metadata?.full_name,
          created_at: data.user.created_at,
        },
        isAuthenticated: true,
      })
    }
  },

  register: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'physician', // Default role
        },
      },
    })

    if (error) throw error

    if (data.user) {
      set({
        user: {
          id: data.user.id,
          email: data.user.email!,
          role: 'physician',
          full_name: fullName,
          created_at: data.user.created_at,
        },
        isAuthenticated: true,
      })
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({
      user: null,
      isAuthenticated: false,
    })
  },

  checkAuth: async () => {
    set({ isLoading: true })

    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      set({
        user: {
          id: session.user.id,
          email: session.user.email!,
          role: session.user.user_metadata?.role || 'physician',
          full_name: session.user.user_metadata?.full_name,
          created_at: session.user.created_at,
        },
        isAuthenticated: true,
        isLoading: false,
      })
    } else {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    })
  },
}))

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    useAuthStore.getState().setUser({
      id: session.user.id,
      email: session.user.email!,
      role: session.user.user_metadata?.role || 'physician',
      full_name: session.user.user_metadata?.full_name,
      created_at: session.user.created_at,
    })
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.getState().setUser(null)
  }
})
