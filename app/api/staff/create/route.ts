import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendInvitationEmail } from '@/lib/auth/email'
import { createUser } from '@/lib/database/users'
import { textToJson } from '@/lib/utils/json-text'
import { addUserToHotel } from '@/lib/database/hotel-users'
import { logger } from '@/lib/utils/logger'

/**
 * Generate a random password
 */
function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

// Non-admin staff roles only
const STAFF_ROLES = ['staff', 'front_desk', 'housekeeping', 'maintenance']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's role
    const { data: currentUser } = await supabase
      .from('users')
      .select('role_id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .single()

    // Only allow super_admin and hotel_admin to create staff
    if (!currentUser || (currentUser.role_id !== 'super_admin' && currentUser.role_id !== 'hotel_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, phone, active, hotelIds, role_id, department } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    if (!hotelIds || hotelIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one hotel must be assigned' },
        { status: 400 }
      )
    }

    // Validate role_id - must be a non-admin staff role
    if (role_id && !STAFF_ROLES.includes(role_id)) {
      return NextResponse.json(
        { error: 'Invalid role. Only staff roles are allowed.' },
        { status: 400 }
      )
    }

    // Default to 'staff' role if not provided
    const staffRole = role_id || 'staff'

    // Generate password
    const password = generatePassword()

    // Create user in Supabase Auth using Admin API
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

    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (authCreateError) {
      return NextResponse.json(
        { error: authCreateError.message },
        { status: 400 }
      )
    }

    // Create user in users table
    const userData = await createUser({
      name: typeof name === 'string' ? textToJson(name) : name,
      email,
      phone: phone || null,
      utype_id: 'staff',
      active: active ?? 1,
      role_id: staffRole,
      department: department || null,
      must_change_password: true, // Force password change on first login
    })

    // Assign hotels
    await Promise.all(
      hotelIds.map((hotelId: string) => addUserToHotel(hotelId, userData.id))
    )

    // Get role name for email
    const { data: roleData } = await supabase
      .from('roles')
      .select('name')
      .eq('id', staffRole)
      .single()

    const roleName = roleData?.name || 'Staff'

    // Generate and send invitation email
    try {
      const userName = typeof name === 'string' ? name : (name as any)?.en || 'User'
      await sendInvitationEmail({
        email,
        name: userName,
        role: roleName,
        password,
      })
    } catch (emailError) {
      // User created but email failed
      logger.error('Failed to send invitation email:', emailError)
      return NextResponse.json({
        user: userData,
        password,
        warning: 'Staff member created successfully, but invitation email could not be sent.',
        error: emailError instanceof Error ? emailError.message : 'Email sending failed'
      }, { status: 201 })
    }

    return NextResponse.json({
      user: userData,
      message: `Staff member created successfully! Invitation email has been sent to ${email}`
    }, { status: 201 })

  } catch (error) {
    logger.error('Error creating staff member:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create staff member' },
      { status: 500 }
    )
  }
}

