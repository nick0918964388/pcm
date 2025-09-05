import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import authService from '@/services/authService'
import { User, AuthCredentials, AuthState } from '@/types/auth'

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: AuthCredentials) => Promise<boolean>
  logout: () => void
  checkAuth: () => void
  refreshAuth: () => Promise<boolean>
  setSessionTimeout: (minutes: number) => void
  updateLastActivity: () => void
  clearError: () => void
  
  // Session management
  getRemainingTime: () => number
  isSessionValid: () => boolean
  handleSessionWarning: (callback: (remaining: number) => void) => void
  handleSessionTimeout: (callback: () => void) => void
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionTimeout: 30,
        lastActivity: null,

        // Login action
        login: async (credentials: AuthCredentials) => {
          set({ isLoading: true, error: null })
          
          try {
            const result = await authService.login(credentials)
            
            if (result.success && result.user) {
              set({
                user: result.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                lastActivity: new Date()
              })
              
              return true
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: result.error || '登入失敗'
              })
              
              return false
            }
          } catch (error) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: error instanceof Error ? error.message : '登入時發生錯誤'
            })
            
            return false
          }
        },

        // Logout action
        logout: () => {
          authService.logout()
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            lastActivity: null
          })
        },

        // Check authentication status
        checkAuth: () => {
          set({ isLoading: true })
          
          try {
            const isAuth = authService.isAuthenticated()
            const user = authService.getCurrentUser()
            
            if (isAuth && user) {
              // Check if session is expired
              if (authService.isSessionExpired()) {
                get().logout()
              } else {
                set({
                  user,
                  isAuthenticated: true,
                  isLoading: false,
                  lastActivity: new Date()
                })
              }
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false
              })
            }
          } catch (error) {
            console.error('Auth check error:', error)
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Authentication check failed'
            })
          }
        },

        // Refresh authentication
        refreshAuth: async () => {
          try {
            const success = await authService.refreshToken()
            
            if (success) {
              const user = authService.getCurrentUser()
              set({
                user,
                isAuthenticated: true,
                lastActivity: new Date()
              })
              
              return true
            } else {
              get().logout()
              return false
            }
          } catch (error) {
            console.error('Refresh auth error:', error)
            get().logout()
            return false
          }
        },

        // Set session timeout duration
        setSessionTimeout: (minutes: number) => {
          authService.setupSessionTimeout(minutes)
          set({ sessionTimeout: minutes })
        },

        // Update last activity
        updateLastActivity: () => {
          authService.updateLastActivity()
          set({ lastActivity: new Date() })
        },

        // Clear error
        clearError: () => {
          set({ error: null })
        },

        // Get remaining session time
        getRemainingTime: () => {
          return authService.getSessionRemainingTime()
        },

        // Check if session is valid
        isSessionValid: () => {
          return !authService.isSessionExpired()
        },

        // Handle session warning
        handleSessionWarning: (callback: (remaining: number) => void) => {
          if (typeof window !== 'undefined') {
            window.addEventListener('sessionWarning', ((event: CustomEvent) => {
              callback(event.detail.remainingMinutes)
            }) as EventListener)
          }
        },

        // Handle session timeout
        handleSessionTimeout: (callback: () => void) => {
          if (typeof window !== 'undefined') {
            window.addEventListener('sessionTimeout', callback)
          }
        }
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          sessionTimeout: state.sessionTimeout,
          lastActivity: state.lastActivity
        })
      }
    ),
    {
      name: 'AuthStore'
    }
  )
)