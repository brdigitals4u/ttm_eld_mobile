import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"

// ============================================================================
// Contact (Shipper) API Types with Zod Schema
// ============================================================================

export const ContactSchema = z.object({
  id: z.string(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  company_name: z.string().optional(),
  contact_type: z.enum(["CUSTOMER", "SHIPPER", "RECEIVER"]).default("CUSTOMER"),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type Contact = z.infer<typeof ContactSchema>

export interface CreateContactRequest {
  first_name: string
  last_name: string
  company_name?: string
  contact_type?: "CUSTOMER" | "SHIPPER" | "RECEIVER"
  is_active?: boolean
}

export interface UpdateContactRequest {
  first_name?: string
  last_name?: string
  company_name?: string
  contact_type?: "CUSTOMER" | "SHIPPER" | "RECEIVER"
  is_active?: boolean
}

export interface ContactsListResponse {
  results?: Contact[]
  count?: number
}

// ============================================================================
// Contact API Service
// ============================================================================

export const contactsApi = {
  /**
   * Get Contacts (Shippers)
   * GET /api/contacts/
   */
  async getContacts(params?: {
    contact_type?: string
    is_active?: boolean
  }): Promise<Contact[]> {
    let endpoint = API_ENDPOINTS.CONTACTS.LIST

    if (params) {
      const queryParams = new URLSearchParams()
      if (params.contact_type) queryParams.append("contact_type", params.contact_type)
      if (params.is_active !== undefined)
        queryParams.append("is_active", params.is_active.toString())

      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }

    const response = await apiClient.get<Contact[] | ContactsListResponse>(endpoint)
    if (response.success && response.data) {
      // Handle paginated response
      if (Array.isArray(response.data)) {
        return response.data.map((item) => ContactSchema.parse(item))
      }
      if ((response.data as ContactsListResponse).results) {
        return (response.data as ContactsListResponse).results!.map((item) =>
          ContactSchema.parse(item),
        )
      }
      return []
    }
    throw new ApiError({ message: "Failed to get contacts", status: 400 })
  },

  /**
   * Create Contact (Shipper)
   * POST /api/contacts/
   */
  async createContact(data: CreateContactRequest): Promise<Contact> {
    const response = await apiClient.post<Contact>(API_ENDPOINTS.CONTACTS.CREATE, data)
    if (response.success && response.data) {
      return ContactSchema.parse(response.data)
    }
    throw new ApiError({ message: "Failed to create contact", status: 400 })
  },

  /**
   * Update Contact (Shipper)
   * PATCH /api/contacts/{id}/
   */
  async updateContact(id: string, data: UpdateContactRequest): Promise<Contact> {
    const endpoint = API_ENDPOINTS.CONTACTS.UPDATE.replace("{id}", id)
    const response = await apiClient.patch<Contact>(endpoint, data)
    if (response.success && response.data) {
      return ContactSchema.parse(response.data)
    }
    throw new ApiError({ message: "Failed to update contact", status: 400 })
  },
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to get contacts (shippers)
 */
export function useContacts(params?: { contact_type?: string; is_active?: boolean }, options?: {
  enabled?: boolean
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CONTACTS, params],
    queryFn: () => contactsApi.getContacts(params),
    enabled: options?.enabled !== false,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to create a contact (shipper)
 */
export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateContactRequest) => contactsApi.createContact(data),
    onSuccess: () => {
      // Invalidate contacts query to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS })
    },
  })
}

/**
 * Hook to update a contact (shipper)
 */
export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactRequest }) =>
      contactsApi.updateContact(id, data),
    onSuccess: (data) => {
      // Invalidate contacts query to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS })
      // Also invalidate specific contact query if needed
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACT(data.id) })
    },
  })
}
