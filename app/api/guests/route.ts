import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGuests } from '@/lib/database/guests'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotel_id')
    const search = searchParams.get('search')

    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotel_id is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this hotel
    const { data: userData } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Super admin can access any hotel
    if (userData.role_id !== 'super_admin') {
      const { data: hotelAccess } = await supabase
        .from('hotel_users')
        .select('hotel_id')
        .eq('user_id', user.id)
        .eq('hotel_id', hotelId)
        .eq('is_deleted', false)
        .maybeSingle()

      if (!hotelAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const guests = await getGuests(hotelId, {
      search: search || undefined,
    })

    return NextResponse.json(guests)
  } catch (error: any) {
    logger.error('Error fetching guests:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch guests',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

