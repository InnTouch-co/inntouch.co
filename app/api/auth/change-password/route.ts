import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword, isNewUser } = await request.json()

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      )
    }

    // For new users, current password is optional (they use temporary password)
    // For existing users, current password is required
    if (!isNewUser && !currentPassword) {
      return NextResponse.json(
        { error: 'Current password is required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Create supabase client for reading current user
    const supabase = await createClient()
    
    // Try to get current user
    let authUser
    let authError
    
    try {
      const result = await supabase.auth.getUser()
      authUser = result.data?.user
      authError = result.error
    } catch (error: any) {
      authError = error
    }
    
    // If we can't get the user from session, try to get email from request body
    // (fallback for cases where cookies aren't available)
    let userEmail = authUser?.email
    
    // If no user from auth, this is a critical error - user must be authenticated
    if (authError || !authUser || !userEmail) {
      logger.error('Authentication failed:', {
        error: authError,
        hasUser: !!authUser,
        userEmail: userEmail,
        cookies: request.cookies.getAll().map(c => c.name)
      })
      return NextResponse.json(
        { error: 'Not authenticated. Please log in and try again.' },
        { status: 401 }
      )
    }

    // Create admin client for password verification and update
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify current password by attempting to sign in with admin client (doesn't affect user session)
    // Skip verification for new users (they're already authenticated with temporary password)
    if (!isNewUser) {
      const { data: verifyData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      })

      if (signInError || !verifyData) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        )
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    )

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      )
    }

    // Update must_change_password flag in users table using admin client (bypasses RLS)
    // Use email to find the user since auth.id might differ from users.id
    const { data: updatedUser, error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({ 
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('email', userEmail)
      .select()

    if (userUpdateError) {
      logger.error('Failed to update must_change_password flag:', userUpdateError)
      return NextResponse.json(
        { error: `Password changed, but failed to update user record: ${userUpdateError.message}` },
        { status: 500 }
      )
    }

    if (!updatedUser || updatedUser.length === 0) {
      logger.error('User not found in users table for email:', userEmail)
      return NextResponse.json(
        { error: 'Password changed, but user record not found' },
        { status: 500 }
      )
    }

    // Sign in with the new password to refresh the session (keep user logged in)
    // Use the original supabase client (not admin) to maintain the user's session
    const { data: newSessionData, error: refreshError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: newPassword,
    })

    if (refreshError) {
      logger.error('Password updated but failed to refresh session:', refreshError)
      // Still return success, but warn that user may need to log in again
      return NextResponse.json({ 
        message: 'Password changed successfully. Please log in again with your new password.',
        must_change_password: false,
        warning: 'Session refresh failed'
      })
    }

    return NextResponse.json({ 
      message: 'Password changed successfully',
      must_change_password: false
    })
  } catch (error: any) {
    logger.error('Error changing password:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

