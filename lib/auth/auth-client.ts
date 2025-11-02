/**
 * Client-side authentication utilities
 * This file is safe to import in 'use client' components
 */

import { supabase } from '@/lib/supabase/client'
import type { AuthUser } from './types'

/**
 * Get current user on client side
 */
export async function getCurrentUserClient(): Promise<AuthUser | null> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser?.email) {
      return null
    }

    // Handle potential duplicates by getting first active user
    const { data: userDataArray, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .limit(1)
    
    const userData = userDataArray?.[0]

    if (userError || !userData) {
      return null
    }

    return userData as AuthUser
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

