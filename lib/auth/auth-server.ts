/**
 * Server-side authentication utilities
 * This file should ONLY be imported in Server Components or API routes
 */

import { createClient } from '@/lib/supabase/server'
import type { AuthUser } from './types'
import { logger } from '@/lib/utils/logger'

/**
 * Get the current authenticated user from Supabase Auth and merge with users table
 * Use this in Server Components or API routes only
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabaseServer = await createClient()
    
    // Get Supabase Auth user
    const { data: { user: authUser }, error: authError } = await supabaseServer.auth.getUser()
    
    if (authError || !authUser?.email) {
      return null
    }

    // Get user from users table by email
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .single()

    if (userError || !userData) {
      return null
    }

    return userData as AuthUser
  } catch (error) {
    logger.error('Error getting current user:', error)
    return null
  }
}

