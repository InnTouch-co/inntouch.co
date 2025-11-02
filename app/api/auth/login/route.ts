import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    // Verify user exists in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role_id, active, is_deleted')
      .eq('email', email)
      .single()

    if (userError || !userData || userData.is_deleted || !userData.active) {
      // Sign out if user not found or inactive
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Account not found or inactive' },
        { status: 403 }
      )
    }

    return NextResponse.json({ 
      user: data.user,
      session: data.session 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


