import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createUser } from '@/lib/database/users'
import { textToJson } from '@/lib/utils/json-text'
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

/**
 * POST /api/admin/create-hotel-admin
 * Creates a hotel admin user
 * 
 * Body: {
 *   email: string (required)
 *   name: string (required)
 *   hotelIds?: string[] (optional - hotel IDs to assign)
 * }
 */
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
      .limit(1)
      .maybeSingle()

    if (!currentUser || currentUser.role_id !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, hotelIds } = body

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // Check if user already exists in auth
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

    // Check if auth user exists
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingAuthUsers?.users.find(u => u.email === email)

    let authUserId: string

    if (existingUser) {
      // User already exists in auth
      authUserId = existingUser.id
    } else {
      // Generate password
      const password = generatePassword()

      // Create user in Supabase Auth
      const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authCreateError) {
        return NextResponse.json(
          { error: `Failed to create auth user: ${authCreateError.message}` },
          { status: 400 }
        )
      }

      authUserId = authData.user.id
    }

    // Check if user exists in users table
    const { data: existingUserData } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    let userData

    if (existingUserData) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          name: typeof name === 'string' ? textToJson(name) : name,
          utype_id: 'admin',
          active: 1,
          role_id: 'hotel_admin',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUserData.id)
        .select()
        .single()

      if (updateError) throw updateError
      userData = updatedUser
    } else {
      // Create new user in users table
      userData = await createUser({
        name: typeof name === 'string' ? textToJson(name) : name,
        email,
        utype_id: 'admin',
        active: 1,
        role_id: 'hotel_admin',
      })
    }

    // Assign hotels if provided
    if (hotelIds && hotelIds.length > 0 && userData?.id) {
      const { addUserToHotel } = await import('@/lib/database/hotel-users')
      await Promise.all(
        hotelIds.map((hotelId: string) => addUserToHotel(hotelId, userData.id))
      )
    } else if (!hotelIds && userData?.id) {
      // If no hotels specified, assign to first available hotel
      const { data: firstHotel } = await supabase
        .from('hotels')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (firstHotel) {
        const { addUserToHotel } = await import('@/lib/database/hotel-users')
        await addUserToHotel(firstHotel.id, userData.id)
      }
    }

    return NextResponse.json({
      success: true,
      user: userData,
      message: existingUser 
        ? 'Hotel admin user updated successfully'
        : 'Hotel admin user created successfully',
      note: existingUser 
        ? 'User already existed in auth - user record was updated'
        : 'New auth user created',
    })
  } catch (error: any) {
    logger.error('Error creating hotel admin:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


