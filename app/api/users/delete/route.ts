import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is super_admin
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('role_id')
      .eq('email', authUser.email)
      .single()

    if (!currentUser || currentUser.role_id !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, email } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Create admin client for database operations (bypasses RLS)
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

    // First, check if user exists and get their info
    // Use maybeSingle() instead of single() to avoid error when user doesn't exist
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, is_deleted')
      .eq('id', userId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json(
        { error: `Error fetching user: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (existingUser.is_deleted) {
      return NextResponse.json(
        { error: 'User is already deleted' },
        { status: 400 }
      )
    }

    // Get email for Auth deletion
    const userEmail = email || existingUser.email
    const targetUserId = existingUser.id

    // Soft delete from users table using admin client (bypasses RLS)
    const { data: updatedUser, error: userDeleteError } = await supabaseAdmin
      .from('users')
      .update({ 
        is_deleted: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', targetUserId)
      .select()

    if (userDeleteError) {
      return NextResponse.json(
        { error: `Failed to delete user from database: ${userDeleteError.message}` },
        { status: 500 }
      )
    }

    if (!updatedUser || updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'User update failed - no rows affected' },
        { status: 500 }
      )
    }

    // Delete from Supabase Auth if email is available
    if (userEmail) {

      // Get auth user by email to get their auth ID
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (!listError && authUsers?.users) {
        const authUserToDelete = authUsers.users.find(u => u.email === userEmail)
        
        if (authUserToDelete) {
          const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
            authUserToDelete.id
          )

          if (authDeleteError) {
            // Don't fail the request - user is already soft-deleted from users table
            return NextResponse.json({
              message: 'User deleted from database, but failed to delete from authentication',
              warning: authDeleteError.message
            })
          }
        }
      }
    }

    return NextResponse.json({
      message: 'User deleted successfully from both database and authentication'
    })
  } catch (error: any) {
    logger.error('Error deleting user:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

