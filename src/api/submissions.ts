/**
 * Submissions API Service
 * Handles submission-related API calls including privacy policy acceptance
 */

interface SubmitPrivacyPolicyAcceptanceParams {
  userId: string
  email: string
  name: string
}

interface SubmissionResponse {
  success: boolean
  message?: string
}

/**
 * Submit privacy policy acceptance to the backend
 * This sends user details to the submissions API endpoint
 */
export async function submitPrivacyPolicyAcceptance(
  params: SubmitPrivacyPolicyAcceptanceParams
): Promise<SubmissionResponse> {
  const { userId, email, name } = params

  try {
    const response = await fetch('http://31.97.9.33:8088/api/submissions/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': 'Guhwyje2NFQsX6hjv4EN5vfwBKxQ87nsj1Zrt3iSmev',
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
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || `API request failed with status ${response.status}`
      )
    }

    const data = await response.json().catch(() => ({ success: true }))

    return {
      success: true,
      message: data.message || 'Privacy policy acceptance submitted successfully',
    }
  } catch (error: any) {
    console.error('Error submitting privacy policy acceptance:', error)
    throw new Error(
      error.message || 'Failed to submit privacy policy acceptance. Please try again.'
    )
  }
}

