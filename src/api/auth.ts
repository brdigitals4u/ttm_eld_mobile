import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BSON } from "realm"

import { RealmService } from "@/database/realm"
import { LoginCredentials, RegisterCredentials, AuthResponse, UserType } from "@/database/schemas"
import { tokenStorage, userStorage } from "@/utils/storage"

import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS, SUCCESS_MESSAGES, ERROR_MESSAGES } from "./constants"

// Authentication API functions
export const authApi = {
  // Register user
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, credentials)

    if (response.success && response.data) {
      // Store tokens securely
      await tokenStorage.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken,
      )

      // Store user ID
      await userStorage.setUserId(response.data.user._id.toString())

      // Store user data in Realm
      await RealmService.createUser({
        _id: new BSON.ObjectId(),
        email: response.data.user.email,
        firstName: response.data.user.firstName,
        lastName: response.data.user.lastName,
        avatar: response.data.user.avatar,
        phoneNumber: response.data.user.phoneNumber,
        dateOfBirth: response.data.user.dateOfBirth,
        isEmailVerified: response.data.user.isEmailVerified,
        createdAt: response.data.user.createdAt,
        updatedAt: response.data.user.updatedAt,
      })

      // Store auth session in Realm
      await RealmService.createAuthSession({
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
        userId: response.data.user._id.toString(),
        expiresAt: response.data.tokens.expiresAt,
        createdAt: new Date(),
      })
    }

    return response.data!
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT)
    } catch (error) {
      // Even if API call fails, we should clear local data
      console.warn("Logout API call failed:", error)
    }

    // Clear stored tokens and user data
    await tokenStorage.removeTokens()
    await userStorage.removeUserId()

    // Clear Realm data
    await RealmService.deleteAuthSession()
  },

  // Refresh token
  async refreshToken(): Promise<{ accessToken: string; expiresAt: Date }> {
    const refreshToken = await tokenStorage.getRefreshToken()

    if (!refreshToken) {
      throw new ApiError({
        message: ERROR_MESSAGES.UNAUTHORIZED,
        status: 401,
      })
    }

    const response = await apiClient.post<{ accessToken: string; expiresAt: Date }>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { refreshToken },
    )

    if (response.success && response.data) {
      // Update stored access token
      await tokenStorage.setAccessToken(response.data.accessToken)

      // Update Realm auth session
      const session = RealmService.getAuthSession()
      if (session) {
        await RealmService.updateAuthSession({
          accessToken: response.data.accessToken,
          expiresAt: response.data.expiresAt,
        })
      }
    }

    return response.data!
  },

  // Get current user profile
  async getCurrentUser(): Promise<UserType> {
    const response = (await apiClient.get<UserType>(API_ENDPOINTS.USER.PROFILE)) as any

    if (response.success && response.data) {
      // Update user data in Realm
      await RealmService.updateUser(response.data._id.toString(), response.data)
    }

    return response.data!
  },

  // Forgot password
  async forgotPassword(email: string): Promise<void> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email })

    if (!response.success) {
      throw new ApiError({
        message: response.message || ERROR_MESSAGES.SERVER_ERROR,
        status: 500,
      })
    }
  },

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      token,
      password: newPassword,
    })

    if (!response.success) {
      throw new ApiError({
        message: response.message || ERROR_MESSAGES.SERVER_ERROR,
        status: 500,
      })
    }
  },

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token })

    if (response.success && response.data) {
      // Update user verification status in Realm
      const userId = await userStorage.getUserId()
      if (userId) {
        await RealmService.updateUser(userId, { isEmailVerified: true })
      }
    }
  },
}

// React Query hooks for authentication

export const useRegister = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH })
    },
    onError: (error: ApiError) => {
      console.error("Register error:", error)
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear all queries
      queryClient.clear()
    },
    onError: (error: ApiError) => {
      console.error("Logout error:", error)
      // Still clear queries even if API call fails
      queryClient.clear()
    },
  })
}

export const useCurrentUser = () => {
  return useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE,
    queryFn: authApi.getCurrentUser,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onError: (error: ApiError) => {
      console.error("Forgot password error:", error)
    },
  })
}

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),
    onError: (error: ApiError) => {
      console.error("Reset password error:", error)
    },
  })
}

export const useVerifyEmail = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => {
      // Invalidate user profile to refetch updated verification status
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE })
    },
    onError: (error: ApiError) => {
      console.error("Verify email error:", error)
    },
  })
}
