import { User } from '../types'
import { authAPI } from './api'

function getErrorMessage(error: any): string {
  if (error.response?.data) {
    const data = error.response.data

    if (data.detail) {
      return data.detail
    }

    if (typeof data === 'object') {
      const errorMessages: string[] = []

      for (const [field, messages] of Object.entries(data)) {
        if (Array.isArray(messages)) {
          errorMessages.push(`${field}: ${messages.join(', ')}`)
        } else if (typeof messages === 'string') {
          errorMessages.push(`${field}: ${messages}`)
        }
      }

      if (errorMessages.length > 0) {
        return errorMessages.join('; ')
      }
    }

    if (typeof data === 'string') {
      return data
    }
  }

  return error.message || 'An error occurred'
}

class AuthService {
  private currentUser: User | null = null

  async login(username: string, password: string): Promise<User> {
    try {
      const response = await authAPI.login({ email: username, password })
      const { user, tokens } = response.data

      localStorage.setItem('accessToken', tokens.access)
      localStorage.setItem('refreshToken', tokens.refresh)
      localStorage.setItem('user', JSON.stringify(user))

      this.currentUser = user
      return user
    } catch (error: any) {
      throw new Error(getErrorMessage(error) || 'Login failed')
    }
  }

  async register(userData: any): Promise<User> {
    try {
      const response = await authAPI.register(userData)
      const { user, tokens } = response.data

      localStorage.setItem('accessToken', tokens.access)
      localStorage.setItem('refreshToken', tokens.refresh)
      localStorage.setItem('user', JSON.stringify(user))

      this.currentUser = user
      return user
    } catch (error: any) {
      throw new Error(getErrorMessage(error) || 'Registration failed')
    }
  }

  async logout(): Promise<void> {
    this.currentUser = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem('user')
      if (stored) {
        this.currentUser = JSON.parse(stored)
      }
    }
    return this.currentUser
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null && localStorage.getItem('accessToken') !== null
  }

  async updateProfile(data: any): Promise<User> {
    try {
      const response = await authAPI.updateProfile(data)
      const user = response.data

      localStorage.setItem('user', JSON.stringify(user))
      this.currentUser = user
      return user
    } catch (error: any) {
      throw new Error(getErrorMessage(error) || 'Profile update failed')
    }
  }

  async connectWithCA(caId: string): Promise<void> {
    try {
      await authAPI.connectCA(caId)
    } catch (error: any) {
      throw new Error(getErrorMessage(error) || 'Failed to connect with CA')
    }
  }

  async listCAs(): Promise<any[]> {
    try {
      const response = await authAPI.listCAs()
      return response.data.results || response.data
    } catch (error: any) {
      throw new Error(getErrorMessage(error) || 'Failed to fetch CAs')
    }
  }

  async requestPasswordReset(
    email: string
  ): Promise<{ reset_url?: string; uid?: string; token?: string } | undefined> {
    try {
      const response = await authAPI.passwordReset({ email })
      return response.data
    } catch (error: any) {
      throw new Error(getErrorMessage(error) || 'Failed to request password reset')
    }
  }

  async confirmPasswordReset(uid: string, token: string, newPassword: string, confirmPassword: string): Promise<void> {
    try {
      await authAPI.passwordResetConfirm({ uid, token, new_password: newPassword, new_password_confirm: confirmPassword })
    } catch (error: any) {
      throw new Error(getErrorMessage(error) || 'Failed to confirm password reset')
    }
  }
}

export const authService = new AuthService()
