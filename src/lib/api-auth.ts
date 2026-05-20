import { createClient } from '@/lib/supabase/server'

/**
 * Returns the authenticated user's details, or null if unauthenticated.
 */
export async function getAuthUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('API Auth Error:', error)
    return null
  }
}
