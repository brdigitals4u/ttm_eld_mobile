/**
 * Submissions API Service
 * Handles submission-related API calls including privacy policy acceptance
 * Also handles DocuSeal API calls for document signing
 */

import { normalizeUrl, getSafeUrl } from '@/utils/urlNormalizer'

interface SubmitPrivacyPolicyAcceptanceParams {
  userId: string
  email: string
  name: string
}

interface SubmissionResponse {
  success: boolean
  message?: string
}

// Submissions API base URL - can be overridden via environment variable
const SUBMISSIONS_API_BASE_URL = process.env.EXPO_PUBLIC_SUBMISSIONS_API_URL || 'http://31.97.9.33:8088'
const SUBMISSIONS_API_TOKEN = process.env.EXPO_PUBLIC_SUBMISSIONS_API_TOKEN || 'Guhwyje2NFQsX6hjv4EN5vfwBKxQ87nsj1Zrt3iSmev'

/**
 * Get normalized submissions API URL
 */
function getSubmissionsApiUrl(): string {
  const normalized = normalizeUrl(SUBMISSIONS_API_BASE_URL)
  return getSafeUrl(normalized, 'http://31.97.9.33:8088')
}

/**
 * Submit privacy policy acceptance to the backend
 * This sends user details to the submissions API endpoint
 * 
 * @param params User details for submission
 * @param options Optional configuration
 * @returns Submission response
 */
export async function submitPrivacyPolicyAcceptance(
  params: SubmitPrivacyPolicyAcceptanceParams,
  options?: {
    navigateOnError?: boolean // If true, will not throw error (for navigation flow)
  }
): Promise<SubmissionResponse> {
  const { userId, email, name } = params
  const navigateOnError = options?.navigateOnError ?? false

  try {
    const apiUrl = getSubmissionsApiUrl()
    const endpoint = `${apiUrl}/api/submissions/emails`
    
    // Validate URL before making request
    if (!apiUrl || apiUrl.length === 0) {
      throw new Error('Submissions API URL is not configured')
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': SUBMISSIONS_API_TOKEN,
      },
      body: JSON.stringify({
        template_id: 1,
        emails: 'support+test@ttmkonnect.com, support+test2@ttmkonnect.com',
        user_details: {
          id: userId,
          email: email,
          name: name,
        },
      }),
      // Add timeout for production reliability
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || `API request failed with status ${response.status}`
      
      if (navigateOnError) {
        // Log error but don't throw - allow navigation to proceed
        console.warn('⚠️ Submissions API error (non-blocking):', errorMessage)
        return {
          success: false,
          message: errorMessage,
        }
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json().catch(() => ({ success: true }))

    return {
      success: true,
      message: data.message || 'Privacy policy acceptance submitted successfully',
    }
  } catch (error: any) {
    console.error('Error submitting privacy policy acceptance:', error)
    
    // If navigateOnError is true, return error response instead of throwing
    if (navigateOnError) {
      return {
        success: false,
        message: error.message || 'Failed to submit privacy policy acceptance',
      }
    }
    
    throw new Error(
      error.message || 'Failed to submit privacy policy acceptance. Please try again.'
    )
  }
}

/**
 * DocuSeal API call wrapper
 * Handles document signing API calls with proper error handling and navigation
 * 
 * @param endpoint DocuSeal API endpoint
 * @param payload Request payload
 * @param options Optional configuration
 * @returns API response
 */
export async function callDocuSealApi(
  endpoint: string,
  payload: Record<string, any>,
  options?: {
    navigateOnError?: boolean
    timeout?: number
  }
): Promise<any> {
  const navigateOnError = options?.navigateOnError ?? true // Default to true for navigation flow
  const timeout = options?.timeout ?? 30000

  try {
    // Normalize endpoint URL
    const normalizedEndpoint = normalizeUrl(endpoint)
    if (!normalizedEndpoint || normalizedEndpoint.length === 0) {
      throw new Error('DocuSeal API endpoint is invalid')
    }

    const response = await fetch(normalizedEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeout),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || `API request failed with status ${response.status}`
      
      if (navigateOnError) {
        console.warn('⚠️ DocuSeal API error (non-blocking):', errorMessage)
        return {
          success: false,
          message: errorMessage,
        }
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json().catch(() => ({ success: true }))
    return data
  } catch (error: any) {
    console.error('Error calling DocuSeal API:', error)
    
    if (navigateOnError) {
      // Return error response instead of throwing to allow navigation
      return {
        success: false,
        message: error.message || 'Failed to call DocuSeal API',
      }
    }
    
    throw error
  }
}

