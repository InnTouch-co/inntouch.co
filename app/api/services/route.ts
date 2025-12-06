import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServices } from '@/lib/database/services'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from users table
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id, role_id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get hotel_id from query params
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotel_id')

    // If hotel_id is provided, verify user has access
    if (hotelId) {
      const { data: hotelUser, error: hotelUserError } = await supabase
        .from('hotel_users')
        .select('id')
        .eq('hotel_id', hotelId)
        .eq('user_id', currentUserData.id)
        .eq('is_deleted', false)
        .maybeSingle()

      if (hotelUserError) {
        return NextResponse.json({ error: 'Error verifying hotel access' }, { status: 500 })
      }

      if (!hotelUser) {
        return NextResponse.json({ 
          error: 'Forbidden: You do not have access to this hotel' 
        }, { status: 403 })
      }
    }

    const services = await getServices(hotelId || undefined, supabase)
    return NextResponse.json(services)

  } catch (error) {
    logger.error('Error fetching services:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch services' },
      { status: 500 }
    )
  }
}

