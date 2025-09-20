import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from './client'
import { API_ENDPOINTS, QUERY_KEYS } from './constants'
import { RealmService } from '@/database/realm'
import { UserType } from '@/database/schemas'

// User profile update interface
export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  dateOfBirth?: Date
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

// User API functions
export const userApi = {
  // Get user profile
  async getProfile(): Promise<UserType> {
    const response = await apiClient.get<UserType>(API_ENDPOINTS.USER.PROFILE)
    
    if (response.success && response.data) {
      // Update user data in Realm
      await RealmService.updateUser(response.data._id, response.data)
    }
    
    return response.data!
  },

  // Update user profile
  async updateProfile(data: UpdateProfileData): Promise<UserType> {
    const response = await apiClient.put<UserType>(API_ENDPOINTS.USER.UPDATE_PROFILE, data)
    
    if (response.success && response.data) {
      // Update user data in Realm
      await RealmService.updateUser(response.data._id, response.data)
    }
    
    return response.data!
  },

  // Change password
  async changePassword(data: ChangePasswordData): Promise<void> {
    const response = await apiClient.post(API_ENDPOINTS.USER.CHANGE_PASSWORD, data)
    
    if (!response.success) {
      throw new ApiError({
        message: response.message || 'Failed to change password',
        status: 500,
      })
    }
  },

  // Upload avatar
  async uploadAvatar(file: File): Promise<{ avatar: string }> {
    const formData = new FormData()
    formData.append('avatar', file)
    
    const response = await apiClient.upload<{ avatar: string }>(
      API_ENDPOINTS.USER.UPLOAD_AVATAR,
      formData
    )
    
    if (response.success && response.data) {
      // Update avatar in Realm
      const userId = await import('@/utils/storage').then(m => m.userStorage.getUserId())
      if (userId) {
        await RealmService.updateUser(userId, { avatar: response.data.avatar })
      }
    }
    
    return response.data!
  },

  // Delete account
  async deleteAccount(password: string): Promise<void> {
    const response = await apiClient.post(API_ENDPOINTS.USER.DELETE_ACCOUNT, { password })
    
    if (response.success) {
      // Clear all local data
      await RealmService.clearAllData()
      await import('@/utils/storage').then(m => m.clearAllStorage())
    }
    
    if (!response.success) {
      throw new ApiError({
        message: response.message || 'Failed to delete account',
        status: 500,
      })
    }
  },
}

// React Query hooks for user profile
export const useUserProfile = () => {
  return useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE,
    queryFn: userApi.getProfile,
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

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (data) => {
      // Update the cache with new data
      queryClient.setQueryData(QUERY_KEYS.USER_PROFILE, data)
    },
    onError: (error: ApiError) => {
      console.error('Update profile error:', error)
    },
  })
}

export const useChangePassword = () => {
  return useMutation({
    mutationFn: userApi.changePassword,
    onError: (error: ApiError) => {
      console.error('Change password error:', error)
    },
  })
}

export const useUploadAvatar = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: userApi.uploadAvatar,
    onSuccess: (data) => {
      // Update the cache with new avatar
      queryClient.setQueryData(QUERY_KEYS.USER_PROFILE, (oldData: UserType | undefined) => {
        if (oldData) {
          return { ...oldData, avatar: data.avatar }
        }
        return oldData
      })
    },
    onError: (error: ApiError) => {
      console.error('Upload avatar error:', error)
    },
  })
}

export const useDeleteAccount = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: userApi.deleteAccount,
    onSuccess: () => {
      // Clear all queries
      queryClient.clear()
    },
    onError: (error: ApiError) => {
      console.error('Delete account error:', error)
    },
  })
}
