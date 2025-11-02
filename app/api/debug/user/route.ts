import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Debug endpoint to check user status
 * Visit /api/debug/user to see if user exists in both auth and users table
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get auth user - check session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({
        authenticated: false,
        error: sessionError?.message || 'Auth session missing!',
        sessionExists: !!session,
      })
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({
        authenticated: false,
        error: authError?.message || 'Not authenticated',
        sessionExists: true,
      })
    }

    // Get user from users table - handle duplicates
    const { data: userDataArray, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .limit(1)
    
    const userData = userDataArray?.[0]

    return NextResponse.json({
      authenticated: true,
      authUser: {
        id: authUser.id,
        email: authUser.email,
      },
      userInDatabase: !!userData,
      userData: userData || null,
      userError: userError?.message || null,
      status: userData 
        ? (userData.is_deleted ? 'deleted' : userData.active ? 'active' : 'inactive')
        : 'not_found',
      role: userData?.role_id || 'none',
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}

