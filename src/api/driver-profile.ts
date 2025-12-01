import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/stores/authStore"

import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"
import { DriverProfile } from "./organization"

// Types for driver profile update
export interface DriverProfileUpdateData {
  email?: string
  phone?: string
  home_terminal_address?: string
  // Note: Restricted fields (eld_device_id, violations_count, driver_license, name) cannot be updated directly
  // They require admin approval via change request
}

export interface ChangeRequestData {
  field_name: string
  new_value: string
  reason: string
}

export interface ChangeRequest {
  id: string
  driver_id: string
  field_name: string
  old_value: string
  new_value: string
  reason: string
  status: "pending" | "approved" | "rejected"
  admin_notes?: string
  created_at: string
  updated_at: string
  reviewed_at?: string
  reviewed_by?: string
}

export interface ChangeRequestResponse {
  request: ChangeRequest
  message: string
}

export interface ChangeRequestsResponse {
  requests: ChangeRequest[]
  count: number
}

export interface DriverProfileUpdateResponse {
  success: boolean
  message: string
  updated_fields: string[]
  driver: {
    id: string
    email?: string
    phone?: string
    home_terminal_address?: string
    [key: string]: any
  }
}

// Driver Profile API functions
export const driverProfileApi = {
  // Update driver profile (allowed fields only)
  async updateProfile(data: DriverProfileUpdateData): Promise<DriverProfileUpdateResponse> {
    console.log("📝 Updating driver profile:", data)
    const response = await apiClient.patch<DriverProfileUpdateResponse>(
      API_ENDPOINTS.ORGANIZATION.DRIVER_PROFILE_UPDATE,
      data,
    )

    if (!response.success || !response.data) {
      throw new ApiError({
        message: response.message || "Failed to update profile",
        status: 400,
        errors: response.errors,
      })
    }

    return response.data
  },

  // Request change for restricted fields (requires admin approval)
  async requestChange(data: ChangeRequestData): Promise<ChangeRequestResponse> {
    console.log("📋 Requesting profile change:", data)
    const response = (await apiClient.post<ChangeRequestResponse>(
      API_ENDPOINTS.ORGANIZATION.DRIVER_PROFILE_REQUEST_CHANGE,
      data,
    )) as any

    if (!response.success) {
      throw new ApiError({
        message: response.message || "Failed to create change request",
        status: response.status || 400,
        errors: response.errors,
      })
    }

    return response.data!
  },

  // Get all change requests for current driver
  async getChangeRequests(): Promise<ChangeRequestsResponse> {
    console.log(
      "📋 Fetching change requests from:",
      API_ENDPOINTS.ORGANIZATION.DRIVER_PROFILE_CHANGE_REQUESTS,
    )
    const response = (await apiClient.get<ChangeRequestsResponse>(
      API_ENDPOINTS.ORGANIZATION.DRIVER_PROFILE_CHANGE_REQUESTS,
    )) as any

    console.log("📋 Change requests raw API response:", JSON.stringify(response, null, 2))

    if (!response.success) {
      console.error("❌ Change requests API failed:", response.message || "Unknown error")
      throw new ApiError({
        message: response.message || "Failed to fetch change requests",
        status: response.status || 400,
        errors: response.errors,
      })
    }

    // Handle different response structures
    let result: ChangeRequestsResponse

    if (response.data) {
      // Case 1: response.data is an array directly
      if (Array.isArray(response.data)) {
        console.log(
          "📋 Response data is array, wrapping in requests field. Count:",
          response.data.length,
        )
        result = {
          requests: response.data,
          count: response.data.length,
        }
      }
      // Case 2: response.data has requests field
      else if (response.data.requests && Array.isArray(response.data.requests)) {
        console.log("📋 Response data has requests field. Count:", response.data.requests.length)
        result = {
          requests: response.data.requests,
          count: response.data.count ?? response.data.requests.length,
        }
      }
      // Case 3: response.data has results field (Django REST Framework style)
      else if (response.data.results && Array.isArray(response.data.results)) {
        console.log("📋 Response data has results field. Count:", response.data.results.length)
        result = {
          requests: response.data.results,
          count: response.data.count ?? response.data.results.length,
        }
      }
      // Case 4: response.data is the ChangeRequestsResponse directly
      else if (
        response.data.count !== undefined ||
        (typeof response.data === "object" && !Array.isArray(response.data))
      ) {
        console.log("📋 Response data is ChangeRequestsResponse object")
        result = response.data as ChangeRequestsResponse
      }
      // Case 5: Unknown structure, try to extract
      else {
        console.warn("📋 Unknown response structure, attempting to parse:", response.data)
        result = { requests: [], count: 0 }
      }
    } else {
      console.warn("📋 No data in response, returning empty")
      result = { requests: [], count: 0 }
    }

    console.log("📋 Final parsed change requests result:", JSON.stringify(result, null, 2))
    return result
  },
}

// React Query hooks
export const useUpdateDriverProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: driverProfileApi.updateProfile,
    onSuccess: (response) => {
      // Update auth store immediately with updated profile data
      const authStore = useAuthStore.getState()

      if (authStore.driverProfile && response.driver) {
        // Build updated profile with only the fields that were actually updated
        const updatedProfile = { ...authStore.driverProfile }

        // Update email if it was in updated_fields
        if (response.updated_fields.includes("email") && response.driver.email) {
          updatedProfile.email = response.driver.email
        }

        // Update phone if it was in updated_fields
        if (response.updated_fields.includes("phone") && response.driver.phone !== undefined) {
          updatedProfile.phone = response.driver.phone
        }

        // Update home_terminal_address if it was in updated_fields
        if (
          response.updated_fields.includes("home_terminal_address") &&
          response.driver.home_terminal_address !== undefined
        ) {
          updatedProfile.home_terminal_address = response.driver.home_terminal_address
        }

        // Update the auth store
        authStore.setDriverProfile(updatedProfile)
        console.log("✅ Auth store updated with new profile data:", {
          email: updatedProfile.email,
          phone: updatedProfile.phone,
          home_terminal_address: updatedProfile.home_terminal_address,
          updated_fields: response.updated_fields,
        })

        // Also update user object if email changed
        if (response.updated_fields.includes("email") && authStore.user && response.driver.email) {
          useAuthStore.setState({
            user: {
              ...authStore.user,
              email: response.driver.email,
            },
          })
        }

        // Update user phoneNumber if phone changed
        if (
          response.updated_fields.includes("phone") &&
          authStore.user &&
          response.driver.phone !== undefined
        ) {
          useAuthStore.setState({
            user: {
              ...authStore.user,
              phoneNumber: response.driver.phone,
            },
          })
        }
      }

      // Invalidate profile queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE })
    },
    onError: (error: ApiError) => {
      console.error("❌ Profile update error:", error)
    },
  })
}

export const useRequestProfileChange = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: driverProfileApi.requestChange,
    onSuccess: () => {
      // Invalidate change requests to show new request
      queryClient.invalidateQueries({ queryKey: ["driver-profile-change-requests"] })
    },
    onError: (error: ApiError) => {
      console.error("❌ Change request error:", error)
    },
  })
}

export const useDriverChangeRequests = () => {
  return useQuery({
    queryKey: ["driver-profile-change-requests"],
    queryFn: driverProfileApi.getChangeRequests,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 2
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
