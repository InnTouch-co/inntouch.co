import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generateInvitationEmail } from '@/lib/auth/email'
import { createUser } from '@/lib/database/users'
import { textToJson } from '@/lib/utils/json-text'

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

    const body = await request.json()
    const { name, email, utype_id, active, hotelIds, role_id } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Generate password
    const password = generatePassword()

    // Create user in Supabase Auth using Admin API
    // Note: This requires SUPABASE_SERVICE_ROLE_KEY to be set in environment variables
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
      utype_id: utype_id || 'admin',
      active: active ?? 1,
      role_id: role_id || 'hotel_admin', // Default to hotel_admin
    })

    // Assign hotels if provided
    if (hotelIds && hotelIds.length > 0) {
      const { addUserToHotel } = await import('@/lib/database/hotel-users')
      await Promise.all(
        hotelIds.map((hotelId: string) => addUserToHotel(hotelId, userData.id))
      )
    }

    // Get role name for email
    const { data: roleData } = await supabase
      .from('roles')
      .select('name')
      .eq('id', userData.role_id || 'hotel_admin')
      .single()

    const roleName = roleData?.name || 'Hotel Admin'

    // Generate and send invitation email
    console.log('📧 Starting email sending process...')
    console.log('📧 Email recipient:', email)
    console.log('📧 User name:', typeof name === 'string' ? name : (name as any)?.en || 'User')
    
    try {
      const { sendInvitationEmail } = await import('@/lib/auth/email')
      await sendInvitationEmail({
        email,
        name: typeof name === 'string' ? name : (name as any)?.en || 'User',
        password,
        role: roleName,
      })
      console.log('✅ Email sending completed successfully')
    } catch (emailError: any) {
      // Log email error but don't fail user creation
      console.error('❌ Failed to send invitation email:')
      console.error('❌ Error:', emailError.message)
      console.error('❌ Stack:', emailError.stack)
      
      // Return the password so it can be shared manually if needed
      return NextResponse.json({
        user: userData,
        message: 'User created successfully, but email sending failed.',
        error: emailError.message,
        password: password, // Include password in response if email fails (for development)
        warning: 'Please share the password with the user manually or check server logs for details.',
        details: process.env.NODE_ENV === 'development' ? emailError.stack : undefined,
      })
    }

    return NextResponse.json({
      user: userData,
      message: 'User created successfully. Invitation email has been sent.',
    })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

