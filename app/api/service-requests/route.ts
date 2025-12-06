import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceRequests, getServiceRequestStats } from '@/lib/database/service-requests'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const hotelId = searchParams.get('hotel_id')
    const status = searchParams.get('status')
    const requestType = searchParams.get('request_type')
    const search = searchParams.get('search')
    const statsOnly = searchParams.get('stats_only') === 'true'

    if (!hotelId) {
      return NextResponse.json({ error: 'hotel_id is required' }, { status: 400 })
    }

    // Get user from users table to get the correct user ID (might differ from auth user ID)
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      logger.error('Error loading user or user not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user has access to this hotel using the database user ID
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('user_id', currentUserData.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (hotelUserError) {
      logger.error('Error checking hotel assignment:', hotelUserError)
      return NextResponse.json({ error: 'Error verifying hotel access' }, { status: 500 })
    }

    if (!hotelUser) {
      return NextResponse.json({ 
        error: 'Forbidden: You do not have access to this hotel' 
      }, { status: 403 })
    }

    if (statsOnly) {
      const stats = await getServiceRequestStats(hotelId)
      return NextResponse.json(stats)
    }

    const requests = await getServiceRequests(hotelId, {
      status: status || undefined,
      request_type: requestType || undefined,
      search: search || undefined,
    })

    return NextResponse.json(requests)

  } catch (error) {
    logger.error('Error fetching service requests:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch service requests' },
      { status: 500 }
    )
  }
}

