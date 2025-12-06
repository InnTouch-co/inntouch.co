import { createBrowserClient } from '@supabase/ssr'
import { logger } from '@/lib/utils/logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn('Supabase environment variables are not set. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * Client-side Supabase client that uses cookies for session management
 * This ensures sessions work properly with Next.js middleware and server components
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

